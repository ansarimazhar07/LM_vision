# LM-Vision — Legal Source Mapping

## 1. Source Authority

**Required authoritative source:** *The Legal Metrology (Packaged Commodities) Rules, 2011* — project-supplied official PDF.

**Current status:** The project brief is available, but the authoritative PDF itself is not present in the current attached materials. Therefore no legal rule number, sub-rule, threshold, exception, or page is populated below. This is an intentional safety gate.

## 2. Mapping Template

| Rule | Sub-rule | Source page | Software module | Input evidence | Validation method | Output status |
|---|---|---|---|---|---|---|
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | Applicability Engine | Product/package attributes | Applicability predicate | N/A until sourced |
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | Declaration Validator | Declaration evidence | Field/condition validator | N/A until sourced |
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | Quantity Validator | Quantity + unit evidence | Normalized comparison | N/A until sourced |
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | Typography Validator | Calibrated visual measurement | Measurement comparison | N/A until sourced |
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | Placement Validator | Region/geometry evidence | Geometry validator | N/A until sourced |
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | Readability Validator | Image/text evidence | Evidence/manual verification | N/A until sourced |
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | E-commerce Comparator | Physical + listing evidence | Cross-source comparison | N/A until sourced |
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | Exemption Resolver | Product attributes + source exception | Applicability predicate | N/A until sourced |
| SOURCE_REQUIRED | SOURCE_REQUIRED | SOURCE_REQUIRED | Inspection/Reporting | Inspection state | Workflow rule | N/A until sourced |

## 3. Required Automated-Check Mapping Areas

The project brief requests investigation of applicability, mandatory declarations, manufacturer/packer/importer, generic commodity name, net quantity, manufacture/packing/import date, MRP, consumer-care information, dimensions where relevant, quantity units, typography, principal display panel, spacing, legibility, contrast, language, advertising, inspection/reporting, and exemptions.

Each area must be populated only after exact source verification.

## 4. Source Extraction Record

For every automated legal check create a record like:

```json
{
  "mappingId": "LM-MAP-XXXX",
  "ruleNumber": "<exact source>",
  "subRule": "<exact source or null>",
  "requirement": "<faithful normalized description>",
  "applicability": "<source-backed scope>",
  "condition": [],
  "exceptions": [],
  "validationMethod": "<deterministic evaluator>",
  "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
  "sourcePage": "<PDF page>",
  "softwareModule": "<module>",
  "inputEvidence": ["<evidence type>"],
  "outputStatus": ["PASS", "WARNING", "SUSPECTED_NON_COMPLIANCE", "MANUAL_REVIEW"],
  "humanVerificationRequired": true
}
```

## 5. Legal Mapping Acceptance Gate

A mapping is accepted only when:

1. the exact provision is located in the authoritative PDF;
2. applicability is captured;
3. conditions and exceptions/provisos are captured;
4. the software input evidence is identified;
5. a deterministic validation method is defined;
6. source page/reference is recorded;
7. positive and negative tests exist;
8. a human/legal reviewer approves the rule version.

## 6. Source Integrity

The system should retain the source-document identifier and rule-version snapshot used during each inspection. A future amendment must produce a new rule version rather than silently editing the meaning of a previously executed rule.

## 7. Prohibited Mapping Practices

- invented rule numbers;
- thresholds inferred from memory;
- omission of provisos/exceptions;
- treating an AI explanation as the legal source;
- mapping a visual heuristic directly to “illegal” without a source-backed rule;
- changing source wording materially without review.

## 8. What Happens Until the PDF Is Ingested

The application may execute:

- schema validation;
- OCR;
- image quality checks;
- evidence storage;
- non-legal observations;
- test-only rule fixtures;
- cross-source mismatch observations.

It must not claim production legal coverage for a rule that is still `SOURCE_REQUIRED`.
