import { z } from 'zod';
import {
  DeclarationTypeSchema,
  FindingReviewStatusSchema,
  FindingStatusSchema,
  SeveritySchema,
} from '../enums/index.js';
import {
  ConfidenceScoreSchema,
  IsoTimestampSchema,
  UuidSchema,
} from './common.js';

/**
 * Finding Review Record (Inspector Verification)
 */
export const FindingReviewSchema = z.object({
  status: FindingReviewStatusSchema,
  reviewerUserId: UuidSchema,
  reviewedAt: IsoTimestampSchema,
  notes: z.string().optional(),
  overrideSeverity: SeveritySchema.optional(),
});
export type FindingReview = z.infer<typeof FindingReviewSchema>;

/**
 * Canonical Finding Entity (Rule Engine Output + Human Verification)
 */
export const FindingSchema = z.object({
  id: UuidSchema,
  inspectionId: UuidSchema,
  ruleId: z.string().min(1),
  ruleTitle: z.string().min(1),
  ruleCitation: z.string().min(1),
  declarationType: DeclarationTypeSchema.optional(),
  status: FindingStatusSchema,
  severity: SeveritySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  actualValue: z.unknown().optional(),
  expectedValue: z.unknown().optional(),
  deviation: z.string().optional(),
  confidence: ConfidenceScoreSchema,
  aiExplanation: z.string().optional(),
  targetRegionId: z.string().optional(),
  evidenceIds: z.array(UuidSchema).default([]),
  review: FindingReviewSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type Finding = z.infer<typeof FindingSchema>;
