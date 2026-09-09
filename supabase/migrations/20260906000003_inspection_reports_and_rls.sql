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
