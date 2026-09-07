-- =============================================================================
-- Migration 002: Roles & Users
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: 001_extensions_and_helpers
-- Schema source: docs/04_DATABASE_DESIGN.md §3 (roles, users)
-- Security: docs/08_SECURITY_SPECIFICATION.md §3 (RBAC)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: roles
-- Canonical application roles. Row count is small; seeded by seed.sql.
-- Canonical values: INSPECTOR, SUPERVISOR, ADMIN, AUDITOR
-- -----------------------------------------------------------------------------
create table public.roles (
  id          uuid        not null default gen_random_uuid(),
  name        text        not null,
  description text        not null default '',
  created_at  timestamptz not null default now(),

  constraint roles_pkey primary key (id),
  constraint roles_name_unique unique (name),
  constraint roles_name_valid check (
    name in ('INSPECTOR', 'SUPERVISOR', 'ADMIN', 'AUDITOR')
  )
);

comment on table public.roles is
  'Application-level RBAC roles. Canonical values: INSPECTOR, SUPERVISOR, ADMIN, AUDITOR. '
  'Row-level security is NOT enabled on this table — roles are read-only reference data for all authenticated users, '
  'and write access is controlled via service-role only.';

comment on column public.roles.name is
  'Canonical role identifier. One of: INSPECTOR, SUPERVISOR, ADMIN, AUDITOR.';

-- -----------------------------------------------------------------------------
-- Table: users
-- Application-level user profile. ID matches auth.users.id (Supabase Auth UUID).
-- This is NOT a shadow of auth.users; it is the application profile.
-- The auth.users record is the identity authority (Supabase Auth).
-- This record holds the application-level role assignment and profile data.
-- -----------------------------------------------------------------------------
create table public.users (
  id              uuid        not null,
  role_id         uuid        not null,
  full_name       text        not null,
  employee_code   text,
  phone           text,
  is_active       boolean     not null default true,
  -- Inspector-specific profile fields (nullable for non-inspector roles)
  badge_number        text,
  designation         text,
  jurisdiction_zone   text,
  jurisdiction_state  text,
  office_address      text,
  -- Timestamps
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  last_login_at timestamptz,

  constraint users_pkey primary key (id),
  constraint users_role_fk foreign key (role_id)
    references public.roles(id) on delete restrict on update cascade,
  -- Link to Supabase Auth — enforced at application layer, not via FK to auth.users
  -- (auth schema FKs are not exposed in public schema migrations)
  constraint users_employee_code_unique unique (employee_code)
);

comment on table public.users is
  'Application user profiles. id matches auth.users.id from Supabase Auth. '
  'Supabase Auth is the identity authority; this table holds application-level role and profile data. '
  'Role changes must go through privileged server-side operations only (service-role client).';

comment on column public.users.id is
  'UUID matching the Supabase Auth user ID (auth.users.id). Set by a trigger on auth.users insert.';

comment on column public.users.role_id is
  'FK to roles.id. Changed only by ADMIN via server-side operations. '
  'Users cannot change their own role — enforced by RLS in migration 012.';

comment on column public.users.employee_code is
  'Operational identifier (badge/employee code). Optional. '
  'Should not contain personally sensitive identifiers beyond operational necessity.';

comment on column public.users.badge_number is
  'Inspector badge number. Nullable — only required for INSPECTOR role.';

-- Index: employee_code lookup
create index idx_users_employee_code on public.users(employee_code)
  where employee_code is not null;

-- Index: role lookup (for RLS policy joins)
create index idx_users_role on public.users(role_id);

-- Index: active user lookup
create index idx_users_active on public.users(is_active) where is_active = true;

-- Trigger: auto-update updated_at
create trigger users_updated_at
  before update on public.users
  for each row execute function public.update_updated_at_column();

-- =============================================================================
-- Trigger: create application user profile on Supabase Auth sign-up
-- This trigger runs in the auth schema context and creates a profile in public.users.
-- The default role is INSPECTOR (lowest privilege). Role elevation requires ADMIN action.
-- =============================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inspector_role_id uuid;
begin
  -- Resolve the default role (INSPECTOR — least privilege for new sign-ups)
  select id into v_inspector_role_id
  from public.roles
  where name = 'INSPECTOR'
  limit 1;

  if v_inspector_role_id is null then
    raise exception 'handle_new_auth_user: INSPECTOR role not found in public.roles. '
      'Ensure seed data has been applied before enabling new sign-ups.';
  end if;

  insert into public.users (
    id,
    role_id,
    full_name,
    is_active,
    created_at,
    updated_at
  ) values (
    new.id,
    v_inspector_role_id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    true,
    now(),
    now()
  );

  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'Trigger function: creates a public.users profile row when a new auth.users record is inserted. '
  'Default role is INSPECTOR (least privilege). An ADMIN must elevate role through server-side operations. '
  'SECURITY: Users cannot modify role_id via this trigger or RLS. Role escalation requires privileged server action.';

-- Attach trigger to auth.users (Supabase Auth table)
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
