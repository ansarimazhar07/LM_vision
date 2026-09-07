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
