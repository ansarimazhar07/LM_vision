/**
 * Advanced Perspective & Homography Coordinate Transformation Engine (Phase B)
 *
 * Implements:
 * 1. 2D Projective Homography (4-point transformation) using Direct Linear Transformation (DLT).
 * 2. Exact 3x3 matrix inversion for inverse transformation.
 * 3. Bounding box 4-corner projection to axis-aligned original coordinates.
 * 4. Geometric quadrilateral validation (convexity, angle bounds, area sanity).
 * 5. Transformation metadata provenance for TextRegion recovery.
 *
 * ARCHITECTURAL INVARIANTS:
 * - Derived OCR bounding boxes MUST be inverse-transformed back to the ORIGINAL immutable image coordinates.
 * - All 4 corners of a bounding box are projected, not just top-left.
 * - Clamped strictly to [0.0, 1.0].
 * - Never fabricates package corners; if validation fails, original image is preserved.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Quadrilateral {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
}

export interface NormalizedBox2D {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

export interface DerivedTransformMetadata {
  sourceImageId?: string;
  sourceWidth: number;
  sourceHeight: number;
  derivedWidth: number;
  derivedHeight: number;
  transformType: 'NONE' | 'PERSPECTIVE' | 'DESKEW' | 'CROP_RESCALE' | 'RESCALE';
  homographyMatrix?: Matrix3x3;
  inverseHomographyMatrix?: Matrix3x3;
  rotationDegrees?: number;
  cropBounds?: NormalizedBox2D;
  quadrilateral?: Quadrilateral;
}

/**
 * Validates whether a candidate 4-point quadrilateral represents a reliable,
 * non-degenerate package or label boundary.
 */
export function validateQuadrilateral(
  quad: Quadrilateral,
  imageWidth: number,
  imageHeight: number
): { isValid: boolean; reason?: string; areaRatio?: number } {
  const pts = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft];

  // 1. Check coordinate bounds
  for (const pt of pts) {
    if (isNaN(pt.x) || isNaN(pt.y)) {
      return { isValid: false, reason: 'Coordinates contain NaN' };
    }
  }

  // 2. Check Convexity using cross-product signs of consecutive edges
  // For a convex polygon, all cross products of consecutive edges must have the same sign.
  const crossProducts: number[] = [];
  for (let i = 0; i < 4; i++) {
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % 4]!;
    const p3 = pts[(i + 2) % 4]!;
    const dx1 = p2.x - p1.x;
    const dy1 = p2.y - p1.y;
    const dx2 = p3.x - p2.x;
    const dy2 = p3.y - p2.y;
    const cross = dx1 * dy2 - dy1 * dx2;
    crossProducts.push(cross);
  }

  const allPositive = crossProducts.every((c) => c > 0);
  const allNegative = crossProducts.every((c) => c < 0);
  if (!allPositive && !allNegative) {
    return { isValid: false, reason: 'Quadrilateral is self-intersecting or concave' };
  }

  // 3. Compute Area using Shoelace formula
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    area += pts[i]!.x * pts[j]!.y;
    area -= pts[j]!.x * pts[i]!.y;
  }
  area = Math.abs(area) / 2.0;

  const totalImageArea = Math.max(1, imageWidth * imageHeight);
  const areaRatio = area / totalImageArea;

  // Quad must occupy at least 8% and at most 98% of the image frame
  if (areaRatio < 0.08) {
    return { isValid: false, reason: 'Detected quadrilateral area is too small (<8% of frame)', areaRatio };
  }
  if (areaRatio > 0.99) {
    return { isValid: false, reason: 'Quadrilateral covers entire frame; no perspective tilt detected', areaRatio };
  }

  // 4. Edge length sanity: Opposite edges shouldn't differ by more than 3.5x
  const dist = (p1: Point2D, p2: Point2D) => Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const topLen = dist(quad.topLeft, quad.topRight);
  const bottomLen = dist(quad.bottomLeft, quad.bottomRight);
  const leftLen = dist(quad.topLeft, quad.bottomLeft);
  const rightLen = dist(quad.topRight, quad.bottomRight);

  if (topLen < 20 || bottomLen < 20 || leftLen < 20 || rightLen < 20) {
    return { isValid: false, reason: 'One or more edge lengths are too short (<20px)', areaRatio };
  }

  const horizRatio = Math.max(topLen / bottomLen, bottomLen / topLen);
  const vertRatio = Math.max(leftLen / rightLen, rightLen / leftLen);
  if (horizRatio > 3.5 || vertRatio > 3.5) {
    return { isValid: false, reason: 'Extreme trapezoidal distortion exceeds perspective threshold', areaRatio };
  }

  return { isValid: true, areaRatio };
}

/**
 * Solves an 8x8 linear system using Gaussian Elimination with partial pivoting.
 */
function solve8x8(A: number[][], b: number[]): number[] {
  const n = 8;
  const M: number[][] = A.map((row, i) => [...row, b[i]!]);

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k]![i]!) > Math.abs(M[maxRow]![i]!)) {
        maxRow = k;
      }
    }
    const temp = M[i]!;
    M[i] = M[maxRow]!;
    M[maxRow] = temp;

    if (Math.abs(M[i]![i]!) < 1e-12) {
      throw new Error('Singular matrix in homography solver');
    }

    // Eliminate below
    for (let k = i + 1; k < n; k++) {
      const c = M[k]![i]! / M[i]![i]!;
      for (let j = i; j <= n; j++) {
        if (i === j) {
          M[k]![j] = 0;
        } else {
          M[k]![j]! -= c * M[i]![j]!;
        }
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i]![n]! / M[i]![i]!;
    for (let k = i - 1; k >= 0; k--) {
      M[k]![n]! -= M[k]![i]! * x[i];
    }
  }

  return x;
}

/**
 * Computes the 3x3 Projective Homography matrix mapping Source points to Destination points.
 * Point order: [topLeft, topRight, bottomRight, bottomLeft]
 */
export function computeHomography(src: Point2D[], dst: Point2D[]): Matrix3x3 {
  if (src.length !== 4 || dst.length !== 4) {
    throw new Error('computeHomography requires exactly 4 source and 4 destination points');
  }

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const x = src[i]!.x;
    const y = src[i]!.y;
    const u = dst[i]!.x;
    const v = dst[i]!.y;

    // Row 1 for x-coordinate
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);

    // Row 2 for y-coordinate
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }

  const h = solve8x8(A, b);

  return [
    [h[0]!, h[1]!, h[2]!],
    [h[3]!, h[4]!, h[5]!],
    [h[6]!, h[7]!, 1.0],
  ];
}

/**
 * Inverts a 3x3 matrix analytically using the cofactor adjugate method.
 */
export function invertMatrix3x3(m: Matrix3x3): Matrix3x3 {
  const [
    [a, b, c],
    [d, e, f],
    [g, h, i],
  ] = m;

  const det =
    a * (e * i - f * h) -
    b * (d * i - f * g) +
    c * (d * h - e * g);

  if (Math.abs(det) < 1e-12) {
    throw new Error('Matrix is singular and cannot be inverted');
  }

  const invDet = 1.0 / det;

  return [
    [
      (e * i - f * h) * invDet,
      (c * h - b * i) * invDet,
      (b * f - c * e) * invDet,
    ],
    [
      (f * g - d * i) * invDet,
      (a * i - c * g) * invDet,
      (c * d - a * f) * invDet,
    ],
    [
      (d * h - e * g) * invDet,
      (g * b - a * h) * invDet,
      (a * e - b * d) * invDet,
    ],
  ];
}

/**
 * Transforms a 2D point using a 3x3 homography matrix with projective perspective division.
 */
export function transformPoint(pt: Point2D, H: Matrix3x3): Point2D {
  const x = pt.x;
  const y = pt.y;
  const w = H[2][0] * x + H[2][1] * y + H[2][2];

  if (Math.abs(w) < 1e-12) {
    return { x: H[0][0] * x + H[0][1] * y + H[0][2], y: H[1][0] * x + H[1][1] * y + H[1][2] };
  }

  return {
    x: (H[0][0] * x + H[0][1] * y + H[0][2]) / w,
    y: (H[1][0] * x + H[1][1] * y + H[1][2]) / w,
  };
}

/**
 * Maps all four corners of a bounding box through an inverse homography matrix,
 * computing the exact axis-aligned enclosing box in original image space.
 */
export function mapDerivedBoxToOriginal(
  derivedBox: NormalizedBox2D,
  meta: DerivedTransformMetadata
): NormalizedBox2D {
  // If no transform or identity
  if (meta.transformType === 'NONE') {
    return { ...derivedBox };
  }

  // Handle CROP_RESCALE: map from crop window back to full original image
  if (meta.transformType === 'CROP_RESCALE' && meta.cropBounds) {
    const cropW = meta.cropBounds.xMax - meta.cropBounds.xMin;
    const cropH = meta.cropBounds.yMax - meta.cropBounds.yMin;

    const origXMin = meta.cropBounds.xMin + derivedBox.xMin * cropW;
    const origYMin = meta.cropBounds.yMin + derivedBox.yMin * cropH;
    const origXMax = meta.cropBounds.xMin + derivedBox.xMax * cropW;
    const origYMax = meta.cropBounds.yMin + derivedBox.yMax * cropH;

    return {
      xMin: Math.max(0, Math.min(1, Number(origXMin.toFixed(4)))),
      yMin: Math.max(0, Math.min(1, Number(origYMin.toFixed(4)))),
      xMax: Math.max(origXMin, Math.min(1, Number(origXMax.toFixed(4)))),
      yMax: Math.max(origYMin, Math.min(1, Number(origYMax.toFixed(4)))),
    };
  }

  // Handle DESKEW: rotate corners around image center
  if (meta.transformType === 'DESKEW' && typeof meta.rotationDegrees === 'number') {
    const rad = (-meta.rotationDegrees * Math.PI) / 180.0;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const cx = 0.5;
    const cy = 0.5;

    const corners: Point2D[] = [
      { x: derivedBox.xMin, y: derivedBox.yMin },
      { x: derivedBox.xMax, y: derivedBox.yMin },
      { x: derivedBox.xMax, y: derivedBox.yMax },
      { x: derivedBox.xMin, y: derivedBox.yMax },
    ];

    const rotated = corners.map((c) => {
      const dx = c.x - cx;
      const dy = c.y - cy;
      return {
        x: cx + (dx * cos - dy * sin),
        y: cy + (dx * sin + dy * cos),
      };
    });

    const xs = rotated.map((p) => p.x);
    const ys = rotated.map((p) => p.y);

    return {
      xMin: Math.max(0, Math.min(1, Number(Math.min(...xs).toFixed(4)))),
      yMin: Math.max(0, Math.min(1, Number(Math.min(...ys).toFixed(4)))),
      xMax: Math.max(0, Math.min(1, Number(Math.max(...xs).toFixed(4)))),
      yMax: Math.max(0, Math.min(1, Number(Math.max(...ys).toFixed(4)))),
    };
  }

  // Handle PERSPECTIVE: use inverseHomographyMatrix
  if (meta.transformType === 'PERSPECTIVE' && meta.inverseHomographyMatrix) {
    const H_inv = meta.inverseHomographyMatrix;

    // Convert normalized derived box to pixel coordinates on the derived rectified canvas
    const dW = meta.derivedWidth || 1000;
    const dH = meta.derivedHeight || 1000;
    const sW = meta.sourceWidth || 1000;
    const sH = meta.sourceHeight || 1000;

    const cornersPx: Point2D[] = [
      { x: derivedBox.xMin * dW, y: derivedBox.yMin * dH },
      { x: derivedBox.xMax * dW, y: derivedBox.yMin * dH },
      { x: derivedBox.xMax * dW, y: derivedBox.yMax * dH },
      { x: derivedBox.xMin * dW, y: derivedBox.yMax * dH },
    ];

    // Project all four corners back into original pixel coordinates
    const origCorners = cornersPx.map((c) => transformPoint(c, H_inv));

    // Normalize against original source dimensions
    const origXs = origCorners.map((c) => Math.max(0, Math.min(1, c.x / sW)));
    const origYs = origCorners.map((c) => Math.max(0, Math.min(1, c.y / sH)));

    const xMin = Math.min(...origXs);
    const yMin = Math.min(...origYs);
    const xMax = Math.max(...origXs);
    const yMax = Math.max(...origYs);

    return {
      xMin: Number(Math.max(0, Math.min(1, xMin)).toFixed(4)),
      yMin: Number(Math.max(0, Math.min(1, yMin)).toFixed(4)),
      xMax: Number(Math.max(xMin, Math.min(1, xMax)).toFixed(4)),
      yMax: Number(Math.max(yMin, Math.min(1, yMax)).toFixed(4)),
    };
  }

  return { ...derivedBox };
}

/**
 * Creates a Perspective Rectification plan for an image, computing
 * the forward homography, inverse homography, and output canvas dimensions.
 */
export function createPerspectiveRectificationPlan(
  quad: Quadrilateral,
  sourceWidth: number,
  sourceHeight: number
): {
  planApplied: boolean;
  metadata: DerivedTransformMetadata;
  reason?: string;
} {
  const val = validateQuadrilateral(quad, sourceWidth, sourceHeight);
  if (!val.isValid) {
    return {
      planApplied: false,
      metadata: {
        sourceWidth,
        sourceHeight,
        derivedWidth: sourceWidth,
        derivedHeight: sourceHeight,
        transformType: 'NONE',
      },
      reason: val.reason,
    };
  }

  const dist = (p1: Point2D, p2: Point2D) => Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const widthTop = dist(quad.topLeft, quad.topRight);
  const widthBottom = dist(quad.bottomLeft, quad.bottomRight);
  const heightLeft = dist(quad.topLeft, quad.bottomLeft);
  const heightRight = dist(quad.topRight, quad.bottomRight);

  const derivedWidth = Math.max(100, Math.round(Math.max(widthTop, widthBottom)));
  const derivedHeight = Math.max(100, Math.round(Math.max(heightLeft, heightRight)));

  const srcPts = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft];
  const dstPts: Point2D[] = [
    { x: 0, y: 0 },
    { x: derivedWidth, y: 0 },
    { x: derivedWidth, y: derivedHeight },
    { x: 0, y: derivedHeight },
  ];

  try {
    // Forward: Source Quad (original image) -> Destination Rect (rectified canvas)
    const H = computeHomography(srcPts, dstPts);
    // Inverse: Destination Rect (rectified canvas) -> Source Quad (original image)
    const H_inv = invertMatrix3x3(H);

    return {
      planApplied: true,
      metadata: {
        sourceWidth,
        sourceHeight,
        derivedWidth,
        derivedHeight,
        transformType: 'PERSPECTIVE',
        homographyMatrix: H,
        inverseHomographyMatrix: H_inv,
        quadrilateral: quad,
      },
    };
  } catch (err: any) {
    return {
      planApplied: false,
      metadata: {
        sourceWidth,
        sourceHeight,
        derivedWidth: sourceWidth,
        derivedHeight: sourceHeight,
        transformType: 'NONE',
      },
      reason: `Homography calculation failed: ${err?.message || err}`,
    };
  }
}
