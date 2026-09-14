-- =============================================================================
-- Migration 016 (Phase F): Inspection Lifecycle Extensions, Finalization Lock,
-- Controlled Reopening, and Conflict Acknowledgements
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Update inspections status constraint for Phase F canonical lifecycle
-- -----------------------------------------------------------------------------
alter table public.inspections
  drop constraint if exists inspections_status_valid;

alter table public.inspections
  add constraint inspections_status_valid check (
    status in (
      'DRAFT', 'CAPTURING', 'CAPTURED', 'PROCESSING', 'ANALYZING', 'ANALYZED',
      'REVIEW_REQUIRED', 'NEEDS_VERIFICATION',
      'READY_FOR_DECISION',
      'DECIDED', 'FINALIZED',
      'REPORT_GENERATED', 'SYNCED',
      'REOPENED', 'SUPERSEDED', 'ARCHIVED'
    )
  );

-- -----------------------------------------------------------------------------
-- 2. Conflict Acknowledgements Table
-- Required before finalization when cross-surface evidence conflicts exist
-- -----------------------------------------------------------------------------
create table if not exists public.conflict_acknowledgements (
  id                          uuid        not null default gen_random_uuid(),
  inspection_id               uuid        not null,
  inspector_id                uuid        not null,
  field                       text        not null,
  conflict_reason             text        not null,
  acknowledged_evidence_ids   jsonb       not null default '[]'::jsonb,
  status                      text        not null default 'ACKNOWLEDGED',
  inspector_notes             text,
  acknowledged_at             timestamptz not null default now(),
  created_at                  timestamptz not null default now(),

  constraint conflict_acknowledgements_pkey primary key (id),

  constraint conflict_acknowledgements_inspection_fk foreign key (inspection_id)
    references public.inspections(id) on delete cascade on update cascade,

  constraint conflict_acknowledgements_inspector_fk foreign key (inspector_id)
    references public.users(id) on delete restrict on update cascade,

  constraint conflict_acknowledgements_status_valid check (
    status in ('ACKNOWLEDGED', 'RESOLVED_BY_CORRECTION', 'PENDING')
  )
);

create index if not exists idx_conflict_acknowledgements_inspection_id
  on public.conflict_acknowledgements(inspection_id);
create index if not exists idx_conflict_acknowledgements_inspector_id
  on public.conflict_acknowledgements(inspector_id);

-- -----------------------------------------------------------------------------
-- 3. Update Finalization Lock Security Trigger
-- -----------------------------------------------------------------------------
create or replace function public.enforce_finalization_lock()
returns trigger
language plpgsql
security definer
as $$
declare
  v_inspection_status text;
  v_inspection_id uuid;
begin
  if TG_TABLE_NAME = 'inspections' then
    v_inspection_status := OLD.status;

    -- If inspection is finalized / decided
    if v_inspection_status in ('DECIDED', 'FINALIZED', 'REPORT_GENERATED', 'ARCHIVED') then
      -- Allow controlled reopening by authorized inspector/supervisor
      if NEW.status = 'REOPENED' then
        if not (public.current_user_has_role('SUPERVISOR') or public.current_user_has_role('ADMIN') or OLD.inspector_id = public.current_user_id()) then
          raise exception 'UNAUTHORIZED_REOPEN: Only the assigned inspector or supervisor may reopen an inspection.'
            using errcode = '42501';
        end if;
        return NEW;
      end if;

      -- Prevent modifying core immutable fields directly when finalized
      if (OLD.inspector_id is distinct from NEW.inspector_id) or
         (OLD.product_id is distinct from NEW.product_id) or
         (OLD.created_at is distinct from NEW.created_at) then
        raise exception 'INSPECTION_LOCKED: Cannot alter core properties of a finalized inspection.'
          using errcode = '23514';
      end if;
    end if;
    return NEW;

  elsif TG_TABLE_NAME in ('compliance_assessments', 'inspector_reviews', 'inspection_images', 'conflict_acknowledgements') then
    v_inspection_id := coalesce(OLD.inspection_id, NEW.inspection_id);
    select status into v_inspection_status
    from public.inspections
    where id = v_inspection_id;

    if v_inspection_status in ('DECIDED', 'FINALIZED', 'REPORT_GENERATED', 'ARCHIVED') then
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

-- Apply trigger to conflict_acknowledgements
drop trigger if exists trg_conflict_ack_finalization_lock on public.conflict_acknowledgements;
create trigger trg_conflict_ack_finalization_lock
  before update or delete on public.conflict_acknowledgements
  for each row execute function public.enforce_finalization_lock();

-- -----------------------------------------------------------------------------
-- 4. Row Level Security for conflict_acknowledgements
-- -----------------------------------------------------------------------------
alter table public.conflict_acknowledgements enable row level security;

create policy "conflict_acknowledgements_select"
  on public.conflict_acknowledgements for select
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

create policy "conflict_acknowledgements_insert"
  on public.conflict_acknowledgements for insert
  with check (
    inspector_id = public.current_user_id()
    and exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and i.inspector_id = public.current_user_id()
        and i.status not in ('DECIDED', 'FINALIZED', 'REPORT_GENERATED', 'ARCHIVED')
    )
  );
