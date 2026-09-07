# LM-Vision — Phase 2 Implementation Notes

**Project**: LM-Vision (SIH 2026 Problem Statement 26034)
**Phase**: Phase 2 — Supabase + Authentication
**Status**: Completed
**Completion Date**: September 2026

---

## 1. Overview

Phase 2 establishes the database, authentication, and storage foundation for LM-Vision. It implements the PostgreSQL schema via Supabase migrations, configures Supabase Auth with application-level RBAC, creates private storage buckets, implements Row Level Security policies, and provides a typed `@lm-vision/supabase-client` package with domain adapters and auth utilities.

**What Phase 2 does NOT implement:** mobile screens, web UI, live AI calls, OCR/CV, real legal rules, e-commerce scraping, PDF reports, analytics, or offline sync — those are Phase 3–17.

---

## 2. Supabase Setup

### Project Configuration

`supabase/config.toml` — Supabase CLI local development configuration:
- Local API port: 54321
- Local DB port: 54322
- Studio port: 54323
- Auth site URL: `http://localhost:3000`
- Email confirmations disabled in local dev

### To run locally (when Supabase CLI is installed):
```bash
supabase start          # Start local Supabase stack
supabase db reset       # Apply migrations from scratch + seed
supabase status         # Show connection strings and keys
```

### Live Project Setup:
1. Create project at `https://supabase.com`
2. Copy project URL and anon key to `.env.local`
3. Copy service role key to server-only environment (never to client bundles)
4. Run migrations: `supabase db push`
5. Run seed: copy `supabase/seed.sql` into Supabase SQL editor

---

## 3. Migration Structure

All migrations are in `supabase/migrations/`. They use deterministic timestamp prefixes (`20260905XXXXXX_*.sql`) and must be applied in order.

| Migration | Content |
|-----------|---------|
| `20260905000001_extensions_and_helpers.sql` | `uuid-ossp`, `pgcrypto`, `update_updated_at_column()` trigger fn, `current_user_id()`, `current_user_has_role()` RLS helper fns |
| `20260905000002_roles_users.sql` | `roles` table (4 canonical roles + check constraint), `users` table (FK to auth.users via trigger), `handle_new_auth_user()` trigger |
| `20260905000003_manufacturers_products.sql` | `manufacturers`, `products` tables with category/package_type check constraints |
| `20260905000004_inspections.sql` | `inspections` table — full status lifecycle check constraint, source_type constraint, timeline integrity |
| `20260905000005_inspection_images.sql` | `inspection_images` — SHA-256 format constraint, MIME allowlist, surface enum constraint |
| `20260905000006_ai_analyses_declarations.sql` | `ai_analyses` (provider/status/confidence constraints), `declarations` (field_name aligned with DeclarationType enum) |
| `20260905000007_rules_rule_versions.sql` | `rules`, `rule_versions` — **ACTIVE status requires source_document + source_page + approved_by + approved_at** (DB constraint) |
| `20260905000008_findings_evidence_decisions.sql` | `findings` (RULE_BASED requires rule_version_id), `evidence` (binary types require sha256+path), `inspector_decisions` |
| `20260905000009_ecommerce_cross_source.sql` | `ecommerce_listings`, `cross_source_comparisons` — schema foundation for Phase 12 |
| `20260905000010_reports.sql` | `reports` — private storage path, format allowlist, path/hash consistency constraint |
| `20260905000011_audit_logs.sql` | `audit_logs` — append-only, full action/entity enum constraints, `insert_audit_log()` SECURITY DEFINER helper |
| `20260905000012_rls_policies.sql` | Enable RLS on all 16 tables, per-role policies, role-escalation prevention, audit log immutability |
| `20260905000013_storage_buckets.sql` | Create 3 private storage buckets + storage.objects RLS policies |

---

## 4. Tables & Relationships

### Core Entity Chain (as documented in docs/04_DATABASE_DESIGN.md):

```
roles ←→ users
             ↓
manufacturers → products → inspections → inspection_images
                               ↓               ↓
                           ai_analyses ← declarations
                               ↓
                           rules → rule_versions
                               ↓
                           findings → evidence → inspector_decisions
                               ↓
                           ecommerce_listings → cross_source_comparisons
                               ↓
                           reports ← audit_logs
```

### Key Constraints:
- **Confidence values**: `CHECK (value >= 0 AND value <= 1)` on `ai_analyses`, `declarations`, `findings`
- **SHA-256 format**: `CHECK (sha256 ~ '^[0-9a-f]{64}$')` on `inspection_images`, `evidence`, `reports`
- **Rule ACTIVE gate**: `rule_versions` with `approval_status='ACTIVE'` requires `source_document`, `source_page`, `approved_by`, `approved_at` — **DB constraint enforced**
- **RULE_BASED findings**: `findings.rule_version_id` is mandatory when `finding_type='RULE_BASED'` — **DB constraint enforced**
- **Binary evidence**: `evidence` with `evidence_type IN ('IMAGE','DOCUMENT')` requires `storage_path` and `sha256` — **DB constraint enforced**
- **Report consistency**: `reports.sha256` and `reports.storage_path` must both be null or both non-null
- **Audit logs**: No `updated_at` column — append-only design. No UPDATE/DELETE RLS policies.

### Indexes (minimum set from docs/04_DATABASE_DESIGN.md §4):
All documented minimum indexes are implemented, plus additional indexes for RLS performance (e.g., `idx_inspections_inspector` for inspector_id JOIN in RLS policies).

---

## 5. Authentication Architecture

### Identity Authority: Supabase Auth

Supabase Auth is the sole identity authority. No custom JWT signing or password hashing is implemented. The auth flow is:

```
User → Supabase Auth (email+password)
     → JWT access token issued
     → Application reads auth.uid() in RLS policies
     → public.users record (created by trigger on signup)
```

### Auto-Profile Creation Trigger (`handle_new_auth_user`):
When a new auth user is created (via sign-up or admin), the `handle_new_auth_user()` trigger automatically creates a `public.users` profile with:
- `id` = `auth.users.id` (matching auth identity)
- `role_id` = INSPECTOR role (least privilege default)
- `full_name` from `raw_user_meta_data->>'full_name'` or email prefix

**Role elevation requires ADMIN via server-side service-role operation.**

### Auth Utilities (`@lm-vision/supabase-client/auth`):
- `signUp(client, email, password, metadata)` — Supabase Auth sign-up
- `signIn(client, email, password)` — Returns user + session with JWT
- `signOut(client)` — Invalidates local session
- `getSession(client)` — Retrieves current session
- `getAuthenticatedUser(client)` — Server-validates current user
- `refreshSession(client)` — Extends token lifetime
- `resetPasswordForEmail(client, email, redirectTo?)` — Password reset flow
- `onAuthStateChange(client, callback)` — Reactive auth state (returns unsubscribe)

---

## 6. RBAC + Role Model

### Roles (from `docs/08_SECURITY_SPECIFICATION.md §3`):

| Role | Read Own | Read All | Write | Admin | Audit Logs |
|------|----------|----------|-------|-------|------------|
| INSPECTOR | ✅ (own) | ❌ | ✅ (own DRAFT/CAPTURED) | ❌ | ❌ |
| SUPERVISOR | ✅ | ✅ | ✅ (review) | ❌ | ❌ |
| ADMIN | ✅ | ✅ | ✅ (all) | ✅ | ✅ |
| AUDITOR | ✅ | ✅ | ❌ | ❌ | ✅ |

### Role Escalation Protection:
- Users cannot change their own `role_id` via the `users_update_own_profile` RLS policy (enforces `role_id` must remain unchanged)
- Only ADMIN can change any other user's role via `users_update_admin` policy
- The `policyCanSelfChangeRole()` function enforces this at application layer too

### Important:
- **roles table**: RLS NOT enabled — roles are read-only reference data for all authenticated users; write access requires service-role
- **auth.uid()**: Used in all RLS policies via `current_user_id()` helper function

---

## 7. Row Level Security

### RLS Status:
- RLS enabled on: `users`, `manufacturers`, `products`, `inspections`, `inspection_images`, `ai_analyses`, `declarations`, `rules`, `rule_versions`, `findings`, `evidence`, `inspector_decisions`, `ecommerce_listings`, `cross_source_comparisons`, `reports`, `audit_logs` (16 tables)
- RLS NOT enabled on: `roles` (intentionally — read-only reference data)

### Key Policy Patterns:
- **Inspection ownership**: Inspector policies use `inspector_id = auth.uid()` JOIN
- **Privileged access**: Supervisor/Admin/Auditor use `current_user_has_role()` helper
- **Audit log immutability**: No UPDATE/DELETE policies — append-only enforced at DB level
- **Rule activation gate**: Requires ADMIN role + source evidence fields (DB CHECK constraint)

### RLS_RUNTIME_VERIFICATION_REQUIRED:

> ⚠️ **The following runtime behaviors must be verified against a live Supabase/PostgreSQL environment. Mock-based tests document POLICY INTENT only.**

| Verification | Status |
|-------------|--------|
| Inspector A cannot SELECT Inspector B's inspection | `RLS_RUNTIME_VERIFICATION_REQUIRED` |
| Inspector cannot UPDATE own `role_id` | `RLS_RUNTIME_VERIFICATION_REQUIRED` |
| Auditor cannot INSERT/UPDATE/DELETE inspections | `RLS_RUNTIME_VERIFICATION_REQUIRED` |
| Non-admin cannot set `approval_status=ACTIVE` | `RLS_RUNTIME_VERIFICATION_REQUIRED` |
| Authenticated user cannot UPDATE audit_logs | `RLS_RUNTIME_VERIFICATION_REQUIRED` |
| Authenticated user cannot DELETE audit_logs | `RLS_RUNTIME_VERIFICATION_REQUIRED` |
| Service-role bypasses RLS (intended) | `RLS_RUNTIME_VERIFICATION_REQUIRED` |
| `handle_new_auth_user` trigger creates INSPECTOR profile | `RLS_RUNTIME_VERIFICATION_REQUIRED` |
| Storage access requires signed URL | `RLS_RUNTIME_VERIFICATION_REQUIRED` |
| Evidence sha256 immutable after insert | `RLS_RUNTIME_VERIFICATION_REQUIRED` |
| Rule ACTIVE gate check constraint fires | `RLS_RUNTIME_VERIFICATION_REQUIRED` |

---

## 8. Storage Design

### Buckets (all private — `public = false`):

| Bucket | Purpose | Max File Size | Allowed MIME Types |
|--------|---------|--------------|-------------------|
| `inspection-images` | Raw inspection captures | 50 MB | `image/jpeg`, `image/png`, `image/webp`, `image/heic` |
| `evidence-files` | Binary evidence artifacts | 100 MB | Images + `application/pdf`, `text/plain`, `application/json` |
| `reports` | Generated PDF/HTML reports | 50 MB | `application/pdf`, `text/html`, `application/json` |

### Access Pattern (from docs/08_SECURITY_SPECIFICATION.md §5):
```
Authorized user → API authorization → short-lived signed URL → object
```
- No permanent public URLs exposed for any bucket
- Object path convention: `<inspection_id>/<uuid>.<ext>` (server-generated, not user-controlled)
- Inspector can upload/read their own inspection's images
- Privileged roles (SUPERVISOR/ADMIN/AUDITOR) can read all objects
- Report INSERT is service-role only (server-generated)

### Storage Configuration Method:
Storage buckets are created via `INSERT INTO storage.buckets` in migration `013_storage_buckets.sql`. This is the correct Supabase-native approach — buckets are defined in the same migration chain as the schema, ensuring clean-database reproducibility.

---

## 9. Audit Log Foundation

### Design (from docs/08_SECURITY_SPECIFICATION.md §7):
- Table: `public.audit_logs`
- **Append-only**: No UPDATE policy, no DELETE policy — PostgreSQL blocks all mutations
- `actor_user_id` nullable for system events
- `before_data`/`after_data`: redacted jsonb — never store secrets, tokens, or keys
- Helper function: `public.insert_audit_log()` with `SECURITY DEFINER` for server-side callers

### Audited Events (14 action categories):
Authentication, inspection lifecycle, evidence verification, decision submission, rule lifecycle, user/role changes, report generation, admin configuration, system events.

### Entity Types Tracked:
All 14 domain entities: user, inspection, inspection_image, ai_analysis, declaration, rule, rule_version, finding, evidence, inspector_decision, ecommerce_listing, cross_source_comparison, report, system.

---

## 10. `@lm-vision/supabase-client` Package

New workspace package at `packages/supabase-client/`.

### Architecture:
```
Database Row Types (DatabaseRow*)
      ↓ adapter functions
Canonical Domain Models (@lm-vision/shared-types)
```

### Dependencies:
- `@lm-vision/shared-types` ✅
- `@lm-vision/config` ✅
- `@supabase/supabase-js` v2.x ✅
- ❌ No dependency on `services/ai-engine`
- ❌ No dependency on `packages/rules`
- ❌ No dependency on app UI code

### Client Factories:
- `createServerClient(url, serviceRoleKey)` — bypasses RLS; browser guard throws if called from browser
- `createBrowserClient(url, anonKey)` — session persistence, RLS-enforced
- `createAuthenticatedClient(url, anonKey, accessToken)` — RLS-enforced with user JWT

### Domain Adapters:
- `adaptUser(row: DatabaseRowUserWithRole)` → `User`
- `adaptUserPartial(row, role)` → `User` (when role not joined)
- `adaptInspectionRow(row)` → `InspectionScalarFields`
- `adaptInspectionImage(row)` → `InspectionImage`

### Schema Drift Detection:
`EXPECTED_TABLE_COLUMNS` constant in `src/types/database.ts` lists all expected columns per table. The `phase2-database.test.ts` test file validates this map. When migrations change columns, both the type file and this map must be updated. The CI pipeline (Phase 17 QA) should run `supabase db diff` to catch schema drift against a live database.

---

## 11. Seed Data

`supabase/seed.sql` — Safe synthetic data:

| Entity | Record | Notes |
|--------|--------|-------|
| Roles | 4 canonical roles | INSPECTOR, SUPERVISOR, ADMIN, AUDITOR |
| Users | 4 demo users | Demo Inspector, Supervisor, Admin, Auditor |
| Manufacturer | Demo Consumer Products Ltd. | Synthetic |
| Product | ABC Shampoo 500ml | Matches demo scenario from docs/12_DEMO_SCENARIO.md |
| Inspection | 1 DRAFT inspection | Assigned to Demo Inspector |
| Rule | 1 TEST FIXTURE rule | `null` rule_number, `DRAFT` status — NOT ACTIVE |

**NO statutory Legal Metrology rule numbers or thresholds are seeded.**
The test fixture rule remains in `DRAFT` status — the DB constraint prevents it from becoming `ACTIVE` without source evidence.

---

## 12. Environment Variables

No new environment variables are introduced beyond what Phase 1 already defined.

### Server-only (never in client bundles):
```env
SUPABASE_SERVICE_ROLE_KEY=  # Service role — bypasses RLS
SUPABASE_JWT_SECRET=        # JWT verification secret
```

### Public (safe for browser/mobile):
```env
NEXT_PUBLIC_SUPABASE_URL=      # Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Public anon key
```

See `.env.example` for full template.

---

## 13. Test Results

| Test Suite | Tests | Status |
|-----------|-------|--------|
| `phase2-rls.test.ts` | 38 | ✅ PASS |
| `phase2-auth.test.ts` | 21 | ✅ PASS |
| `phase2-database.test.ts` | 29 | ✅ PASS |
| `validation.test.ts` (Phase 1) | 30 | ✅ PASS |
| **Total** | **118** | ✅ **ALL PASS** |

---

## 14. Security Decisions

1. **Service role key**: Never accessible in browser context — `createServerClient()` throws if `window` is defined
2. **Default role**: New users are assigned INSPECTOR (least privilege) via the `handle_new_auth_user` trigger
3. **Self-role-escalation**: Prevented by the `users_update_own_profile` RLS policy's `WITH CHECK` clause
4. **Audit log immutability**: Enforced at PostgreSQL level — no UPDATE/DELETE policies on `audit_logs`
5. **Evidence sha256**: Immutable intent documented; full immutability enforcement deferred to Phase 13 (chain-of-custody) where trigger-based immutability for the sha256 column will be added
6. **Rule activation gate**: Double-enforced: DB CHECK constraint (migration 007) + application-layer `policyCanActivateRule()` function
7. **Storage access**: All 3 buckets are private; no permanent public URLs; signed URL pattern documented

---

## 15. Known Limitations & Deferred Items

| Item | Deferred to |
|------|-------------|
| Mobile app screens and camera capture | Phase 3 |
| Web dashboard and supervisor review UI | Phase 4 |
| SHA-256 immutability trigger on `evidence.sha256` | Phase 13 |
| Team/zone scoping for SUPERVISOR inspection visibility | Phase 3 |
| Email for users (stored in `auth.users`, not `public.users`) — must be merged at service layer | Phase 3/4 |
| Full signed URL generation utility | Phase 3 |
| `fileSizeBytes` on `inspection_images` (not stored in DB) | Phase 5 |
| Runtime RLS enforcement verification | `RLS_RUNTIME_VERIFICATION_REQUIRED` |
| `supabase db diff` schema drift CI check | Phase 17 QA |
| Live AI provider calls | Phase 6 (Gemini), Phase 7 (OpenAI) |
| Real Legal Metrology rule ingestion | Phase 9 (requires official PDF + legal review) |
| E-commerce listing analysis | Phase 12 |
| PDF report generation | Phase 14 |
| Offline sync | Phase 16 |

---

## 16. Migration Verification

**Status**: Migration SQL files are present and syntactically validated.

**RLS_RUNTIME_VERIFICATION_REQUIRED**: Full migration verification against a clean PostgreSQL/Supabase database requires:
```bash
supabase start           # Start local Supabase
supabase db reset        # Apply all migrations + seed from scratch
supabase db diff         # Verify schema matches migrations
# Then manually test RLS policies per the checklist in §7
```

This must be performed before Phase 3 begins if a live Supabase project is available.
