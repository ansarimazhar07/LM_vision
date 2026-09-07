import { z } from 'zod';
import {
  ErrorCodeSchema,
  FindingReviewStatusSchema,
  InspectionStatusSchema,
  PackageSurfaceSchema,
  SeveritySchema,
  UserRoleSchema,
} from '../enums/index.js';
import {
  IsoTimestampSchema,
  PaginationMetaSchema,
  UuidSchema,
} from '../domain/common.js';
import { UserSchema } from '../domain/user.js';
import { PackageAnalysisInputSchema, PackageAnalysisSchema } from '../ai/index.js';

// ============================================================================
// Shared API Envelopes & Context
// ============================================================================

/**
 * Standard Granular Validation Error Item
 */
export const ApiValidationErrorSchema = z.object({
  field: z.string().min(1),
  message: z.string().min(1),
  code: z.string().min(1),
  receivedValue: z.unknown().optional(),
});
export type ApiValidationError = z.infer<typeof ApiValidationErrorSchema>;

/**
 * Standard API Metadata
 */
export const ResponseMetaSchema = z.object({
  requestId: z.string().min(1),
  timestamp: IsoTimestampSchema,
  pagination: PaginationMetaSchema.optional(),
});
export type ResponseMeta = z.infer<typeof ResponseMetaSchema>;

/**
 * Success Envelope Interface
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

/**
 * Error Details Container
 */
export const ApiErrorDetailSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string().min(1),
  details: z.unknown().optional(),
  validationErrors: z.array(ApiValidationErrorSchema).optional(),
});
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

/**
 * Standard API Error Envelope
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: ApiErrorDetailSchema,
  meta: ResponseMetaSchema,
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

/**
 * Context passed through HTTP middleware / request handling
 */
export const RequestContextSchema = z.object({
  requestId: z.string().min(1),
  userId: UuidSchema.optional(),
  userRole: UserRoleSchema.optional(),
  clientIp: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: IsoTimestampSchema,
});
export type RequestContext = z.infer<typeof RequestContextSchema>;

// ============================================================================
// Endpoint Request & Response DTOs
// ============================================================================

// --- /api/v1/auth ---
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  deviceIdentifier: z.string().optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
  user: UserSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// --- /api/v1/inspections ---
export const CreateInspectionRequestSchema = z.object({
  inspectorUserId: UuidSchema,
  productId: UuidSchema.optional(),
  sampleBatchNumber: z.string().optional(),
  premisesName: z.string().optional(),
  premisesAddress: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateInspectionRequest = z.infer<typeof CreateInspectionRequestSchema>;

export const InspectionFilterQuerySchema = z.object({
  status: InspectionStatusSchema.optional(),
  inspectorUserId: UuidSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
  pageSize: z.coerce.number().int().positive().optional(),
});
export type InspectionFilterQuery = z.infer<typeof InspectionFilterQuerySchema>;

// --- /api/v1/images ---
export const UploadInspectionImageRequestSchema = z.object({
  inspectionId: UuidSchema,
  surface: PackageSurfaceSchema.default('FRONT'),
  fileSizeBytes: z.number().int().positive(),
  mimeType: z.string().min(1),
  sha256Hash: z.string().regex(/^[a-f0-9]{64}$/i),
  base64Content: z.string().optional(),
});
export type UploadInspectionImageRequest = z.infer<typeof UploadInspectionImageRequestSchema>;

// --- /api/v1/ai ---
export const TriggerAIAnalysisRequestSchema = PackageAnalysisInputSchema;
export type TriggerAIAnalysisRequest = z.infer<typeof TriggerAIAnalysisRequestSchema>;

export const TriggerAIAnalysisResponseSchema = z.object({
  analysis: PackageAnalysisSchema,
  inspectionId: UuidSchema,
});
export type TriggerAIAnalysisResponse = z.infer<typeof TriggerAIAnalysisResponseSchema>;

// --- /api/v1/rules ---
export const RuleFilterQuerySchema = z.object({
  status: z.string().optional(),
  commodityCategory: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(50),
});
export type RuleFilterQuery = z.infer<typeof RuleFilterQuerySchema>;

export const EvaluateRulesRequestSchema = z.object({
  inspectionId: UuidSchema,
  ruleIds: z.array(z.string()).optional(),
});
export type EvaluateRulesRequest = z.infer<typeof EvaluateRulesRequestSchema>;

// --- /api/v1/findings ---
export const UpdateFindingReviewRequestSchema = z.object({
  findingId: UuidSchema,
  status: FindingReviewStatusSchema,
  notes: z.string().optional(),
  overrideSeverity: SeveritySchema.optional(),
});
export type UpdateFindingReviewRequest = z.infer<typeof UpdateFindingReviewRequestSchema>;

// --- /api/v1/evidence ---
export const AttachEvidenceRequestSchema = z.object({
  inspectionId: UuidSchema,
  findingId: UuidSchema.optional(),
  type: z.string().min(1),
  title: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  mimeType: z.string().min(1),
  sha256Hash: z.string().regex(/^[a-f0-9]{64}$/i),
});
export type AttachEvidenceRequest = z.infer<typeof AttachEvidenceRequestSchema>;

// --- /api/v1/ecommerce ---
export const CrossCheckEcommerceRequestSchema = z.object({
  inspectionId: UuidSchema,
  productUrl: z.string().url(),
  platformName: z.string().min(1),
});
export type CrossCheckEcommerceRequest = z.infer<typeof CrossCheckEcommerceRequestSchema>;

// --- /api/v1/reports ---
export const GenerateReportRequestSchema = z.object({
  inspectionId: UuidSchema,
  includeEvidenceThumbnails: z.boolean().default(true),
  format: z.enum(['PDF', 'JSON']).default('PDF'),
});
export type GenerateReportRequest = z.infer<typeof GenerateReportRequestSchema>;

// --- /api/v1/analytics ---
export const AnalyticsOverviewQuerySchema = z.object({
  startDate: IsoTimestampSchema.optional(),
  endDate: IsoTimestampSchema.optional(),
  jurisdictionZone: z.string().optional(),
});
export type AnalyticsOverviewQuery = z.infer<typeof AnalyticsOverviewQuerySchema>;

export const AnalyticsComplianceSummarySchema = z.object({
  totalInspections: z.number().int().nonnegative(),
  compliantCount: z.number().int().nonnegative(),
  violationCount: z.number().int().nonnegative(),
  pendingReviewCount: z.number().int().nonnegative(),
  complianceRatePercentage: z.number().min(0).max(100),
  topViolatedRules: z.array(
    z.object({
      ruleId: z.string(),
      title: z.string(),
      count: z.number().int().nonnegative(),
    })
  ),
});
export type AnalyticsComplianceSummary = z.infer<typeof AnalyticsComplianceSummarySchema>;
