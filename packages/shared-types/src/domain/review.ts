import { z } from 'zod';
import {
  ComplianceResultSchema,
  DeclarationTypeSchema,
  InspectorDecisionTypeSchema,
  InspectorReviewActionSchema,
  ReviewStatusSchema,
} from '../enums/index.js';
import {
  ConfidenceScoreSchema,
  IsoTimestampSchema,
  MetadataRecordSchema,
  UuidSchema,
} from './common.js';

// ============================================================================
// Immutable Inspector Correction Record
// ============================================================================

/**
 * Represents an authenticated inspector's correction to candidate AI observations
 * or rule assessment inputs.
 *
 * ARCHITECTURAL INVARIANT:
 * Gemini observations remain immutable.
 * Rule engine assessments remain immutable.
 * Inspector corrections are recorded as separate provenance events.
 * The original value and corrected value exist side-by-side in history.
 */
export const InspectorCorrectionSchema = z.object({
  id: UuidSchema,
  assessmentId: UuidSchema,
  declarationType: DeclarationTypeSchema.optional(),
  originalValue: z.unknown().optional(),
  correctedValue: z.unknown(),
  originalConfidence: ConfidenceScoreSchema.optional(),
  correctedConfidence: ConfidenceScoreSchema.default(1.0),
  reason: z.string().min(1, 'Correction reason is required'),
  inspectorUserId: UuidSchema,
  evidenceIds: z.array(UuidSchema).default([]),
  correctedAt: IsoTimestampSchema,
});
export type InspectorCorrection = z.infer<typeof InspectorCorrectionSchema>;

// ============================================================================
// Assessment Review Record
// ============================================================================

/**
 * Represents the inspector's human review of an individual ComplianceAssessment.
 */
export const AssessmentReviewSchema = z.object({
  id: UuidSchema,
  inspectionId: UuidSchema,
  assessmentId: UuidSchema,
  inspectorUserId: UuidSchema,
  status: ReviewStatusSchema.default('UNREVIEWED'),
  action: InspectorReviewActionSchema.optional(),
  originalResult: ComplianceResultSchema,
  originalObservedValue: z.unknown().optional(),
  originalConfidence: ConfidenceScoreSchema.default(1.0),
  reviewedEvidence: z.boolean().default(false),
  reviewedRule: z.boolean().default(false),
  reviewedObservation: z.boolean().default(false),
  correction: InspectorCorrectionSchema.optional(),
  rationale: z.string().optional(),
  reviewedAt: IsoTimestampSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type AssessmentReview = z.infer<typeof AssessmentReviewSchema>;

// ============================================================================
// Post-Finalization Amendment Record
// ============================================================================

/**
 * Once finalized (DECIDED), an inspection is locked from ordinary editing.
 * Any subsequent change must be recorded as an explicit Amendment event.
 */
export const InspectionAmendmentSchema = z.object({
  id: UuidSchema,
  inspectionId: UuidSchema,
  amendedByUserId: UuidSchema,
  amendmentReason: z.string().min(1, 'Amendment reason is required'),
  previousDecision: InspectorDecisionTypeSchema,
  newDecision: InspectorDecisionTypeSchema,
  previousState: MetadataRecordSchema.optional(),
  newState: MetadataRecordSchema.optional(),
  amendedAt: IsoTimestampSchema,
});
export type InspectionAmendment = z.infer<typeof InspectionAmendmentSchema>;

// ============================================================================
// Finalization Summary & Pre-Flight Gate
// ============================================================================

export const InspectionFinalizationSummarySchema = z.object({
  inspectionId: UuidSchema,
  inspectorUserId: UuidSchema,
  totalRulesEvaluated: z.number().int().nonnegative(),
  passCount: z.number().int().nonnegative(),
  failCount: z.number().int().nonnegative(),
  requiresVerificationCount: z.number().int().nonnegative(),
  insufficientEvidenceCount: z.number().int().nonnegative(),
  notApplicableCount: z.number().int().nonnegative(),
  correctionsCount: z.number().int().nonnegative(),
  evidenceReviewedCount: z.number().int().nonnegative(),
  outstandingIssuesCount: z.number().int().nonnegative(),
  conflictsAcknowledged: z.boolean(),
  decision: InspectorDecisionTypeSchema,
  inspectorNotes: z.string().default(''),
  finalizedAt: IsoTimestampSchema,
});
export type InspectionFinalizationSummary = z.infer<typeof InspectionFinalizationSummarySchema>;
