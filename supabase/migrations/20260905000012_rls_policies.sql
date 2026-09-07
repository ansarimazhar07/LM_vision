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
