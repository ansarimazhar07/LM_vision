# LM-Vision UI/UX Polish & Field Stability Notes

## Scope

This stabilization pass covers the mobile UI, responsive behavior, accessibility, camera lifecycle, and presentation of workflow and Phase 11 synchronization state. It does not add an AI provider, change Gemini architecture, alter the Legal Metrology rule engine, or modify authoritative legal data.

## Graphify context reviewed

The current Graphify report and graph were reviewed before editing. The mobile graph is centered on `useInspectionWorkflow()`, `Screen`, `Surface`, `Button`, `GeminiProvider`, and `RootStackParamList`. Camera capture, navigation, persistence, and AI adapters remain separate boundaries. The pre-change report showed no import cycles.

## UI audit findings

- The shared shell used a single large padding value but did not provide a consistent hierarchy or semantic spacing tokens.
- Camera torch cleanup was mounted-only, which is insufficient when native-stack navigation keeps a route mounted.
- Camera controls used fixed top spacing and did not account for safe-area insets.
- Several workflow screens nested a second `ScrollView` inside `Screen`, which could produce clipped or unreliable scrolling.
- Long finding, declaration, badge, and button text had insufficient shrink/wrap behavior.
- Demo/provider presentation was duplicated and in some screens was shown regardless of the selected analysis mode.
- Processing intervals and delayed navigation were not cleared when the screen left the workflow.

## Design system changes

The existing `@lm-vision/ui` token package was extended with restrained ink, background, surface, border, spacing, and radius tokens. Mobile primitives now use the shared values:

- `Screen` / `Surface`: consistent field-workspace background, surface border, modest elevation, spacing, and keyboard inset adjustment.
- `Button`: 52dp minimum target, disabled/loading semantics, two-line-safe labels, and consistent press feedback.
- `Badge`: bounded width, line height, and shrink-safe text.
- `WorkflowProgress`: reusable Capture → Analyze → Assess → Review → Decision → Report indicator.
- `ProviderBadge`: explicit GEMINI, HYBRID, LOCAL OCR / OFFLINE, and DEMO / MOCK labels.

## Camera lifecycle and torch fix

`useCameraLifecycle` uses navigation focus/blur and app-state changes. Focus begins with torch off; blur, unmount, background/inactive app state, and capture completion reset torch and capture state. The camera back action is labeled and communicates that torch cleanup occurs. Camera controls remain outside `CameraView`, and the overlay accounts for safe-area insets.

Capture and gallery errors now produce user-readable recovery messages. Permission denial exposes a system-settings path while retaining gallery fallback.

## Text overflow and responsive behavior

The review, declarations, and findings screens no longer nest their own scroll views inside `Screen`. Variable text is allowed to wrap; declaration headers and assessment badges can wrap; buttons and badges shrink safely; finding descriptions no longer truncate to three lines; and row footers use wrapping rather than assuming a wide screen.

## Screens updated

- Home: dynamic active/pending/completed metrics, provider mode, local storage state, and active-draft continuation.
- New Inspection: retains canonical source/category/package selections and uses the shared shell.
- Camera / Image Review: lifecycle-safe torch, safe-area overlay, clear capture progress, accessibility labels, and safe evidence review layout.
- Processing: provider identity, workflow indicator, stage labels without premature checkmarks, readable fallback/error states, and timer cleanup.
- Declarations / Findings: provider-aware labeling, workflow context, evidence-first copy, and wrapping-safe cards.
- History: dynamic decision badges and explicit sync state.
- Profile: inspector identity, connection model, AI mode, rule bundle, environment, and app version without secrets.
- Review/decision/detail/report surfaces continue to consume existing workflow state; this pass does not introduce domain models or legal semantics.

## Accessibility

Camera controls expose labels, hints, and checked/disabled state. Existing radio/checkbox controls retain semantic roles. Shared buttons expose disabled/loading state, and status meaning is communicated through text in addition to color.

## Loading, error, empty, and offline presentation

The existing `StateView` remains the common boundary for loading/error/empty content. Camera and processing now use actionable, domain-readable error copy. Provider badges explicitly distinguish real Gemini, hybrid, offline/local, and demo/mock modes. No UI claims Gemini is active when the fallback path is local.

## Tests

Added `tests/phase-ui-polish.test.ts` for camera reset conditions, provider labels, dynamic review progress, dynamic summary counts, sync state, secret-field display guards, and long multilingual text data. These are contract/unit checks; they do not replace device or screenshot testing.

## Verification status

- Baseline typecheck: passed.
- Post-change shared UI build and mobile typecheck: passed.
- Full test suite: passed — 14 files, 321 passed, 1 skipped (322 total).
- Full build: passed across all workspaces.
- Android bundle export: passed with `npx expo export --platform android`; output generated in `apps/mobile/dist`.
- Expo Doctor: blocked because the separate `expo-doctor` package is not installed and registry access was denied; the local Expo CLI directed this command to `npx expo-doctor`.
- Real-device QA: not performed in this environment; `adb` is not installed/available and no connected Android device could be discovered. It must be completed before release claims.
- Screenshot QA at small/large font sizes: not performed in this environment.
- Post-change Graphify regeneration: Graphify executable is not available in the workspace; the existing pre-change report was re-inspected for the same navigation/camera/workflow boundaries, but a regenerated report cannot be claimed.

## Known limitations

Connectivity is still represented from existing local/cloud workflow state; there is no new network-monitoring subsystem in this UI-only pass. Evidence zoom/pan and report rendering remain on the existing implementations. Native camera behavior, permission transitions, large-font rendering, and offline airplane-mode workflow require physical-device verification.

Phase 11 follow-up: Home, History, Profile, and Inspection Details now expose explicit offline, syncing, failed, and conflict states. Conflict detail copy makes the no-silent-overwrite behavior clear and offers a retry action. The synchronization architecture and verification boundary are documented in `docs/PHASE_11_OFFLINE_SYNC_IMPLEMENTATION_NOTES.md`.

## Follow-up screenshot fixes

- Mobile review and result cards now wrap section badges, long rule citations, metadata values, and evidence labels instead of clipping or leaking outside their containers.
- The server PDF renderer now emits an ASCII-safe, concise inspection record with only operationally useful details: inspection metadata, product identity, inspector decision, mandatory declarations, authoritative compliance findings, evidence provenance, and record hashes.
- PDF tables and cards measure content before drawing, wrap long observations and hashes, repeat table headers after page breaks, and include a stable page footer. The previous oversized title, garbled lock glyph, redundant forensic appendix, and decorative cryptographic-seal copy were removed.
- A long-content PDF was rendered and visually inspected after the changes; the representative report is two pages with no visible text overflow. Real-device and small-font screenshot QA remain pending because Android tooling/device access is unavailable in this environment.
