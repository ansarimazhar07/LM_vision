# Graph Report - LM-Vision  (2026-09-06)

## Corpus Check
- 211 files · ~131,189 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1763 nodes · 2774 edges · 149 communities (92 shown, 49 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 293 edges (avg confidence: 0.85)
- Token cost: 8,500 input · 1,200 output

## Community Hubs (Navigation)
- AI Engine & Multimodal Providers
- Supabase Database Client
- System Architecture & Sync Specs
- Shared API & Analytics Schemas
- Audit & Statutory Schemas
- Product & Packaging Data Models
- AI Health & Explanation Contracts
- Domain Enums & Core Types
- Supabase Database Client
- Test Suites & Test Fixtures
- Mobile UI Components & Theme
- Computer Vision & Rule Engine Specs
- Build Dom Tsconfig
- Mobile UI Components & Theme
- Mobile Draft & Inspection State
- Serializedapperror Serializedapperrorschema Apivalidationerror
- Product Requirements Inspection
- Inspection Mobile Principles
- Audit & Statutory Schemas
- Shared API & Analytics Schemas
- AI Engine & Multimodal Providers
- Workspace Configuration & Packages
- Scope Boundaries Implementation
- AI Engine & Multimodal Providers
- Workspace Configuration & Packages
- Workspace Configuration & Packages
- Shared API & Analytics Schemas
- AI Engine & Multimodal Providers
- Shared API & Analytics Schemas
- Domain Enums & Core Types
- Domain Enums & Core Types
- Workspace Configuration & Packages
- Audit & Statutory Schemas
- Point Boundingbox Confidencescore
- Mobile UI Components & Theme
- Product & Packaging Data Models
- Stage Demo Flagship
- Workspace Configuration & Packages
- Workspace Configuration & Packages
- Authentication & Session State
- Audit & Statutory Schemas
- AI Engine & Multimodal Providers
- Authentication & Session State
- Test Suites & Test Fixtures
- App Backgroundcolor Adaptiveicon
- AI Health & Explanation Contracts
- AI Engine & Multimodal Providers
- Mobile UI Components & Theme
- Tsconfig Compileroptions Declaration
- Workspace Configuration & Packages
- Test Suites & Test Fixtures
- AI Engine & Multimodal Providers
- Tsconfig Compileroptions Allowjs
- Product & Packaging Data Models
- Workspace Configuration & Packages
- Mobile UI Components & Theme
- Vision Config Security
- Authentication & Session State
- Iruleengine Evaluateall Evaluaterule
- Common Boundingbox Confidencescore
- AI Engine & Multimodal Providers
- AI Engine & Multimodal Providers
- Rule Legalsourcemetadata Numericoperator
- Vision Validation Responsibilities
- Authentication & Session State
- Public Findings Evidence
- Tsconfig Compileroptions Outdir
- Tsconfig Compileroptions Outdir
- Tsconfig Compileroptions Outdir
- Aianalysis Aiusagemetrics Declaration
- Tsconfig Compileroptions Outdir
- Map Status Badge
- Tsconfig Compileroptions Outdir
- Tsconfig Compileroptions Outdir
- AI Engine & Multimodal Providers
- AI Engine & Multimodal Providers
- Workspace Configuration & Packages
- Test Suites & Test Fixtures
- Audit & Statutory Schemas
- Authentication & Session State
- Public Current User
- Inspectorprofile User Inspectorprofileschema
- Apperror Constructor Defaultstatuscodefor
- Apperror Constructor Defaultstatuscodefor
- Inspection Adaptinspectionimage Adaptinspectionrow
- Authentication & Session State
- Helpers Formatzoderror Validateorthrow
- AI Engine & Multimodal Providers
- Manufacturers Products Updated
- Public Inspections Updated
- Public Declarations Analyses
- Aiprovider Analyzeecommercelisting Analyzepackage
- Digitalsignature Report Report
- Public Ecommerce Cross
- Createwebapiresponse Parsedashboardquery Webdashboardstate
- Audit & Statutory Schemas
- Ecommerce Crosssourcecomparison Discrepancyitem
- Evidence Custodyevent Evidence
- Public Rules Rule
- Public Reports Sql
- Audit Public Logs
- Config Metro Getdefaultconfig
- Architectural Principles Vision
- Decision Inspectordecision Penaltyrecommendation
- Finding Finding Findingreview
- Inspection Inspection Inspectionimage
- Report Digitalsignature Report
- User Inspectorprofile User
- Inspection Images Public
- AI Engine & Multimodal Providers
- Workspace Configuration & Packages
- Workspace Configuration & Packages
- Workspace Configuration & Packages
- Workspace Configuration & Packages
- Workspace Configuration & Packages
- Workspace Configuration & Packages
- Workspace Configuration & Packages
- Workspace Configuration & Packages
- Workspace Configuration & Packages
- Workspace Configuration & Packages
- Workspace Configuration & Packages
- Workspace Configuration & Packages
- Vision Web Phase
- AI Engine & Multimodal Providers
- Test Suites & Test Fixtures
- Public Analyses
- Public Audit Logs
- Public Cross Source
- Public Declarations
- Public Ecommerce Listings
- Public Findings
- Public Inspection Images
- Public Inspector Decisions
- Public Manufacturers
- Public Reports
- Public Rules
- Public Evidence
- Public Inspections
- Public Products
- Public Rule Versions
- Public Users

## God Nodes (most connected - your core abstractions)
1. `useInspectionWorkflow()` - 31 edges
2. `LM-Vision — Technical Requirements` - 31 edges
3. `UuidSchema` - 27 edges
4. `IsoTimestampSchema` - 27 edges
5. `LM-Vision — Product Requirements Document` - 26 edges
6. `LM-Vision — Database Design` - 26 edges
7. `LM-Vision — Mobile App Specification` - 26 edges
8. `compilerOptions` - 24 edges
9. `LM-Vision — API Specification` - 24 edges
10. `LM-Vision — Implementation Roadmap` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Supabase Security Notes` --semantically_similar_to--> `Phase 2 Security Decisions`  [INFERRED] [semantically similar]
  supabase/README.md → docs/PHASE_2_IMPLEMENTATION_NOTES.md
- `runBenchmark()` --calls--> `GeminiProvider`  [EXTRACTED]
  scratch/benchmark-gemini-vs-mock.ts → services/ai-engine/src/providers/gemini-provider.ts
- `LM-Vision Documentation` --cites--> `LM-Vision — Product Requirements Document`  [EXTRACTED]
  README.md → docs/01_PRODUCT_REQUIREMENTS.md
- `LM-Vision Documentation` --cites--> `LM-Vision — Technical Requirements`  [EXTRACTED]
  README.md → docs/02_TECHNICAL_REQUIREMENTS.md
- `LM-Vision Documentation` --cites--> `LM-Vision — Database Design`  [EXTRACTED]
  README.md → docs/04_DATABASE_DESIGN.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Phase 2 Database and Security Foundations** — docs_phase_2_implementation_notes_row_level_security, docs_phase_2_implementation_notes_audit_log_foundation, docs_phase_2_implementation_notes_storage_design [INFERRED 0.85]
- **Phase 3 Mobile Shell Architecture** — docs_phase_3_implementation_notes_auth_provider, docs_phase_3_implementation_notes_inspection_draft_provider, docs_phase_3_implementation_notes_app_navigator [EXTRACTED 0.95]
- **LM-Vision Inspection Workflow & Verification Chain** — docs_phase_4_mobile_mvp_notes_in_app_camera_capture, docs_phase_5_mock_ai_implementation_notes_modular_6_stage_pipeline, docs_phase_6_gemini_implementation_notes_gemini_provider, docs_phase_4_mobile_mvp_notes_inspector_decision_gate [INFERRED 0.85]
- **Packaging Inspection Data Integrity & Protection** — docs_phase_5_mock_ai_implementation_notes_provenance_chain, docs_phase_6_gemini_implementation_notes_double_zod_validation, docs_phase_5_mock_ai_implementation_notes_failure_mode_protection [INFERRED 0.85]

## Communities (149 total, 49 thin omitted)

### Community 0 - "AI Engine & Multimodal Providers"
Cohesion: 0.06
Nodes (34): AIExecutionMode, mobileAIAdapter, MobileAIClientAdapter, mobileMockAIAdapter, MobileMockAIClientAdapter, computeMockVisualMeasurements(), extractMockDeclarations(), runMockInspectionPipeline() (+26 more)

### Community 1 - "Supabase Database Client"
Cohesion: 0.05
Nodes (55): Mobile Client Configuration Guardrails, @lm-vision/mobile, In-Memory Draft Store, Mobile Shell Architecture, 1. Logical ER Diagram, 2. Common conventions, 3. Table Definitions, 4. Indexes (+47 more)

### Community 2 - "System Architecture & Sync Specs"
Cohesion: 0.07
Nodes (49): 10. Offline Sync, 1. Architecture Overview, 2. Mobile Architecture, 3. Web Architecture, 4. AI Pipeline, 5. Rule Engine Flow, 6. Physical Inspection Sequence, 7. E-Commerce Sequence (+41 more)

### Community 3 - "Shared API & Analytics Schemas"
Cohesion: 0.04
Nodes (41): AnalyticsComplianceSummary, AnalyticsOverviewQuery, ApiErrorDetail, ApiErrorResponse, ApiSuccessResponse, AttachEvidenceRequest, CreateInspectionRequest, CrossCheckEcommerceRequest (+33 more)

### Community 4 - "Audit & Statutory Schemas"
Cohesion: 0.11
Nodes (33): DeclarationSchema, AuditActionSchema, AuditLogSchema, AuditTargetTypeSchema, BoundingBoxSchema, GeoLocationSchema, IsoTimestampSchema, MetadataRecordSchema (+25 more)

### Community 5 - "Product & Packaging Data Models"
Cohesion: 0.06
Nodes (35): Manufacturer, Product, Manufacturer, Product, ManufacturerSchema, ProductSchema, LegalSourceMetadataSchema, NumericOperatorSchema (+27 more)

### Community 6 - "AI Health & Explanation Contracts"
Cohesion: 0.07
Nodes (35): AIHealthStatus, FindingExplanation, FindingExplanationInput, ImageInputPayload, AIHealthStatusSchema, FindingExplanationInputSchema, FindingExplanationSchema, ImageInputPayloadSchema (+27 more)

### Community 7 - "Domain Enums & Core Types"
Cohesion: 0.05
Nodes (36): AIConfidenceLevel, AIProviderName, AnalysisStatus, DeclarationType, EvidenceStatus, FindingReviewStatus, FindingStatus, InspectionStatus (+28 more)

### Community 8 - "Supabase Database Client"
Cohesion: 0.06
Nodes (34): Supabase Client Package, default, import, types, default, import, types, dependencies (+26 more)

### Community 9 - "Test Suites & Test Fixtures"
Cohesion: 0.06
Nodes (34): dependencies, react, react-native-safe-area-context, react-native-screens, description, devDependencies, @types/node, typescript (+26 more)

### Community 10 - "Mobile UI Components & Theme"
Cohesion: 0.12
Nodes (22): Badge(), BadgeProps, styles, screenColors, ScreenProps, styles, Surface(), StateKind (+14 more)

### Community 11 - "Computer Vision & Rule Engine Specs"
Cohesion: 0.13
Nodes (31): 10. Computer Vision Architecture, 11. Physical Calibration, 12. Legal Rule Engine, 13. Rule Versioning, 14. Canonical Data Model, 15. Database Schema Requirements, 16. API Architecture, 17. Security (+23 more)

### Community 12 - "Build Dom Tsconfig"
Cohesion: 0.06
Nodes (30): **/build, DOM, ES2022, compilerOptions, alwaysStrict, declaration, declarationMap, esModuleInterop (+22 more)

### Community 13 - "Mobile UI Components & Theme"
Cohesion: 0.10
Nodes (22): Button(), styles, Screen(), RootStackParamList, DeferredScreen(), DeferredScreenProps, styles, CameraComponent (+14 more)

### Community 14 - "Mobile Draft & Inspection State"
Cohesion: 0.13
Nodes (17): Field(), styles, getMobileConfig(), MobileConfig, MobileEnvInput, createDemoAnalysis(), DEMO_PRODUCT, MobileAppShellState (+9 more)

### Community 15 - "Serializedapperror Serializedapperrorschema Apivalidationerror"
Cohesion: 0.10
Nodes (21): ApiValidationError, ApiValidationErrorSchema, InspectorDecision, PenaltyRecommendation, InspectorDecisionSchema, PenaltyRecommendationSchema, CustodyEvent, Evidence (+13 more)

### Community 16 - "Product Requirements Inspection"
Cohesion: 0.15
Nodes (26): 10. MVP Scope, 11. Out of Scope, 12. Success Metrics, 13. Risks and Mitigations, 1. Executive Summary, 2. Problem Definition, 3. Target Users, 4. Product Vision (+18 more)

### Community 17 - "Inspection Mobile Principles"
Cohesion: 0.15
Nodes (26): 1. Mobile UX Principles, 2. Navigation, 3. Screen Specifications, 4. Local Inspection State, 5. Sync Rules, 6. Permissions, 7. Offline Behavior, 8. Error Handling (+18 more)

### Community 18 - "Audit & Statutory Schemas"
Cohesion: 0.08
Nodes (24): DatabaseInsertAiAnalysis, DatabaseInsertAuditLog, DatabaseInsertDeclaration, DatabaseInsertInspection, DatabaseInsertInspectionImage, DatabaseInsertManufacturer, DatabaseInsertProduct, DatabaseInsertRole (+16 more)

### Community 19 - "Shared API & Analytics Schemas"
Cohesion: 0.16
Nodes (24): 10. Reports, 11. Analytics, 12. Audit, 13. Authorization Matrix, 14. Rate Limits, 15. Idempotency, 16. API Non-Negotiables, 1. API Conventions (+16 more)

### Community 20 - "AI Engine & Multimodal Providers"
Cohesion: 0.08
Nodes (23): @google/genai, dependencies, @google/genai, @lm-vision/config, @lm-vision/shared-types, @lm-vision/validation, description, devDependencies (+15 more)

### Community 21 - "Workspace Configuration & Packages"
Cohesion: 0.09
Nodes (22): dependencies, @lm-vision/config, @lm-vision/shared-types, @lm-vision/ui, @lm-vision/validation, description, devDependencies, typescript (+14 more)

### Community 22 - "Scope Boundaries Implementation"
Cohesion: 0.18
Nodes (22): 10. Web Scope, 11. MVP Scope, 12. Implementation Order, 13. Coding Conventions, 14. Non-Negotiable Architectural Constraints, 15. Canonical Inspection Lifecycle, 16. Canonical Finding Lifecycle, 17. Demo Safety Requirement (+14 more)

### Community 23 - "AI Engine & Multimodal Providers"
Cohesion: 0.12
Nodes (22): ABC Shampoo 500ml Demo Scenario, Calibrated MRP Cross-Source Finding, Phase 4 Mobile Inspection MVP Notes, Durable Inspection Persistence, Honest Demo Processing Pipeline, In-App Camera Capture with Gallery Fallback, Inspector Statutory Decision Gate, Camera Flashlight / Torch Controls (+14 more)

### Community 24 - "Workspace Configuration & Packages"
Cohesion: 0.09
Nodes (21): default, import, types, dependencies, zod, description, devDependencies, typescript (+13 more)

### Community 25 - "Workspace Configuration & Packages"
Cohesion: 0.09
Nodes (21): dependencies, @lm-vision/shared-types, @lm-vision/validation, zod, description, devDependencies, typescript, exports (+13 more)

### Community 26 - "Shared API & Analytics Schemas"
Cohesion: 0.09
Nodes (21): AnalyticsComplianceSummary, AnalyticsOverviewQuery, ApiErrorDetail, ApiErrorResponse, ApiSuccessResponse, ApiValidationError, AttachEvidenceRequest, CreateInspectionRequest (+13 more)

### Community 27 - "AI Engine & Multimodal Providers"
Cohesion: 0.19
Nodes (21): Definition of Done, Dependency Snapshot, LM-Vision — Implementation Roadmap, Phase 0 — Planning / Documentation, Phase 10 — OCR/OpenCV, Phase 11 — Calibration, Phase 12 — E-commerce, Phase 13 — Evidence + Human Verification (+13 more)

### Community 28 - "Shared API & Analytics Schemas"
Cohesion: 0.10
Nodes (20): AnalyticsComplianceSummarySchema, AnalyticsOverviewQuerySchema, ApiErrorDetailSchema, ApiErrorResponseSchema, AttachEvidenceRequestSchema, CreateInspectionRequestSchema, CrossCheckEcommerceRequestSchema, EvaluateRulesRequestSchema (+12 more)

### Community 29 - "Domain Enums & Core Types"
Cohesion: 0.13
Nodes (17): ConfidenceScoreSchema, CrossSourceComparison, DiscrepancyItem, EcommerceListing, CrossSourceComparisonSchema, DiscrepancyItemSchema, EcommerceListingSchema, Finding (+9 more)

### Community 30 - "Domain Enums & Core Types"
Cohesion: 0.10
Nodes (19): AIConfidenceLevel, AIProviderName, AnalysisStatus, CommodityCategory, DeclarationType, ErrorCode, EvidenceStatus, FindingReviewStatus (+11 more)

### Community 31 - "Workspace Configuration & Packages"
Cohesion: 0.10
Nodes (19): dependencies, @lm-vision/shared-types, zod, description, devDependencies, typescript, exports, @lm-vision/shared-types (+11 more)

### Community 32 - "Audit & Statutory Schemas"
Cohesion: 0.10
Nodes (11): admin, auditor, inspectionByA, inspectionByADecided, inspectorA, inspectorB, MockInspection, MockRuleVersion (+3 more)

### Community 33 - "Point Boundingbox Confidencescore"
Cohesion: 0.11
Nodes (18): BoundingBox, ConfidenceScore, GeoLocation, IsoTimestamp, MetadataRecord, PaginationMeta, Point2D, Polygon (+10 more)

### Community 34 - "Mobile UI Components & Theme"
Cohesion: 0.16
Nodes (14): ConfidenceBar(), ConfidenceBarProps, styles, DECLARATION_TITLES, DeclarationsScreen(), styles, FindingDetailScreen(), Props (+6 more)

### Community 35 - "Product & Packaging Data Models"
Cohesion: 0.22
Nodes (18): 10. Reports, 11. Rulebook, 12. Rule Updates, 13. Audit Logs, 14. Users, 15. Settings, 16. Web UX States, 17. Accessibility (+10 more)

### Community 36 - "Stage Demo Flagship"
Cohesion: 0.22
Nodes (18): 1. Flagship Story, 2. Demo Narrative, 3. Demo Sequence, 4. MockProvider Fixture, 5. Stage-by-Stage Script, 6. Offline Safety Net, 7. Demo Acceptance Criteria, LM-Vision — SIH Demo Scenario (+10 more)

### Community 37 - "Workspace Configuration & Packages"
Cohesion: 0.11
Nodes (17): dependencies, zod, description, devDependencies, typescript, exports, typescript, zod (+9 more)

### Community 38 - "Workspace Configuration & Packages"
Cohesion: 0.11
Nodes (17): dependencies, @lm-vision/shared-types, description, devDependencies, typescript, exports, @lm-vision/shared-types, typescript (+9 more)

### Community 39 - "Authentication & Session State"
Cohesion: 0.23
Nodes (17): 10. File Validation, 11. Rate Limiting, 12. Privacy, 13. Secure Logging, 14. Secret Management, 15. Threat Model Summary, 16. AI-Specific Security Boundary, 1. Security Objectives (+9 more)

### Community 40 - "Audit & Statutory Schemas"
Cohesion: 0.12
Nodes (16): AIAnalysis, AIUsageMetrics, Declaration, ImageQuality, TextRegion, AIAnalysisSchema, AIUsageMetricsSchema, DeclarationSchema (+8 more)

### Community 41 - "AI Engine & Multimodal Providers"
Cohesion: 0.20
Nodes (6): AIEngineGateway, createProductionGateway(), createAiEngineServer(), readRequestBody(), ServerOptions, startAiEngineServer()

### Community 42 - "Authentication & Session State"
Cohesion: 0.18
Nodes (11): App(), AuthContext, AuthContextValue, AuthProvider(), AuthProviderProps, AuthStatus, friendlyAuthError(), DEMO_INSPECTOR_SESSION (+3 more)

### Community 43 - "Test Suites & Test Fixtures"
Cohesion: 0.24
Nodes (16): 10. Source Mapping Record, 11. Unknown / Missing Evidence Semantics, 12. Test Requirement, 13. Rule Ingestion Procedure, 1. Design Principle, 2. Machine-Readable Rule Model, 3. Required Rule Metadata, 4. Rule Categories (+8 more)

### Community 44 - "App Backgroundcolor Adaptiveicon"
Cohesion: 0.13
Nodes (14): backgroundColor, adaptiveIcon, expo, android, ios, name, orientation, scheme (+6 more)

### Community 45 - "AI Health & Explanation Contracts"
Cohesion: 0.13
Nodes (10): AIHealthStatus, AIProvider, FindingExplanation, FindingExplanationInput, ImageInputPayload, ListingAnalysis, ListingAnalysisInput, PackageAnalysis (+2 more)

### Community 46 - "AI Engine & Multimodal Providers"
Cohesion: 0.24
Nodes (9): AIEngineGatewayOptions, GEMINI_PACKAGE_ANALYSIS_PROMPT_VERSION, GEMINI_PACKAGE_ANALYSIS_SYSTEM_INSTRUCTION, GEMINI_SCHEMA_VERSION, GEMINI_STRUCTURED_RESPONSE_JSON_SCHEMA, CacheEntry, GeminiProviderOptions, SUPPORTED_MIME_TYPES (+1 more)

### Community 47 - "Mobile UI Components & Theme"
Cohesion: 0.22
Nodes (11): useAuth(), AppNavigator(), Root, Tabs, getRootRoute(), MainTabParamList, HistoryScreen(), HomeScreen() (+3 more)

### Community 48 - "Tsconfig Compileroptions Declaration"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, declarationMap, outDir, rootDir, sourceMap, exclude, extends (+5 more)

### Community 49 - "Workspace Configuration & Packages"
Cohesion: 0.15
Nodes (13): dependencies, expo, @lm-vision/supabase-client, react, @react-native-async-storage/async-storage, react-native-safe-area-context, @react-navigation/bottom-tabs, react (+5 more)

### Community 50 - "Test Suites & Test Fixtures"
Cohesion: 0.29
Nodes (13): 1. Executive Summary, 2. Implemented Deliverables, 3. Review of Additional Domain Types & Documentation Mapping, 4. Important Architectural Decisions, 5. Commands, 6. Items Deliberately Deferred to Later Phases, A. Repository & Monorepo Foundation, B. Package Boundaries & Responsibilities (+5 more)

### Community 52 - "Tsconfig Compileroptions Allowjs"
Cohesion: 0.17
Nodes (11): compilerOptions, allowJs, jsx, module, moduleResolution, outDir, rootDir, extends (+3 more)

### Community 53 - "Product & Packaging Data Models"
Cohesion: 0.30
Nodes (10): mockEcommerceListing, mockEvidence, mockFinding, mockManufacturer, mockPackageAnalysis, mockProduct, mockReport, mockRule (+2 more)

### Community 54 - "Workspace Configuration & Packages"
Cohesion: 0.18
Nodes (10): description, devDependencies, @types/react, typescript, typescript, main, name, private (+2 more)

### Community 55 - "Mobile UI Components & Theme"
Cohesion: 0.22
Nodes (9): ProgressStepItem, ProgressSteps(), ProgressStepsProps, styles, GEMINI_PIPELINE_STEPS, MOCK_PIPELINE_STEPS, ProcessingScreen(), Props (+1 more)

### Community 56 - "Vision Config Security"
Cohesion: 0.22
Nodes (6): @lm-vision/config, Security Guardrails, ClientEnv, ClientEnvSchema, ServerEnv, ServerEnvSchema

### Community 58 - "Iruleengine Evaluateall Evaluaterule"
Cohesion: 0.20
Nodes (5): IRuleEngine, IRuleValidator, RuleEvaluationContext, RuleEvaluationResult, RuleEvaluationResultSchema

### Community 59 - "Common Boundingbox Confidencescore"
Cohesion: 0.20
Nodes (9): BoundingBox, ConfidenceScore, GeoLocation, IsoTimestamp, MetadataRecord, PaginationMeta, Point2D, Polygon (+1 more)

### Community 60 - "AI Engine & Multimodal Providers"
Cohesion: 0.24
Nodes (4): BENCHMARK_SAMPLES, BenchmarkSample, runBenchmark(), MockAIProvider

### Community 61 - "AI Engine & Multimodal Providers"
Cohesion: 0.20
Nodes (9): GeminiBoundingBox, GeminiBoundingBoxSchema, GeminiDeclaration, GeminiDeclarationSchema, GeminiQuality, GeminiQualitySchema, GeminiStructuredOutputSchema, GeminiTextRegion (+1 more)

### Community 62 - "Rule Legalsourcemetadata Numericoperator"
Cohesion: 0.22
Nodes (8): LegalSourceMetadata, NumericOperator, Rule, RuleApplicability, RuleCondition, RuleThreshold, RuleVersion, ValidationType

### Community 63 - "Vision Validation Responsibilities"
Cohesion: 0.22
Nodes (5): @lm-vision/validation, Responsibilities, APPROVED_METROLOGY_UNITS, BarcodeWithChecksumSchema, LegalMetrologyUnitSchema

### Community 64 - "Authentication & Session State"
Cohesion: 0.28
Nodes (8): public, public.handle_new_auth_user, on_auth_user_created, public.handle_new_auth_user(), public.roles, public.users, public.update_updated_at_column, users_updated_at

### Community 65 - "Public Findings Evidence"
Cohesion: 0.33
Nodes (8): findings_updated_at, public.evidence, public.findings, public.inspector_decisions, public.inspections, public.rule_versions, public.update_updated_at_column, public.users

### Community 66 - "Tsconfig Compileroptions Outdir"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src/**/*, ../../tsconfig.json

### Community 67 - "Tsconfig Compileroptions Outdir"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src/**/*, ../../tsconfig.json

### Community 68 - "Tsconfig Compileroptions Outdir"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src/**/*, ../../tsconfig.json

### Community 69 - "Aianalysis Aiusagemetrics Declaration"
Cohesion: 0.25
Nodes (7): AIAnalysis, AIUsageMetrics, Declaration, ImageQuality, TextRegion, VisualMeasurement, VisualMeasurementType

### Community 70 - "Tsconfig Compileroptions Outdir"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src/**/*, ../../tsconfig.json

### Community 71 - "Map Status Badge"
Cohesion: 0.25
Nodes (6): @lm-vision/ui, Scope in Phase 1, COLOR_TOKENS, INSPECTION_STATUS_MAP, SEVERITY_BADGE_MAP, STATUS_BADGE_MAP

### Community 72 - "Tsconfig Compileroptions Outdir"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src/**/*, ../../tsconfig.json

### Community 73 - "Tsconfig Compileroptions Outdir"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src/**/*, ../../tsconfig.json

### Community 75 - "AI Engine & Multimodal Providers"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src/**/*, ../../tsconfig.json

### Community 76 - "Workspace Configuration & Packages"
Cohesion: 0.29
Nodes (7): scripts, android, build, ios, start, typecheck, web

### Community 77 - "Test Suites & Test Fixtures"
Cohesion: 0.29
Nodes (5): Critical Legal Safeguards, @lm-vision/rules, NOTE: For unit testing and demonstration only. Real statutory rules will be…, TEST_FIXTURE_MANDATORY_GENERIC_NAME_RULE, TEST_FIXTURE_MRP_CROSS_COMPARE_RULE

### Community 78 - "Audit & Statutory Schemas"
Cohesion: 0.29
Nodes (6): AuditAction, AuditLog, AuditTargetType, AuditActionSchema, AuditLogSchema, AuditTargetTypeSchema

### Community 79 - "Authentication & Session State"
Cohesion: 0.38
Nodes (4): DatabaseRowUserWithRole, NOTE: email is not stored in public.users — it lives in auth.users., DatabaseRowRole, DatabaseRowUser

### Community 80 - "Public Current User"
Cohesion: 0.33
Nodes (4): public.roles, public.current_user_has_role(), public.current_user_role(), public.users

### Community 81 - "Inspectorprofile User Inspectorprofileschema"
Cohesion: 0.33
Nodes (5): InspectorProfile, InspectorProfileSchema, UserSchema, User, UserRoleSchema

### Community 84 - "Inspection Adaptinspectionimage Adaptinspectionrow"
Cohesion: 0.33
Nodes (3): InspectionScalarFields, DatabaseRowInspection, DatabaseRowInspectionImage

### Community 86 - "Helpers Formatzoderror Validateorthrow"
Cohesion: 0.47
Nodes (5): formatZodError(), validateOrThrow(), validatePayload, validateSafe(), ValidationResult

### Community 88 - "Manufacturers Products Updated"
Cohesion: 0.47
Nodes (5): manufacturers_updated_at, products_updated_at, public.manufacturers, public.products, public.update_updated_at_column

### Community 89 - "Public Inspections Updated"
Cohesion: 0.33
Nodes (5): inspections_updated_at, public.inspections, public.products, public.update_updated_at_column, public.users

### Community 90 - "Public Declarations Analyses"
Cohesion: 0.47
Nodes (5): declarations_updated_at, public.ai_analyses, public.declarations, public.inspections, public.update_updated_at_column

### Community 92 - "Digitalsignature Report Report"
Cohesion: 0.40
Nodes (4): DigitalSignature, Report, DigitalSignatureSchema, ReportSchema

### Community 93 - "Public Ecommerce Cross"
Cohesion: 0.60
Nodes (4): public.cross_source_comparisons, public.ecommerce_listings, public.evidence, public.inspections

### Community 95 - "Audit & Statutory Schemas"
Cohesion: 0.50
Nodes (3): AuditAction, AuditLog, AuditTargetType

### Community 96 - "Ecommerce Crosssourcecomparison Discrepancyitem"
Cohesion: 0.50
Nodes (3): CrossSourceComparison, DiscrepancyItem, EcommerceListing

### Community 97 - "Evidence Custodyevent Evidence"
Cohesion: 0.50
Nodes (3): CustodyEvent, Evidence, EvidenceType

### Community 98 - "Public Rules Rule"
Cohesion: 0.67
Nodes (3): public.rule_versions, public.rules, public.users

### Community 99 - "Public Reports Sql"
Cohesion: 0.50
Nodes (3): public.reports, public.inspections, public.users

### Community 102 - "Architectural Principles Vision"
Cohesion: 1.00
Nodes (3): Architectural Principles, @lm-vision/shared-types, Package Structure

## Knowledge Gaps
- **754 isolated node(s):** `name`, `slug`, `version`, `orientation`, `userInterfaceStyle` (+749 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 901 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **49 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LM-Vision Documentation` connect `System Architecture & Sync Specs` to `Supabase Database Client`, `Product & Packaging Data Models`, `Stage Demo Flagship`, `Authentication & Session State`, `Computer Vision & Rule Engine Specs`, `Test Suites & Test Fixtures`, `Product Requirements Inspection`, `Inspection Mobile Principles`, `Shared API & Analytics Schemas`, `Scope Boundaries Implementation`, `AI Engine & Multimodal Providers`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `LM-Vision — Implementation Roadmap` connect `AI Engine & Multimodal Providers` to `Test Suites & Test Fixtures`, `System Architecture & Sync Specs`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `LM-Vision — Phase 1 Implementation Notes` connect `Test Suites & Test Fixtures` to `Map Status Badge`, `Test Suites & Test Fixtures`, `Vision Config Security`, `AI Engine & Multimodal Providers`, `Vision Validation Responsibilities`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _754 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AI Engine & Multimodal Providers` be split into smaller, more focused modules?**
  _Cohesion score 0.0645045045045045 - nodes in this community are weakly interconnected._
- **Should `Supabase Database Client` be split into smaller, more focused modules?**
  _Cohesion score 0.05454545454545454 - nodes in this community are weakly interconnected._
- **Should `System Architecture & Sync Specs` be split into smaller, more focused modules?**
  _Cohesion score 0.07397959183673469 - nodes in this community are weakly interconnected._