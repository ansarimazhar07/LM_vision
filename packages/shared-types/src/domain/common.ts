import { z } from 'zod';

/**
 * UUID v4 / standard UUID format validator
 */
export const UuidSchema = z
  .string()
  .uuid({ message: 'Must be a valid UUID' });
export type Uuid = z.infer<typeof UuidSchema>;

/**
 * UTC ISO 8601 Timestamp representation
 */
export const IsoTimestampSchema = z
  .string()
  .datetime({ message: 'Must be a valid ISO 8601 UTC timestamp string' });
export type IsoTimestamp = z.infer<typeof IsoTimestampSchema>;

/**
 * Geographic coordinates with accuracy
 */
export const GeoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().nonnegative().optional(),
  altitudeMeters: z.number().optional(),
  timestamp: IsoTimestampSchema.optional(),
});
export type GeoLocation = z.infer<typeof GeoLocationSchema>;

/**
 * Normalized 2D Bounding Box (coordinates in range 0.0 to 1.0 or pixel space)
 */
export const BoundingBoxSchema = z.object({
  xMin: z.number().min(0),
  yMin: z.number().min(0),
  xMax: z.number().min(0),
  yMax: z.number().min(0),
  width: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  unit: z.enum(['NORMALIZED', 'PIXEL']).default('NORMALIZED'),
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

/**
 * 2D Polygon Vertex
 */
export const Point2DSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Point2D = z.infer<typeof Point2DSchema>;

/**
 * Arbitrary Polygon region (for rotated bounding boxes or skewed labels)
 */
export const PolygonSchema = z.object({
  vertices: z.array(Point2DSchema).min(3),
});
export type Polygon = z.infer<typeof PolygonSchema>;

/**
 * Confidence Score bounded [0.0, 1.0]
 */
export const ConfidenceScoreSchema = z
  .number()
  .min(0, { message: 'Confidence score cannot be negative' })
  .max(1, { message: 'Confidence score cannot exceed 1.0' });
export type ConfidenceScore = z.infer<typeof ConfidenceScoreSchema>;

/**
 * Pagination Metadata
 */
export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/**
 * Standard Key-Value Metadata Record
 */
export const MetadataRecordSchema = z.record(z.string(), z.unknown());
export type MetadataRecord = z.infer<typeof MetadataRecordSchema>;
