/**
 * Phase D: Deterministic Multi-Dimensional Confidence Engine
 *
 * Computes evidence quality confidence tiers based on:
 * - Multi-source corroboration (Local OCR + Multimodal AI)
 * - Physical image quality (sharpness, blur detection, glare from Phase B)
 * - Spatial bounding-box precision and visibility
 * - Character normalization stability
 * - Direct observation vs partial/inferred observation
 * - Human inspector confirmation overrides
 *
 * ARCHITECTURAL INVARIANT:
 * Confidence measures EVIDENCE QUALITY, never "probability of a legal violation".
 * Does NOT use simplistic "Agreement = HIGH_CONFIDENCE" heuristics on degraded images.
 */

import type { ImageQuality } from '@lm-vision/shared-types';
import type { ConfidenceTier } from '../intelligence/candidateSchema.js';
import type { FieldEvidenceItem } from './evidenceSchema.js';

export interface ConfidenceEvaluationContext {
  items: FieldEvidenceItem[];
  hasConflict: boolean;
  isPartial: boolean;
  isInspectorConfirmed: boolean;
  quality?: ImageQuality;
}

/**
 * Evaluates the confidence tier for a fused declaration field.
 */
export function evaluateEvidenceConfidence(context: ConfidenceEvaluationContext): ConfidenceTier {
  const { items, hasConflict, isPartial, isInspectorConfirmed, quality } = context;

  // 1. Inspector-Confirmed observation is the authoritative human-verified tier
  if (isInspectorConfirmed) {
    return 'HIGH_CONFIDENCE';
  }

  // 2. Contradictions produce CONFLICT tier
  if (hasConflict) {
    return 'CONFLICT';
  }

  // 3. Zero observations
  if (items.length === 0) {
    return 'INSUFFICIENT_EVIDENCE';
  }

  // 4. Image Quality Assessment Guardrail:
  // If the underlying image suffers from blur or poor sharpness, high confidence CANNOT be awarded
  const isBlurry = quality?.blurDetected === true || (quality?.sharpness !== undefined && quality.sharpness < 40);
  const isSevereBlur = quality?.sharpness !== undefined && quality.sharpness < 25;
  const isGlary = quality?.glareDetected === true;

  // 5. Check corroboration across independent sources
  const hasLocal = items.some(
    (i) => i.sourceType === 'LOCAL_OCR' || i.sourceType === 'LOCAL_CONSENSUS'
  );
  const hasAi = items.some(
    (i) => i.sourceType === 'GEMINI' || i.sourceType === 'OPENAI' || i.sourceType === 'GROK'
  );
  const isCorroborated = hasLocal && hasAi;

  // Check spatial bounding box presence
  const hasSpatialSupport = items.some((i) => i.boundingBox !== undefined);

  // 6. Partial Evidence (e.g. label visible but number missing, or unit missing)
  if (isPartial) {
    if (isBlurry || !hasSpatialSupport) {
      return 'LOW_CONFIDENCE';
    }
    return 'MEDIUM_CONFIDENCE';
  }

  // 7. Severely degraded image quality caps confidence at LOW_CONFIDENCE
  if (isSevereBlur) {
    return 'LOW_CONFIDENCE';
  }

  // 8. Moderate blur or severe glare caps confidence at MEDIUM_CONFIDENCE
  if (isBlurry || isGlary) {
    return 'MEDIUM_CONFIDENCE';
  }

  // 9. Multi-source Corroboration + Crisp Image + Spatial Support => HIGH_CONFIDENCE
  if (isCorroborated && hasSpatialSupport) {
    return 'HIGH_CONFIDENCE';
  }

  // 10. High-confidence local consensus with clear bounding box
  const localConsensus = items.find((i) => i.sourceType === 'LOCAL_CONSENSUS');
  if (localConsensus && localConsensus.confidenceTier === 'HIGH_CONFIDENCE' && hasSpatialSupport) {
    return 'HIGH_CONFIDENCE';
  }

  // 11. Single source with acceptable quality
  if (items.some((i) => i.confidenceTier === 'HIGH_CONFIDENCE' || i.confidenceTier === 'MEDIUM_CONFIDENCE')) {
    return 'MEDIUM_CONFIDENCE';
  }

  return 'LOW_CONFIDENCE';
}
