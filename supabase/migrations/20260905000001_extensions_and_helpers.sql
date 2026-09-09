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

