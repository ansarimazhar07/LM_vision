-- =============================================================================
-- Migration 008: Findings, Evidence & Inspector Decisions
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: 007_rules_rule_versions
-- Schema source: docs/04_DATABASE_DESIGN.md §3 (findings, evidence, inspector_decisions)
-- Evidence integrity: docs/08_SECURITY_SPECIFICATION.md §8
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: findings
-- Evaluation output from the rule engine or AI analysis.
-- A finding produces one of: PASS | WARNING | SUSPECTED_NON_COMPLIANCE | MANUAL_REVIEW
-- Legal-rule findings must reference a rule_version_id.
-- -----------------------------------------------------------------------------
create table public.findings (
  id                    uuid        not null default gen_random_uuid(),
  inspection_id         uuid        not null,
  rule_version_id       uuid,
  finding_type          text        not null,
  status                text        not null,
  title                 text        not null,
  explanation           text        not null default '',
  confidence            numeric,
  human_review_required boolean     not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint findings_pkey primary key (id),

  constraint findings_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete cascade on update cascade,

  constraint findings_rule_version_fk foreign key (rule_version_id)
    references public.rule_versions(id) on delete restrict on update cascade,

  -- Status must be one of the canonical finding outcomes
  constraint findings_status_valid check (
    status in ('PASS', 'WARNING', 'SUSPECTED_NON_COMPLIANCE', 'MANUAL_REVIEW')
  ),

  -- Finding type categories
  constraint findings_type_valid check (
    finding_type in (
      'RULE_BASED', 'AI_OBSERVATION', 'MEASUREMENT', 'CROSS_SOURCE', 'MANUAL'
    )
  ),

  -- Confidence: 0.0 to 1.0 when present
  constraint findings_confidence_range check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  ),

  -- Legal rule findings must reference a rule version
  -- Non-legal observations may have null rule_version_id
  constraint findings_legal_requires_rule_version check (
    finding_type != 'RULE_BASED' or rule_version_id is not null
  ),

  -- Title must be non-empty
  constraint findings_title_nonempty check (char_length(trim(title)) > 0)
);

comment on table public.findings is
  'Rule engine or AI analysis evaluation results. '
  'status is one of: PASS, WARNING, SUSPECTED_NON_COMPLIANCE, MANUAL_REVIEW. '
  'RULE_BASED findings must reference a rule_version_id (constraint enforced). '
  'A SUSPECTED_NON_COMPLIANCE finding is NOT itself the inspector''s enforcement decision. '
  'human_review_required=true must block report generation until inspector resolves.';

comment on column public.findings.rule_version_id is
  'FK to rule_versions.id. Required for RULE_BASED findings (DB constraint). '
  'Nullable for AI_OBSERVATION, MEASUREMENT, CROSS_SOURCE, MANUAL findings.';

comment on column public.findings.finding_type is
  'RULE_BASED: deterministic rule engine result. '
  'AI_OBSERVATION: AI model observation (not a rule verdict). '
  'MEASUREMENT: CV-derived physical measurement. '
  'CROSS_SOURCE: e-commerce vs physical discrepancy. '
  'MANUAL: inspector-created finding.';

-- Index: status + review required (primary dashboard query)
create index idx_findings_status
  on public.findings(status, human_review_required);

-- Index: inspection lookup
create index idx_findings_inspection
  on public.findings(inspection_id, status);

-- Index: human review queue
create index idx_findings_review_required
  on public.findings(human_review_required, status)
  where human_review_required = true;

-- Trigger: auto-update updated_at
create trigger findings_updated_at
  before update on public.findings
  for each row execute function public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Table: evidence
-- Binary or structured evidence artifacts supporting inspection findings.
-- sha256 is immutable after insert (enforced by RLS in migration 012).
-- storage_path references private Supabase Storage objects.
-- -----------------------------------------------------------------------------
create table public.evidence (
  id               uuid        not null default gen_random_uuid(),
  inspection_id    uuid        not null,
  finding_id       uuid,
  evidence_type    text        not null,
  storage_path     text,
  sha256           text,
  source_reference jsonb       not null default '{}'::jsonb,
  captured_at      timestamptz,
  captured_by      uuid,
  verified_by      uuid,
  verified_at      timestamptz,
  status           text        not null default 'ATTACHED',
  created_at       timestamptz not null default now(),

  constraint evidence_pkey primary key (id),

  constraint evidence_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete cascade on update cascade,

  constraint evidence_finding_fk foreign key (finding_id)
    references public.findings(id) on delete set null on update cascade,

  constraint evidence_captured_by_fk foreign key (captured_by)
    references public.users(id) on delete set null on update cascade,

  constraint evidence_verified_by_fk foreign key (verified_by)
    references public.users(id) on delete set null on update cascade,

  -- Evidence type aligned with EvidenceType enum in shared-types
  constraint evidence_type_valid check (
    evidence_type in (
      'IMAGE', 'OCR_REGION', 'LISTING', 'NOTE', 'MEASUREMENT', 'DOCUMENT', 'OTHER'
    )
  ),

  -- Evidence status lifecycle
  constraint evidence_status_valid check (
    status in ('ATTACHED', 'VERIFIED', 'FLAGGED', 'ARCHIVED')
  ),

  -- SHA-256: 64 lowercase hex characters when present
  constraint evidence_sha256_format check (
    sha256 is null or sha256 ~ '^[0-9a-f]{64}$'
  ),

  -- Binary evidence must have storage_path and sha256
  constraint evidence_binary_requires_path_and_hash check (
    evidence_type not in ('IMAGE', 'DOCUMENT') or
    (storage_path is not null and sha256 is not null)
  ),

  -- Verified timestamp after captured when both present
  constraint evidence_verification_timeline check (
    verified_at is null or captured_at is null or verified_at >= captured_at
  )
);

comment on table public.evidence is
  'Evidence artifacts supporting inspection findings. '
  'Binary evidence (IMAGE, DOCUMENT) requires storage_path and sha256 (constraint enforced). '
  'storage_path references private bucket "evidence-files" — never expose as permanent public URL. '
  'sha256 is immutable after insert — enforced by RLS policy (no UPDATE on sha256 column after insert). '
  'source_reference: jsonb linking to the source (image region, page, measurement metadata).';

comment on column public.evidence.sha256 is
  'SHA-256 hex digest of the original evidence bytes. '
  'Required for binary evidence types. Immutable after insert (RLS enforced). '
  'See docs/08_SECURITY_SPECIFICATION.md §8.';

-- Index: sha256 lookup for deduplication
create index idx_evidence_hash on public.evidence(sha256)
  where sha256 is not null;

-- Index: inspection + type
create index idx_evidence_inspection
  on public.evidence(inspection_id, evidence_type);

-- Index: finding evidence lookup
create index idx_evidence_finding
  on public.evidence(finding_id)
  where finding_id is not null;

-- -----------------------------------------------------------------------------
-- Table: inspector_decisions
-- The inspector's final enforcement decision on an inspection.
-- This is the authoritative human decision — not AI output.
-- -----------------------------------------------------------------------------
create table public.inspector_decisions (
  id            uuid        not null default gen_random_uuid(),
  inspection_id uuid        not null,
  inspector_id  uuid        not null,
  decision      text        not null,
  comments      text        not null default '',
  decided_at    timestamptz not null default now(),

  constraint inspector_decisions_pkey primary key (id),

  constraint inspector_decisions_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete restrict on update cascade,

  constraint inspector_decisions_inspector_fk foreign key (inspector_id)
    references public.users(id) on delete restrict on update cascade,

  -- Decision must be one of the canonical types
  constraint inspector_decisions_decision_valid check (
    decision in (
      'COMPLIANT', 'NON_COMPLIANT', 'SEIZED', 'NOTICE_ISSUED', 'ESCALATED', 'DISMISSED'
    )
  )
);

comment on table public.inspector_decisions is
  'Inspector''s final enforcement decision on an inspection. '
  'This is the authoritative human decision — the AI engine and rule engine provide input, '
  'but the inspector makes the binding legal determination. '
  'Decision values aligned with InspectorDecisionType enum in shared-types.';

comment on column public.inspector_decisions.decision is
  'COMPLIANT: product meets requirements. '
  'NON_COMPLIANT: product does not meet requirements. '
  'SEIZED: product seized for further action. '
  'NOTICE_ISSUED: show cause or compounding notice issued. '
  'ESCALATED: referred to higher authority. '
  'DISMISSED: inspection closed without action.';

-- Index: inspection decision lookup
create index idx_inspector_decisions_inspection
  on public.inspector_decisions(inspection_id, decided_at desc);
