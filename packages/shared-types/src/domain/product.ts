import { z } from 'zod';
import { PackagingTypeSchema, CommodityCategorySchema, type CommodityCategory } from '../enums/index.js';
import { UuidSchema, IsoTimestampSchema, MetadataRecordSchema } from './common.js';

export { CommodityCategorySchema, type CommodityCategory };

/**
 * Manufacturer / Packer / Importer Entity
 */
export const ManufacturerSchema = z.object({
  id: UuidSchema,
  legalName: z.string().min(1),
  tradeName: z.string().optional(),
  entityType: z.enum(['MANUFACTURER', 'PACKER', 'IMPORTER', 'DISTRIBUTOR']),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional(),
  country: z.string().default('India'),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format').optional(),
  cin: z.string().optional(),
  fssaiLicenseNumber: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type Manufacturer = z.infer<typeof ManufacturerSchema>;

/**
 * Canonical Product Entity
 */
export const ProductSchema = z.object({
  id: UuidSchema,
  brandName: z.string().min(1),
  productName: z.string().min(1),
  variant: z.string().optional(),
  category: CommodityCategorySchema,
  packagingType: PackagingTypeSchema,
  barcode: z.string().min(8).max(14).optional(),
  declaredNetQuantityValue: z.number().positive().optional(),
  declaredNetQuantityUnit: z.string().optional(),
  declaredMrp: z.number().positive().optional(),
  declaredUsp: z.number().positive().optional(),
  declaredUspUnit: z.string().optional(),
  manufacturerId: UuidSchema.optional(),
  manufacturer: ManufacturerSchema.optional(),
  attributes: MetadataRecordSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type Product = z.infer<typeof ProductSchema>;
