# LM-Vision — Phase 1 Implementation Notes

**Project**: LM-Vision (SIH 2026 Problem Statement 26034)  
**Phase**: Phase 1 — Monorepo + Shared TypeScript Contracts  
**Status**: Completed & Audited  
**Verification Date**: September 2026  

---

## 1. Executive Summary

Phase 1 establishes the canonical monorepo architecture and shared TypeScript contracts for **LM-Vision**. It creates a strictly typed foundation across all applications, backend services, and domain packages without code duplication or type drift.

All shared domain models are inferred directly from runtime **Zod** schemas (`type X = z.infer<typeof XSchema>`), providing runtime validation and static type safety across mobile, web, and backend services.

---

## 2. Implemented Deliverables

### A. Repository & Monorepo Foundation
- Root `package.json` with npm workspaces (`packages/*`, `apps/*`, `services/*`).
- Root `tsconfig.json` enforcing strict TypeScript settings (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `target: ES2022`, `moduleResolution: NodeNext`).
- Centralized `.gitignore` and `.env.example` templates with placeholders only.

### B. Package Boundaries & Responsibilities

1. **`packages/shared-types` (`@lm-vision/shared-types`)**:
   - **Canonical Enums**: `UserRole`, `InspectionStatus`, `FindingStatus`, `FindingReviewStatus`, `EvidenceStatus`, `RuleStatus`, `RuleLifecycle`, `AIConfidenceLevel`, `AIProviderName`, `AnalysisStatus`, `InspectorDecisionType`, `Severity`, `ValidationStatus`, `SyncStatus`, `ErrorCode`, `DeclarationType`, `PackagingType`, `PackageSurface`, `CommodityCategory`.
   - **Domain Entities**: `User`, `Manufacturer`, `Product`, `Inspection`, `InspectionImage`, `AIAnalysis`, `Declaration`, `TextRegion`, `ImageQuality`, `VisualMeasurement`, `Finding`, `Evidence`, `InspectorDecision`, `EcommerceListing`, `CrossSourceComparison`, `Report`, `AuditLog`, `Rule`, `RuleVersion`.
   - **Canonical AI Provider Contract**: `AIProvider` interface, `PackageAnalysisInput`, `PackageAnalysis`, `FindingExplanationInput`, `FindingExplanation`, `ListingAnalysisInput`, `ListingAnalysis`, `AIHealthStatus`.
   - **Shared API Contracts**: `ApiSuccessResponse<T>`, `ApiErrorResponse`, `ApiValidationError`, `PaginationMeta`, `RequestContext`, and DTO definitions for `/api/v1/*`.
   - **Typed Error Model**: `AppError` and `SerializedAppError` with automatic key/secret sanitization.

2. **`packages/validation` (`@lm-vision/validation`)**:
   - Re-exports all canonical schemas and inferred types from `@lm-vision/shared-types`.
   - Runtime helpers: `validateSafe`, `validatePayload`, `validateOrThrow`, `formatZodError`.
   - Custom metrology refinements: EAN/UPC modulo-10 checksum validation, legal metrology unit validation (rejection of non-standard units like `gms`), unit normalization.

3. **`packages/rules` (`@lm-vision/rules`)**:
   - Rule engine abstractions: `ValidationType`, `RuleApplicability`, `RuleCondition`, `RuleThreshold`, `LegalSourceMetadata`, `RuleEvaluationContext`, `RuleEvaluationResult`, `IRuleValidator`, `IRuleEngine`.
   - Strictly non-statutory test fixtures (`TEST_FIXTURE_MANDATORY_GENERIC_NAME_RULE`, `TEST_FIXTURE_MRP_CROSS_COMPARE_RULE`) clearly marked as test fixtures. No real statutory Legal Metrology rules are fabricated.

4. **`packages/config` (`@lm-vision/config`)**:
   - Centralized environment variable validation using Zod.
   - Client/Server security boundary (`getClientEnv()` vs `getServerEnv()`).
   - Browser guard preventing server-side secrets from being loaded on client devices.
   - Configurable model identifiers (`GEMINI_MODEL`, `OPENAI_MODEL`, `MOCK_AI_MODEL`) without hardcoded obsolete IDs.

5. **`packages/ui` (`@lm-vision/ui`)**:
   - Design system tokens, color palettes, status badge maps (`STATUS_BADGE_MAP`, `SEVERITY_BADGE_MAP`, `INSPECTION_STATUS_MAP`).

6. **`services/ai-engine` (`@lm-vision/ai-engine`)**:
   - AI Gateway skeleton and dispatcher (`AIEngineGateway`).
   - `MockAIProvider` for offline, deterministic testing of package analysis, finding explanations, and e-commerce cross-checks.
   - Provider stubs (`GeminiProviderStub`, `OpenAIProviderStub`) typed to the canonical contract, deferring live API calls to Phase 6 and Phase 7 respectively.

7. **`apps/mobile` (`@lm-vision/mobile`)**:
   - Application shell verifying monorepo dependency imports.

8. **`apps/web` (`@lm-vision/web`)**:
   - Application shell verifying monorepo dependency imports.

9. **`supabase/`**:
   - Directory structure preserved for database migrations in Phase 2.

10. **`tests/`**:
    - Automated unit test suite (`tests/validation.test.ts`) covering enums, domain entities, AI provider contracts, invalid payload rejection, API envelopes, error sanitization, browser guard isolation, and environment validation.

---

## 3. Review of Additional Domain Types & Documentation Mapping

The following 8 domain types were established during Phase 1. Each is justified by the approved documentation and marked optional or non-breaking for early-phase workflows:

| Domain Type | Source Documentation | Justification & Architecture Notes |
| :--- | :--- | :--- |
| `InspectorProfile` | `01_PRODUCT_REQUIREMENTS.md` (FR-USER), `08_SECURITY_SPECIFICATION.md` | Captures inspector badge numbers, designation, and jurisdiction zone. Marked optional on `User` so administrative/auditor accounts do not require field officer badges. |
| `FindingReview` | `01_PRODUCT_REQUIREMENTS.md` (FR-INSP-05), `06_RULE_ENGINE_SPEC.md` | Captures inspector verification lifecycle (`UNVERIFIED`, `VERIFIED`, `REJECTED`, `NEEDS_MORE_EVIDENCE`). Marked optional on `Finding` to allow initial automated rule engine output before inspector review. |
| `CustodyEvent` | `08_SECURITY_SPECIFICATION.md` (Section 3) | Records tamper-evident custody events (`COLLECTED`, `HASHED`, `VERIFIED`, `TRANSFERRED`). Defaulted to `[]` on `Evidence` to support simple attachments while enabling forensic tracking. |
| `PenaltyRecommendation` | `01_PRODUCT_REQUIREMENTS.md` (FR-DEC-01..04), `10_WEB_APP_SPEC.md` | Structures statutory notice proposals (show cause, compounding, seizure). Marked optional on `InspectorDecision`. |
| `DiscrepancyItem` | `01_PRODUCT_REQUIREMENTS.md` (FR-ECOM), `07_API_SPECIFICATION.md` | Granular pack vs e-commerce listing comparison differences (MRP mismatch, net qty deviation). Defaulted to `[]` on `CrossSourceComparison`. |
| `DigitalSignature` | `08_SECURITY_SPECIFICATION.md` (Section 5), `10_WEB_APP_SPEC.md` | PKI / digital signature metadata on legal reports. Marked optional on `Report` to permit draft report generation before signing. |
| `RuleThreshold` | `06_RULE_ENGINE_SPEC.md` (Section 3) | Numeric tolerance and dimension bounds (e.g. minimum font height, MPE). Marked optional on `Rule` since presence-only rules do not require thresholds. |
| `LegalSourceMetadata` | `06_RULE_ENGINE_SPEC.md`, `14_LEGAL_SOURCE_MAPPING.md` | Mandatory citation metadata (`sourceDocument`, `sourcePage`, schedule/clause). Required on `Rule` to enforce statutory grounding. |

---

## 4. Important Architectural Decisions

1. **Zod as Single Source of Truth**:
   - Types are inferred directly from Zod schemas (`type X = z.infer<typeof XSchema>`).
   - Eliminates duplicate interface declarations and prevents type drift between runtime validation and compile-time types.
2. **Canonical AI Contract & Model Neutrality**:
   - Multi-model consensus requires that all models map their outputs into the same canonical data structure (`PackageAnalysis`).
   - No vendor-specific SDK types are permitted to leak into downstream business logic.
   - Provider models are configurable through server-side environment variables (`GEMINI_MODEL`, `OPENAI_MODEL`, `MOCK_AI_MODEL`) rather than hardcoded obsolete strings.
3. **Legal / Rule Engine Separation**:
   - The rule engine evaluates declarative data structures using deterministic TypeScript validators.
   - Dynamic LLM-generated code execution is strictly prohibited.
   - Real statutory rules are not created in this phase; they will be populated in Phase 9 (Rule Engine) after authoritative source verification.
4. **Security & Zero Secret Exposure**:
   - Server keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are kept strictly server-side.
   - `getClientEnv()` exposes only public variables (`NEXT_PUBLIC_*`).
   - `getServerEnv()` throws an explicit error if invoked in browser contexts (`window !== undefined`).
   - `AppError.sanitizeMessage` automatically scrubs API keys and authorization tokens from error messages and details.

---

## 5. Commands

### Install Dependencies
```bash
npm install
```

### Typecheck (All Workspaces)
```bash
npm run typecheck
```

### Build (All Workspaces)
```bash
npm run build
```

### Run Unit Tests
```bash
npm test
```

---

## 6. Items Deliberately Deferred to Later Phases

Aligned strictly with `docs/13_IMPLEMENTATION_ROADMAP.md`:

* **Phase 2 — Supabase + Authentication**: Database schemas, PostgreSQL migrations, Row-Level Security (RLS) policies, authentication endpoints, storage bucket configuration.
* **Phase 3 — Mobile Shell**: React Native / Expo screens, on-device camera capture workflow, offline draft storage.
* **Phase 4 — Web Shell**: Next.js dashboard UI, command center, supervisor review screens.
* **Phase 5 — Complete Mock AI Workflow**: End-to-end demo pipeline with mock OCR/CV fixtures and offline demo scenario execution.
* **Phase 6 — Gemini**: Live Gemini multimodal API integration, schema mapping, rate limiting, and benchmark validation.
* **Phase 7 — OpenAI**: Live OpenAI API integration, benchmark comparison, and provider fallback.
* **Phase 8 — AI Consensus**: Multi-model consensus engine, field-level agreement scoring, conflict resolution UI.
* **Phase 9 — Rule Engine**: Authoritative Legal Metrology Rules ingestion, versioning, and deterministic rule validators.
* **Phase 10 — OCR/OpenCV**: PaddleOCR pipeline, image preprocessing, and CV modules.
* **Phase 11 — Calibration**: Photogrammetric reference-object calibration and dimension estimation.
* **Phase 12 — E-commerce**: Online listing ingestion and automated cross-source package comparison.
* **Phase 13 — Evidence + Human Verification**: Full chain of custody graph, audit trails, and inspector sign-off.
* **Phase 14 — Reports**: Production PDF generation and digital signature stamping.
* **Phase 15 — Analytics**: Trend metrics, compliance ratios, and risk heatmaps.
* **Phase 16 — Offline Sync**: Sync queue, retry policies, conflict handling.
* **Phase 17 — QA**: Full test matrix, penetration testing, performance benchmarking.
