/**
 * Coordinate Calibration & Viewport Projection Utility (Phase A.1)
 *
 * Implements rigorous geometric coordinate mapping between normalized OCR bounding boxes ([0.0, 1.0])
 * and the actual rendered image content within a React Native View using `resizeMode="contain"` or `cover`.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Heatmap overlay coordinates MUST align with the actual visible pixels of the rendered photo.
 * 2. Correctly accounts for letterbox (vertical) and pillarbox (horizontal) offsets, container aspect ratio,
 *    EXIF upright dimensions (0°, 90°, 180°, 270°), and zoom magnification.
 * 3. Never simply multiply normalized coordinates by the outer container dimensions.
 * 4. Preserves the normalized OCR coordinate contract ([0.0, 1.0] relative to upright image).
 */

export interface RenderedImageBounds {
  /** Effective image width after applying EXIF rotation (upright orientation) */
  effectiveImageWidth: number;
  /** Effective image height after applying EXIF rotation (upright orientation) */
  effectiveImageHeight: number;
  /** The actual pixel width of the image rendered on screen */
  renderedWidth: number;
  /** The actual pixel height of the image rendered on screen */
  renderedHeight: number;
  /** Horizontal offset (left padding) due to pillarboxing (e.g. portrait in wide container) */
  offsetX: number;
  /** Vertical offset (top padding) due to letterboxing (e.g. landscape in tall container) */
  offsetY: number;
  /** Uniform scale factor applied to the intrinsic image */
  scale: number;
  /** Effective image aspect ratio (effectiveWidth / effectiveHeight) */
  imageAspectRatio: number;
  /** Container aspect ratio (containerWidth / containerHeight) */
  containerAspectRatio: number;
  /** Applied EXIF rotation in degrees */
  exifRotation: number;
}

export interface NormalizedBox {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export interface PixelBoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Normalized source box for reference */
  normalized: NormalizedBox;
}

/**
 * Rotates a normalized bounding box ([0.0, 1.0]) by an EXIF rotation (0, 90, 180, 270 degrees).
 * Used when mapping raw camera sensor coordinates to upright display coordinates.
 */
export function rotateNormalizedBox(box: NormalizedBox, exifRotation: number): NormalizedBox {
  const normDeg = ((exifRotation % 360) + 360) % 360;
  if (normDeg === 0) return { ...box };

  const { xMin, yMin, xMax, yMax } = box;

  switch (normDeg) {
    case 90:
      // Clockwise 90°: (x, y) -> (1 - y, x)
      return {
        xMin: Number(Math.max(0, Math.min(1, 1 - yMax)).toFixed(4)),
        yMin: Number(Math.max(0, Math.min(1, xMin)).toFixed(4)),
        xMax: Number(Math.max(0, Math.min(1, 1 - yMin)).toFixed(4)),
        yMax: Number(Math.max(0, Math.min(1, xMax)).toFixed(4)),
      };
    case 180:
      // 180°: (x, y) -> (1 - x, 1 - y)
      return {
        xMin: Number(Math.max(0, Math.min(1, 1 - xMax)).toFixed(4)),
        yMin: Number(Math.max(0, Math.min(1, 1 - yMax)).toFixed(4)),
        xMax: Number(Math.max(0, Math.min(1, 1 - xMin)).toFixed(4)),
        yMax: Number(Math.max(0, Math.min(1, 1 - yMin)).toFixed(4)),
      };
    case 270:
      // Clockwise 270° (Counter-clockwise 90°): (x, y) -> (y, 1 - x)
      return {
        xMin: Number(Math.max(0, Math.min(1, yMin)).toFixed(4)),
        yMin: Number(Math.max(0, Math.min(1, 1 - xMax)).toFixed(4)),
        xMax: Number(Math.max(0, Math.min(1, yMax)).toFixed(4)),
        yMax: Number(Math.max(0, Math.min(1, 1 - xMin)).toFixed(4)),
      };
    default:
      return { ...box };
  }
}

/**
 * Computes the exact rendered dimensions and letterbox/pillarbox offsets
 * of an image fitted into a container using `resizeMode="contain"` or `resizeMode="cover"`,
 * taking into account EXIF orientation (0, 90, 180, 270 degrees).
 */
export function computeRenderedImageBounds(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number,
  resizeMode: 'contain' | 'cover' = 'contain',
  exifRotation: number = 0
): RenderedImageBounds {
  // Guard against invalid or zero dimensions
  if (imageWidth <= 0 || imageHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    const safeW = Math.max(1, containerWidth);
    const safeH = Math.max(1, containerHeight);
    return {
      effectiveImageWidth: safeW,
      effectiveImageHeight: safeH,
      renderedWidth: safeW,
      renderedHeight: safeH,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      imageAspectRatio: safeW / safeH,
      containerAspectRatio: safeW / safeH,
      exifRotation: 0,
    };
  }

  // Account for EXIF rotation swapping width and height when rotated 90° or 270°
  const normRotation = ((exifRotation % 360) + 360) % 360;
  const isSwapped = normRotation === 90 || normRotation === 270;
  const effectiveImageWidth = isSwapped ? imageHeight : imageWidth;
  const effectiveImageHeight = isSwapped ? imageWidth : imageHeight;

  const imageAspectRatio = effectiveImageWidth / effectiveImageHeight;
  const containerAspectRatio = containerWidth / containerHeight;

  let renderedWidth: number;
  let renderedHeight: number;
  let scale: number;

  if (resizeMode === 'contain') {
    // Image is scaled uniformly so that both dimensions are <= container dimensions
    if (imageAspectRatio > containerAspectRatio) {
      // Image is wider than container -> Letterboxed (bars on top and bottom)
      renderedWidth = containerWidth;
      renderedHeight = containerWidth / imageAspectRatio;
      scale = containerWidth / effectiveImageWidth;
    } else {
      // Image is taller than container -> Pillarboxed (bars on left and right)
      renderedHeight = containerHeight;
      renderedWidth = containerHeight * imageAspectRatio;
      scale = containerHeight / effectiveImageHeight;
    }
  } else {
    // resizeMode === 'cover'
    // Image is scaled uniformly to completely cover the container
    if (imageAspectRatio > containerAspectRatio) {
      // Image is wider -> cropped left and right
      renderedHeight = containerHeight;
      renderedWidth = containerHeight * imageAspectRatio;
      scale = containerHeight / effectiveImageHeight;
    } else {
      // Image is taller -> cropped top and bottom
      renderedWidth = containerWidth;
      renderedHeight = containerWidth / imageAspectRatio;
      scale = containerWidth / effectiveImageWidth;
    }
  }

  const offsetX = (containerWidth - renderedWidth) / 2;
  const offsetY = (containerHeight - renderedHeight) / 2;

  return {
    effectiveImageWidth,
    effectiveImageHeight,
    renderedWidth: Number(renderedWidth.toFixed(2)),
    renderedHeight: Number(renderedHeight.toFixed(2)),
    offsetX: Number(offsetX.toFixed(2)),
    offsetY: Number(offsetY.toFixed(2)),
    scale,
    imageAspectRatio,
    containerAspectRatio,
    exifRotation: normRotation,
  };
}

/**
 * Projects a normalized bounding box ([0.0, 1.0]) to screen pixel coordinates
 * relative to the container, precisely positioned over the actual visible image content.
 */
export function projectNormalizedBoxToPixels(
  box: NormalizedBox,
  bounds: RenderedImageBounds
): PixelBoundingBox {
  // Clamp input box safely to [0.0, 1.0]
  const clampedXMin = Math.max(0, Math.min(1, box.xMin));
  const clampedYMin = Math.max(0, Math.min(1, box.yMin));
  const clampedXMax = Math.max(clampedXMin, Math.min(1, box.xMax));
  const clampedYMax = Math.max(clampedYMin, Math.min(1, box.yMax));

  const left = bounds.offsetX + clampedXMin * bounds.renderedWidth;
  const top = bounds.offsetY + clampedYMin * bounds.renderedHeight;
  const width = (clampedXMax - clampedXMin) * bounds.renderedWidth;
  const height = (clampedYMax - clampedYMin) * bounds.renderedHeight;

  return {
    left: Number(left.toFixed(2)),
    top: Number(top.toFixed(2)),
    width: Number(Math.max(1, width).toFixed(2)),
    height: Number(Math.max(1, height).toFixed(2)),
    normalized: {
      xMin: clampedXMin,
      yMin: clampedYMin,
      xMax: clampedXMax,
      yMax: clampedYMax,
    },
  };
}

/**
 * High-level convenience function to calibrate an arbitrary bounding box input
 * (from parseBoundingBox or raw TextRegion) to screen pixel coordinates for rendering.
 */
export function calibrateBoundingBox(
  boxInput: any,
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number,
  resizeMode: 'contain' | 'cover' = 'contain',
  exifRotation: number = 0
): PixelBoundingBox | null {
  if (!boxInput || typeof boxInput !== 'object') return null;

  let xMin: number | undefined;
  let yMin: number | undefined;
  let xMax: number | undefined;
  let yMax: number | undefined;

  // Format A: { xMin, yMin, xMax, yMax }
  if (typeof boxInput.xMin === 'number' && typeof boxInput.yMin === 'number') {
    xMin = boxInput.xMin;
    yMin = boxInput.yMin;
    xMax = typeof boxInput.xMax === 'number' ? boxInput.xMax : typeof boxInput.width === 'number' ? xMin + boxInput.width : undefined;
    yMax = typeof boxInput.yMax === 'number' ? boxInput.yMax : typeof boxInput.height === 'number' ? yMin + boxInput.height : undefined;
  }
  // Format B: { x, y, width, height }
  else if (
    typeof boxInput.x === 'number' &&
    typeof boxInput.y === 'number' &&
    typeof boxInput.width === 'number' &&
    typeof boxInput.height === 'number'
  ) {
    xMin = boxInput.x;
    yMin = boxInput.y;
    xMax = boxInput.x + boxInput.width;
    yMax = boxInput.y + boxInput.height;
  }
  // Format C: { left, top, width, height }
  else if (
    typeof boxInput.left === 'number' &&
    typeof boxInput.top === 'number' &&
    typeof boxInput.width === 'number' &&
    typeof boxInput.height === 'number'
  ) {
    xMin = boxInput.left;
    yMin = boxInput.top;
    xMax = boxInput.left + boxInput.width;
    yMax = boxInput.top + boxInput.height;
  }

  if (xMin === undefined || yMin === undefined || xMax === undefined || yMax === undefined) {
    return null;
  }

  // Handle pixel scale coordinates (> 1.5) by normalizing against image dimensions if provided
  if (xMax > 1.5 || yMax > 1.5) {
    const denomX = imageWidth > 0 ? imageWidth : (xMax > 100 ? 1000 : 1);
    const denomY = imageHeight > 0 ? imageHeight : (yMax > 100 ? 1000 : 1);
    xMin /= denomX;
    xMax /= denomX;
    yMin /= denomY;
    yMax /= denomY;
  }

  // Clamp within [0.0, 1.0]
  xMin = Math.max(0, Math.min(1, xMin));
  yMin = Math.max(0, Math.min(1, yMin));
  xMax = Math.max(0, Math.min(1, xMax));
  yMax = Math.max(0, Math.min(1, yMax));

  if (xMax <= xMin || yMax <= yMin) {
    return null;
  }

  const bounds = computeRenderedImageBounds(
    imageWidth,
    imageHeight,
    containerWidth,
    containerHeight,
    resizeMode,
    exifRotation
  );

  return projectNormalizedBoxToPixels({ xMin, yMin, xMax, yMax }, bounds);
}
