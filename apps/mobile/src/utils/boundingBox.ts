/**
 * Bounding Box Normalization and Parsing Utility
 *
 * Normalizes bounding box coordinates across various formats (xMin/yMin, x/y/width/height, left/top)
 * into a canonical normalized representation with coordinates clamped to [0.0, 1.0].
 */

export function parseBoundingBox(
  b: any
): { xMin: number; yMin: number; xMax: number; yMax: number } | null {
  if (!b || typeof b !== 'object') return null;

  let xMin: number | undefined;
  let yMin: number | undefined;
  let xMax: number | undefined;
  let yMax: number | undefined;

  // Format 1: { xMin, yMin, xMax, yMax } or with width/height
  if (typeof b.xMin === 'number' && typeof b.yMin === 'number') {
    xMin = b.xMin;
    yMin = b.yMin;
    xMax = typeof b.xMax === 'number' ? b.xMax : typeof b.width === 'number' ? b.xMin + b.width : undefined;
    yMax = typeof b.yMax === 'number' ? b.yMax : typeof b.height === 'number' ? b.yMin + b.height : undefined;
  }
  // Format 2: { x, y, width, height }
  else if (
    typeof b.x === 'number' &&
    typeof b.y === 'number' &&
    typeof b.width === 'number' &&
    typeof b.height === 'number'
  ) {
    xMin = b.x;
    yMin = b.y;
    xMax = b.x + b.width;
    yMax = b.y + b.height;
  }
  // Format 3: { left, top, width, height }
  else if (
    typeof b.left === 'number' &&
    typeof b.top === 'number' &&
    typeof b.width === 'number' &&
    typeof b.height === 'number'
  ) {
    xMin = b.left;
    yMin = b.top;
    xMax = b.left + b.width;
    yMax = b.top + b.height;
  }

  if (xMin === undefined || yMin === undefined || xMax === undefined || yMax === undefined) {
    return null;
  }

  // Handle pixel scale coordinates (> 1.5)
  if (xMax > 1.5 || yMax > 1.5) {
    const scaleX = xMax > 100 ? 1000 : 1;
    const scaleY = yMax > 100 ? 1000 : 1;
    xMin /= scaleX;
    xMax /= scaleX;
    yMin /= scaleY;
    yMax /= scaleY;
  }

  // Clamp within [0.0, 1.0]
  xMin = Math.max(0, Math.min(1, xMin));
  yMin = Math.max(0, Math.min(1, yMin));
  xMax = Math.max(0, Math.min(1, xMax));
  yMax = Math.max(0, Math.min(1, yMax));

  if (xMax <= xMin || yMax <= yMin) {
    return null;
  }

  return { xMin, yMin, xMax, yMax };
}

export * from './coordinateCalibration';
