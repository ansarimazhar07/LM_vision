import type { ComplianceAssessment, PackageAnalysis } from '@lm-vision/shared-types';

export interface AssessmentScoreBreakdown {
  overallScore: number;
  mandatoryDeclarationsScore: number;
  mrpComplianceScore: number;
  netQuantityComplianceScore: number;
  evidenceSufficiencyScore: number;
  disclaimer: string;
}

/**
 * Maps an assessment result into an operational numeric index [0 - 100].
 * INVARIANT: This is an internal algorithmic metric and NOT a statutory legal status.
 */
function resultToScore(result: ComplianceAssessment['result']): number | null {
  switch (result) {
    case 'PASS':
      return 100;
    case 'REQUIRES_VERIFICATION':
      return 50;
    case 'INSUFFICIENT_EVIDENCE':
      return 25;
    case 'FAIL':
      return 0;
    case 'NOT_APPLICABLE':
      return null; // Excluded from calculation
    default:
      return 0;
  }
}

/**
 * Computes the deterministic, non-statutory LM-Vision Assessment Score.
 *
 * Scoring Formula:
 * Overall Score = 0.40 * S_mandatory + 0.25 * S_mrp + 0.20 * S_net_qty + 0.15 * S_evidence
 *
 * SAFETY INVARIANTS:
 * 1. This score is an observational quality index and does NOT represent legal compliance.
 * 2. A high score (e.g. 90/100) NEVER overrides an individual rule FAIL (e.g. missing MRP is always illegal).
 * 3. Final regulatory decisions remain under sole statutory authority of the human inspector.
 */
export function computeAssessmentScore(params: {
  assessments: ComplianceAssessment[];
  packageAnalysis?: PackageAnalysis | null;
}): AssessmentScoreBreakdown {
  const { assessments, packageAnalysis } = params;

  // 1. Mandatory Declarations Subscore (Rule 6 general mandatory items)
  const mandatoryRules = assessments.filter(
    (a) => a.ruleNumber.startsWith('6(1)') || a.ruleId.includes('RULE-06')
  );
  let mandatoryScore = 100;
  if (mandatoryRules.length > 0) {
    const scores = mandatoryRules
      .map((a) => resultToScore(a.result))
      .filter((s): s is number => s !== null);
    if (scores.length > 0) {
      mandatoryScore = Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length);
    }
  }

  // 2. MRP Compliance Subscore (Rule 6(1)(e))
  const mrpRule = assessments.find(
    (a) =>
      a.ruleNumber.includes('6(1)(e)') ||
      a.ruleId.includes('RULE-06-01-E') ||
      a.ruleTitle.toLowerCase().includes('retail price')
  );
  let mrpScore = 100;
  if (mrpRule) {
    const mapped = resultToScore(mrpRule.result);
    mrpScore = mapped !== null ? mapped : 100;
  }

  // 3. Net Quantity Subscore (Rule 6(1)(b))
  const netQtyRule = assessments.find(
    (a) =>
      a.ruleNumber.includes('6(1)(b)') ||
      a.ruleId.includes('RULE-06-01-B') ||
      a.ruleTitle.toLowerCase().includes('net quantity')
  );
  let netQtyScore = 100;
  if (netQtyRule) {
    const mapped = resultToScore(netQtyRule.result);
    netQtyScore = mapped !== null ? mapped : 100;
  }

  // 4. Evidence Sufficiency Subscore
  let evidenceScore = 80;
  if (packageAnalysis?.quality) {
    const qualityScore = Math.round(packageAnalysis.quality.overallScore * 100);
    const hasWarnings = (packageAnalysis.quality.warnings?.length || 0) > 0;
    evidenceScore = hasWarnings ? Math.max(30, qualityScore - 20) : qualityScore;
  } else if (assessments.some((a) => a.result === 'INSUFFICIENT_EVIDENCE')) {
    evidenceScore = 40;
  }

  // Weighted aggregation
  const weightedTotal = Math.round(
    0.40 * mandatoryScore +
    0.25 * mrpScore +
    0.20 * netQtyScore +
    0.15 * evidenceScore
  );

  return {
    overallScore: Math.max(0, Math.min(100, weightedTotal)),
    mandatoryDeclarationsScore: mandatoryScore,
    mrpComplianceScore: mrpScore,
    netQuantityComplianceScore: netQtyScore,
    evidenceSufficiencyScore: evidenceScore,
    disclaimer:
      'The LM-Vision Assessment Score is an advisory operational index. It is not a statutory legal determination and does not replace official compliance findings under GSR 202(E).',
  };
}
