import { z } from 'zod';
import {
  IsoTimestampSchema,
  MetadataRecordSchema,
  UuidSchema,
} from './common.js';

/**
 * Standard Audited Operations
 */
export const AuditActionSchema = z.enum([
  'USER_LOGIN',
  'USER_LOGOUT',
  'INSPECTION_CREATED',
  'INSPECTION_UPDATED',
  'IMAGE_UPLOADED',
  'AI_ANALYSIS_TRIGGERED',
  'AI_ANALYSIS_COMPLETED',
  'RULE_EVALUATED',
  'FINDING_VERIFIED',
  'FINDING_REJECTED',
  'DECISION_RECORDED',
  'REPORT_GENERATED',
  'EVIDENCE_ATTACHED',
  'EVIDENCE_HASH_VERIFIED',
  'DATA_SYNCED',
  'RULE_VERSION_PUBLISHED',
  'INSPECTOR_REVIEW_STARTED',
  'INSPECTOR_CORRECTION',
  'EVIDENCE_VIEWED',
  'INSPECTION_FINALIZED',
  'INSPECTION_AMENDED',
]);
export type AuditAction = z.infer<typeof AuditActionSchema>;

/**
 * Target Resource Type
 */
export const AuditTargetTypeSchema = z.enum([
  'INSPECTION',
  'EVIDENCE',
  'FINDING',
  'RULE',
  'USER',
  'REPORT',
  'PRODUCT',
  'ECOMMERCE_LISTING',
  'SYSTEM',
  'COMPLIANCE_ASSESSMENT',
  'INSPECTOR_REVIEW',
]);
export type AuditTargetType = z.infer<typeof AuditTargetTypeSchema>;

/**
 * Canonical Immutable Audit Log Entry
 */
export const AuditLogSchema = z.object({
  id: UuidSchema,
  action: AuditActionSchema,
  targetType: AuditTargetTypeSchema,
  targetId: z.string().min(1),
  actorUserId: UuidSchema.optional(),
  actorRole: z.string().optional(),
  clientIpAddress: z.string().optional(),
  userAgent: z.string().optional(),
  previousState: MetadataRecordSchema.optional(),
  newState: MetadataRecordSchema.optional(),
  changeSummary: z.string().min(1),
  timestamp: IsoTimestampSchema,
});
export type AuditLog = z.infer<typeof AuditLogSchema>;
