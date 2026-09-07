-- =============================================================================
-- Migration 015 (Phase 8): Inspector Reviews, Corrections, Amendments & Finalization Lock
-- LM-Vision Phase 8 — Inspector Review, Evidence Verification & Final Inspection Decision
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Inspector Reviews Table
-- -----------------------------------------------------------------------------
create table public.inspector_reviews (
  id                        uuid        not null default gen_random_uuid(),
  inspection_id             uuid        not null,
  assessment_id             uuid        not null,
  inspector_id              uuid        not null,
  status                    text        not null default 'UNREVIEWED',
  action                    text,
  original_result           text        not null,
  original_observed_value   jsonb,
  original_confidence       numeric     not null default 1.0,
  reviewed_evidence         boolean     not null default false,
  reviewed_rule             boolean     not null default false,
  reviewed_observation      boolean     not null default false,
  correction                jsonb,
  rationale                 text,
  reviewed_at               timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint inspector_reviews_pkey primary key (id),

  constraint inspector_reviews_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete cascade on update cascade,

  constraint inspector_reviews_assessment_fk foreign key (assessment_id)
    references public.compliance_assessments(id) on delete cascade on update cascade,

  constraint inspector_reviews_inspector_fk foreign key (inspector_id)
    references public.users(id) on delete restrict on update cascade,

  constraint inspector_reviews_unique_assessment unique (inspection_id, assessment_id),

  constraint inspector_reviews_status_valid check (
    status in ('UNREVIEWED', 'IN_REVIEW', 'VERIFIED', 'CORRECTED', 'REQUIRES_FURTHER_REVIEW')
  ),

  constraint inspector_reviews_action_valid check (
    action is null or action in ('VERIFY', 'CORRECT', 'REQUEST_FURTHER_EVIDENCE', 'DISPUTE')
  ),

  constraint inspector_reviews_original_result_valid check (
    original_result in ('PASS', 'FAIL', 'REQUIRES_VERIFICATION', 'NOT_APPLICABLE', 'INSUFFICIENT_EVIDENCE')
  )
);

-- Indexes for performance
create index idx_inspector_reviews_inspection_id on public.inspector_reviews(inspection_id);
create index idx_inspector_reviews_assessment_id on public.inspector_reviews(assessment_id);
create index idx_inspector_reviews_inspector_id on public.inspector_reviews(inspector_id);
create index idx_inspector_reviews_status on public.inspector_reviews(status);

-- -----------------------------------------------------------------------------
-- 2. Inspection Amendments Table (Official Post-Finalization History)
-- -----------------------------------------------------------------------------
create table public.inspection_amendments (
  id                        uuid        not null default gen_random_uuid(),
  inspection_id             uuid        not null,
  amended_by_user_id        uuid        not null,
  amendment_reason          text        not null,
  previous_decision         text        not null,
  new_decision              text        not null,
  previous_state            jsonb,
  new_state                 jsonb,
  amended_at                timestamptz not null default now(),

  constraint inspection_amendments_pkey primary key (id),

  constraint inspection_amendments_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete cascade on update cascade,

  constraint inspection_amendments_user_fk foreign key (amended_by_user_id)
    references public.users(id) on delete restrict on update cascade,

  constraint inspection_amendments_prev_decision_valid check (
    previous_decision in ('COMPLIANT', 'NON_COMPLIANT', 'SEIZED', 'NOTICE_ISSUED', 'ESCALATED', 'DISMISSED')
  ),

  constraint inspection_amendments_new_decision_valid check (
    new_decision in ('COMPLIANT', 'NON_COMPLIANT', 'SEIZED', 'NOTICE_ISSUED', 'ESCALATED', 'DISMISSED')
  )
);

create index idx_inspection_amendments_inspection_id on public.inspection_amendments(inspection_id);
create index idx_inspection_amendments_amended_by on public.inspection_amendments(amended_by_user_id);

-- -----------------------------------------------------------------------------
-- 3. Finalization Lock Security Trigger
-- -----------------------------------------------------------------------------

-- Server-side enforcement function: Rejects modifications to finalized inspections
create or replace function public.enforce_finalization_lock()
returns trigger
language plpgsql
security definer
as $$
declare
  v_inspection_status text;
  v_inspection_id uuid;
begin
  -- Determine the relevant inspection_id
  if TG_TABLE_NAME = 'inspections' then
    v_inspection_status := OLD.status;
    -- Allow updating status from DECIDED if it's an authorized amendment or report generation
    if v_inspection_status in ('DECIDED', 'REPORT_GENERATED', 'ARCHIVED') then
      -- Prevent modifying immutable core fields directly when finalized
      if (OLD.inspector_id is distinct from NEW.inspector_id) or
         (OLD.product_id is distinct from NEW.product_id) or
         (OLD.created_at is distinct from NEW.created_at) then
        raise exception 'INSPECTION_LOCKED: Cannot alter core properties of a finalized inspection.'
          using errcode = '23514';
      end if;
    end if;
    return NEW;
  elsif TG_TABLE_NAME in ('compliance_assessments', 'inspector_reviews', 'inspection_images') then
    v_inspection_id := coalesce(OLD.inspection_id, NEW.inspection_id);
    select status into v_inspection_status
    from public.inspections
    where id = v_inspection_id;

    if v_inspection_status in ('DECIDED', 'REPORT_GENERATED', 'ARCHIVED') then
      raise exception 'INSPECTION_LOCKED: Inspection % is finalized. Assessments, evidence, and reviews are immutable.', v_inspection_id
        using errcode = '23514';
    end if;
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

-- Apply triggers to prevent tampering with finalized inspections
create trigger trg_inspections_finalization_lock
  before update on public.inspections
  for each row execute function public.enforce_finalization_lock();

create trigger trg_assessments_finalization_lock
  before update or delete on public.compliance_assessments
  for each row execute function public.enforce_finalization_lock();

create trigger trg_reviews_finalization_lock
  before update or delete on public.inspector_reviews
  for each row execute function public.enforce_finalization_lock();

create trigger trg_images_finalization_lock
  before delete on public.inspection_images
  for each row execute function public.enforce_finalization_lock();

-- -----------------------------------------------------------------------------
-- 4. Row Level Security Policies
-- -----------------------------------------------------------------------------
alter table public.inspector_reviews enable row level security;
alter table public.inspection_amendments enable row level security;

-- inspector_reviews: Select policy
create policy "inspector_reviews_select_own"
  on public.inspector_reviews for select
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
    )
  );

create policy "inspector_reviews_select_privileged"
  on public.inspector_reviews for select
  using (
    public.current_user_has_role('SUPERVISOR')
    or public.current_user_has_role('ADMIN')
    or public.current_user_has_role('AUDITOR')
  );

-- inspector_reviews: Insert policy (active inspection owner)
create policy "inspector_reviews_insert_inspector"
  on public.inspector_reviews for insert
  with check (
    inspector_id = public.current_user_id()
    and exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
        and i.status not in ('DECIDED', 'REPORT_GENERATED', 'ARCHIVED')
    )
  );

-- inspector_reviews: Update policy (active inspection owner before finalization)
create policy "inspector_reviews_update_inspector"
  on public.inspector_reviews for update
  using (
    inspector_id = public.current_user_id()
    and exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
        and i.status not in ('DECIDED', 'REPORT_GENERATED', 'ARCHIVED')
    )
  );

-- inspection_amendments: Select policy
create policy "inspection_amendments_select"
  on public.inspection_amendments for select
  using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and (
          i.inspector_id = public.current_user_id()
          or public.current_user_has_role('SUPERVISOR')
          or public.current_user_has_role('ADMIN')
          or public.current_user_has_role('AUDITOR')
        )
    )
  );

-- inspection_amendments: Insert policy (authorized inspector or supervisor for finalized inspection)
create policy "inspection_amendments_insert"
  on public.inspection_amendments for insert
  with check (
    amended_by_user_id = public.current_user_id()
    and exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and (i.inspector_id = public.current_user_id() or public.current_user_has_role('SUPERVISOR') or public.current_user_has_role('ADMIN'))
        and i.status in ('DECIDED', 'REPORT_GENERATED', 'ARCHIVED')
    )
  );
