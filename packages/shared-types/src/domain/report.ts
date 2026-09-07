import { z } from 'zod';
import {
  InspectionStatusSchema,
  ReportFormatSchema,
  ReportStatusSchema,
} from '../enums/index.js';
import { IsoTimestampSchema, UuidSchema } from './common.js';
import { DeclarationSchema } from './ai.js';
import { ComplianceAssessmentSchema } from './compliance.js';
import { EvidenceSchema } from './evidence.js';
import {
  AssessmentReviewSchema,
  InspectionAmendmentSchema,
  InspectorCorrectionSchema,
} from './review.js';
import { InspectorDecisionSchema } from './decision.js';
import { AuditLogSchema } from './audit.js';

/**
 * Digital Signature / Verification Stamp
 */
export const DigitalSignatureSchema = z.object({
  signerUserId: UuidSchema,
  signerName: z.string().min(1),
  signerRole: z.string().min(1),
  signatureAlgorithm: z.string().default('RSA-SHA256'),
  signatureHash: z.string().min(1),
  timestamp: IsoTimestampSchema,
  certificateSerialNumber: z.string().optional(),
});
export type DigitalSignature = z.infer<typeof DigitalSignatureSchema>;

/**
 * Report Product Details Block
 */
export const InspectionReportProductSchema = z.object({
  id: UuidSchema.optional(),
  brandName: z.string().min(1),
  productName: z.string().min(1),
  genericName: z.string().optional(),
  category: z.string(),
  packagingType: z.string(),
  barcode: z.string().optional(),
  batchNumber: z.string().optional(),
  declaredNetQuantityValue: z.number().positive().optional(),
  declaredNetQuantityUnit: z.string().optional(),
  declaredMrp: z.number().positive().optional(),
  declaredUsp: z.number().positive().optional(),
  declaredUspUnit: z.string().optional(),
  manufacturer: z
    .object({
      legalName: z.string().optional(),
      address: z.string().optional(),
      country: z.string().optional(),
      fssaiLicenseNumber: z.string().optional(),
    })
    .optional(),
});
export type InspectionReportProduct = z.infer<typeof InspectionReportProductSchema>;

/**
 * Report Metadata Block
 */
export const InspectionReportMetadataSchema = z.object({
  sourceType: z.enum(['PHYSICAL_PACKAGE', 'ECOMMERCE_LISTING']).default('PHYSICAL_PACKAGE'),
  location: z.string().optional(),
  createdAt: IsoTimestampSchema,
  finalizedAt: IsoTimestampSchema.optional(),
  notes: z.string().optional(),
});
export type InspectionReportMetadata = z.infer<typeof InspectionReportMetadataSchema>;

/**
 * Canonical Inspection Report Schema (Phase 9)
 *
 * Single Canonical Model for HTML, PDF, and JSON renderings.
 * Holds all 16 canonical sections, preserving immutable AI observations,
 * deterministic GSR 202(E) assessments, human inspector corrections,
 * and authenticated final decisions.
 */
export const InspectionReportSchema = z.object({
  reportId: UuidSchema.or(z.string().min(1)),
  inspectionId: UuidSchema.or(z.string().min(1)),
  reportNumber: z.string().min(1),
  reportVersion: z.string().default('1.0.0'),
  reportGeneratorVersion: z.string().default('1.0.0'),
  engineVersion: z.string().default('1.0.0'),
  ruleBundleId: z.string().default('LM-IN-RULES-2026.09'),
  ruleBundleVersion: z.string().default('2026.09'),
  inspectionStatus: InspectionStatusSchema,
  status: ReportStatusSchema.default('GENERATED'),
  isDraftPreview: z.boolean(),
  title: z.string().min(1),
  generatedAt: IsoTimestampSchema,
  generatedByUserId: UuidSchema,
  inspectorId: UuidSchema,
  inspectorName: z.string().min(1),
  inspectorRole: z.string().default('INSPECTOR'),
  product: InspectionReportProductSchema,
  inspectionMetadata: InspectionReportMetadataSchema,
  declarations: z.array(DeclarationSchema).default([]),
  complianceAssessments: z.array(ComplianceAssessmentSchema).default([]),
  evidence: z.array(EvidenceSchema).default([]),
  reviews: z.array(AssessmentReviewSchema).default([]),
  corrections: z.array(InspectorCorrectionSchema).default([]),
  finalDecision: InspectorDecisionSchema.optional(),
  amendments: z.array(InspectionAmendmentSchema).default([]),
  auditSummary: z.array(AuditLogSchema).default([]),
  totalViolationsFound: z.number().int().nonnegative().default(0),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/i, 'Must be valid 64-char SHA-256 hex string'),
  reportHash: z.string().regex(/^[a-f0-9]{64}$/i, 'Must be valid 64-char SHA-256 hex string'),
  digitalSignature: DigitalSignatureSchema.optional(),
  supersedesReportId: UuidSchema.optional(),
});
export type InspectionReport = z.infer<typeof InspectionReportSchema>;

/**
 * Report Integrity Check Result
 */
export const ReportIntegrityResultSchema = z.object({
  valid: z.boolean(),
  contentHash: z.string(),
  calculatedContentHash: z.string(),
  reportHash: z.string(),
  calculatedReportHash: z.string(),
  reason: z.string().optional(),
});
export type ReportIntegrityResult = z.infer<typeof ReportIntegrityResultSchema>;

/**
 * Canonical Inspection Legal Report Entity (Database row for public.reports)
 */
export const ReportSchema = z.object({
  id: UuidSchema,
  inspectionId: UuidSchema,
  reportNumber: z.string().min(1),
  title: z.string().min(1),
  format: ReportFormatSchema.default('PDF'),
  fileUrl: z.string().url().or(z.string().min(1)),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/i, 'Must be valid 64-char SHA-256 hex string'),
  sha256Hash: z.string().regex(/^[a-f0-9]{64}$/i, 'Must be valid 64-char SHA-256 hex string'),
  generatedByUserId: UuidSchema,
  generatedAt: IsoTimestampSchema,
  digitalSignature: DigitalSignatureSchema.optional(),
  summary: z.string().min(1),
  totalViolationsFound: z.number().int().nonnegative(),
  reportVersion: z.string().default('1.0.0'),
  generatorVersion: z.string().default('1.0.0'),
  engineVersion: z.string().default('1.0.0'),
  ruleBundleId: z.string().default('LM-IN-RULES-2026.09'),
  isDraftPreview: z.boolean().default(false),
  supersedesReportId: UuidSchema.optional(),
  reportData: InspectionReportSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type Report = z.infer<typeof ReportSchema>;
