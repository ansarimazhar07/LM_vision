import type { Rule } from '@lm-vision/shared-types';

/**
 * Representative Test Fixture: Mandatory Generic Name Declaration Rule
 * NOTE: For unit testing and demonstration only. Real statutory rules will be populated
 * in later phases after legal source mapping verification.
 */
export const TEST_FIXTURE_MANDATORY_GENERIC_NAME_RULE: Rule = {
  ruleId: 'TEST_FIXTURE_MANDATORY_DECLARATION_GENERIC_NAME',
  ruleNumber: 'TEST-MOCK-RULE-01',
  subRule: '1',
  title: '[TEST ONLY] Mandatory Generic Name Declaration Presence',
  description: 'Validates that the generic or common name of the commodity is declared on the package.',
  ruleKind: 'TEST_ONLY',
  sourceStatus: 'UNVERIFIED',
  applicability: {
    appliesToDomestic: true,
    appliesToImported: true,
  },
  conditions: [
    {
      field: 'declarations.GENERIC_NAME',
      operator: 'EXISTS',
    },
  ],
  requirement: 'Every pre-packaged commodity must display the generic or common name of the product.',
  validationType: 'FIELD_PRESENT',
  exceptions: [],
  severity: 'MAJOR',
  effectiveFrom: '2026-01-01T00:00:00Z',
  sourceMetadata: {
    sourceDocument: 'TEST_MOCK_LEGAL_FRAMEWORK_FIXTURE',
    sourcePage: 1,
  },
  humanVerificationRequired: false,
  status: 'ACTIVE',
  lifecycle: 'ACTIVE',
  version: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

/**
 * Representative Test Fixture: Maximum Retail Price (MRP) Comparison Rule
 */
export const TEST_FIXTURE_MRP_CROSS_COMPARE_RULE: Rule = {
  ruleId: 'TEST_FIXTURE_CROSS_SOURCE_MRP_MATCH',
  ruleNumber: 'TEST-MOCK-RULE-02',
  subRule: '2',
  title: '[TEST ONLY] Physical MRP vs E-Commerce Listed MRP Concordance',
  description: 'Validates that the online platform does not list a higher MRP than the physical package.',
  ruleKind: 'TEST_ONLY',
  sourceStatus: 'UNVERIFIED',
  applicability: {
    appliesToDomestic: true,
    appliesToImported: true,
  },
  conditions: [
    {
      field: 'ecommerce.listedMrpInr',
      operator: 'LESS_THAN_OR_EQUAL',
    },
  ],
  requirement: 'The price charged or displayed on e-commerce platforms cannot exceed the printed MRP on the package.',
  validationType: 'CROSS_SOURCE_COMPARE',
  exceptions: [],
  severity: 'CRITICAL',
  effectiveFrom: '2026-01-01T00:00:00Z',
  sourceMetadata: {
    sourceDocument: 'TEST_MOCK_LEGAL_FRAMEWORK_FIXTURE',
    sourcePage: 2,
  },
  humanVerificationRequired: true,
  status: 'ACTIVE',
  lifecycle: 'ACTIVE',
  version: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
