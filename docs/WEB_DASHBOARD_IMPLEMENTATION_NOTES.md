# LM-Vision Web Dashboard MVP

## Architecture

`apps/web` is a Vite single-page browser dashboard. It calls only the shared
`@lm-vision/supabase-client/browser` factory, which creates an authenticated
Supabase client with the public anon key. It does not create a second
inspection store or call the AI service. The mobile application remains
unchanged.

The dashboard reads the shared `inspections`, `inspection_images`,
`ai_analyses`, `declarations`, `compliance_assessments`, `inspector_reviews`,
`evidence`, `inspector_decisions`, `inspection_amendments`, `reports`,
`audit_logs`, `rules`, and `rule_versions` records. The inspection list is
server-paginated (`range` with a default size of 25); detail data is fetched
only after an inspection is opened.

## Authentication and roles

Sign-in, session persistence, sign-out, and password-reset requests use
Supabase Auth in the browser. The application reads the user profile/role from
the existing `users` and `roles` tables. Navigation hides the audit trail and
inspector directory where the UI role does not allow them, but this is only a
convenience: PostgreSQL RLS is the authorization boundary and is never bypassed.

## Dashboard and refresh

The dashboard computes its metrics from Supabase count queries; values are not
hard-coded. Every main data screen has a Refresh control that refetches data
without a page reload, then updates `Last updated`. Failed refreshes present an
explicit error rather than claiming freshness. Optional polling is off by
default and can be set to 30 seconds, 60 seconds, or five minutes. It preserves
the current route and uses no Realtime dependency.

## Command center and review detail

The inspection command center provides search, persisted status/sync/result
filters, dates, pagination, and horizontal table scrolling. The detail screen
keeps three distinct concepts visible:

- **AI observation** is provider/model/status/confidence information only.
- **Deterministic rule engine** shows persisted assessment source, page,
  version, result, observed/expected values, evidence references, and time.
- **Inspector final decision** is the persisted decision record, not a client
  calculation.

Inspector corrections are displayed alongside the original observed value.
They are not written back into AI observations.

## Evidence, reports, rules, audit, sync, and analytics

Evidence is accessed through short-lived Supabase Storage signed URLs on user
action. The original object is never transformed. Metadata and hash are shown;
heatmap regions are deliberately not fabricated when coordinates are absent.

Reports are listed from persisted report records, can be opened using a signed
URL, and expose their sealed hash. The dashboard does not regenerate reports.
The rule library reads existing rule and rule-version metadata and labels
`LM-IN-RULES-2026.09` as an LM-Vision software bundle, not a government version.
Audit is read-only. The sync monitor observes shared mobile sync states. Its
retry prompt directs users to the originating mobile durable queue rather than
creating receipt mutations in the dashboard. Analytics visualize persisted
operational counts and explicitly avoid labeling a rate as legal compliance.

## Security and RLS

Only `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (or equivalent existing
`NEXT_PUBLIC_*` names) are accepted by the browser. `SUPABASE_SERVICE_ROLE_KEY`,
`GEMINI_API_KEY`, and all other server credentials are absent from the web
source. There is no Gemini SDK in `apps/web`. No frontend rule evaluation,
assessment mutation, final-decision mutation, or RLS bypass is implemented.

## Mobile to web flow

The mobile app writes/synchronizes to Supabase through its established durable
queue. Once synced, the authenticated dashboard's next manual refresh reads the
same record. The UI does not rely on Realtime and does not perform duplicate
inserts; it only reads rows already authorized by RLS.

## Known limitations

- A live Supabase project and mobile runtime were not configured in this
  workspace, so live mobile → Supabase → browser verification must be completed
  after client-safe environment variables are supplied.
- RLS determines which user names and audit records can be resolved. The UI
  displays `Restricted` or an empty state when a relationship is intentionally
  unavailable.
- Region overlays render only when an upstream coordinate schema is persisted;
  this MVP reports their absence honestly rather than inferring them.
