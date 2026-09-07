from pathlib import Path
root=Path('/mnt/data/LM-Vision/docs')

def w(name, text):
    (root/name).write_text(text.strip()+"\n", encoding='utf-8')

w('01_PRODUCT_REQUIREMENTS.md', r'''# LM-Vision — Product Requirements Document

**Project:** AI-Assisted Legal Metrology Inspection & Compliance Platform  
**SIH Problem Statement:** 26034  
**Document status:** Architecture baseline / implementation-ready product requirements  
**Authority boundary:** The official *Legal Metrology (Packaged Commodities) Rules, 2011* PDF supplied for the project is the authoritative legal source. Any rule mapping not backed by that PDF is deliberately marked `SOURCE_REQUIRED`.

## 1. Executive Summary

LM-Vision is a mobile-first field inspection platform and web command center for Legal Metrology enforcement workflows involving packaged commodities. It converts package photographs and e-commerce listing evidence into structured, traceable inspection assessments using OCR, computer vision, multimodal AI, a deterministic rule engine, evidence management, and human verification.

The product addresses a manual workflow in which an officer must capture a package, read declarations, interpret the applicable provisions, inspect visual presentation, record findings, collect evidence, prepare a report, and later retrieve the case history. LM-Vision reduces repetitive work without transferring legal authority from the inspector to an AI system.

**Primary users:** Inspector, Supervisor, Administrator, Auditor.  
**Core value proposition:** faster evidence-backed inspections with consistent processing, explainable machine assistance, versioned rules, and an auditable chain from source image to inspector decision.

### Product outcome

Every inspection produces one canonical inspection object containing:

- captured evidence and integrity metadata;
- extracted declarations and their confidence/provenance;
- applicable rule references and rule-version identifiers;
- deterministic validation results;
- findings and supporting evidence;
- explicit human verification and final inspector decision;
- generated report and immutable audit trail.

## 2. Problem Definition

### Current manual process

`Product → Photograph → Read declarations → Interpret rules → Inspect formatting → Record violation → Prepare report → Maintain history`

### Current limitations

| Limitation | Product implication |
|---|---|
| Time-consuming | Inspection cycle is slowed by repeated reading and recording. |
| Repetitive | Officers repeatedly inspect similar declarations and visual attributes. |
| Difficult to scale | More inspection volume requires proportionally more manual effort. |
| Inconsistent | Human interpretation and evidence capture can vary between officers. |
| Difficult evidence management | Images, notes, findings, and sources may become disconnected. |
| Difficult history retrieval | Prior cases are hard to search across product/manufacturer dimensions. |

LM-Vision is designed as decision support. It must never represent AI screening as legal certification and must not use AI alone to label a package “legally compliant” or “illegal.”

## 3. Target Users

| Role | Goals | Permissions | Common workflows | Responsibilities |
|---|---|---|---|---|
| Inspector | Complete accurate field inspections quickly | Assigned inspections, evidence, findings, decisions, reports | New inspection, smart scan, e-commerce comparison, evidence capture | Capture facts, review system findings, make final inspection decision |
| Supervisor | Monitor teams and resolve escalations | Team cases, analytics, review queues, reports | Review flagged cases, inspect history, dashboards | Quality control, escalation, workload oversight |
| Administrator | Operate system and control configuration | User/RBAC, rule lifecycle, system settings | Rule update, user management, audit review | Approve configuration and activate approved rule versions |
| Auditor | Trace how decisions were produced | Read-only audit/evidence/report access | Case reconstruction, audit trail, report verification | Independently verify evidence and system activity |

## 4. Product Vision

> “An AI-assisted field and command platform that converts packaged commodity images and digital listings into structured, evidence-backed Legal Metrology inspection assessments.”

## 5. Product Principles

1. **Evidence first** — every finding points to observable evidence.
2. **AI-assisted, not AI-authoritative** — AI extracts/interprets; deterministic rules validate; inspectors decide.
3. **Explainability** — confidence, provenance, visual anchors, and rule references are visible.
4. **Deterministic validation** — legal logic is versioned executable data/code, not free-form model output.
5. **Human-in-the-loop** — conflicts, low confidence, and legal decisions require review.
6. **Mobile-first field workflow** — capture and review must be practical with one hand and intermittent connectivity.
7. **Secure evidence storage** — evidence is access controlled, hashed, and retained according to policy.
8. **Auditability** — important transitions and edits are attributable.
9. **Versioned regulation** — every automated finding identifies the rule version used.
10. **Graceful degradation** — mock/fallback paths keep demos and controlled workflows operational.

## 6. Core User Journeys

### A. Physical package inspection

`Login → New Inspection → Select category → Capture package images → Image quality check → AI/OCR → Extract declarations → Determine applicable rules → Content validation → Visual validation → Findings → Evidence → Inspector decision → Report → Save history`

**Critical states:** `DRAFT`, `PROCESSING`, `REVIEW_REQUIRED`, `READY_FOR_DECISION`, `DECIDED`, `REPORT_GENERATED`, `SYNC_PENDING`, `SYNCED`, `ARCHIVED`.

### B. E-commerce inspection

`Open e-commerce module → URL / screenshot → Extract listing fields → Validate listing → Compare against package → Flag mismatch → Inspector review → Evidence → Report`

E-commerce data must remain clearly labeled as **digital listing evidence**, not physical-pack evidence.

### C. Previous inspection

`Search → Product/manufacturer → Inspection history → Open case → Evidence → Report`

### D. Rule update workflow

`Notification/document → AI proposes structured rule change → legal review → administrator approval → new rule version → activate`

No AI-generated rule is executable until a human/legal approval gate has changed its lifecycle state to `APPROVED` and then `ACTIVE`.

## 7. Functional Requirements

Priority: `P0=MUST`, `P1=SHOULD`, `P2=NICE`, `P3=FUTURE`.

| ID | Name | Description | User | Trigger | Input | Processing | Output | Acceptance criteria | Priority |
|---|---|---|---|---|---|---|---|---|---|
| FR-001 | Authentication | Secure sign-in/session lifecycle | All | Open app | Credentials/SSO token | Auth provider + session policy | Authenticated session | Unauthenticated users cannot access protected routes | P0 |
| FR-002 | RBAC | Enforce role-specific capabilities | All | Protected action | User + permission | Policy evaluation | Allow/deny | Server enforces permissions, not just UI | P0 |
| FR-003 | Smart Scan | Guided inspection entry point | Inspector | Start scan | Category/package type | Create inspection | Inspection draft | Inspector reaches capture state in bounded steps | P0 |
| FR-004 | Camera capture | Guided evidence capture | Inspector | Capture | Camera frames | Quality guidance | Images + metadata | Images retain source metadata and integrity hash | P0 |
| FR-005 | Multi-image capture | Capture multiple panels | Inspector | Add image | Front/back/side/top etc. | Associate images with inspection | Image set | Multiple images attach to one inspection without overwriting | P0 |
| FR-006 | Image quality | Detect blur/glare/low light/occlusion | Inspector | Image received | Image | CV quality scoring | Quality result | Low-quality images trigger retake/review guidance | P0 |
| FR-007 | OCR | Extract label text | Inspector | Processing | Image crops | OCR engine | Text + boxes + confidence | OCR output preserves page/image provenance | P0 |
| FR-008 | Declaration extraction | Convert text/evidence into fields | Inspector | OCR complete | OCR + images | AI structured extraction | Declarations | Every value has source evidence and confidence | P0 |
| FR-009 | Product classification | Classify commodity/package attributes | Inspector | Analysis | Declarations/images | AI classifier + schema validation | Classification | Low-confidence classification cannot silently drive rules | P0 |
| FR-010 | Rule applicability | Determine applicable configured rules | Inspector | Classification ready | Product attributes | Deterministic rule engine | Applicable rules | Only active, source-backed rules execute | P0 |
| FR-011 | Legal validation | Validate declarations against rules | Inspector | Rules resolved | Evidence + rules | Deterministic checks | PASS/WARNING/SUSPECTED_NON_COMPLIANCE/MANUAL_REVIEW | AI cannot override result | P0 |
| FR-012 | Typography analysis | Estimate text size/attributes | Inspector | Visual validation | Image + calibration | CV measurement | Measurement + confidence | Output labeled estimated until verified | P1 |
| FR-013 | Placement analysis | Analyze region positioning | Inspector | Visual validation | Image/text boxes | CV geometry | Placement result | Evidence includes visual region | P1 |
| FR-014 | Readability analysis | Analyze visibility/readability signals | Inspector | Visual validation | Image | CV/AI assist | Readability signal | Uncertain cases route to review | P1 |
| FR-015 | Contrast analysis | Estimate text/background contrast | Inspector | Visual validation | Image/text boxes | CV | Contrast measurement | Method and confidence are stored | P1 |
| FR-016 | Calibration | Estimate physical scale | Inspector | Before measurement | Reference object | Pixel-to-mm calculation | Scale estimate | Scale includes calibration confidence | P1 |
| FR-017 | E-commerce analysis | Analyze digital listing | Inspector | URL/image provided | URL/screenshot | Extraction + validation | Listing record | Source and retrieval time retained | P1 |
| FR-018 | Cross-source comparison | Compare package/listing | Inspector | Both sources available | Physical + listing data | Deterministic diff | Mismatch findings | Conflicting values are highlighted | P1 |
| FR-019 | Evidence management | Store and link evidence | Inspector | Evidence created | Media/text | Hash + metadata | Evidence objects | Every finding can reference one or more evidence objects | P0 |
| FR-020 | Human verification | Resolve machine uncertainty | Inspector/Supervisor | Review required | Analysis/finding | Confirm/edit/reject | Verification record | Actor/time/reason are audited | P0 |
| FR-021 | Repository | Search inspections | Supervisor/Auditor | Search | Filters/query | Indexed search | Cases | Search supports product/manufacturer/ID/date/status | P0 |
| FR-022 | History | Case timeline | All permitted | Open case | Inspection ID | Fetch linked artifacts | Timeline | No hidden destructive updates | P0 |
| FR-023 | Manufacturer analytics | Aggregate patterns | Supervisor | Dashboard load | Cases/manufacturers | Aggregation | Metrics | Aggregates respect access controls | P1 |
| FR-024 | Risk intelligence | Prioritize attention | Supervisor | Dashboard load | Historical signals | Explainable scoring | Risk indicators | Scores show inputs and do not replace legal findings | P1 |
| FR-025 | Report generation | Generate case report | Inspector/Supervisor | Generate | Inspection state | PDF/HTML | Report | Report contains source/rule/evidence metadata | P0 |
| FR-026 | Audit logs | Record sensitive actions | Admin/Auditor | Mutating/security event | Event metadata | Append audit | Audit entry | Logs are append-only from application perspective | P0 |

## 8. Legal Requirement Mapping

The requested legal areas are represented as **mapping targets**, not asserted rules, until the authoritative Rules PDF is ingested.

| Mapping target | Required evidence from Rules PDF | Software capability |
|---|---|---|
| Applicability | Exact rule/sub-rule + scope/exceptions | Rule applicability engine |
| Mandatory declarations | Exact declaration provision | Declaration + rule validation |
| Manufacturer/packer/importer | Exact provision | Declaration extraction + validation |
| Generic commodity name | Exact provision | Declaration extraction |
| Net quantity | Exact provision | Quantity normalization + validation |
| Manufacture/packing/import month/year | Exact provision | Date extraction + validation |
| MRP | Exact provision | Currency/value extraction + validation |
| Consumer-care information | Exact provision | Contact extraction + validation |
| Dimensions where relevant | Exact provision | Dimension capture + applicability |
| Quantity units | Exact provision | Unit normalization |
| Typography | Exact provision | Typography measurement/verification |
| Principal display panel | Exact provision | Region/placement analysis |
| Spacing | Exact provision | CV measurement |
| Legibility | Exact provision | Readability analysis |
| Contrast | Exact provision | Visual measurement |
| Language | Exact provision | Language detection/validation |
| Advertising requirements | Exact provision | Advertisement evidence module |
| Inspection/reporting requirements | Exact provision | Workflow/reporting controls |
| Exemptions | Exact provision/proviso | Rule applicability engine |

**Legal-source gate:** A rule cannot be activated unless the source document, page/reference, rule number, sub-rule, applicability, requirement, condition, exceptions/provisos, and validation method are populated from the authoritative source.

## 9. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Mobile screens should remain responsive; processing jobs are asynchronous where model/CV latency is significant. |
| Reliability | Failed AI/OCR jobs are retryable; partial inspection state must not be lost. |
| Security | RBAC + RLS + signed object URLs + least privilege. |
| Privacy | Collect only data required for inspection and governance; avoid embedding secrets in client builds. |
| Availability | Core case repository should degrade gracefully when AI providers are unavailable. |
| Scalability | Stateless API and background job boundaries allow horizontal scaling. |
| Maintainability | Canonical schemas and provider interfaces prevent vendor-specific domain leakage. |
| Accessibility | Minimum usable contrast, labels, touch targets, keyboard navigation on web. |
| Mobile usability | Large actions, clear status, offline drafts, minimal typing. |
| Offline operation | Capture and local draft creation must work without network; AI is not fully offline in MVP. |
| Observability | Correlated logs for inspection, AI request, OCR request, rule execution, sync, and report jobs. |
| Auditability | State changes and privileged changes are attributable and timestamped. |

## 10. MVP Scope

### MUST HAVE

- Authentication/RBAC
- Mobile physical inspection flow
- Camera + multi-image capture
- Image quality assessment
- OCR and canonical declaration extraction
- Deterministic, source-gated rule engine
- Findings/evidence/human verification
- Mock AI provider + at least one live AI provider adapter
- Basic OpenCV visual measurements
- E-commerce listing capture and comparison
- Search/history
- PDF report
- Web dashboard
- Audit logs

### SHOULD HAVE

- Gemini + OpenAI consensus
- Calibration workflow
- Manufacturer analytics
- Risk indicators
- Robust offline sync
- Rule proposal workflow

### NICE TO HAVE

- Advanced typography estimation
- Advanced e-commerce connectors
- Multi-language expansion beyond MVP scope
- Bulk analytics exports

### FUTURE

- Broad automation of legal document ingestion
- Larger-scale deployment controls
- Additional AI/CV models after benchmark validation

## 11. Out of Scope

- Autonomous legal enforcement
- Blockchain
- Cryptocurrency
- Custom foundation model training
- Unsupported legal interpretation
- Unnecessary microservices
- 20-language support for MVP

## 12. Success Metrics

| Metric | MVP target concept |
|---|---|
| Inspection completion time | Baseline against a manual timed workflow; target measurable reduction after pilot |
| OCR field extraction accuracy | Per-field precision/recall benchmark on a curated label set |
| Rule validation accuracy | 100% expected for unit-test fixtures once source-backed rules are frozen |
| Finding precision | Track confirmed findings / machine findings |
| Manual review rate | Track by workflow and confidence band |
| Report generation time | Measure p95 from generate action to available report |
| Search retrieval time | Measure p95 for common case queries |
| API failure recovery | Track successful retries and terminal failure rates |
| Mobile workflow completion | Measure dropout rate per step |

## 13. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| OCR errors | Confidence thresholds, source image crops, manual edit/verify. |
| Poor images | Guided capture + automatic quality gate. |
| Glare | Capture guidance, preprocessing, retake recommendations. |
| Reflective surfaces | Multi-angle capture and manual review. |
| Curved packaging | Perspective-aware crops; mark uncertain geometry. |
| Multilingual labels | OCR language packs/provider support; confidence and human verification. |
| Insufficient scale calibration | Reference-object workflow; estimated measurement label; review below threshold. |
| AI hallucination | Structured schemas, evidence requirement, provider abstraction, no legal authority. |
| Legal rule changes | Versioned rules + approval workflow + effective dates. |
| API outage | Mock/fallback mode, queued jobs, graceful status. |
| False positives | Human verification, confidence calibration, finding precision monitoring. |
| False negatives | Coverage tests, benchmark corpus, explicit `UNKNOWN/MANUAL_REVIEW` states rather than silent pass. |

## Decision statuses

Use these system statuses consistently:

- `PASS` — configured validation condition evaluated successfully.
- `WARNING` — information is incomplete, borderline, or requires attention without a deterministic non-compliance conclusion.
- `SUSPECTED_NON_COMPLIANCE` — deterministic configured check found an adverse condition based on available evidence; inspector decides final action.
- `MANUAL_REVIEW` — evidence or model disagreement prevents a reliable automated outcome.

Never render these statuses as legal certification by the AI layer.
''')

w('02_TECHNICAL_REQUIREMENTS.md', r'''# LM-Vision — Technical Requirements

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
''')

w('03_SYSTEM_ARCHITECTURE.md', r'''# LM-Vision — System Architecture

## 1. Architecture Overview

```mermaid
flowchart TD
    Mobile[Inspector Mobile App]
    Web[Web Command Center]
    API[Shared Backend API]
    AI[AI Gateway]
    OCR[OCR/CV Engine]
    Rules[Deterministic Rule Engine]
    DB[(Supabase PostgreSQL)]
    Storage[(Supabase Storage)]
    Reports[Report Engine]
    Audit[Audit Log]

    Mobile --> API
    Web --> API
    API --> AI
    API --> OCR
    AI --> Rules
    OCR --> Rules
    API --> Rules
    Rules --> DB
    API --> DB
    API --> Storage
    DB --> Reports
    Storage --> Reports
    API --> Audit
    Rules --> Audit
```

### Architecture principles

- Clients never decide legal outcomes.
- AI and CV provide evidence/measurements.
- Rule engine is deterministic and versioned.
- Human verification is a first-class domain object.
- Storage and database are separated but cryptographically linked by evidence hashes.

## 2. Mobile Architecture

```mermaid
flowchart LR
    UI[React Native UI]
    State[Inspection State Store]
    Camera[Camera Module]
    Queue[Offline Queue]
    Sync[Sync Manager]
    API[Backend API]
    Local[(Local Storage)]

    UI --> State
    UI --> Camera
    State --> Local
    Camera --> State
    State --> Queue
    Queue --> Sync
    Sync --> API
    API --> Sync
```

## 3. Web Architecture

```mermaid
flowchart TD
    Browser[Web Browser]
    Next[Next.js Application]
    Domain[Application/Domain Services]
    API[Backend API]
    DB[(PostgreSQL)]
    Storage[(Evidence Storage)]
    Charts[Analytics + Recharts]

    Browser --> Next
    Next --> Domain
    Domain --> API
    API --> DB
    API --> Storage
    Domain --> Charts
```

## 4. AI Pipeline

```mermaid
flowchart TD
    Image[Package Image]
    Quality[Quality Gate]
    OCR[PaddleOCR]
    CV[OpenCV]
    Gemini[Gemini Adapter]
    OpenAI[OpenAI Adapter]
    Normalize[Canonical Normalizer]
    Consensus[Consensus Engine]
    Evidence[Evidence Store]
    Rules[Rule Engine]

    Image --> Quality
    Quality --> OCR
    Quality --> CV
    Image --> Gemini
    Image --> OpenAI
    OCR --> Normalize
    CV --> Normalize
    Gemini --> Normalize
    OpenAI --> Normalize
    Normalize --> Consensus
    Consensus --> Evidence
    Consensus --> Rules
```

## 5. Rule Engine Flow

```mermaid
flowchart TD
    Input[Canonical Inspection Evidence]
    Classify[Product / Package Attributes]
    Select[Select Active Applicable Rules]
    Validate[Deterministic Validators]
    Status[PASS / WARNING / SUSPECTED_NON_COMPLIANCE / MANUAL_REVIEW]
    Finding[Create Finding + Evidence Links]
    Human[Inspector Verification]

    Input --> Classify
    Classify --> Select
    Select --> Validate
    Validate --> Status
    Status --> Finding
    Finding --> Human
```

## 6. Physical Inspection Sequence

```mermaid
sequenceDiagram
    actor Inspector
    participant Mobile
    participant API
    participant AI
    participant OCRCV as OCR/CV
    participant Rules
    participant DB
    participant Storage

    Inspector->>Mobile: Start inspection
    Mobile->>API: Create draft inspection
    API->>DB: Persist draft
    Inspector->>Mobile: Capture images
    Mobile->>API: Upload image(s)
    API->>Storage: Store evidence object
    API->>OCRCV: Quality/OCR/CV request
    API->>AI: Structured multimodal analysis
    OCRCV-->>API: OCR + measurements
    AI-->>API: Canonical analysis
    API->>Rules: Evaluate applicable rules
    Rules-->>API: Findings/statuses
    API->>DB: Persist findings + audit events
    API-->>Mobile: Review package
    Inspector->>Mobile: Verify findings and decide
    Mobile->>API: Inspector decision
    API->>DB: Persist decision
```

## 7. E-Commerce Sequence

```mermaid
sequenceDiagram
    actor Inspector
    participant Web as Mobile/Web Client
    participant API
    participant Listing as Listing Analyzer
    participant Rules
    participant DB

    Inspector->>Web: Submit URL/screenshot
    Web->>API: Create listing evidence
    API->>Listing: Extract structured fields
    Listing-->>API: ListingAnalysis
    API->>Rules: Validate listing fields
    Rules-->>API: Listing findings
    API->>DB: Persist listing + findings
    Inspector->>Web: Compare to package
    Web->>API: Request cross-source comparison
    API-->>Web: Mismatches + evidence
```

## 8. Evidence Lifecycle

```mermaid
stateDiagram-v2
    [*] --> CAPTURED
    CAPTURED --> STORED: hash + metadata
    STORED --> ANALYZED
    ANALYZED --> LINKED: linked to declaration/finding
    LINKED --> VERIFIED: human review
    LINKED --> DISPUTED: correction required
    DISPUTED --> VERIFIED
    VERIFIED --> RETAINED
    RETAINED --> ARCHIVED
```

## 9. Authentication/RBAC

```mermaid
flowchart TD
    User[User]
    Auth[Supabase Auth]
    Session[Session]
    RBAC[Role/Permission Check]
    RLS[PostgreSQL RLS]
    Resource[Resource]

    User --> Auth
    Auth --> Session
    Session --> RBAC
    RBAC --> RLS
    RLS --> Resource
```

Authorization must be enforced server-side and at the database layer for protected records.

## 10. Offline Sync

```mermaid
flowchart TD
    Capture[Capture Offline]
    Local[Local Inspection Draft]
    Queue[Upload Queue]
    Online{Network Available?}
    Upload[Upload + Sync]
    Conflict{Conflict?}
    Resolve[Conflict Resolution]
    Success[Synced]
    Retry[Exponential Backoff]

    Capture --> Local
    Local --> Queue
    Queue --> Online
    Online -- No --> Queue
    Online -- Yes --> Upload
    Upload --> Conflict
    Conflict -- No --> Success
    Conflict -- Yes --> Resolve
    Resolve --> Success
    Upload --> Retry
    Retry --> Queue
```

## Architecture boundaries

**AI boundary:** structured extraction/interpretation only.  
**Rule boundary:** accepts canonical evidence and active rules; emits deterministic validation results.  
**Evidence boundary:** owns binary evidence, hashes, provenance, retention metadata.  
**Decision boundary:** only human decision can finalize inspection outcome.
''')

w('04_DATABASE_DESIGN.md', r'''# LM-Vision — Database Design

## 1. Logical ER Diagram

```mermaid
erDiagram
    USER ||--o{ INSPECTION : performs
    ROLE ||--o{ USER : grants
    MANUFACTURER ||--o{ PRODUCT : owns
    PRODUCT ||--o{ INSPECTION : inspected_as
    INSPECTION ||--o{ INSPECTION_IMAGE : contains
    INSPECTION ||--o{ AI_ANALYSIS : has
    AI_ANALYSIS ||--o{ DECLARATION : extracts
    INSPECTION ||--o{ FINDING : produces
    RULE ||--o{ RULE_VERSION : versions
    RULE_VERSION ||--o{ FINDING : supports
    FINDING ||--o{ EVIDENCE : supported_by
    INSPECTION ||--o{ EVIDENCE : has
    INSPECTION ||--o{ INSPECTOR_DECISION : receives
    INSPECTION ||--o{ ECOMMERCE_LISTING : compares
    ECOMMERCE_LISTING ||--o{ CROSS_SOURCE_COMPARISON : participates
    INSPECTION ||--o{ REPORT : generates
    USER ||--o{ AUDIT_LOG : creates
```

## 2. Common conventions

- IDs: UUID.
- Timestamps: `timestamptz` in UTC.
- JSON: `jsonb` for structured external/provider payloads only when a stable relational projection is not necessary.
- Soft deletion: prefer status/archive over physical deletion for inspection/evidence records.
- All mutable business entities have `created_at`, `updated_at`; sensitive history uses audit events rather than overwriting provenance.

## 3. Table Definitions

### `roles`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK | Role ID |
| name | text | UNIQUE | `INSPECTOR`, `SUPERVISOR`, `ADMIN`, `AUDITOR` |
| description | text | | |
| created_at | timestamptz | | |

### `users`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK/FK | Matches auth user ID |
| role_id | uuid | FK roles.id | |
| full_name | text | | |
| employee_code | text | INDEX | Operational identifier if policy allows |
| is_active | boolean | | |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |

### `manufacturers`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK | |
| legal_name | text | INDEX | Canonical display name |
| aliases | text[] | | Search aliases |
| contact_metadata | jsonb | | Non-sensitive business metadata |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |

### `products`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK | |
| manufacturer_id | uuid | FK | |
| name | text | INDEX | Generic/canonical product name |
| category | text | INDEX | Product classification |
| package_type | text | | |
| metadata | jsonb | | Product attributes |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |

### `inspections`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK | |
| inspector_id | uuid | FK users.id | |
| product_id | uuid | FK products.id | Nullable until classification |
| status | text | INDEX | Workflow status |
| source_type | text | | `PHYSICAL`, `ECOMMERCE`, `HYBRID` |
| location_metadata | jsonb | | Coarse operational location if permitted |
| started_at | timestamptz | INDEX | |
| completed_at | timestamptz | | |
| rule_version_context | jsonb | | Snapshot of rule versions used |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |

### `inspection_images`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK | |
| inspection_id | uuid | FK | |
| storage_path | text | UNIQUE | Object path |
| sha256 | text | INDEX | Integrity hash |
| mime_type | text | | Allowlisted image MIME |
| width | int | | |
| height | int | | |
| capture_metadata | jsonb | | Device/capture metadata allowed by policy |
| quality_score | numeric | | |
| created_at | timestamptz | | |

### `ai_analyses`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK | |
| inspection_id | uuid | FK | |
| provider | text | | |
| model | text | | |
| schema_version | text | | |
| status | text | | |
| confidence | numeric | | 0..1 |
| payload | jsonb | | Canonical/provider audit payload |
| created_at | timestamptz | | |

### `declarations`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK | |
| inspection_id | uuid | FK | |
| ai_analysis_id | uuid | FK | |
| field_name | text | INDEX | Canonical field key |
| raw_value | text | | As observed/extracted |
| normalized_value | jsonb | | Parsed value/unit |
| confidence | numeric | | |
| verification_status | text | | `UNVERIFIED`, `VERIFIED`, `REJECTED` |
| evidence_refs | uuid[] | | Links to evidence |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |

### `rules`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK | Stable logical rule ID |
| rule_number | text | INDEX | Source numbering |
| sub_rule | text | | |
| title | text | | |
| category | text | INDEX | Declaration/quantity/etc. |
| created_at | timestamptz | | |

### `rule_versions`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK | |
| rule_id | uuid | FK | |
| version | text | | |
| applicability | jsonb | | Executable predicate data |
| conditions | jsonb | | |
| requirement | jsonb | | |
| validation_type | text | | |
| threshold | jsonb | | |
| exceptions | jsonb | | |
| effective_from | date | INDEX | |
| effective_to | date | | |
| source_document | text | | |
| source_page | text | | Required for activation |
| approval_status | text | INDEX | |
| approved_by | uuid | FK users.id | |
| approved_at | timestamptz | | |
| created_at | timestamptz | | |

### `findings`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK | |
| inspection_id | uuid | FK | |
| rule_version_id | uuid | FK | Nullable only for non-legal observation |
| finding_type | text | INDEX | |
| status | text | INDEX | Four canonical statuses |
| title | text | | |
| explanation | text | | Evidence-backed explanation |
| confidence | numeric | | AI/CV confidence where applicable |
| human_review_required | boolean | INDEX | |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |

### `evidence`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK | |
| inspection_id | uuid | FK | |
| evidence_type | text | INDEX | IMAGE, OCR_REGION, LISTING, NOTE, MEASUREMENT, etc. |
| storage_path | text | | Nullable for structured-only evidence |
| sha256 | text | INDEX | |
| source_reference | jsonb | | Image/page/region/provider reference |
| captured_at | timestamptz | | |
| verified_by | uuid | FK users.id | |
| verified_at | timestamptz | | |
| created_at | timestamptz | | |

### `inspector_decisions`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK | |
| inspection_id | uuid | FK | |
| inspector_id | uuid | FK users.id | |
| decision | text | | Domain decision enum |
| comments | text | | |
| decided_at | timestamptz | | |

### `ecommerce_listings`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK | |
| inspection_id | uuid | FK | |
| source_url | text | | |
| captured_at | timestamptz | | Retrieval timestamp |
| merchant_name | text | | |
| fields | jsonb | | Structured listing fields |
| screenshot_evidence_id | uuid | FK evidence.id | |
| analysis_status | text | | |

### `cross_source_comparisons`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK | |
| inspection_id | uuid | FK | |
| listing_id | uuid | FK | |
| comparison | jsonb | | Field-by-field comparison |
| status | text | | MATCH/MISMATCH/UNKNOWN |
| created_at | timestamptz | | |

### `reports`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK | |
| inspection_id | uuid | FK | |
| format | text | | PDF/HTML |
| storage_path | text | | |
| sha256 | text | | |
| generated_by | uuid | FK users.id | |
| generated_at | timestamptz | | |

### `audit_logs`

| Column | Type | Key | Notes |
|---|---|---|---|
| id | uuid | PK | |
| actor_user_id | uuid | FK users.id | Nullable for system events |
| action | text | INDEX | |
| entity_type | text | INDEX | |
| entity_id | uuid | INDEX | |
| before_data | jsonb | | Redacted as required |
| after_data | jsonb | | Redacted as required |
| metadata | jsonb | | request/correlation ID |
| created_at | timestamptz | INDEX | |

## 4. Indexes

Minimum indexes:

```sql
create index idx_inspections_status_started on inspections(status, started_at desc);
create index idx_inspections_product on inspections(product_id, started_at desc);
create index idx_findings_status on findings(status, human_review_required);
create index idx_rules_rule_number on rules(rule_number);
create index idx_rule_versions_effective on rule_versions(effective_from, effective_to, approval_status);
create index idx_evidence_hash on evidence(sha256);
create index idx_audit_entity on audit_logs(entity_type, entity_id, created_at desc);
```

## 5. Constraints

- Confidence values must be between 0 and 1.
- `rule_versions.approval_status='ACTIVE'` requires populated source fields and `approved_by/approved_at`.
- `findings.rule_version_id` is mandatory for findings claimed as legal-rule results.
- A report cannot be final if the inspection has unresolved mandatory `MANUAL_REVIEW` findings unless the product explicitly records an authorized override path.
- Evidence hashes are immutable after creation.

## 6. RLS Strategy

Principles:

- Inspectors access their assigned/owned inspections and permitted evidence.
- Supervisors access their organizational scope.
- Admins manage configuration and users.
- Auditors have read-only access to permitted inspection/audit resources.
- Storage object access mirrors the database authorization boundary.

RLS should use server-issued claims/role mapping and avoid trusting a client-submitted role field.

## 7. Audit Strategy

Audit events must capture authentication/security events, inspection creation/decision changes, evidence verification, rule lifecycle changes, report generation, role changes, and privileged configuration edits.

Do not store provider API secrets or unnecessary sensitive payloads in the audit log. Store hashes/references when the full payload is already retained elsewhere.
''')

w('05_AI_CV_ARCHITECTURE.md', r'''# LM-Vision — AI / Computer Vision Architecture

## 1. Responsibility Matrix

| Component | Responsibility | Must not do |
|---|---|---|
| Gemini | Multimodal extraction/classification/explanation adapter | Final legal decision |
| OpenAI | Alternate multimodal extraction/classification/explanation adapter | Final legal decision |
| PaddleOCR | OCR text and regions | Legal interpretation |
| OpenCV | Quality, geometry, contrast, perspective, measurement support | Claim compliance without rule evaluation |
| Consensus Engine | Compare structured provider outputs | Invent a third answer without evidence |
| Rule Engine | Deterministic applicability/validation | Generate rules from model prose |

## 2. Processing Pipeline

```mermaid
flowchart TD
    Raw[Raw Image Set]
    Quality[Quality Gate]
    Prep[Preprocessing]
    OCR[PaddleOCR]
    CV[OpenCV]
    VisionA[Gemini]
    VisionB[OpenAI]
    Canon[Canonical Schema]
    Consensus[Consensus]
    Evidence[Evidence Graph]
    Rules[Rule Engine]

    Raw --> Quality
    Quality --> Prep
    Prep --> OCR
    Prep --> CV
    Raw --> VisionA
    Raw --> VisionB
    OCR --> Canon
    CV --> Canon
    VisionA --> Canon
    VisionB --> Canon
    Canon --> Consensus
    Consensus --> Evidence
    Consensus --> Rules
```

## 3. Canonical Schemas

### `TextRegion`

```ts
export interface TextRegion {
  id: string;
  imageId: string;
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
  source: 'OCR' | 'VISION_MODEL';
}
```

### `Declaration`

```ts
export interface Declaration {
  id: string;
  field:
    | 'manufacturer'
    | 'packer'
    | 'importer'
    | 'commodity_name'
    | 'net_quantity'
    | 'date'
    | 'mrp'
    | 'consumer_care'
    | 'dimensions'
    | 'unit'
    | 'language'
    | 'other';
  rawValue: string;
  normalizedValue?: unknown;
  confidence: number;
  textRegionIds: string[];
  evidenceIds: string[];
  verificationStatus: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';
}
```

### `ImageQuality`

```ts
export interface ImageQuality {
  blurScore: number;
  glareScore: number;
  exposureScore: number;
  occlusionScore: number;
  overall: number;
  recommendations: string[];
  pass: boolean;
}
```

### `VisualMeasurement`

```ts
export interface VisualMeasurement {
  measurementType: string;
  value?: number;
  unit?: string;
  method: string;
  confidence: number;
  isEstimated: boolean;
  calibrationId?: string;
  evidenceIds: string[];
}
```

### `PackageAnalysis`

```ts
export interface PackageAnalysis {
  schemaVersion: string;
  provider: string;
  model: string;
  declarations: Declaration[];
  textRegions: TextRegion[];
  imageQuality: ImageQuality[];
  visualMeasurements: VisualMeasurement[];
  classification: {
    category?: string;
    packageType?: string;
    confidence: number;
  };
  uncertainties: { field: string; reason: string; confidence: number }[];
}
```

### `ListingAnalysis`

```ts
export interface ListingAnalysis {
  schemaVersion: string;
  sourceUrl?: string;
  merchant?: string;
  fields: Declaration[];
  screenshotEvidenceIds: string[];
  retrievalTimestamp: string;
  uncertainties: string[];
}
```

## 4. Confidence Handling

Suggested bands are configuration, not legal thresholds:

| Confidence | System behavior |
|---|---|
| `>= 0.90` | Accept as machine-extracted candidate; retain evidence and permit review. |
| `0.70–0.89` | Flag for contextual review when field affects rule applicability. |
| `< 0.70` | Prefer `MANUAL_REVIEW`; do not silently drive critical rule checks. |

Confidence must be calibrated empirically on a project dataset. Thresholds are not asserted as legal standards.

## 5. Provider Fallback

Order is configuration-driven. Recommended demo policy:

1. Primary live provider.
2. Alternate provider when configured.
3. `MockProvider` for deterministic demo flows.
4. Manual review when no reliable machine result is available.

Provider responses must be validated against the canonical schema before entering the domain layer.

## 6. Consensus

Compare critical fields such as MRP, net quantity, manufacturer, date, and product classification using normalized representations.

Example:

```json
{
  "field": "mrp",
  "gemini": {"value": 249, "confidence": 0.97},
  "openai": {"value": 249, "confidence": 0.94},
  "consensus": {"status": "AGREED", "value": 249, "confidence": 0.95}
}
```

Disagreement example:

```json
{
  "field": "mrp",
  "gemini": {"value": 249, "confidence": 0.93},
  "openai": {"value": 299, "confidence": 0.91},
  "consensus": {"status": "CONFLICT", "humanReviewRequired": true}
}
```

## 7. Low-Confidence Behavior

- Preserve the raw evidence.
- Preserve the model output.
- Mark the field uncertain.
- Block dependent legal checks where the value is material.
- Route to human verification.
- Never convert missing/uncertain evidence to PASS.

## 8. Cost/Latency Controls

- Compress images before upload where evidentiary quality remains sufficient.
- Crop regions before expensive multimodal calls.
- Cache deterministic transforms.
- Avoid sending the same full-resolution image repeatedly.
- Batch independent requests when supported.
- Use mock fixtures during development/tests.
''')

w('06_RULE_ENGINE_SPEC.md', r'''# LM-Vision — Rule Engine Specification

> **Critical legal-source constraint:** The requested authoritative *Legal Metrology (Packaged Commodities) Rules, 2011* PDF is referenced by the project brief but is not present in the current uploaded materials. Therefore this document specifies the executable rule architecture and schema, but does **not** fabricate legal rule numbers, sub-rules, thresholds, exceptions, or source pages. A rule enters `ACTIVE` only after source-backed ingestion and human/legal approval.

## 1. Design Principle

`AI interprets evidence → CV measures → deterministic rule engine evaluates → inspector decides.`

The rule engine is the only component allowed to produce automated rule-validation statuses.

## 2. Machine-Readable Rule Model

```json
{
  "ruleId": "LMV-RULE-PLACEHOLDER",
  "ruleNumber": "SOURCE_REQUIRED",
  "subRule": null,
  "title": "Source-backed rule title required",
  "applicability": {},
  "conditions": {},
  "requirement": {},
  "validationType": "SOURCE_REQUIRED",
  "threshold": null,
  "exceptions": [],
  "effectiveFrom": null,
  "effectiveTo": null,
  "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
  "sourcePage": "SOURCE_REQUIRED",
  "humanVerificationRequired": true
}
```

## 3. Required Rule Metadata

| Field | Requirement |
|---|---|
| `ruleId` | Stable internal identifier |
| `ruleNumber` | Exact source rule number |
| `subRule` | Exact sub-rule where applicable |
| `title` | Source-aligned concise title |
| `applicability` | Machine-evaluable scope |
| `conditions` | Preconditions for validation |
| `requirement` | What must be present/true |
| `validationType` | Deterministic evaluator name |
| `threshold` | Only where source defines one |
| `exceptions` | Provisos/exceptions from source |
| `effectiveFrom` | Rule version activation date |
| `effectiveTo` | Superseded/expiry date when applicable |
| `sourceDocument` | Exact document title/version |
| `sourcePage` | Exact PDF page/reference |
| `humanVerificationRequired` | Whether a human check is required before final decision |

## 4. Rule Categories

1. Applicability rules
2. Declaration rules
3. Quantity rules
4. Unit rules
5. Typography rules
6. Placement rules
7. Readability rules
8. Advertisement rules
9. Exemption rules
10. Inspection rules

## 5. Execution Contract

Input:

```ts
export interface RuleContext {
  inspectionId: string;
  asOf: string;
  product: {
    category?: string;
    packageType?: string;
    quantity?: { value: number; unit: string };
    attributes?: Record<string, unknown>;
  };
  declarations: Record<string, unknown>;
  visualMeasurements: Record<string, unknown>[];
  evidence: string[];
}
```

Output:

```ts
export type RuleStatus =
  | 'PASS'
  | 'WARNING'
  | 'SUSPECTED_NON_COMPLIANCE'
  | 'MANUAL_REVIEW';

export interface RuleEvaluation {
  ruleVersionId: string;
  status: RuleStatus;
  reasonCode: string;
  explanation: string;
  evidenceIds: string[];
  missingInputs: string[];
  confidence?: number;
  humanVerificationRequired: boolean;
}
```

## 6. Applicability Evaluation

Applicability must occur before validation. A rule that does not apply must not create a failure finding.

Pseudo-flow:

```text
for each ACTIVE rule version valid on inspection.asOf:
    if source metadata incomplete: block activation
    if applicability(context) == false: skip
    else: evaluate requirements
```

## 7. Deterministic Validator Types

Allowed validator types are enumerated rather than generated dynamically:

- `FIELD_PRESENT`
- `FIELD_EQUALS`
- `FIELD_MATCHES_PATTERN`
- `NUMERIC_COMPARE`
- `UNIT_NORMALIZED_COMPARE`
- `DATE_FORMAT_CHECK`
- `REGION_PRESENT`
- `REGION_GEOMETRY_CHECK`
- `VISUAL_MEASUREMENT_COMPARE`
- `CROSS_SOURCE_COMPARE`
- `MANUAL_VERIFICATION_REQUIRED`
- `COMPOSITE`

No validator may execute arbitrary LLM-generated code.

## 8. Executable Rule Examples (Architecture Fixtures, Not Legal Rules)

### Example A — required-field architecture fixture

```json
{
  "ruleId": "FIXTURE-FIELD-PRESENCE-001",
  "ruleNumber": "TEST_ONLY",
  "title": "Required field presence fixture",
  "applicability": {"field": "commodity_name"},
  "conditions": {"inspectionType": "PHYSICAL"},
  "requirement": {"type": "FIELD_PRESENT", "field": "commodity_name"},
  "validationType": "FIELD_PRESENT",
  "threshold": null,
  "exceptions": [],
  "effectiveFrom": "2099-01-01",
  "sourceDocument": "TEST FIXTURE — NOT LAW",
  "sourcePage": "N/A",
  "humanVerificationRequired": false
}
```

### Example B — e-commerce comparison fixture

```json
{
  "ruleId": "FIXTURE-CROSS-SOURCE-001",
  "ruleNumber": "TEST_ONLY",
  "title": "Cross-source equality fixture",
  "applicability": {"requires": ["PHYSICAL", "ECOMMERCE"]},
  "conditions": {},
  "requirement": {"type": "CROSS_SOURCE_COMPARE", "field": "mrp"},
  "validationType": "CROSS_SOURCE_COMPARE",
  "sourceDocument": "TEST FIXTURE — NOT LAW",
  "sourcePage": "N/A",
  "humanVerificationRequired": true
}
```

These fixtures exist to demonstrate engine behavior and must not be presented as legal provisions.

## 9. Rule Version Governance

Lifecycle:

`DRAFT → REVIEW → APPROVED → ACTIVE → SUPERSEDED/RETIRED`

Activation gate:

```text
source document present
AND exact rule/sub-rule captured
AND requirement captured
AND applicability captured
AND exceptions/provisos reviewed
AND validator mapped
AND positive/negative tests pass
AND human/legal approver recorded
```

## 10. Source Mapping Record

Every active rule must have:

```json
{
  "ruleNumber": "<exact source>",
  "subRule": "<exact source or null>",
  "requirement": "<faithful normalized text>",
  "applicability": "<faithful scope>",
  "conditions": [],
  "exceptions": [],
  "validationMethod": "<deterministic evaluator>",
  "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
  "sourcePage": "<exact PDF page/reference>",
  "softwareModule": "packages/rules/..."
}
```

## 11. Unknown / Missing Evidence Semantics

- Missing evidence → `MANUAL_REVIEW`, not PASS.
- Contradictory evidence → `MANUAL_REVIEW`.
- Rule not applicable → no adverse finding.
- Rule source not activated → engine must refuse execution and surface configuration error.
- AI disagreement on a critical input → `MANUAL_REVIEW` for dependent checks.

## 12. Test Requirement

Every activated legal rule must have:

- positive fixture;
- negative fixture;
- applicability fixture;
- exception/proviso fixture where applicable;
- regression test tied to rule version;
- source-reference assertion.

## 13. Rule Ingestion Procedure

1. Obtain project-authorized Rules PDF.
2. Parse/inspect source text and page references.
3. Extract exact rule/sub-rule and relevant qualifiers.
4. Normalize into the schema without changing legal meaning.
5. Map each requirement to a deterministic validator.
6. Add tests.
7. Human/legal review.
8. Activate only after approval.
9. Freeze rule-version context on each inspection.
''')

w('07_API_SPECIFICATION.md', r'''# LM-Vision — API Specification

## 1. API Conventions

Base path: `/api/v1`.

### Authentication

Bearer session token from Supabase Auth. Server validates token and role before executing protected operations.

### Success envelope

```json
{
  "success": true,
  "data": {},
  "meta": {"requestId": "req-123"}
}
```

### Error envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request is invalid",
    "details": []
  },
  "meta": {"requestId": "req-123"}
}
```

### Pagination

Query: `page`, `pageSize`, `cursor` where appropriate.

### Standard errors

`400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT`, `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_MEDIA`, `422 UNPROCESSABLE`, `429 RATE_LIMITED`, `500 INTERNAL_ERROR`, `503 DEPENDENCY_UNAVAILABLE`.

## 2. Authentication

| Method | URL | Purpose | Auth |
|---|---|---|---|
| POST | `/auth/session` | Resolve application session/profile | Bearer |
| POST | `/auth/signout` | Sign out | Bearer |
| GET | `/auth/me` | Current user/profile | Bearer |

## 3. Inspections

| Method | URL | Purpose | Auth |
|---|---|---|---|
| POST | `/inspections` | Create inspection draft | Inspector+ |
| GET | `/inspections/:id` | Get canonical inspection | Scoped |
| PATCH | `/inspections/:id` | Update draft metadata | Owner/allowed supervisor |
| POST | `/inspections/:id/process` | Start processing pipeline | Inspector+ |
| POST | `/inspections/:id/decision` | Submit inspector decision | Inspector/Supervisor |
| GET | `/inspections` | Search/list inspections | Scoped |

### Create inspection request

```json
{
  "sourceType": "PHYSICAL",
  "category": "PERSONAL_CARE",
  "packageType": "BOTTLE"
}
```

### Process response

```json
{
  "success": true,
  "data": {
    "inspectionId": "uuid",
    "jobId": "job-123",
    "status": "PROCESSING"
  }
}
```

## 4. Products / Manufacturers

| Method | URL | Purpose | Auth |
|---|---|---|---|
| GET | `/products` | Search products | Scoped |
| POST | `/products` | Create product | Inspector+ |
| GET | `/products/:id` | Product detail | Scoped |
| GET | `/manufacturers` | Search manufacturers | Scoped |
| GET | `/manufacturers/:id` | Manufacturer profile/analytics | Supervisor+ |

## 5. Images / Evidence

| Method | URL | Purpose | Auth |
|---|---|---|---|
| POST | `/images/presign` | Obtain signed upload URL | Scoped |
| POST | `/images/complete` | Finalize upload + hash | Scoped |
| GET | `/inspections/:id/evidence` | Evidence list | Scoped |
| POST | `/evidence/:id/verify` | Verify evidence | Inspector/Supervisor |
| GET | `/evidence/:id/url` | Temporary signed URL | Scoped |

Uploads must validate MIME, extension, size, and image parseability. Hash is calculated server-side or verified server-side.

## 6. AI

| Method | URL | Purpose | Auth |
|---|---|---|---|
| POST | `/ai/package-analysis` | Queue package analysis | Inspector+ |
| POST | `/ai/listing-analysis` | Analyze listing | Inspector+ |
| POST | `/ai/consensus` | Compare provider outputs | Service/Supervisor path |
| GET | `/ai/jobs/:id` | Get job status | Scoped |

AI API output must be canonical JSON validated by shared schemas.

## 7. Rules

| Method | URL | Purpose | Auth |
|---|---|---|---|
| GET | `/rules` | Search rule definitions | All permitted |
| GET | `/rules/:id` | Rule history | All permitted |
| POST | `/rules/proposals` | Submit rule proposal | Admin/authorized reviewer |
| POST | `/rules/:id/versions` | Create rule version | Admin |
| POST | `/rules/versions/:id/approve` | Approve version | Authorized legal/admin role |
| POST | `/rules/versions/:id/activate` | Activate approved version | Admin |

Activation returns `409` when source or approval metadata is incomplete.

## 8. Findings

| Method | URL | Purpose | Auth |
|---|---|---|---|
| GET | `/inspections/:id/findings` | List findings | Scoped |
| PATCH | `/findings/:id` | Add review state/comment | Inspector/Supervisor |
| POST | `/findings/:id/verify` | Verify/reject finding | Inspector/Supervisor |

## 9. E-Commerce

| Method | URL | Purpose | Auth |
|---|---|---|---|
| POST | `/ecommerce/listings` | Create listing evidence | Inspector+ |
| POST | `/ecommerce/listings/:id/analyze` | Analyze listing | Inspector+ |
| POST | `/ecommerce/compare` | Compare listing to package | Inspector+ |
| GET | `/ecommerce/listings/:id` | Listing detail | Scoped |

## 10. Reports

| Method | URL | Purpose | Auth |
|---|---|---|---|
| POST | `/reports/inspections/:id` | Generate report | Inspector/Supervisor |
| GET | `/reports/:id` | Report metadata | Scoped |
| GET | `/reports/:id/url` | Signed download/view URL | Scoped |

Report generation should be idempotent for a given inspection snapshot + report format.

## 11. Analytics

| Method | URL | Purpose | Auth |
|---|---|---|---|
| GET | `/analytics/dashboard` | Operational KPIs | Supervisor+ |
| GET | `/analytics/manufacturers/:id` | Manufacturer metrics | Supervisor+ |
| GET | `/analytics/risk` | Risk indicators | Supervisor+ |

Risk analytics must remain explainable and must not be presented as a legal finding.

## 12. Audit

| Method | URL | Purpose | Auth |
|---|---|---|---|
| GET | `/audit` | Search audit logs | Auditor/Admin |
| GET | `/audit/:id` | Audit detail | Auditor/Admin |

## 13. Authorization Matrix

| Capability | Inspector | Supervisor | Admin | Auditor |
|---|---:|---:|---:|---:|
| Create inspection | ✓ | ✓ | ✓ | — |
| Submit evidence | ✓ | ✓ | ✓ | — |
| Finalize own decision | ✓ | ✓ | ✓ | — |
| Team review | — | ✓ | ✓ | — |
| Rule proposal | — | ✓/configured | ✓ | — |
| Rule activation | — | —/configured | ✓ | — |
| User administration | — | — | ✓ | — |
| Read audit logs | — | limited | ✓ | ✓ |

## 14. Rate Limits

Prototype defaults are configurable. Suggested starting policy:

- general authenticated API: 120 requests/min/user;
- upload initiation: 30/min/user;
- AI jobs: 10/min/user and bounded concurrent jobs;
- report generation: 10/min/user.

Return `429` with retry metadata.

## 15. Idempotency

For uploads, processing jobs, decisions, and report generation, support `Idempotency-Key` where duplicate submissions are plausible.

## 16. API Non-Negotiables

- Schema validate every request and external response.
- Never trust client role claims.
- Never accept arbitrary rule executable code.
- Never return unrestricted evidence storage URLs.
- Include request/correlation IDs in logs.
''')

w('08_SECURITY_SPECIFICATION.md', r'''# LM-Vision — Security Specification

## 1. Security Objectives

Protect inspection evidence, credentials, rule configuration, reports, audit history, and user access while maintaining an auditable chain of custody.

## 2. Authentication

Use Supabase Auth. Client receives a session; backend validates the access token on protected requests. Session expiry and refresh must follow the identity provider's supported mechanism.

Do not ship AI provider secrets in mobile/web bundles.

## 3. RBAC

Roles:

- `INSPECTOR`
- `SUPERVISOR`
- `ADMIN`
- `AUDITOR`

Authorization is enforced at API/service boundaries and PostgreSQL RLS. UI hiding is not an authorization mechanism.

## 4. Database Security

- Enable RLS on protected tables.
- Use least-privilege service credentials.
- Separate privileged server operations from client-accessible operations.
- Avoid exposing raw provider payloads unnecessarily.
- Use parameterized queries/typed client libraries.

## 5. Storage Security

Evidence objects are private by default.

Access pattern:

`Authorized user → API authorization → short-lived signed URL → object`

Do not expose permanent public buckets for inspection evidence.

## 6. AI API Key Security

Provider keys reside only in server-side environment/secret management.

Required controls:

- separate keys per environment where feasible;
- key rotation procedure;
- usage monitoring;
- request quotas;
- no key logging;
- redact provider request/response bodies from ordinary application logs unless explicitly approved.

## 7. Audit Trail

Audit all:

- authentication and privileged access events;
- inspection creation/decision changes;
- evidence verification;
- rule proposal/approval/activation;
- user/role changes;
- report generation;
- administrative configuration changes.

Audit records are append-oriented. Corrections create new events; they do not erase history.

## 8. Evidence Hashing

For every binary evidence artifact compute SHA-256.

```text
hash = SHA256(original_bytes)
```

Persist hash with evidence metadata. If an object is transformed, store it as a new derived artifact with its own hash and relation to the source.

Hashing establishes integrity evidence; it is not by itself proof of legal authenticity.

## 9. Input Validation

Validate:

- UUIDs
- enumerations
- numeric ranges
- timestamps
- URLs
- image dimensions
- MIME types
- JSON schema
- pagination values

Zod validates TypeScript-side boundaries. Python services perform independent validation for service-side contracts.

## 10. File Validation

Before processing:

1. Check declared MIME.
2. Inspect actual file signature/parser behavior.
3. Enforce size and dimension limits.
4. Decode safely.
5. Strip/normalize unnecessary metadata if policy permits.
6. Hash the original artifact.
7. Store using generated object IDs, not user-controlled filenames.

## 11. Rate Limiting

Apply per-user/IP or token-bound rate limits to authentication, uploads, AI requests, listing analysis, and reports.

## 12. Privacy

Collect only operationally required data. Avoid storing unnecessary device identifiers or exact location. Define retention periods before production deployment.

## 13. Secure Logging

Never log:

- access tokens;
- API keys;
- passwords;
- signed URLs;
- unnecessary raw personal data;
- full provider prompts containing sensitive evidence unless explicitly approved.

Logs should carry `requestId`, `inspectionId` where applicable, service, event name, severity, and timestamp.

## 14. Secret Management

Environment categories:

```text
NEXT_PUBLIC_*            # only non-secret client configuration
SUPABASE_URL             # public project URL as appropriate
SUPABASE_ANON_KEY        # public client key as designed by Supabase
SUPABASE_SERVICE_ROLE    # server-only secret
GEMINI_API_KEY           # server-only secret
OPENAI_API_KEY           # server-only secret
```

Never commit `.env` files containing secrets.

## 15. Threat Model Summary

| Threat | Control |
|---|---|
| Unauthorized evidence access | Auth + RBAC + RLS + signed URLs |
| Evidence tampering | Private storage + SHA-256 + audit trail |
| Prompt injection in package/listing text | Treat extracted text as untrusted data; structured schemas; no tool execution from model output |
| Malicious uploaded files | Type/size/signature validation + safe parsing |
| Model hallucination | Evidence requirements + deterministic rules + human review |
| Privileged misuse | Least privilege + audit + separation of duties |
| Replay/duplicate action | Idempotency keys for mutation endpoints |
| API abuse | Rate limits + quotas |
| Secret leakage | Server-only provider calls + secret management |

## 16. AI-Specific Security Boundary

Package text, e-commerce content, and OCR text are untrusted input. The model must not be permitted to interpret text such as “ignore the rules” as an instruction to the system. Model output is data and must pass schema validation before use.
''')

w('09_MOBILE_APP_SPEC.md', r'''# LM-Vision — Mobile App Specification

## 1. Mobile UX Principles

- Designed for field officers, bright environments, gloves/one-hand use where practical.
- Primary actions are large and obvious.
- Avoid multi-screen typing when camera/evidence can be used.
- Always show whether work is local, syncing, or server-processed.
- Never hide uncertainty.

## 2. Navigation

```text
Login
  └─ Home
      ├─ New Inspection
      │   ├─ Category Selection
      │   ├─ Package Type
      │   ├─ Guided Camera Capture
      │   ├─ Image Review
      │   ├─ Calibration
      │   ├─ AI Processing
      │   ├─ Inspection Result
      │   ├─ Finding Detail
      │   ├─ Evidence
      │   ├─ Inspector Decision
      │   └─ Report
      ├─ E-Commerce
      ├─ History
      └─ Profile
```

## 3. Screen Specifications

### Login

**Purpose:** authenticate the officer.  
**UI:** logo, credentials/approved auth flow, environment status.  
**Actions:** sign in, retry.  
**API:** `/auth/session`.  
**Loading:** disabled button/spinner.  
**Error:** readable auth error; never expose raw provider error.  
**Empty:** not applicable.  
**Success:** navigate to Home.

### Home

**Purpose:** launch work and show operational status.  
**UI:** New Inspection CTA, pending sync, recent inspections, connectivity.  
**API:** summary/recent list.  
**Error:** cached state where possible.

### New Inspection

**Purpose:** create canonical draft.  
**UI:** source type, category, package type.  
**Action:** continue.  
**API:** `POST /inspections`.

### Category Selection

Show configurable categories. Do not hardcode legal applicability into the UI.

### Package Type

Capture package type as structured metadata used later by rule applicability.

### Guided Camera Capture

**Purpose:** capture front/primary display and additional panels.  
**UI:** framing guide, glare/blur indicator, required-shot checklist, capture button.  
**API:** presigned upload flow.  
**Offline:** save local draft and queue upload.  
**Error:** retain image locally until user retries/deletes.

### Image Review

Show thumbnails, quality flags, retake action, metadata, and “continue with review” path.

### Calibration

UI displays selected reference object, known size, detected pixels, calculated mm/pixel, estimated measurement, and confidence. User must confirm reference object and can mark calibration untrusted.

### AI Processing

Show progress stages rather than pretending a single monolithic AI step:

`quality → OCR → extraction → CV → consensus → rule evaluation`.

### Inspection Result

Sections:

- overall inspection status;
- declarations;
- applicable rules;
- findings grouped by severity/status;
- evidence count;
- human review queue.

Statuses are `PASS`, `WARNING`, `SUSPECTED_NON_COMPLIANCE`, `MANUAL_REVIEW`.

### Finding Detail

Display:

- finding title;
- status;
- rule ID/number/source reference when source-backed;
- explanation;
- evidence preview;
- confidence;
- machine/human origin;
- verify/edit controls.

### Evidence

Evidence gallery with image, crop/region, notes, hash status, verification state.

### Inspector Decision

Explicit human decision screen. Required comment for configured decision types. Once submitted, decision is audited.

### E-Commerce

Capture URL or screenshot. Show digital-source badge. Display extracted listing fields and compare action.

### History

Search by inspection ID/product/manufacturer/date/status. Offline shows cached cases only.

### Report

Show report generation state, preview/metadata, and secure open/share path subject to policy.

### Profile

Show role, sync state, app version, environment, sign-out.

## 4. Local Inspection State

Store a versioned draft object with:

```ts
interface LocalInspectionDraft {
  localId: string;
  serverId?: string;
  version: number;
  status: string;
  capturedEvidenceRefs: string[];
  pendingOperations: string[];
  updatedAt: string;
}
```

## 5. Sync Rules

- Each queued mutation has an idempotency key.
- Upload binary before finalizing evidence record.
- Sync oldest/most urgent inspection first.
- Retry with exponential backoff.
- Conflict detection uses server version/updated timestamp.
- User review is required for conflicting human decisions or edits.

## 6. Permissions

Request camera/photos/notification permissions contextually, not all at first launch. Explain purpose before system prompt.

## 7. Offline Behavior

Works offline for:

- starting a draft;
- category/package selection;
- camera capture;
- image review;
- local notes;
- queued evidence.

MVP does not promise full offline Gemini/OpenAI/PaddleOCR capability.

## 8. Error Handling

Every async screen needs a retry action and preserves user-entered state. Distinguish:

- user input error;
- network error;
- provider outage;
- processing failure;
- authorization failure;
- sync conflict.
''')

w('10_WEB_APP_SPEC.md', r'''# LM-Vision — Web App Specification

## 1. Web Information Architecture

```text
Login
Dashboard
Inspections
Inspection Detail
Products
Manufacturers
Violations
Risk Intelligence
Reports
Rulebook
Rule Updates
Audit Logs
Users
Settings
```

## 2. Permission Matrix

| Feature | Inspector | Supervisor | Admin | Auditor |
|---|---:|---:|---:|---:|
| Dashboard | Own/relevant | Team/global scope | Global | Read-only |
| Inspections | Own/assigned | Team/global scope | Global | Read-only |
| Inspection detail | ✓ | ✓ | ✓ | ✓ |
| Products | ✓ | ✓ | ✓ | ✓ read |
| Manufacturers | Limited | ✓ | ✓ | ✓ read |
| Violations/findings | Own | Team | Global | Read |
| Risk Intelligence | — | ✓ | ✓ | ✓ read |
| Reports | Own | Team | Global | ✓ |
| Rulebook | Read | Read | Manage | Read |
| Rule Updates | — | Propose/review as configured | Approve/activate | Read |
| Audit Logs | — | Limited | ✓ | ✓ |
| Users | — | — | ✓ | — |
| Settings | Personal | Team config where allowed | ✓ | — |

## 3. Dashboard

Widgets:

- inspections today/period;
- completion time;
- findings by status;
- manual review queue;
- pending sync/processing jobs;
- manufacturer trend summary;
- risk indicators with explainability.

Charts use Recharts. Filters are server-aware and respect access scope.

## 4. Inspections

Table columns:

`Inspection ID, Date, Inspector, Product, Manufacturer, Status, Findings, Decision, Updated`

Filters: date range, status, category, manufacturer, inspector, source type.

## 5. Inspection Detail

Layout:

1. Case header.
2. Source/evidence gallery.
3. Declarations.
4. Applicable rules.
5. Findings.
6. Verification history.
7. Inspector decision.
8. Report actions.
9. Audit timeline.

## 6. Products

Searchable product catalog, linked manufacturer, prior inspection count, and latest known structured attributes.

## 7. Manufacturers

Manufacturer overview with inspection volume, confirmed/suspected finding patterns, unresolved cases, and time trend. Avoid framing aggregate risk as proof of legal non-compliance.

## 8. Violations / Findings

Queue of findings with:

- status;
- rule reference;
- product/manufacturer;
- evidence availability;
- review state;
- inspector comments.

## 9. Risk Intelligence

Risk signals are operational prioritization only. Example dimensions:

`repeat observation rate, unresolved findings, source mismatch frequency, processing uncertainty, inspection recency`

Every score must expose contributing dimensions.

## 10. Reports

Search report history, regenerate from an explicit inspection snapshot, and open signed report URLs.

## 11. Rulebook

Read-only browser of approved rule definitions and versions. Every rule page shows source metadata and activation lifecycle.

## 12. Rule Updates

Workflow states:

`PROPOSED → REVIEW → APPROVED → ACTIVE`

UI must show the proposed diff, affected modules, tests, source references, approver, and effective date before activation.

## 13. Audit Logs

Filter by actor, action, entity, inspection, and date. Export only through an authorized path.

## 14. Users

Admin-only. Manage role activation/deactivation, not raw authentication secrets.

## 15. Settings

App-level configuration, environment status, rule-engine status, provider availability, retention configuration where permitted.

## 16. Web UX States

Every major page has:

- loading skeleton;
- error with retry;
- empty state with next action;
- populated state;
- permission denied state.

## 17. Accessibility

Keyboard navigation, visible focus, semantic headings, form labels, accessible dialogs, non-color-only status indicators.
''')

w('11_TESTING_STRATEGY.md', r'''# LM-Vision — Testing Strategy

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
''')

w('12_DEMO_SCENARIO.md', r'''# LM-Vision — SIH Demo Scenario

## 1. Flagship Story

**Product:** ABC Shampoo 500 ml  
**Simulated physical package MRP:** ₹249  
**Simulated online listing MRP:** ₹299

Simulated findings:

1. Consumer care not detected.
2. Typography requires verification.
3. Physical MRP differs from e-commerce listing.

These are **demo findings**, not assertions about an actual legal rule unless the rule catalog has been populated from the authoritative source.

## 2. Demo Narrative

The officer opens LM-Vision in the mobile app and starts a new inspection. Guided capture ensures the primary package panel and relevant additional panels are photographed. The platform runs image quality checks, OCR, structured extraction, and visual analysis. The rule engine evaluates only configured, approved rules. The officer sees evidence-linked findings, verifies uncertain results, compares the physical package against an e-commerce listing, records the final decision, and generates a report. The web command center then shows the case in history and dashboard views.

## 3. Demo Sequence

`Login → Start Inspection → Capture images → AI Analysis → Extracted declarations → Applicable rules → Findings → Evidence → Typography measurement → E-commerce comparison → Inspector decision → Generate report → Web dashboard → Inspection history`

## 4. MockProvider Fixture

```json
{
  "inspectionScenario": "ABC_SHAMPOO_500ML",
  "declarations": [
    {"field": "commodity_name", "rawValue": "ABC Shampoo", "confidence": 0.98},
    {"field": "net_quantity", "rawValue": "500 ml", "confidence": 0.99},
    {"field": "mrp", "rawValue": "₹249", "normalizedValue": 249, "confidence": 0.98},
    {"field": "consumer_care", "rawValue": "", "confidence": 0.42}
  ],
  "visualMeasurements": [
    {
      "measurementType": "estimated_character_height",
      "value": 1.7,
      "unit": "mm",
      "confidence": 0.74,
      "isEstimated": true
    }
  ],
  "listing": {
    "mrp": 299
  },
  "expectedDemoStatuses": {
    "consumerCare": "MANUAL_REVIEW",
    "typography": "MANUAL_REVIEW",
    "mrpCrossSource": "SUSPECTED_NON_COMPLIANCE"
  }
}
```

The fixture deliberately uses non-final statuses for uncertain AI/CV outputs and requires human interaction.

## 5. Stage-by-Stage Script

### Stage 1 — Login

Show successful field-user login and role.

### Stage 2 — Start Inspection

Select packaged commodity → personal care → bottle.

### Stage 3 — Capture

Capture front, back, and relevant side panel. Trigger at least one quality hint/retake path if desired.

### Stage 4 — Analysis

Show progress indicators:

`Quality ✓ → OCR ✓ → Extraction ✓ → CV ✓ → Rules ✓`

### Stage 5 — Declarations

Show structured extracted declarations with confidence and image-region links.

### Stage 6 — Findings

Show:

- Consumer care: uncertain/not detected → `MANUAL_REVIEW`.
- Typography: estimated measurement → `MANUAL_REVIEW`.
- MRP physical vs listing: ₹249 vs ₹299 → `SUSPECTED_NON_COMPLIANCE` as an evidence mismatch, pending inspector decision.

### Stage 7 — Evidence

Open the exact package image/crop and listing screenshot supporting each finding.

### Stage 8 — Human Decision

Inspector verifies evidence and enters final decision/comments.

### Stage 9 — Report

Generate PDF including rule references, evidence, confidence, decision, and audit metadata.

### Stage 10 — Web Dashboard

Navigate to the inspection in the web command center. Show status, findings, report, and history.

## 6. Offline Safety Net

Before the demo, switch the environment to `MOCK_PROVIDER=true` and optionally disable live AI keys. The exact same UI and domain workflow must remain usable.

## 7. Demo Acceptance Criteria

- No external AI dependency is required.
- Images and evidence appear consistently in mobile and web.
- Rule status is deterministic for seeded demo data.
- Human verification visibly changes the review state and is audited.
- Report generation succeeds.
- History search finds the case.
''')

w('13_IMPLEMENTATION_ROADMAP.md', r'''# LM-Vision — Implementation Roadmap

## Phase 0 — Planning / Documentation

**Goal:** freeze architecture and source boundaries.  
**Dependencies:** none.  
**Deliverables:** docs, ADRs, domain glossary, source-gating process.  
**Acceptance:** all requested documents reviewed; legal source ingestion blocked until authoritative PDF is available.  
**Risks:** scope creep → use MVP table and architecture constraints.

## Phase 1 — Monorepo + Shared Types

**Goal:** establish repository and canonical contracts.  
**Dependencies:** Phase 0.  
**Deliverables:** apps/services/packages layout, TypeScript schemas, lint/test config.  
**Acceptance:** mobile/web can import shared inspection types.  
**Risks:** duplicated types → single source of truth in shared packages.

## Phase 2 — Supabase + Authentication

**Goal:** database/Auth/Storage/RLS baseline.  
**Dependencies:** Phase 1.  
**Deliverables:** migrations, roles, RLS, private buckets, seed.  
**Acceptance:** role-based test suite passes.  
**Risks:** weak RLS → automated authorization tests.

## Phase 3 — Mobile Shell

**Goal:** field workflow shell.  
**Dependencies:** Phase 2.  
**Deliverables:** navigation, inspection draft, camera flow, local state.  
**Acceptance:** offline draft/capture can be completed.  
**Risks:** UX complexity → field-first task flow.

## Phase 4 — Web Shell

**Goal:** command center.  
**Dependencies:** Phase 2.  
**Deliverables:** dashboard, inspections, detail, history.  
**Acceptance:** seeded cases visible and searchable.

## Phase 5 — Complete Mock AI Workflow

**Goal:** end-to-end demo without external providers.  
**Dependencies:** Phases 3–4.  
**Deliverables:** MockProvider, mock OCR/CV fixtures, findings/evidence path.  
**Acceptance:** flagship demo runs with network disabled for providers.  
**Risks:** fixture drift → version fixtures and schema tests.

## Phase 6 — Gemini

**Goal:** live multimodal provider adapter.  
**Dependencies:** Phase 5.  
**Deliverables:** server-side adapter + schema mapping + safety controls.  
**Acceptance:** benchmark corpus meets agreed extraction metrics.  
**Risks:** provider changes → adapter isolation.

## Phase 7 — OpenAI

**Goal:** second provider.  
**Dependencies:** Phase 6.  
**Deliverables:** adapter + benchmark comparison.  
**Acceptance:** same canonical schema; no domain code imports provider SDK.

## Phase 8 — AI Consensus

**Goal:** structured field-level disagreement handling.  
**Dependencies:** Phases 6–7.  
**Deliverables:** consensus engine, conflict UI/status.  
**Acceptance:** disagreement reliably creates manual review.

## Phase 9 — Rule Engine

**Goal:** source-backed deterministic validation.  
**Dependencies:** Phase 5 schemas + authoritative Rules PDF.  
**Deliverables:** rule model, versioning, validators, rule tests.  
**Acceptance:** every active rule has source metadata + positive/negative tests.  
**Risks:** legal misinterpretation → human/legal review gate.

## Phase 10 — OCR/OpenCV

**Goal:** replace mock extraction/measurement with real engines.  
**Dependencies:** Phase 9 schemas.  
**Deliverables:** PaddleOCR pipeline, preprocessing, CV modules.  
**Acceptance:** benchmark dataset and error metrics documented.

## Phase 11 — Calibration

**Goal:** reference-object physical estimates.  
**Dependencies:** Phase 10.  
**Deliverables:** capture UX + measurement service + confidence.

## Phase 12 — E-commerce

**Goal:** digital listing analysis and cross-source comparison.  
**Dependencies:** Phases 5–10.  
**Deliverables:** URL/screenshot intake, listing schema, comparison engine.

## Phase 13 — Evidence + Human Verification

**Goal:** robust evidence chain and review workflow.  
**Dependencies:** core inspection/findings.  
**Deliverables:** evidence graph, verification audit, signed access.

## Phase 14 — Reports

**Goal:** production-quality PDF.  
**Dependencies:** evidence + decision workflow.  
**Deliverables:** report template and snapshot semantics.

## Phase 15 — Analytics

**Goal:** dashboard metrics and manufacturer/risk views.  
**Dependencies:** enough seeded/historical data.  
**Deliverables:** aggregates, filters, charts.

## Phase 16 — Offline Sync

**Goal:** reliable intermittent-network operation.  
**Dependencies:** mobile local state + API idempotency.  
**Deliverables:** queue, retry, conflict resolution, sync UI.

## Phase 17 — QA

**Goal:** release readiness.  
**Dependencies:** all above.  
**Deliverables:** full test matrix, security tests, demo rehearsal, performance report.  
**Acceptance:** all P0 acceptance gates pass.

## Dependency Snapshot

```mermaid
graph LR
    P0[Phase 0] --> P1[Phase 1]
    P1 --> P2[Phase 2]
    P2 --> P3[Phase 3]
    P2 --> P4[Phase 4]
    P3 --> P5[Phase 5]
    P4 --> P5
    P5 --> P6[Phase 6]
    P6 --> P7[Phase 7]
    P7 --> P8[Phase 8]
    P5 --> P9[Phase 9]
    P9 --> P10[Phase 10]
    P10 --> P11[Phase 11]
    P10 --> P12[Phase 12]
    P9 --> P13[Phase 13]
    P13 --> P14[Phase 14]
    P14 --> P15[Phase 15]
    P5 --> P16[Phase 16]
    P15 --> P17[Phase 17]
    P16 --> P17
```

## Definition of Done

A phase is complete only when code, schema/contracts, automated tests, documentation updates, and acceptance evidence are all present. No phase may silently redefine the canonical inspection model.
''')

w('14_LEGAL_SOURCE_MAPPING.md', r'''# LM-Vision — Legal Source Mapping

## 1. Source Authority

**Required authoritative source:** *The Legal Metrology (Packaged Commodities) Rules, 2011* — project-supplied official PDF.

**Current status:** The project brief is available, but the authoritative PDF itself is not present in the current attached materials. Therefore no legal rule number, sub-rule, threshold, exception, or page is populated below. This is an intentional safety gate.

## 2. Mapping Template

| Rule | Sub-rule | Source page | Software module | Input evidence | Validation method | Output status |
|---|---|---|---|---|---|---|
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | Applicability Engine | Product/package attributes | Applicability predicate | N/A until sourced |
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | Declaration Validator | Declaration evidence | Field/condition validator | N/A until sourced |
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | Quantity Validator | Quantity + unit evidence | Normalized comparison | N/A until sourced |
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | Typography Validator | Calibrated visual measurement | Measurement comparison | N/A until sourced |
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | Placement Validator | Region/geometry evidence | Geometry validator | N/A until sourced |
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | Readability Validator | Image/text evidence | Evidence/manual verification | N/A until sourced |
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | E-commerce Comparator | Physical + listing evidence | Cross-source comparison | N/A until sourced |
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | Exemption Resolver | Product attributes + source exception | Applicability predicate | N/A until sourced |
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | Inspection/Reporting | Inspection state | Workflow rule | N/A until sourced |

## 3. Required Automated-Check Mapping Areas

The project brief requests investigation of applicability, mandatory declarations, manufacturer/packer/importer, generic commodity name, net quantity, manufacture/packing/import date, MRP, consumer-care information, dimensions where relevant, quantity units, typography, principal display panel, spacing, legibility, contrast, language, advertising, inspection/reporting, and exemptions.

Each area must be populated only after exact source verification.

## 4. Source Extraction Record

For every automated legal check create a record like:

```json
{
  "mappingId": "LM-MAP-XXXX",
  "ruleNumber": "<exact source>",
  "subRule": "<exact source or null>",
  "requirement": "<faithful normalized description>",
  "applicability": "<source-backed scope>",
  "condition": [],
  "exceptions": [],
  "validationMethod": "<deterministic evaluator>",
  "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
  "sourcePage": "<PDF page>",
  "softwareModule": "<module>",
  "inputEvidence": ["<evidence type>"],
  "outputStatus": ["PASS", "WARNING", "SUSPECTED_NON_COMPLIANCE", "MANUAL_REVIEW"],
  "humanVerificationRequired": true
}
```

## 5. Legal Mapping Acceptance Gate

A mapping is accepted only when:

1. the exact provision is located in the authoritative PDF;
2. applicability is captured;
3. conditions and exceptions/provisos are captured;
4. the software input evidence is identified;
5. a deterministic validation method is defined;
6. source page/reference is recorded;
7. positive and negative tests exist;
8. a human/legal reviewer approves the rule version.

## 6. Source Integrity

The system should retain the source-document identifier and rule-version snapshot used during each inspection. A future amendment must produce a new rule version rather than silently editing the meaning of a previously executed rule.

## 7. Prohibited Mapping Practices

- invented rule numbers;
- thresholds inferred from memory;
- omission of provisos/exceptions;
- treating an AI explanation as the legal source;
- mapping a visual heuristic directly to “illegal” without a source-backed rule;
- changing source wording materially without review.

## 8. What Happens Until the PDF Is Ingested

The application may execute:

- schema validation;
- OCR;
- image quality checks;
- evidence storage;
- non-legal observations;
- test-only rule fixtures;
- cross-source mismatch observations.

It must not claim production legal coverage for a rule that is still `SOURCE_REQUIRED`.
''')

w('MASTER_IMPLEMENTATION_BRIEF.md', r'''# LM-Vision — Master Implementation Brief

## 1. Project Summary

LM-Vision is an AI-assisted Legal Metrology field and command platform for packaged-commodity inspections. It uses mobile image capture, OCR, multimodal AI, OpenCV, deterministic rule validation, e-commerce listing analysis, evidence management, human verification, searchable history, reporting, dashboards, and operational risk intelligence.

The core architectural contract is:

> **AI interprets evidence. Computer vision measures visual properties. The deterministic rule engine evaluates configured legal requirements. The inspector makes the final decision.**

## 2. Approved Architecture

`React Native Mobile + Next.js Web + Shared Backend + AI Gateway + PaddleOCR/OpenCV Service + Deterministic Rule Engine + Supabase PostgreSQL/Auth/Storage + Report Engine`

Default deployment remains a modular monolith with separately deployable AI/CV and worker boundaries only where justified.

## 3. Approved Tech Stack

| Concern | Choice |
|---|---|
| Mobile | React Native, Expo, TypeScript |
| Web | Next.js, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js API; FastAPI when Python service boundary is justified |
| Data | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| AI | Gemini + OpenAI adapters + MockProvider |
| OCR | PaddleOCR |
| CV | OpenCV |
| Schemas | Zod + TypeScript interfaces |
| Charts | Recharts |
| Reports | PDF generation interface |

## 4. Repository Structure

```text
apps/
  mobile/
  web/
services/
  ai-engine/
packages/
  shared-types/
  validation/
  rules/
  ui/
  config/
supabase/
docs/
tests/
```

## 5. Core Entities

`User, Role, Product, Manufacturer, Inspection, InspectionImage, AIAnalysis, Declaration, Rule, RuleVersion, Finding, Evidence, InspectorDecision, EcommerceListing, CrossSourceComparison, Report, AuditLog`

## 6. API Boundaries

The canonical HTTP surface is `/api/v1` with groups:

`/auth /inspections /products /images /ai /rules /findings /evidence /ecommerce /reports /manufacturers /analytics /audit`

All external payloads are schema validated. Every protected request is role-checked and database-scoped.

## 7. AI Boundaries

### AI may

- extract declarations;
- classify product/package attributes;
- interpret image evidence;
- summarize evidence;
- explain a finding.

### AI may not

- invent or silently alter legal provisions;
- activate rule versions;
- make the final enforcement decision;
- override inspector decisions;
- convert uncertain evidence into PASS.

Provider implementations must implement a common `AIProvider` interface and produce canonical schemas.

## 8. Rule-Engine Boundaries

The rule engine accepts structured evidence and active rule versions. It selects applicable rules and executes deterministic validators.

The engine must emit one of:

`PASS | WARNING | SUSPECTED_NON_COMPLIANCE | MANUAL_REVIEW`

A legal rule cannot be active without source metadata and human/legal approval.

The authoritative Rules PDF is required before populating production legal mappings. The current documentation package intentionally contains source gates rather than fabricated citations.

## 9. Mobile Scope

MUST:

- authentication;
- new inspection;
- category/package selection;
- guided camera capture;
- multi-image review;
- quality checks;
- processing status;
- findings/evidence review;
- inspector decision;
- e-commerce intake;
- history;
- report access;
- offline draft + queued sync.

## 10. Web Scope

MUST:

- login;
- dashboard;
- inspection repository/detail;
- products/manufacturers;
- findings review;
- reports;
- rulebook read view;
- audit logs.

SHOULD:

- risk intelligence;
- manufacturer analytics;
- rule proposal/approval UI.

## 11. MVP Scope

The MVP must demonstrate the complete inspection loop using `MockProvider`, with a live AI provider added without changing the domain model. Real OCR/OpenCV, evidence, deterministic rule execution, e-commerce mismatch detection, human verification, PDF reporting, and web history are part of the target end-to-end prototype.

## 12. Implementation Order

`Phase 0 docs → Phase 1 monorepo/shared types → Phase 2 Supabase/Auth → Phase 3 mobile → Phase 4 web → Phase 5 Mock AI → Phase 6 Gemini → Phase 7 OpenAI → Phase 8 consensus → Phase 9 rule engine → Phase 10 OCR/OpenCV → Phase 11 calibration → Phase 12 e-commerce → Phase 13 evidence/HITL → Phase 14 reports → Phase 15 analytics → Phase 16 offline sync → Phase 17 QA`

## 13. Coding Conventions

1. TypeScript strict mode; avoid `any` for domain payloads.
2. Use shared schemas at API/provider boundaries.
3. Keep domain logic independent of React components and provider SDKs.
4. One canonical field naming convention across DB/API/mobile/web.
5. Prefer explicit enums for statuses.
6. Every async operation has loading/error/retry semantics.
7. Never place secrets in client code.
8. Every legal-rule result references a rule version.
9. Every finding has evidence or an explicit non-evidence rationale approved by the domain design.
10. Every sensitive mutation is audited.

## 14. Non-Negotiable Architectural Constraints

1. Mobile-first field inspection.
2. Web-based command center.
3. One shared backend and domain model.
4. One canonical inspection object.
5. AI provider abstraction.
6. Gemini + OpenAI support.
7. Mock AI fallback.
8. OCR + computer vision.
9. Deterministic rule engine.
10. Versioned rules.
11. Evidence-backed findings.
12. Human-in-the-loop.
13. Secure evidence repository.
14. Audit trail.
15. PDF and editable report path.
16. Offline-capable inspection capture.
17. Searchable history.
18. Manufacturer analytics.
19. Risk intelligence.
20. Explainable AI.

## 15. Canonical Inspection Lifecycle

```text
DRAFT
  ↓
CAPTURED
  ↓
PROCESSING
  ↓
ANALYZED
  ↓
REVIEW_REQUIRED / READY_FOR_DECISION
  ↓
DECIDED
  ↓
REPORT_GENERATED
  ↓
SYNCED / ARCHIVED
```

## 16. Canonical Finding Lifecycle

```text
CREATED
  ↓
UNVERIFIED
  ├─→ VERIFIED
  ├─→ REJECTED
  └─→ NEEDS_MORE_EVIDENCE
```

A `SUSPECTED_NON_COMPLIANCE` finding is not itself the inspector's final legal/enforcement decision.

## 17. Demo Safety Requirement

The flagship demo must work without external AI provider availability. `MockProvider` must reproduce the ABC Shampoo 500 ml scenario deterministically. Live providers are integration adapters, not foundations of the product's domain model.

## 18. Legal Source Gate

Before production legal checks are enabled:

- ingest the official project-supplied Rules PDF;
- record exact rule numbers/sub-rules;
- capture applicability, conditions, exceptions/provisos;
- store source page/reference;
- map deterministic validators;
- create positive and negative tests;
- obtain human/legal approval;
- activate versioned rules.

## 19. Final Build Principle

The coding team must implement **to this contract**, not redesign the architecture while coding. Any required change to the canonical inspection object, AI boundary, rule engine boundary, security model, or workflow must be documented as an architecture decision before implementation.
''')

# Add a root README for navigation.
Path('/mnt/data/LM-Vision/README.md').write_text('''# LM-Vision Documentation\n\nSIH 2026 — AI-Assisted Legal Metrology Inspection & Compliance Platform (Problem Statement 26034).\n\n## Documents\n\n1. `docs/01_PRODUCT_REQUIREMENTS.md`\n2. `docs/02_TECHNICAL_REQUIREMENTS.md`\n3. `docs/03_SYSTEM_ARCHITECTURE.md`\n4. `docs/04_DATABASE_DESIGN.md`\n5. `docs/05_AI_CV_ARCHITECTURE.md`\n6. `docs/06_RULE_ENGINE_SPEC.md`\n7. `docs/07_API_SPECIFICATION.md`\n8. `docs/08_SECURITY_SPECIFICATION.md`\n9. `docs/09_MOBILE_APP_SPEC.md`\n10. `docs/10_WEB_APP_SPEC.md`\n11. `docs/11_TESTING_STRATEGY.md`\n12. `docs/12_DEMO_SCENARIO.md`\n13. `docs/13_IMPLEMENTATION_ROADMAP.md`\n14. `docs/14_LEGAL_SOURCE_MAPPING.md`\n15. `docs/MASTER_IMPLEMENTATION_BRIEF.md`\n\n## Important source gate\n\nThe project brief requires the official *Legal Metrology (Packaged Commodities) Rules, 2011* PDF as the authoritative legal source. That PDF was not present in the attached materials used to generate this package. Consequently, no legal rule numbers, thresholds, exceptions, or page citations have been fabricated; the legal documents provide a source-gated schema and activation workflow.\n''', encoding='utf-8')
print('created', len(list(root.glob('*.md'))), 'docs')
