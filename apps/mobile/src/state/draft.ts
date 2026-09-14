import { z } from 'zod';
import {
  CommodityCategorySchema,
  InspectionStatusSchema,
  PackagingTypeSchema,
  PackageSurfaceSchema,
  ImageQualitySchema,
  DeclarationSchema,
  FindingSchema,
  EvidenceSchema,
  InspectorDecisionSchema,
  ConflictAcknowledgementSchema,
  ComplianceAssessmentSchema,
  ComplianceEvaluationSummarySchema,
  AssessmentReviewSchema,
  InspectorCorrectionSchema,
  InspectionAmendmentSchema,
  AuditLogSchema,
  SyncStatusSchema,
  SyncConflictSchema,
  EvidenceSyncStateSchema,
  type CommodityCategory,
  type PackagingType,
  type PackageAnalysis,
  type AssessmentReview,
  type InspectorCorrection,
  type InspectionAmendment,
  type AuditLog,
} from '@lm-vision/shared-types';

export type { ComplianceAssessment, ComplianceEvaluationSummary } from '@lm-vision/shared-types';
export type { AssessmentReview, InspectorCorrection, InspectionAmendment, AuditLog };

export const MobileSourceTypeSchema = z.enum(['PHYSICAL', 'ECOMMERCE', 'HYBRID']);
export type MobileSourceType = z.infer<typeof MobileSourceTypeSchema>;

export const LocalInspectionImageSchema = z.object({
  id: z.string().min(1),
  inspectionId: z.string().min(1),
  surface: PackageSurfaceSchema.default('FRONT'),
  fileUrl: z.string().min(1),
  thumbnailUrl: z.string().optional(),
  base64Data: z.string().optional(),
  fileSizeBytes: z.number().int().nonnegative().default(0),
  mimeType: z.string().default('image/jpeg'),
  sha256Hash: z.string().default(''),
  syncState: EvidenceSyncStateSchema.default('LOCAL_ONLY'),
  remoteStoragePath: z.string().optional(),
  uploadError: z.string().optional(),
  quality: ImageQualitySchema.optional(),
  capturedAt: z.string(),
  createdAt: z.string(),
});
export type LocalInspectionImage = z.infer<typeof LocalInspectionImageSchema>;

export const CreateInspectionDraftInputSchema = z.object({
  sourceType: MobileSourceTypeSchema.default('PHYSICAL'),
  category: CommodityCategorySchema,
  packageType: PackagingTypeSchema,
  productName: z.string().max(255).optional(),
  brandName: z.string().max(255).optional(),
  batchNumber: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateInspectionDraftInput = z.infer<typeof CreateInspectionDraftInputSchema>;

export const LocalInspectionDraftSchema = z.object({
  localId: z.string().min(1),
  serverId: z.string().uuid().optional(),
  version: z.number().int().positive(),
  status: InspectionStatusSchema,
  sourceType: MobileSourceTypeSchema,
  category: CommodityCategorySchema,
  packageType: PackagingTypeSchema,
  productName: z.string().optional(),
  brandName: z.string().optional(),
  batchNumber: z.string().optional(),
  images: z.array(LocalInspectionImageSchema).default([]),
  aiAnalysis: z.custom<PackageAnalysis>().optional(),
  declarations: z.array(DeclarationSchema).default([]),
  findings: z.array(FindingSchema).default([]),
  evidence: z.array(EvidenceSchema).default([]),
  complianceAssessments: z.array(ComplianceAssessmentSchema).default([]),
  complianceSummary: ComplianceEvaluationSummarySchema.optional(),
  reviews: z.array(AssessmentReviewSchema).default([]),
  corrections: z.array(InspectorCorrectionSchema).default([]),
  amendments: z.array(InspectionAmendmentSchema).default([]),
  auditTrail: z.array(AuditLogSchema).default([]),
  inspectorDecision: InspectorDecisionSchema.optional(),
  conflictAcknowledgements: z.array(ConflictAcknowledgementSchema).default([]),
  isFinalized: z.boolean().default(false),
  finalizedAt: z.string().datetime().optional(),
  reopenedAt: z.string().datetime().optional(),
  reopenReason: z.string().optional(),
  previousDecision: z.string().optional(),
  capturedEvidenceRefs: z.array(z.string()).default([]),
  pendingOperations: z.array(z.string()),
  syncStatus: SyncStatusSchema.default('LOCAL_ONLY'),
  lastSyncedAt: z.string().datetime().optional(),
  remoteUpdatedAt: z.string().datetime().optional(),
  syncError: z.string().optional(),
  conflictState: SyncConflictSchema.optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().datetime(),
});
export type LocalInspectionDraft = z.infer<typeof LocalInspectionDraftSchema>;

export function createLocalInspectionDraft(rawInput: unknown, now = new Date()): LocalInspectionDraft {
  const input = CreateInspectionDraftInputSchema.parse(rawInput);
  const nowIso = now.toISOString();
  return LocalInspectionDraftSchema.parse({
    // A stable UUID lets the same offline inspection become the idempotent
    // server record without an unsafe local-to-remote identity remapping.
    localId: generateUuid(),
    version: 1,
    status: 'DRAFT',
    sourceType: input.sourceType,
    category: input.category satisfies CommodityCategory,
    packageType: input.packageType satisfies PackagingType,
    productName: input.productName,
    brandName: input.brandName,
    batchNumber: input.batchNumber,
    images: [],
    declarations: [],
    findings: [],
    evidence: [],
    complianceAssessments: [],
    reviews: [],
    corrections: [],
    amendments: [],
    auditTrail: [],
    isFinalized: false,
    capturedEvidenceRefs: [],
    pendingOperations: ['CREATE_DRAFT'],
    syncStatus: 'LOCAL_ONLY',
    notes: input.notes,
    createdAt: nowIso,
    updatedAt: nowIso,
  });
}

/** UUIDv4 generator with a deterministic fallback for older mobile runtimes. */
export function generateUuid(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
