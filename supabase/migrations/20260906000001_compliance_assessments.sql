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
