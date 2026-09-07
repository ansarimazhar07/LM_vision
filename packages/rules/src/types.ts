import { z } from 'zod';
import {
  type Rule,
  type Finding,
  type ValidationType,
  type Declaration,
  type TextRegion,
  type VisualMeasurement,
  type Product,
  type EcommerceListing,
  type Uuid,
  FindingStatusSchema,
} from '@lm-vision/shared-types';

/**
 * Context provided to the rule engine for evaluating an inspection
 */
export interface RuleEvaluationContext {
  readonly inspectionId: Uuid;
  readonly product?: Product;
  readonly declarations: readonly Declaration[];
  readonly textRegions: readonly TextRegion[];
  readonly visualMeasurements: readonly VisualMeasurement[];
  readonly ecommerceListing?: EcommerceListing;
  readonly options?: Record<string, unknown>;
}

/**
 * Result produced by evaluating a single Rule against context
 */
export const RuleEvaluationResultSchema = z.object({
  ruleId: z.string().min(1),
  status: FindingStatusSchema,
  passed: z.boolean(),
  finding: z.custom<Finding>().optional(),
  executionDurationMs: z.number().nonnegative(),
  evaluatedAt: z.string(),
});
export type RuleEvaluationResult = z.infer<typeof RuleEvaluationResultSchema>;

/**
 * Interface for specific deterministic validator implementations
 */
export interface IRuleValidator {
  readonly type: ValidationType;
  evaluate(rule: Rule, context: RuleEvaluationContext): Promise<RuleEvaluationResult>;
}

/**
 * Rule Engine Abstraction
 */
export interface IRuleEngine {
  /**
   * Evaluate a single rule against an inspection context
   */
  evaluateRule(rule: Rule, context: RuleEvaluationContext): Promise<RuleEvaluationResult>;

  /**
   * Evaluate a suite of rules against an inspection context
   */
  evaluateAll(rules: readonly Rule[], context: RuleEvaluationContext): Promise<RuleEvaluationResult[]>;

  /**
   * Register a custom validator for a given ValidationType
   */
  registerValidator(type: ValidationType, validator: IRuleValidator): void;
}
