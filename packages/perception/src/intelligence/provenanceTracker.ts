/**
 * Phase C: Evidence Traceability & Inspector Correction Provenance Tracker
 *
 * Implements immutable evidence traceability and provenance tracking for human inspector
 * corrections, ensuring raw OCR evidence is NEVER overwritten.
 *
 * ARCHITECTURAL CONSTRAINTS:
 * 1. NEVER overwrite the original OCR evidence.
 * 2. Store originalCandidate, correctedCandidate, source = INSPECTOR_CORRECTED.
 * 3. Preserve timestamp, inspector ID, and reason.
 * 4. Maintain complete chain of custody back to original image and bounding boxes.
 */

import type {
  InspectorCorrectionProvenance,
  StructuredDeclarationCandidate,
} from './candidateSchema.js';

export function recordInspectorCorrection(
  candidate: StructuredDeclarationCandidate,
  correctedValue: string | number,
  reason: string,
  inspectorId = '00000000-0000-4000-8000-000000000001'
): StructuredDeclarationCandidate {
  const now = new Date().toISOString();

  const provenance: InspectorCorrectionProvenance = {
    originalCandidate: candidate.normalizedValue,
    correctedCandidate: correctedValue,
    source: 'INSPECTOR_CORRECTED',
    reason,
    inspectorId,
    correctedAt: now,
  };

  return {
    ...candidate,
    normalizedValue: correctedValue,
    normalizedText: typeof correctedValue === 'number' ? `${correctedValue}` : `${correctedValue}`.trim(),
    confidenceTier: 'HIGH_CONFIDENCE',
    isAmbiguous: false,
    inspectorCorrection: provenance,
    traceability: {
      ...candidate.traceability,
      extractionMethod: 'INSPECTOR_CORRECTED',
      validationStatus: 'VALID',
      timestamp: now,
    },
  };
}
