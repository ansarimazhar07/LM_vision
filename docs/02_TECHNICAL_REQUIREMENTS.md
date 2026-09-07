# LM-Vision — Technical Requirements

## 1. System Goals

1. Provide one canonical inspection domain model shared by mobile, web, AI/CV, rules, evidence, and reporting.
2. Separate evidence interpretation from legal validation.
3. Keep AI providers replaceable.
4. Make rules deterministic, versioned, testable, and source-traceable.
5. Support intermittent connectivity without pretending full AI offline capability.
6. Make the SIH prototype demoable with `MockProvider` even when external providers are unavailable.

## 2. System Constraints

- Do not place provider SDK calls directly in mobile UI code.
- Do not allow LLM response text to become executable legal logic.
- Do not activate an unapproved rule version.
- Do not delete evidence silently; preserve audit/event history.
- Do not infer physical measurements without storing calibration assumptions.
- Do not use a single AI provider as a hidden hard dependency for the flagship demo.

## 3. Recommended Technology Stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo + TypeScript |
| Web | Next.js + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Next.js API routes/server actions for ordinary app APIs; FastAPI service where Python CV/OCR workloads justify it |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| Authentication | Supabase Auth |
| AI | Provider abstraction supporting Gemini and OpenAI |
| OCR | PaddleOCR |
| Computer vision | OpenCV |
| Validation | Zod + typed shared schemas |
| Charts | Recharts |
| Reports | PDF generation service/library behind a report interface |
| Testing | Vitest/Jest, Pytest, Playwright, React Native testing tools as appropriate |

## 4. Monorepo Architecture

```text
apps/
  mobile/                  # React Native field app
  web/                     # Next.js command center
services/
  ai-engine/               # Python CV/OCR + provider orchestration when needed
packages/
  shared-types/            # Canonical TypeScript contracts
  validation/              # Zod schemas and validation helpers
  rules/                   # Rule data, engine, versioned fixtures, tests
  ui/                      # Shared design primitives where useful
  config/                  # Shared lint, TS, environment/config helpers
a supabase/                # SQL migrations, RLS policies, seed/config
docs/                      # Product + architecture specification
tests/                     # Cross-system fixtures/e2e assets
```

### Responsibilities

- `apps/mobile`: user workflow, local inspection state, camera, queue/sync UI.
- `apps/web`: operational dashboard, review, reports, rule/admin screens.
- `services/ai-engine`: OCR/CV and provider orchestration; owns no legal decision authority.
- `packages/shared-types`: canonical DTOs/interfaces; no UI or provider-specific logic.
- `packages/validation`: request/response validation and schema guards.
- `packages/rules`: deterministic engine + source-backed rule data + unit tests.
- `packages/ui`: reusable components that do not encode legal semantics.
- `supabase`: migrations/RLS/functions/storage policy definitions.
- `tests`: curated images, golden extraction fixtures, integration scenarios.

## 5. System Architecture

Logical components:

`Mobile Inspector App + Web Command Center + Shared Backend + AI Gateway + OCR/CV Engine + Rule Engine + Evidence Store + Database + Reporting`

The backend is the domain boundary. Clients do not directly execute rule logic or access unrestricted storage objects.

## 6. High-Level Data Flow

`Package Image → preprocessing → AI/OCR → structured evidence → normalization → rule applicability → rule engine → content validation → visual validation → cross-source validation → findings → evidence → human verification → report → repository`

## 7. AI Architecture

### Provider abstraction

```ts
export interface AIProvider {
  analyzePackage(input: PackageAnalysisInput): Promise<PackageAnalysis>;
  analyzeListing(input: ListingAnalysisInput): Promise<ListingAnalysis>;
  explainFinding(input: FindingExplanationInput): Promise<FindingExplanation>;
  providerName(): string;
  modelName(): string;
}

export class GeminiProvider implements AIProvider { /* adapter boundary */ }
export class OpenAIProvider implements AIProvider { /* adapter boundary */ }
export class MockProvider implements AIProvider { /* deterministic demo fixtures */ }
```

All implementations return the same canonical schema.

### Canonical AI objects

- `PackageAnalysis`
- `Declaration`
- `TextRegion`
- `ImageQuality`
- `VisualMeasurement`
- `ListingAnalysis`
- `FindingExplanation`

### Example canonical result

```json
{
  "schemaVersion": "1.0",
  "provider": "MockProvider",
  "model": "mock-lmvision-v1",
  "confidence": 0.94,
  "declarations": [
    {
      "field": "mrp",
      "value": "249",
      "normalizedValue": 249,
      "unit": "INR",
      "confidence": 0.98,
      "evidenceIds": ["ev-001"]
    }
  ],
  "uncertainties": []
}
```

## 8. AI Safety Architecture

AI may extract, classify, interpret image evidence, summarize, and explain.

AI may not invent rules, activate regulations, make final enforcement decisions, or override inspector decisions.

## 9. AI Consensus

`Image → Gemini + OpenAI → Consensus Engine → confidence/conflict → Rule Engine`

When model outputs materially disagree on a critical field:

```text
status = CONFLICT
humanReviewRequired = true
ruleExecution = blocked for that dependent check unless the inspector resolves the field
```

Consensus should operate on structured fields and confidence, not free-form textual agreement.

## 10. Computer Vision Architecture

Modules:

1. preprocessing
2. quality assessment
3. perspective correction
4. text detection
5. bounding boxes
6. contrast analysis
7. geometry
8. spacing
9. calibration
10. typography estimation

CV outputs are measurements/signals and do not become legal findings until the rule engine evaluates them.

## 11. Physical Calibration

Reference-object workflow:

`Known physical size → pixel measurement → mm/pixel → estimated character height → threshold comparison → confidence → manual review if uncertain`

Store:

```json
{
  "referenceObject": {"type": "KNOWN_SIZE_REFERENCE", "knownMm": 85},
  "pixelSpan": 420,
  "mmPerPixel": 0.20238,
  "estimatedCharacterHeightMm": 1.82,
  "confidence": 0.81,
  "isEstimated": true,
  "verificationStatus": "UNVERIFIED"
}
```

Always describe the value as an **estimated measurement** unless an inspector verifies it.

## 12. Legal Rule Engine

Input:

- product classification
- package type
- quantity
- other applicable attributes

Process:

`applicability → applicable rules → validation → finding`

Rule fields:

```ts
interface RuleDefinition {
  ruleId: string;
  ruleNumber: string;
  subRule?: string;
  title: string;
  description: string;
  condition: unknown;
  applicability: unknown;
  exceptions?: unknown;
  validationType: string;
  threshold?: unknown;
  effectiveFrom: string;
  effectiveTo?: string;
  severity: string;
  source: { document: string; page?: string; reference?: string };
}
```

## 13. Rule Versioning

Fields:

`ruleVersionId, effectiveDate, supersededDate, source, status, approvedBy, approvedAt`

Workflow:

`AI proposal → human/legal review → approval → activation`

Lifecycle:

`DRAFT → REVIEW → APPROVED → ACTIVE → SUPERSEDED | RETIRED`

## 14. Canonical Data Model

Core entities:

`User, Role, Product, Manufacturer, Inspection, InspectionImage, AIAnalysis, Declaration, Rule, RuleVersion, Finding, Evidence, InspectorDecision, EcommerceListing, CrossSourceComparison, Report, AuditLog`

## 15. Database Schema Requirements

Every table must specify:

- columns and types
- primary key
- foreign keys
- indexes
- constraints
- timestamps
- soft-delete/archive policy where appropriate
- tenant/organizational access boundary if introduced later

A concrete schema is defined in `04_DATABASE_DESIGN.md`.

## 16. API Architecture

API groups:

`/auth, /inspections, /products, /images, /ai, /rules, /findings, /evidence, /ecommerce, /reports, /manufacturers, /analytics, /audit`

Every endpoint must define method, URL, purpose, authentication, request, response, and errors. Full definitions are in `07_API_SPECIFICATION.md`.

## 17. Security

Required controls:

- RBAC
- Row Level Security
- secure storage
- signed file URLs
- API-key protection
- input validation
- rate limiting
- audit logging
- evidence integrity
- SHA-256 hashing
- secure environment variables
- least privilege

## 18. Mobile Architecture

Navigation, camera, uploads, offline cache, local inspection state, sync, notifications, permissions, and error handling are specified in `09_MOBILE_APP_SPEC.md`.

## 19. Web Architecture

Dashboard, inspection management, analytics, rule management, reporting, audit logs, and administration are specified in `10_WEB_APP_SPEC.md`.

## 20. Offline Architecture

MVP supports:

`capture offline → local encrypted/OS-protected storage → queue upload → sync → conflict resolution → retry`

Do not attempt to make every AI function fully offline in MVP. Rule evaluation can be made locally available only for a validated, version-pinned subset if the product design explicitly enables that path; otherwise queue server execution.

## 21. Reporting Architecture

PDF must include:

- inspection ID
- date/time
- inspector
- product
- manufacturer
- images
- findings
- rule references
- evidence
- AI confidence
- inspector decision
- comments
- audit metadata

## 22. Observability

Capture structured telemetry for:

- logs
- errors
- AI latency
- OCR latency
- rule execution
- API failures
- inspection failures
- sync failures

Every request should carry a correlation ID tied to the inspection/job when applicable.

## 23. Testing

Required suites:

`unit, integration, API, AI schema, rule, CV, mobile, web, end-to-end, browser, security`

Every source-backed rule must have positive and negative fixtures.

## 24. Deployment

Recommended prototype topology:

- Next.js web + API for general application boundary.
- Supabase managed PostgreSQL/Auth/Storage.
- Python AI/CV service deployed separately only where PaddleOCR/OpenCV workloads justify it.
- Background worker/job mechanism for long-running AI/CV/report tasks.
- Secrets held in deployment secret manager/environment configuration, never in client bundles.

## 25. Cost Control

- provider abstraction
- image compression
- crop-before-AI
- caching of safe/repeatable analyses
- model fallback
- mock mode
- request limits

## 26. Scalability

The SIH prototype should remain a modular monolith at the domain level. Extract services only when there is a demonstrated scaling or runtime-isolation reason: AI/CV workers, asynchronous report generation, and high-volume ingestion are the first likely candidates.
