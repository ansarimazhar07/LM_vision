import { z } from 'zod';
import { SeveritySchema } from '../enums/index.js';
import {
  ConfidenceScoreSchema,
  IsoTimestampSchema,
  MetadataRecordSchema,
  UuidSchema,
} from './common.js';

/**
 * Canonical E-Commerce Listing Entity
 */
export const EcommerceListingSchema = z.object({
  id: UuidSchema,
  platformName: z.string().min(1),
  productUrl: z.string().url().or(z.string().min(1)),
  productTitle: z.string().min(1),
  sellerName: z.string().optional(),
  sellerAddress: z.string().optional(),
  listedPriceInr: z.number().nonnegative(),
  listedMrpInr: z.number().nonnegative().optional(),
  listedNetQuantity: z.string().optional(),
  listedCountryOfOrigin: z.string().optional(),
  listedManufacturer: z.string().optional(),
  screenshotEvidenceId: UuidSchema.optional(),
  rawAttributes: MetadataRecordSchema.optional(),
  capturedAt: IsoTimestampSchema,
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type EcommerceListing = z.infer<typeof EcommerceListingSchema>;

/**
 * Specific Discrepancy Item between Physical Package and Online Listing
 */
export const DiscrepancyItemSchema = z.object({
  attributeName: z.string().min(1),
  physicalPackageValue: z.string(),
  ecommerceListingValue: z.string(),
  isViolation: z.boolean(),
  severity: SeveritySchema,
  explanation: z.string().min(1),
});
export type DiscrepancyItem = z.infer<typeof DiscrepancyItemSchema>;

/**
 * Cross-Source Comparison Container
 */
export const CrossSourceComparisonSchema = z.object({
  id: UuidSchema,
  inspectionId: UuidSchema,
  ecommerceListingId: UuidSchema,
  ecommerceListing: EcommerceListingSchema.optional(),
  mrpMatch: z.boolean(),
  netQuantityMatch: z.boolean(),
  countryOfOriginMatch: z.boolean(),
  manufacturerMatch: z.boolean(),
  discrepancies: z.array(DiscrepancyItemSchema).default([]),
  overallConsistencyScore: ConfidenceScoreSchema,
  summary: z.string().min(1),
  evaluatedAt: IsoTimestampSchema,
  createdAt: IsoTimestampSchema,
});
export type CrossSourceComparison = z.infer<typeof CrossSourceComparisonSchema>;
