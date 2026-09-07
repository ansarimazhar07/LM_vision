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
