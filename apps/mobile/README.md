# @lm-vision/mobile

Phase 3 provides the field-oriented React Native / Expo shell for LM-Vision.

Run it from the repository root with `npm run start --workspace @lm-vision/mobile`.
Set only `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and other
`EXPO_PUBLIC_*` client values in the Expo environment. The mobile app imports
`@lm-vision/config/client` and `@lm-vision/supabase-client/browser`; it never
imports the server config or service-role client.

Implemented: session restoration/sign-in/sign-out, authenticated route guard,
Home, New Inspection draft entry, History, Profile, loading/error/empty states,
shared design tokens, large touch targets, and explicit placeholder routes for
the later capture/analysis/review workflow.

The draft store is intentionally in-memory in this phase. Camera capture,
uploads, OCR/CV, AI, legal rules, reports, and full offline sync are deferred.
