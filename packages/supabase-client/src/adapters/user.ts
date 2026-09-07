// ============================================================================
// User Domain Adapter
// @lm-vision/supabase-client — packages/supabase-client/src/adapters/user.ts
// ============================================================================
// Converts DatabaseRowUser + DatabaseRowRole → canonical User domain model.
//
// The separation:
//   DatabaseRowUser (snake_case, string timestamps, flat profile)
//   ↓ adaptUser()
//   User (camelCase, validated, InspectorProfile nested, correct types)
//
// This adapter is the boundary between the database representation and
// the canonical domain model from @lm-vision/shared-types.
// ============================================================================
import type { User, UserRole } from '@lm-vision/shared-types';
import type { DatabaseRowUser, DatabaseRowRole } from '../types/database.js';

// ============================================================================
// Adapter: DatabaseRowUser → User (canonical domain model)
// ============================================================================

/**
 * Combined row shape used when querying users with their role joined.
 */
export interface DatabaseRowUserWithRole extends DatabaseRowUser {
  roles: DatabaseRowRole;
}

/**
 * Adapts a database user row (with joined role) into the canonical User domain model.
 * Timestamps are converted from PostgreSQL ISO strings to the canonical IsoTimestamp format.
 * Inspector profile fields are extracted into a nested object if present.
 *
 * @param row - Raw database row from a users JOIN roles query
 * @returns Canonical User domain model
 */
export function adaptUser(row: DatabaseRowUserWithRole): User {
  const roleName = row.roles.name as UserRole;

  const hasInspectorProfile =
    row.badge_number !== null ||
    row.designation !== null ||
    row.jurisdiction_zone !== null ||
    row.jurisdiction_state !== null;

  return {
    id: row.id,
    // NOTE: email is not stored in public.users — it lives in auth.users.
    // The caller must provide email from the auth.users record or auth session.
    // This adapter uses a placeholder; real email must be merged at the service layer.
    email: '', // Merged from auth.users by calling service
    fullName: row.full_name,
    role: roleName,
    phone: row.phone ?? undefined,
    isActive: row.is_active,
    inspectorProfile: hasInspectorProfile
      ? {
          badgeNumber: row.badge_number ?? '',
          designation: row.designation ?? '',
          jurisdictionZone: row.jurisdiction_zone ?? '',
          jurisdictionState: row.jurisdiction_state ?? '',
          officeAddress: row.office_address ?? undefined,
        }
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at ?? undefined,
  };
}

/**
 * Adapts a database user row into a partial User (without email, no role join available).
 * Use when the role information is not available in the query result.
 * The role field must be populated by the caller.
 */
export function adaptUserPartial(
  row: DatabaseRowUser,
  role: UserRole,
): User {
  const hasInspectorProfile =
    row.badge_number !== null ||
    row.designation !== null ||
    row.jurisdiction_zone !== null ||
    row.jurisdiction_state !== null;

  return {
    id: row.id,
    email: '', // Must be merged from auth context
    fullName: row.full_name,
    role,
    phone: row.phone ?? undefined,
    isActive: row.is_active,
    inspectorProfile: hasInspectorProfile
      ? {
          badgeNumber: row.badge_number ?? '',
          designation: row.designation ?? '',
          jurisdictionZone: row.jurisdiction_zone ?? '',
          jurisdictionState: row.jurisdiction_state ?? '',
          officeAddress: row.office_address ?? undefined,
        }
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at ?? undefined,
  };
}
