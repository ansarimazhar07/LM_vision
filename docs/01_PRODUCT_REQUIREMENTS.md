# LM-Vision — Product Requirements Document

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
