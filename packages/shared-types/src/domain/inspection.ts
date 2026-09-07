import { z } from 'zod';
import {
  InspectionStatusSchema,
  PackageSurfaceSchema,
  SyncStatusSchema,
} from '../enums/index.js';
import {
  GeoLocationSchema,
  IsoTimestampSchema,
  MetadataRecordSchema,
  UuidSchema,
} from './common.js';
import { ProductSchema } from './product.js';
import {
  AIAnalysisSchema,
  DeclarationSchema,
  ImageQualitySchema,
} from './ai.js';
import { RuleSchema } from './rule.js';
import { FindingSchema } from './finding.js';
import { EvidenceSchema } from './evidence.js';
import { InspectorDecisionSchema } from './decision.js';
import { CrossSourceComparisonSchema } from './ecommerce.js';
import { ReportSchema } from './report.js';
import { SyncConflictSchema } from './sync.js';

/**
 * Packaging Surface Image captured for inspection
 */
export const InspectionImageSchema = z.object({
  id: UuidSchema,
  inspectionId: UuidSchema,
  surface: PackageSurfaceSchema.default('FRONT'),
  fileUrl: z.string().url().or(z.string().min(1)),
  thumbnailUrl: z.string().url().optional(),
  fileSizeBytes: z.number().int().positive(),
  mimeType: z.string().default('image/jpeg'),
  sha256Hash: z.string().regex(/^[a-f0-9]{64}$/i, 'Must be valid 64-char SHA-256 hex string'),
  quality: ImageQualitySchema.optional(),
  capturedAt: IsoTimestampSchema,
  createdAt: IsoTimestampSchema,
});
export type InspectionImage = z.infer<typeof InspectionImageSchema>;

/**
 * Canonical Inspection Domain Model
 *
 * Connects Images, AI Analysis, Extracted Declarations, Applicable Rules,
 * Findings, Chain-of-Custody Evidence, Inspector Decisions, E-Commerce
 * Comparisons, and Generated Legal Reports.
 */
export const InspectionSchema = z.object({
  id: UuidSchema,
  inspectionNumber: z.string().min(1),
  status: InspectionStatusSchema.default('DRAFT'),
  syncStatus: SyncStatusSchema.default('LOCAL_ONLY'),
  lastSyncedAt: IsoTimestampSchema.optional(),
  remoteUpdatedAt: IsoTimestampSchema.optional(),
  syncError: z.string().optional(),
  conflictState: SyncConflictSchema.optional(),
  inspectorUserId: UuidSchema,
  
  // Inspected product context
  productId: UuidSchema.optional(),
  product: ProductSchema.optional(),
  sampleBatchNumber: z.string().optional(),
  
  // Location & Premises Context
  premisesName: z.string().optional(),
  premisesAddress: z.string().optional(),
  geoLocation: GeoLocationSchema.optional(),
  notes: z.string().optional(),

  // Connected Subsystems
  images: z.array(InspectionImageSchema).default([]),
  aiAnalysis: AIAnalysisSchema.optional(),
  declarations: z.array(DeclarationSchema).default([]),
  applicableRules: z.array(RuleSchema).default([]),
  findings: z.array(FindingSchema).default([]),
  evidence: z.array(EvidenceSchema).default([]),
  inspectorDecision: InspectorDecisionSchema.optional(),
  ecommerceComparison: CrossSourceComparisonSchema.optional(),
  report: ReportSchema.optional(),

  // Extensibility & Timestamps
  metadata: MetadataRecordSchema.optional(),
  startedAt: IsoTimestampSchema,
  completedAt: IsoTimestampSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type Inspection = z.infer<typeof InspectionSchema>;
