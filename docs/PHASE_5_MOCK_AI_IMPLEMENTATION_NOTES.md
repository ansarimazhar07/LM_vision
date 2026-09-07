# LM-Vision — Phase 5: Complete Mock AI Inspection Pipeline Implementation Notes

## 1. Executive Summary

Phase 5 transforms the LM-Vision mobile application from a static mock fixture into a **fully modular, deterministic, 6-stage mock AI inspection pipeline**.

The pipeline takes **real user-captured packaging photographs** as inputs, normalizes them, and runs them through deterministic stages that simulate future AI/OCR/CV/rule workflows while maintaining rigorous schema compliance and legal boundaries.

### Key Deliverables Implemented
1. **Real Captured Photographs as Inputs & Evidence**: Real photographs taken via in-app camera or imported from device gallery are preserved, normalized, and linked into the evidence chain.
2. **Modular 6-Stage Pipeline**:
   - Stage 1: `normalizeInspectionImages` (URI integrity & surface mapping)
   - Stage 2: `assessImageQuality` (sharpness, glare, blur, and statutory legibility)
   - Stage 3: `extractMockOcrRegions` (bounding boxes mapped to actual captured image IDs)
   - Stage 4: `extractMockDeclarations` (6 canonical Packaged Commodities declarations)
   - Stage 5: `computeMockVisualMeasurements` (numeral typography height and display area)
   - Stage 6: `evaluateMockRules` (non-statutory Demo/Test rules and evidence linking)
3. **Unbroken Provenance Chain**:
   $$\text{Finding} \longrightarrow \text{Declaration} \longrightarrow \text{TextRegion} \longrightarrow \text{Real Captured Photo}$$
4. **Architectural Boundary Preserved**: The mobile app (`apps/mobile`) does **not** import `services/ai-engine`. Instead, `MobileMockAIClientAdapter` implements the canonical `AIProvider` contract (`@lm-vision/shared-types`), allowing Phase 6 to swap mock logic for Gemini Vision without changing mobile UI/business logic.
5. **Clear Non-Statutory Labeling**: All simulated findings and rules are explicitly labeled as `Demo / Test Findings` and `Demo/Test Rules (Simulated)`.
6. **Flashlight / Torch Camera Controls**: Dedicated Torch ON/OFF toggle implemented as an overlay outside `CameraView` with automatic lifecycle cleanup on unmount.
7. **No Hard-Coded Plaintext Credentials**: Dedicated demo inspector access mechanism (`signInDemo()`) without hardcoded passwords in UI forms.
8. **Comprehensive Failure-Mode Protection**: Guaranteed that the inspector is never presented with a false "Analysis Complete" or "Saved" state when images are missing, corrupt, rejected for quality, or storage fails.

---

## 2. Architecture & Provenance Chain

### 2.1 Boundary Preservation
```text
Mobile UI Screens (ProcessingScreen, DeclarationsScreen, FindingsScreen, FindingDetailScreen)
       │
       ▼
apps/mobile/src/services/ai/aiClientAdapter.ts (implements canonical AIProvider)
       │
       ▼
apps/mobile/src/services/ai/mockPipeline.ts
       ├── normalization.ts
       ├── qualityEngine.ts
       ├── ocrEngine.ts
       ├── declarationEngine.ts
       ├── cvEngine.ts
       └── ruleEvaluator.ts
```

### 2.2 End-to-End Provenance Chain
Each finding links directly to the user's real captured photograph:

```text
Finding (e.g., Demo/Test: Typography Height Near Statutory Threshold)
  │
  ├── declarationType: NET_QUANTITY
  │     └─► Declaration: "Net Vol. 500 ml" (normalized: 500 ml)
  │           └─► TextRegion: region-net-qty (surface: FRONT)
  │                 └─► Real Captured Photo: file:///.../captured_front_shampoo.jpg
  │
  └── evidenceIds: [ "33333333-3333-4333-8333-000000000002" ]
        └─► Evidence Object (title: "Surface Evidence (FRONT)")
              └─► fileUrl: file:///.../captured_front_shampoo.jpg
```

---

## 3. Pipeline Stages Specification

| Stage | Module | Input | Output | Invariants & Failure Handling |
| :--- | :--- | :--- | :--- | :--- |
| **1. Normalization** | `normalization.ts` | `LocalInspectionImage[]` | `NormalizedImage[]` | Throws `IMAGE_REQUIRED` if array empty; throws `IMAGE_CORRUPT` if URI is invalid or blank. |
| **2. Quality Assessment** | `qualityEngine.ts` | `NormalizedImage[]` | `ImageQuality` | Evaluates sharpness and glare heuristics. Throws `QUALITY_REJECTED` on blurry or illegible images. |
| **3. OCR Extraction** | `ocrEngine.ts` | `NormalizedImage[]` | `TextRegion[]` | Extracts bounding boxes mapped to real front/back photo IDs. Throws `OCR_FAILED` if unreadable. |
| **4. Declarations** | `declarationEngine.ts` | `TextRegion[]` | `Declaration[]` | Classifies 6 mandatory Packaged Commodities declarations (`GENERIC_NAME`, `NET_QUANTITY`, `MRP`, `MANUFACTURER_NAME_ADDRESS`, `CONSUMER_CARE_DETAILS`, `DATE_OF_PACKAGING`). |
| **5. CV Geometry** | `cvEngine.ts` | — | `VisualMeasurement[]` | Computes font height (1.8 mm) and display panel area (12500 mm²). |
| **6. Demo/Test Rules** | `ruleEvaluator.ts` | Declarations, Images | `Finding[]`, `Evidence[]` | Simulates 3 Demo/Test findings; links real photo file URLs as `Evidence` objects. |

---

## 4. Flashlight & Camera Controls

The in-app camera viewfinder in `ImageCaptureScreen.tsx` was enhanced:
- **Childless `CameraView`**: `CameraView` is rendered with `style={StyleSheet.absoluteFill}` without nested child views, strictly complying with Expo Camera SDK 57 and React 19 architecture.
- **Dedicated Torch Button**: Added a dedicated `⚡ ON / ⚡ OFF` button to the camera overlay bar.
- **Lifecycle Cleanup**: Torch state automatically resets to `false` when navigating away or unmounting to prevent battery drain or camera locking.

---

## 5. Security & Authentication Refinement

- **Removed Hard-Coded Form Passwords**: `LoginScreen.tsx` form fields now initialize empty without exposing passwords.
- **Simulated Inspector Mode**: Added a clean `signInDemo()` method on `AuthProvider` that directly restores the demo inspector session in AsyncStorage (`@lm_vision:demo_auth_session`) without embedding plaintext passwords in client code.
- **Clean Architecture Separation**: Pure data fixtures (`DEMO_INSPECTOR_USER`, `DEMO_INSPECTOR_SESSION`) are isolated in `apps/mobile/src/auth/demoInspector.ts`, preventing React JSX import entanglements in test suites.

---

## 6. Failure-Mode Testing Verification

The pipeline and storage layers were tested against all anticipated failure modes:

| Test Scenario | Trigger | Observed Behavior | Verified Guarantee |
| :--- | :--- | :--- | :--- |
| **Missing Images** | `runMockInspectionPipeline([], ...)` | Returns `success: false`, `errorCode: 'IMAGE_REQUIRED'` | No false "Analysis Complete" |
| **Corrupted Image URI** | URI contains `corrupt` or invalid protocol | Returns `success: false`, `errorCode: 'IMAGE_CORRUPT'` | Explicit error shown to inspector |
| **Quality Rejection** | Blurry photo or simulation flag | Returns `success: false`, `errorCode: 'QUALITY_REJECTED'` | Prompts user to re-photograph surface |
| **OCR Failure** | OCR simulation failure flag | Returns `success: false`, `errorCode: 'OCR_FAILED'` | Shows failure screen with retry option |
| **Storage Unavailable** | `AsyncStorage.setItem` throws | Returns `success: false`, `error: ...` | Save status set to `error`, no false "Saved" alert |
| **Supabase Unavailable** | Supabase network failure | Falls back to local storage; `savedRemotely: false` | Does not falsely claim cloud sync |

---

## 7. Verification & Test Results

- **Unit & Integration Tests**: 161 passed (100% success across 7 test suites).
  - `phase5-mock-pipeline.test.ts`: 20 tests passing.
  - `phase4-mobile-mvp.test.ts`: 14 tests passing.
  - `phase3-mobile.test.ts`: 9 tests passing.
  - `phase2-database.test.ts`: 29 tests passing.
  - `phase2-auth.test.ts`: 21 tests passing.
  - `phase2-rls.test.ts`: 38 tests passing.
  - `validation.test.ts`: 30 tests passing.
- **Typecheck**: `npm run typecheck` passed with code 0 across all packages.
- **Monorepo Build**: `npm run build` passed with code 0 across all workspaces.
- **End-to-End Real Photo Workflow Verification**: Confirmed via `scratch/verify-phase5-workflow.ts` that real captured front and back photographs appear as evidence in the resulting canonical `PackageAnalysis` and `Evidence` entities while findings remain explicitly labeled `DEMO / MOCK`.
