# LM-Vision — Rule Engine Specification

> **Critical legal-source constraint:** The requested authoritative *Legal Metrology (Packaged Commodities) Rules, 2011* PDF is referenced by the project brief but is not present in the current uploaded materials. Therefore this document specifies the executable rule architecture and schema, but does **not** fabricate legal rule numbers, sub-rules, thresholds, exceptions, or source pages. A rule enters `ACTIVE` only after source-backed ingestion and human/legal approval.

## 1. Design Principle

`AI interprets evidence → CV measures → deterministic rule engine evaluates → inspector decides.`

The rule engine is the only component allowed to produce automated rule-validation statuses.

## 2. Machine-Readable Rule Model

```json
{
  "ruleId": "LMV-RULE-PLACEHOLDER",
  "ruleNumber": "SOURCE_REQUIRED",
  "subRule": null,
  "title": "Source-backed rule title required",
  "applicability": {},
  "conditions": {},
  "requirement": {},
  "validationType": "SOURCE_REQUIRED",
  "threshold": null,
  "exceptions": [],
  "effectiveFrom": null,
  "effectiveTo": null,
  "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
  "sourcePage": "SOURCE_REQUIRED",
  "humanVerificationRequired": true
}
```

## 3. Required Rule Metadata

| Field | Requirement |
|---|---|
| `ruleId` | Stable internal identifier |
| `ruleNumber` | Exact source rule number |
| `subRule` | Exact sub-rule where applicable |
| `title` | Source-aligned concise title |
| `applicability` | Machine-evaluable scope |
| `conditions` | Preconditions for validation |
| `requirement` | What must be present/true |
| `validationType` | Deterministic evaluator name |
| `threshold` | Only where source defines one |
| `exceptions` | Provisos/exceptions from source |
| `effectiveFrom` | Rule version activation date |
| `effectiveTo` | Superseded/expiry date when applicable |
| `sourceDocument` | Exact document title/version |
| `sourcePage` | Exact PDF page/reference |
| `humanVerificationRequired` | Whether a human check is required before final decision |

## 4. Rule Categories

1. Applicability rules
2. Declaration rules
3. Quantity rules
4. Unit rules
5. Typography rules
6. Placement rules
7. Readability rules
8. Advertisement rules
9. Exemption rules
10. Inspection rules

## 5. Execution Contract

Input:

```ts
export interface RuleContext {
  inspectionId: string;
  asOf: string;
  product: {
    category?: string;
    packageType?: string;
    quantity?: { value: number; unit: string };
    attributes?: Record<string, unknown>;
  };
  declarations: Record<string, unknown>;
  visualMeasurements: Record<string, unknown>[];
  evidence: string[];
}
```

Output:

```ts
export type RuleStatus =
  | 'PASS'
  | 'WARNING'
  | 'SUSPECTED_NON_COMPLIANCE'
  | 'MANUAL_REVIEW';

export interface RuleEvaluation {
  ruleVersionId: string;
  status: RuleStatus;
  reasonCode: string;
  explanation: string;
  evidenceIds: string[];
  missingInputs: string[];
  confidence?: number;
  humanVerificationRequired: boolean;
}
```

## 6. Applicability Evaluation

Applicability must occur before validation. A rule that does not apply must not create a failure finding.

Pseudo-flow:

```text
for each ACTIVE rule version valid on inspection.asOf:
    if source metadata incomplete: block activation
    if applicability(context) == false: skip
    else: evaluate requirements
```

## 7. Deterministic Validator Types

Allowed validator types are enumerated rather than generated dynamically:

- `FIELD_PRESENT`
- `FIELD_EQUALS`
- `FIELD_MATCHES_PATTERN`
- `NUMERIC_COMPARE`
- `UNIT_NORMALIZED_COMPARE`
- `DATE_FORMAT_CHECK`
- `REGION_PRESENT`
- `REGION_GEOMETRY_CHECK`
- `VISUAL_MEASUREMENT_COMPARE`
- `CROSS_SOURCE_COMPARE`
- `MANUAL_VERIFICATION_REQUIRED`
- `COMPOSITE`

No validator may execute arbitrary LLM-generated code.

## 8. Executable Rule Examples (Architecture Fixtures, Not Legal Rules)

### Example A — required-field architecture fixture

```json
{
  "ruleId": "FIXTURE-FIELD-PRESENCE-001",
  "ruleNumber": "TEST_ONLY",
  "title": "Required field presence fixture",
  "applicability": {"field": "commodity_name"},
  "conditions": {"inspectionType": "PHYSICAL"},
  "requirement": {"type": "FIELD_PRESENT", "field": "commodity_name"},
  "validationType": "FIELD_PRESENT",
  "threshold": null,
  "exceptions": [],
  "effectiveFrom": "2099-01-01",
  "sourceDocument": "TEST FIXTURE — NOT LAW",
  "sourcePage": "N/A",
  "humanVerificationRequired": false
}
```

### Example B — e-commerce comparison fixture

```json
{
  "ruleId": "FIXTURE-CROSS-SOURCE-001",
  "ruleNumber": "TEST_ONLY",
  "title": "Cross-source equality fixture",
  "applicability": {"requires": ["PHYSICAL", "ECOMMERCE"]},
  "conditions": {},
  "requirement": {"type": "CROSS_SOURCE_COMPARE", "field": "mrp"},
  "validationType": "CROSS_SOURCE_COMPARE",
  "sourceDocument": "TEST FIXTURE — NOT LAW",
  "sourcePage": "N/A",
  "humanVerificationRequired": true
}
```

These fixtures exist to demonstrate engine behavior and must not be presented as legal provisions.

## 9. Rule Version Governance

Lifecycle:

`DRAFT → REVIEW → APPROVED → ACTIVE → SUPERSEDED/RETIRED`

Activation gate:

```text
source document present
AND exact rule/sub-rule captured
AND requirement captured
AND applicability captured
AND exceptions/provisos reviewed
AND validator mapped
AND positive/negative tests pass
AND human/legal approver recorded
```

## 10. Source Mapping Record

Every active rule must have:

```json
{
  "ruleNumber": "<exact source>",
  "subRule": "<exact source or null>",
  "requirement": "<faithful normalized text>",
  "applicability": "<faithful scope>",
  "conditions": [],
  "exceptions": [],
  "validationMethod": "<deterministic evaluator>",
  "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
  "sourcePage": "<exact PDF page/reference>",
  "softwareModule": "packages/rules/..."
}
```

## 11. Unknown / Missing Evidence Semantics

- Missing evidence → `MANUAL_REVIEW`, not PASS.
- Contradictory evidence → `MANUAL_REVIEW`.
- Rule not applicable → no adverse finding.
- Rule source not activated → engine must refuse execution and surface configuration error.
- AI disagreement on a critical input → `MANUAL_REVIEW` for dependent checks.

## 12. Test Requirement

Every activated legal rule must have:

- positive fixture;
- negative fixture;
- applicability fixture;
- exception/proviso fixture where applicable;
- regression test tied to rule version;
- source-reference assertion.

## 13. Rule Ingestion Procedure

1. Obtain project-authorized Rules PDF.
2. Parse/inspect source text and page references.
3. Extract exact rule/sub-rule and relevant qualifiers.
4. Normalize into the schema without changing legal meaning.
5. Map each requirement to a deterministic validator.
6. Add tests.
7. Human/legal review.
8. Activate only after approval.
9. Freeze rule-version context on each inspection.
