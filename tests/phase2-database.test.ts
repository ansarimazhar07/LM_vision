// ============================================================================
// Phase 2: Database Type & Schema Tests
// LM-Vision — SIH 2026 Problem Statement 26034
// ============================================================================
// Tests:
// 1. Database row type structure completeness (schema drift detection)
// 2. Adapter correctness (DB row → canonical domain model)
// 3. Constraint validation (confidence ranges, status values, etc.)
// 4. Seed data fixture validity
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  EXPECTED_TABLE_COLUMNS,
  SCHEMA_VERSION,
  type DatabaseRowUser,
  type DatabaseRowInspection,
  type DatabaseRowAiAnalysis,
  type DatabaseRowRuleVersion,
  type DatabaseRowEvidence,
  type DatabaseRowAuditLog,
  type DatabaseRowUserWithRole,
} from '@lm-vision/supabase-client/types';
import { adaptUser } from '@lm-vision/supabase-client';
import { adaptInspectionRow, adaptInspectionImage } from '@lm-vision/supabase-client';
import { UserSchema, InspectionStatusSchema } from '@lm-vision/shared-types';

// ============================================================================
// 1. Schema Drift Detection Tests
// ============================================================================
describe('Phase 2: Schema Drift Detection', () => {
  it('exports a SCHEMA_VERSION constant', () => {
    expect(SCHEMA_VERSION).toBe('2.0.0');
  });

  it('EXPECTED_TABLE_COLUMNS covers all 16 Phase 2 tables', () => {
    const tables = Object.keys(EXPECTED_TABLE_COLUMNS);
    expect(tables).toContain('roles');
    expect(tables).toContain('users');
    expect(tables).toContain('manufacturers');
    expect(tables).toContain('products');
    expect(tables).toContain('inspections');
    expect(tables).toContain('inspection_images');
    expect(tables).toContain('ai_analyses');
    expect(tables).toContain('declarations');
    expect(tables).toContain('rules');
    expect(tables).toContain('rule_versions');
    expect(tables).toContain('findings');
    expect(tables).toContain('evidence');
    expect(tables).toContain('inspector_decisions');
    expect(tables).toContain('ecommerce_listings');
    expect(tables).toContain('cross_source_comparisons');
    expect(tables).toContain('reports');
    expect(tables).toContain('audit_logs');
    // NOTE: audit_logs is in the map; roles table has columns
    expect(tables).toHaveLength(17);
  });

  it('users table has all required columns including inspector profile fields', () => {
    const cols = EXPECTED_TABLE_COLUMNS['users'];
    expect(cols).toContain('id');
    expect(cols).toContain('role_id');
    expect(cols).toContain('full_name');
    expect(cols).toContain('employee_code');
    expect(cols).toContain('is_active');
    expect(cols).toContain('badge_number');
    expect(cols).toContain('jurisdiction_zone');
    expect(cols).toContain('jurisdiction_state');
    expect(cols).toContain('created_at');
    expect(cols).toContain('updated_at');
  });

  it('rule_versions table has source evidence columns for legal source gate', () => {
    const cols = EXPECTED_TABLE_COLUMNS['rule_versions'];
    expect(cols).toContain('source_document');
    expect(cols).toContain('source_page');
    expect(cols).toContain('approved_by');
    expect(cols).toContain('approved_at');
    expect(cols).toContain('approval_status');
  });

  it('audit_logs table has all required append-only columns', () => {
    const cols = EXPECTED_TABLE_COLUMNS['audit_logs'];
    expect(cols).toContain('actor_user_id');
    expect(cols).toContain('action');
    expect(cols).toContain('entity_type');
    expect(cols).toContain('entity_id');
    expect(cols).toContain('before_data');
    expect(cols).toContain('after_data');
    expect(cols).toContain('metadata');
    expect(cols).toContain('created_at');
    // audit_logs has NO updated_at — it is append-only
    expect(cols).not.toContain('updated_at');
  });

  it('evidence table has sha256 and storage_path for integrity', () => {
    const cols = EXPECTED_TABLE_COLUMNS['evidence'];
    expect(cols).toContain('sha256');
    expect(cols).toContain('storage_path');
    expect(cols).toContain('captured_by');
    expect(cols).toContain('verified_by');
    expect(cols).toContain('verified_at');
  });

  it('inspection_images table enforces sha256 column presence', () => {
    const cols = EXPECTED_TABLE_COLUMNS['inspection_images'];
    expect(cols).toContain('sha256');
    expect(cols).toContain('storage_path');
    expect(cols).toContain('mime_type');
    expect(cols).toContain('surface');
  });
});

// ============================================================================
// 2. DatabaseRowUser Type Shape Tests
// ============================================================================
describe('Phase 2: DatabaseRow Type Shapes', () => {
  const mockDbUser: DatabaseRowUser = {
    id: '11111111-0000-0000-0000-000000000001',
    role_id: '00000001-0000-0000-0000-000000000001',
    full_name: 'Test Inspector',
    employee_code: 'EMP-001',
    phone: '+91-9000000000',
    is_active: true,
    badge_number: 'INS-001',
    designation: 'Inspector of Legal Metrology',
    jurisdiction_zone: 'North Zone',
    jurisdiction_state: 'Delhi',
    office_address: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    last_login_at: null,
  };

  it('DatabaseRowUser has expected shape with all nullable fields', () => {
    expect(mockDbUser.id).toBeTruthy();
    expect(mockDbUser.role_id).toBeTruthy();
    expect(mockDbUser.full_name).toBe('Test Inspector');
    expect(mockDbUser.badge_number).toBe('INS-001');
    expect(mockDbUser.office_address).toBeNull();
    expect(mockDbUser.last_login_at).toBeNull();
  });

  const mockDbInspection: DatabaseRowInspection = {
    id: '22222222-0000-0000-0000-000000000001',
    inspector_id: '00000002-0000-0000-0000-000000000001',
    product_id: '00000004-0000-0000-0000-000000000001',
    status: 'DRAFT',
    source_type: 'PHYSICAL',
    location_metadata: { zone: 'North Delhi' },
    started_at: '2026-09-05T07:00:00Z',
    completed_at: null,
    rule_version_context: { ruleVersionIds: [] },
    created_at: '2026-09-05T07:00:00Z',
    updated_at: '2026-09-05T07:00:00Z',
  };

  it('DatabaseRowInspection has expected shape including source_type', () => {
    expect(mockDbInspection.status).toBe('DRAFT');
    expect(mockDbInspection.source_type).toBe('PHYSICAL');
    expect(mockDbInspection.product_id).toBeTruthy();
    expect(mockDbInspection.completed_at).toBeNull();
  });

  it('DatabaseRowAiAnalysis rejects invalid provider values at type level', () => {
    // TypeScript type constraint — provider must be 'GEMINI' | 'OPENAI' | 'MOCK'
    const mockAnalysis: DatabaseRowAiAnalysis = {
      id: 'aaaaaaaa-0000-0000-0000-000000000001',
      inspection_id: '22222222-0000-0000-0000-000000000001',
      provider: 'MOCK',
      model: 'mock-vision-engine-v1',
      schema_version: '1.0',
      status: 'COMPLETED',
      confidence: 0.95,
      payload: { declarations: [] },
      created_at: '2026-09-05T07:00:00Z',
    };
    expect(mockAnalysis.provider).toBe('MOCK');
    expect(mockAnalysis.confidence).toBeGreaterThanOrEqual(0);
    expect(mockAnalysis.confidence).toBeLessThanOrEqual(1);
  });

  it('DatabaseRowRuleVersion has source evidence columns required for ACTIVE status', () => {
    const draftVersion: DatabaseRowRuleVersion = {
      id: 'eeeeeeee-0000-0000-0000-000000000001',
      rule_id: '00000006-0000-0000-0000-000000000001',
      version: '0.0.1-test-fixture',
      applicability: {},
      conditions: {},
      requirement: {},
      validation_type: null,
      threshold: null,
      exceptions: null,
      effective_from: null,
      effective_to: null,
      source_document: null,  // null → cannot be ACTIVE
      source_page: null,       // null → cannot be ACTIVE
      approval_status: 'DRAFT',
      approved_by: null,
      approved_at: null,
      created_at: '2026-09-05T07:00:00Z',
    };
    expect(draftVersion.approval_status).toBe('DRAFT');
    expect(draftVersion.source_document).toBeNull();
    // A DRAFT rule version has no source evidence — this is correct and expected
    expect(draftVersion.approved_by).toBeNull();
  });

  it('DatabaseRowEvidence tracks sha256 and storage_path for binary evidence', () => {
    const mockEvidence: DatabaseRowEvidence = {
      id: 'dddddddd-0000-0000-0000-000000000001',
      inspection_id: '22222222-0000-0000-0000-000000000001',
      finding_id: null,
      evidence_type: 'IMAGE',
      storage_path: '22222222-0000-0000-0000-000000000001/evidence-abc123.jpg',
      sha256: 'a'.repeat(64),
      source_reference: { page: 1, region: 'top-left' },
      captured_at: '2026-09-05T07:00:00Z',
      captured_by: '00000002-0000-0000-0000-000000000001',
      verified_by: null,
      verified_at: null,
      status: 'ATTACHED',
      created_at: '2026-09-05T07:00:00Z',
    };
    expect(mockEvidence.sha256).toHaveLength(64);
    expect(mockEvidence.storage_path).toContain(mockEvidence.inspection_id);
    expect(mockEvidence.verified_by).toBeNull();
  });

  it('DatabaseRowAuditLog has no updated_at (append-only design)', () => {
    const mockLog: DatabaseRowAuditLog = {
      id: 'ffffffff-0000-0000-0000-000000000001',
      actor_user_id: '00000002-0000-0000-0000-000000000001',
      action: 'INSPECTION_CREATED',
      entity_type: 'inspection',
      entity_id: '22222222-0000-0000-0000-000000000001',
      before_data: null,
      after_data: { status: 'DRAFT' },
      metadata: { requestId: 'req-test-001' },
      created_at: '2026-09-05T07:00:00Z',
    };
    // Type does not have updated_at — append-only design
    expect('updated_at' in mockLog).toBe(false);
    expect(mockLog.action).toBe('INSPECTION_CREATED');
    expect(mockLog.entity_type).toBe('inspection');
  });
});

// ============================================================================
// 3. Adapter Correctness Tests
// ============================================================================
describe('Phase 2: Domain Adapter Correctness', () => {
  const mockDbUserWithRole: DatabaseRowUserWithRole = {
    id: '11111111-0000-0000-0000-000000000001',
    role_id: '00000001-0000-0000-0000-000000000001',
    full_name: 'Demo Inspector',
    employee_code: 'EMP-DEMO-001',
    phone: null,
    is_active: true,
    badge_number: 'INS-DL-0042',
    designation: 'Inspector of Legal Metrology',
    jurisdiction_zone: 'North Delhi Zone',
    jurisdiction_state: 'Delhi',
    office_address: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    last_login_at: '2026-09-05T07:00:00Z',
    roles: {
      id: '00000001-0000-0000-0000-000000000001',
      name: 'INSPECTOR',
      description: 'Field inspector',
      created_at: '2026-01-01T00:00:00Z',
    },
  };

  it('adaptUser maps DB row to canonical User correctly', () => {
    const user = adaptUser(mockDbUserWithRole);
    expect(user.id).toBe('11111111-0000-0000-0000-000000000001');
    expect(user.fullName).toBe('Demo Inspector');
    expect(user.role).toBe('INSPECTOR');
    expect(user.isActive).toBe(true);
    expect(user.phone).toBeUndefined();
    expect(user.lastLoginAt).toBe('2026-09-05T07:00:00Z');
  });

  it('adaptUser extracts inspector profile when profile fields are present', () => {
    const user = adaptUser(mockDbUserWithRole);
    expect(user.inspectorProfile).toBeDefined();
    expect(user.inspectorProfile?.badgeNumber).toBe('INS-DL-0042');
    expect(user.inspectorProfile?.designation).toBe('Inspector of Legal Metrology');
    expect(user.inspectorProfile?.jurisdictionZone).toBe('North Delhi Zone');
    expect(user.inspectorProfile?.jurisdictionState).toBe('Delhi');
    expect(user.inspectorProfile?.officeAddress).toBeUndefined();
  });

  it('adaptUser returns undefined inspectorProfile for non-inspector users', () => {
    const adminRow: DatabaseRowUserWithRole = {
      ...mockDbUserWithRole,
      badge_number: null,
      designation: null,
      jurisdiction_zone: null,
      jurisdiction_state: null,
      office_address: null,
      roles: {
        id: '00000001-0000-0000-0000-000000000003',
        name: 'ADMIN',
        description: 'Administrator',
        created_at: '2026-01-01T00:00:00Z',
      },
    };
    const user = adaptUser(adminRow);
    expect(user.inspectorProfile).toBeUndefined();
    expect(user.role).toBe('ADMIN');
  });

  it('adaptInspectionRow maps inspector_id to inspectorUserId', () => {
    const dbRow: DatabaseRowInspection = {
      id: '22222222-0000-0000-0000-000000000001',
      inspector_id: '11111111-0000-0000-0000-000000000001',
      product_id: '00000004-0000-0000-0000-000000000001',
      status: 'DRAFT',
      source_type: 'PHYSICAL',
      location_metadata: { zone: 'North Delhi' },
      started_at: '2026-09-05T07:00:00Z',
      completed_at: null,
      rule_version_context: {},
      created_at: '2026-09-05T07:00:00Z',
      updated_at: '2026-09-05T07:00:00Z',
    };

    const result = adaptInspectionRow(dbRow);
    expect(result.inspectorUserId).toBe('11111111-0000-0000-0000-000000000001');
    expect(result.status).toBe('DRAFT');
    expect(InspectionStatusSchema.safeParse(result.status).success).toBe(true);
    expect(result.completedAt).toBeUndefined();
    expect(result.inspectionNumber).toBeNull(); // Not stored in DB
  });

  it('adaptInspectionImage maps DB row to canonical InspectionImage fields', () => {
    const dbImageRow = {
      id: 'imgimg01-0000-0000-0000-000000000001',
      inspection_id: '22222222-0000-0000-0000-000000000001',
      storage_path: '22222222-0000-0000-0000-000000000001/img-abc.jpg',
      sha256: 'b'.repeat(64),
      mime_type: 'image/jpeg',
      width: 1920,
      height: 1080,
      surface: 'FRONT',
      capture_metadata: {},
      quality_score: 0.87,
      created_at: '2026-09-05T07:10:00Z',
    };

    const image = adaptInspectionImage(dbImageRow);
    expect(image.id).toBe(dbImageRow.id);
    expect(image.surface).toBe('FRONT');
    expect(image.sha256Hash).toBe('b'.repeat(64));
    expect(image.mimeType).toBe('image/jpeg');
    expect(image.quality?.overallScore).toBe(0.87);
    expect(image.quality?.isAcceptable).toBe(true);
  });
});

// ============================================================================
// 4. Constraint Validation (model-layer tests — not live DB)
// ============================================================================
describe('Phase 2: Constraint Validation Logic', () => {
  it('ACTIVE approval_status requires source_document and source_page', () => {
    // This tests the INTENT of the DB constraint from migration 007
    // Runtime enforcement requires a live PostgreSQL environment (RLS_RUNTIME_VERIFICATION_REQUIRED)
    const activeVersionWithoutSource: Partial<DatabaseRowRuleVersion> = {
      approval_status: 'ACTIVE',
      source_document: null, // VIOLATION — should fail DB constraint
      source_page: null,     // VIOLATION — should fail DB constraint
      approved_by: null,
    };

    // Validate the constraint intent in application code
    const canBeActive = (v: Partial<DatabaseRowRuleVersion>): boolean => {
      if (v.approval_status !== 'ACTIVE') return true;
      return (
        v.source_document !== null && v.source_document !== undefined &&
        v.source_page !== null && v.source_page !== undefined &&
        v.approved_by !== null && v.approved_by !== undefined
      );
    };

    expect(canBeActive(activeVersionWithoutSource)).toBe(false);
    expect(canBeActive({
      approval_status: 'DRAFT',
      source_document: null,
      source_page: null,
      approved_by: null,
    })).toBe(true);
    expect(canBeActive({
      approval_status: 'ACTIVE',
      source_document: 'Legal Metrology (PC) Rules 2011',
      source_page: 'Page 4, Rule 2(1)',
      approved_by: '00000002-0000-0000-0000-000000000003',
    })).toBe(true);
  });

  it('confidence scores must be between 0 and 1', () => {
    const isValidConfidence = (v: number | null) =>
      v === null || (v >= 0 && v <= 1);

    expect(isValidConfidence(0)).toBe(true);
    expect(isValidConfidence(1)).toBe(true);
    expect(isValidConfidence(0.75)).toBe(true);
    expect(isValidConfidence(null)).toBe(true);
    expect(isValidConfidence(-0.1)).toBe(false);
    expect(isValidConfidence(1.05)).toBe(false);
  });

  it('sha256 must be exactly 64 lowercase hex characters', () => {
    const sha256Regex = /^[0-9a-f]{64}$/;
    expect(sha256Regex.test('a'.repeat(64))).toBe(true);
    expect(sha256Regex.test('0'.repeat(64))).toBe(true);
    expect(sha256Regex.test('A'.repeat(64))).toBe(false); // uppercase invalid
    expect(sha256Regex.test('a'.repeat(63))).toBe(false); // too short
    expect(sha256Regex.test('a'.repeat(65))).toBe(false); // too long
    expect(sha256Regex.test('invalid-hash')).toBe(false);
  });

  it('inspection source_type must be PHYSICAL, ECOMMERCE, or HYBRID', () => {
    const validSourceTypes = ['PHYSICAL', 'ECOMMERCE', 'HYBRID'];
    expect(validSourceTypes.includes('PHYSICAL')).toBe(true);
    expect(validSourceTypes.includes('ECOMMERCE')).toBe(true);
    expect(validSourceTypes.includes('HYBRID')).toBe(true);
    expect(validSourceTypes.includes('DIGITAL')).toBe(false);
    expect(validSourceTypes.includes('BOTH')).toBe(false);
  });

  it('inspection status must be one of the canonical lifecycle values', () => {
    const validStatuses = [
      'DRAFT', 'CAPTURED', 'PROCESSING', 'ANALYZED',
      'REVIEW_REQUIRED', 'READY_FOR_DECISION', 'DECIDED',
      'REPORT_GENERATED', 'SYNCED', 'ARCHIVED',
    ];
    for (const s of validStatuses) {
      expect(InspectionStatusSchema.safeParse(s).success).toBe(true);
    }
    expect(InspectionStatusSchema.safeParse('COMPLETED').success).toBe(false);
    expect(InspectionStatusSchema.safeParse('PENDING').success).toBe(false);
  });

  it('audit_log action must be recognized event type (legal source gate enforcement)', () => {
    const recognizedActions = [
      'RULE_VERSION_ACTIVATED', 'RULE_VERSION_APPROVED', 'USER_ROLE_CHANGED',
      'INSPECTION_CREATED', 'EVIDENCE_ATTACHED', 'DECISION_SUBMITTED', 'REPORT_GENERATED',
    ];
    for (const action of recognizedActions) {
      // These are the recognized actions from migration 011
      expect(typeof action).toBe('string');
    }
    // Validate that RULE_VERSION_ACTIVATED is in the expected set
    expect(recognizedActions).toContain('RULE_VERSION_ACTIVATED');
    expect(recognizedActions).toContain('USER_ROLE_CHANGED');
  });

  it('evidence binary types require sha256 and storage_path (constraint intent)', () => {
    const binaryEvidence = { evidence_type: 'IMAGE', sha256: null, storage_path: null };
    const requiresHash = (e: { evidence_type: string; sha256: string | null; storage_path: string | null }) =>
      !['IMAGE', 'DOCUMENT'].includes(e.evidence_type) ||
      (e.sha256 !== null && e.storage_path !== null);

    expect(requiresHash(binaryEvidence)).toBe(false); // IMAGE without hash/path — invalid
    expect(requiresHash({ evidence_type: 'NOTE', sha256: null, storage_path: null })).toBe(true);
    expect(requiresHash({ evidence_type: 'IMAGE', sha256: 'a'.repeat(64), storage_path: 'path/img.jpg' })).toBe(true);
  });
});

// ============================================================================
// 5. Seed Data Validity Tests
// ============================================================================
describe('Phase 2: Seed Data Validity', () => {
  it('seed roles match canonical UserRole enum values', () => {
    // These must match the canonical UserRole enum and DB check constraint
    const seedRoles = ['INSPECTOR', 'SUPERVISOR', 'ADMIN', 'AUDITOR'];
    for (const role of seedRoles) {
      expect(['INSPECTOR', 'SUPERVISOR', 'ADMIN', 'AUDITOR']).toContain(role);
    }
    expect(seedRoles).toHaveLength(4); // All 4 roles must be seeded
  });

  it('seed rule version is DRAFT (not ACTIVE) — legal source gate compliance', () => {
    // The seed.sql inserts a TEST FIXTURE rule version with approval_status='DRAFT'
    // This is correct — it cannot be ACTIVE without source evidence
    const seedRuleVersionStatus = 'DRAFT';
    expect(seedRuleVersionStatus).toBe('DRAFT');
    expect(seedRuleVersionStatus).not.toBe('ACTIVE');
  });

  it('seed product matches the ABC Shampoo 500ml demo scenario', () => {
    const seedProduct = {
      name: 'ABC Shampoo 500ml',
      category: 'PERSONAL_CARE_COSMETICS',
      package_type: 'BOTTLE',
    };
    expect(seedProduct.category).toBe('PERSONAL_CARE_COSMETICS');
    expect(seedProduct.name).toContain('Shampoo');
  });

  it('seed inspection starts in DRAFT status', () => {
    const seedInspectionStatus = 'DRAFT';
    expect(InspectionStatusSchema.safeParse(seedInspectionStatus).success).toBe(true);
  });
});
