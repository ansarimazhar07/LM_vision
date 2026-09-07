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
