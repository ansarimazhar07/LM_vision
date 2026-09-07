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
