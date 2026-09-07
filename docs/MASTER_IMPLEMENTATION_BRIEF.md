# LM-Vision — Master Implementation Brief

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
