import { z } from 'zod';
import { DeclarationTypeSchema, PackageSurfaceSchema } from '@lm-vision/shared-types';

const clampCoordinate = (val: unknown): unknown => {
  if (typeof val !== 'number') return val;
  if (isNaN(val)) return 0;
  let num = val;
  // Gemini occasionally returns pixel coordinates (0-1000 range)
  if (num > 10) num = num / 1000;
  // Values 1.5-10: likely percentage scale (0-100 range partial)
  else if (num > 1.5) num = num / 100;
  // Final clamp: handles 1.0-1.5 range and any residual out-of-bounds
  return Math.max(0.0, Math.min(1.0, num));
};

const clampConfidence = (val: unknown): unknown => {
  if (typeof val !== 'number') return 0.9;
  if (isNaN(val)) return 0.9;
  let num = val;
  if (num > 1.5) num = num / 100;
  return Math.max(0.0, Math.min(1.0, num));
};

/**
 * Zod Schema for Raw Gemini Bounding Box Output (Step 1 Validation)
 * Normalized coordinates (0.0 to 1.0) with resilient auto-clamping.
 * Uses transform to guarantee clamped output rather than rejecting edge cases.
 */
export const GeminiBoundingBoxSchema = z
  .object({
    xMin: z.preprocess(clampCoordinate, z.number().min(0, 'xMin must be >= 0').max(1, 'xMin must be <= 1')),
    yMin: z.preprocess(clampCoordinate, z.number().min(0, 'yMin must be >= 0').max(1, 'yMin must be <= 1')),
    xMax: z.preprocess(clampCoordinate, z.number().min(0, 'xMax must be >= 0').max(1, 'xMax must be <= 1')),
    yMax: z.preprocess(clampCoordinate, z.number().min(0, 'yMax must be >= 0').max(1, 'yMax must be <= 1')),
  })
  .transform((box) => ({
    // Defensive final clamp after Zod validation — guarantees [0, 1] even with floating point edge cases
    xMin: Math.max(0, Math.min(1, box.xMin)),
    yMin: Math.max(0, Math.min(1, box.yMin)),
    xMax: Math.max(0, Math.min(1, box.xMax)),
    yMax: Math.max(0, Math.min(1, box.yMax)),
  }))
  .nullable()
  .optional();

export type GeminiBoundingBox = z.infer<typeof GeminiBoundingBoxSchema>;

/**
 * Zod Schema for Raw Gemini Declaration Output
 */
export const GeminiDeclarationSchema = z.object({
  type: DeclarationTypeSchema,
  rawText: z.string().min(1, 'rawText cannot be empty'),
  normalizedValue: z.union([z.string(), z.number(), z.null()]).optional(),
  unit: z.string().nullable().optional(),
  confidence: z.preprocess(
    clampConfidence,
    z
      .number()
      .min(0, 'confidence must be >= 0.0')
      .max(1, 'confidence must be <= 1.0')
  ),
  detectedLanguage: z.string().default('en'),
  surface: PackageSurfaceSchema.optional().default('FRONT'),
  boundingBox: GeminiBoundingBoxSchema,
});
export type GeminiDeclaration = z.infer<typeof GeminiDeclarationSchema>;

/**
 * Zod Schema for Raw Gemini Text Region Output
 */
export const GeminiTextRegionSchema = z.object({
  surface: PackageSurfaceSchema.optional().default('UNKNOWN'),
  boundingBox: GeminiBoundingBoxSchema,
  text: z.string().min(1, 'region text cannot be empty'),
  confidence: z.preprocess(
    clampConfidence,
    z
      .number()
      .min(0, 'confidence must be >= 0.0')
      .max(1, 'confidence must be <= 1.0')
  ),
});
export type GeminiTextRegion = z.infer<typeof GeminiTextRegionSchema>;

/**
 * Zod Schema for Raw Gemini Image Quality Assessment
 */
export const GeminiQualitySchema = z.object({
  overallScore: z.number().min(0).max(1).default(0.9),
  isAcceptable: z.boolean().default(true),
  sharpness: z.number().min(0).max(100).default(85),
  brightness: z.number().min(0).max(100).default(80),
  glareDetected: z.boolean().default(false),
  blurDetected: z.boolean().default(false),
  shadowDetected: z.boolean().default(false),
  warnings: z.array(z.string()).default([]),
});
export type GeminiQuality = z.infer<typeof GeminiQualitySchema>;

/**
 * Raw Schema-Constrained Gemini Structured JSON Output (Step 1 of Double Validation Pipeline)
 */
export const GeminiStructuredOutputSchema = z.object({
  quality: GeminiQualitySchema.default({}),
  declarations: z.array(GeminiDeclarationSchema),
  textRegions: z.array(GeminiTextRegionSchema).default([]),
  qualitativeObservations: z.array(z.string()).default([]),
});
export type GeminiStructuredOutput = z.infer<typeof GeminiStructuredOutputSchema>;

/**
 * Server-side options schema for Gemini provider execution
 */
export const GeminiExecutionConfigSchema = z.object({
  model: z.string().min(1, 'Model name cannot be empty'),
  timeoutMs: z.number().int().positive().default(25000),
  maxRetries: z.number().int().min(0).max(5).default(2),
  enableCache: z.boolean().default(true),
});
export type GeminiExecutionConfig = z.infer<typeof GeminiExecutionConfigSchema>;

