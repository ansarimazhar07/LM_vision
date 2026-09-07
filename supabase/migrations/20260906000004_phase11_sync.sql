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
