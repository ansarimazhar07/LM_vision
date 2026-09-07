# LM-Vision — Phase 10 Implementation Notes
## Offline OCR & Computer Vision Foundation

**Phase Status**: COMPLETED  
**Date**: September 2026  
**Reference**: Legal Metrology (Packaged Commodities) Rules, 2011 [GSR 202(E)]

---

### Executive Summary

Phase 10 delivers a 100% on-device, offline-first perception layer for LM-Vision. The system extracts mandatory packaging declarations (MRP, Net Quantity, Dates of Packaging/Manufacture, Manufacturer Name & Address, Consumer Care Contacts, and Country of Origin), calculates image quality heuristics, and estimates principal display panel geometry without requiring internet connectivity or external cloud services.

When operating online, LM-Vision runs in a **Hybrid Consensus Mode** where on-device OCR and server-backed Gemini Multimodal Vision are cross-verified. Discrepancies are flagged as `CONFLICTING_EVIDENCE` for inspector review, guaranteeing that Gemini never silently overrides local observations.

```
                    OFFLINE PIPELINE (100% On-Device)
+-------------------------------------------------------------------------+
|                        Physical Package Capture                         |
+-------------------------------------------------------------------------+
                                    |
                                    v
                     Image Quality Assessment (Heuristic)
                                    |
                                    v
                     On-Device OCR Text Region Detection
                                    |
                                    v
                     Deterministic Candidate Extractor
                                    |
                                    v
                     Canonical Normalization (Units & Dates)
                                    |
                                    v
                       Canonical PackageAnalysis
                                    |
                                    v
                  GSR 202(E) 2011 Deterministic Rule Engine
                                    |
                                    v
                    Inspector Review & Verification

---------------------------------------------------------------------------

                    ONLINE / HYBRID CONSENSUS PIPELINE
                     +-----------------------------+
                     |  Physical Package Capture   |
                     +-----------------------------+
                                    |
                   +----------------+----------------+
                   |                                 |
                   v                                 v
        Local OCR & CV Perception         Gemini Multimodal Vision
        (On-Device PackageAnalysis)       (Cloud PackageAnalysis)
                   |                                 |
                   +----------------+----------------+
                                    |
                                    v
                 Hybrid Conflict Detector (detectPerceptionConflicts)
                                    |
                     +--------------+--------------+
                     |                             |
               [Values Agree]              [Values Disagree]
                     |                             |
                     v                             v
           Consensus Reinforced          CONFLICTING_EVIDENCE
             (Enhanced Conf)          (Flagged for Inspector Review,
                                       Local Value Preserved)
                                    |
                                    v
                 GSR 202(E) 2011 Deterministic Rule Engine
                                    |
                                    v
                    Inspector Review & Final Decision
```

---

### Key Architectural Invariants & User Directives

#### 1. Strict Separation of Concerns (`packages/perception`)
- OCR, Computer Vision geometry, image quality heuristics, declaration extraction, normalization, and hybrid conflict detection are encapsulated in `@lm-vision/perception` (`packages/perception`).
- `@lm-vision/rules` remains strictly domain-pure and focused exclusively on evaluating statutory Legal Metrology compliance under GSR 202(E) 2011.

#### 2. AI and CV are Observational, Not Statutory Authorities
- Perception engines produce candidate observations only. They never emit legal citations, penalties, violations, or statutory verdicts.
- All statutory findings and compliance evaluations continue to be governed deterministically by the rule engine and verified by human legal metrology inspectors.

#### 3. No Fabricated Information
- The extraction engine returns only text and numerical values actually detected.
- Uncertain, missing, or obscured fields are assigned conservative confidence scores or marked `INSUFFICIENT_EVIDENCE`.

#### 4. No Silent Overwrite by Gemini (Anti-Overriding Guardrail)
- When Gemini and on-device OCR disagree, Gemini never silently overwrites local observations.
- Discrepancies are catalogued with explicit reasons (`VALUE_MISMATCH`, `UNIT_MISMATCH`, `MISSING_IN_LOCAL`, `MISSING_IN_REMOTE`) and surfaced to the inspector in the review interface as a prominent `⚠️ CONFLICTING EVIDENCE DETECTED` callout.

#### 5. Explicit Fallback Semantics
- If remote connectivity fails during `REAL` or `HYBRID` execution, the application notifies the UI via `onFallback` and presents an explicit fallback banner:  
  `Gemini unavailable. Continuing with local analysis.`
- The UI never falsely reports "Gemini Complete" when running on local perception.

#### 6. Zero-Network Offline Enforcement
- The offline perception pipeline has been verified via automated test (Test 20) with a global HTTP/fetch spy to make **zero** network calls during execution.

---

### Core Components & Modules

| Package / Module | Responsibility | Key Files |
| :--- | :--- | :--- |
| `@lm-vision/shared-types` | Data contracts for local OCR, geometry, and hybrid consensus | `domain/perception.ts`, `domain/ai.ts`, `index.ts` |
| `@lm-vision/perception/ocr` | On-device OCR engine with pluggable native ML Kit bridge and universal runner | `src/ocr/ocrEngine.ts` |
| `@lm-vision/perception/extraction` | Deterministic regex/pattern extractors for MRP, Net Qty, Dates, Mfr, Origin, Care | `src/extraction/declarationExtractor.ts` |
| `@lm-vision/perception/normalization` | Metric unit (`g`, `kg`, `ml`, `l`, `n`), date (`YYYY-MM-DD`), currency (`INR`) normalizers | `src/normalization/normalizer.ts` |
| `@lm-vision/perception/quality` | Local photographic quality heuristics (resolution, contrast, brightness) | `src/quality/qualityAnalyzer.ts` |
| `@lm-vision/perception/cv` | Bounding box geometry, font numeral height, and PDP display area estimation | `src/cv/cvGeometry.ts` |
| `@lm-vision/perception/hybrid` | Discrepancy detection between on-device OCR and remote Gemini observations | `src/hybrid/conflictDetector.ts` |
| `@lm-vision/perception/pipeline` | Unified on-device perception pipeline producing canonical `PackageAnalysis` | `src/pipeline.ts` |
| `apps/mobile` | UI integration: `ProcessingScreen` steps/banners and `InspectorReviewScreen` provenance badges | `src/screens/ProcessingScreen.tsx`, `src/screens/InspectorReviewScreen.tsx`, `src/services/ai/aiClientAdapter.ts` |

---

### Verification & Test Suite Summary

- **Phase 10 Test Suite (`tests/phase10-offline-ocr-cv.test.ts`)**: 30 comprehensive automated tests covering:
  1. OCR text extraction from clear images
  2. Empty output handling for blank images
  3. Bounded confidence score assignments [0.0, 1.0]
  4. Non-negative bounding box coordinate preservation
  5. MRP standard inclusive extraction (`₹ 250.00 (inclusive of all taxes)`)
  6. MRP `Rs.` format extraction (`Rs. 45.00`)
  7. MRP `INR` format extraction (`INR 120`)
  8. MRP integer extraction (`₹ 50`)
  9. MRP null return when absent
  10. Net Quantity grams extraction (`500 g`)
  11. Net Quantity kilograms extraction (`1.5 kg`)
  12. Net Quantity millilitres extraction (`200 ml`)
  13. Net Quantity litres extraction (`1 L`)
  14. Net Quantity unit count extraction (`10 N`)
  15. Net Quantity null return when absent
  16. Packaging Date `MM/YYYY` extraction (`03/2026`)
  17. Packaging Date named month extraction (`March 2026`)
  18. Date categorization (Manufacturing vs. Expiry/Best Before)
  19. Date null return when absent
  20. **Zero-Network Enforcement Test** (verified with global `fetch` spy)
  21. Hybrid MRP conflict detection (`VALUE_MISMATCH`)
  22. Hybrid Net Quantity unit conflict detection (`UNIT_MISMATCH`)
  23. Hybrid local preservation when Gemini fails/omits fields
  24. Quality analyzer resolution warning detection (<600x600)
  25. Quality analyzer high-resolution image approval (1920x1080)
  26. Computer Vision numeral height estimation in mm
  27. Principal display panel area estimation in cm²
  28. Controlled dataset Atta 500g end-to-end pipeline & GSR 202(E) evaluation
  29. Controlled dataset Shampoo 200ml end-to-end pipeline & GSR 202(E) evaluation
  30. Controlled dataset Oil 1L end-to-end pipeline & GSR 202(E) evaluation

- **Full Monorepo Status**:
  - `npm test`: **314 passed across 13 test suites** (100% pass rate).
  - `npm run typecheck`: **Clean compilation across all 10 workspaces**.
  - `npm run build`: **Clean build across all 10 workspaces**.
  - `npx expo-doctor`: **21/21 checks passed**.
  - `npx expo export --platform android`: **Successfully bundled 1020 modules with zero errors**.
