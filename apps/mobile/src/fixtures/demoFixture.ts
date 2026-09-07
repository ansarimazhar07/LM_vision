import type { Declaration, Finding, PackageAnalysis } from '@lm-vision/shared-types';

/**
 * ABC Shampoo 500ml Demo Scenario Fixture
 * Matches docs/12_DEMO_SCENARIO.md specification.
 * 
 * IMPORTANT ARCHITECTURAL INVARIANTS:
 * 1. This is a deterministic local fixture for demonstration and mobile test execution.
 * 2. Production OCR, OpenCV, and Rule Engine live services are not executed in this demo mode.
 * 3. Cross-source finding is clearly attributed to 'Demo cross-source fixture' with
 *    status 'SUSPECTED_NON_COMPLIANCE' and requires inspector human verification.
 */

export const DEMO_PRODUCT = {
  name: 'ABC Herbal Anti-Dandruff Shampoo',
  brand: 'ABC HealthCare',
  category: 'PERSONAL_CARE_COSMETICS' as const,
  packageType: 'BOTTLE' as const,
  netQuantity: '500 ml',
  batchNumber: 'ABC-2026-B882',
  physicalMrp: 249,
  onlineMrp: 299,
};

export function createDemoAnalysis(inspectionId: string, imageIds: string[] = []): {
  analysis: PackageAnalysis;
  declarations: Declaration[];
  findings: Finding[];
} {
  const now = new Date().toISOString();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const canonicalInspectionId = UUID_REGEX.test(inspectionId)
    ? inspectionId
    : '11111111-1111-4111-8111-111111111111';
  const primaryImageId = (imageIds[0] && UUID_REGEX.test(imageIds[0]))
    ? imageIds[0]
    : '11111111-1111-4111-8111-111111111111';
  const secondaryImageId = (imageIds[1] && UUID_REGEX.test(imageIds[1]))
    ? imageIds[1]
    : '22222222-2222-4222-8222-222222222222';

  const declarations: Declaration[] = [
    {
      type: 'GENERIC_NAME',
      rawText: 'Anti-Dandruff Shampoo with Tea Tree Oil',
      normalizedValue: 'Shampoo',
      unit: null,
      confidence: 0.98,
      isFormatStandard: true,
      detectedLanguage: 'en',
      region: {
        id: 'region-generic-name',
        imageId: primaryImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.15, yMin: 0.28, xMax: 0.85, yMax: 0.38, unit: 'NORMALIZED' },
        text: 'Anti-Dandruff Shampoo with Tea Tree Oil',
        confidence: 0.98,
        lineCount: 1,
        estimatedFontHeightMm: 4.5,
      },
    },
    {
      type: 'NET_QUANTITY',
      rawText: 'Net Vol. 500 ml',
      normalizedValue: 500,
      unit: 'ml',
      confidence: 0.96,
      isFormatStandard: true,
      detectedLanguage: 'en',
      region: {
        id: 'region-net-qty',
        imageId: primaryImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.25, yMin: 0.78, xMax: 0.75, yMax: 0.85, unit: 'NORMALIZED' },
        text: 'Net Vol. 500 ml',
        confidence: 0.96,
        lineCount: 1,
        estimatedFontHeightMm: 1.8,
      },
    },
    {
      type: 'MRP',
      rawText: 'MRP Rs. 249.00 (Inclusive of all taxes)',
      normalizedValue: 249,
      unit: 'INR',
      confidence: 0.95,
      isFormatStandard: true,
      detectedLanguage: 'en',
      region: {
        id: 'region-mrp',
        imageId: secondaryImageId,
        surface: 'BACK',
        boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.28, unit: 'NORMALIZED' },
        text: 'MRP Rs. 249.00 (Inclusive of all taxes)',
        confidence: 0.95,
        lineCount: 1,
        estimatedFontHeightMm: 2.2,
      },
    },
    {
      type: 'MANUFACTURER_NAME_ADDRESS',
      rawText: 'Manufactured by: ABC Consumer Goods Pvt Ltd, Plot 42, Industrial Area, Solan, HP 173205',
      normalizedValue: 'ABC Consumer Goods Pvt Ltd',
      unit: null,
      confidence: 0.92,
      isFormatStandard: true,
      detectedLanguage: 'en',
      region: {
        id: 'region-mfr',
        imageId: secondaryImageId,
        surface: 'BACK',
        boundingBox: { xMin: 0.1, yMin: 0.35, xMax: 0.9, yMax: 0.48, unit: 'NORMALIZED' },
        text: 'Manufactured by: ABC Consumer Goods Pvt Ltd, Plot 42, Industrial Area, Solan, HP 173205',
        confidence: 0.92,
        lineCount: 2,
        estimatedFontHeightMm: 1.6,
      },
    },
    {
      type: 'CONSUMER_CARE_DETAILS',
      rawText: 'For consumer feedback or queries write to: care@abcgoods.com',
      normalizedValue: 'care@abcgoods.com',
      unit: null,
      confidence: 0.88,
      isFormatStandard: false,
      detectedLanguage: 'en',
      region: {
        id: 'region-care',
        imageId: secondaryImageId,
        surface: 'BACK',
        boundingBox: { xMin: 0.1, yMin: 0.52, xMax: 0.9, yMax: 0.62, unit: 'NORMALIZED' },
        text: 'For consumer feedback or queries write to: care@abcgoods.com',
        confidence: 0.88,
        lineCount: 1,
        estimatedFontHeightMm: 1.5,
      },
    },
    {
      type: 'DATE_OF_PACKAGING',
      rawText: 'Pkd: 08/2026',
      normalizedValue: '2026-08-01',
      unit: null,
      confidence: 0.91,
      isFormatStandard: true,
      detectedLanguage: 'en',
      region: {
        id: 'region-date',
        imageId: secondaryImageId,
        surface: 'BACK',
        boundingBox: { xMin: 0.1, yMin: 0.68, xMax: 0.45, yMax: 0.74, unit: 'NORMALIZED' },
        text: 'Pkd: 08/2026',
        confidence: 0.91,
        lineCount: 1,
        estimatedFontHeightMm: 1.8,
      },
    },
  ];

  const findings: Finding[] = [
    {
      id: '22222222-2222-4222-8222-222222222221',
      inspectionId: canonicalInspectionId,
      ruleId: 'RULE-LM-PC-06-CONSUMER-CARE',
      ruleTitle: 'Mandatory Consumer Care Phone and Email',
      ruleCitation: 'Legal Metrology (Packaged Commodities) Rules, Rule 6(1)(n)',
      declarationType: 'CONSUMER_CARE_DETAILS',
      status: 'MANUAL_REVIEW',
      severity: 'MAJOR',
      title: 'Missing Consumer Care Phone Number',
      description:
        'Consumer care email address is declared (care@abcgoods.com), but statutory telephone helpline number is missing from the package label. Inspector verification required.',
      actualValue: 'Email only: care@abcgoods.com',
      expectedValue: 'Email and telephone helpline number',
      deviation: 'Telephone contact detail missing',
      confidence: 0.91,
      aiExplanation:
        'Rule 6(1)(n) mandates both electronic contact (email/website) and telephone contact. The label text extractor detected only the email address.',
      evidenceIds: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      inspectionId: canonicalInspectionId,
      ruleId: 'RULE-LM-PC-09-TYPOGRAPHY-HEIGHT',
      ruleTitle: 'Minimum Font Height for Net Quantity Declaration',
      ruleCitation: 'Legal Metrology (Packaged Commodities) Rules, Rule 9 Table 1',
      declarationType: 'NET_QUANTITY',
      status: 'MANUAL_REVIEW',
      severity: 'MINOR',
      title: 'Typography Height Near Statutory Threshold',
      description:
        'Net quantity numeral height estimated at ~1.8mm. The statutory minimum for packages exceeding 200ml up to 500ml is 2.0mm. Manual measurement with optical reticle is recommended.',
      actualValue: '1.8 mm (estimated)',
      expectedValue: '>= 2.0 mm',
      deviation: '-0.2 mm (-10%)',
      confidence: 0.84,
      aiExplanation:
        'Visual geometry estimation indicates potential non-compliance of numeral font height on front panel. Physical verification is required.',
      evidenceIds: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '22222222-2222-4222-8222-222222222223',
      inspectionId: canonicalInspectionId,
      ruleId: 'TEST_FIXTURE_CROSS_SOURCE_MRP_MATCH',
      ruleTitle: '[DEMO FIXTURE] Physical MRP vs E-Commerce Listed MRP Concordance',
      ruleCitation: 'Demo cross-source fixture',
      declarationType: 'MRP',
      status: 'SUSPECTED_NON_COMPLIANCE',
      severity: 'CRITICAL',
      title: 'MRP mismatch detected',
      description:
        'Finding:\nMRP mismatch detected\n\nSource:\nDemo cross-source fixture\n\nStatus:\nSUSPECTED_NON_COMPLIANCE\n\nVerification:\nInspector review required\n\nContext:\nPhysical package label displays printed MRP of Rs. 249 (inclusive of all taxes). Demo cross-source fixture indicates online listed MRP of Rs. 299 (+Rs. 50 difference).\n\nNote: Automated statutory cross-source determination is deferred in MVP. This finding represents suspected non-compliance for inspector evaluation.',
      actualValue: { physicalMrpInr: 249, onlineListedMrpInr: 299 },
      expectedValue: { maxOnlineAllowedMrpInr: 249 },
      deviation: '+Rs. 50.00 (+20.08% online premium)',
      confidence: 0.94,
      aiExplanation:
        'Physical MRP on packaging: Rs. 249. Demo fixture online MRP: Rs. 299. Inspector verification required before any enforcement decision.',
      evidenceIds: [],
      createdAt: now,
      updatedAt: now,
    },
  ];

  const analysis: PackageAnalysis = {
    provider: 'MOCK',
    modelName: 'lm-vision-demo-fixture-v1',
    quality: {
      overallScore: 0.94,
      isAcceptable: true,
      sharpness: 92,
      brightness: 88,
      glareDetected: false,
      blurDetected: false,
      shadowDetected: false,
      warnings: [],
    },
    declarations,
    textRegions: declarations.map((d) => d.region!).filter(Boolean),
    visualMeasurements: [
      {
        id: 'vm-font-height-net-qty',
        type: 'FONT_HEIGHT',
        value: 1.8,
        unit: 'mm',
        confidence: 0.85,
        targetRegionId: 'region-net-qty',
        targetSurface: 'FRONT',
        calibrationApplied: false,
      },
    ],
    latencyMs: 650,
    usage: {
      promptTokens: 1200,
      completionTokens: 850,
      totalTokens: 2050,
    },
    timestamp: now,
  };

  return { analysis, declarations, findings };
}
