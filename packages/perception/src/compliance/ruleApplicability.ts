/**
 * Phase F1: Authoritative Legal Metrology Rule Applicability Evaluator
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Consumes Rule applicability and exception metadata directly from the Authoritative Rule Corpus (@lm-vision/rules).
 * 2. Does NOT invent independent statutory exemptions: strictly adheres to GSR 202(E) Chapter II scope:
 *    - Rule 3(b): Industrial / Institutional consumer packages are exempted from retail packaging provisions.
 *    - Rule 3(a): Wholesale bulk packages (> 25 kg / 25 L, excluding cement/fertilizer up to 50 kg) are exempted.
 *    - Rule 6(1)(g) Proviso A: Bidis, agarbatti, domestic LPG cylinders are exempted from date of manufacture/packing.
 *    - Rule 6(1)(g) Proviso C / State Excise: Bidis, domestic LPG, alcoholic beverages exempted from MRP declaration.
 * 3. Never treats UNKNOWN_APPLICABILITY as PASS. Never treats NOT_APPLICABLE as FAIL.
 */

import type { Rule } from '@lm-vision/shared-types';
import type { RuleApplicabilityResult } from './ruleMappingSchema.js';

export interface PackageEvaluationContext {
  readonly packageType?: 'RETAIL' | 'WHOLESALE' | 'INDUSTRIAL' | 'INSTITUTIONAL';
  readonly commodityCategory?: string;
  readonly packageNetQuantityGramsOrMl?: number;
  readonly isImported?: boolean;
  readonly packagingType?: string;
  readonly actualSalePrice?: number;
}

/**
 * Evaluates whether a statutory rule applies to the package under evaluation,
 * strictly referencing the authoritative rule definition and statutory scope.
 */
export function evaluateRuleApplicability(
  rule: Rule,
  context?: PackageEvaluationContext
): RuleApplicabilityResult {
  const exemptionsEvaluated: string[] = [];
  const statutoryCitation = rule.sourceMetadata?.clauseReference || `Rule ${rule.ruleNumber}`;

  // 1. General Chapter II Scope Exemptions: Rule 3(b) Industrial / Institutional
  const isInstitutionalOrIndustrial =
    context?.packageType === 'INSTITUTIONAL' || context?.packageType === 'INDUSTRIAL';
  if (isInstitutionalOrIndustrial) {
    exemptionsEvaluated.push('Rule 3(b) - Industrial or Institutional Consumer Exemption');
    return {
      ruleId: rule.ruleId,
      ruleNumber: rule.ruleNumber,
      status: 'NOT_APPLICABLE',
      reason:
        'Packaged commodity is designated for industrial or institutional consumers and is exempted from Chapter II retail packaging provisions under GSR 202(E) Rule 3(b).',
      statutoryCitation: 'Rule 3(b) (GSR 202(E) p. 3)',
      exemptionsEvaluated,
    };
  }

  // 2. General Chapter II Scope Exemptions: Rule 3(a) Wholesale Bulk Exemption (> 25 kg / 25 L)
  const isWholesaleBulk =
    context?.packageType === 'WHOLESALE' &&
    typeof context?.packageNetQuantityGramsOrMl === 'number' &&
    context.packageNetQuantityGramsOrMl > 25000 &&
    !['CEMENT', 'FERTILIZER'].includes((context.commodityCategory ?? '').toUpperCase());
  if (isWholesaleBulk) {
    exemptionsEvaluated.push('Rule 3(a) - Wholesale Bulk Exemption (> 25 kg/L)');
    return {
      ruleId: rule.ruleId,
      ruleNumber: rule.ruleNumber,
      status: 'NOT_APPLICABLE',
      reason:
        'Package contains quantity exceeding 25 kg/L (excluding cement/fertilizer up to 50 kg) and is exempted from Chapter II retail packaging provisions under GSR 202(E) Rule 3(a).',
      statutoryCitation: 'Rule 3(a) (GSR 202(E) p. 3)',
      exemptionsEvaluated,
    };
  }

  // 3. Rule 6(1)(d) Month/Year Specific Statutory Exemptions: Rule 6(1)(g) Proviso A
  if (rule.ruleNumber === '6(1)(d)' || rule.ruleId === 'GSR-202E-RULE-06-01-D') {
    const cat = (context?.commodityCategory ?? '').toLowerCase();
    const isBidiOrAgarbattiOrLpg =
      cat.includes('bidi') ||
      cat.includes('agarbatti') ||
      cat.includes('incense') ||
      cat.includes('lpg');

    if (isBidiOrAgarbattiOrLpg) {
      exemptionsEvaluated.push('Rule 6(1)(g) Proviso A - Bidi, Agarbatti, LPG Date Exemption');
      return {
        ruleId: rule.ruleId,
        ruleNumber: rule.ruleNumber,
        status: 'NOT_APPLICABLE',
        reason:
          'Package category (bidi, agarbatti, or domestic LPG cylinder) is statutorily exempted from month and year of manufacture or pre-packing under GSR 202(E) Rule 6(1)(g) Proviso A.',
        statutoryCitation: 'Rule 6(1)(g) Proviso A (GSR 202(E) p. 6)',
        exemptionsEvaluated,
      };
    }
  }

  // 4. Rule 6(1)(e) MRP Specific Statutory Exemptions: Rule 6(1)(g) Proviso C & State Excise
  if (rule.ruleNumber === '6(1)(e)' || rule.ruleId === 'GSR-202E-RULE-06-01-E') {
    const cat = (context?.commodityCategory ?? '').toLowerCase();
    const isBidiOrLpg = cat.includes('bidi') || cat.includes('lpg');
    const isAlcoholStateExcise = cat.includes('alcohol') || cat.includes('liquor') || cat.includes('wine') || cat.includes('beer');

    if (isBidiOrLpg) {
      exemptionsEvaluated.push('Rule 6(1)(g) Proviso C - Bidi / LPG MRP Exemption');
      return {
        ruleId: rule.ruleId,
        ruleNumber: rule.ruleNumber,
        status: 'NOT_APPLICABLE',
        reason:
          'Package category (bidi or domestic LPG cylinder under Administrative Price Mechanism) is statutorily exempted from MRP declaration under GSR 202(E) Rule 6(1)(g) Proviso C.',
        statutoryCitation: 'Rule 6(1)(g) Proviso C (GSR 202(E) p. 6)',
        exemptionsEvaluated,
      };
    }

    if (isAlcoholStateExcise) {
      exemptionsEvaluated.push('Rule 6(1)(e) Proviso - Alcoholic Beverages State Excise Exemption');
      return {
        ruleId: rule.ruleId,
        ruleNumber: rule.ruleNumber,
        status: 'NOT_APPLICABLE',
        reason:
          'Alcoholic beverages/liquor governed under State Excise Laws are exempted from central packaged commodities MRP declaration rules under GSR 202(E) Rule 6(1)(e) Proviso.',
        statutoryCitation: 'Rule 6(1)(e) Proviso (GSR 202(E) p. 6)',
        exemptionsEvaluated,
      };
    }
  }


  // 6. Domestic vs Imported applicability check from rule definition
  if (context?.isImported === true && rule.applicability?.appliesToImported === false) {
    exemptionsEvaluated.push('Rule Definition - Applies only to Domestic');
    return {
      ruleId: rule.ruleId,
      ruleNumber: rule.ruleNumber,
      status: 'NOT_APPLICABLE',
      reason: 'Rule applies strictly to domestic packages per rule definition metadata.',
      statutoryCitation,
      exemptionsEvaluated,
    };
  }

  if (context?.isImported === false && rule.applicability?.appliesToDomestic === false) {
    exemptionsEvaluated.push('Rule Definition - Applies only to Imported');
    return {
      ruleId: rule.ruleId,
      ruleNumber: rule.ruleNumber,
      status: 'NOT_APPLICABLE',
      reason: 'Rule applies strictly to imported packages per rule definition metadata.',
      statutoryCitation,
      exemptionsEvaluated,
    };
  }

  // 7. Check if rule definition has packaging types restrictions
  if (
    context?.packagingType &&
    rule.applicability?.packagingTypes &&
    rule.applicability.packagingTypes.length > 0 &&
    !rule.applicability.packagingTypes.includes(context.packagingType as any)
  ) {
    exemptionsEvaluated.push(`Rule Definition - Restricted to packaging types: ${rule.applicability.packagingTypes.join(', ')}`);
    return {
      ruleId: rule.ruleId,
      ruleNumber: rule.ruleNumber,
      status: 'NOT_APPLICABLE',
      reason: `Rule applies only to packaging types [${rule.applicability.packagingTypes.join(', ')}]. Package format is ${context.packagingType}.`,
      statutoryCitation,
      exemptionsEvaluated,
    };
  }

  // Default: Standard retail packaged commodity rule is fully applicable
  return {
    ruleId: rule.ruleId,
    ruleNumber: rule.ruleNumber,
    status: 'APPLICABLE',
    reason: `Statutory requirement under ${statutoryCitation} is applicable to this packaged commodity.`,
    statutoryCitation,
    exemptionsEvaluated,
  };
}
