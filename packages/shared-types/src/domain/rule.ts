import { z } from 'zod';
import {
  CommodityCategorySchema,
  PackagingTypeSchema,
  RuleLifecycleSchema,
  RuleStatusSchema,
  SeveritySchema,
  RuleKindSchema,
  SourceStatusSchema,
} from '../enums/index.js';
import {
  IsoTimestampSchema,
  MetadataRecordSchema,
  UuidSchema,
} from './common.js';

/**
 * Supported Validation Operator Types in Rule Engine
 */
export const ValidationTypeSchema = z.enum([
  'FIELD_PRESENT',
  'FIELD_EQUALS',
  'FIELD_MATCHES_PATTERN',
  'NUMERIC_COMPARE',
  'UNIT_NORMALIZED_COMPARE',
  'DATE_FORMAT_CHECK',
  'REGION_PRESENT',
  'REGION_GEOMETRY_CHECK',
  'VISUAL_MEASUREMENT_COMPARE',
  'CROSS_SOURCE_COMPARE',
  'MANUAL_VERIFICATION_REQUIRED',
  'COMPOSITE',
]);
export type ValidationType = z.infer<typeof ValidationTypeSchema>;

/**
 * Numeric Comparison Operator
 */
export const NumericOperatorSchema = z.enum([
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN',
  'LESS_THAN_OR_EQUAL',
  'EQUALS',
  'NOT_EQUALS',
  'BETWEEN_INCLUSIVE',
]);
export type NumericOperator = z.infer<typeof NumericOperatorSchema>;

/**
 * Rule Applicability Predicates
 */
export const RuleApplicabilitySchema = z.object({
  commodityCategories: z.array(CommodityCategorySchema).optional(),
  packagingTypes: z.array(PackagingTypeSchema).optional(),
  minNetQuantity: z.number().optional(),
  maxNetQuantity: z.number().optional(),
  netQuantityUnit: z.string().optional(),
  appliesToImported: z.boolean().default(true),
  appliesToDomestic: z.boolean().default(true),
  customPredicate: z.string().optional(),
});
export type RuleApplicability = z.infer<typeof RuleApplicabilitySchema>;

/**
 * Declarative rule evaluation condition
 */
export const RuleConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.string().min(1),
  expectedValue: z.unknown().optional(),
  parameters: MetadataRecordSchema.optional(),
});
export type RuleCondition = z.infer<typeof RuleConditionSchema>;

/**
 * Threshold specification (e.g. minimum font size, maximum permissible error)
 */
export const RuleThresholdSchema = z.object({
  minNumericValue: z.number().optional(),
  maxNumericValue: z.number().optional(),
  unit: z.string().optional(),
  tolerancePercentage: z.number().min(0).max(100).optional(),
  toleranceAbsolute: z.number().nonnegative().optional(),
});
export type RuleThreshold = z.infer<typeof RuleThresholdSchema>;

/**
 * Legal Source Citation Metadata
 */
export const LegalSourceMetadataSchema = z.object({
  sourceDocument: z.string().min(1),
  sourcePage: z.number().int().positive().optional(),
  gazetteNotificationNumber: z.string().optional(),
  scheduleNumber: z.string().optional(),
  clauseReference: z.string().optional(),
});
export type LegalSourceMetadata = z.infer<typeof LegalSourceMetadataSchema>;

/**
 * Canonical Rule Entity
 */
export const RuleSchema = z.object({
  ruleId: z.string().min(1),
  ruleNumber: z.string().min(1),
  subRule: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  ruleKind: RuleKindSchema.default('AUTHORITATIVE'),
  sourceStatus: SourceStatusSchema.default('VERIFIED'),
  applicability: RuleApplicabilitySchema,
  conditions: z.array(RuleConditionSchema).default([]),
  requirement: z.string().min(1),
  validationType: ValidationTypeSchema,
  threshold: RuleThresholdSchema.optional(),
  exceptions: z.array(z.string()).default([]),
  severity: SeveritySchema.default('MAJOR'),
  effectiveFrom: IsoTimestampSchema,
  effectiveTo: IsoTimestampSchema.optional(),
  sourceMetadata: LegalSourceMetadataSchema,
  humanVerificationRequired: z.boolean().default(false),
  status: RuleStatusSchema.default('ACTIVE'),
  lifecycle: RuleLifecycleSchema.default('ACTIVE'),
  version: z.number().int().positive().default(1),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type Rule = z.infer<typeof RuleSchema>;

/**
 * Strict legal lifecycle validation gate:
 * A rule CANNOT be ACTIVE unless it is AUTHORITATIVE, has VERIFIED source status,
 * and possesses verifiable source document and page/citation metadata.
 */
export function validateRuleLifecycle(rule: Rule): { valid: boolean; reason?: string } {
  if (rule.status === 'ACTIVE' || rule.lifecycle === 'ACTIVE') {
    if (rule.ruleKind !== 'AUTHORITATIVE') {
      return {
        valid: false,
        reason: `Rule '${rule.ruleId}' has kind '${rule.ruleKind}'. Non-authoritative rules (TEST_ONLY, DEMO_ONLY) cannot be marked ACTIVE as statutory rules.`,
      };
    }
    if (rule.sourceStatus !== 'VERIFIED') {
      return {
        valid: false,
        reason: `Rule '${rule.ruleId}' has sourceStatus '${rule.sourceStatus}'. Unverified rules cannot be activated for statutory compliance.`,
      };
    }
    if (!rule.sourceMetadata || !rule.sourceMetadata.sourceDocument || rule.sourceMetadata.sourceDocument.trim() === '') {
      return {
        valid: false,
        reason: `Rule '${rule.ruleId}' lacks required sourceDocument citation metadata.`,
      };
    }
    if (!rule.sourceMetadata.sourcePage && !rule.sourceMetadata.scheduleNumber && !rule.sourceMetadata.clauseReference) {
      return {
        valid: false,
        reason: `Rule '${rule.ruleId}' lacks specific page, schedule, or clause citation reference.`,
      };
    }
  }
  return { valid: true };
}

/**
 * Versioned Rule Snapshot
 */
export const RuleVersionSchema = z.object({
  id: UuidSchema,
  ruleId: z.string().min(1),
  version: z.number().int().positive(),
  snapshot: RuleSchema,
  changedByUserId: UuidSchema,
  changeSummary: z.string().min(1),
  approvedByUserId: UuidSchema.optional(),
  approvedAt: IsoTimestampSchema.optional(),
  createdAt: IsoTimestampSchema,
});
export type RuleVersion = z.infer<typeof RuleVersionSchema>;
