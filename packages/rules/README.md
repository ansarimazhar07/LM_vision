# @lm-vision/rules

This package defines the **rule-domain abstractions, validation operators, evaluation contexts, and engine contracts** for LM-Vision (SIH 2026 Problem Statement 26034).

## Critical Legal Safeguards

As mandated by project architecture:
1. **Zero LLM Code Execution**: Dynamic LLM-generated code is NEVER executed as rule logic. Rules are strictly declarative data structures executed by verified, deterministic TypeScript validators.
2. **No Fabricated Legal Rules**: Real Legal Metrology rules and gazette citations will only be populated after authoritative legal source mapping in later phases.
3. **Audit Trail**: Every rule revision includes `RuleVersion` tracking, source document metadata, and change authors.
4. **Human Verification Flag**: Rules specify `humanVerificationRequired` to guarantee that high-stakes legal non-compliance findings require human inspector confirmation.
