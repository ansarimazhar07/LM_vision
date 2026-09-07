# LM-Vision Phase 11 — Offline/Online Synchronization Notes

## Scope

This phase adds a local-first synchronization boundary for inspection drafts, evidence uploads, derived observations, inspector review data, decisions, amendments, and audit events. The legal rule engine and finalization protections remain unchanged. The implementation is deliberately honest about its verification boundary: transport behavior is covered with deterministic unit tests and mocked Supabase calls, while physical-device, airplane-mode, background-task, and deployed-cloud validation still require an environment with those capabilities.

## Architecture

The mobile workflow now has four durable layers:

1. `InspectionStorageService` persists the complete local draft before any network work.
2. `DurableSyncQueue` stores dependency-ordered operations in AsyncStorage, validates them on read, deduplicates by deterministic idempotency key, and preserves malformed queue data for diagnosis.
3. `SyncManager` processes operations only when an authenticated Supabase session is available, retries transient failures with bounded exponential backoff, refreshes expired sessions once, and stops on authorization, validation, finalization, or conflict errors.
4. `sync_operation_receipts` provides a server-side idempotency receipt keyed by the client operation key. Entity writes use stable IDs and receipts are written only after the entity operation completes.

The dependency order is inspection → image upload → image metadata → AI analysis → declarations/findings/assessments → reviews/evidence → decision → audit events → finalization → amendments. Image binaries are uploaded to the private `inspection-images` bucket before their metadata is written.

## Local and remote state

Drafts expose `LOCAL_ONLY`, `PENDING_SYNC`, `SYNCING`, `SYNCED`, `SYNC_CONFLICT`, and `SYNC_FAILED`. Images separately expose upload states so an inspection can remain usable while one binary is pending or failed. History retains the local draft as the field UI source of truth; remote timestamps refresh metadata without duplicating a record or replacing unsynchronized work.

Inspection payloads preserve mobile-only product context in `location_metadata` until a dedicated product catalog linkage is available. No access tokens, refresh tokens, API keys, passwords, or authorization headers are written to the queue.

## Conflict behavior

The first upload does not conflict merely because server clock time is later than a local timestamp. A content conflict is raised only when a known remote timestamp exists, the local draft changed after that timestamp, and the remote record also changed after it. Finalization conflicts remain protected by the database lock and are surfaced as review-required state. The UI says that no version was silently overwritten and offers an explicit retry path.

There is no automatic last-write-wins merge for statutory inspection records. A future resolution workflow can add a supervisor-approved amendment after the inspector compares the local and server snapshots.

## Lifecycle triggers

Synchronization is attempted on provider mount, app foreground/resume, after local saves, after decisions, after finalization, and after amendments. Work remains queued when offline or unauthenticated. This implementation does not claim OS background sync or guaranteed execution after process termination; those require a native task scheduler and device verification.

## Verification

- Phase 11 suite: 30 tests passed.
- Full suite after Phase 11: 15 files, 351 passed, 1 skipped (352 total).
- Mobile TypeScript typecheck: passed.
- The tests cover queue persistence/corruption recovery, credential stripping, idempotency, ordering, retry bounds, offline retention, mocked receipts, conflict detection, terminal failures, concurrency, and migration/RLS markers.
- Real Supabase deployment, storage policies, Android background behavior, network transitions, and device screenshots remain unverified in this workspace.
