import { z } from 'zod';
import { InspectorDecisionTypeSchema } from '../enums/index.js';
import { IsoTimestampSchema, UuidSchema } from './common.js';

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
 * Canonical Inspector Decision Entity
 */
export const InspectorDecisionSchema = z.object({
  id: UuidSchema,
  inspectionId: UuidSchema,
  inspectorUserId: UuidSchema,
  decision: InspectorDecisionTypeSchema,
  summaryNotes: z.string().min(1),
  violationsFound: z.boolean(),
  verifiedFindingIds: z.array(UuidSchema).default([]),
  dismissedFindingIds: z.array(UuidSchema).default([]),
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
