# @lm-vision/shared-types

This package contains the **canonical domain models, TypeScript contracts, enums, DTOs, and AI provider interfaces** for the LM-Vision system (SIH 2026 Problem Statement 26034).

## Architectural Principles

1. **Single Source of Truth**: All applications (`apps/mobile`, `apps/web`), services (`services/ai-engine`), and packages (`packages/validation`, `packages/rules`, `packages/config`) rely on these shared domain models.
2. **Zod Inference**: Domain models are coupled to runtime Zod schemas using `type X = z.infer<typeof XSchema>` where practical to prevent type drift.
3. **Canonical AI Contract**: The `AIProvider` interface defines a provider-agnostic abstraction. Output schemas do not leak provider-specific quirks (Gemini vs OpenAI vs MockProvider).
4. **Stable & Decoupled**: Entities use UUID-compatible identifiers, UTC ISO-8601 timestamps, and maintain strict decoupling from database-generated schemas or UI view models.

## Package Structure

- `src/enums/`: Canonical state enums (Roles, InspectionStatus, FindingStatus, EvidenceStatus, RuleStatus, Severity, etc.).
- `src/domain/`: Core business entities (User, Product, Manufacturer, Inspection, Finding, Evidence, Decision, Report, AuditLog).
- `src/ai/`: Canonical AI provider contracts (`AIProvider`, `PackageAnalysis`, `Declaration`, `TextRegion`, `VisualMeasurement`, `ImageQuality`, `FindingExplanation`).
- `src/api/`: Shared API envelope contracts (`ApiSuccessResponse`, `ApiErrorResponse`, `PaginationMeta`, `RequestContext`) and endpoint DTOs.
- `src/errors/`: Standard error codes and error representations.
- `src/rules/`: Rule-domain types and validation abstractions.
