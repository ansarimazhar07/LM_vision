# Supabase Configuration & Migrations

This directory contains **Supabase database schemas, migrations, PostgreSQL functions, Row-Level Security (RLS) policies, and storage bucket configurations** for LM-Vision (SIH 2026 Problem Statement 26034).

## Status

- **Phase 1**: Directory structure preserved.
- **Phase 2**: ✅ Complete — see [`docs/PHASE_2_IMPLEMENTATION_NOTES.md`](../docs/PHASE_2_IMPLEMENTATION_NOTES.md).

## Directory Structure

```text
supabase/
├── config.toml          # Supabase CLI local dev configuration
├── seed.sql             # Safe synthetic seed data (no real legal rules)
└── migrations/          # Deterministic versioned migrations
    ├── 20260905000001_extensions_and_helpers.sql
    ├── 20260905000002_roles_users.sql
    ├── 20260905000003_manufacturers_products.sql
    ├── 20260905000004_inspections.sql
    ├── 20260905000005_inspection_images.sql
    ├── 20260905000006_ai_analyses_declarations.sql
    ├── 20260905000007_rules_rule_versions.sql
    ├── 20260905000008_findings_evidence_decisions.sql
    ├── 20260905000009_ecommerce_cross_source.sql
    ├── 20260905000010_reports.sql
    ├── 20260905000011_audit_logs.sql
    ├── 20260905000012_rls_policies.sql
    └── 20260905000013_storage_buckets.sql
```

## Quick Start (Local Development)

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Start local Supabase stack
supabase start

# Apply all migrations + seed from scratch
supabase db reset

# View local connection info
supabase status
```

## Security Notes

- All three storage buckets (`inspection-images`, `evidence-files`, `reports`) are **private**
- RLS is enabled on all 16 business entity tables
- The service role key **bypasses all RLS** — never use it for ordinary user operations
- Rule versions with `approval_status='ACTIVE'` require source evidence (DB constraint)
- Audit logs are append-only — no UPDATE/DELETE permitted at the database level

## Phase Boundaries

- **Phase 2** (this phase): Schema, Auth, RLS, Storage foundation
- **Phase 3**: Mobile shell (uses this as auth/DB backend)
- **Phase 4**: Web shell (uses this as auth/DB backend)
- **Phase 9**: Real Legal Metrology rule ingestion (requires official PDF + legal review)
