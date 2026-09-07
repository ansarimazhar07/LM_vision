// ============================================================================
// Inspection Domain Adapter
// @lm-vision/supabase-client — packages/supabase-client/src/adapters/inspection.ts
// ============================================================================
// Converts DatabaseRowInspection → partial canonical Inspection fields.
//
// IMPORTANT FIELD MAPPING NOTES:
//   DB column             → Canonical type field
//   inspector_id          → inspectorUserId
//   status (string)       → status (InspectionStatus enum)
//
// Fields NOT in the DB row that the canonical Inspection type requires:
//   - inspectionNumber: generated at service/application layer (e.g., "INSP-DL-2026-00042")
//   - syncStatus: mobile offline layer (Phase 16)
//   - product: joined from products table
//   - images, declarations, findings, evidence, etc.: separate queries
//
// The full canonical Inspection is assembled by the service layer.
// This adapter handles the core inspection record fields only.
// ============================================================================
import type { InspectionStatus, InspectionImage } from '@lm-vision/shared-types';
import type {
  DatabaseRowInspection,
  DatabaseRowInspectionImage,
} from '../types/database.js';

// ============================================================================
// Partial Inspection: scalar fields from the database row
// ============================================================================

/**
 * Scalar inspection fields extracted from the database row.
 * The service layer assembles the full canonical Inspection by joining
 * related tables (images, findings, evidence, declarations, etc.)
 */
export interface InspectionScalarFields {
  id: string;
  inspectionNumber: string | null; // Not stored in DB — computed by service layer
  inspectorUserId: string;
  productId: string | undefined;
  status: InspectionStatus;
  sourceType: 'PHYSICAL' | 'ECOMMERCE' | 'HYBRID';
  locationMetadata: Record<string, unknown>;
  startedAt: string;
  completedAt: string | undefined;
  ruleVersionContext: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Adapts a raw database inspection row to the scalar inspection fields.
 * Nested arrays (images, findings, etc.) must be populated by the calling service
 * via separate queries. This adapter handles the core scalar fields only.
 *
 * @param row - Raw database row from the inspections table
 * @returns Scalar inspection fields for assembly into canonical Inspection
 */
export function adaptInspectionRow(row: DatabaseRowInspection): InspectionScalarFields {
  return {
    id: row.id,
    inspectionNumber: null, // Computed by service layer (not stored in DB)
    inspectorUserId: row.inspector_id,
    productId: row.product_id ?? undefined,
    status: row.status as InspectionStatus,
    sourceType: row.source_type,
    locationMetadata: row.location_metadata,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    ruleVersionContext: row.rule_version_context,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Adapter: DatabaseRowInspectionImage → InspectionImage (canonical domain model)
// ============================================================================

/**
 * Adapts a raw inspection_images row to the canonical InspectionImage type.
 * Maps DB snake_case to camelCase, resolves nullable fields.
 *
 * STORAGE NOTE: storagePath is the private bucket object key.
 * The service layer must convert this to a signed URL before returning to clients.
 * Do NOT expose storagePath directly to mobile/web — always use signed URLs.
 */
export function adaptInspectionImage(row: DatabaseRowInspectionImage): InspectionImage {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    surface: (row.surface as InspectionImage['surface']) ?? 'UNKNOWN',
    // fileUrl will be populated with a signed URL by the service layer
    // storagePath is stored here as a placeholder — never expose raw path to clients
    fileUrl: row.storage_path, // Service layer must replace with signed URL before returning
    fileSizeBytes: 0, // Not stored in DB currently; updated when upload metadata is available
    mimeType: row.mime_type,
    sha256Hash: row.sha256,
    quality: row.quality_score !== null
      ? {
          overallScore: row.quality_score,
          isAcceptable: row.quality_score >= 0.6,
          // Detailed quality metrics not stored in DB — defaults provided
          // Full quality data comes from AI/CV analysis payload (Phase 5+)
          sharpness: 50,
          brightness: 50,
          glareDetected: false,
          blurDetected: false,
          shadowDetected: false,
          warnings: [],
        }
      : undefined,
    capturedAt: row.created_at,
    createdAt: row.created_at,
  };
}
