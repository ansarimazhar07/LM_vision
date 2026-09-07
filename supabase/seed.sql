-- =============================================================================
-- LM-Vision Seed Data — Development & Testing Only
-- SIH 2026 Problem Statement 26034
-- =============================================================================
-- SAFETY RULES FOR THIS FILE:
-- 1. NO real credentials, API keys, or production UUIDs.
-- 2. NO fabricated statutory Legal Metrology rule numbers or thresholds.
-- 3. All records are explicitly synthetic demo data.
-- 4. Auth UUIDs are placeholder values — replace with real Supabase Auth UUIDs
--    when seeding against a real project.
-- 5. Rule data uses TEST_FIXTURE prefix to distinguish from real statutory rules.
-- =============================================================================

-- =============================================================================
-- Roles (canonical — always inserted; match the check constraint in migration 002)
-- =============================================================================
insert into public.roles (id, name, description, created_at)
values
  ('00000001-0000-0000-0000-000000000001', 'INSPECTOR',   'Field inspector performing physical package inspections', now()),
  ('00000001-0000-0000-0000-000000000002', 'SUPERVISOR',  'Supervisor reviewing inspection outcomes and team performance', now()),
  ('00000001-0000-0000-0000-000000000003', 'ADMIN',       'System administrator with full configuration access', now()),
  ('00000001-0000-0000-0000-000000000004', 'AUDITOR',     'Read-only auditor with access to inspection and audit records', now())
on conflict (id) do nothing;

-- =============================================================================
-- Demo Users
-- auth_user_id values below are PLACEHOLDERS.
-- In a real environment, these UUIDs must match auth.users.id records
-- created via Supabase Auth sign-up or admin user creation.
-- =============================================================================
-- Demo Inspector
insert into public.users (
  id, role_id, full_name, employee_code,
  badge_number, designation, jurisdiction_zone, jurisdiction_state,
  is_active, created_at, updated_at
) values (
  '00000002-0000-0000-0000-000000000001',
  '00000001-0000-0000-0000-000000000001', -- INSPECTOR role
  'Demo Inspector',
  'EMP-DEMO-001',
  'INS-DL-0042',
  'Inspector of Legal Metrology',
  'North Delhi Zone',
  'Delhi',
  true,
  now(),
  now()
) on conflict (id) do nothing;

-- Demo Supervisor
insert into public.users (
  id, role_id, full_name, employee_code,
  is_active, created_at, updated_at
) values (
  '00000002-0000-0000-0000-000000000002',
  '00000001-0000-0000-0000-000000000002', -- SUPERVISOR role
  'Demo Supervisor',
  'EMP-DEMO-002',
  true,
  now(),
  now()
) on conflict (id) do nothing;

-- Demo Admin
insert into public.users (
  id, role_id, full_name, employee_code,
  is_active, created_at, updated_at
) values (
  '00000002-0000-0000-0000-000000000003',
  '00000001-0000-0000-0000-000000000003', -- ADMIN role
  'Demo Administrator',
  'EMP-DEMO-003',
  true,
  now(),
  now()
) on conflict (id) do nothing;

-- Demo Auditor
insert into public.users (
  id, role_id, full_name, employee_code,
  is_active, created_at, updated_at
) values (
  '00000002-0000-0000-0000-000000000004',
  '00000001-0000-0000-0000-000000000004', -- AUDITOR role
  'Demo Auditor',
  'EMP-DEMO-004',
  true,
  now(),
  now()
) on conflict (id) do nothing;

-- =============================================================================
-- Demo Manufacturer
-- =============================================================================
insert into public.manufacturers (
  id, legal_name, aliases, contact_metadata, created_at, updated_at
) values (
  '00000003-0000-0000-0000-000000000001',
  'Demo Consumer Products Ltd.',
  array['Demo CPL', 'DCPL'],
  '{"registeredAddress": "Demo Industrial Area, Delhi - 110001", "website": "https://example-demo.invalid"}'::jsonb,
  now(),
  now()
) on conflict (id) do nothing;

-- =============================================================================
-- Demo Product
-- This is the "ABC Shampoo 500ml" scenario referenced in docs/12_DEMO_SCENARIO.md
-- Used for the flagship MockProvider demo.
-- =============================================================================
insert into public.products (
  id, manufacturer_id, name, category, package_type, metadata, created_at, updated_at
) values (
  '00000004-0000-0000-0000-000000000001',
  '00000003-0000-0000-0000-000000000001',
  'ABC Shampoo 500ml',
  'PERSONAL_CARE_COSMETICS',
  'BOTTLE',
  '{
    "declaredNetQuantity": "500 ml",
    "declaredMRP": "INR 250.00",
    "genericName": "Shampoo"
  }'::jsonb,
  now(),
  now()
) on conflict (id) do nothing;

-- =============================================================================
-- Demo Inspection (DRAFT status — awaiting Phase 3 mobile shell to advance lifecycle)
-- =============================================================================
insert into public.inspections (
  id, inspector_id, product_id, status, source_type,
  location_metadata, started_at, rule_version_context, created_at, updated_at
) values (
  '00000005-0000-0000-0000-000000000001',
  '00000002-0000-0000-0000-000000000001', -- Demo Inspector
  '00000004-0000-0000-0000-000000000001', -- ABC Shampoo 500ml
  'DRAFT',
  'PHYSICAL',
  '{"zone": "North Delhi", "locationNote": "Demo market — synthetic data"}'::jsonb,
  now(),
  '{"ruleVersionIds": [], "capturedAt": null, "note": "No active rule versions in Phase 2"}'::jsonb,
  now(),
  now()
) on conflict (id) do nothing;

-- =============================================================================
-- Rule Foundation Record (TEST FIXTURE — not a real statutory rule)
-- This is a structural placeholder to verify the rule schema.
-- DO NOT mark as ACTIVE — it has no source document (constraint would prevent it).
-- Real rules require: official PDF ingestion, human/legal review, ADMIN approval.
-- See docs/14_LEGAL_SOURCE_MAPPING.md and docs/PHASE_2_IMPLEMENTATION_NOTES.md.
-- =============================================================================
insert into public.rules (
  id, rule_number, sub_rule, title, category, created_at
) values (
  '00000006-0000-0000-0000-000000000001',
  null, -- NO fabricated rule number
  null,
  'TEST FIXTURE: Generic Name Presence Check',
  'declaration',
  now()
) on conflict (id) do nothing;

insert into public.rule_versions (
  id, rule_id, version, applicability, conditions, requirement,
  validation_type, approval_status, created_at
) values (
  '00000007-0000-0000-0000-000000000001',
  '00000006-0000-0000-0000-000000000001',
  '0.0.1-test-fixture',
  '{"note": "TEST FIXTURE ONLY — no real applicability predicate"}'::jsonb,
  '{"note": "TEST FIXTURE ONLY — no real conditions"}'::jsonb,
  '{"note": "TEST FIXTURE ONLY — no real requirement"}'::jsonb,
  null,
  'DRAFT', -- MUST remain DRAFT — cannot be ACTIVE without source evidence
  now()
) on conflict (id) do nothing;
