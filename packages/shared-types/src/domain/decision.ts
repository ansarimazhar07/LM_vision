import { z } from 'zod';
import {
  ComplianceResultSchema,
  ConflictAcknowledgementStatusSchema,
  InspectorDecisionTypeSchema,
} from '../enums/index.js';
import { IsoTimestampSchema, UuidSchema } from './common.js';

/**
 * Explicit Inspector Conflict Acknowledgement
 * Required before finalizing an inspection with unresolved evidence conflicts.
 * Simple UI viewing is NOT an acknowledgement.
 */
export const ConflictAcknowledgementSchema = z.object({
  id: z.string().min(1),
  inspectorUserId: UuidSchema,
  field: z.string().min(1),
  conflictReason: z.string().min(1),
  acknowledgedEvidenceIds: z.array(z.string()).default([]),
  acknowledgedAt: IsoTimestampSchema,
  status: ConflictAcknowledgementStatusSchema.default('ACKNOWLEDGED'),
  inspectorNotes: z.string().optional(),
});
export type ConflictAcknowledgement = z.infer<typeof ConflictAcknowledgementSchema>;

/**
 * Recommended Legal Penalties or Notices
 */
export const PenaltyRecommendationSchema = z.object({
  proposedSection: z.string().min(1),
  statutoryFineMinInr: z.number().nonnegative().optional(),
  statutoryFineMaxInr: z.number().nonnegative().optional(),
  noticeType: z.enum(['SHOW_CAUSE', 'COMPOUNDING_OFFER', 'SEIZURE_ORDER', 'ADVISORY_WARNING']),
  recommendedDeadlineDays: z.number().int().positive().optional(),
  rationale: z.string().min(1),
});
export type PenaltyRecommendation = z.infer<typeof PenaltyRecommendationSchema>;

/**
 * Canonical Inspector Decision Entity (Phase F)
 * Strictly separates:
 * 1. SYSTEM ASSESSMENT (Rule Engine deterministic output)
 * 2. INSPECTOR FINAL DECISION (Human authenticated statutory determination)
 */
export const InspectorDecisionSchema = z.object({
  id: UuidSchema,
  inspectionId: UuidSchema,
  inspectorUserId: UuidSchema,
  
  // Explicit distinction: System Assessment vs Inspector Decision
  systemAssessment: ComplianceResultSchema.optional(),
  decision: InspectorDecisionTypeSchema,
  summaryNotes: z.string().min(1),
  violationsFound: z.boolean(),
  
  verifiedFindingIds: z.array(UuidSchema).default([]),
  dismissedFindingIds: z.array(UuidSchema).default([]),
  conflictAcknowledgements: z.array(ConflictAcknowledgementSchema).default([]),
  
  // Finalization & Controlled Reopening
  isFinalized: z.boolean().default(false),
  finalizedAt: IsoTimestampSchema.optional(),
  reopenedAt: IsoTimestampSchema.optional(),
  reopenReason: z.string().optional(),
  previousDecision: InspectorDecisionTypeSchema.optional(),

  penaltyRecommendation: PenaltyRecommendationSchema.optional(),
  supervisorReviewRequired: z.boolean().default(false),
  supervisorUserId: UuidSchema.optional(),
  supervisorApprovalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'MODIFIED']).optional(),
  supervisorNotes: z.string().optional(),
  decidedAt: IsoTimestampSchema,
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type InspectorDecision = z.infer<typeof InspectorDecisionSchema>;
