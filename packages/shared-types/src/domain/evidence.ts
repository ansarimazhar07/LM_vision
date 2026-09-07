import { z } from 'zod';
import { EvidenceStatusSchema } from '../enums/index.js';
import {
  GeoLocationSchema,
  IsoTimestampSchema,
  MetadataRecordSchema,
  UuidSchema,
} from './common.js';

/**
 * Type of legal/forensic evidence
 */
export const EvidenceTypeSchema = z.enum([
  'PACKAGE_IMAGE',
  'ECOMMERCE_SCREENSHOT',
  'INVOICE_RECEIPT',
  'LAB_TEST_REPORT',
  'SEIZURE_MEMO',
  'OFFICIAL_NOTICE',
  'PHYSICAL_SAMPLE_PHOTO',
  'OFFICER_AUDIO_NOTE',
  'OTHER',
]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

/**
 * Chain of Custody Event for Tamper-Evident Tracking
 */
export const CustodyEventSchema = z.object({
  eventId: UuidSchema,
  action: z.enum(['COLLECTED', 'HASHED', 'VERIFIED', 'TRANSFERRED', 'ARCHIVED']),
  performedByUserId: UuidSchema,
  timestamp: IsoTimestampSchema,
  notes: z.string().optional(),
  sha256Hash: z.string().regex(/^[a-f0-9]{64}$/i, 'Must be valid 64-char SHA-256 hex string').optional(),
});
export type CustodyEvent = z.infer<typeof CustodyEventSchema>;

/**
 * Canonical Evidence Entity
 */
export const EvidenceSchema = z.object({
  id: UuidSchema,
  inspectionId: UuidSchema,
  findingId: UuidSchema.optional(),
  type: EvidenceTypeSchema,
  status: EvidenceStatusSchema.default('ATTACHED'),
  title: z.string().min(1),
  description: z.string().optional(),
  fileUrl: z.string().url().or(z.string().min(1)),
  thumbnailUrl: z.string().url().optional(),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  sha256Hash: z.string().regex(/^[a-f0-9]{64}$/i, 'Must be valid 64-char SHA-256 hex string'),
  capturedAt: IsoTimestampSchema,
  capturedByUserId: UuidSchema,
  geoLocation: GeoLocationSchema.optional(),
  deviceMetadata: MetadataRecordSchema.optional(),
  chainOfCustody: z.array(CustodyEventSchema).default([]),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type Evidence = z.infer<typeof EvidenceSchema>;
