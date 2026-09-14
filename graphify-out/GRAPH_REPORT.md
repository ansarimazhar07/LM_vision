# Graph Report - LM-Vision  (2026-09-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2984 nodes · 5037 edges · 217 communities (154 shown, 44 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `17592903`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- draft.ts
- main.ts
- enums/index.ts
- syncManager.ts
- src/ai/index.ts
- Screen.tsx
- combined_migrations.sql
- ruleEvidenceMapper.ts
- evaluator.ts
- api/index.ts
- report.ts
- LMVisionOcrModule
- compilerOptions
- pdfGenerator.ts
- declarationDetectors.ts
- InspectionWorkflowProvider.tsx
- rule.ts
- ai-engine/src/index.ts
- supabase-client/package.json
- LM-Vision — Technical Requirements
- reportAssembler.ts
- expo
- phase-accuracy-hardening.test.ts
- AppNavigator.tsx
- ProcessingScreen.tsx
- domain/inspection.ts
- LM-Vision — Product Requirements Document
- 3. Screen Specifications
- ProviderHealthTracker
- 3. Table Definitions
- Phase 6: Google Gemini Multimodal AI Integration — Hardening & Production Validation
- LM-Vision — API Specification
- complianceWorkspace.ts
- database.ts
- GeminiProvider
- dependencies
- packerExtractor.ts
- LM-Vision — Master Implementation Brief
- LM-Vision — Implementation Roadmap
- evidenceSchema.ts
- pipeline.ts
- providerRouter.ts
- Phase 8 Implementation Notes: Inspector Review, Evidence Verification & Final Inspection Decision
- perspectiveTransform.ts
- candidateSchema.ts
- findingSchema.ts
- phase2-rls.test.ts
- LM-Vision — Web App Specification
- 5. Stage-by-Stage Script
- 3. The 8 Authoritative Statutory Rules
- config/package.json
- qualityAnalyzer.ts
- perception/src/index.ts
- crossSurfaceFusion.ts
- rules/package.json
- ProviderRouter
- useInspectionWorkflow
- LM-Vision — Security Specification
- Architecture & Implementation Overview
- validation/package.json
- LocalInspectionStore
- indianPackagingBenchmarkDataset.ts
- web/package.json
- LM-Vision — Rule Engine Specification
- perception/package.json
- declarationExtractor.ts
- FusedEvidencePackage
- dependencies
- LM-Vision — AI / Computer Vision Architecture
- LM-Vision — Temporary LOCAL/OFFLINE-ONLY Validation Documentation
- phaseE-inspection-intelligence.test.ts
- 2. Completed Architecture & Module Inventory
- LM-Vision UI/UX Polish & Field Stability Notes
- scripts
- shared-types/package.json
- LM-Vision — System Architecture
- LM-Vision — Phase 1 Implementation Notes
- shared-types/src/index.ts
- common.ts
- ui/package.json
- ai-engine/package.json
- dependencies
- ReportPreviewScreen.tsx
- coordinateCalibration.ts
- ocr/ocrEngine.ts
- Key Architectural Invariants & User Directives
- Key Architectural Invariants & User Directives
- package.json
- auth/index.ts
- helpers.ts
- GrokProvider
- App.tsx
- ui/audit.ts
- LM-Vision — Phase 5: Complete Mock AI Inspection Pipeline Implementation Notes
- 20260906000002_inspector_reviews_and_finalization.sql
- mock-entities.ts
- scripts
- typescript
- 20260905000002_roles_users.sql
- MainActivity
- mobile/package.json
- ImageCaptureScreen.tsx
- LM-Vision — Testing Strategy
- LM-Vision — Legal Source Mapping
- LM-Vision Web Dashboard MVP
- dateExtractor.ts
- ProviderMetricsCollector
- dispersedBenchmarkRunner.ts
- dependencies
- navigation/types.ts
- LM-Vision — Phase 3 Implementation Notes
- config/src/server.ts
- findingExplanationEngine.ts
- 20260905000008_findings_evidence_decisions.sql
- web-dashboard.test.ts
- LM-Vision Phase 11 — Offline/Online Synchronization Notes
- Supabase Configuration & Migrations
- LM-Vision — Phase 2 Implementation Notes
- devDependencies
- finding.ts
- tokens.ts
- OpenAIProviderStub
- compilerOptions
- web/tsconfig.json
- config/tsconfig.json
- dewarping.ts
- declarationValidators.ts
- perception/tsconfig.json
- rules/tsconfig.json
- shared-types/tsconfig.json
- adapters/user.ts
- ui/tsconfig.json
- validation/tsconfig.json
- ai-engine/tsconfig.json
- InspectorReviewScreen.tsx
- 10. `@lm-vision/supabase-client` Package
- adapters/inspection.ts
- supabase-client/src/index.ts
- combineMigrations.cjs
- generateDemoData.cjs
- 20260905000003_manufacturers_products.sql
- public.inspections
- 20260905000006_ai_analyses_declarations.sql
- metro.config.js
- production-mobile-gemini-architecture.test.ts
- ../../tsconfig.json
- public.ecommerce_listings
- gradlew
- 2. Supabase Setup
- 4. Tables & Relationships
- 5. Authentication Architecture
- 6. RBAC + Role Model
- 7. Row Level Security
- 8. Storage Design
- 9. Audit Log Foundation
- Production mobile AI deployment
- @lm-vision/shared-types
- LM-Vision Documentation
- public.rule_versions
- public.reports
- 20260905000011_audit_logs.sql
- 20260906000003_inspection_reports_and_rls.sql
- public.sync_operation_receipts
- controlled-package-dataset.ts
- @lm-vision/web
- 12. Environment Variables
- @lm-vision/config
- @lm-vision/rules
- @lm-vision/ui
- @lm-vision/validation
- test-supabase.ts
- @lm-vision/ai-engine
- public.inspection_images
- public.compliance_assessments
- phase6-gemini.test.ts
- mobile/README.md
- phase2-database.test.ts
- public.audit_logs
- public.cross_source_comparisons
- public.declarations
- public.ecommerce_listings
- public.findings
- public.inspector_decisions
- public.manufacturers
- public.reports
- public.rules
- public.enforce_finalization_lock
- public.ai_analyses
- public.evidence
- public.inspection_images
- public.inspections
- public.products
- public.reports
- public.rule_versions
- public.users
- public.reports
- public.ai_analyses
- public.inspection_images

## God Nodes (most connected - your core abstractions)
1. `useInspectionWorkflow()` - 45 edges
2. `isLocalOnlyMode()` - 31 edges
3. `esc()` - 30 edges
4. `LM-Vision — Technical Requirements` - 27 edges
5. `Screen()` - 25 edges
6. `RootStackParamList` - 24 edges
7. `Button()` - 24 edges
8. `compilerOptions` - 24 edges
9. `detailPage()` - 23 edges
10. `StructuredDeclarationCandidate` - 21 edges

## Surprising Connections (you probably didn't know these)
- `createDraft()` --calls--> `createLocalInspectionDraft()`  [EXTRACTED]
  tests/phase11-sync.test.ts → apps/mobile/src/state/draft.ts
- `DispersedBenchmarkProduct` --references--> `PackagingContainerType`  [EXTRACTED]
  tests/benchmark/dispersedPackagingBenchmarkDataset.ts → packages/perception/src/surfaces/surfaceTaxonomy.ts
- `ServerOptions` --references--> `AIEngineGateway`  [EXTRACTED]
  services/ai-engine/src/server.ts → services/ai-engine/src/gateway.ts
- `runBenchmark()` --calls--> `GeminiProvider`  [EXTRACTED]
  scratch/benchmark-gemini-vs-mock.ts → services/ai-engine/src/providers/gemini-provider.ts
- `runBenchmark()` --calls--> `MockAIProvider`  [EXTRACTED]
  scratch/benchmark-gemini-vs-mock.ts → services/ai-engine/src/providers/mock-provider.ts

## Import Cycles
- None detected.

## Communities (217 total, 44 thin omitted)

### Community 0 - "draft.ts"
Cohesion: 0.05
Nodes (43): DEMO_INSPECTOR_SESSION, DEMO_INSPECTOR_USER, DEMO_STORAGE_KEY, mobileAIAdapter, MobileAIClientAdapter, mobileMockAIAdapter, MobileMockAIClientAdapter, resolveBackendUrl() (+35 more)

### Community 1 - "main.ts"
Cohesion: 0.08
Nodes (90): acknowledgeConflictInDb(), applyInspectionFilters(), client(), count(), createSampleLiveInspection(), dashboard(), DashboardData, decorate() (+82 more)

### Community 2 - "enums/index.ts"
Cohesion: 0.03
Nodes (60): SyncConflict, SyncConflictSchema, SyncOperation, SyncOperationSchema, ActionClass, ActionClassSchema, ActionItemType, ActionItemTypeSchema (+52 more)

### Community 3 - "syncManager.ts"
Cohesion: 0.06
Nodes (24): asJson(), classifyError(), errorMessage(), fileExtension(), FINALIZED_STATUSES, imageStoragePath(), PersistDraft, SyncManager (+16 more)

### Community 4 - "src/ai/index.ts"
Cohesion: 0.04
Nodes (47): AIHealthStatus, AIHealthStatusSchema, AIProvider, FindingExplanation, FindingExplanationInput, FindingExplanationInputSchema, FindingExplanationSchema, ImageInputPayload (+39 more)

### Community 5 - "Screen.tsx"
Cohesion: 0.07
Nodes (43): Badge(), BadgeProps, styles, Button(), styles, Screen(), screenColors, ScreenProps (+35 more)

### Community 6 - "combined_migrations.sql"
Cohesion: 0.07
Nodes (46): public.enforce_finalization_lock, public.inspections, public.users, declarations_updated_at, findings_updated_at, inspections_updated_at, manufacturers_updated_at, on_auth_user_created (+38 more)

### Community 7 - "ruleEvidenceMapper.ts"
Cohesion: 0.09
Nodes (33): evaluateRuleApplicability(), PackageEvaluationContext, EvaluateComplianceHardenedInput, evaluateComplianceWithEvidenceMapping(), CANONICAL_UNIT_MAP, COMMODITY_RELEVANT_SURFACES, extractUnitFromText(), mapEvidenceToRule() (+25 more)

### Community 8 - "evaluator.ts"
Cohesion: 0.07
Nodes (35): AUTHORITATIVE_GSR202E_RULES, AUTHORITATIVE_BUNDLE_ID, AUTHORITATIVE_RULE_BUNDLE_MANIFEST, BUNDLE_CHECKSUM_SHA256, RuleBundleManifest, getAllAuthoritativeRules(), getAuthoritativeRule(), loadAuthoritativeRuleBundle() (+27 more)

### Community 9 - "api/index.ts"
Cohesion: 0.05
Nodes (45): AnalyticsComplianceSummary, AnalyticsComplianceSummarySchema, AnalyticsOverviewQuery, AnalyticsOverviewQuerySchema, ApiErrorDetail, ApiErrorDetailSchema, ApiErrorResponse, ApiErrorResponseSchema (+37 more)

### Community 10 - "report.ts"
Cohesion: 0.06
Nodes (40): AuditAction, AuditActionSchema, AuditLog, AuditLogSchema, AuditTargetType, AuditTargetTypeSchema, UuidSchema, ConflictAcknowledgement (+32 more)

### Community 11 - "LMVisionOcrModule"
Cohesion: 0.10
Nodes (24): Application, MainApplication, InternalBlockInfo, InternalLineInfo, LMVisionOcrModule, ParsedImageInfo, ReconciliationResult, LMVisionOcrPackage (+16 more)

### Community 12 - "compilerOptions"
Cohesion: 0.05
Nodes (41): compilerOptions, declaration, declarationMap, outDir, rootDir, sourceMap, exclude, extends (+33 more)

### Community 13 - "pdfGenerator.ts"
Cohesion: 0.09
Nodes (34): createProductionGateway(), COLORS, display(), drawEvidenceTable(), drawMetaCard(), drawTable(), ensureSpace(), formatDate() (+26 more)

### Community 14 - "declarationDetectors.ts"
Cohesion: 0.09
Nodes (28): LINEAR_DIMENSION_UNITS, FALSE_POSITIVE_NUMBERS, MRP_HEADER_PATTERNS, STANDALONE_CURRENCY_PATTERNS, FALSE_POSITIVE_PATTERNS, QUANTITY_UNIT_MAP, SpatialAssociationScore, CANONICAL_UNIT_MAP (+20 more)

### Community 15 - "InspectionWorkflowProvider.tsx"
Cohesion: 0.10
Nodes (27): ConfidenceBar(), ConfidenceBarProps, styles, styles, ValidationModeBanner(), getMobileConfig(), isLocalOnlyMode(), MobileConfig (+19 more)

### Community 16 - "rule.ts"
Cohesion: 0.06
Nodes (32): ConfidenceScoreSchema, ComplianceAssessment, ComplianceAssessmentSchema, ComplianceEvaluationSummary, ComplianceEvaluationSummarySchema, CrossSourceComparison, CrossSourceComparisonSchema, DiscrepancyItem (+24 more)

### Community 17 - "ai-engine/src/index.ts"
Cohesion: 0.08
Nodes (21): GEMINI_PACKAGE_ANALYSIS_PROMPT_VERSION, GEMINI_PACKAGE_ANALYSIS_SYSTEM_INSTRUCTION, GEMINI_SCHEMA_VERSION, GEMINI_STRUCTURED_RESPONSE_JSON_SCHEMA, CacheEntry, GeminiProviderOptions, GeminiProviderStub, SUPPORTED_MIME_TYPES (+13 more)

### Community 18 - "supabase-client/package.json"
Cohesion: 0.06
Nodes (31): @supabase/supabase-js, default, import, types, default, import, types, dependencies (+23 more)

### Community 19 - "LM-Vision — Technical Requirements"
Cohesion: 0.06
Nodes (31): 10. Computer Vision Architecture, 11. Physical Calibration, 12. Legal Rule Engine, 13. Rule Versioning, 14. Canonical Data Model, 15. Database Schema Requirements, 16. API Architecture, 17. Security (+23 more)

### Community 20 - "reportAssembler.ts"
Cohesion: 0.11
Nodes (24): canonicalStringify(), computeContentHash(), computeReportHash(), INITIAL_HASH, rightRotate(), ROUND_CONSTANTS, sha256(), utf8Encode() (+16 more)

### Community 21 - "expo"
Cohesion: 0.07
Nodes (29): backgroundColor, adaptiveIcon, package, permissions, versionCode, projectId, expo, android (+21 more)

### Community 22 - "phase-accuracy-hardening.test.ts"
Cohesion: 0.11
Nodes (14): ConsumerCareExtractor, validateMRP(), validateNetQuantity(), ImporterExtractor, ManufacturerExtractor, MRPExtractor, NetQuantityExtractor, PackerExtractor (+6 more)

### Community 23 - "AppNavigator.tsx"
Cohesion: 0.12
Nodes (21): AuthContext, AuthContextValue, AuthProvider(), AuthProviderProps, AuthStatus, friendlyAuthError(), useAuth(), Field() (+13 more)

### Community 24 - "ProcessingScreen.tsx"
Cohesion: 0.09
Nodes (23): ProgressStepItem, ProgressSteps(), ProgressStepsProps, styles, MODE_COPY, ProviderBadge(), styles, STAGES (+15 more)

### Community 25 - "domain/inspection.ts"
Cohesion: 0.08
Nodes (25): AIAnalysisSchema, ImageQualitySchema, GeoLocationSchema, MetadataRecordSchema, CustodyEvent, CustodyEventSchema, Evidence, EvidenceSchema (+17 more)

### Community 26 - "LM-Vision — Product Requirements Document"
Cohesion: 0.07
Nodes (26): 10. MVP Scope, 11. Out of Scope, 12. Success Metrics, 13. Risks and Mitigations, 1. Executive Summary, 2. Problem Definition, 3. Target Users, 4. Product Vision (+18 more)

### Community 27 - "3. Screen Specifications"
Cohesion: 0.07
Nodes (26): 1. Mobile UX Principles, 2. Navigation, 3. Screen Specifications, 4. Local Inspection State, 5. Sync Rules, 6. Permissions, 7. Offline Behavior, 8. Error Handling (+18 more)

### Community 28 - "ProviderHealthTracker"
Cohesion: 0.14
Nodes (5): CircuitBreakerOptions, ProviderCircuitBreaker, ProviderHealthTracker, CircuitState, ProviderHealthState

### Community 29 - "3. Table Definitions"
Cohesion: 0.08
Nodes (25): 1. Logical ER Diagram, 2. Common conventions, 3. Table Definitions, 4. Indexes, 5. Constraints, 6. RLS Strategy, 7. Audit Strategy, `ai_analyses` (+17 more)

### Community 30 - "Phase 6: Google Gemini Multimodal AI Integration — Hardening & Production Validation"
Cohesion: 0.08
Nodes (25): 1.1 Boundary Preservation, 1.2 Security Audit & Secret Isolation, 1. Architecture & Security Invariant, 2.1 SDK Selection, 2.2 Model Configuration, 2. Official Google GenAI SDK & Model Strategy, 3. Double Zod Validation Pipeline & Unique ID Minting, 4.1 Version Metadata (+17 more)

### Community 31 - "LM-Vision — API Specification"
Cohesion: 0.08
Nodes (24): 10. Reports, 11. Analytics, 12. Audit, 13. Authorization Matrix, 14. Rate Limits, 15. Idempotency, 16. API Non-Negotiables, 1. API Conventions (+16 more)

### Community 32 - "complianceWorkspace.ts"
Cohesion: 0.11
Nodes (21): FusedFieldEvidence, buildComplianceWorkspace(), BuildComplianceWorkspaceInput, ComplianceWorkspaceView, RuleEvidenceMappingItem, RuleEvidenceSource, WorkspaceActionItem, assertInspectionMutable() (+13 more)

### Community 33 - "database.ts"
Cohesion: 0.08
Nodes (24): DatabaseInsertAiAnalysis, DatabaseInsertAuditLog, DatabaseInsertDeclaration, DatabaseInsertInspection, DatabaseInsertInspectionImage, DatabaseInsertManufacturer, DatabaseInsertProduct, DatabaseInsertRole (+16 more)

### Community 34 - "GeminiProvider"
Cohesion: 0.12
Nodes (7): BENCHMARK_SAMPLES, BenchmarkSample, runBenchmark(), GeminiProvider, GeminiStructuredOutput, MockAIProvider, MockAIProviderOptions

### Community 35 - "dependencies"
Cohesion: 0.08
Nodes (24): dependencies, expo, expo-camera, expo-image-picker, @lm-vision/config, @lm-vision/shared-types, @lm-vision/validation, react (+16 more)

### Community 36 - "packerExtractor.ts"
Cohesion: 0.16
Nodes (16): BoundedWindow, computeBoundingBoxUnion(), DECLARATION_HEADER_PATTERNS, extractBoundedWindows(), matchDeclarationHeader(), sortRegionsReadingOrder(), INDIAN_PIN_REGEX, validateEntityAddress() (+8 more)

### Community 37 - "LM-Vision — Master Implementation Brief"
Cohesion: 0.09
Nodes (22): 10. Web Scope, 11. MVP Scope, 12. Implementation Order, 13. Coding Conventions, 14. Non-Negotiable Architectural Constraints, 15. Canonical Inspection Lifecycle, 16. Canonical Finding Lifecycle, 17. Demo Safety Requirement (+14 more)

### Community 38 - "LM-Vision — Implementation Roadmap"
Cohesion: 0.09
Nodes (21): Definition of Done, Dependency Snapshot, LM-Vision — Implementation Roadmap, Phase 0 — Planning / Documentation, Phase 10 — OCR/OpenCV, Phase 11 — Calibration, Phase 12 — E-commerce, Phase 13 — Evidence + Human Verification (+13 more)

### Community 39 - "evidenceSchema.ts"
Cohesion: 0.19
Nodes (15): ConfidenceEvaluationContext, evaluateEvidenceConfidence(), compareFieldValues(), ComparisonResult, convertToBaseMetricUnit(), normalizeDateForComparison(), DEFAULT_QUALITY, fuseEvidence() (+7 more)

### Community 40 - "pipeline.ts"
Cohesion: 0.18
Nodes (17): computeLocalGeometry(), estimateGeometry(), EstimateGeometryResult, areFieldCandidatesEquivalent(), runFieldAwareConsensus(), MONTH_MAP, normalizeDeclaration(), normalizeDeclarations() (+9 more)

### Community 41 - "providerRouter.ts"
Cohesion: 0.23
Nodes (9): AIEngineGatewayOptions, GrokProviderOptions, classifyProviderError(), ProviderError, RecordMetricParams, ProviderRouterOptions, CanonicalAIObservationResult, FailureCategory (+1 more)

### Community 42 - "Phase 8 Implementation Notes: Inspector Review, Evidence Verification & Final Inspection Decision"
Cohesion: 0.10
Nodes (19): 1. Core Principle & Authority Hierarchy, 1. `InspectorReviewScreen.tsx`, 1. `public.inspector_reviews` Table, 2. `EvidenceViewerScreen.tsx`, 2. `public.inspection_amendments` Table, 2. Review Domain Model (`@lm-vision/shared-types`), 3. Database Migration 015 & Server-Side Security, 3. `ReviewSummaryScreen.tsx` (+11 more)

### Community 43 - "perspectiveTransform.ts"
Cohesion: 0.15
Nodes (17): DeskewResult, LocalCropPlan, LocalCropPlanOptions, mapCropBoxToOriginal(), mapCropTextRegionsToOriginal(), computeHomography(), createPerspectiveRectificationPlan(), DerivedTransformMetadata (+9 more)

### Community 44 - "candidateSchema.ts"
Cohesion: 0.16
Nodes (15): evaluateMultiPassTriggers(), MANDATORY_STATUTORY_FIELDS, MultiPassEvaluation, PreprocessingPassType, CandidateExtractionMethod, ConfidenceTier, InspectorCorrectionProvenance, StructuredDeclarationCandidate (+7 more)

### Community 45 - "findingSchema.ts"
Cohesion: 0.17
Nodes (17): EvidenceSourceType, analyzeEvidenceCompleteness(), STANDARD_CATEGORIES, StandardCategorySpec, EvidenceCompletenessItem, EvidencePresenceStatus, FieldComparisonDifference, FindingConflictDetail (+9 more)

### Community 46 - "phase2-rls.test.ts"
Cohesion: 0.10
Nodes (11): admin, auditor, inspectionByA, inspectionByADecided, inspectorA, inspectorB, MockInspection, MockRuleVersion (+3 more)

### Community 47 - "LM-Vision — Web App Specification"
Cohesion: 0.11
Nodes (18): 10. Reports, 11. Rulebook, 12. Rule Updates, 13. Audit Logs, 14. Users, 15. Settings, 16. Web UX States, 17. Accessibility (+10 more)

### Community 48 - "5. Stage-by-Stage Script"
Cohesion: 0.11
Nodes (18): 1. Flagship Story, 2. Demo Narrative, 3. Demo Sequence, 4. MockProvider Fixture, 5. Stage-by-Stage Script, 6. Offline Safety Net, 7. Demo Acceptance Criteria, LM-Vision — SIH Demo Scenario (+10 more)

### Community 49 - "3. The 8 Authoritative Statutory Rules"
Cohesion: 0.11
Nodes (18): 1. Executive Summary & Architectural Invariant, 1. Rule 6(1)(a) read with Rule 10(1): Manufacturer / Packer / Importer Identity & Address, 2. Rule 6(1)(b): Generic or Common Name of Commodity, 2. Software Distribution Bundle vs Statutory Gazette, 3. Rule 6(1)(c) read with Rule 11, 12, 13: Net Quantity in Standard SI Units, 3. The 8 Authoritative Statutory Rules, 4. Database Schema Migration, 4. Rule 6(1)(d) read with Rule 6(1)(g) Proviso A: Month and Year of Manufacture / Packing (+10 more)

### Community 50 - "config/package.json"
Cohesion: 0.11
Nodes (18): default, import, types, dependencies, zod, description, exports, ./client (+10 more)

### Community 51 - "qualityAnalyzer.ts"
Cohesion: 0.21
Nodes (16): applyGlareReduction(), generateDerivedUuid(), GlareReductionResult, GlareStatus, analyzeLuminanceAndGlare(), assessComprehensiveQuality(), ComprehensiveQualityAssessment, computeLaplacianVariance() (+8 more)

### Community 52 - "perception/src/index.ts"
Cohesion: 0.16
Nodes (13): CONSUMER_CARE_HEADER_REGEX, EMAIL_REGEX, GENERIC_SLOGAN_PATTERNS, PHONE_REGEX, TOLL_FREE_REGEX, validateConsumerCare(), validateProductNameCandidate(), ValidationOutcome (+5 more)

### Community 53 - "crossSurfaceFusion.ts"
Cohesion: 0.18
Nodes (12): ALL_STATUTORY_FIELDS, CrossSurfaceFusionInput, CrossSurfaceFusionPackage, assessSurfaceCaptureQuality(), SurfaceQualityAssessment, AdvisorySurfaceRecommendation, generateSurfaceRecommendations(), getCameraGuidanceForSurface() (+4 more)

### Community 54 - "rules/package.json"
Cohesion: 0.11
Nodes (18): dependencies, @lm-vision/shared-types, @lm-vision/validation, zod, description, devDependencies, typescript, exports (+10 more)

### Community 55 - "ProviderRouter"
Cohesion: 0.17
Nodes (3): AIEngineGateway, ProviderRouter, AIFailoverEvent

### Community 56 - "useInspectionWorkflow"
Cohesion: 0.16
Nodes (14): COPY, styles, SyncStatusBanner(), EvidenceViewerScreen(), Props, styles, { width: SCREEN_WIDTH }, HistoryScreen() (+6 more)

### Community 57 - "LM-Vision — Security Specification"
Cohesion: 0.11
Nodes (17): 10. File Validation, 11. Rate Limiting, 12. Privacy, 13. Secure Logging, 14. Secret Management, 15. Threat Model Summary, 16. AI-Specific Security Boundary, 1. Security Objectives (+9 more)

### Community 58 - "Architecture & Implementation Overview"
Cohesion: 0.11
Nodes (17): 10. Camera Lifecycle & UI Hardening (Sections N & Q), 11. Security Audit & Architectural Cleanliness (Sections M & AB), 1. Mobile Authentication & Profile Governance (Sections A & B), 2. Field Inspection Dashboard (Section C), 3. Legal Metrology Rules Library (Section D), 4. Advisory AI Explanation & Guardrails (Section E), 5. Visual Evidence Heatmap (Section F), 6. LM-Vision Assessment Score (Section G) (+9 more)

### Community 59 - "validation/package.json"
Cohesion: 0.11
Nodes (17): dependencies, @lm-vision/shared-types, zod, description, devDependencies, typescript, exports, zod (+9 more)

### Community 61 - "indianPackagingBenchmarkDataset.ts"
Cohesion: 0.14
Nodes (15): BenchmarkReportSummary, OfflineBenchmarkRunner, ALL_BENCHMARK_PRODUCTS, BenchmarkGroundTruth, BenchmarkImageCondition, BenchmarkImageInstance, BenchmarkProduct, BRANDS (+7 more)

### Community 62 - "web/package.json"
Cohesion: 0.12
Nodes (16): description, devDependencies, typescript, vite, main, name, private, scripts (+8 more)

### Community 63 - "LM-Vision — Rule Engine Specification"
Cohesion: 0.12
Nodes (16): 10. Source Mapping Record, 11. Unknown / Missing Evidence Semantics, 12. Test Requirement, 13. Rule Ingestion Procedure, 1. Design Principle, 2. Machine-Readable Rule Model, 3. Required Rule Metadata, 4. Rule Categories (+8 more)

### Community 64 - "perception/package.json"
Cohesion: 0.12
Nodes (16): dependencies, @lm-vision/shared-types, @lm-vision/validation, zod, description, exports, zod, main (+8 more)

### Community 65 - "declarationExtractor.ts"
Cohesion: 0.12
Nodes (10): CONSUMER_CARE_PATTERNS, DATE_PATTERNS, detectLanguage(), extractDeclarationCandidates(), ExtractedCandidate, METRIC_UNITS_PATTERN, MFR_PATTERNS, MRP_PATTERNS (+2 more)

### Community 66 - "FusedEvidencePackage"
Cohesion: 0.20
Nodes (14): FuseEvidenceResult, FusedEvidencePackage, GenerateActionQueueInput, AnalyzeEvidenceCompletenessInput, EcommerceDiscrepancyAnalysis, EvidenceCompletenessAnalysis, ExplainableFinding, InspectionQualityScoreBreakdown (+6 more)

### Community 67 - "dependencies"
Cohesion: 0.12
Nodes (16): @lm-vision/perception, @lm-vision/supabase-client, @lm-vision/ui, dependencies, @lm-vision/config, @lm-vision/perception, @lm-vision/shared-types, @lm-vision/supabase-client (+8 more)

### Community 68 - "LM-Vision — AI / Computer Vision Architecture"
Cohesion: 0.12
Nodes (15): 1. Responsibility Matrix, 2. Processing Pipeline, 3. Canonical Schemas, 4. Confidence Handling, 5. Provider Fallback, 6. Consensus, 7. Low-Confidence Behavior, 8. Cost/Latency Controls (+7 more)

### Community 69 - "LM-Vision — Temporary LOCAL/OFFLINE-ONLY Validation Documentation"
Cohesion: 0.12
Nodes (15): 10. How to Restore Gemini Mode, 1. Executive Summary, 2. Feature Flag Configuration, 3. Architecture & Offline Execution Flow, 4. Components Disabled in LOCAL_ONLY Mode, 5. What Works 100% Offline, 6. Verification & Test Suite Results, 7. Performance & Latency Timings (+7 more)

### Community 70 - "phaseE-inspection-intelligence.test.ts"
Cohesion: 0.15
Nodes (10): EvidenceStatus, generateInspectorActionQueue(), analyzeEcommerceDiscrepancy(), AnalyzeEcommerceDiscrepancyInput, buildDeclarationDrillDown(), buildEvidenceHeatmapOverlays(), BuildHeatmapOverlaysInput, DeclarationDrillDownRecord (+2 more)

### Community 71 - "2. Completed Architecture & Module Inventory"
Cohesion: 0.13
Nodes (14): 1. Executive Summary & Strategic Context, 2.1 Extended Draft & Storage Engine (`apps/mobile/src/state/` & `services/`), 2.2 In-App Camera & Media Review (`apps/mobile/src/screens/`), 2.3 Honest Analysis & Declarations View, 2.4 Findings, Evidence & Inspector Decision, 2.5 History, Details & Report Preview, 2.6 UI Components & Home Updates, 2. Completed Architecture & Module Inventory (+6 more)

### Community 72 - "LM-Vision UI/UX Polish & Field Stability Notes"
Cohesion: 0.13
Nodes (14): Accessibility, Camera lifecycle and torch fix, Design system changes, Follow-up screenshot fixes, Graphify context reviewed, Known limitations, LM-Vision UI/UX Polish & Field Stability Notes, Loading, error, empty, and offline presentation (+6 more)

### Community 73 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, build:backend, build:packages, lint, postinstall, start:ai, start:backend (+7 more)

### Community 74 - "shared-types/package.json"
Cohesion: 0.13
Nodes (14): dependencies, zod, description, exports, zod, main, name, private (+6 more)

### Community 75 - "LM-Vision — System Architecture"
Cohesion: 0.14
Nodes (13): 10. Offline Sync, 1. Architecture Overview, 2. Mobile Architecture, 3. Web Architecture, 4. AI Pipeline, 5. Rule Engine Flow, 6. Physical Inspection Sequence, 7. E-Commerce Sequence (+5 more)

### Community 76 - "LM-Vision — Phase 1 Implementation Notes"
Cohesion: 0.14
Nodes (13): 1. Executive Summary, 2. Implemented Deliverables, 3. Review of Additional Domain Types & Documentation Mapping, 4. Important Architectural Decisions, 5. Commands, 6. Items Deliberately Deferred to Later Phases, A. Repository & Monorepo Foundation, B. Package Boundaries & Responsibilities (+5 more)

### Community 77 - "shared-types/src/index.ts"
Cohesion: 0.24
Nodes (7): ApiValidationError, ApiValidationErrorSchema, ErrorCode, ErrorCodeSchema, AppError, SerializedAppError, SerializedAppErrorSchema

### Community 78 - "common.ts"
Cohesion: 0.14
Nodes (13): BoundingBox, BoundingBoxSchema, ConfidenceScore, GeoLocation, IsoTimestamp, MetadataRecord, PaginationMeta, PaginationMetaSchema (+5 more)

### Community 79 - "ui/package.json"
Cohesion: 0.14
Nodes (13): dependencies, @lm-vision/shared-types, description, exports, main, name, private, scripts (+5 more)

### Community 80 - "ai-engine/package.json"
Cohesion: 0.14
Nodes (13): description, exports, main, name, private, scripts, build, dev (+5 more)

### Community 81 - "dependencies"
Cohesion: 0.15
Nodes (13): @lm-vision/rules, @lm-vision/rules, @google/genai, pdfkit, dependencies, @google/genai, @lm-vision/config, @lm-vision/rules (+5 more)

### Community 82 - "ReportPreviewScreen.tsx"
Cohesion: 0.18
Nodes (10): StateKind, StateView(), styles, titles, InspectionDetailScreen(), Props, styles, Props (+2 more)

### Community 83 - "coordinateCalibration.ts"
Cohesion: 0.29
Nodes (8): parseBoundingBox(), calibrateBoundingBox(), computeRenderedImageBounds(), NormalizedBox, PixelBoundingBox, projectNormalizedBoxToPixels(), RenderedImageBounds, rotateNormalizedBox()

### Community 84 - "ocr/ocrEngine.ts"
Cohesion: 0.21
Nodes (8): RFC-4122, extractOnDeviceText(), extractTextRegions(), generateUUID(), MockOCREngine, NativeOCRBridge, OCRExecutionStatus, PACKAGE_FIXTURE_MAP

### Community 85 - "Key Architectural Invariants & User Directives"
Cohesion: 0.15
Nodes (12): 1. Strict Separation of Concerns (`packages/perception`), 2. AI and CV are Observational, Not Statutory Authorities, 3. No Fabricated Information, 4. No Silent Overwrite by Gemini (Anti-Overriding Guardrail), 5. Explicit Fallback Semantics, 6. Zero-Network Offline Enforcement, Core Components & Modules, Executive Summary (+4 more)

### Community 86 - "Key Architectural Invariants & User Directives"
Cohesion: 0.15
Nodes (12): 1. Presentation & Wording, 2. Strict Dual Hash Semantics, 3. Forensic Image & Evidence Integrity, 4. Finalization Gating, 5. Cross-Platform Deterministic Hashing, 6. Offline-First Mobile Experience, Executive Summary, Implementation Mapping (+4 more)

### Community 87 - "package.json"
Cohesion: 0.15
Nodes (12): description, name, overrides, react, react-native-safe-area-context, react-native-screens, private, version (+4 more)

### Community 89 - "helpers.ts"
Cohesion: 0.18
Nodes (8): formatZodError(), validateOrThrow(), validatePayload, validateSafe(), ValidationResult, APPROVED_METROLOGY_UNITS, BarcodeWithChecksumSchema, LegalMetrologyUnitSchema

### Community 91 - "App.tsx"
Cohesion: 0.23
Nodes (5): App(), initNativeOcrBridge(), LMVisionNativeOCRBridge, NativeOcrResponse, NativeOcrResultBlock

### Community 92 - "ui/audit.ts"
Cohesion: 0.29
Nodes (9): useCameraLifecycle(), getProviderLabel(), getReviewProgress(), getSummaryCounts(), getSyncLabel(), isSensitiveDisplayKey(), shouldResetCameraForAppState(), UiAnalysisMode (+1 more)

### Community 93 - "LM-Vision — Phase 5: Complete Mock AI Inspection Pipeline Implementation Notes"
Cohesion: 0.17
Nodes (11): 1. Executive Summary, 2.1 Boundary Preservation, 2.2 End-to-End Provenance Chain, 2. Architecture & Provenance Chain, 3. Pipeline Stages Specification, 4. Flashlight & Camera Controls, 5. Security & Authentication Refinement, 6. Failure-Mode Testing Verification (+3 more)

### Community 94 - "20260906000002_inspector_reviews_and_finalization.sql"
Cohesion: 0.26
Nodes (11): public.compliance_assessments, public.enforce_finalization_lock(), public.inspection_amendments, public.inspector_reviews, public.enforce_finalization_lock, public.inspections, public.users, trg_assessments_finalization_lock (+3 more)

### Community 95 - "mock-entities.ts"
Cohesion: 0.30
Nodes (10): mockEcommerceListing, mockEvidence, mockFinding, mockManufacturer, mockPackageAnalysis, mockProduct, mockReport, mockRule (+2 more)

### Community 96 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, android, build, build:apk, bundle:android, expo:prebuild, ios, start (+3 more)

### Community 97 - "typescript"
Cohesion: 0.18
Nodes (11): devDependencies, typescript, devDependencies, typescript, devDependencies, typescript, devDependencies, typescript (+3 more)

### Community 98 - "20260905000002_roles_users.sql"
Cohesion: 0.29
Nodes (10): on_auth_user_created, public.current_user_has_role(), public.current_user_role(), public.handle_new_auth_user(), public.roles, public.users, public, public.handle_new_auth_user (+2 more)

### Community 99 - "MainActivity"
Cohesion: 0.29
Nodes (5): MainActivity, DefaultReactActivityDelegate, Bundle, ReactActivity, ReactActivityDelegate

### Community 100 - "mobile/package.json"
Cohesion: 0.20
Nodes (9): description, devDependencies, @types/react, typescript, main, name, private, version (+1 more)

### Community 101 - "ImageCaptureScreen.tsx"
Cohesion: 0.24
Nodes (8): CameraComponent, ImageCaptureScreen(), Props, styles, SURFACES, CameraGuidance, CameraQualityIndicators, evaluateCameraGuidance()

### Community 102 - "LM-Vision — Testing Strategy"
Cohesion: 0.20
Nodes (9): 1. Test Pyramid, 2. Test Matrix, 3. Legal Rule Test Requirements, 4. AI Schema Tests, 5. CV Tests, 6. Security Tests, 7. Performance Tests, 8. Demo Reliability Tests (+1 more)

### Community 103 - "LM-Vision — Legal Source Mapping"
Cohesion: 0.20
Nodes (9): 1. Source Authority, 2. Mapping Template, 3. Required Automated-Check Mapping Areas, 4. Source Extraction Record, 5. Legal Mapping Acceptance Gate, 6. Source Integrity, 7. Prohibited Mapping Practices, 8. What Happens Until the PDF Is Ingested (+1 more)

### Community 104 - "LM-Vision Web Dashboard MVP"
Cohesion: 0.20
Nodes (9): Architecture, Authentication and roles, Command center and review detail, Dashboard and refresh, Evidence, reports, rules, audit, sync, and analytics, Known limitations, LM-Vision Web Dashboard MVP, Mobile to web flow (+1 more)

### Community 105 - "dateExtractor.ts"
Cohesion: 0.22
Nodes (6): DateExtractor, EXP_HEADER_PATTERNS, IMP_HEADER_PATTERNS, MFD_HEADER_PATTERNS, PKD_HEADER_PATTERNS, validateDateCandidate()

### Community 107 - "dispersedBenchmarkRunner.ts"
Cohesion: 0.38
Nodes (5): DispersedBenchmarkMetrics, DispersedBenchmarkRunner, DISPERSED_BENCHMARK_DATASET, DispersedBenchmarkProduct, DispersedBenchmarkSurface

### Community 108 - "dependencies"
Cohesion: 0.22
Nodes (9): react-native-safe-area-context, react-native-screens, dependencies, react, react-native-safe-area-context, react-native-screens, react, react-native-safe-area-context (+1 more)

### Community 109 - "navigation/types.ts"
Cohesion: 0.36
Nodes (5): createDemoAnalysis(), DEMO_PRODUCT, FUTURE_INSPECTION_ROUTES, LocalInspectionDraftSchema, mockAsyncStorageMap

### Community 110 - "LM-Vision — Phase 3 Implementation Notes"
Cohesion: 0.22
Nodes (8): Architecture, Authentication integration, Dependencies and decisions, Known limitations, LM-Vision — Phase 3 Implementation Notes, Navigation, Screens and UI foundation, Testing and verification

### Community 111 - "config/src/server.ts"
Cohesion: 0.28
Nodes (4): ClientEnv, ClientEnvSchema, ServerEnv, ServerEnvSchema

### Community 112 - "findingExplanationEngine.ts"
Cohesion: 0.39
Nodes (8): buildDeterministicExplanation(), buildSuggestedInspectorAction(), extractDeclarationTypeFromAssessment(), generateExplainableFindings(), GenerateExplainableFindingsInput, getFieldLabel(), getStatutoryRequirementDescription(), getSuggestedCaptureAction()

### Community 113 - "20260905000008_findings_evidence_decisions.sql"
Cohesion: 0.33
Nodes (8): findings_updated_at, public.evidence, public.findings, public.inspector_decisions, public.inspections, public.rule_versions, public.update_updated_at_column, public.users

### Community 114 - "web-dashboard.test.ts"
Cohesion: 0.32
Nodes (6): createWebApiResponse(), parseDashboardQuery(), WebDashboardState, dataSource, source, workspace

### Community 115 - "LM-Vision Phase 11 — Offline/Online Synchronization Notes"
Cohesion: 0.25
Nodes (7): Architecture, Conflict behavior, Lifecycle triggers, LM-Vision Phase 11 — Offline/Online Synchronization Notes, Local and remote state, Scope, Verification

### Community 116 - "Supabase Configuration & Migrations"
Cohesion: 0.25
Nodes (6): Directory Structure, Phase Boundaries, Quick Start (Local Development), Security Notes, Status, Supabase Configuration & Migrations

### Community 117 - "LM-Vision — Phase 2 Implementation Notes"
Cohesion: 0.25
Nodes (8): 11. Seed Data, 13. Test Results, 14. Security Decisions, 15. Known Limitations & Deferred Items, 16. Migration Verification, 1. Overview, 3. Migration Structure, LM-Vision — Phase 2 Implementation Notes

### Community 118 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, @types/node, typescript, vitest, zod, @types/node, vitest, zod

### Community 119 - "finding.ts"
Cohesion: 0.25
Nodes (7): Finding, FindingReview, FindingReviewSchema, FindingSchema, DeclarationTypeSchema, FindingReviewStatusSchema, FindingStatusSchema

### Community 120 - "tokens.ts"
Cohesion: 0.25
Nodes (6): COLOR_TOKENS, INSPECTION_STATUS_MAP, RADII, SEVERITY_BADGE_MAP, SPACING, STATUS_BADGE_MAP

### Community 122 - "compilerOptions"
Cohesion: 0.29
Nodes (7): compilerOptions, allowJs, jsx, module, moduleResolution, outDir, rootDir

### Community 123 - "web/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, src/**/*

### Community 124 - "config/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, src/**/*

### Community 125 - "dewarping.ts"
Cohesion: 0.38
Nodes (6): applyBasicGeometricDewarping(), applyConservativeDeskew(), DeskewStatus, DewarpResult, DewarpStatus, generateDerivedUuid()

### Community 127 - "perception/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, src/**/*

### Community 128 - "rules/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, src/**/*

### Community 129 - "shared-types/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, src/**/*

### Community 130 - "adapters/user.ts"
Cohesion: 0.38
Nodes (4): DatabaseRowUserWithRole, NOTE: email is not stored in public.users — it lives in auth.users., DatabaseRowRole, DatabaseRowUser

### Community 131 - "ui/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, src/**/*

### Community 132 - "validation/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, src/**/*

### Community 133 - "ai-engine/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, src/**/*

### Community 134 - "InspectorReviewScreen.tsx"
Cohesion: 0.47
Nodes (5): getResultBadgeProps(), getSufficiencyBadge(), InspectorReviewScreen(), Props, styles

### Community 135 - "10. `@lm-vision/supabase-client` Package"
Cohesion: 0.33
Nodes (6): 10. `@lm-vision/supabase-client` Package, Architecture:, Client Factories:, Dependencies:, Domain Adapters:, Schema Drift Detection:

### Community 136 - "adapters/inspection.ts"
Cohesion: 0.33
Nodes (3): InspectionScalarFields, DatabaseRowInspection, DatabaseRowInspectionImage

### Community 138 - "combineMigrations.cjs"
Cohesion: 0.33
Nodes (5): dir, files, fs, outputPath, path

### Community 139 - "generateDemoData.cjs"
Cohesion: 0.33
Nodes (5): fs, inspectionsJsonPath, outputPath, path, rawInspections

### Community 140 - "20260905000003_manufacturers_products.sql"
Cohesion: 0.47
Nodes (5): manufacturers_updated_at, products_updated_at, public.manufacturers, public.products, public.update_updated_at_column

### Community 141 - "public.inspections"
Cohesion: 0.33
Nodes (5): inspections_updated_at, public.inspections, public.products, public.update_updated_at_column, public.users

### Community 142 - "20260905000006_ai_analyses_declarations.sql"
Cohesion: 0.47
Nodes (5): declarations_updated_at, public.ai_analyses, public.declarations, public.inspections, public.update_updated_at_column

### Community 143 - "metro.config.js"
Cohesion: 0.40
Nodes (4): config, { getDefaultConfig }, monorepoRoot, path

### Community 145 - "../../tsconfig.json"
Cohesion: 0.40
Nodes (4): extends, include, src/**/*, ../../tsconfig.json

### Community 146 - "public.ecommerce_listings"
Cohesion: 0.60
Nodes (4): public.cross_source_comparisons, public.ecommerce_listings, public.evidence, public.inspections

### Community 147 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 148 - "2. Supabase Setup"
Cohesion: 0.50
Nodes (4): 2. Supabase Setup, Live Project Setup:, Project Configuration, To run locally (when Supabase CLI is installed):

### Community 149 - "4. Tables & Relationships"
Cohesion: 0.50
Nodes (4): 4. Tables & Relationships, Core Entity Chain (as documented in docs/04_DATABASE_DESIGN.md):, Indexes (minimum set from docs/04_DATABASE_DESIGN.md §4):, Key Constraints:

### Community 150 - "5. Authentication Architecture"
Cohesion: 0.50
Nodes (4): 5. Authentication Architecture, Auth Utilities (`@lm-vision/supabase-client/auth`):, Auto-Profile Creation Trigger (`handle_new_auth_user`):, Identity Authority: Supabase Auth

### Community 151 - "6. RBAC + Role Model"
Cohesion: 0.50
Nodes (4): 6. RBAC + Role Model, Important:, Role Escalation Protection:, Roles (from `docs/08_SECURITY_SPECIFICATION.md §3`):

### Community 152 - "7. Row Level Security"
Cohesion: 0.50
Nodes (4): 7. Row Level Security, Key Policy Patterns:, RLS_RUNTIME_VERIFICATION_REQUIRED:, RLS Status:

### Community 153 - "8. Storage Design"
Cohesion: 0.50
Nodes (4): 8. Storage Design, Access Pattern (from docs/08_SECURITY_SPECIFICATION.md §5):, Buckets (all private — `public = false`):, Storage Configuration Method:

### Community 154 - "9. Audit Log Foundation"
Cohesion: 0.50
Nodes (4): 9. Audit Log Foundation, Audited Events (14 action categories):, Design (from docs/08_SECURITY_SPECIFICATION.md §7):, Entity Types Tracked:

### Community 155 - "Production mobile AI deployment"
Cohesion: 0.50
Nodes (3): APK build configuration, Backend deployment, Production mobile AI deployment

### Community 156 - "@lm-vision/shared-types"
Cohesion: 0.50
Nodes (3): Architectural Principles, @lm-vision/shared-types, Package Structure

### Community 157 - "LM-Vision Documentation"
Cohesion: 0.50
Nodes (3): Documents, Important source gate, LM-Vision Documentation

### Community 158 - "public.rule_versions"
Cohesion: 0.67
Nodes (3): public.rule_versions, public.rules, public.users

### Community 159 - "public.reports"
Cohesion: 0.50
Nodes (3): public.reports, public.inspections, public.users

### Community 162 - "public.sync_operation_receipts"
Cohesion: 0.50
Nodes (3): public.sync_operation_receipts, public.inspections, public.users

### Community 165 - "12. Environment Variables"
Cohesion: 0.67
Nodes (3): 12. Environment Variables, Public (safe for browser/mobile):, Server-only (never in client bundles):

## Knowledge Gaps
- **1298 isolated node(s):** `RuleEvaluationResult`, `PipelineStage`, `DashboardData`, `QueryResult`, `SessionProfile` (+1293 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1577 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RFC-4122` connect `ocr/ocrEngine.ts` to `evaluator.ts`, `reportAssembler.ts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `typescript` connect `typescript` to `mobile/package.json`, `supabase-client/package.json`, `rules/package.json`, `devDependencies`, `validation/package.json`, `web/package.json`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `dependencies`, `mobile/package.json`, `dependencies`, `dependencies`, `supabase-client/package.json`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `RuleEvaluationResult`, `PipelineStage`, `DashboardData` to the rest of the system?**
  _1298 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `draft.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.051893408134642355 - nodes in this community are weakly interconnected._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07503506311360449 - nodes in this community are weakly interconnected._
- **Should `enums/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03422619047619048 - nodes in this community are weakly interconnected._