import type { Declaration, Evidence, Finding } from '@lm-vision/shared-types';
import type { NormalizedImage } from './types';

export interface RuleEvaluationResult {
  findings: Finding[];
  evidence: Evidence[];
}

/**
 * Mock Rule Evaluator: Applies non-statutory Demo/Test rules to extracted declarations.
 * Explicitly labeled as DEMO / TEST rules pending authoritative legal ingestion in future phases.
 * 
 * Creates a complete provenance chain:
 * Finding -> Declaration -> TextRegion -> Real Captured Photo (Evidence)
 */
export function evaluateMockRules(
  inspectionId: string,
  _declarations: Declaration[],
  images: NormalizedImage[],
  options?: { onlineListedMrp?: number },
): RuleEvaluationResult {
  const now = new Date().toISOString();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const canonicalInspectionId = UUID_REGEX.test(inspectionId)
    ? inspectionId
    : '11111111-1111-4111-8111-111111111111';

  const frontImg = images.find((i) => i.surface === 'FRONT') || images[0]!;
  const backImg = images.find((i) => i.surface === 'BACK') || images[1] || frontImg;

  // Finding 1: Demo/Test Consumer Care
  const findingId1 = '22222222-2222-4222-8222-222222222221';
  const evidenceId1 = '33333333-3333-4333-8333-000000000001';
  const evidence1: Evidence = {
    id: evidenceId1,
    inspectionId: canonicalInspectionId,
    findingId: findingId1,
    type: 'PACKAGE_IMAGE',
    status: 'ATTACHED',
    title: `Surface Evidence (${backImg.surface})`,
    description: `Captured photograph of package ${backImg.surface} surface for consumer care verification.`,
    fileUrl: backImg.fileUrl,
    mimeType: backImg.mimeType,
    fileSizeBytes: backImg.fileSizeBytes,
    sha256Hash: backImg.sha256Hash,
    capturedAt: backImg.capturedAt,
    capturedByUserId: '00000000-0000-4000-8000-000000000001',
    chainOfCustody: [],
    createdAt: now,
    updatedAt: now,
  };

  const finding1: Finding = {
    id: findingId1,
    inspectionId: canonicalInspectionId,
    ruleId: 'DEMO-TEST-RULE-01-CONSUMER-CARE',
    ruleTitle: 'Demo/Test: Consumer Care Helpline Validation',
    ruleCitation: 'Demo/Test Rules (Simulated Rule 6(1)(n))',
    declarationType: 'CONSUMER_CARE_DETAILS',
    status: 'MANUAL_REVIEW',
    severity: 'MAJOR',
    title: 'Demo/Test: Missing Consumer Care Phone Number',
    description:
      'Consumer care email address is declared (care@abcgoods.com), but statutory telephone helpline number is missing from the package label. Inspector verification required.',
    actualValue: 'Email only: care@abcgoods.com',
    expectedValue: 'Email and telephone helpline number',
    deviation: 'Telephone contact detail missing',
    confidence: 0.91,
    aiExplanation:
      '[DEMO/TEST EVALUATION] Simulated rule check detects email without companion phone number. Non-statutory demo finding.',
    targetRegionId: 'region-care',
    evidenceIds: [evidenceId1],
    createdAt: now,
    updatedAt: now,
  };

  // Finding 2: Demo/Test Typography Height
  const findingId2 = '22222222-2222-4222-8222-222222222222';
  const evidenceId2 = '33333333-3333-4333-8333-000000000002';
  const evidence2: Evidence = {
    id: evidenceId2,
    inspectionId: canonicalInspectionId,
    findingId: findingId2,
    type: 'PACKAGE_IMAGE',
    status: 'ATTACHED',
    title: `Surface Evidence (${frontImg.surface})`,
    description: `Captured photograph of package ${frontImg.surface} surface for net quantity numeral font measurement.`,
    fileUrl: frontImg.fileUrl,
    mimeType: frontImg.mimeType,
    fileSizeBytes: frontImg.fileSizeBytes,
    sha256Hash: frontImg.sha256Hash,
    capturedAt: frontImg.capturedAt,
    capturedByUserId: '00000000-0000-4000-8000-000000000001',
    chainOfCustody: [],
    createdAt: now,
    updatedAt: now,
  };

  const finding2: Finding = {
    id: findingId2,
    inspectionId: canonicalInspectionId,
    ruleId: 'DEMO-TEST-RULE-02-TYPOGRAPHY-HEIGHT',
    ruleTitle: 'Demo/Test: Minimum Font Height for Net Quantity',
    ruleCitation: 'Demo/Test Rules (Simulated Rule 9 Table 1)',
    declarationType: 'NET_QUANTITY',
    status: 'MANUAL_REVIEW',
    severity: 'MINOR',
    title: 'Demo/Test: Typography Height Near Statutory Threshold',
    description:
      'Net quantity numeral height estimated at ~1.8mm. The statutory minimum for packages exceeding 200ml up to 500ml is 2.0mm. Manual measurement with optical reticle is recommended.',
    actualValue: '1.8 mm (estimated)',
    expectedValue: '>= 2.0 mm',
    deviation: '-0.2 mm (-10%)',
    confidence: 0.84,
    aiExplanation:
      '[DEMO/TEST EVALUATION] Visual geometry estimation indicates potential numeral font height non-compliance. Manual inspection required.',
    targetRegionId: 'region-net-qty',
    evidenceIds: [evidenceId2],
    createdAt: now,
    updatedAt: now,
  };

  // Finding 3: Demo/Test MRP Cross-Source Match
  const physicalMrp = 249;
  const onlineMrp = options?.onlineListedMrp ?? 299;
  const findingId3 = '22222222-2222-4222-8222-222222222223';
  const evidenceId3 = '33333333-3333-4333-8333-000000000003';
  const evidence3: Evidence = {
    id: evidenceId3,
    inspectionId: canonicalInspectionId,
    findingId: findingId3,
    type: 'PACKAGE_IMAGE',
    status: 'ATTACHED',
    title: `Surface Evidence (${backImg.surface})`,
    description: `Captured photograph of package ${backImg.surface} surface for MRP declaration concordance.`,
    fileUrl: backImg.fileUrl,
    mimeType: backImg.mimeType,
    fileSizeBytes: backImg.fileSizeBytes,
    sha256Hash: backImg.sha256Hash,
    capturedAt: backImg.capturedAt,
    capturedByUserId: '00000000-0000-4000-8000-000000000001',
    chainOfCustody: [],
    createdAt: now,
    updatedAt: now,
  };

  const finding3: Finding = {
    id: findingId3,
    inspectionId: canonicalInspectionId,
    ruleId: 'DEMO-TEST-RULE-03-CROSS-SOURCE-MRP-MATCH',
    ruleTitle: 'Demo/Test: Physical MRP vs E-Commerce Listed MRP Concordance',
    ruleCitation: 'Demo/Test Rules (Simulated Cross-Source Concordance)',
    declarationType: 'MRP',
    status: 'SUSPECTED_NON_COMPLIANCE',
    severity: 'CRITICAL',
    title: 'Demo/Test: MRP mismatch detected',
    description:
      `Finding:\nDemo/Test: MRP mismatch detected\n\nSource:\nDemo/Test Rules (Simulated)\n\nStatus:\nSUSPECTED_NON_COMPLIANCE\n\nVerification:\nInspector review required\n\nContext:\nPhysical package label displays printed MRP of Rs. ${physicalMrp} (inclusive of all taxes). Demo cross-source fixture indicates online listed MRP of Rs. ${onlineMrp} (+Rs. ${onlineMrp - physicalMrp} difference).\n\nNote: Automated statutory cross-source determination is deferred. This simulated finding represents suspected non-compliance for inspector evaluation.`,
    actualValue: { physicalMrpInr: physicalMrp, onlineListedMrpInr: onlineMrp },
    expectedValue: { maxOnlineAllowedMrpInr: physicalMrp },
    deviation: `+Rs. ${(onlineMrp - physicalMrp).toFixed(2)} (+${(((onlineMrp - physicalMrp) / physicalMrp) * 100).toFixed(2)}% online premium)`,
    confidence: 0.94,
    aiExplanation:
      `[DEMO/TEST EVALUATION] Physical MRP on packaging: Rs. ${physicalMrp}. Demo online MRP: Rs. ${onlineMrp}. Inspector verification required before any enforcement decision.`,
    targetRegionId: 'region-mrp',
    evidenceIds: [evidenceId3],
    createdAt: now,
    updatedAt: now,
  };

  return {
    findings: [finding1, finding2, finding3],
    evidence: [evidence1, evidence2, evidence3],
  };
}
