import { z } from 'zod';
import {
  AIConfidenceLevelSchema,
  AIProviderNameSchema,
  CommodityCategorySchema,
  PackagingTypeSchema,
  PackageSurfaceSchema,
  SeveritySchema,
} from '../enums/index.js';
import {
  ConfidenceScoreSchema,
  IsoTimestampSchema,
  MetadataRecordSchema,
  UuidSchema,
} from '../domain/common.js';
import {
  DeclarationSchema,
  ImageQualitySchema,
  TextRegionSchema,
  VisualMeasurementSchema,
  AIUsageMetricsSchema,
} from '../domain/ai.js';
import { FindingSchema } from '../domain/finding.js';
import { RuleSchema } from '../domain/rule.js';
import {
  DiscrepancyItemSchema,
  EcommerceListingSchema,
} from '../domain/ecommerce.js';

// ============================================================================
// Input Payloads for AI Provider
// ============================================================================

/**
 * Image descriptor sent to AI provider
 */
export const ImageInputPayloadSchema = z.object({
  imageId: UuidSchema,
  surface: PackageSurfaceSchema.default('FRONT'),
  mimeType: z.string().default('image/jpeg'),
  fileUrl: z.string().url().optional(),
  base64Data: z.string().optional(),
});
export type ImageInputPayload = z.infer<typeof ImageInputPayloadSchema>;

/**
 * Photogrammetric calibration marker input
 */
export const PhotogrammetryCalibrationInputSchema = z.object({
  referenceDimensionMm: z.number().positive(),
  referenceDimensionPixels: z.number().positive(),
});
export type PhotogrammetryCalibrationInput = z.infer<typeof PhotogrammetryCalibrationInputSchema>;

/**
 * Canonical Package Analysis Input Payload
 */
export const PackageAnalysisInputSchema = z.object({
  inspectionId: UuidSchema,
  images: z.array(ImageInputPayloadSchema).min(1, 'At least one package image is required'),
  productCategoryHint: CommodityCategorySchema.optional(),
  packagingTypeHint: PackagingTypeSchema.optional(),
  declaredNetQuantityHint: z
    .object({
      value: z.number().positive(),
      unit: z.string().min(1),
    })
    .optional(),
  calibration: PhotogrammetryCalibrationInputSchema.optional(),
  options: z
    .object({
      detectBlur: z.boolean().default(true),
      measureFontHeight: z.boolean().default(true),
      extractFullText: z.boolean().default(true),
      languageCodes: z.array(z.string()).default(['en', 'hi']),
    })
    .default({}),
});
export type PackageAnalysisInput = z.infer<typeof PackageAnalysisInputSchema>;

/**
 * Canonical Package Analysis Result from any AI Provider
 */
export const PackageAnalysisSchema = z.object({
  provider: AIProviderNameSchema,
  modelName: z.string().min(1),
  quality: ImageQualitySchema,
  declarations: z.array(DeclarationSchema),
  textRegions: z.array(TextRegionSchema),
  visualMeasurements: z.array(VisualMeasurementSchema),
  rawResponse: MetadataRecordSchema.optional(),
  latencyMs: z.number().int().nonnegative(),
  usage: AIUsageMetricsSchema.optional(),
  timestamp: IsoTimestampSchema,
});
export type PackageAnalysis = z.infer<typeof PackageAnalysisSchema>;

/**
 * Input for generating legal finding explanations
 */
export const FindingExplanationInputSchema = z.object({
  finding: FindingSchema,
  rule: RuleSchema,
  declaration: DeclarationSchema.optional(),
  contextNotes: z.string().optional(),
});
export type FindingExplanationInput = z.infer<typeof FindingExplanationInputSchema>;

/**
 * Canonical Finding Explanation (Clear Plain-Language Legal Brief)
 */
export const FindingExplanationSchema = z.object({
  explanationMarkdown: z.string().min(1),
  plainLanguageSummary: z.string().min(1),
  statutoryReference: z.string().min(1),
  severityAssessment: SeveritySchema,
  recommendedCorrection: z.string().min(1),
  suggestedInspectorAction: z.string().min(1),
  confidence: AIConfidenceLevelSchema.default('HIGH'),
});
export type FindingExplanation = z.infer<typeof FindingExplanationSchema>;

/**
 * Input for comparing Physical Package to E-Commerce listing
 */
export const ListingAnalysisInputSchema = z.object({
  listing: EcommerceListingSchema,
  packageAnalysis: PackageAnalysisSchema,
});
export type ListingAnalysisInput = z.infer<typeof ListingAnalysisInputSchema>;

/**
 * Canonical E-Commerce Cross-Check Result
 */
export const ListingAnalysisSchema = z.object({
  listingId: UuidSchema,
  mrpMatch: z.boolean(),
  netQuantityMatch: z.boolean(),
  countryOfOriginMatch: z.boolean(),
  manufacturerMatch: z.boolean(),
  discrepancies: z.array(DiscrepancyItemSchema).default([]),
  overallConsistencyScore: ConfidenceScoreSchema,
  summary: z.string().min(1),
  analyzedAt: IsoTimestampSchema,
});
export type ListingAnalysis = z.infer<typeof ListingAnalysisSchema>;

/**
 * AI Provider Health Status
 */
export const AIHealthStatusSchema = z.object({
  provider: AIProviderNameSchema,
  modelName: z.string(),
  isHealthy: z.boolean(),
  latencyMs: z.number().nonnegative(),
  message: z.string().optional(),
  timestamp: IsoTimestampSchema,
});
export type AIHealthStatus = z.infer<typeof AIHealthStatusSchema>;

// ============================================================================
// Canonical AI Provider Interface
// ============================================================================

/**
 * Canonical AI Provider Abstraction
 *
 * Implemented by GeminiProvider, OpenAIProvider, and MockProvider in services/ai-engine.
 * Providers must adhere strictly to these canonical input/output schemas.
 */
export interface AIProvider {
  readonly name: z.infer<typeof AIProviderNameSchema>;
  readonly defaultModel: string;

  /**
   * Analyze packaging images, detect quality, extract mandatory declarations,
   * identify text regions, and compute visual measurements.
   */
  analyzePackage(input: PackageAnalysisInput): Promise<PackageAnalysis>;

  /**
   * Generate human-understandable legal and technical explanation for a finding.
   */
  explainFinding(input: FindingExplanationInput): Promise<FindingExplanation>;

  /**
   * Compare physical package declarations against e-commerce catalog listings.
   */
  analyzeEcommerceListing(input: ListingAnalysisInput): Promise<ListingAnalysis>;

  /**
   * Validate provider availability and credentials.
   */
  healthCheck(): Promise<AIHealthStatus>;
}
