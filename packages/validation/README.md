# @lm-vision/validation

This package provides **runtime validation schemas, custom field refinements, and error formatting helpers** for LM-Vision (SIH 2026 Problem Statement 26034).

## Responsibilities

1. **Runtime Verification**: Enforce strong contracts across network boundaries, service calls, and user input.
2. **Standard Error Formatting**: Transform raw `z.ZodError` exceptions into clean, serialized `ApiValidationError[]` arrays suitable for API envelopes.
3. **Domain Refinements**: Implement custom validators for:
   - Checksum algorithms (EAN-13, UPC-A, GTIN)
   - Unit normalization and symbol verification
   - Coordinate bounding checks
   - Image quality threshold evaluators
4. **Zero Duplication**: Seamlessly re-exports and builds on top of schemas defined in `@lm-vision/shared-types`.
