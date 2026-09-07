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
