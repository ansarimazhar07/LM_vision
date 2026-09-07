import { z } from 'zod';

// ============================================================================
// Canonical User Roles
// ============================================================================
export const UserRoleSchema = z.enum([
  'INSPECTOR',
  'SUPERVISOR',
  'ADMIN',
  'AUDITOR',
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

// ============================================================================
// Inspection Status Lifecycle
// ============================================================================
export const InspectionStatusSchema = z.enum([
  'DRAFT',
  'CAPTURED',
  'PROCESSING',
  'ANALYZED',
  'REVIEW_REQUIRED',
  'READY_FOR_DECISION',
  'DECIDED',
  'REPORT_GENERATED',
  'SYNCED',
  'ARCHIVED',
]);
export type InspectionStatus = z.infer<typeof InspectionStatusSchema>;

// ============================================================================
// Finding Status (Evaluation Output)
// ============================================================================
export const FindingStatusSchema = z.enum([
  'PASS',
  'WARNING',
  'SUSPECTED_NON_COMPLIANCE',
  'MANUAL_REVIEW',
]);
export type FindingStatus = z.infer<typeof FindingStatusSchema>;

// ============================================================================
// Finding Review Lifecycle (Inspector Workflow)
// ============================================================================
export const FindingReviewStatusSchema = z.enum([
  'UNVERIFIED',
  'VERIFIED',
  'REJECTED',
  'NEEDS_MORE_EVIDENCE',
]);
export type FindingReviewStatus = z.infer<typeof FindingReviewStatusSchema>;

// ============================================================================
// Evidence Status
// ============================================================================
export const EvidenceStatusSchema = z.enum([
  'ATTACHED',
  'VERIFIED',
  'FLAGGED',
  'ARCHIVED',
]);
export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>;

// ============================================================================
// Rule Operational Status
// ============================================================================
export const RuleStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'DRAFT',
  'DEPRECATED',
]);
export type RuleStatus = z.infer<typeof RuleStatusSchema>;

// ============================================================================
// Rule Governance Lifecycle
// ============================================================================
export const RuleLifecycleSchema = z.enum([
  'DRAFT',
  'REVIEW',
  'APPROVED',
  'ACTIVE',
  'SUPERSEDED',
  'RETIRED',
]);
export type RuleLifecycle = z.infer<typeof RuleLifecycleSchema>;

// ============================================================================
// AI Confidence Level
// ============================================================================
export const AIConfidenceLevelSchema = z.enum([
  'VERY_LOW',
  'LOW',
  'MEDIUM',
  'HIGH',
  'VERY_HIGH',
]);
export type AIConfidenceLevel = z.infer<typeof AIConfidenceLevelSchema>;

// ============================================================================
// AI Provider Identifier & Perception Sources
// ============================================================================
export const AIProviderNameSchema = z.enum([
  'GEMINI',
  'OPENAI',
  'MOCK',
  'LOCAL_OCR',
  'HYBRID',
]);
export type AIProviderName = z.infer<typeof AIProviderNameSchema>;

export const PerceptionSourceSchema = z.enum([
  'LOCAL_OCR',
  'GEMINI',
  'HYBRID',
  'MOCK',
]);
export type PerceptionSource = z.infer<typeof PerceptionSourceSchema>;

// ============================================================================
// Analysis Processing Status
// ============================================================================
export const AnalysisStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'FALLBACK_APPLIED',
]);
export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;

// ============================================================================
// Inspector Decision
// ============================================================================
export const InspectorDecisionTypeSchema = z.enum([
  'COMPLIANT',
  'NON_COMPLIANT',
  'SEIZED',
  'NOTICE_ISSUED',
  'ESCALATED',
  'DISMISSED',
]);
export type InspectorDecisionType = z.infer<typeof InspectorDecisionTypeSchema>;

// ============================================================================
// Severity Levels
// ============================================================================
export const SeveritySchema = z.enum([
  'CRITICAL',
  'MAJOR',
  'MINOR',
  'INFO',
]);
export type Severity = z.infer<typeof SeveritySchema>;

// ============================================================================
// General Validation Status
// ============================================================================
export const ValidationStatusSchema = z.enum([
  'VALID',
  'INVALID',
  'PENDING_VERIFICATION',
]);
export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;

// ============================================================================
// Offline / Sync Status
// ============================================================================
export const SyncStatusSchema = z.enum([
  'LOCAL_ONLY',
  'PENDING_SYNC',
  'SYNCING',
  'SYNCED',
  'SYNC_CONFLICT',
  'SYNC_FAILED',
]);
export type SyncStatus = z.infer<typeof SyncStatusSchema>;

// ============================================================================
// Phase 11: Connectivity and durable synchronization
// ============================================================================
export const ConnectionStateSchema = z.enum([
  'ONLINE',
  'OFFLINE',
  'SYNCING',
  'SYNCED',
  'SYNC_FAILED',
  'CONFLICT',
]);
export type ConnectionState = z.infer<typeof ConnectionStateSchema>;

export const SyncOperationStatusSchema = z.enum([
  'QUEUED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'CONFLICT',
]);
export type SyncOperationStatus = z.infer<typeof SyncOperationStatusSchema>;

export const SyncEntityTypeSchema = z.enum([
  'INSPECTION',
  'INSPECTION_IMAGE',
  'AI_ANALYSIS',
  'DECLARATION',
  'FINDING',
  'COMPLIANCE_ASSESSMENT',
  'INSPECTOR_REVIEW',
  'EVIDENCE',
  'DECISION',
  'AMENDMENT',
  'AUDIT_EVENT',
  'REPORT',
]);
export type SyncEntityType = z.infer<typeof SyncEntityTypeSchema>;

export const SyncOperationTypeSchema = z.enum([
  'UPSERT_INSPECTION',
  'UPLOAD_IMAGE',
  'UPSERT_INSPECTION_IMAGE',
  'UPSERT_AI_ANALYSIS',
  'UPSERT_DECLARATION',
  'UPSERT_FINDING',
  'UPSERT_COMPLIANCE_ASSESSMENT',
  'UPSERT_INSPECTOR_REVIEW',
  'UPSERT_EVIDENCE',
  'INSERT_DECISION',
  'INSERT_AMENDMENT',
  'INSERT_AUDIT_EVENT',
  'FINALIZE_INSPECTION',
  'UPSERT_REPORT',
]);
export type SyncOperationType = z.infer<typeof SyncOperationTypeSchema>;

export const SyncErrorCategorySchema = z.enum([
  'NETWORK',
  'SERVER',
  'AUTHENTICATION',
  'AUTHORIZATION',
  'VALIDATION',
  'STORAGE',
  'CONFLICT',
  'FINALIZATION_PROTECTION',
  'CORRUPTED_QUEUE',
  'UNKNOWN',
]);
export type SyncErrorCategory = z.infer<typeof SyncErrorCategorySchema>;

export const ConflictTypeSchema = z.enum([
  'CONTENT_CONFLICT',
  'FINALIZATION_CONFLICT',
  'EVIDENCE_CONFLICT',
  'VERSION_CONFLICT',
  'PERMISSION_CONFLICT',
]);
export type ConflictType = z.infer<typeof ConflictTypeSchema>;

export const ConflictResolutionStateSchema = z.enum(['OPEN', 'RESOLVED']);
export type ConflictResolutionState = z.infer<typeof ConflictResolutionStateSchema>;

export const EvidenceSyncStateSchema = z.enum([
  'LOCAL_ONLY',
  'QUEUED',
  'UPLOADING',
  'UPLOADED',
  'UPLOAD_FAILED',
  'SYNCED',
]);
export type EvidenceSyncState = z.infer<typeof EvidenceSyncStateSchema>;

// ============================================================================
// Standard Error Code Categories
// ============================================================================
export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'AUTHENTICATION_ERROR',
  'AUTHORIZATION_ERROR',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'EXTERNAL_SERVICE_ERROR',
  'AI_PROVIDER_ERROR',
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

// ============================================================================
// Mandatory Declaration Field Types
// ============================================================================
export const DeclarationTypeSchema = z.enum([
  'GENERIC_NAME',
  'NET_QUANTITY',
  'MRP',
  'UNIT_SALE_PRICE',
  'MANUFACTURER_NAME_ADDRESS',
  'PACKER_NAME_ADDRESS',
  'IMPORTER_NAME_ADDRESS',
  'COUNTRY_OF_ORIGIN',
  'DATE_OF_MANUFACTURE',
  'DATE_OF_PACKAGING',
  'DATE_OF_IMPORT',
  'EXPIRY_DATE_BEST_BEFORE',
  'CONSUMER_CARE_DETAILS',
  'BARCODE_QR',
  'SIZE_DIMENSION',
  'OTHER',
]);
export type DeclarationType = z.infer<typeof DeclarationTypeSchema>;

// ============================================================================
// Packaging Types
// ============================================================================
export const PackagingTypeSchema = z.enum([
  'BOTTLE',
  'BOX',
  'POUCH',
  'CAN',
  'JAR',
  'WRAPPER',
  'BLISTER_PACK',
  'CARTON',
  'TUBE',
  'OTHER',
]);
export type PackagingType = z.infer<typeof PackagingTypeSchema>;

// ============================================================================
// Image Surface / Angles
// ============================================================================
export const PackageSurfaceSchema = z.enum([
  'FRONT',
  'BACK',
  'TOP',
  'BOTTOM',
  'LEFT',
  'RIGHT',
  'NUTRITION_PANEL',
  'BARCODE_PANEL',
  'UNKNOWN',
]);
export type PackageSurface = z.infer<typeof PackageSurfaceSchema>;

// ============================================================================
// Product Commodity Categories
// ============================================================================
export const CommodityCategorySchema = z.enum([
  'FOOD_BEVERAGE',
  'PERSONAL_CARE_COSMETICS',
  'CLEANING_HOUSEHOLD',
  'PHARMACEUTICAL_HEALTHCARE',
  'ELECTRONICS_APPLIANCES',
  'TEXTILE_APPAREL',
  'COMMODITY_GRAINS_PULSES_OILS',
  'OTHER',
]);
export type CommodityCategory = z.infer<typeof CommodityCategorySchema>;

// ============================================================================
// Phase 7: Compliance Assessment Outcomes
// ============================================================================
export const ComplianceResultSchema = z.enum([
  'PASS',
  'FAIL',
  'REQUIRES_VERIFICATION',
  'NOT_APPLICABLE',
  'INSUFFICIENT_EVIDENCE',
]);
export type ComplianceResult = z.infer<typeof ComplianceResultSchema>;

// ============================================================================
// Phase 7: Evidence Sufficiency Evaluation
// ============================================================================
export const EvidenceSufficiencySchema = z.enum([
  'SUFFICIENT',
  'INSUFFICIENT',
  'CONFLICTING',
  'LOW_CONFIDENCE',
]);
export type EvidenceSufficiency = z.infer<typeof EvidenceSufficiencySchema>;

// ============================================================================
// Phase 7: Rule Authority & Nature
// ============================================================================
export const RuleKindSchema = z.enum([
  'AUTHORITATIVE',
  'TEST_ONLY',
  'DEMO_ONLY',
]);
export type RuleKind = z.infer<typeof RuleKindSchema>;

// ============================================================================
// Phase 7: Legal Source Status
// ============================================================================
export const SourceStatusSchema = z.enum([
  'VERIFIED',
  'UNVERIFIED',
  'MISSING',
]);
export type SourceStatus = z.infer<typeof SourceStatusSchema>;

// ============================================================================
// Phase 8: Review Status Lifecycle
// ============================================================================
export const ReviewStatusSchema = z.enum([
  'UNREVIEWED',
  'IN_REVIEW',
  'VERIFIED',
  'CORRECTED',
  'REQUIRES_FURTHER_REVIEW',
]);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

// ============================================================================
// Phase 8: Inspector Review Actions
// ============================================================================
export const InspectorReviewActionSchema = z.enum([
  'VERIFY',
  'CORRECT',
  'REQUEST_FURTHER_EVIDENCE',
  'DISPUTE',
]);
export type InspectorReviewAction = z.infer<typeof InspectorReviewActionSchema>;

// ============================================================================
// Phase 9: Report Lifecycle & Formats
// ============================================================================
export const ReportStatusSchema = z.enum([
  'DRAFT',
  'GENERATING',
  'GENERATED',
  'FAILED',
  'SUPERSEDED',
  'ARCHIVED',
]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const ReportFormatSchema = z.enum([
  'PDF',
  'HTML',
  'JSON',
]);
export type ReportFormat = z.infer<typeof ReportFormatSchema>;
