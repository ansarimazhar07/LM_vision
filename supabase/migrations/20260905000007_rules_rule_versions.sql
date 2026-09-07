-- =============================================================================
-- Migration 007: Rules & Rule Versions
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: 006_ai_analyses_declarations
-- Schema source: docs/04_DATABASE_DESIGN.md §3 (rules, rule_versions)
-- Rule engine: docs/06_RULE_ENGINE_SPEC.md
-- Legal source gate: docs/14_LEGAL_SOURCE_MAPPING.md
-- =============================================================================
-- IMPORTANT: No real statutory Legal Metrology rules are inserted in this migration.
-- Seeding real rules requires the official Rules PDF and human/legal approval.
-- The schema supports the rule engine but does NOT fabricate rule content.
-- Rule versions with approval_status='ACTIVE' require source_document,
-- source_page, approved_by, and approved_at — enforced by check constraint.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: rules
-- Stable logical rule identity. One rule may have many versioned specifications.
-- rule_number refers to the official Legal Metrology (Packaged Commodities) Rule number.
-- DO NOT populate rule_number with fabricated values.
-- -----------------------------------------------------------------------------
create table public.rules (
  id          uuid        not null default gen_random_uuid(),
  rule_number text,
  sub_rule    text,
  title       text        not null,
  category    text        not null,
  created_at  timestamptz not null default now(),

  constraint rules_pkey primary key (id),
  constraint rules_title_nonempty check (char_length(trim(title)) > 0),
  constraint rules_category_nonempty check (char_length(trim(category)) > 0)
);

comment on table public.rules is
  'Stable logical rule identities from the Legal Metrology (Packaged Commodities) Rules. '
  'rule_number is the official rule number from the authoritative Rules PDF. '
  'DO NOT populate rule_number with fabricated or invented values. '
  'Real rules require: official source PDF ingestion, human/legal review, and approval. '
  'This schema supports the future rule engine (Phase 9) without pre-populating legal content.';

comment on column public.rules.rule_number is
  'Official rule number from the authoritative Legal Metrology Rules PDF. '
  'NULL for test fixtures or structural placeholder records. '
  'Must not be fabricated — source-gated per docs/14_LEGAL_SOURCE_MAPPING.md.';

comment on column public.rules.category is
  'Classification: declaration/quantity/marking/labeling/etc. '
  'Used for rule filtering and display grouping.';

-- Index: rule_number lookup
create index idx_rules_rule_number on public.rules(rule_number)
  where rule_number is not null;

-- Index: category filter
create index idx_rules_category on public.rules(category);

-- -----------------------------------------------------------------------------
-- Table: rule_versions
-- Versioned executable specification of a rule.
-- A rule version with approval_status='ACTIVE' requires source evidence.
-- Conditions, requirements, thresholds are stored as jsonb — the rule engine
-- evaluates these at runtime against declaration data.
-- -----------------------------------------------------------------------------
create table public.rule_versions (
  id              uuid        not null default gen_random_uuid(),
  rule_id         uuid        not null,
  version         text        not null,
  applicability   jsonb       not null default '{}'::jsonb,
  conditions      jsonb       not null default '{}'::jsonb,
  requirement     jsonb       not null default '{}'::jsonb,
  validation_type text,
  threshold       jsonb,
  exceptions      jsonb,
  effective_from  date,
  effective_to    date,
  -- Source evidence (required before ACTIVE status)
  source_document text,
  source_page     text,
  -- Approval workflow
  approval_status text        not null default 'DRAFT',
  approved_by     uuid,
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),

  constraint rule_versions_pkey primary key (id),

  constraint rule_versions_rule_fk foreign key (rule_id)
    references public.rules(id) on delete restrict on update cascade,

  constraint rule_versions_approved_by_fk foreign key (approved_by)
    references public.users(id) on delete set null on update cascade,

  -- Approval status lifecycle
  constraint rule_versions_approval_status_valid check (
    approval_status in ('DRAFT', 'REVIEW', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'RETIRED')
  ),

  -- ACTIVE requires full source evidence and approval metadata
  -- This enforces the legal source gate from docs/14_LEGAL_SOURCE_MAPPING.md
  constraint rule_versions_active_requires_source check (
    approval_status != 'ACTIVE' or (
      source_document is not null and
      char_length(trim(source_document)) > 0 and
      source_page is not null and
      char_length(trim(source_page)) > 0 and
      approved_by is not null and
      approved_at is not null
    )
  ),

  -- Version must be non-empty
  constraint rule_versions_version_nonempty check (char_length(trim(version)) > 0),

  -- Effective date range: from must precede to when both present
  constraint rule_versions_effective_range check (
    effective_from is null or effective_to is null or effective_from <= effective_to
  )
);

comment on table public.rule_versions is
  'Versioned executable specifications for legal rules. '
  'A version with approval_status=ACTIVE must have source_document, source_page, approved_by, and approved_at. '
  'This constraint enforces the legal source gate — no rule can go ACTIVE without verifiable source citation. '
  'applicability, conditions, requirement, threshold are jsonb evaluated by the rule engine at runtime. '
  'Fabricated rule versions MUST NOT be marked ACTIVE.';

comment on column public.rule_versions.approval_status is
  'Lifecycle: DRAFT → REVIEW → APPROVED → ACTIVE → SUPERSEDED|RETIRED. '
  'ACTIVE status requires source_document, source_page, approved_by, approved_at (DB constraint enforced).';

comment on column public.rule_versions.source_document is
  'Name/reference of the authoritative source document (e.g. "Legal Metrology (PC) Rules 2011"). '
  'Required for ACTIVE status. Source-gated per docs/14_LEGAL_SOURCE_MAPPING.md.';

comment on column public.rule_versions.applicability is
  'Executable predicate describing when this rule version applies. '
  'Evaluated by the rule engine against product category, package type, etc.';

-- Index: effective date range + status (rule engine lookups)
create index idx_rule_versions_effective
  on public.rule_versions(effective_from, effective_to, approval_status);

-- Index: rule_id lookup
create index idx_rule_versions_rule
  on public.rule_versions(rule_id, approval_status);
