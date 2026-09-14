/**
 * Text-Region-Aware Local Crop & Coordinate Re-projection Engine (Phase B)
 *
 * Implements:
 * 1. Targeted cropping for small, dense, low-contrast, or ambiguous declarations
 *    (MRP, Net Qty, Batch No, Best Before, Consumer Care).
 * 2. Resolution upscaling plan for small declaration typography (4pt - 8pt print).
 * 3. Exact mathematical mapping: crop coordinates -> derived coordinates -> original coordinates.
 * 4. Transformation metadata preservation.
 *
 * CRITICAL ARCHITECTURAL INVARIANT:
 * Crop-local coordinates MUST NEVER leak into the final TextRegion.
 * The Evidence Heatmap renders on the immutable original evidence image; all bounding
 * boxes must strictly map back to original [0.0, 1.0] image space.
 */

import type { TextRegion } from '@lm-vision/shared-types';
import {
  type DerivedTransformMetadata,
  type NormalizedBox2D,
} from './perspectiveTransform.js';


export interface LocalCropPlanOptions {
  /** Padding ratio added around candidate box to prevent character clipping (default 0.20 = 20%) */
  paddingRatio?: number;
  /** Minimum target width for the derived crop canvas (default 600px) */
  minCanvasWidth?: number;
  /** Minimum target height for the derived crop canvas (default 200px) */
  minCanvasHeight?: number;
  /** Maximum upscale factor to prevent excessive memory usage (default 4.0x) */
  maxUpscaleFactor?: number;
}

export interface LocalCropPlan {
  sourceImageId?: string;
  cropBounds: NormalizedBox2D;
  derivedWidth: number;
  derivedHeight: number;
  scaleFactor: number;
  transformMetadata: DerivedTransformMetadata;
  reason: string;
}

/**
 * Creates a targeted local crop plan around a region of interest (e.g. small date code,
 * dense MRP declaration, or blurred weight panel).
 */
export function createLocalCropPlan(
  targetBox: NormalizedBox2D,
  sourceWidth: number,
  sourceHeight: number,
  sourceImageId?: string,
  options: LocalCropPlanOptions = {}
): LocalCropPlan {
  const paddingRatio = options.paddingRatio ?? 0.2;
  const minCanvasWidth = options.minCanvasWidth ?? 600;
  const minCanvasHeight = options.minCanvasHeight ?? 200;
  const maxUpscaleFactor = options.maxUpscaleFactor ?? 4.0;

  const boxW = Math.max(0.01, targetBox.xMax - targetBox.xMin);
  const boxH = Math.max(0.01, targetBox.yMax - targetBox.yMin);

  // Apply contextual padding
  const padX = boxW * paddingRatio;
  const padY = boxH * paddingRatio;

  const cropBounds: NormalizedBox2D = {
    xMin: Number(Math.max(0.0, targetBox.xMin - padX).toFixed(4)),
    yMin: Number(Math.max(0.0, targetBox.yMin - padY).toFixed(4)),
    xMax: Number(Math.min(1.0, targetBox.xMax + padX).toFixed(4)),
    yMax: Number(Math.min(1.0, targetBox.yMax + padY).toFixed(4)),
  };

  const cropPixelWidth = Math.max(16, Math.round((cropBounds.xMax - cropBounds.xMin) * sourceWidth));
  const cropPixelHeight = Math.max(16, Math.round((cropBounds.yMax - cropBounds.yMin) * sourceHeight));

  // Determine upscale factor to ensure OCR legibility for fine print
  const scaleX = minCanvasWidth / cropPixelWidth;
  const scaleY = minCanvasHeight / cropPixelHeight;
  const scaleFactor = Math.min(maxUpscaleFactor, Math.max(1.0, Math.max(scaleX, scaleY)));

  const derivedWidth = Math.round(cropPixelWidth * scaleFactor);
  const derivedHeight = Math.round(cropPixelHeight * scaleFactor);

  const transformMetadata: DerivedTransformMetadata = {
    sourceImageId,
    sourceWidth,
    sourceHeight,
    derivedWidth,
    derivedHeight,
    transformType: 'CROP_RESCALE',
    cropBounds,
  };

  return {
    sourceImageId,
    cropBounds,
    derivedWidth,
    derivedHeight,
    scaleFactor: Number(scaleFactor.toFixed(2)),
    transformMetadata,
    reason: `Targeted crop enhancement: ${derivedWidth}x${derivedHeight} canvas (scale ${scaleFactor.toFixed(1)}x) for high-clarity declaration OCR.`,
  };
}

/**
 * Mathematically maps a crop-local bounding box back into original image normalized space [0.0, 1.0].
 *
 * Formula:
 * origX = cropBounds.xMin + cropLocalX * (cropBounds.xMax - cropBounds.xMin)
 * origY = cropBounds.yMin + cropLocalY * (cropBounds.yMax - cropBounds.yMin)
 */
export function mapCropBoxToOriginal(
  cropLocalBox: NormalizedBox2D,
  cropBounds: NormalizedBox2D
): NormalizedBox2D {
  const cropW = cropBounds.xMax - cropBounds.xMin;
  const cropH = cropBounds.yMax - cropBounds.yMin;

  const rawXMin = cropBounds.xMin + cropLocalBox.xMin * cropW;
  const rawYMin = cropBounds.yMin + cropLocalBox.yMin * cropH;
  const rawXMax = cropBounds.xMin + cropLocalBox.xMax * cropW;
  const rawYMax = cropBounds.yMin + cropLocalBox.yMax * cropH;

  return {
    xMin: Number(Math.max(0.0, Math.min(1.0, rawXMin)).toFixed(4)),
    yMin: Number(Math.max(0.0, Math.min(1.0, rawYMin)).toFixed(4)),
    xMax: Number(Math.max(rawXMin, Math.min(1.0, rawXMax)).toFixed(4)),
    yMax: Number(Math.max(rawYMin, Math.min(1.0, rawYMax)).toFixed(4)),
  };
}

/**
 * Maps an array of TextRegions extracted from a cropped/upscaled sub-image back to
 * original full-photo coordinates, ensuring zero leakage of crop-local coordinates.
 */
export function mapCropTextRegionsToOriginal(
  cropRegions: TextRegion[],
  meta: DerivedTransformMetadata
): TextRegion[] {
  if (meta.transformType !== 'CROP_RESCALE' || !meta.cropBounds) {
    return cropRegions;
  }

  const cropBounds = meta.cropBounds;

  return cropRegions.map((region) => {
    const origBoxCoords = mapCropBoxToOriginal(
      {
        xMin: region.boundingBox.xMin,
        yMin: region.boundingBox.yMin,
        xMax: region.boundingBox.xMax,
        yMax: region.boundingBox.yMax,
      },
      cropBounds
    );

    const origBox = {
      ...origBoxCoords,
      unit: 'NORMALIZED' as const,
      width: Number(Math.max(0, origBoxCoords.xMax - origBoxCoords.xMin).toFixed(4)),
      height: Number(Math.max(0, origBoxCoords.yMax - origBoxCoords.yMin).toFixed(4)),
    };

    // Transform polygon vertices if present
    let origPolygon = region.polygon;
    if (origPolygon && origPolygon.vertices && origPolygon.vertices.length > 0) {
      const cropW = cropBounds.xMax - cropBounds.xMin;
      const cropH = cropBounds.yMax - cropBounds.yMin;
      origPolygon = {
        vertices: origPolygon.vertices.map((pt) => ({
          x: Number(Math.max(0.0, Math.min(1.0, cropBounds.xMin + pt.x * cropW)).toFixed(4)),
          y: Number(Math.max(0.0, Math.min(1.0, cropBounds.yMin + pt.y * cropH)).toFixed(4)),
        })),
      };
    }

    return {
      ...region,
      boundingBox: origBox,
      polygon: origPolygon,
    };
  });
}

