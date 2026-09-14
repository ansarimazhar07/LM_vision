/**
 * Phase E: Non-Statutory Inspection Evidence Quality Scoring
 *
 * GUARDRAILS & INVARIANTS:
 * 1. MUST be explicitly labeled: "INSPECTION EVIDENCE QUALITY SCORE — NON-STATUTORY".
 * 2. It is a product-defined deterministic heuristic measuring photographic and observational evidence quality.
 * 3. It is NOT:
 *    - an official Legal Metrology score
 *    - a legal compliance percentage
 *    - a probability of compliance
 *    - a government certification metric
 * 4. Documented product-defined weights:
 *    - Completeness (0-30 points)
 *    - Traceability & Provenance (0-20 points)
 *    - Image Physical Quality (0-20 points)
 *    - Conflict Resolution (0-15 points)
 *    - Review Completion (0-15 points)
 *    Total: 0 to 100 points.
 * 5. Does NOT reinterpret statutory Rule Engine outputs.
 */

import type { ImageQuality } from '@lm-vision/shared-types';
import type { FusedEvidencePackage } from '../fusion/evidenceSchema.js';
import type {
  EvidenceCompletenessAnalysis,
  InspectionQualityScoreBreakdown,
} from './findingSchema.js';

export interface CalculateInspectionScoreInput {
  readonly completeness: EvidenceCompletenessAnalysis;
  readonly imageQuality?: ImageQuality;
  readonly fusedPackage?: FusedEvidencePackage;
  readonly reviewsCount?: number;
  readonly totalAssessmentsCount?: number;
  readonly imagesCount?: number;
  readonly boundingBoxesCount?: number;
  readonly sha256RecordedCount?: number;
}

/**
 * Calculates the product-defined, non-statutory Inspection Evidence Quality Score.
 */
export function calculateInspectionQualityScore(
  input: CalculateInspectionScoreInput
): InspectionQualityScoreBreakdown {
  const { completeness, imageQuality, fusedPackage } = input;

  // 1. Evidence Completeness Points (0 to 30) - Product Defined Heuristic
  // Evaluates coverage of mandatory display surfaces and standard statutory declaration panels.
  let completenessPoints = 0;
  if (completeness.overallStatus === 'COMPLETE') {
    completenessPoints = 30;
  } else if (completeness.overallStatus === 'PARTIAL') {
    const ratio =
      completeness.items.length > 0
        ? completeness.availableCount / completeness.items.length
        : 0.5;
    completenessPoints = Math.round(15 + ratio * 15);
  } else {
    // INSUFFICIENT
    const ratio =
      completeness.items.length > 0
        ? completeness.availableCount / completeness.items.length
        : 0.2;
    completenessPoints = Math.round(ratio * 15);
  }
  completenessPoints = Math.max(0, Math.min(30, completenessPoints));

  // 2. Traceability & Provenance Points (0 to 20) - Product Defined Heuristic
  // Evaluates whether declarations link to physical bounding boxes and original image SHA-256 hashes.
  let traceabilityPoints = 0;
  const boxesCount = input.boundingBoxesCount ?? 0;
  const shaCount = input.sha256RecordedCount ?? input.imagesCount ?? 1;

  if (boxesCount >= 4 && shaCount >= 1) {
    traceabilityPoints = 20;
  } else if (boxesCount >= 2) {
    traceabilityPoints = 14;
  } else if (boxesCount >= 1) {
    traceabilityPoints = 8;
  } else {
    traceabilityPoints = 4;
  }
  traceabilityPoints = Math.max(0, Math.min(20, traceabilityPoints));

  // 3. Image Physical Quality Points (0 to 20) - Product Defined Heuristic
  // Evaluates photographic sharpness, lighting adequacy, and absence of glare or blur.
  let imageQualityPoints = 15; // default moderate
  if (imageQuality) {
    let pts = 20;
    if (imageQuality.glareDetected) pts -= 6;
    if (imageQuality.blurDetected) pts -= 7;
    if (typeof imageQuality.sharpness === 'number' && imageQuality.sharpness < 60) pts -= 4;
    if (typeof imageQuality.overallScore === 'number') {
      pts = Math.round(imageQuality.overallScore * 20);
    }
    imageQualityPoints = Math.max(0, Math.min(20, pts));
  }

  // 4. Conflict Resolution Points (0 to 15) - Product Defined Heuristic
  // Measures whether multi-source observations (Local OCR vs AI vs E-Commerce) agree or have been reconciled.
  let conflictResolutionPoints = 15;
  if (fusedPackage) {
    if (fusedPackage.hasConflicts) {
      // Unresolved conflicts present
      const conflicts = fusedPackage.conflictingFieldCount || 1;
      conflictResolutionPoints = Math.max(0, 15 - conflicts * 5);
    } else {
      conflictResolutionPoints = 15;
    }
  }

  // 5. Inspector Review Completion Points (0 to 15) - Product Defined Heuristic
  // Measures whether the human inspector has verified the physical observations.
  let reviewCompletionPoints = 0;
  const totalAssessments = input.totalAssessmentsCount ?? 0;
  const reviewsCount = input.reviewsCount ?? 0;

  if (totalAssessments > 0) {
    const reviewRatio = Math.min(1, reviewsCount / totalAssessments);
    reviewCompletionPoints = Math.round(reviewRatio * 15);
  } else {
    // When no reviews have occurred yet, default base
    reviewCompletionPoints = 5;
  }
  reviewCompletionPoints = Math.max(0, Math.min(15, reviewCompletionPoints));

  // Total Score (0 to 100)
  const totalScore =
    completenessPoints +
    traceabilityPoints +
    imageQualityPoints +
    conflictResolutionPoints +
    reviewCompletionPoints;

  // Rating bracket
  let rating: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'INSUFFICIENT' = 'MODERATE';
  if (totalScore >= 85) rating = 'EXCELLENT';
  else if (totalScore >= 70) rating = 'GOOD';
  else if (totalScore >= 50) rating = 'MODERATE';
  else rating = 'INSUFFICIENT';

  const formulaDescription =
    'Product-defined deterministic heuristic: Completeness (max 30 pts) + Traceability (max 20 pts) + Image Quality (max 20 pts) + Conflict Resolution (max 15 pts) + Review Completion (max 15 pts) = Total (0-100 pts).';

  const summaryExplanation = `Evidence quality scored at ${totalScore}/100 (${rating}). ${completeness.availableCount} of ${completeness.items.length} key declaration panels available. ${fusedPackage?.hasConflicts ? 'Contains unresolved multi-source observation conflicts.' : 'Multi-source observations are consistent or reconciled.'}`;

  return {
    scoreLabel: 'INSPECTION EVIDENCE QUALITY SCORE — NON-STATUTORY',
    isNonStatutory: true,
    totalScore,
    rating,
    completenessPoints,
    traceabilityPoints,
    imageQualityPoints,
    conflictResolutionPoints,
    reviewCompletionPoints,
    formulaDescription,
    summaryExplanation,
  };
}
