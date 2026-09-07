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
