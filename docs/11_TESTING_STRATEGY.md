# LM-Vision — Testing Strategy

## 1. Test Pyramid

```text
                 E2E / Browser
               /               \
          Integration / API / Sync
           /        AI/CV         \
       Unit / Rule / Schema / UI
```

## 2. Test Matrix

| # | Area | Positive | Negative | Key assertion |
|---:|---|---|---|---|
| 1 | Authentication | Valid session | Expired/invalid session | Protected routes reject unauthenticated requests |
| 2 | Image upload | Valid JPEG/PNG | Bad MIME/oversize/corrupt | Safe validation + hash |
| 3 | OCR | Clear label | Blur/glare/partial | Confidence + region provenance |
| 4 | AI extraction | Correct structured fields | Missing/conflicting fields | Canonical schema validates |
| 5 | AI failure | Provider success | Timeout/5xx | Fallback/retry/manual review |
| 6 | AI disagreement | Same values | Different critical values | `CONFLICT` + manual review |
| 7 | Rule applicability | Applicable rule | Non-applicable case | Rule skipped cleanly |
| 8 | Mandatory declarations | Fixture with field | Fixture without field | Correct deterministic result |
| 9 | Typography | Known synthetic measurement | Below/uncertain measurement | Result preserves estimate/confidence |
| 10 | Placement | Expected region | Wrong/unknown region | Correct status |
| 11 | Contrast | High contrast fixture | Low/uncertain contrast | Measurement method retained |
| 12 | Calibration | Known reference | Missing/wrong reference | Low confidence routes review |
| 13 | E-commerce | Valid screenshot/URL | Unavailable listing | Graceful failure |
| 14 | Cross-source mismatch | Equal values | Different values | Mismatch evidence created |
| 15 | Human verification | Confirm finding | Reject/edit | Decision audited |
| 16 | Evidence | Stored/hash match | Hash mismatch/object missing | Integrity error surfaced |
| 17 | PDF | Complete case | Missing required metadata | Generation blocks or marks incomplete |
| 18 | Search | Exact/filter query | No results | Correct pagination/empty state |
| 19 | History | Complete timeline | Permission boundary | No unauthorized records |
| 20 | RBAC | Allowed action | Disallowed action | API + RLS deny |
| 21 | Offline | Capture offline | Storage full/error | User state preserved |
| 22 | Sync | Clean queue | Conflict/network drop | Retry + conflict path |
| 23 | Audit logs | Logged event | Privileged mutation without audit | Audit invariant fails test |

## 3. Legal Rule Test Requirements

Every activated source-backed rule requires at minimum:

- positive case;
- negative case;
- applicability case;
- exception/proviso case where relevant;
- missing-evidence case;
- regression fixture pinned to rule version.

The test suite must assert the exact source metadata attached to the executed rule.

## 4. AI Schema Tests

- provider output accepts valid canonical payload;
- invalid provider payload is rejected;
- unknown fields do not break compatibility where intended;
- required evidence refs exist for declarations;
- confidence range is enforced;
- provider/model metadata is present.

## 5. CV Tests

Use a curated fixture set spanning:

- high/low light;
- reflective packaging;
- curved packages;
- skewed labels;
- small text;
- multilingual samples;
- partial occlusion;
- controlled calibration scenes.

Track measurement error distributions rather than only pass/fail.

## 6. Security Tests

- RBAC bypass tests;
- RLS policy tests;
- unauthorized storage access tests;
- malformed upload tests;
- rate-limit tests;
- secret scanning;
- injection tests on URL/text/listing fields;
- prompt-injection fixtures confirming model output cannot activate rules.

## 7. Performance Tests

Measure p50/p95/p99 where meaningful for:

- image upload;
- OCR;
- AI analysis;
- rule execution;
- report generation;
- case search;
- offline sync.

## 8. Demo Reliability Tests

The SIH flagship scenario must run with all external AI providers disabled by switching to `MockProvider`. This is an explicit release gate.
