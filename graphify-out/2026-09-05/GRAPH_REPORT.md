# Graph Report - LM-Vision  (2026-09-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1586 nodes · 2253 edges · 141 communities (90 shown, 43 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 283 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- LM-Vision — Product Requirements Document
- LM-Vision — API Specification
- LM-Vision — Database Design
- LM-Vision — Technical Requirements
- common.js
- LM-Vision — Master Implementation Brief
- compilerOptions
- ai/index.ts
- api/index.ts
- navigation/types.ts
- enums/index.ts
- AIEngineGateway
- rule.ts
- dependencies
- inspection.js
- database.ts
- api/index.js
- draft.ts
- package.json
- api/index.d.ts
- LM-Vision — Implementation Roadmap
- InspectionWorkflowProvider.tsx
- enums/index.d.ts
- phase2-rls.test.ts
- config/package.json
- common.ts
- finding.js
- LM-Vision — SIH Demo Scenario
- ai.ts
- src/types.ts
- LM-Vision — Rule Engine Specification
- enums/index.js
- expo
- LM-Vision — System Architecture
- LM-Vision — AI / Computer Vision Architecture
- shared-types/package.json
- ai/index.d.ts
- LocalInspectionDraft
- supabase-client/package.json
- rules/package.json
- ai-engine/package.json
- web/package.json
- mobile/package.json
- LM-Vision Phase 3 Implementation Notes
- ui/package.json
- validation/package.json
- mock-entities.ts
- @lm-vision/shared-types
- config.ts
- LM-Vision Phase 2 Implementation Notes
- auth/index.ts
- common.d.ts
- compilerOptions
- typescript
- errors/index.ts
- rule.d.ts
- exports
- 20260905000002_roles_users.sql
- 20260905000008_findings_evidence_decisions.sql
- AuthProvider.tsx
- ../../tsconfig.json
- ai.d.ts
- dependencies
- @lm-vision/validation
- scripts
- Supabase Configuration and Migrations
- config/tsconfig.json
- rules/tsconfig.json
- shared-types/tsconfig.json
- adapters/user.ts
- ui/tsconfig.json
- validation/tsconfig.json
- 20260905000001_extensions_and_helpers.sql
- ai-engine/tsconfig.json
- dependencies
- Screen.tsx
- ImageCaptureScreen.tsx
- AppError
- AppError
- AppError
- adapters/inspection.ts
- supabase-client/src/index.ts
- 20260905000003_manufacturers_products.sql
- public.inspections
- 20260905000006_ai_analyses_declarations.sql
- ProgressSteps.tsx
- StateView.tsx
- ProcessingScreen.tsx
- AIProvider
- public.ecommerce_listings
- Badge.tsx
- ConfidenceBar.tsx
- DeclarationsScreen.tsx
- InspectionDetailScreen.tsx
- ReportPreviewScreen.tsx
- web/src/index.ts
- audit.d.ts
- ecommerce.d.ts
- evidence.d.ts
- ./browser
- public.rule_versions
- public.reports
- 20260905000011_audit_logs.sql
- mobile/index.js
- Button.tsx
- Field.tsx
- decision.d.ts
- finding.d.ts
- inspection.d.ts
- report.d.ts
- user.d.ts
- public.inspection_images
- @react-native-async-storage/async-storage
- react-native-screens
- @lm-vision/web
- @lm-vision/ai-engine
- phase2-database.test.ts
- public.ai_analyses
- public.audit_logs
- public.cross_source_comparisons
- public.declarations
- public.ecommerce_listings
- public.findings
- public.inspection_images
- public.inspector_decisions
- public.manufacturers
- public.reports
- public.rules
- public.evidence
- public.inspections
- public.products
- public.rule_versions
- public.users

## God Nodes (most connected - your core abstractions)
1. `LM-Vision — Technical Requirements` - 31 edges
2. `IsoTimestampSchema` - 27 edges
3. `UuidSchema` - 27 edges
4. `LM-Vision — Product Requirements Document` - 26 edges
5. `LM-Vision — Database Design` - 26 edges
6. `LM-Vision — Mobile App Specification` - 26 edges
7. `compilerOptions` - 24 edges
8. `LM-Vision — API Specification` - 24 edges
9. `LM-Vision — Implementation Roadmap` - 22 edges
10. `LM-Vision — Master Implementation Brief` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Supabase Security Notes` --semantically_similar_to--> `Phase 2 Security Decisions`  [INFERRED] [semantically similar]
  supabase/README.md → docs/PHASE_2_IMPLEMENTATION_NOTES.md
- `Architecture principles` --conceptually_related_to--> `Package Structure`  [INFERRED]
  docs/03_SYSTEM_ARCHITECTURE.md → packages/shared-types/README.md
- `LM-Vision Documentation` --cites--> `LM-Vision — Product Requirements Document`  [EXTRACTED]
  README.md → docs/01_PRODUCT_REQUIREMENTS.md
- `LM-Vision Documentation` --cites--> `LM-Vision — API Specification`  [EXTRACTED]
  README.md → docs/07_API_SPECIFICATION.md
- `Row Level Security Policies` --references--> `LM-Vision — Security Specification`  [INFERRED]
  docs/PHASE_2_IMPLEMENTATION_NOTES.md → docs/08_SECURITY_SPECIFICATION.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Phase 3 Mobile Shell Architecture** — docs_phase_3_implementation_notes_auth_provider, docs_phase_3_implementation_notes_inspection_draft_provider, docs_phase_3_implementation_notes_app_navigator [EXTRACTED 0.95]
- **Phase 2 Database and Security Foundations** — docs_phase_2_implementation_notes_row_level_security, docs_phase_2_implementation_notes_audit_log_foundation, docs_phase_2_implementation_notes_storage_design [INFERRED 0.85]

## Communities (141 total, 43 thin omitted)

### Community 0 - "LM-Vision — Product Requirements Document"
Cohesion: 0.06
Nodes (50): 10. MVP Scope, 11. Out of Scope, 12. Success Metrics, 13. Risks and Mitigations, 1. Executive Summary, 2. Problem Definition, 3. Target Users, 4. Product Vision (+42 more)

### Community 1 - "LM-Vision — API Specification"
Cohesion: 0.07
Nodes (57): 11. Analytics, 12. Audit, 13. Authorization Matrix, 14. Rate Limits, 15. Idempotency, 16. API Non-Negotiables, 1. API Conventions, 2. Authentication (+49 more)

### Community 2 - "LM-Vision — Database Design"
Cohesion: 0.08
Nodes (50): 1. Logical ER Diagram, 2. Common conventions, 3. Table Definitions, 4. Indexes, 5. Constraints, 6. RLS Strategy, 7. Audit Strategy, aianalyses (+42 more)

### Community 3 - "LM-Vision — Technical Requirements"
Cohesion: 0.08
Nodes (40): 10. Computer Vision Architecture, 11. Physical Calibration, 12. Legal Rule Engine, 13. Rule Versioning, 14. Canonical Data Model, 15. Database Schema Requirements, 16. API Architecture, 17. Security (+32 more)

### Community 4 - "common.js"
Cohesion: 0.07
Nodes (36): AuditAction, AuditLog, AuditTargetType, AuditActionSchema, AuditLogSchema, AuditTargetTypeSchema, AuditActionSchema, AuditLogSchema (+28 more)

### Community 5 - "LM-Vision — Master Implementation Brief"
Cohesion: 0.09
Nodes (43): 1. Test Pyramid, 2. Test Matrix, 3. Legal Rule Test Requirements, 4. AI Schema Tests, 5. CV Tests, 6. Security Tests, 7. Performance Tests, 8. Demo Reliability Tests (+35 more)

### Community 6 - "compilerOptions"
Cohesion: 0.05
Nodes (41): compilerOptions, declaration, declarationMap, outDir, rootDir, sourceMap, exclude, extends (+33 more)

### Community 7 - "ai/index.ts"
Cohesion: 0.07
Nodes (38): AIHealthStatus, FindingExplanation, FindingExplanationInput, ImageInputPayload, AIHealthStatusSchema, FindingExplanationInputSchema, FindingExplanationSchema, ImageInputPayloadSchema (+30 more)

### Community 8 - "api/index.ts"
Cohesion: 0.05
Nodes (40): AnalyticsComplianceSummary, AnalyticsOverviewQuery, ApiErrorDetail, ApiErrorResponse, ApiSuccessResponse, AttachEvidenceRequest, CreateInspectionRequest, CrossCheckEcommerceRequest (+32 more)

### Community 9 - "navigation/types.ts"
Cohesion: 0.07
Nodes (19): MainTabParamList, RootStackParamList, DeferredScreenProps, styles, Props, styles, Props, styles (+11 more)

### Community 10 - "enums/index.ts"
Cohesion: 0.05
Nodes (36): AIConfidenceLevel, AIProviderName, AnalysisStatus, DeclarationType, EvidenceStatus, FindingReviewStatus, FindingStatus, InspectionStatus (+28 more)

### Community 11 - "AIEngineGateway"
Cohesion: 0.06
Nodes (7): AIEngineGateway, GeminiProviderOptions, GeminiProviderStub, MockAIProvider, MockAIProviderOptions, OpenAIProviderOptions, OpenAIProviderStub

### Community 12 - "rule.ts"
Cohesion: 0.07
Nodes (26): Manufacturer, Product, Manufacturer, Product, ManufacturerSchema, ProductSchema, LegalSourceMetadata, NumericOperator (+18 more)

### Community 13 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, expo, expo-camera, expo-image-picker, @lm-vision/supabase-client, react, react-native, react-native-safe-area-context (+17 more)

### Community 14 - "inspection.js"
Cohesion: 0.11
Nodes (21): AIAnalysisSchema, InspectorDecisionSchema, Inspection, InspectionImage, InspectionImageSchema, InspectionSchema, InspectionImageSchema, InspectionSchema (+13 more)

### Community 15 - "database.ts"
Cohesion: 0.08
Nodes (24): DatabaseInsertAiAnalysis, DatabaseInsertAuditLog, DatabaseInsertDeclaration, DatabaseInsertInspection, DatabaseInsertInspectionImage, DatabaseInsertManufacturer, DatabaseInsertProduct, DatabaseInsertRole (+16 more)

### Community 16 - "api/index.js"
Cohesion: 0.08
Nodes (23): PackageAnalysisInputSchema, PackageAnalysisSchema, AnalyticsComplianceSummarySchema, AnalyticsOverviewQuerySchema, ApiErrorDetailSchema, ApiErrorResponseSchema, AttachEvidenceRequestSchema, CreateInspectionRequestSchema (+15 more)

### Community 17 - "draft.ts"
Cohesion: 0.13
Nodes (13): MobileAppShellState, AppNavigator(), Root, Tabs, getRootRoute(), RootRoute, styles, CreateInspectionDraftInputSchema (+5 more)

### Community 18 - "package.json"
Cohesion: 0.09
Nodes (22): description, devDependencies, @types/node, typescript, vitest, zod, zod, name (+14 more)

### Community 19 - "api/index.d.ts"
Cohesion: 0.09
Nodes (21): AnalyticsComplianceSummary, AnalyticsOverviewQuery, ApiErrorDetail, ApiErrorResponse, ApiSuccessResponse, ApiValidationError, AttachEvidenceRequest, CreateInspectionRequest (+13 more)

### Community 20 - "LM-Vision — Implementation Roadmap"
Cohesion: 0.19
Nodes (21): Definition of Done, Dependency Snapshot, LM-Vision — Implementation Roadmap, Phase 0 — Planning / Documentation, Phase 10 — OCR/OpenCV, Phase 11 — Calibration, Phase 12 — E-commerce, Phase 13 — Evidence + Human Verification (+13 more)

### Community 21 - "InspectionWorkflowProvider.tsx"
Cohesion: 0.16
Nodes (12): createDemoAnalysis(), DEMO_PRODUCT, FUTURE_INSPECTION_ROUTES, inspectionStorage, SaveResult, StorageBackend, getMobileSupabaseClient(), LocalInspectionImage (+4 more)

### Community 22 - "enums/index.d.ts"
Cohesion: 0.10
Nodes (19): AIConfidenceLevel, AIProviderName, AnalysisStatus, CommodityCategory, DeclarationType, ErrorCode, EvidenceStatus, FindingReviewStatus (+11 more)

### Community 23 - "phase2-rls.test.ts"
Cohesion: 0.10
Nodes (11): admin, auditor, inspectionByA, inspectionByADecided, inspectorA, inspectorB, MockInspection, MockRuleVersion (+3 more)

### Community 24 - "config/package.json"
Cohesion: 0.11
Nodes (18): default, import, types, dependencies, zod, description, exports, ./client (+10 more)

### Community 25 - "common.ts"
Cohesion: 0.11
Nodes (18): BoundingBox, ConfidenceScore, GeoLocation, IsoTimestamp, MetadataRecord, PaginationMeta, Point2D, Polygon (+10 more)

### Community 26 - "finding.js"
Cohesion: 0.12
Nodes (16): CrossSourceComparison, DiscrepancyItem, EcommerceListing, CrossSourceComparisonSchema, DiscrepancyItemSchema, EcommerceListingSchema, Finding, FindingReview (+8 more)

### Community 27 - "LM-Vision — SIH Demo Scenario"
Cohesion: 0.22
Nodes (18): 1. Flagship Story, 2. Demo Narrative, 3. Demo Sequence, 4. MockProvider Fixture, 5. Stage-by-Stage Script, 6. Offline Safety Net, 7. Demo Acceptance Criteria, LM-Vision — SIH Demo Scenario (+10 more)

### Community 28 - "ai.ts"
Cohesion: 0.11
Nodes (17): AIAnalysis, AIUsageMetrics, Declaration, ImageQuality, TextRegion, AIAnalysisSchema, AIUsageMetricsSchema, DeclarationSchema (+9 more)

### Community 29 - "src/types.ts"
Cohesion: 0.12
Nodes (10): Critical Legal Safeguards, @lm-vision/rules, NOTE: For unit testing and demonstration only. Real statutory rules will be…, TEST_FIXTURE_MANDATORY_GENERIC_NAME_RULE, TEST_FIXTURE_MRP_CROSS_COMPARE_RULE, IRuleEngine, IRuleValidator, RuleEvaluationContext (+2 more)

### Community 30 - "LM-Vision — Rule Engine Specification"
Cohesion: 0.24
Nodes (16): 10. Source Mapping Record, 11. Unknown / Missing Evidence Semantics, 12. Test Requirement, 13. Rule Ingestion Procedure, 1. Design Principle, 2. Machine-Readable Rule Model, 3. Required Rule Metadata, 4. Rule Categories (+8 more)

### Community 31 - "enums/index.js"
Cohesion: 0.25
Nodes (8): PenaltyRecommendationSchema, ManufacturerSchema, InspectorProfileSchema, InspectorDecisionTypeSchema, PackagingTypeSchema, UserRoleSchema, ValidationStatusSchema, SerializedAppErrorSchema

### Community 32 - "expo"
Cohesion: 0.13
Nodes (14): backgroundColor, adaptiveIcon, expo, android, ios, name, orientation, scheme (+6 more)

### Community 33 - "LM-Vision — System Architecture"
Cohesion: 0.25
Nodes (15): 10. Offline Sync, 1. Architecture Overview, 2. Mobile Architecture, 3. Web Architecture, 4. AI Pipeline, 5. Rule Engine Flow, 6. Physical Inspection Sequence, 7. E-Commerce Sequence (+7 more)

### Community 34 - "LM-Vision — AI / Computer Vision Architecture"
Cohesion: 0.26
Nodes (15): 1. Responsibility Matrix, 2. Processing Pipeline, 3. Canonical Schemas, 4. Confidence Handling, 5. Provider Fallback, 6. Consensus, 7. Low-Confidence Behavior, 8. Cost/Latency Controls (+7 more)

### Community 35 - "shared-types/package.json"
Cohesion: 0.13
Nodes (14): dependencies, zod, description, exports, zod, main, name, private (+6 more)

### Community 36 - "ai/index.d.ts"
Cohesion: 0.13
Nodes (10): AIHealthStatus, AIProvider, FindingExplanation, FindingExplanationInput, ImageInputPayload, ListingAnalysis, ListingAnalysisInput, PackageAnalysis (+2 more)

### Community 37 - "LocalInspectionDraft"
Cohesion: 0.27
Nodes (4): InspectionStorageService, CreateInspectionDraftInput, LocalInspectionDraft, InspectionDraftContextValue

### Community 38 - "supabase-client/package.json"
Cohesion: 0.14
Nodes (13): Supabase Client Package, description, devDependencies, typescript, main, name, private, scripts (+5 more)

### Community 39 - "rules/package.json"
Cohesion: 0.14
Nodes (13): description, devDependencies, typescript, exports, main, name, private, scripts (+5 more)

### Community 40 - "ai-engine/package.json"
Cohesion: 0.14
Nodes (13): description, devDependencies, typescript, exports, main, name, private, scripts (+5 more)

### Community 41 - "web/package.json"
Cohesion: 0.15
Nodes (12): description, devDependencies, typescript, main, name, private, scripts, build (+4 more)

### Community 42 - "mobile/package.json"
Cohesion: 0.17
Nodes (11): description, devDependencies, @types/react, typescript, main, name, private, type (+3 more)

### Community 43 - "LM-Vision Phase 3 Implementation Notes"
Cohesion: 0.18
Nodes (12): Mobile Client Configuration Guardrails, @lm-vision/mobile, In-Memory Draft Store, Mobile Shell Architecture, Supabase Auth Architecture, AppNavigator & Future Route Placeholders, Phase 3 Mobile Architecture & Separation of Concerns, Mobile AuthProvider (+4 more)

### Community 44 - "ui/package.json"
Cohesion: 0.17
Nodes (11): description, exports, main, name, private, scripts, build, typecheck (+3 more)

### Community 45 - "validation/package.json"
Cohesion: 0.17
Nodes (11): description, exports, main, name, private, scripts, build, typecheck (+3 more)

### Community 46 - "mock-entities.ts"
Cohesion: 0.30
Nodes (10): mockEcommerceListing, mockEvidence, mockFinding, mockManufacturer, mockPackageAnalysis, mockProduct, mockReport, mockRule (+2 more)

### Community 47 - "@lm-vision/shared-types"
Cohesion: 0.18
Nodes (11): @lm-vision/shared-types, @lm-vision/shared-types, dependencies, @lm-vision/shared-types, dependencies, @lm-vision/shared-types, zod, zod (+3 more)

### Community 48 - "config.ts"
Cohesion: 0.29
Nodes (7): getMobileConfig(), MobileConfig, MobileEnvInput, LoginScreen(), styles, ProfileScreen(), styles

### Community 49 - "LM-Vision Phase 2 Implementation Notes"
Cohesion: 0.18
Nodes (11): Audit Log Foundation, LM-Vision Phase 2 Implementation Notes, Known Limitations and Deferred Items, Deterministic Migrations Architecture, Phase 2 Overview, RBAC and Role Model, RLS Runtime Verification Requirement, Row Level Security Policies (+3 more)

### Community 51 - "common.d.ts"
Cohesion: 0.20
Nodes (9): BoundingBox, ConfidenceScore, GeoLocation, IsoTimestamp, MetadataRecord, PaginationMeta, Point2D, Polygon (+1 more)

### Community 52 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, allowJs, jsx, outDir, rootDir, extends, include, src/**/*

### Community 53 - "typescript"
Cohesion: 0.22
Nodes (9): devDependencies, typescript, devDependencies, typescript, devDependencies, typescript, devDependencies, typescript (+1 more)

### Community 54 - "errors/index.ts"
Cohesion: 0.28
Nodes (7): ApiValidationError, ApiValidationErrorSchema, ErrorCode, ErrorCodeSchema, SerializedAppError, SerializedAppError, SerializedAppErrorSchema

### Community 55 - "rule.d.ts"
Cohesion: 0.22
Nodes (8): LegalSourceMetadata, NumericOperator, Rule, RuleApplicability, RuleCondition, RuleThreshold, RuleVersion, ValidationType

### Community 56 - "exports"
Cohesion: 0.22
Nodes (9): default, import, types, exports, ./auth, ./types, default, import (+1 more)

### Community 57 - "20260905000002_roles_users.sql"
Cohesion: 0.28
Nodes (8): public, public.handle_new_auth_user, on_auth_user_created, public.handle_new_auth_user(), public.roles, public.users, public.update_updated_at_column, users_updated_at

### Community 58 - "20260905000008_findings_evidence_decisions.sql"
Cohesion: 0.33
Nodes (8): findings_updated_at, public.evidence, public.findings, public.inspector_decisions, public.inspections, public.rule_versions, public.update_updated_at_column, public.users

### Community 59 - "AuthProvider.tsx"
Cohesion: 0.29
Nodes (6): AuthContext, AuthContextValue, AuthProvider(), AuthProviderProps, AuthStatus, friendlyAuthError()

### Community 60 - "../../tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src/**/*, ../../tsconfig.json

### Community 61 - "ai.d.ts"
Cohesion: 0.25
Nodes (7): AIAnalysis, AIUsageMetrics, Declaration, ImageQuality, TextRegion, VisualMeasurement, VisualMeasurementType

### Community 62 - "dependencies"
Cohesion: 0.29
Nodes (7): @lm-vision/config, @lm-vision/config, @lm-vision/config, dependencies, @lm-vision/config, @lm-vision/shared-types, @supabase/supabase-js

### Community 63 - "@lm-vision/validation"
Cohesion: 0.29
Nodes (7): @lm-vision/validation, @lm-vision/validation, dependencies, @lm-vision/shared-types, @lm-vision/validation, zod, zod

### Community 64 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, android, build, ios, start, typecheck, web

### Community 65 - "Supabase Configuration and Migrations"
Cohesion: 0.29
Nodes (7): Phase 2 Security Decisions, Storage Design and Buckets, Supabase Directory Structure, Supabase Configuration and Migrations, Supabase Phase Boundaries, Supabase Local Quick Start, Supabase Security Notes

### Community 66 - "config/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, src/**/*

### Community 67 - "rules/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, src/**/*

### Community 68 - "shared-types/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, src/**/*

### Community 69 - "adapters/user.ts"
Cohesion: 0.38
Nodes (4): DatabaseRowUserWithRole, NOTE: email is not stored in public.users — it lives in auth.users., DatabaseRowRole, DatabaseRowUser

### Community 70 - "ui/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, src/**/*

### Community 71 - "validation/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, src/**/*

### Community 72 - "20260905000001_extensions_and_helpers.sql"
Cohesion: 0.33
Nodes (4): public.roles, public.current_user_has_role(), public.current_user_role(), public.users

### Community 73 - "ai-engine/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, src/**/*

### Community 74 - "dependencies"
Cohesion: 0.33
Nodes (6): @lm-vision/ui, dependencies, @lm-vision/shared-types, @lm-vision/ui, @lm-vision/validation, @lm-vision/ui

### Community 75 - "Screen.tsx"
Cohesion: 0.33
Nodes (3): screenColors, ScreenProps, styles

### Community 76 - "ImageCaptureScreen.tsx"
Cohesion: 0.33
Nodes (4): CameraComponent, Props, styles, SURFACES

### Community 80 - "adapters/inspection.ts"
Cohesion: 0.33
Nodes (3): InspectionScalarFields, DatabaseRowInspection, DatabaseRowInspectionImage

### Community 82 - "20260905000003_manufacturers_products.sql"
Cohesion: 0.47
Nodes (5): manufacturers_updated_at, products_updated_at, public.manufacturers, public.products, public.update_updated_at_column

### Community 83 - "public.inspections"
Cohesion: 0.33
Nodes (5): inspections_updated_at, public.inspections, public.products, public.update_updated_at_column, public.users

### Community 84 - "20260905000006_ai_analyses_declarations.sql"
Cohesion: 0.47
Nodes (5): declarations_updated_at, public.ai_analyses, public.declarations, public.inspections, public.update_updated_at_column

### Community 85 - "ProgressSteps.tsx"
Cohesion: 0.40
Nodes (3): ProgressStepItem, ProgressStepsProps, styles

### Community 86 - "StateView.tsx"
Cohesion: 0.40
Nodes (3): StateKind, styles, titles

### Community 87 - "ProcessingScreen.tsx"
Cohesion: 0.40
Nodes (3): DEMO_STEPS, Props, styles

### Community 89 - "public.ecommerce_listings"
Cohesion: 0.60
Nodes (4): public.cross_source_comparisons, public.ecommerce_listings, public.evidence, public.inspections

### Community 96 - "audit.d.ts"
Cohesion: 0.50
Nodes (3): AuditAction, AuditLog, AuditTargetType

### Community 97 - "ecommerce.d.ts"
Cohesion: 0.50
Nodes (3): CrossSourceComparison, DiscrepancyItem, EcommerceListing

### Community 98 - "evidence.d.ts"
Cohesion: 0.50
Nodes (3): CustodyEvent, Evidence, EvidenceType

### Community 99 - "./browser"
Cohesion: 0.50
Nodes (4): default, import, types, ./browser

### Community 100 - "public.rule_versions"
Cohesion: 0.67
Nodes (3): public.rule_versions, public.rules, public.users

### Community 101 - "public.reports"
Cohesion: 0.50
Nodes (3): public.reports, public.inspections, public.users

## Knowledge Gaps
- **686 isolated node(s):** `ClientEnv`, `ServerEnv`, `AIConfidenceLevel`, `AIProviderName`, `AnalysisStatus` (+681 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 844 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LM-Vision Documentation` connect `LM-Vision — Master Implementation Brief` to `LM-Vision — Product Requirements Document`, `LM-Vision — System Architecture`, `LM-Vision — Database Design`, `LM-Vision — Technical Requirements`, `LM-Vision — AI / Computer Vision Architecture`, `LM-Vision — API Specification`, `LM-Vision — Implementation Roadmap`, `LM-Vision — SIH Demo Scenario`, `LM-Vision — Rule Engine Specification`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `LM-Vision Phase 2 Implementation Notes` connect `LM-Vision Phase 2 Implementation Notes` to `Supabase Configuration and Migrations`, `LM-Vision Phase 3 Implementation Notes`, `supabase-client/package.json`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `Supabase Client Package` connect `supabase-client/package.json` to `LM-Vision Phase 2 Implementation Notes`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **What connects `ClientEnv`, `ServerEnv`, `AIConfidenceLevel` to the rest of the system?**
  _686 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `LM-Vision — Product Requirements Document` be split into smaller, more focused modules?**
  _Cohesion score 0.05827067669172932 - nodes in this community are weakly interconnected._
- **Should `LM-Vision — API Specification` be split into smaller, more focused modules?**
  _Cohesion score 0.06829573934837092 - nodes in this community are weakly interconnected._
- **Should `LM-Vision — Database Design` be split into smaller, more focused modules?**
  _Cohesion score 0.0783673469387755 - nodes in this community are weakly interconnected._