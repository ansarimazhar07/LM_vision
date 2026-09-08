# Graph Report - LM-Vision  (2026-09-06)

## Corpus Check
- 185 files · ~106,233 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1211 nodes · 1837 edges · 119 communities (67 shown, 43 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 95
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114

## God Nodes (most connected - your core abstractions)
1. `useInspectionWorkflow()` - 31 edges
2. `compilerOptions` - 24 edges
3. `Screen()` - 18 edges
4. `Surface()` - 18 edges
5. `Button()` - 17 edges
6. `GeminiProvider` - 17 edges
7. `RootStackParamList` - 16 edges
8. `UuidSchema` - 15 edges
9. `IsoTimestampSchema` - 15 edges
10. `LocalInspectionDraft` - 14 edges

## Surprising Connections (you probably didn't know these)
- `runBenchmark()` --calls--> `GeminiProvider`  [EXTRACTED]
  scratch/benchmark-gemini-vs-mock.ts → services/ai-engine/src/providers/gemini-provider.ts
- `useInspectionDraft()` --calls--> `useInspectionWorkflow()`  [EXTRACTED]
  apps/mobile/src/state/InspectionDraftProvider.tsx → apps/mobile/src/state/InspectionWorkflowProvider.tsx
- `runBenchmark()` --calls--> `MockAIProvider`  [EXTRACTED]
  scratch/benchmark-gemini-vs-mock.ts → services/ai-engine/src/providers/mock-provider.ts
- `ServerOptions` --references--> `AIEngineGateway`  [EXTRACTED]
  services/ai-engine/src/server.ts → services/ai-engine/src/gateway.ts
- `AppNavigator()` --calls--> `useAuth()`  [EXTRACTED]
  apps/mobile/src/navigation/AppNavigator.tsx → apps/mobile/src/auth/AuthProvider.tsx

## Import Cycles
- None detected.

## Communities (119 total, 43 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (44): DEMO_INSPECTOR_SESSION, DEMO_INSPECTOR_USER, DEMO_STORAGE_KEY, createDemoAnalysis(), DEMO_PRODUCT, AIExecutionMode, ensureCanonicalUuid(), idToUuidMap (+36 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (31): AUTHORITATIVE_GSR202E_RULES, AUTHORITATIVE_BUNDLE_ID, AUTHORITATIVE_RULE_BUNDLE_MANIFEST, BUNDLE_CHECKSUM_SHA256, RuleBundleManifest, getAllAuthoritativeRules(), getAuthoritativeRule(), loadAuthoritativeRuleBundle() (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (39): AnalyticsComplianceSummary, AnalyticsComplianceSummarySchema, AnalyticsOverviewQuery, AnalyticsOverviewQuerySchema, ApiErrorDetail, ApiErrorDetailSchema, ApiErrorResponse, ApiErrorResponseSchema (+31 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (38): dependencies, react, react-native-safe-area-context, react-native-screens, description, devDependencies, @types/node, typescript (+30 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (33): default, import, types, default, import, types, dependencies, @lm-vision/config (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (22): Badge(), BadgeProps, styles, Screen(), screenColors, ScreenProps, styles, Surface() (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (29): Manufacturer, ManufacturerSchema, Product, ProductSchema, AIConfidenceLevel, AIProviderName, AnalysisStatus, CommodityCategory (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (30): **/build, DOM, ES2022, compilerOptions, alwaysStrict, declaration, declarationMap, esModuleInterop (+22 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (26): AIHealthStatus, AIHealthStatusSchema, FindingExplanation, FindingExplanationInput, FindingExplanationInputSchema, FindingExplanationSchema, ImageInputPayload, ImageInputPayloadSchema (+18 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (20): StateKind, StateView(), styles, titles, Root, Tabs, DeclarationsScreen(), DeferredScreen() (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (25): @google/genai, dependencies, @google/genai, @lm-vision/config, @lm-vision/shared-types, @lm-vision/validation, description, devDependencies (+17 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (23): AIAnalysis, AIAnalysisSchema, AIUsageMetrics, AIUsageMetricsSchema, Declaration, DeclarationSchema, ImageQuality, ImageQualitySchema (+15 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (24): DatabaseInsertAiAnalysis, DatabaseInsertAuditLog, DatabaseInsertDeclaration, DatabaseInsertInspection, DatabaseInsertInspectionImage, DatabaseInsertManufacturer, DatabaseInsertProduct, DatabaseInsertRole (+16 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (22): dependencies, @lm-vision/config, @lm-vision/shared-types, @lm-vision/ui, @lm-vision/validation, description, devDependencies, typescript (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (15): App(), AuthContext, AuthContextValue, AuthProvider(), AuthProviderProps, AuthStatus, friendlyAuthError(), MobileAppShellState (+7 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (21): default, import, types, dependencies, zod, description, devDependencies, typescript (+13 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (21): dependencies, @lm-vision/shared-types, @lm-vision/validation, zod, description, devDependencies, typescript, exports (+13 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (20): AuditAction, AuditActionSchema, AuditLog, AuditLogSchema, AuditTargetType, AuditTargetTypeSchema, BoundingBox, BoundingBoxSchema (+12 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (16): IsoTimestampSchema, UuidSchema, InspectorDecision, InspectorDecisionSchema, PenaltyRecommendation, PenaltyRecommendationSchema, DigitalSignature, DigitalSignatureSchema (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.10
Nodes (19): dependencies, @lm-vision/shared-types, zod, description, devDependencies, typescript, exports, @lm-vision/shared-types (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.10
Nodes (11): admin, auditor, inspectionByA, inspectionByADecided, inspectorA, inspectorB, MockInspection, MockRuleVersion (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (17): LegalSourceMetadata, NumericOperator, NumericOperatorSchema, Rule, RuleApplicability, RuleApplicabilitySchema, RuleCondition, RuleConditionSchema (+9 more)

### Community 22 - "Community 22"
Cohesion: 0.20
Nodes (12): useAuth(), Button(), styles, Field(), styles, getMobileConfig(), MobileConfig, MobileEnvInput (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (17): dependencies, zod, description, devDependencies, typescript, exports, typescript, zod (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (17): dependencies, @lm-vision/shared-types, description, devDependencies, typescript, exports, @lm-vision/shared-types, typescript (+9 more)

### Community 25 - "Community 25"
Cohesion: 0.13
Nodes (14): backgroundColor, adaptiveIcon, expo, android, ios, name, orientation, scheme (+6 more)

### Community 26 - "Community 26"
Cohesion: 0.24
Nodes (9): AIEngineGatewayOptions, GEMINI_PACKAGE_ANALYSIS_PROMPT_VERSION, GEMINI_PACKAGE_ANALYSIS_SYSTEM_INSTRUCTION, GEMINI_SCHEMA_VERSION, GEMINI_STRUCTURED_RESPONSE_JSON_SCHEMA, CacheEntry, GeminiProviderOptions, SUPPORTED_MIME_TYPES (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, declarationMap, outDir, rootDir, sourceMap, exclude, extends (+5 more)

### Community 28 - "Community 28"
Cohesion: 0.15
Nodes (13): dependencies, expo, expo-camera, @lm-vision/supabase-client, react-native-screens, @react-navigation/bottom-tabs, @react-navigation/native-stack, react-native-screens (+5 more)

### Community 29 - "Community 29"
Cohesion: 0.19
Nodes (10): ConfidenceBar(), ConfidenceBarProps, styles, FindingDetailScreen(), Props, styles, getResultBadgeProps(), InspectionResultScreen() (+2 more)

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (8): formatZodError(), validateOrThrow(), validatePayload, validateSafe(), ValidationResult, APPROVED_METROLOGY_UNITS, BarcodeWithChecksumSchema, LegalMetrologyUnitSchema

### Community 32 - "Community 32"
Cohesion: 0.23
Nodes (7): FUTURE_INSPECTION_ROUTES, MainTabParamList, RootStackParamList, HomeScreen(), styles, NewInspectionScreen(), styles

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (11): compilerOptions, allowJs, jsx, module, moduleResolution, outDir, rootDir, extends (+3 more)

### Community 34 - "Community 34"
Cohesion: 0.17
Nodes (11): GeminiBoundingBox, GeminiBoundingBoxSchema, GeminiDeclaration, GeminiDeclarationSchema, GeminiExecutionConfig, GeminiExecutionConfigSchema, GeminiQuality, GeminiQualitySchema (+3 more)

### Community 35 - "Community 35"
Cohesion: 0.30
Nodes (10): mockEcommerceListing, mockEvidence, mockFinding, mockManufacturer, mockPackageAnalysis, mockProduct, mockReport, mockRule (+2 more)

### Community 36 - "Community 36"
Cohesion: 0.22
Nodes (9): ProgressStepItem, ProgressSteps(), ProgressStepsProps, styles, GEMINI_PIPELINE_STEPS, MOCK_PIPELINE_STEPS, ProcessingScreen(), Props (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.20
Nodes (9): ConfidenceScoreSchema, ComplianceAssessment, ComplianceAssessmentSchema, ComplianceEvaluationSummary, ComplianceEvaluationSummarySchema, LegalSourceMetadataSchema, ComplianceResultSchema, EvidenceSufficiencySchema (+1 more)

### Community 40 - "Community 40"
Cohesion: 0.24
Nodes (4): BENCHMARK_SAMPLES, BenchmarkSample, runBenchmark(), MockAIProvider

### Community 41 - "Community 41"
Cohesion: 0.28
Nodes (4): ClientEnv, ClientEnvSchema, ServerEnv, ServerEnvSchema

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (8): GeoLocationSchema, CustodyEvent, CustodyEventSchema, Evidence, EvidenceSchema, EvidenceType, EvidenceTypeSchema, EvidenceStatusSchema

### Community 43 - "Community 43"
Cohesion: 0.28
Nodes (8): public, public.handle_new_auth_user, on_auth_user_created, public.handle_new_auth_user(), public.roles, public.users, public.update_updated_at_column, users_updated_at

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (8): findings_updated_at, public.evidence, public.findings, public.inspector_decisions, public.inspections, public.rule_versions, public.update_updated_at_column, public.users

### Community 45 - "Community 45"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src/**/*, ../../tsconfig.json

### Community 46 - "Community 46"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src/**/*, ../../tsconfig.json

### Community 47 - "Community 47"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src/**/*, ../../tsconfig.json

### Community 48 - "Community 48"
Cohesion: 0.50
Nodes (3): ApiValidationError, ErrorCode, AppError

### Community 49 - "Community 49"
Cohesion: 0.25
Nodes (7): Finding, FindingReview, FindingReviewSchema, FindingSchema, DeclarationTypeSchema, FindingReviewStatusSchema, FindingStatusSchema

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src/**/*, ../../tsconfig.json

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src/**/*, ../../tsconfig.json

### Community 52 - "Community 52"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src/**/*, ../../tsconfig.json

### Community 53 - "Community 53"
Cohesion: 0.39
Nodes (6): createProductionGateway(), port, createAiEngineServer(), readRequestBody(), ServerOptions, startAiEngineServer()

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src/**/*, ../../tsconfig.json

### Community 56 - "Community 56"
Cohesion: 0.29
Nodes (7): scripts, android, build, ios, start, typecheck, web

### Community 57 - "Community 57"
Cohesion: 0.38
Nodes (4): DatabaseRowUserWithRole, NOTE: email is not stored in public.users — it lives in auth.users., DatabaseRowRole, DatabaseRowUser

### Community 58 - "Community 58"
Cohesion: 0.33
Nodes (4): public.roles, public.current_user_has_role(), public.current_user_role(), public.users

### Community 59 - "Community 59"
Cohesion: 0.33
Nodes (5): description, main, name, private, version

### Community 60 - "Community 60"
Cohesion: 0.33
Nodes (5): CameraComponent, ImageCaptureScreen(), Props, styles, SURFACES

### Community 62 - "Community 62"
Cohesion: 0.33
Nodes (3): InspectionScalarFields, DatabaseRowInspection, DatabaseRowInspectionImage

### Community 64 - "Community 64"
Cohesion: 0.33
Nodes (4): COLOR_TOKENS, INSPECTION_STATUS_MAP, SEVERITY_BADGE_MAP, STATUS_BADGE_MAP

### Community 66 - "Community 66"
Cohesion: 0.47
Nodes (5): manufacturers_updated_at, products_updated_at, public.manufacturers, public.products, public.update_updated_at_column

### Community 67 - "Community 67"
Cohesion: 0.33
Nodes (5): inspections_updated_at, public.inspections, public.products, public.update_updated_at_column, public.users

### Community 68 - "Community 68"
Cohesion: 0.47
Nodes (5): declarations_updated_at, public.ai_analyses, public.declarations, public.inspections, public.update_updated_at_column

### Community 69 - "Community 69"
Cohesion: 0.40
Nodes (5): devDependencies, @types/react, typescript, typescript, @types/react

### Community 70 - "Community 70"
Cohesion: 0.40
Nodes (4): ApiValidationErrorSchema, ErrorCodeSchema, SerializedAppError, SerializedAppErrorSchema

### Community 71 - "Community 71"
Cohesion: 0.60
Nodes (4): public.cross_source_comparisons, public.ecommerce_listings, public.evidence, public.inspections

### Community 73 - "Community 73"
Cohesion: 0.67
Nodes (3): public.rule_versions, public.rules, public.users

### Community 74 - "Community 74"
Cohesion: 0.50
Nodes (3): public.reports, public.inspections, public.users

## Knowledge Gaps
- **563 isolated node(s):** `name`, `slug`, `version`, `orientation`, `userInterfaceStyle` (+558 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 697 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppError` connect `Community 48` to `Community 70`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `useInspectionWorkflow()` connect `Community 9` to `Community 32`, `Community 0`, `Community 36`, `Community 5`, `Community 14`, `Community 60`, `Community 29`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _563 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05303030303030303 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0743321718931475 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._