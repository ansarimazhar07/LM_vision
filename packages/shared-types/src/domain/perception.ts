import { z } from 'zod';
import {
  DeclarationTypeSchema,
  PackageSurfaceSchema,
  PerceptionSourceSchema,
} from '../enums/index.js';
import {
  ConfidenceScoreSchema,
  IsoTimestampSchema,
  UuidSchema,
} from './common.js';
import {
  DeclarationSchema,
  TextRegionSchema,
  VisualMeasurementSchema,
  type ImageQuality,
  type TextRegion,
} from './ai.js';
import type {
  ImageInputPayload,
  PackageAnalysis,
  PackageAnalysisInput,
} from '../ai/index.js';

/**
 * Optical Character Recognition Result
 */
export const OCRResultSchema = z.object({
  imageId: UuidSchema.or(z.string().min(1)),
  surface: PackageSurfaceSchema.default('FRONT'),
  regions: z.array(TextRegionSchema),
  lines: z.array(z.string()).default([]),
  fullText: z.string(),
  detectedLanguages: z.array(z.string()).default(['en']),
  confidence: ConfidenceScoreSchema,
  latencyMs: z.number().int().nonnegative(),
  provider: z.string().default('LOCAL_OCR'),
  mode: z.enum(['OFFLINE', 'ONLINE']).default('OFFLINE'),
  timestamp: IsoTimestampSchema,
});
export type OCRResult = z.infer<typeof OCRResultSchema>;

/**
 * Computer Vision & Geometry Analysis Result
 */
export const CVGeometryResultSchema = z.object({
  imageId: UuidSchema.or(z.string().min(1)),
  surface: PackageSurfaceSchema.default('FRONT'),
  measurements: z.array(VisualMeasurementSchema),
  dominantRegions: z.array(TextRegionSchema),
  estimatedPrincipalDisplayAreaMm2: z.number().nonnegative().optional(),
  estimatedFontHeightMm: z.number().nonnegative().optional(),
  latencyMs: z.number().int().nonnegative(),
  timestamp: IsoTimestampSchema,
});
export type CVGeometryResult = z.infer<typeof CVGeometryResultSchema>;

/**
 * Perception Discrepancy between Local OCR and Remote Model
 */
export const PerceptionDiscrepancySchema = z.object({
  declarationType: DeclarationTypeSchema,
  localValue: z.unknown().optional(),
  remoteValue: z.unknown().optional(),
  localRawText: z.string().optional(),
  remoteRawText: z.string().optional(),
  localConfidence: ConfidenceScoreSchema.optional(),
  remoteConfidence: ConfidenceScoreSchema.optional(),
  discrepancyType: z.enum([
    'VALUE_MISMATCH',
    'UNIT_MISMATCH',
    'MISSING_IN_LOCAL',
    'MISSING_IN_REMOTE',
    'FORMAT_MISMATCH',
  ]),
  reason: z.string().min(1),
});
export type PerceptionDiscrepancy = z.infer<typeof PerceptionDiscrepancySchema>;

/**
 * Hybrid Consensus Summary
 */
export const HybridPerceptionSummarySchema = z.object({
  status: z.enum(['AGREED', 'CONFLICT', 'LOCAL_ONLY', 'REMOTE_ONLY']),
  source: PerceptionSourceSchema.default('HYBRID'),
  discrepancies: z.array(PerceptionDiscrepancySchema).default([]),
  declarationsAgreedCount: z.number().int().nonnegative().default(0),
  declarationsConflictedCount: z.number().int().nonnegative().default(0),
  requiresHumanVerification: z.boolean().default(false),
  resolvedDeclarations: z.array(DeclarationSchema).default([]),
  evaluatedAt: IsoTimestampSchema,
});
export type HybridPerceptionSummary = z.infer<typeof HybridPerceptionSummarySchema>;

// ============================================================================
// Perception Provider Interfaces
// ============================================================================

/**
 * Pure Local OCR Engine Contract
 */
export interface LocalOCRProvider {
  readonly name: string;
  readonly isOfflineReady: boolean;
  extractText(image: ImageInputPayload): Promise<OCRResult>;
}

/**
 * Pure Local Computer Vision & Geometry Contract
 */
export interface LocalCVProvider {
  readonly name: string;
  readonly isOfflineReady: boolean;
  assessQuality(image: ImageInputPayload): Promise<ImageQuality>;
  detectGeometry(image: ImageInputPayload, regions: TextRegion[]): Promise<CVGeometryResult>;
}

/**
 * Universal Perception Provider Interface
 */
export interface PerceptionProvider {
  readonly name: string;
  extractText(image: ImageInputPayload): Promise<OCRResult>;
  assessQuality(image: ImageInputPayload): Promise<ImageQuality>;
  detectRegions(image: ImageInputPayload): Promise<TextRegion[]>;
  analyzePackage(input: PackageAnalysisInput): Promise<PackageAnalysis>;
}
