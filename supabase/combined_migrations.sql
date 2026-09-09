-- ============================================================================
-- LM-VISION COMPLETE SUPABASE CLOUD SCHEMA MIGRATIONS
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vcxxjjrqbbcbtpputzpx/sql/new
-- ============================================================================


-- ============================================================================
-- MIGRATION: 20260905000001_extensions_and_helpers.sql
-- ============================================================================

-- =============================================================================
-- Migration 001: PostgreSQL Extensions & Helper Functions
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: nothing (must run first)
-- =============================================================================

-- Enable UUID generation (uuid_generate_v4())
create extension if not exists "uuid-ossp" with schema extensions;

-- Enable pgcrypto for gen_random_uuid() and cryptographic functions
create extension if not exists "pgcrypto" with schema extensions;

-- =============================================================================
-- Utility: auto-update updated_at timestamp on row mutation
-- Used by all mutable business entity tables via trigger attachment.
-- =============================================================================
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.update_updated_at_column() is
  'Trigger function: automatically updates updated_at to current UTC timestamp on any row update. '
  'Attach via: CREATE TRIGGER <table>_updated_at BEFORE UPDATE ON <table> FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';

-- =============================================================================
-- Utility: current authenticated user ID from JWT claim
-- Wraps auth.uid() with a null-safe cast for use in RLS policies.
-- =============================================================================
create or replace function public.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

comment on function public.current_user_id() is
  'Returns the UUID of the currently authenticated Supabase Auth user. '
  'Used in RLS policies. Returns NULL for unauthenticated requests.';




-- ============================================================================
-- MIGRATION: 20260905000002_roles_users.sql
-- ============================================================================

-- =============================================================================
-- Migration 002: Roles & Users
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: 001_extensions_and_helpers
-- Schema source: docs/04_DATABASE_DESIGN.md §3 (roles, users)
-- Security: docs/08_SECURITY_SPECIFICATION.md §3 (RBAC)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: roles
-- Canonical application roles. Row count is small; seeded by seed.sql.
-- Canonical values: INSPECTOR, SUPERVISOR, ADMIN, AUDITOR
-- -----------------------------------------------------------------------------
create table public.roles (
  id          uuid        not null default gen_random_uuid(),
  name        text        not null,
  description text        not null default '',
  created_at  timestamptz not null default now(),

  constraint roles_pkey primary key (id),
  constraint roles_name_unique unique (name),
  constraint roles_name_valid check (
    name in ('INSPECTOR', 'SUPERVISOR', 'ADMIN', 'AUDITOR')
  )
);

comment on table public.roles is
  'Application-level RBAC roles. Canonical values: INSPECTOR, SUPERVISOR, ADMIN, AUDITOR. '
  'Row-level security is NOT enabled on this table — roles are read-only reference data for all authenticated users, '
  'and write access is controlled via service-role only.';

comment on column public.roles.name is
  'Canonical role identifier. One of: INSPECTOR, SUPERVISOR, ADMIN, AUDITOR.';

-- -----------------------------------------------------------------------------
-- Table: users
-- Application-level user profile. ID matches auth.users.id (Supabase Auth UUID).
-- This is NOT a shadow of auth.users; it is the application profile.
-- The auth.users record is the identity authority (Supabase Auth).
-- This record holds the application-level role assignment and profile data.
-- -----------------------------------------------------------------------------
create table public.users (
  id              uuid        not null,
  role_id         uuid        not null,
  full_name       text        not null,
  employee_code   text,
  phone           text,
  is_active       boolean     not null default true,
  -- Inspector-specific profile fields (nullable for non-inspector roles)
  badge_number        text,
  designation         text,
  jurisdiction_zone   text,
  jurisdiction_state  text,
  office_address      text,
  -- Timestamps
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  last_login_at timestamptz,

  constraint users_pkey primary key (id),
  constraint users_role_fk foreign key (role_id)
    references public.roles(id) on delete restrict on update cascade,
  -- Link to Supabase Auth — enforced at application layer, not via FK to auth.users
  -- (auth schema FKs are not exposed in public schema migrations)
  constraint users_employee_code_unique unique (employee_code)
);

comment on table public.users is
  'Application user profiles. id matches auth.users.id from Supabase Auth. '
  'Supabase Auth is the identity authority; this table holds application-level role and profile data. '
  'Role changes must go through privileged server-side operations only (service-role client).';

comment on column public.users.id is
  'UUID matching the Supabase Auth user ID (auth.users.id). Set by a trigger on auth.users insert.';

comment on column public.users.role_id is
  'FK to roles.id. Changed only by ADMIN via server-side operations. '
  'Users cannot change their own role — enforced by RLS in migration 012.';

comment on column public.users.employee_code is
  'Operational identifier (badge/employee code). Optional. '
  'Should not contain personally sensitive identifiers beyond operational necessity.';

comment on column public.users.badge_number is
  'Inspector badge number. Nullable — only required for INSPECTOR role.';

-- Index: employee_code lookup
create index idx_users_employee_code on public.users(employee_code)
  where employee_code is not null;

-- Index: role lookup (for RLS policy joins)
create index idx_users_role on public.users(role_id);

-- Index: active user lookup
create index idx_users_active on public.users(is_active) where is_active = true;

-- Trigger: auto-update updated_at
create trigger users_updated_at
  before update on public.users
  for each row execute function public.update_updated_at_column();

-- =============================================================================
-- Trigger: create application user profile on Supabase Auth sign-up
-- This trigger runs in the auth schema context and creates a profile in public.users.
-- The default role is INSPECTOR (lowest privilege). Role elevation requires ADMIN action.
-- =============================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inspector_role_id uuid;
begin
  -- Resolve the default role (INSPECTOR — least privilege for new sign-ups)
  select id into v_inspector_role_id
  from public.roles
  where name = 'INSPECTOR'
  limit 1;

  if v_inspector_role_id is null then
    raise exception 'handle_new_auth_user: INSPECTOR role not found in public.roles. '
      'Ensure seed data has been applied before enabling new sign-ups.';
  end if;

  insert into public.users (
    id,
    role_id,
    full_name,
    is_active,
    created_at,
    updated_at
  ) values (
    new.id,
    v_inspector_role_id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    true,
    now(),
    now()
  );

  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'Trigger function: creates a public.users profile row when a new auth.users record is inserted. '
  'Default role is INSPECTOR (least privilege). An ADMIN must elevate role through server-side operations. '
  'SECURITY: Users cannot modify role_id via this trigger or RLS. Role escalation requires privileged server action.';

-- Attach trigger to auth.users (Supabase Auth table)
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =============================================================================
-- Utility: get the application role for the current authenticated user
-- Used in RLS policies to check role-based access.
-- =============================================================================
create or replace function public.current_user_role()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select r.name into v_role
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = auth.uid()
  limit 1;
  return v_role;
exception when others then
  return null;
end;
$$;

comment on function public.current_user_role() is
  'Returns the role name for the currently authenticated user from the application users table. '
  'NOTE: This is the application-level role (INSPECTOR/SUPERVISOR/ADMIN/AUDITOR), not the PostgreSQL role.';

-- =============================================================================
-- Utility: check if current user has a specific role by role name
-- =============================================================================
create or replace function public.current_user_has_role(role_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.id = auth.uid()
      and r.name = role_name
      and u.is_active = true
  ) into v_exists;
  return coalesce(v_exists, false);
exception when others then
  return false;
end;
$$;

comment on function public.current_user_has_role(text) is
  'Returns true if the currently authenticated user has the specified application role. '
  'Example: public.current_user_has_role(''ADMIN'')';




-- ============================================================================
-- MIGRATION: 20260905000003_manufacturers_products.sql
-- ============================================================================

-- =============================================================================
-- Migration 003: Manufacturers & Products
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: 002_roles_users
-- Schema source: docs/04_DATABASE_DESIGN.md §3 (manufacturers, products)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: manufacturers
-- Canonical legal entity that produces or packs products.
-- -----------------------------------------------------------------------------
create table public.manufacturers (
  id               uuid        not null default gen_random_uuid(),
  legal_name       text        not null,
  aliases          text[]      not null default '{}',
  contact_metadata jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint manufacturers_pkey primary key (id),
  constraint manufacturers_legal_name_nonempty check (char_length(trim(legal_name)) > 0)
);

comment on table public.manufacturers is
  'Legal entities (manufacturers, packers, importers) associated with inspected products. '
  'contact_metadata is a flexible jsonb payload for non-sensitive business contact information.';

comment on column public.manufacturers.legal_name is
  'The canonical/legal name as it appears on official registration. '
  'Used for cross-source comparison with package declarations.';

comment on column public.manufacturers.aliases is
  'Alternative names/abbreviations used in search and matching. '
  'Example: ["Hindustan Unilever", "HUL"]';

comment on column public.manufacturers.contact_metadata is
  'Non-sensitive business metadata: address, registered office, website. '
  'Must not store aadhaar, PAN, or other personally sensitive identifiers.';

-- Index: legal name search
create index idx_manufacturers_legal_name on public.manufacturers(legal_name);

-- Trigger: auto-update updated_at
create trigger manufacturers_updated_at
  before update on public.manufacturers
  for each row execute function public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Table: products
-- Canonical product identity. One product can be inspected many times.
-- -----------------------------------------------------------------------------
create table public.products (
  id              uuid        not null default gen_random_uuid(),
  manufacturer_id uuid        not null,
  name            text        not null,
  category        text        not null,
  package_type    text,
  metadata        jsonb       not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint products_pkey primary key (id),
  constraint products_manufacturer_fk foreign key (manufacturer_id)
    references public.manufacturers(id) on delete restrict on update cascade,
  constraint products_name_nonempty check (char_length(trim(name)) > 0),
  constraint products_category_nonempty check (char_length(trim(category)) > 0),
  constraint products_package_type_valid check (
    package_type is null or package_type in (
      'BOTTLE', 'BOX', 'POUCH', 'CAN', 'JAR', 'WRAPPER',
      'BLISTER_PACK', 'CARTON', 'TUBE', 'OTHER'
    )
  )
);

comment on table public.products is
  'Canonical product records. A product belongs to one manufacturer and may be inspected many times. '
  'metadata is a flexible jsonb payload for product-specific attributes (dimensions, net quantity, category-specific fields).';

comment on column public.products.category is
  'Product commodity category. Aligned with CommodityCategory enum in shared-types. '
  'Values: FOOD_BEVERAGE, PERSONAL_CARE_COSMETICS, CLEANING_HOUSEHOLD, PHARMACEUTICAL_HEALTHCARE, '
  'ELECTRONICS_APPLIANCES, TEXTILE_APPAREL, COMMODITY_GRAINS_PULSES_OILS, OTHER.';

comment on column public.products.package_type is
  'Physical package format. Aligned with PackagingType enum in shared-types.';

-- Index: name search
create index idx_products_name on public.products(name);

-- Index: category filter
create index idx_products_category on public.products(category);

-- Index: manufacturer lookup
create index idx_products_manufacturer on public.products(manufacturer_id);

-- Trigger: auto-update updated_at
create trigger products_updated_at
  before update on public.products
  for each row execute function public.update_updated_at_column();



-- ============================================================================
-- MIGRATION: 20260905000004_inspections.sql
-- ============================================================================

-- =============================================================================
-- Migration 004: Inspections
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: 003_manufacturers_products
-- Schema source: docs/04_DATABASE_DESIGN.md §3 (inspections)
-- Lifecycle: docs/MASTER_IMPLEMENTATION_BRIEF.md §15
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: inspections
-- Central entity representing a single field or e-commerce inspection event.
-- Status lifecycle: DRAFT → CAPTURED → PROCESSING → ANALYZED →
--   REVIEW_REQUIRED | READY_FOR_DECISION → DECIDED → REPORT_GENERATED →
--   SYNCED | ARCHIVED
-- -----------------------------------------------------------------------------
create table public.inspections (
  id                    uuid        not null default gen_random_uuid(),
  inspector_id          uuid        not null,
  product_id            uuid,
  status                text        not null default 'DRAFT',
  source_type           text        not null,
  location_metadata     jsonb       not null default '{}'::jsonb,
  started_at            timestamptz not null default now(),
  completed_at          timestamptz,
  rule_version_context  jsonb       not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint inspections_pkey primary key (id),

  constraint inspections_inspector_fk foreign key (inspector_id)
    references public.users(id) on delete restrict on update cascade,

  constraint inspections_product_fk foreign key (product_id)
    references public.products(id) on delete restrict on update cascade,

  -- Status must be one of the canonical lifecycle values
  constraint inspections_status_valid check (
    status in (
      'DRAFT', 'CAPTURED', 'PROCESSING', 'ANALYZED',
      'REVIEW_REQUIRED', 'READY_FOR_DECISION', 'DECIDED',
      'REPORT_GENERATED', 'SYNCED', 'ARCHIVED'
    )
  ),

  -- Source type constraint
  constraint inspections_source_type_valid check (
    source_type in ('PHYSICAL', 'ECOMMERCE', 'HYBRID')
  ),

  -- Completed timestamp should be after start when present
  constraint inspections_timeline_valid check (
    completed_at is null or completed_at >= started_at
  )
);

comment on table public.inspections is
  'Canonical inspection records. Each row represents one complete inspection event. '
  'Status follows the lifecycle: DRAFT → CAPTURED → PROCESSING → ANALYZED → '
  'REVIEW_REQUIRED|READY_FOR_DECISION → DECIDED → REPORT_GENERATED → SYNCED|ARCHIVED. '
  'product_id is nullable until product classification is complete (may be null in DRAFT/CAPTURED states). '
  'location_metadata is coarse operational metadata only — no unnecessary precision or PII.';

comment on column public.inspections.rule_version_context is
  'Snapshot of rule version IDs active at the time of inspection. '
  'Used to reproduce the exact regulatory context even after rule updates. '
  'Schema: {"ruleVersionIds": ["uuid", ...], "capturedAt": "iso-timestamp"}';

comment on column public.inspections.source_type is
  'PHYSICAL: field inspection of physical package. '
  'ECOMMERCE: digital inspection of online listing. '
  'HYBRID: both physical and e-commerce evidence present.';

-- Index: status + time (primary query pattern)
create index idx_inspections_status_started
  on public.inspections(status, started_at desc);

-- Index: product filter
create index idx_inspections_product
  on public.inspections(product_id, started_at desc)
  where product_id is not null;

-- Index: inspector lookups (critical for RLS policies)
create index idx_inspections_inspector
  on public.inspections(inspector_id, status, started_at desc);

-- Trigger: auto-update updated_at
create trigger inspections_updated_at
  before update on public.inspections
  for each row execute function public.update_updated_at_column();



-- ============================================================================
-- MIGRATION: 20260905000005_inspection_images.sql
-- ============================================================================

-- =============================================================================
-- Migration 005: Inspection Images
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: 004_inspections
-- Schema source: docs/04_DATABASE_DESIGN.md §3 (inspection_images)
-- Security: docs/08_SECURITY_SPECIFICATION.md §5 (Storage), §8 (Evidence Hashing)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: inspection_images
-- Raw image captures linked to an inspection.
-- storage_path references the private Supabase Storage object path.
-- sha256 is computed from the original bytes at upload time.
-- =============================================================================
create table public.inspection_images (
  id               uuid        not null default gen_random_uuid(),
  inspection_id    uuid        not null,
  storage_path     text        not null,
  sha256           text        not null,
  mime_type        text        not null,
  width            integer,
  height           integer,
  surface          text,
  capture_metadata jsonb       not null default '{}'::jsonb,
  quality_score    numeric,
  created_at       timestamptz not null default now(),

  constraint inspection_images_pkey primary key (id),

  constraint inspection_images_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete cascade on update cascade,

  -- Storage path must be unique — one object per path
  constraint inspection_images_storage_path_unique unique (storage_path),

  -- SHA-256 hex: exactly 64 lowercase hex characters
  constraint inspection_images_sha256_format check (
    sha256 ~ '^[0-9a-f]{64}$'
  ),

  -- Quality score: 0.0 to 1.0 if present
  constraint inspection_images_quality_range check (
    quality_score is null or (quality_score >= 0 and quality_score <= 1)
  ),

  -- MIME type allowlist
  constraint inspection_images_mime_allowlist check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic')
  ),

  -- Dimensions must be positive when present
  constraint inspection_images_dimensions_positive check (
    (width is null or width > 0) and (height is null or height > 0)
  ),

  -- Surface values aligned with PackageSurface enum in shared-types
  constraint inspection_images_surface_valid check (
    surface is null or surface in (
      'FRONT', 'BACK', 'TOP', 'BOTTOM', 'LEFT', 'RIGHT',
      'NUTRITION_PANEL', 'BARCODE_PANEL', 'UNKNOWN'
    )
  )
);

comment on table public.inspection_images is
  'Raw image captures for an inspection. Stored in private Supabase Storage bucket "inspection-images". '
  'storage_path is the object path within the bucket (not a public URL). '
  'Access requires a server-generated signed URL. sha256 is immutable after insert — enforced via RLS.';

comment on column public.inspection_images.sha256 is
  'SHA-256 hex digest of the original image bytes. '
  'Computed at upload time. Must be 64 lowercase hex characters. '
  'Immutable after insert — evidence integrity constraint.';

comment on column public.inspection_images.storage_path is
  'Object key within the "inspection-images" private bucket. '
  'Format: <inspection_id>/<uuid>.<ext>. '
  'Never expose this path directly to clients — always use signed URLs.';

comment on column public.inspection_images.capture_metadata is
  'Device and capture context allowed by privacy policy. '
  'Must not include exact GPS coordinates or unnecessary device identifiers.';

-- Index: inspection lookup
create index idx_inspection_images_inspection
  on public.inspection_images(inspection_id, created_at desc);

-- Index: sha256 deduplication check
create index idx_inspection_images_sha256
  on public.inspection_images(sha256);



-- ============================================================================
-- MIGRATION: 20260905000006_ai_analyses_declarations.sql
-- ============================================================================

-- =============================================================================
-- Migration 006: AI Analyses & Declarations
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: 005_inspection_images
-- Schema source: docs/04_DATABASE_DESIGN.md §3 (ai_analyses, declarations)
-- AI boundaries: docs/MASTER_IMPLEMENTATION_BRIEF.md §7
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: ai_analyses
-- Records each AI provider call result for an inspection.
-- payload is jsonb — flexible provider audit payload (canonical + raw metadata).
-- Confidence: 0.0 to 1.0.
-- -----------------------------------------------------------------------------
create table public.ai_analyses (
  id             uuid        not null default gen_random_uuid(),
  inspection_id  uuid        not null,
  provider       text        not null,
  model          text        not null,
  schema_version text        not null default '1.0',
  status         text        not null default 'PENDING',
  confidence     numeric,
  payload        jsonb       not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),

  constraint ai_analyses_pkey primary key (id),

  constraint ai_analyses_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete cascade on update cascade,

  -- Provider must be one of the supported providers
  constraint ai_analyses_provider_valid check (
    provider in ('GEMINI', 'OPENAI', 'MOCK')
  ),

  -- Analysis status lifecycle
  constraint ai_analyses_status_valid check (
    status in ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'FALLBACK_APPLIED')
  ),

  -- Confidence: 0.0 to 1.0 when present
  constraint ai_analyses_confidence_range check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  ),

  -- Schema version must be non-empty
  constraint ai_analyses_schema_version_nonempty check (
    char_length(trim(schema_version)) > 0
  )
);

comment on table public.ai_analyses is
  'AI provider analysis results for an inspection. '
  'Each row represents one call to one AI provider. '
  'provider must be one of: GEMINI, OPENAI, MOCK. '
  'payload stores the canonical PackageAnalysis output + provider-specific metadata for audit. '
  'The AI engine NEVER activates rule versions or makes enforcement decisions — '
  'those are inspector responsibilities enforced by the rule engine.';

comment on column public.ai_analyses.provider is
  'AI provider identifier. Aligned with AIProviderName enum in shared-types.';

comment on column public.ai_analyses.payload is
  'Flexible jsonb: stores canonical PackageAnalysis JSON + raw provider metadata for audit. '
  'Must pass AIAnalysis schema validation before being stored by the AI engine service.';

-- Index: inspection lookup
create index idx_ai_analyses_inspection
  on public.ai_analyses(inspection_id, created_at desc);

-- Index: provider + status for monitoring
create index idx_ai_analyses_provider_status
  on public.ai_analyses(provider, status);

-- -----------------------------------------------------------------------------
-- Table: declarations
-- Structured field-value pairs extracted from the package by AI/OCR.
-- Each declaration links back to the AI analysis that produced it.
-- evidence_refs: array of evidence.id UUIDs supporting this declaration.
-- -----------------------------------------------------------------------------
create table public.declarations (
  id                  uuid        not null default gen_random_uuid(),
  inspection_id       uuid        not null,
  ai_analysis_id      uuid        not null,
  field_name          text        not null,
  raw_value           text,
  normalized_value    jsonb       not null default '{}'::jsonb,
  confidence          numeric,
  verification_status text        not null default 'UNVERIFIED',
  evidence_refs       uuid[]      not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint declarations_pkey primary key (id),

  constraint declarations_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete cascade on update cascade,

  constraint declarations_ai_analysis_fk foreign key (ai_analysis_id)
    references public.ai_analyses(id) on delete cascade on update cascade,

  -- field_name aligned with DeclarationType enum in shared-types
  constraint declarations_field_name_valid check (
    field_name in (
      'GENERIC_NAME', 'NET_QUANTITY', 'MRP', 'UNIT_SALE_PRICE',
      'MANUFACTURER_NAME_ADDRESS', 'PACKER_NAME_ADDRESS', 'IMPORTER_NAME_ADDRESS',
      'COUNTRY_OF_ORIGIN', 'DATE_OF_MANUFACTURE', 'DATE_OF_PACKAGING',
      'DATE_OF_IMPORT', 'EXPIRY_DATE_BEST_BEFORE', 'CONSUMER_CARE_DETAILS',
      'BARCODE_QR', 'SIZE_DIMENSION', 'OTHER'
    )
  ),

  -- Verification status
  constraint declarations_verification_status_valid check (
    verification_status in ('UNVERIFIED', 'VERIFIED', 'REJECTED')
  ),

  -- Confidence: 0.0 to 1.0 when present
  constraint declarations_confidence_range check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  )
);

comment on table public.declarations is
  'Structured declaration fields extracted from a package by AI/OCR. '
  'Each field_name corresponds to a mandatory or optional declaration requirement. '
  'Aligned with DeclarationType enum in shared-types. '
  'verification_status reflects inspector confirmation of the extracted value.';

comment on column public.declarations.raw_value is
  'The raw extracted text/value as observed on the package. Not normalized.';

comment on column public.declarations.normalized_value is
  'Parsed and normalized value with unit breakdown. '
  'Example: {"value": 500, "unit": "ml", "normalized": "500 ml"}';

comment on column public.declarations.evidence_refs is
  'Array of evidence.id UUIDs that support this declaration. '
  'Used to trace declaration back to specific image regions or measurements.';

-- Index: inspection + field lookup
create index idx_declarations_inspection_field
  on public.declarations(inspection_id, field_name);

-- Index: AI analysis lookup
create index idx_declarations_ai_analysis
  on public.declarations(ai_analysis_id);

-- Trigger: auto-update updated_at
create trigger declarations_updated_at
  before update on public.declarations
  for each row execute function public.update_updated_at_column();



-- ============================================================================
-- MIGRATION: 20260905000007_rules_rule_versions.sql
-- ============================================================================

-- =============================================================================
-- Migration 007: Rules & Rule Versions
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: 006_ai_analyses_declarations
-- Schema source: docs/04_DATABASE_DESIGN.md §3 (rules, rule_versions)
-- Rule engine: docs/06_RULE_ENGINE_SPEC.md
-- Legal source gate: docs/14_LEGAL_SOURCE_MAPPING.md
-- =============================================================================
-- IMPORTANT: No real statutory Legal Metrology rules are inserted in this migration.
-- Seeding real rules requires the official Rules PDF and human/legal approval.
-- The schema supports the rule engine but does NOT fabricate rule content.
-- Rule versions with approval_status='ACTIVE' require source_document,
-- source_page, approved_by, and approved_at — enforced by check constraint.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: rules
-- Stable logical rule identity. One rule may have many versioned specifications.
-- rule_number refers to the official Legal Metrology (Packaged Commodities) Rule number.
-- DO NOT populate rule_number with fabricated values.
-- -----------------------------------------------------------------------------
create table public.rules (
  id          uuid        not null default gen_random_uuid(),
  rule_number text,
  sub_rule    text,
  title       text        not null,
  category    text        not null,
  created_at  timestamptz not null default now(),

  constraint rules_pkey primary key (id),
  constraint rules_title_nonempty check (char_length(trim(title)) > 0),
  constraint rules_category_nonempty check (char_length(trim(category)) > 0)
);

comment on table public.rules is
  'Stable logical rule identities from the Legal Metrology (Packaged Commodities) Rules. '
  'rule_number is the official rule number from the authoritative Rules PDF. '
  'DO NOT populate rule_number with fabricated or invented values. '
  'Real rules require: official source PDF ingestion, human/legal review, and approval. '
  'This schema supports the future rule engine (Phase 9) without pre-populating legal content.';

comment on column public.rules.rule_number is
  'Official rule number from the authoritative Legal Metrology Rules PDF. '
  'NULL for test fixtures or structural placeholder records. '
  'Must not be fabricated — source-gated per docs/14_LEGAL_SOURCE_MAPPING.md.';

comment on column public.rules.category is
  'Classification: declaration/quantity/marking/labeling/etc. '
  'Used for rule filtering and display grouping.';

-- Index: rule_number lookup
create index idx_rules_rule_number on public.rules(rule_number)
  where rule_number is not null;

-- Index: category filter
create index idx_rules_category on public.rules(category);

-- -----------------------------------------------------------------------------
-- Table: rule_versions
-- Versioned executable specification of a rule.
-- A rule version with approval_status='ACTIVE' requires source evidence.
-- Conditions, requirements, thresholds are stored as jsonb — the rule engine
-- evaluates these at runtime against declaration data.
-- -----------------------------------------------------------------------------
create table public.rule_versions (
  id              uuid        not null default gen_random_uuid(),
  rule_id         uuid        not null,
  version         text        not null,
  applicability   jsonb       not null default '{}'::jsonb,
  conditions      jsonb       not null default '{}'::jsonb,
  requirement     jsonb       not null default '{}'::jsonb,
  validation_type text,
  threshold       jsonb,
  exceptions      jsonb,
  effective_from  date,
  effective_to    date,
  -- Source evidence (required before ACTIVE status)
  source_document text,
  source_page     text,
  -- Approval workflow
  approval_status text        not null default 'DRAFT',
  approved_by     uuid,
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),

  constraint rule_versions_pkey primary key (id),

  constraint rule_versions_rule_fk foreign key (rule_id)
    references public.rules(id) on delete restrict on update cascade,

  constraint rule_versions_approved_by_fk foreign key (approved_by)
    references public.users(id) on delete set null on update cascade,

  -- Approval status lifecycle
  constraint rule_versions_approval_status_valid check (
    approval_status in ('DRAFT', 'REVIEW', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'RETIRED')
  ),

  -- ACTIVE requires full source evidence and approval metadata
  -- This enforces the legal source gate from docs/14_LEGAL_SOURCE_MAPPING.md
  constraint rule_versions_active_requires_source check (
    approval_status != 'ACTIVE' or (
      source_document is not null and
      char_length(trim(source_document)) > 0 and
      source_page is not null and
      char_length(trim(source_page)) > 0 and
      approved_by is not null and
      approved_at is not null
    )
  ),

  -- Version must be non-empty
  constraint rule_versions_version_nonempty check (char_length(trim(version)) > 0),

  -- Effective date range: from must precede to when both present
  constraint rule_versions_effective_range check (
    effective_from is null or effective_to is null or effective_from <= effective_to
  )
);

comment on table public.rule_versions is
  'Versioned executable specifications for legal rules. '
  'A version with approval_status=ACTIVE must have source_document, source_page, approved_by, and approved_at. '
  'This constraint enforces the legal source gate — no rule can go ACTIVE without verifiable source citation. '
  'applicability, conditions, requirement, threshold are jsonb evaluated by the rule engine at runtime. '
  'Fabricated rule versions MUST NOT be marked ACTIVE.';

comment on column public.rule_versions.approval_status is
  'Lifecycle: DRAFT → REVIEW → APPROVED → ACTIVE → SUPERSEDED|RETIRED. '
  'ACTIVE status requires source_document, source_page, approved_by, approved_at (DB constraint enforced).';

comment on column public.rule_versions.source_document is
  'Name/reference of the authoritative source document (e.g. "Legal Metrology (PC) Rules 2011"). '
  'Required for ACTIVE status. Source-gated per docs/14_LEGAL_SOURCE_MAPPING.md.';

comment on column public.rule_versions.applicability is
  'Executable predicate describing when this rule version applies. '
  'Evaluated by the rule engine against product category, package type, etc.';

-- Index: effective date range + status (rule engine lookups)
create index idx_rule_versions_effective
  on public.rule_versions(effective_from, effective_to, approval_status);

-- Index: rule_id lookup
create index idx_rule_versions_rule
  on public.rule_versions(rule_id, approval_status);



-- ============================================================================
-- MIGRATION: 20260905000008_findings_evidence_decisions.sql
-- ============================================================================

-- =============================================================================
-- Migration 008: Findings, Evidence & Inspector Decisions
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: 007_rules_rule_versions
-- Schema source: docs/04_DATABASE_DESIGN.md §3 (findings, evidence, inspector_decisions)
-- Evidence integrity: docs/08_SECURITY_SPECIFICATION.md §8
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: findings
-- Evaluation output from the rule engine or AI analysis.
-- A finding produces one of: PASS | WARNING | SUSPECTED_NON_COMPLIANCE | MANUAL_REVIEW
-- Legal-rule findings must reference a rule_version_id.
-- -----------------------------------------------------------------------------
create table public.findings (
  id                    uuid        not null default gen_random_uuid(),
  inspection_id         uuid        not null,
  rule_version_id       uuid,
  finding_type          text        not null,
  status                text        not null,
  title                 text        not null,
  explanation           text        not null default '',
  confidence            numeric,
  human_review_required boolean     not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint findings_pkey primary key (id),

  constraint findings_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete cascade on update cascade,

  constraint findings_rule_version_fk foreign key (rule_version_id)
    references public.rule_versions(id) on delete restrict on update cascade,

  -- Status must be one of the canonical finding outcomes
  constraint findings_status_valid check (
    status in ('PASS', 'WARNING', 'SUSPECTED_NON_COMPLIANCE', 'MANUAL_REVIEW')
  ),

  -- Finding type categories
  constraint findings_type_valid check (
    finding_type in (
      'RULE_BASED', 'AI_OBSERVATION', 'MEASUREMENT', 'CROSS_SOURCE', 'MANUAL'
    )
  ),

  -- Confidence: 0.0 to 1.0 when present
  constraint findings_confidence_range check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  ),

  -- Legal rule findings must reference a rule version
  -- Non-legal observations may have null rule_version_id
  constraint findings_legal_requires_rule_version check (
    finding_type != 'RULE_BASED' or rule_version_id is not null
  ),

  -- Title must be non-empty
  constraint findings_title_nonempty check (char_length(trim(title)) > 0)
);

comment on table public.findings is
  'Rule engine or AI analysis evaluation results. '
  'status is one of: PASS, WARNING, SUSPECTED_NON_COMPLIANCE, MANUAL_REVIEW. '
  'RULE_BASED findings must reference a rule_version_id (constraint enforced). '
  'A SUSPECTED_NON_COMPLIANCE finding is NOT itself the inspector''s enforcement decision. '
  'human_review_required=true must block report generation until inspector resolves.';

comment on column public.findings.rule_version_id is
  'FK to rule_versions.id. Required for RULE_BASED findings (DB constraint). '
  'Nullable for AI_OBSERVATION, MEASUREMENT, CROSS_SOURCE, MANUAL findings.';

comment on column public.findings.finding_type is
  'RULE_BASED: deterministic rule engine result. '
  'AI_OBSERVATION: AI model observation (not a rule verdict). '
  'MEASUREMENT: CV-derived physical measurement. '
  'CROSS_SOURCE: e-commerce vs physical discrepancy. '
  'MANUAL: inspector-created finding.';

-- Index: status + review required (primary dashboard query)
create index idx_findings_status
  on public.findings(status, human_review_required);

-- Index: inspection lookup
create index idx_findings_inspection
  on public.findings(inspection_id, status);

-- Index: human review queue
create index idx_findings_review_required
  on public.findings(human_review_required, status)
  where human_review_required = true;

-- Trigger: auto-update updated_at
create trigger findings_updated_at
  before update on public.findings
  for each row execute function public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Table: evidence
-- Binary or structured evidence artifacts supporting inspection findings.
-- sha256 is immutable after insert (enforced by RLS in migration 012).
-- storage_path references private Supabase Storage objects.
-- -----------------------------------------------------------------------------
create table public.evidence (
  id               uuid        not null default gen_random_uuid(),
  inspection_id    uuid        not null,
  finding_id       uuid,
  evidence_type    text        not null,
  storage_path     text,
  sha256           text,
  source_reference jsonb       not null default '{}'::jsonb,
  captured_at      timestamptz,
  captured_by      uuid,
  verified_by      uuid,
  verified_at      timestamptz,
  status           text        not null default 'ATTACHED',
  created_at       timestamptz not null default now(),

  constraint evidence_pkey primary key (id),

  constraint evidence_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete cascade on update cascade,

  constraint evidence_finding_fk foreign key (finding_id)
    references public.findings(id) on delete set null on update cascade,

  constraint evidence_captured_by_fk foreign key (captured_by)
    references public.users(id) on delete set null on update cascade,

  constraint evidence_verified_by_fk foreign key (verified_by)
    references public.users(id) on delete set null on update cascade,

  -- Evidence type aligned with EvidenceType enum in shared-types
  constraint evidence_type_valid check (
    evidence_type in (
      'IMAGE', 'OCR_REGION', 'LISTING', 'NOTE', 'MEASUREMENT', 'DOCUMENT', 'OTHER'
    )
  ),

  -- Evidence status lifecycle
  constraint evidence_status_valid check (
    status in ('ATTACHED', 'VERIFIED', 'FLAGGED', 'ARCHIVED')
  ),

  -- SHA-256: 64 lowercase hex characters when present
  constraint evidence_sha256_format check (
    sha256 is null or sha256 ~ '^[0-9a-f]{64}$'
  ),

  -- Binary evidence must have storage_path and sha256
  constraint evidence_binary_requires_path_and_hash check (
    evidence_type not in ('IMAGE', 'DOCUMENT') or
    (storage_path is not null and sha256 is not null)
  ),

  -- Verified timestamp after captured when both present
  constraint evidence_verification_timeline check (
    verified_at is null or captured_at is null or verified_at >= captured_at
  )
);

comment on table public.evidence is
  'Evidence artifacts supporting inspection findings. '
  'Binary evidence (IMAGE, DOCUMENT) requires storage_path and sha256 (constraint enforced). '
  'storage_path references private bucket "evidence-files" — never expose as permanent public URL. '
  'sha256 is immutable after insert — enforced by RLS policy (no UPDATE on sha256 column after insert). '
  'source_reference: jsonb linking to the source (image region, page, measurement metadata).';

comment on column public.evidence.sha256 is
  'SHA-256 hex digest of the original evidence bytes. '
  'Required for binary evidence types. Immutable after insert (RLS enforced). '
  'See docs/08_SECURITY_SPECIFICATION.md §8.';

-- Index: sha256 lookup for deduplication
create index idx_evidence_hash on public.evidence(sha256)
  where sha256 is not null;

-- Index: inspection + type
create index idx_evidence_inspection
  on public.evidence(inspection_id, evidence_type);

-- Index: finding evidence lookup
create index idx_evidence_finding
  on public.evidence(finding_id)
  where finding_id is not null;

-- -----------------------------------------------------------------------------
-- Table: inspector_decisions
-- The inspector's final enforcement decision on an inspection.
-- This is the authoritative human decision — not AI output.
-- -----------------------------------------------------------------------------
create table public.inspector_decisions (
  id            uuid        not null default gen_random_uuid(),
  inspection_id uuid        not null,
  inspector_id  uuid        not null,
  decision      text        not null,
  comments      text        not null default '',
  decided_at    timestamptz not null default now(),

  constraint inspector_decisions_pkey primary key (id),

  constraint inspector_decisions_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete restrict on update cascade,

  constraint inspector_decisions_inspector_fk foreign key (inspector_id)
    references public.users(id) on delete restrict on update cascade,

  -- Decision must be one of the canonical types
  constraint inspector_decisions_decision_valid check (
    decision in (
      'COMPLIANT', 'NON_COMPLIANT', 'SEIZED', 'NOTICE_ISSUED', 'ESCALATED', 'DISMISSED'
    )
  )
);

comment on table public.inspector_decisions is
  'Inspector''s final enforcement decision on an inspection. '
  'This is the authoritative human decision — the AI engine and rule engine provide input, '
  'but the inspector makes the binding legal determination. '
  'Decision values aligned with InspectorDecisionType enum in shared-types.';

comment on column public.inspector_decisions.decision is
  'COMPLIANT: product meets requirements. '
  'NON_COMPLIANT: product does not meet requirements. '
  'SEIZED: product seized for further action. '
  'NOTICE_ISSUED: show cause or compounding notice issued. '
  'ESCALATED: referred to higher authority. '
  'DISMISSED: inspection closed without action.';

-- Index: inspection decision lookup
create index idx_inspector_decisions_inspection
  on public.inspector_decisions(inspection_id, decided_at desc);



-- ============================================================================
-- MIGRATION: 20260905000009_ecommerce_cross_source.sql
-- ============================================================================

-- =============================================================================
-- Migration 009: E-commerce Listings & Cross-Source Comparisons
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: 008_findings_evidence_decisions
-- Schema source: docs/04_DATABASE_DESIGN.md §3 (ecommerce_listings, cross_source_comparisons)
-- Phase: E-commerce analysis is Phase 12 — this migration lays the schema foundation only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: ecommerce_listings
-- Captured state of an online product listing linked to an inspection.
-- screenshot_evidence_id links to an evidence record (screenshot as evidence).
-- fields: flexible jsonb for structured listing data (name, price, description, etc.)
-- -----------------------------------------------------------------------------
create table public.ecommerce_listings (
  id                     uuid        not null default gen_random_uuid(),
  inspection_id          uuid        not null,
  source_url             text,
  captured_at            timestamptz not null default now(),
  merchant_name          text,
  fields                 jsonb       not null default '{}'::jsonb,
  screenshot_evidence_id uuid,
  analysis_status        text        not null default 'PENDING',

  constraint ecommerce_listings_pkey primary key (id),

  constraint ecommerce_listings_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete cascade on update cascade,

  constraint ecommerce_listings_evidence_fk foreign key (screenshot_evidence_id)
    references public.evidence(id) on delete set null on update cascade,

  -- Analysis status
  constraint ecommerce_listings_status_valid check (
    analysis_status in ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')
  ),

  -- URL format when provided
  constraint ecommerce_listings_url_format check (
    source_url is null or
    source_url ~ '^https?://'
  )
);

comment on table public.ecommerce_listings is
  'Captured state of an online product listing associated with an inspection. '
  'source_url: the URL at time of capture (not a live link). '
  'fields: structured listing attributes (title, price, description, declared qty, etc.) as jsonb. '
  'Full e-commerce analysis pipeline is Phase 12 — this schema supports that phase.';

comment on column public.ecommerce_listings.fields is
  'Structured listing fields extracted from the e-commerce page. '
  'Schema: {"title": "", "price": "", "declared_qty": "", "description": "", ...}. '
  'Flexible jsonb because listing structure varies by marketplace.';

-- Index: inspection lookup
create index idx_ecommerce_listings_inspection
  on public.ecommerce_listings(inspection_id, captured_at desc);

-- Index: analysis status
create index idx_ecommerce_listings_status
  on public.ecommerce_listings(analysis_status);

-- -----------------------------------------------------------------------------
-- Table: cross_source_comparisons
-- Field-by-field comparison result between physical inspection and e-commerce listing.
-- comparison: structured field differences (field_name, physical_value, listing_value, status)
-- -----------------------------------------------------------------------------
create table public.cross_source_comparisons (
  id            uuid        not null default gen_random_uuid(),
  inspection_id uuid        not null,
  listing_id    uuid        not null,
  comparison    jsonb       not null default '[]'::jsonb,
  status        text        not null default 'UNKNOWN',
  created_at    timestamptz not null default now(),

  constraint cross_source_comparisons_pkey primary key (id),

  constraint cross_source_comparisons_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete cascade on update cascade,

  constraint cross_source_comparisons_listing_fk foreign key (listing_id)
    references public.ecommerce_listings(id) on delete cascade on update cascade,

  -- Comparison status
  constraint cross_source_comparisons_status_valid check (
    status in ('MATCH', 'MISMATCH', 'PARTIAL_MATCH', 'UNKNOWN')
  )
);

comment on table public.cross_source_comparisons is
  'Field-by-field comparison between physical inspection declarations and e-commerce listing. '
  'comparison: jsonb array of field comparison items. '
  'Schema: [{"field": "MRP", "physical": "100", "listing": "90", "status": "MISMATCH"}, ...]. '
  'Cross-source comparison logic is Phase 12. This schema is the Phase 2 foundation.';

comment on column public.cross_source_comparisons.comparison is
  'Array of field comparison results. Each element: '
  '{"field": "field_name", "physical_value": "...", "listing_value": "...", "status": "MATCH|MISMATCH|UNKNOWN", "severity": "..."}';

-- Index: inspection lookup
create index idx_cross_source_comparisons_inspection
  on public.cross_source_comparisons(inspection_id);

-- Index: status filter
create index idx_cross_source_comparisons_status
  on public.cross_source_comparisons(status);



-- ============================================================================
-- MIGRATION: 20260905000010_reports.sql
-- ============================================================================

-- =============================================================================
-- Migration 010: Reports
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: 009_ecommerce_cross_source
-- Schema source: docs/04_DATABASE_DESIGN.md §3 (reports)
-- Report generation: Phase 14 — this migration lays the schema foundation.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: reports
-- Generated inspection reports (PDF/HTML).
-- storage_path references the private Supabase Storage "reports" bucket.
-- sha256 is computed from the report bytes at generation time.
-- -----------------------------------------------------------------------------
create table public.reports (
  id            uuid        not null default gen_random_uuid(),
  inspection_id uuid        not null,
  format        text        not null,
  storage_path  text,
  sha256        text,
  generated_by  uuid        not null,
  generated_at  timestamptz not null default now(),

  constraint reports_pkey primary key (id),

  constraint reports_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete restrict on update cascade,

  constraint reports_generated_by_fk foreign key (generated_by)
    references public.users(id) on delete restrict on update cascade,

  -- Format allowlist
  constraint reports_format_valid check (
    format in ('PDF', 'HTML', 'JSON')
  ),

  -- SHA-256: 64 lowercase hex characters when present
  constraint reports_sha256_format check (
    sha256 is null or sha256 ~ '^[0-9a-f]{64}$'
  ),

  -- storage_path required when sha256 is present
  constraint reports_path_hash_consistency check (
    (sha256 is null) = (storage_path is null)
  )
);

comment on table public.reports is
  'Inspection reports in PDF, HTML, or JSON format. '
  'storage_path references the private "reports" bucket — never expose as permanent public URL. '
  'sha256 computed from generated bytes. '
  'Full PDF generation pipeline is Phase 14 — this schema supports that phase. '
  'A report cannot be final if the inspection has unresolved MANUAL_REVIEW findings '
  'without an authorized override — enforced at application layer.';

comment on column public.reports.storage_path is
  'Object key within the "reports" private bucket. '
  'Format: <inspection_id>/report-<uuid>.<format>. '
  'Access via signed URL only.';

comment on column public.reports.sha256 is
  'SHA-256 hex digest of the generated report bytes. '
  'Establishes integrity evidence for the report artifact.';

-- Index: inspection lookup
create index idx_reports_inspection
  on public.reports(inspection_id, generated_at desc);

-- Index: generated_by
create index idx_reports_generated_by
  on public.reports(generated_by, generated_at desc);



-- ============================================================================
-- MIGRATION: 20260905000011_audit_logs.sql
-- ============================================================================

-- =============================================================================
-- Migration 011: Audit Logs
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: 010_reports
-- Schema source: docs/04_DATABASE_DESIGN.md §3 (audit_logs), §7 (Audit Strategy)
-- Security: docs/08_SECURITY_SPECIFICATION.md §7 (Audit Trail)
-- =============================================================================
-- AUDIT LOG DESIGN PRINCIPLES:
-- 1. Append-only: rows are inserted, never updated or deleted by ordinary users.
-- 2. Immutability enforced via RLS: no UPDATE/DELETE on audit_logs for any user role.
-- 3. Corrections create new events; they do not erase history.
-- 4. actor_user_id is nullable for system-generated events.
-- 5. before_data/after_data are stored as redacted jsonb — secrets must not be logged.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: audit_logs
-- Append-oriented audit trail for all sensitive operations.
-- RLS: INSERT only for authenticated users. No UPDATE. No DELETE.
-- Service-role may INSERT for system events (no auth context).
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id            uuid        not null default gen_random_uuid(),
  actor_user_id uuid,
  action        text        not null,
  entity_type   text        not null,
  entity_id     uuid        not null,
  before_data   jsonb,
  after_data    jsonb,
  metadata      jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),

  constraint audit_logs_pkey primary key (id),

  constraint audit_logs_actor_fk foreign key (actor_user_id)
    references public.users(id) on delete set null on update cascade,

  -- Action must be a recognized audit event
  constraint audit_logs_action_valid check (
    action in (
      -- Authentication events
      'USER_SIGNED_IN',
      'USER_SIGNED_OUT',
      'USER_SIGN_UP',
      'PASSWORD_RESET_REQUESTED',
      'SESSION_REFRESHED',
      -- Inspection events
      'INSPECTION_CREATED',
      'INSPECTION_STATUS_CHANGED',
      'INSPECTION_SUBMITTED',
      'INSPECTION_ARCHIVED',
      -- Evidence events
      'EVIDENCE_ATTACHED',
      'EVIDENCE_VERIFIED',
      'EVIDENCE_FLAGGED',
      -- Decision events
      'DECISION_SUBMITTED',
      'DECISION_ESCALATED',
      -- Rule events
      'RULE_VERSION_PROPOSED',
      'RULE_VERSION_REVIEWED',
      'RULE_VERSION_APPROVED',
      'RULE_VERSION_ACTIVATED',
      'RULE_VERSION_RETIRED',
      -- User/role events
      'USER_ROLE_CHANGED',
      'USER_DEACTIVATED',
      'USER_ACTIVATED',
      -- Report events
      'REPORT_GENERATED',
      'REPORT_ACCESSED',
      -- Admin events
      'ADMIN_CONFIG_CHANGED',
      -- System events
      'SYSTEM_EVENT'
    )
  ),

  -- Entity type must be a recognized table/domain name
  constraint audit_logs_entity_type_valid check (
    entity_type in (
      'user', 'inspection', 'inspection_image', 'ai_analysis', 'declaration',
      'rule', 'rule_version', 'finding', 'evidence', 'inspector_decision',
      'ecommerce_listing', 'cross_source_comparison', 'report', 'audit_log',
      'system'
    )
  ),

  -- Metadata must not be null
  constraint audit_logs_metadata_not_null check (metadata is not null)
);

comment on table public.audit_logs is
  'Append-only audit trail for all sensitive operations. '
  'IMMUTABLE: RLS policy prevents UPDATE and DELETE by any authenticated role. '
  'Corrections create new audit events — existing records are never modified. '
  'before_data and after_data must be redacted — never store API keys, tokens, or passwords. '
  'actor_user_id is nullable for system-generated events. '
  'See docs/08_SECURITY_SPECIFICATION.md §7 for the full audit requirement.';

comment on column public.audit_logs.action is
  'Canonical audit action. Must be one of the defined audit event names. '
  'System events use ''SYSTEM_EVENT'' with details in metadata.';

comment on column public.audit_logs.before_data is
  'Redacted snapshot of entity state before the operation. '
  'MUST NOT contain API keys, auth tokens, passwords, or signed URLs. '
  'Store hashes/references when full payload is retained elsewhere.';

comment on column public.audit_logs.metadata is
  'Request context: requestId, correlationId, ip (if policy permits), service name, etc. '
  'MUST NOT contain API keys, auth tokens, or raw personal data beyond operational necessity.';

-- Index: entity + time (primary query pattern for audit viewers)
create index idx_audit_entity
  on public.audit_logs(entity_type, entity_id, created_at desc);

-- Index: action type filter
create index idx_audit_action
  on public.audit_logs(action, created_at desc);

-- Index: actor lookup
create index idx_audit_actor
  on public.audit_logs(actor_user_id, created_at desc)
  where actor_user_id is not null;

-- Index: time-series (latest events)
create index idx_audit_created_at
  on public.audit_logs(created_at desc);

-- =============================================================================
-- Convenience function: insert an audit log entry
-- Used by server-side operations to create typed audit records.
-- =============================================================================
create or replace function public.insert_audit_log(
  p_actor_user_id uuid,
  p_action        text,
  p_entity_type   text,
  p_entity_id     uuid,
  p_before_data   jsonb,
  p_after_data    jsonb,
  p_metadata      jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_audit_id uuid;
begin
  insert into public.audit_logs (
    actor_user_id, action, entity_type, entity_id,
    before_data, after_data, metadata
  ) values (
    p_actor_user_id, p_action, p_entity_type, p_entity_id,
    p_before_data, p_after_data, coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_audit_id;

  return v_audit_id;
end;
$$;

comment on function public.insert_audit_log(uuid, text, text, uuid, jsonb, jsonb, jsonb) is
  'Server-side helper to create an audit log entry. '
  'Uses SECURITY DEFINER to bypass RLS insert restrictions on audit_logs '
  'while still enforcing the check constraints. '
  'Call this from server-side operations, never from untrusted client code.';



-- ============================================================================
-- MIGRATION: 20260905000012_rls_policies.sql
-- ============================================================================

-- =============================================================================
-- Migration 012: Row Level Security Policies
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: 011_audit_logs
-- Schema source: docs/04_DATABASE_DESIGN.md §6 (RLS Strategy)
-- Security: docs/08_SECURITY_SPECIFICATION.md §3, §4
-- =============================================================================
-- RLS DESIGN PRINCIPLES:
-- 1. RLS is enabled on all tables containing user-scoped or sensitive data.
-- 2. The service-role key BYPASSES all RLS — must NEVER be used for ordinary user ops.
-- 3. Policies use current_user_has_role() helper from migration 001.
-- 4. Role checks are done server-side via JWT claims, not trusting client-submitted fields.
-- 5. Users cannot change their own role (explicit policy exclusion).
-- 6. Audit logs are append-only (no UPDATE, no DELETE for any authenticated role).
-- 7. Evidence sha256 is immutable after insert (UPDATE restricted to non-hash columns).
-- 8. Rules table is read-only for non-admin; rule activation requires ADMIN + source evidence.
-- =============================================================================
-- RLS_RUNTIME_VERIFICATION_REQUIRED:
-- These policies are expressed in SQL and their intent is tested in phase2-rls.test.ts.
-- Full runtime enforcement must be verified against a live Supabase/PostgreSQL environment.
-- The mock tests document POLICY INTENT, not PostgreSQL enforcement.
-- See docs/PHASE_2_IMPLEMENTATION_NOTES.md for the verification checklist.
-- =============================================================================

-- =============================================================================
-- Enable RLS on all protected tables
-- =============================================================================
alter table public.users enable row level security;
alter table public.manufacturers enable row level security;
alter table public.products enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_images enable row level security;
alter table public.ai_analyses enable row level security;
alter table public.declarations enable row level security;
alter table public.rules enable row level security;
alter table public.rule_versions enable row level security;
alter table public.findings enable row level security;
alter table public.evidence enable row level security;
alter table public.inspector_decisions enable row level security;
alter table public.ecommerce_listings enable row level security;
alter table public.cross_source_comparisons enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;

-- NOTE: public.roles is NOT RLS-protected.
-- Roles are read-only reference data. Write access is service-role only.
-- No authenticated user should INSERT/UPDATE/DELETE roles via the public API.

-- =============================================================================
-- TABLE: users
-- =============================================================================
-- Inspectors can read their own profile
create policy "users_select_own"
  on public.users for select
  using (id = public.current_user_id());

-- Supervisors can read users in a broad context (team visibility)
-- Phase 3+ will add team/zone scoping; for now, supervisors see all active users
create policy "users_select_supervisor"
  on public.users for select
  using (public.current_user_has_role('SUPERVISOR'));

-- Admins can read all users
create policy "users_select_admin"
  on public.users for select
  using (public.current_user_has_role('ADMIN'));

-- Auditors can read all active users (read-only context)
create policy "users_select_auditor"
  on public.users for select
  using (public.current_user_has_role('AUDITOR'));

-- Users can update their own non-role fields (name, phone, etc.)
-- CRITICAL: role_id changes are excluded — must go through privileged admin operation
create policy "users_update_own_profile"
  on public.users for update
  using (id = public.current_user_id())
  with check (
    -- Prevent self-role-escalation: role_id must not change via this policy
    role_id = (select role_id from public.users where id = public.current_user_id())
  );

-- Admins can update any user (including role changes)
create policy "users_update_admin"
  on public.users for update
  using (public.current_user_has_role('ADMIN'));

-- INSERT: handled by handle_new_auth_user trigger (service-role context)
-- No direct INSERT policy needed for authenticated users

-- =============================================================================
-- TABLE: manufacturers
-- All authenticated users can read manufacturers
-- Only admins can create/update manufacturer records
-- =============================================================================
create policy "manufacturers_select_authenticated"
  on public.manufacturers for select
  using (public.current_user_id() is not null);

create policy "manufacturers_insert_admin"
  on public.manufacturers for insert
  with check (public.current_user_has_role('ADMIN'));

create policy "manufacturers_update_admin"
  on public.manufacturers for update
  using (public.current_user_has_role('ADMIN'));

-- =============================================================================
-- TABLE: products
-- All authenticated users can read products
-- Only admins can create/update products
-- =============================================================================
create policy "products_select_authenticated"
  on public.products for select
  using (public.current_user_id() is not null);

create policy "products_insert_admin"
  on public.products for insert
  with check (public.current_user_has_role('ADMIN'));

create policy "products_update_admin"
  on public.products for update
  using (public.current_user_has_role('ADMIN'));

-- =============================================================================
-- TABLE: inspections
-- Inspectors: own inspections only (read + create + update DRAFT/CAPTURED)
-- Supervisors: read all inspections (phase 3+ will add team scoping)
-- Admins: full access
-- Auditors: read only
-- =============================================================================
create policy "inspections_select_own"
  on public.inspections for select
  using (inspector_id = public.current_user_id());

create policy "inspections_select_supervisor"
  on public.inspections for select
  using (public.current_user_has_role('SUPERVISOR'));

create policy "inspections_select_admin"
  on public.inspections for select
  using (public.current_user_has_role('ADMIN'));

create policy "inspections_select_auditor"
  on public.inspections for select
  using (public.current_user_has_role('AUDITOR'));

-- Inspectors can create their own inspections
create policy "inspections_insert_inspector"
  on public.inspections for insert
  with check (
    inspector_id = public.current_user_id()
    and public.current_user_has_role('INSPECTOR')
  );

-- Inspectors can update their own DRAFT or CAPTURED inspections
create policy "inspections_update_own_draft"
  on public.inspections for update
  using (
    inspector_id = public.current_user_id()
    and status in ('DRAFT', 'CAPTURED')
  );

-- Admins can update any inspection
create policy "inspections_update_admin"
  on public.inspections for update
  using (public.current_user_has_role('ADMIN'));

-- Supervisors can update inspections (for review workflow)
create policy "inspections_update_supervisor"
  on public.inspections for update
  using (public.current_user_has_role('SUPERVISOR'));

-- =============================================================================
-- TABLE: inspection_images
-- Access follows inspection ownership
-- sha256 immutability: UPDATE only for non-sha256 fields (not enforceable via
-- standard RLS column exclusions — enforced at application layer with audit)
-- =============================================================================
create policy "inspection_images_select_own"
  on public.inspection_images for select
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
    )
  );

create policy "inspection_images_select_privileged"
  on public.inspection_images for select
  using (
    public.current_user_has_role('SUPERVISOR')
    or public.current_user_has_role('ADMIN')
    or public.current_user_has_role('AUDITOR')
  );

create policy "inspection_images_insert_inspector"
  on public.inspection_images for insert
  with check (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
        and i.status in ('DRAFT', 'CAPTURED')
    )
  );

-- =============================================================================
-- TABLE: ai_analyses
-- Read: inspection owner + supervisor + admin + auditor
-- Insert/Update: server-side AI engine (service-role, bypasses RLS)
-- =============================================================================
create policy "ai_analyses_select_own"
  on public.ai_analyses for select
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
    )
  );

create policy "ai_analyses_select_privileged"
  on public.ai_analyses for select
  using (
    public.current_user_has_role('SUPERVISOR')
    or public.current_user_has_role('ADMIN')
    or public.current_user_has_role('AUDITOR')
  );

-- =============================================================================
-- TABLE: declarations
-- Same access pattern as ai_analyses (follows inspection ownership)
-- =============================================================================
create policy "declarations_select_own"
  on public.declarations for select
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
    )
  );

create policy "declarations_select_privileged"
  on public.declarations for select
  using (
    public.current_user_has_role('SUPERVISOR')
    or public.current_user_has_role('ADMIN')
    or public.current_user_has_role('AUDITOR')
  );

-- =============================================================================
-- TABLE: rules
-- All authenticated users can read ACTIVE rules
-- Only admins can insert/update rules
-- ACTIVATION (setting approval_status='ACTIVE') requires admin + check constraint
-- ensures source evidence is present (constraint in migration 007)
-- =============================================================================
create policy "rules_select_authenticated"
  on public.rules for select
  using (public.current_user_id() is not null);

create policy "rules_insert_admin"
  on public.rules for insert
  with check (public.current_user_has_role('ADMIN'));

create policy "rules_update_admin"
  on public.rules for update
  using (public.current_user_has_role('ADMIN'));

-- =============================================================================
-- TABLE: rule_versions
-- Read: all authenticated users (active versions for rule engine)
-- Write: admin only
-- =============================================================================
create policy "rule_versions_select_authenticated"
  on public.rule_versions for select
  using (public.current_user_id() is not null);

create policy "rule_versions_insert_admin"
  on public.rule_versions for insert
  with check (public.current_user_has_role('ADMIN'));

create policy "rule_versions_update_admin"
  on public.rule_versions for update
  using (public.current_user_has_role('ADMIN'));

-- =============================================================================
-- TABLE: findings
-- Read: inspection owner + supervisor + admin + auditor
-- =============================================================================
create policy "findings_select_own"
  on public.findings for select
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
    )
  );

create policy "findings_select_privileged"
  on public.findings for select
  using (
    public.current_user_has_role('SUPERVISOR')
    or public.current_user_has_role('ADMIN')
    or public.current_user_has_role('AUDITOR')
  );

-- =============================================================================
-- TABLE: evidence
-- Read: inspection owner + privileged roles
-- Insert: inspection owner (for own DRAFT/CAPTURED inspections)
-- UPDATE: limited — sha256 MUST NOT change after insert (application-layer enforced;
--         RLS restricts updates to non-critical fields until Phase 13 chain-of-custody)
-- =============================================================================
create policy "evidence_select_own"
  on public.evidence for select
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
    )
  );

create policy "evidence_select_privileged"
  on public.evidence for select
  using (
    public.current_user_has_role('SUPERVISOR')
    or public.current_user_has_role('ADMIN')
    or public.current_user_has_role('AUDITOR')
  );

create policy "evidence_insert_inspector"
  on public.evidence for insert
  with check (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
        and i.status in ('DRAFT', 'CAPTURED', 'PROCESSING', 'ANALYZED', 'REVIEW_REQUIRED')
    )
  );

-- =============================================================================
-- TABLE: inspector_decisions
-- Read: inspection owner + supervisor + admin + auditor
-- Insert: inspector for own inspections in READY_FOR_DECISION status
-- =============================================================================
create policy "inspector_decisions_select_own"
  on public.inspector_decisions for select
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
    )
  );

create policy "inspector_decisions_select_privileged"
  on public.inspector_decisions for select
  using (
    public.current_user_has_role('SUPERVISOR')
    or public.current_user_has_role('ADMIN')
    or public.current_user_has_role('AUDITOR')
  );

create policy "inspector_decisions_insert_inspector"
  on public.inspector_decisions for insert
  with check (
    inspector_id = public.current_user_id()
    and exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
        and i.status in ('READY_FOR_DECISION', 'REVIEW_REQUIRED')
    )
  );

-- =============================================================================
-- TABLE: ecommerce_listings
-- Read: inspection owner + privileged
-- Insert: inspector for own inspections
-- =============================================================================
create policy "ecommerce_listings_select_own"
  on public.ecommerce_listings for select
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
    )
  );

create policy "ecommerce_listings_select_privileged"
  on public.ecommerce_listings for select
  using (
    public.current_user_has_role('SUPERVISOR')
    or public.current_user_has_role('ADMIN')
    or public.current_user_has_role('AUDITOR')
  );

create policy "ecommerce_listings_insert_inspector"
  on public.ecommerce_listings for insert
  with check (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
    )
  );

-- =============================================================================
-- TABLE: cross_source_comparisons
-- Read: inspection owner + privileged
-- =============================================================================
create policy "cross_source_comparisons_select_own"
  on public.cross_source_comparisons for select
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
    )
  );

create policy "cross_source_comparisons_select_privileged"
  on public.cross_source_comparisons for select
  using (
    public.current_user_has_role('SUPERVISOR')
    or public.current_user_has_role('ADMIN')
    or public.current_user_has_role('AUDITOR')
  );

-- =============================================================================
-- TABLE: reports
-- Read: inspection owner + supervisor + admin + auditor
-- Insert: server-side only (service-role bypasses RLS); no direct user INSERT
-- =============================================================================
create policy "reports_select_own"
  on public.reports for select
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
    )
  );

create policy "reports_select_privileged"
  on public.reports for select
  using (
    public.current_user_has_role('SUPERVISOR')
    or public.current_user_has_role('ADMIN')
    or public.current_user_has_role('AUDITOR')
  );

-- =============================================================================
-- TABLE: audit_logs — APPEND ONLY
-- Read: admin + auditor only (not inspectors — they cannot see the full audit trail)
-- Insert: any authenticated user (via insert_audit_log function)
-- UPDATE: DENIED for all authenticated roles (immutability enforced)
-- DELETE: DENIED for all authenticated roles (immutability enforced)
-- =============================================================================
create policy "audit_logs_select_admin"
  on public.audit_logs for select
  using (public.current_user_has_role('ADMIN'));

create policy "audit_logs_select_auditor"
  on public.audit_logs for select
  using (public.current_user_has_role('AUDITOR'));

-- Allow INSERT for authenticated users (actual inserts go through insert_audit_log function)
create policy "audit_logs_insert_authenticated"
  on public.audit_logs for insert
  with check (public.current_user_id() is not null);

-- NO UPDATE POLICY — audit_logs has no update policies, so all UPDATEs are denied
-- NO DELETE POLICY — audit_logs has no delete policies, so all DELETEs are denied
-- This enforces append-only semantics at the database level.

-- =============================================================================
-- Supabase Storage RLS
-- Storage bucket policies are configured in migration 013 (storage_buckets).
-- Private bucket access requires server-issued signed URLs.
-- =============================================================================



-- ============================================================================
-- MIGRATION: 20260905000013_storage_buckets.sql
-- ============================================================================

-- =============================================================================
-- Migration 013: Storage Buckets & Storage RLS Policies
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: 012_rls_policies
-- Schema source: docs/04_DATABASE_DESIGN.md §2 (Storage conventions)
-- Security: docs/08_SECURITY_SPECIFICATION.md §5 (Storage Security)
-- =============================================================================
-- STORAGE DESIGN:
-- All three buckets are PRIVATE (public = false).
-- Access pattern: Authorized user → API authorization → signed URL → object
-- Object naming: <inspection_id>/<uuid>.<ext> — server-generated, not user-controlled.
-- Signed URLs expire after a short duration (configured at signing time in application code).
-- Do NOT expose permanent public URLs for any bucket.
-- =============================================================================

-- =============================================================================
-- Create private storage buckets via the Supabase storage.buckets table
-- This is the correct Supabase-native way to create buckets in migrations
-- (Supabase Storage uses the storage schema tables directly).
-- =============================================================================

-- Bucket: inspection-images
-- Stores raw image captures uploaded during physical package inspections.
-- Access: inspector (own inspection) via signed URL; admin/supervisor via signed URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inspection-images',
  'inspection-images',
  false,
  52428800, -- 50MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Bucket: evidence-files
-- Stores binary evidence artifacts: images, documents, OCR outputs, measurements.
-- Access: inspector (own evidence) via signed URL; admin/supervisor/auditor via signed URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence-files',
  'evidence-files',
  false,
  104857600, -- 100MB per file (supports document uploads)
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'application/pdf',
    'text/plain',
    'application/json'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Bucket: reports
-- Stores generated inspection reports (PDF, HTML).
-- Access: inspector (own report) via signed URL; admin/supervisor/auditor via signed URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reports',
  'reports',
  false,
  52428800, -- 50MB per report
  array['application/pdf', 'text/html', 'application/json']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =============================================================================
-- Storage RLS Policies
-- These policies control access to storage.objects within each bucket.
-- Pattern: object path = <inspection_id>/<filename>
-- The inspection_id prefix allows us to join with public.inspections for ownership checks.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Bucket: inspection-images
-- -----------------------------------------------------------------------------

-- Inspectors can upload images for their own inspections
create policy "inspection_images_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'inspection-images'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from public.inspections i
      where i.id::text = split_part(name, '/', 1)
        and i.inspector_id = auth.uid()
        and i.status in ('DRAFT', 'CAPTURED')
    )
  );

-- Inspectors can read images from their own inspections
create policy "inspection_images_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'inspection-images'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from public.inspections i
      where i.id::text = split_part(name, '/', 1)
        and i.inspector_id = auth.uid()
    )
  );

-- Privileged roles can read all inspection images
create policy "inspection_images_storage_select_privileged"
  on storage.objects for select
  using (
    bucket_id = 'inspection-images'
    and (
      public.current_user_has_role('SUPERVISOR')
      or public.current_user_has_role('ADMIN')
      or public.current_user_has_role('AUDITOR')
    )
  );

-- -----------------------------------------------------------------------------
-- Bucket: evidence-files
-- -----------------------------------------------------------------------------

-- Inspectors can upload evidence for their own inspections
create policy "evidence_files_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'evidence-files'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from public.inspections i
      where i.id::text = split_part(name, '/', 1)
        and i.inspector_id = auth.uid()
    )
  );

-- Inspectors can read evidence from their own inspections
create policy "evidence_files_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'evidence-files'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from public.inspections i
      where i.id::text = split_part(name, '/', 1)
        and i.inspector_id = auth.uid()
    )
  );

-- Privileged roles can read all evidence files
create policy "evidence_files_storage_select_privileged"
  on storage.objects for select
  using (
    bucket_id = 'evidence-files'
    and (
      public.current_user_has_role('SUPERVISOR')
      or public.current_user_has_role('ADMIN')
      or public.current_user_has_role('AUDITOR')
    )
  );

-- -----------------------------------------------------------------------------
-- Bucket: reports
-- -----------------------------------------------------------------------------

-- Reports are inserted by the server (service-role) — no user INSERT policy
-- Inspectors can read reports for their own inspections
create policy "reports_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'reports'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from public.inspections i
      where i.id::text = split_part(name, '/', 1)
        and i.inspector_id = auth.uid()
    )
  );

-- Privileged roles can read all reports
create policy "reports_storage_select_privileged"
  on storage.objects for select
  using (
    bucket_id = 'reports'
    and (
      public.current_user_has_role('SUPERVISOR')
      or public.current_user_has_role('ADMIN')
      or public.current_user_has_role('AUDITOR')
    )
  );

-- =============================================================================
-- Security Note: No public download policies
-- No "allow all" or public access policy is created for any bucket.
-- All bucket access requires authentication + role authorization.
-- Signed URLs for temporary access are generated server-side with expiry.
-- =============================================================================



-- ============================================================================
-- MIGRATION: 20260906000001_compliance_assessments.sql
-- ============================================================================

-- =============================================================================
-- Migration 014 (Phase 7): Compliance Assessments Table & RLS Policies
-- LM-Vision Phase 7 — Deterministic Legal Metrology Compliance Engine
-- Source: The Legal Metrology (Packaged Commodities) Rules, 2011 (GSR 202(E))
-- =============================================================================

create table public.compliance_assessments (
  id                          uuid        not null default gen_random_uuid(),
  inspection_id               uuid        not null,
  rule_id                     text        not null,
  rule_version_id             text        not null default '1',
  rule_number                 text        not null,
  sub_rule                    text,
  rule_title                  text        not null,
  rule_kind                   text        not null default 'AUTHORITATIVE',
  source_document             text        not null default 'The Legal Metrology (Packaged Commodities) Rules, 2011',
  source_page                 integer     not null default 1,
  gazette_notification_number text        not null default 'G.S.R. 202(E)',
  clause_reference            text        not null,
  result                      text        not null,
  evidence_sufficiency        text        not null default 'SUFFICIENT',
  severity                    text        not null default 'MAJOR',
  explanation                 text        not null,
  observed_value              jsonb,
  expected_constraint         jsonb,
  deviation                   text,
  declaration_ids             jsonb       not null default '[]'::jsonb,
  evidence_ids                jsonb       not null default '[]'::jsonb,
  confidence                  numeric     not null default 1.0,
  ai_explanation              text,
  engine_version              text        not null default '1.0.0',
  rule_bundle_id              text        not null default 'LM-IN-RULES-2026.09',
  evaluated_at                timestamptz not null default now(),
  created_at                  timestamptz not null default now(),

  constraint compliance_assessments_pkey primary key (id),

  constraint compliance_assessments_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete cascade on update cascade,

  constraint compliance_assessments_result_valid check (
    result in ('PASS', 'FAIL', 'REQUIRES_VERIFICATION', 'NOT_APPLICABLE', 'INSUFFICIENT_EVIDENCE')
  ),

  constraint compliance_assessments_evidence_sufficiency_valid check (
    evidence_sufficiency in ('SUFFICIENT', 'INSUFFICIENT', 'CONFLICTING', 'LOW_CONFIDENCE')
  ),

  constraint compliance_assessments_rule_kind_valid check (
    rule_kind in ('AUTHORITATIVE', 'TEST_ONLY', 'DEMO_ONLY')
  ),

  constraint compliance_assessments_severity_valid check (
    severity in ('CRITICAL', 'MAJOR', 'MINOR', 'INFO')
  ),

  constraint compliance_assessments_confidence_range check (
    confidence >= 0 and confidence <= 1
  )
);

-- Indexes for performance
create index idx_compliance_assessments_inspection_id on public.compliance_assessments(inspection_id);
create index idx_compliance_assessments_rule_id on public.compliance_assessments(rule_id);
create index idx_compliance_assessments_result on public.compliance_assessments(result);

-- Enable RLS
alter table public.compliance_assessments enable row level security;

-- Read policy: Inspection owner
create policy "compliance_assessments_select_own"
  on public.compliance_assessments for select
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
    )
  );

-- Read policy: Privileged roles (Supervisor, Admin, Auditor)
create policy "compliance_assessments_select_privileged"
  on public.compliance_assessments for select
  using (
    public.current_user_has_role('SUPERVISOR')
    or public.current_user_has_role('ADMIN')
    or public.current_user_has_role('AUDITOR')
  );

-- Insert policy: Inspection owner for active/draft inspections
create policy "compliance_assessments_insert_inspector"
  on public.compliance_assessments for insert
  with check (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
        and i.status in ('DRAFT', 'CAPTURED', 'ANALYZING', 'IN_REVIEW')
    )
  );



-- ============================================================================
-- MIGRATION: 20260906000002_inspector_reviews_and_finalization.sql
-- ============================================================================

-- =============================================================================
-- Migration 015 (Phase 8): Inspector Reviews, Corrections, Amendments & Finalization Lock
-- LM-Vision Phase 8 — Inspector Review, Evidence Verification & Final Inspection Decision
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Inspector Reviews Table
-- -----------------------------------------------------------------------------
create table public.inspector_reviews (
  id                        uuid        not null default gen_random_uuid(),
  inspection_id             uuid        not null,
  assessment_id             uuid        not null,
  inspector_id              uuid        not null,
  status                    text        not null default 'UNREVIEWED',
  action                    text,
  original_result           text        not null,
  original_observed_value   jsonb,
  original_confidence       numeric     not null default 1.0,
  reviewed_evidence         boolean     not null default false,
  reviewed_rule             boolean     not null default false,
  reviewed_observation      boolean     not null default false,
  correction                jsonb,
  rationale                 text,
  reviewed_at               timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint inspector_reviews_pkey primary key (id),

  constraint inspector_reviews_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete cascade on update cascade,

  constraint inspector_reviews_assessment_fk foreign key (assessment_id)
    references public.compliance_assessments(id) on delete cascade on update cascade,

  constraint inspector_reviews_inspector_fk foreign key (inspector_id)
    references public.users(id) on delete restrict on update cascade,

  constraint inspector_reviews_unique_assessment unique (inspection_id, assessment_id),

  constraint inspector_reviews_status_valid check (
    status in ('UNREVIEWED', 'IN_REVIEW', 'VERIFIED', 'CORRECTED', 'REQUIRES_FURTHER_REVIEW')
  ),

  constraint inspector_reviews_action_valid check (
    action is null or action in ('VERIFY', 'CORRECT', 'REQUEST_FURTHER_EVIDENCE', 'DISPUTE')
  ),

  constraint inspector_reviews_original_result_valid check (
    original_result in ('PASS', 'FAIL', 'REQUIRES_VERIFICATION', 'NOT_APPLICABLE', 'INSUFFICIENT_EVIDENCE')
  )
);

-- Indexes for performance
create index idx_inspector_reviews_inspection_id on public.inspector_reviews(inspection_id);
create index idx_inspector_reviews_assessment_id on public.inspector_reviews(assessment_id);
create index idx_inspector_reviews_inspector_id on public.inspector_reviews(inspector_id);
create index idx_inspector_reviews_status on public.inspector_reviews(status);

-- -----------------------------------------------------------------------------
-- 2. Inspection Amendments Table (Official Post-Finalization History)
-- -----------------------------------------------------------------------------
create table public.inspection_amendments (
  id                        uuid        not null default gen_random_uuid(),
  inspection_id             uuid        not null,
  amended_by_user_id        uuid        not null,
  amendment_reason          text        not null,
  previous_decision         text        not null,
  new_decision              text        not null,
  previous_state            jsonb,
  new_state                 jsonb,
  amended_at                timestamptz not null default now(),

  constraint inspection_amendments_pkey primary key (id),

  constraint inspection_amendments_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete cascade on update cascade,

  constraint inspection_amendments_user_fk foreign key (amended_by_user_id)
    references public.users(id) on delete restrict on update cascade,

  constraint inspection_amendments_prev_decision_valid check (
    previous_decision in ('COMPLIANT', 'NON_COMPLIANT', 'SEIZED', 'NOTICE_ISSUED', 'ESCALATED', 'DISMISSED')
  ),

  constraint inspection_amendments_new_decision_valid check (
    new_decision in ('COMPLIANT', 'NON_COMPLIANT', 'SEIZED', 'NOTICE_ISSUED', 'ESCALATED', 'DISMISSED')
  )
);

create index idx_inspection_amendments_inspection_id on public.inspection_amendments(inspection_id);
create index idx_inspection_amendments_amended_by on public.inspection_amendments(amended_by_user_id);

-- -----------------------------------------------------------------------------
-- 3. Finalization Lock Security Trigger
-- -----------------------------------------------------------------------------

-- Server-side enforcement function: Rejects modifications to finalized inspections
create or replace function public.enforce_finalization_lock()
returns trigger
language plpgsql
security definer
as $$
declare
  v_inspection_status text;
  v_inspection_id uuid;
begin
  -- Determine the relevant inspection_id
  if TG_TABLE_NAME = 'inspections' then
    v_inspection_status := OLD.status;
    -- Allow updating status from DECIDED if it's an authorized amendment or report generation
    if v_inspection_status in ('DECIDED', 'REPORT_GENERATED', 'ARCHIVED') then
      -- Prevent modifying immutable core fields directly when finalized
      if (OLD.inspector_id is distinct from NEW.inspector_id) or
         (OLD.product_id is distinct from NEW.product_id) or
         (OLD.created_at is distinct from NEW.created_at) then
        raise exception 'INSPECTION_LOCKED: Cannot alter core properties of a finalized inspection.'
          using errcode = '23514';
      end if;
    end if;
    return NEW;
  elsif TG_TABLE_NAME in ('compliance_assessments', 'inspector_reviews', 'inspection_images') then
    v_inspection_id := coalesce(OLD.inspection_id, NEW.inspection_id);
    select status into v_inspection_status
    from public.inspections
    where id = v_inspection_id;

    if v_inspection_status in ('DECIDED', 'REPORT_GENERATED', 'ARCHIVED') then
      raise exception 'INSPECTION_LOCKED: Inspection % is finalized. Assessments, evidence, and reviews are immutable.', v_inspection_id
        using errcode = '23514';
    end if;
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

-- Apply triggers to prevent tampering with finalized inspections
create trigger trg_inspections_finalization_lock
  before update on public.inspections
  for each row execute function public.enforce_finalization_lock();

create trigger trg_assessments_finalization_lock
  before update or delete on public.compliance_assessments
  for each row execute function public.enforce_finalization_lock();

create trigger trg_reviews_finalization_lock
  before update or delete on public.inspector_reviews
  for each row execute function public.enforce_finalization_lock();

create trigger trg_images_finalization_lock
  before delete on public.inspection_images
  for each row execute function public.enforce_finalization_lock();

-- -----------------------------------------------------------------------------
-- 4. Row Level Security Policies
-- -----------------------------------------------------------------------------
alter table public.inspector_reviews enable row level security;
alter table public.inspection_amendments enable row level security;

-- inspector_reviews: Select policy
create policy "inspector_reviews_select_own"
  on public.inspector_reviews for select
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
    )
  );

create policy "inspector_reviews_select_privileged"
  on public.inspector_reviews for select
  using (
    public.current_user_has_role('SUPERVISOR')
    or public.current_user_has_role('ADMIN')
    or public.current_user_has_role('AUDITOR')
  );

-- inspector_reviews: Insert policy (active inspection owner)
create policy "inspector_reviews_insert_inspector"
  on public.inspector_reviews for insert
  with check (
    inspector_id = public.current_user_id()
    and exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
        and i.status not in ('DECIDED', 'REPORT_GENERATED', 'ARCHIVED')
    )
  );

-- inspector_reviews: Update policy (active inspection owner before finalization)
create policy "inspector_reviews_update_inspector"
  on public.inspector_reviews for update
  using (
    inspector_id = public.current_user_id()
    and exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
        and i.status not in ('DECIDED', 'REPORT_GENERATED', 'ARCHIVED')
    )
  );

-- inspection_amendments: Select policy
create policy "inspection_amendments_select"
  on public.inspection_amendments for select
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and (
          i.inspector_id = public.current_user_id()
          or public.current_user_has_role('SUPERVISOR')
          or public.current_user_has_role('ADMIN')
          or public.current_user_has_role('AUDITOR')
        )
    )
  );

-- inspection_amendments: Insert policy (authorized inspector or supervisor for finalized inspection)
create policy "inspection_amendments_insert"
  on public.inspection_amendments for insert
  with check (
    amended_by_user_id = public.current_user_id()
    and exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and (i.inspector_id = public.current_user_id() or public.current_user_has_role('SUPERVISOR') or public.current_user_has_role('ADMIN'))
        and i.status in ('DECIDED', 'REPORT_GENERATED', 'ARCHIVED')
    )
  );



-- ============================================================================
-- MIGRATION: 20260906000003_inspection_reports_and_rls.sql
-- ============================================================================

-- =============================================================================
-- Migration 016: Inspection Reports & RLS Policies
-- LM-Vision Phase 9 — Tamper-Evident Report & Evidence Package Generation
-- =============================================================================
-- Depends on: 015_inspector_reviews_and_finalization (20260906000002)
-- Expands public.reports schema to support canonical multi-format reporting,
-- deterministic cryptographic seals, versioning, and row-level security.
-- =============================================================================

-- 1. Add canonical columns to public.reports
alter table public.reports
  add column if not exists report_number text,
  add column if not exists title text,
  add column if not exists report_version text not null default '1.0.0',
  add column if not exists generator_version text not null default '1.0.0',
  add column if not exists engine_version text not null default '1.0.0',
  add column if not exists rule_bundle_id text not null default 'LM-IN-RULES-2026.09',
  add column if not exists content_hash text,
  add column if not exists is_draft_preview boolean not null default false,
  add column if not exists supersedes_report_id uuid references public.reports(id),
  add column if not exists report_data jsonb,
  add column if not exists total_violations_found integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Content hash format constraint
alter table public.reports
  drop constraint if exists reports_content_hash_format,
  add constraint reports_content_hash_format check (
    content_hash is null or content_hash ~ '^[0-9a-f]{64}$'
  );

-- Indexes for performance & query patterns
create index if not exists idx_reports_report_number
  on public.reports(report_number);

create index if not exists idx_reports_hashes
  on public.reports(sha256, content_hash);

create index if not exists idx_reports_supersedes
  on public.reports(supersedes_report_id);

-- 2. Immutability trigger on reports
create or replace function public.fn_prevent_report_mutation()
returns trigger as $$
begin
  -- Prevent altering core report hashes, versions, or data
  if (old.sha256 is not null and new.sha256 <> old.sha256) or
     (old.content_hash is not null and new.content_hash <> old.content_hash) or
     (old.report_data is not null and new.report_data is distinct from old.report_data) then
    raise exception 'Report % is sealed and immutable. Create a superseding report instead.', old.id
      using errcode = '23514';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_report_mutation on public.reports;
create trigger trg_prevent_report_mutation
  before update on public.reports
  for each row
  execute function public.fn_prevent_report_mutation();

-- 3. Row Level Security (RLS) on public.reports
alter table public.reports enable row level security;

-- Policy 1: Inspectors can select reports for inspections they own
drop policy if exists reports_select_own on public.reports;
create policy reports_select_own
  on public.reports
  for select
  to authenticated
  using (
    exists (
      select 1 from public.inspections i
      where i.id = reports.inspection_id
        and i.inspector_id = auth.uid()
    )
  );

-- Policy 2: Supervisors, Admins, and Auditors can view any report
drop policy if exists reports_select_privileged on public.reports;
create policy reports_select_privileged
  on public.reports
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      join public.roles r on r.id = u.role_id
      where u.id = auth.uid()
        and r.name in ('SUPERVISOR', 'ADMIN', 'AUDITOR')
    )
  );

-- Policy 3: Authorized inspectors can insert reports for their inspections
drop policy if exists reports_insert_authorized on public.reports;
create policy reports_insert_authorized
  on public.reports
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and (i.inspector_id = auth.uid() or exists (
          select 1 from public.users u
          join public.roles r on r.id = u.role_id
          where u.id = auth.uid() and r.name in ('SUPERVISOR', 'ADMIN')
        ))
    )
  );

-- Policy 4: Service role has full access
drop policy if exists reports_service_role_all on public.reports;
create policy reports_service_role_all
  on public.reports
  for all
  to service_role
  using (true)
  with check (true);



-- ============================================================================
-- MIGRATION: 20260906000004_phase11_sync.sql
-- ============================================================================

-- =============================================================================
-- Migration 017: Offline-first synchronization metadata and idempotency receipts
-- =============================================================================
-- This migration adds only synchronization metadata. It does not change the
-- legal rule model or weaken finalization/RLS protections.

alter table public.inspections
  add column if not exists sync_version bigint not null default 1,
  add column if not exists last_synced_at timestamptz,
  add column if not exists local_updated_at timestamptz,
  add column if not exists sync_status text not null default 'LOCAL_ONLY',
  add column if not exists sync_error text,
  add column if not exists conflict_state jsonb;

alter table public.inspections
  drop constraint if exists inspections_sync_status_valid,
  add constraint inspections_sync_status_valid check (
    sync_status in ('LOCAL_ONLY', 'PENDING_SYNC', 'SYNCING', 'SYNCED', 'SYNC_CONFLICT', 'SYNC_FAILED')
  );

alter table public.inspection_images
  add column if not exists sync_status text not null default 'LOCAL_ONLY',
  add column if not exists upload_error text;

alter table public.inspection_images
  drop constraint if exists inspection_images_sync_status_valid,
  add constraint inspection_images_sync_status_valid check (
    sync_status in ('LOCAL_ONLY', 'QUEUED', 'UPLOADING', 'UPLOADED', 'UPLOAD_FAILED', 'SYNCED')
  );

-- Local OCR and explicitly hybrid analyses are valid observations. They do not
-- grant legal authority; the deterministic rule engine remains authoritative.
alter table public.ai_analyses
  drop constraint if exists ai_analyses_provider_valid,
  add constraint ai_analyses_provider_valid check (
    provider in ('GEMINI', 'OPENAI', 'MOCK', 'LOCAL_OCR', 'HYBRID')
  );

create table if not exists public.sync_operation_receipts (
  idempotency_key text not null,
  operation_id text not null,
  inspection_id uuid not null,
  entity_type text not null,
  entity_id text not null,
  operation_type text not null,
  payload_hash text,
  actor_user_id uuid not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint sync_operation_receipts_pkey primary key (idempotency_key),
  constraint sync_operation_receipts_operation_unique unique (operation_id),
  constraint sync_operation_receipts_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete cascade on update cascade,
  constraint sync_operation_receipts_actor_fk foreign key (actor_user_id)
    references public.users(id) on delete restrict on update cascade
);

create index if not exists idx_sync_receipts_inspection
  on public.sync_operation_receipts(inspection_id, created_at);

alter table public.sync_operation_receipts enable row level security;

create policy "sync_receipts_select_owner"
  on public.sync_operation_receipts for select
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id and (
        i.inspector_id = public.current_user_id()
        or public.current_user_has_role('SUPERVISOR')
        or public.current_user_has_role('ADMIN')
        or public.current_user_has_role('AUDITOR')
      )
    )
  );

create policy "sync_receipts_insert_owner"
  on public.sync_operation_receipts for insert
  with check (
    actor_user_id = public.current_user_id()
    and exists (
      select 1 from public.inspections i
      where i.id = inspection_id and i.inspector_id = public.current_user_id()
    )
  );

create policy "sync_receipts_update_owner"
  on public.sync_operation_receipts for update
  using (actor_user_id = public.current_user_id())
  with check (actor_user_id = public.current_user_id());



-- ============================================================================
-- SEED: Ensure Demo Inspector and Default Roles Exist
-- ============================================================================


DO $$
BEGIN
  -- Ensure default roles exist
  INSERT INTO public.roles (name, description)
  VALUES 
    ('ADMIN', 'Full administrative access'),
    ('SUPERVISOR', 'Senior oversight and decision authorization'),
    ('INSPECTOR', 'Field inspection and evidence capture'),
    ('AUDITOR', 'Read-only compliance auditing')
  ON CONFLICT (name) DO NOTHING;

  -- Ensure demo inspector user exists in public.users
  INSERT INTO public.users (id, full_name, designation, badge_number, employee_code, is_active, role_id)
  SELECT 
    '00000002-0000-0000-0000-000000000001'::uuid,
    'Demo Inspector',
    'Legal Metrology Field Officer',
    'INS-DL-0042',
    'LM-DEL-042',
    true,
    (SELECT id FROM public.roles WHERE name = 'INSPECTOR' LIMIT 1)
  ON CONFLICT (id) DO NOTHING;
END $$;
