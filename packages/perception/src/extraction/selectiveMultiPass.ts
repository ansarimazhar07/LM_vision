/**
 * Selective Multi-Pass Extraction Strategy
 *
 * Directs selective on-device computer vision and OCR preprocessing passes:
 * - Pass 1: Standard original image
 * - Pass 2: Quality-enhanced / glare-reduced image
 * - Pass 3: Grayscale high-contrast image
 * - Pass 4: Perspective-corrected / planar rectified image
 * - Pass 5: Targeted crop for small declaration text
 *
 * CRITICAL PERFORMANCE GUARANTEE:
 * Does NOT re-run all passes blindly. Dispatches secondary passes ONLY when:
 * 1. Image quality is poor (sharpness < 0.65 or severe glare/shadow).
 * 2. Critical statutory fields (MRP, Net Qty, Manufacturer) are missing or ambiguous.
 * 3. Candidate confidence is low or conflicting.
 */

import type { DeclarationType, ImageQuality } from '@lm-vision/shared-types';
import type { StructuredDeclarationCandidate } from '../intelligence/candidateSchema.js';

export type PreprocessingPassType =
  | 'STANDARD'
  | 'QUALITY_ENHANCED'
  | 'GRAYSCALE_CONTRAST'
  | 'PERSPECTIVE_RECTIFIED'
  | 'TARGETED_SMALL_TEXT_CROP';

export interface MultiPassEvaluation {
  shouldTriggerAdditionalPasses: boolean;
  recommendedPasses: PreprocessingPassType[];
  triggerReasons: string[];
}

const MANDATORY_STATUTORY_FIELDS: DeclarationType[] = [
  'MRP',
  'NET_QUANTITY',
  'MANUFACTURER_NAME_ADDRESS',
  'DATE_OF_PACKAGING',
];

/**
 * Determines whether additional preprocessing passes are required.
 */
export function evaluateMultiPassTriggers(
  quality: ImageQuality,
  extractedCandidates: StructuredDeclarationCandidate[]
): MultiPassEvaluation {
  const recommendedPasses: PreprocessingPassType[] = [];
  const triggerReasons: string[] = [];

  // 1. Image Quality Trigger
  if (quality.glareDetected) {
    recommendedPasses.push('QUALITY_ENHANCED');
    triggerReasons.push('Glare detected on package surface.');
  }

  if (quality.sharpness < 65 || quality.blurDetected) {
    recommendedPasses.push('GRAYSCALE_CONTRAST');
    triggerReasons.push('Low sharpness or blur detected on text areas.');
  }

  // 2. Missing Mandatory Fields Trigger
  const detectedTypes = new Set(extractedCandidates.map((c) => c.fieldType));
  const missingMandatory = MANDATORY_STATUTORY_FIELDS.filter((f) => !detectedTypes.has(f));

  if (missingMandatory.length > 0) {
    if (!recommendedPasses.includes('QUALITY_ENHANCED')) {
      recommendedPasses.push('QUALITY_ENHANCED');
    }
    if (!recommendedPasses.includes('TARGETED_SMALL_TEXT_CROP')) {
      recommendedPasses.push('TARGETED_SMALL_TEXT_CROP');
    }
    triggerReasons.push(`Missing mandatory statutory fields: ${missingMandatory.join(', ')}.`);
  }

  // 3. Ambiguous / Low Confidence Fields Trigger
  const ambiguousCandidates = extractedCandidates.filter(
    (c) => c.isAmbiguous || c.confidenceTier === 'LOW_CONFIDENCE' || c.confidenceTier === 'CONFLICT'
  );

  if (ambiguousCandidates.length > 0) {
    if (!recommendedPasses.includes('PERSPECTIVE_RECTIFIED')) {
      recommendedPasses.push('PERSPECTIVE_RECTIFIED');
    }
    triggerReasons.push(
      `Ambiguous or low confidence candidates detected: ${ambiguousCandidates.map((c) => c.fieldType).join(', ')}.`
    );
  }

  return {
    shouldTriggerAdditionalPasses: recommendedPasses.length > 0,
    recommendedPasses,
    triggerReasons,
  };
}
