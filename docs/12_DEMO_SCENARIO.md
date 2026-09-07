# LM-Vision — SIH Demo Scenario

## 1. Flagship Story

**Product:** ABC Shampoo 500 ml  
**Simulated physical package MRP:** ₹249  
**Simulated online listing MRP:** ₹299

Simulated findings:

1. Consumer care not detected.
2. Typography requires verification.
3. Physical MRP differs from e-commerce listing.

These are **demo findings**, not assertions about an actual legal rule unless the rule catalog has been populated from the authoritative source.

## 2. Demo Narrative

The officer opens LM-Vision in the mobile app and starts a new inspection. Guided capture ensures the primary package panel and relevant additional panels are photographed. The platform runs image quality checks, OCR, structured extraction, and visual analysis. The rule engine evaluates only configured, approved rules. The officer sees evidence-linked findings, verifies uncertain results, compares the physical package against an e-commerce listing, records the final decision, and generates a report. The web command center then shows the case in history and dashboard views.

## 3. Demo Sequence

`Login → Start Inspection → Capture images → AI Analysis → Extracted declarations → Applicable rules → Findings → Evidence → Typography measurement → E-commerce comparison → Inspector decision → Generate report → Web dashboard → Inspection history`

## 4. MockProvider Fixture

```json
{
  "inspectionScenario": "ABC_SHAMPOO_500ML",
  "declarations": [
    {"field": "commodity_name", "rawValue": "ABC Shampoo", "confidence": 0.98},
    {"field": "net_quantity", "rawValue": "500 ml", "confidence": 0.99},
    {"field": "mrp", "rawValue": "₹249", "normalizedValue": 249, "confidence": 0.98},
    {"field": "consumer_care", "rawValue": "", "confidence": 0.42}
  ],
  "visualMeasurements": [
    {
      "measurementType": "estimated_character_height",
      "value": 1.7,
      "unit": "mm",
      "confidence": 0.74,
      "isEstimated": true
    }
  ],
  "listing": {
    "mrp": 299
  },
  "expectedDemoStatuses": {
    "consumerCare": "MANUAL_REVIEW",
    "typography": "MANUAL_REVIEW",
    "mrpCrossSource": "SUSPECTED_NON_COMPLIANCE"
  }
}
```

The fixture deliberately uses non-final statuses for uncertain AI/CV outputs and requires human interaction.

## 5. Stage-by-Stage Script

### Stage 1 — Login

Show successful field-user login and role.

### Stage 2 — Start Inspection

Select packaged commodity → personal care → bottle.

### Stage 3 — Capture

Capture front, back, and relevant side panel. Trigger at least one quality hint/retake path if desired.

### Stage 4 — Analysis

Show progress indicators:

`Quality ✓ → OCR ✓ → Extraction ✓ → CV ✓ → Rules ✓`

### Stage 5 — Declarations

Show structured extracted declarations with confidence and image-region links.

### Stage 6 — Findings

Show:

- Consumer care: uncertain/not detected → `MANUAL_REVIEW`.
- Typography: estimated measurement → `MANUAL_REVIEW`.
- MRP physical vs listing: ₹249 vs ₹299 → `SUSPECTED_NON_COMPLIANCE` as an evidence mismatch, pending inspector decision.

### Stage 7 — Evidence

Open the exact package image/crop and listing screenshot supporting each finding.

### Stage 8 — Human Decision

Inspector verifies evidence and enters final decision/comments.

### Stage 9 — Report

Generate PDF including rule references, evidence, confidence, decision, and audit metadata.

### Stage 10 — Web Dashboard

Navigate to the inspection in the web command center. Show status, findings, report, and history.

## 6. Offline Safety Net

Before the demo, switch the environment to `MOCK_PROVIDER=true` and optionally disable live AI keys. The exact same UI and domain workflow must remain usable.

## 7. Demo Acceptance Criteria

- No external AI dependency is required.
- Images and evidence appear consistently in mobile and web.
- Rule status is deterministic for seeded demo data.
- Human verification visibly changes the review state and is audited.
- Report generation succeeds.
- History search finds the case.
