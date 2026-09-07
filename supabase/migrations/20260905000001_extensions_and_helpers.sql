-- =============================================================================
-- Migration 001: PostgreSQL Extensions & Helper Functions
-- LM-Vision Phase 2 — SIH 2026 Problem Statement 26034
-- =============================================================================
-- Depends on: nothing (must run first)
-- =============================================================================

-- Enable UUID generation (uuid_generate_v4())
create extension if not exists "uuid-ossp" with schema extensions;

-- Enable pgcrypto for gen_random_uuid() and cryptographic functions
create extension if not exists "pgcrypto" with schema extensions;

-- =============================================================================
-- Utility: auto-update updated_at timestamp on row mutation
-- Used by all mutable business entity tables via trigger attachment.
-- =============================================================================
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.update_updated_at_column() is
  'Trigger function: automatically updates updated_at to current UTC timestamp on any row update. '
  'Attach via: CREATE TRIGGER <table>_updated_at BEFORE UPDATE ON <table> FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';

-- =============================================================================
-- Utility: current authenticated user ID from JWT claim
-- Wraps auth.uid() with a null-safe cast for use in RLS policies.
-- =============================================================================
create or replace function public.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

comment on function public.current_user_id() is
  'Returns the UUID of the currently authenticated Supabase Auth user. '
  'Used in RLS policies. Returns NULL for unauthenticated requests.';

-- =============================================================================
-- Utility: get the application role for the current authenticated user
-- Used in RLS policies to check role-based access.
-- =============================================================================
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.role_id::text
  from public.users u
  where u.id = auth.uid()
  limit 1;
$$;

comment on function public.current_user_role() is
  'Returns the role name for the currently authenticated user from the application users table. '
  'NOTE: This is the application-level role (INSPECTOR/SUPERVISOR/ADMIN/AUDITOR), not the PostgreSQL role.';

-- =============================================================================
-- Utility: check if current user has a specific role by role name
-- =============================================================================
create or replace function public.current_user_has_role(role_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.id = auth.uid()
      and r.name = role_name
      and u.is_active = true
  );
$$;

comment on function public.current_user_has_role(text) is
  'Returns true if the currently authenticated user has the specified application role. '
  'Example: public.current_user_has_role(''ADMIN'')';
