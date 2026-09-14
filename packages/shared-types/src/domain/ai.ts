import { z } from 'zod';
import {
  AIProviderNameSchema,
  AnalysisStatusSchema,
  DeclarationTypeSchema,
  PackageSurfaceSchema,
} from '../enums/index.js';
import {
  BoundingBoxSchema,
  ConfidenceScoreSchema,
  IsoTimestampSchema,
  MetadataRecordSchema,
  PolygonSchema,
  UuidSchema,
} from './common.js';

/**
 * Visual text region detected in an inspection image
 */
export const TextRegionSchema = z.object({
  id: z.string().min(1),
  imageId: UuidSchema,
  surface: PackageSurfaceSchema.default('UNKNOWN'),
  boundingBox: BoundingBoxSchema,
  polygon: PolygonSchema.optional(),
  text: z.string(),
  confidence: ConfidenceScoreSchema.nullable().default(null),
  lineCount: z.number().int().positive().optional(),
  estimatedFontHeightMm: z.number().nonnegative().optional(),
  // Multi-Surface Provenance (backward-compatible, optional)
  surfaceType: PackageSurfaceSchema.optional(),
  surfaceId: z.string().optional(),
  captureId: z.string().optional(),
});
export type TextRegion = z.infer<typeof TextRegionSchema>;

/**
 * Extracted and parsed mandatory/voluntary declaration
 */
export const DeclarationSchema = z.object({
  type: DeclarationTypeSchema,
  rawText: z.string(),
  normalizedValue: z.union([z.string(), z.number(), z.null()]).optional(),
  unit: z.string().nullable().optional(),
  confidence: ConfidenceScoreSchema,
  region: TextRegionSchema.optional(),
  isFormatStandard: z.boolean().optional(),
  detectedLanguage: z.string().default('en'),
  // Multi-Surface Provenance (backward-compatible, optional)
  surface: PackageSurfaceSchema.optional(),
  surfaceType: PackageSurfaceSchema.optional(),
  surfaceId: z.string().optional(),
  captureId: z.string().optional(),
  evidenceStatus: z.string().optional(),
  sources: z.array(z.any()).optional(),
});
export type Declaration = z.infer<typeof DeclarationSchema>;

/**
 * Image Quality Assessment metrics
 */
export const ImageQualitySchema = z.object({
  overallScore: ConfidenceScoreSchema,
  isAcceptable: z.boolean(),
  sharpness: z.number().min(0).max(100),
  brightness: z.number().min(0).max(100),
  glareDetected: z.boolean().default(false),
  blurDetected: z.boolean().default(false),
  shadowDetected: z.boolean().default(false),
  perspectiveSkewDegrees: z.number().min(0).max(90).optional(),
  estimatedDpi: z.number().positive().optional(),
  warnings: z.array(z.string()).default([]),
});
export type ImageQuality = z.infer<typeof ImageQualitySchema>;

/**
 * Types of Computer Vision / Photogrammetric measurements
 */
export const VisualMeasurementTypeSchema = z.enum([
  'FONT_HEIGHT',
  'PRINCIPAL_DISPLAY_PANEL_AREA',
  'PACKAGE_HEIGHT',
  'PACKAGE_WIDTH',
  'PACKAGE_DEPTH',
  'NUMERAL_HEIGHT_TO_PANEL_RATIO',
  'SYMBOL_AREA',
]);
export type VisualMeasurementType = z.infer<typeof VisualMeasurementTypeSchema>;

/**
 * Calibrated visual metric on package surface
 */
export const VisualMeasurementSchema = z.object({
  id: z.string().min(1),
  type: VisualMeasurementTypeSchema,
  value: z.number().nonnegative(),
  unit: z.enum(['mm', 'sq_mm', 'cm', 'sq_cm', 'percent', 'ratio']),
  confidence: ConfidenceScoreSchema,
  targetRegionId: z.string().optional(),
  targetSurface: PackageSurfaceSchema.optional(),
  calibrationApplied: z.boolean().default(false),
  scaleFactorMmPerPixel: z.number().positive().optional(),
});
export type VisualMeasurement = z.infer<typeof VisualMeasurementSchema>;

/**
 * AI Provider Token / Resource Usage
 */
export const AIUsageMetricsSchema = z.object({
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
});
export type AIUsageMetrics = z.infer<typeof AIUsageMetricsSchema>;

/**
 * Canonical AI Analysis Container
 */
export const AIAnalysisSchema = z.object({
  id: UuidSchema,
  inspectionId: UuidSchema,
  provider: AIProviderNameSchema,
  modelName: z.string().min(1),
  status: AnalysisStatusSchema,
  quality: ImageQualitySchema,
  declarations: z.array(DeclarationSchema),
  textRegions: z.array(TextRegionSchema),
  visualMeasurements: z.array(VisualMeasurementSchema),
  rawResponse: MetadataRecordSchema.optional(),
  latencyMs: z.number().int().nonnegative(),
  usage: AIUsageMetricsSchema.optional(),
  completedAt: IsoTimestampSchema.optional(),
  createdAt: IsoTimestampSchema,
});
export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;
