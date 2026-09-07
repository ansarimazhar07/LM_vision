# LM-Vision — Phase 3 Implementation Notes

**Phase:** 3 — Mobile Shell  
**Status:** Implemented as a functional Expo shell; production capture workflow deferred by scope.

## Architecture

`apps/mobile` is a React Native / Expo application with four deliberately
separate concerns:

- `AuthProvider` owns Supabase session restoration, auth state changes, sign-in,
  sign-out, and user-facing auth errors.
- `InspectionDraftProvider` owns the validated, versioned local draft object.
- `AppNavigator` owns auth route boundaries, bottom-tab navigation, and named
  future workflow routes.
- Screens and reusable primitives own presentation only.

The mobile app imports `@lm-vision/config/client` and the
`@lm-vision/supabase-client/browser` entry point. The service-role client and
server environment schema are not imported into the mobile source tree.

## Navigation

Unauthenticated users see `Login`. A loading session shows a loading state. An
authenticated user sees the Home, New Inspection, History, and Profile tabs.
The following named stack routes are explicit placeholders for later work:
Smart Scan, Camera Capture, Image Review, Calibration, AI Processing, Findings,
Evidence, Inspector Decision, E-commerce, and Report.

## Authentication integration

The existing Supabase Auth adapter is used for `getSession`, auth state change
subscriptions, password sign-in, and sign-out. The app creates one browser-safe
client with the public anon key and relies on Supabase RLS. Provider errors are
mapped to readable generic messages and raw provider details are not displayed.
The profile shell displays the Supabase email and approved metadata name; role
assignment remains server/database-owned.

## Screens and UI foundation

Implemented screens are Login, Home, New Inspection, Inspection History, and
Profile. Shared `Screen`, `Surface`, `Button`, `Field`, and `StateView`
primitives provide large touch targets, spacing, and loading/error/empty/success
state presentation. The New Inspection screen validates source, category, and
package metadata, then creates an in-memory local draft and opens the Smart Scan
placeholder.

## Dependencies and decisions

Expo SDK 53, React Native, React Navigation native stack/bottom tabs,
safe-area context, and the Supabase URL polyfill are included. Durable storage
and full offline sync are explicitly outside this phase. The local draft
provider is therefore a clean extension point rather than a partial sync queue.

## Testing and verification

`tests/phase3-mobile.test.ts` covers route guards, authenticated and
unauthenticated boundaries, future route declarations, auth subscription
changes, draft validation/versioning, public-only config, and shared schema
imports. Existing Phase 1/2 tests remain unchanged.

The final implementation report records the exact results of typecheck, tests,
build, Expo configuration validation, and Graphify regeneration.

Verified in this workspace: `npm install` completed; `npm run typecheck` passed;
`npm test` passed with 5 files and 127 tests; `npm run build` passed for every
workspace; `npx expo config --type public` passed; and `npx expo-doctor` passed
all 18 checks. A direct mobile source/dist scan found no server-only imports.
The Graphify CLI was unavailable, so `graphify-out/GRAPH_REPORT.md` contains a
manual post-implementation relationship update and explicitly records that a
full regeneration remains an environment task.

## Known limitations

There is no camera capture, image upload, OCR/CV, AI processing, legal rule
execution, evidence pipeline, report generation, backend inspection creation,
durable offline queue, or full server-backed history in this phase. The Expo
configuration uses placeholder defaults inherited from the public config schema;
deployments must provide real `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` values.
