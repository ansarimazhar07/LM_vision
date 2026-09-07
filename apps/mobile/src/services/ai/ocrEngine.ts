import type { TextRegion } from '@lm-vision/shared-types';
import { type NormalizedImage, PipelineError } from './types';

/**
 * Mock OCR Engine: Generates deterministic text regions linked
 * directly to the user's real captured photographs.
 */
export function extractMockOcrRegions(
  images: NormalizedImage[],
  simulateFailure: boolean = false,
): TextRegion[] {
  if (simulateFailure) {
    throw new PipelineError(
      'OCR_FAILED',
      'Mock OCR engine failed to extract bounding regions from package surfaces.',
    );
  }

  for (const img of images) {
    if (img.fileUrl.includes('ocr_error')) {
      throw new PipelineError(
        'OCR_FAILED',
        `OCR parsing failed on surface ${img.surface}: unreadable text patterns.`,
      );
    }
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const frontImg = images.find((i) => i.surface === 'FRONT') || images[0]!;
  const backImg = images.find((i) => i.surface === 'BACK') || images[1] || frontImg;

  const frontImageId = UUID_REGEX.test(frontImg.id) ? frontImg.id : '11111111-1111-4111-8111-111111111111';
  const backImageId = UUID_REGEX.test(backImg.id) ? backImg.id : '22222222-2222-4222-8222-222222222222';

  return [
    {
      id: 'region-generic-name',
      imageId: frontImageId,
      surface: 'FRONT',
      boundingBox: { xMin: 0.15, yMin: 0.28, xMax: 0.85, yMax: 0.38, unit: 'NORMALIZED' },
      text: 'Anti-Dandruff Shampoo with Tea Tree Oil',
      confidence: 0.98,
      lineCount: 1,
      estimatedFontHeightMm: 4.5,
    },
    {
      id: 'region-net-qty',
      imageId: frontImageId,
      surface: 'FRONT',
      boundingBox: { xMin: 0.25, yMin: 0.78, xMax: 0.75, yMax: 0.85, unit: 'NORMALIZED' },
      text: 'Net Vol. 500 ml',
      confidence: 0.96,
      lineCount: 1,
      estimatedFontHeightMm: 1.8,
    },
    {
      id: 'region-mrp',
      imageId: backImageId,
      surface: 'BACK',
      boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.28, unit: 'NORMALIZED' },
      text: 'MRP Rs. 249.00 (Inclusive of all taxes)',
      confidence: 0.95,
      lineCount: 1,
      estimatedFontHeightMm: 2.2,
    },
    {
      id: 'region-mfr',
      imageId: backImageId,
      surface: 'BACK',
      boundingBox: { xMin: 0.1, yMin: 0.35, xMax: 0.9, yMax: 0.48, unit: 'NORMALIZED' },
      text: 'Manufactured by: ABC Consumer Goods Pvt Ltd, Plot 42, Industrial Area, Solan, HP 173205',
      confidence: 0.92,
      lineCount: 2,
      estimatedFontHeightMm: 1.6,
    },
    {
      id: 'region-care',
      imageId: backImageId,
      surface: 'BACK',
      boundingBox: { xMin: 0.1, yMin: 0.52, xMax: 0.9, yMax: 0.62, unit: 'NORMALIZED' },
      text: 'For consumer feedback or queries write to: care@abcgoods.com',
      confidence: 0.88,
      lineCount: 1,
      estimatedFontHeightMm: 1.5,
    },
    {
      id: 'region-date',
      imageId: backImageId,
      surface: 'BACK',
      boundingBox: { xMin: 0.1, yMin: 0.68, xMax: 0.45, yMax: 0.74, unit: 'NORMALIZED' },
      text: 'Pkd: 08/2026',
      confidence: 0.91,
      lineCount: 1,
      estimatedFontHeightMm: 1.8,
    },
  ];
}
