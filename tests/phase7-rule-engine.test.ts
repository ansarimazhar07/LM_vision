import { describe, expect, it } from 'vitest';
import {
  type PackageAnalysis,
  type Declaration,
  type Rule,
  ComplianceAssessmentSchema,
  ComplianceEvaluationSummarySchema,
  validateRuleLifecycle,
} from '@lm-vision/shared-types';
import {
  AUTHORITATIVE_BUNDLE_ID,
  BUNDLE_CHECKSUM_SHA256,
  AUTHORITATIVE_RULE_BUNDLE_MANIFEST,
  AUTHORITATIVE_GSR202E_RULES,
  loadAuthoritativeRuleBundle,
  getAuthoritativeRule,
  getAllAuthoritativeRules,
  verifyBundleIntegrity,
  evaluateCompliance,
} from '@lm-vision/rules';

function createMockAnalysis(
  declarations: Declaration[],
  options?: {
    qualityAcceptable?: boolean;
    sharpness?: number;
    measurements?: any[];
  }
): PackageAnalysis {
  return {
    provider: 'GEMINI',
    modelName: 'gemini-3.5-flash',
    quality: {
      overallScore: options?.qualityAcceptable === false ? 0.2 : 0.95,
      isAcceptable: options?.qualityAcceptable ?? true,
      sharpness: options?.sharpness ?? (options?.qualityAcceptable === false ? 25 : 85),
      brightness: 75,
      glareDetected: false,
      blurDetected: options?.qualityAcceptable === false,
      shadowDetected: false,
      warnings: [],
    },
    declarations,
    textRegions: [],
    visualMeasurements: options?.measurements ?? [],
    latencyMs: 1200,
    timestamp: new Date().toISOString(),
  };
}

describe('Phase 7: Deterministic Legal Metrology Compliance Engine', () => {
  // ==========================================================================
  // Group 1: Statutory Authority & Lifecycle Safety (Tests 1–4)
  // ==========================================================================
  describe('Group 1: Statutory Authority & Lifecycle Safety', () => {
    it('1. should verify authoritative rule bundle integrity, manifest, and checksum', () => {
      const bundle = loadAuthoritativeRuleBundle();
      expect(bundle).toBeDefined();
      expect(bundle.manifest.bundleId).toBe(AUTHORITATIVE_BUNDLE_ID);
      expect(bundle.manifest.contentChecksum).toBe(BUNDLE_CHECKSUM_SHA256);
      expect(bundle.manifest.ruleCount).toBe(8);
      expect(bundle.rules.length).toBe(8);
      expect(verifyBundleIntegrity()).toBe(true);
    });

    it('2. should verify software bundle identifier LM-IN-RULES-2026.09 is distinct from 2011 statutory gazette', () => {
      expect(AUTHORITATIVE_RULE_BUNDLE_MANIFEST.bundleId).toBe('LM-IN-RULES-2026.09');
      expect(AUTHORITATIVE_RULE_BUNDLE_MANIFEST.gazetteNotificationNumber).toBe('G.S.R. 202(E)');
      expect(AUTHORITATIVE_RULE_BUNDLE_MANIFEST.gazetteNotificationDate).toBe('2011-03-07');
      expect(AUTHORITATIVE_RULE_BUNDLE_MANIFEST.effectiveDate).toBe('2011-04-01');
      expect(AUTHORITATIVE_RULE_BUNDLE_MANIFEST.sourceDocumentFileName).toBe('GSR 202(E).pdf');
    });

    it('3. should reject non-authoritative, draft, or unverified rules from authoritative lifecycle', () => {
      const draftRule: Rule = {
        ruleId: 'INVALID-TEST-RULE',
        ruleNumber: '99',
        title: 'Draft Rule',
        description: 'Testing lifecycle gate',
        ruleKind: 'AUTHORITATIVE',
        sourceStatus: 'UNVERIFIED', // Invalid for AUTHORITATIVE
        applicability: { appliesToDomestic: true, appliesToImported: true },
        conditions: [],
        requirement: 'Must be verified',
        validationType: 'FIELD_PRESENT',
        exceptions: [],
        severity: 'MAJOR',
        effectiveFrom: '2011-04-01T00:00:00Z',
        humanVerificationRequired: false,
        status: 'ACTIVE',
        lifecycle: 'ACTIVE',
        version: 1,
        createdAt: '2011-04-01T00:00:00Z',
        updatedAt: '2011-04-01T00:00:00Z',
      };

      const lifecycleCheck = validateRuleLifecycle(draftRule);
      expect(lifecycleCheck.valid).toBe(false);
      expect(lifecycleCheck.reason).toMatch(/sourceStatus/);
    });

    it('4. should confirm every authoritative rule cites GSR 202(E) PDF page numbers and clauses', () => {
      const allRules = getAllAuthoritativeRules();
      expect(allRules.length).toBe(8);

      for (const rule of allRules) {
        expect(rule.ruleKind).toBe('AUTHORITATIVE');
        expect(rule.sourceStatus).toBe('VERIFIED');
        expect(rule.sourceMetadata).toBeDefined();
        expect(rule.sourceMetadata?.sourcePage).toBeGreaterThan(0);
        expect(rule.sourceMetadata?.gazetteNotificationNumber).toContain('202');
        expect(rule.sourceMetadata?.clauseReference).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Group 2: Rule 6(1)(a) & 10(1) Manufacturer/Packer Address (Tests 5–8)
  // ==========================================================================
  describe('Group 2: Rule 6(1)(a) & 10(1) Manufacturer Identity & Complete Address', () => {
    it('5. should PASS when conspicuous manufacturer name and complete address with city/PIN is present', () => {
      const analysis = createMockAnalysis([
        {
          type: 'MANUFACTURER_NAME_ADDRESS',
          rawText: 'Manufactured by Hindustan Unilever Limited, Plot 12, Industrial Area, Haridwar, Uttarakhand, PIN: 249403',
          confidence: 0.95,
          detectedLanguage: 'en',
        },
      ]);

      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-A');
      expect(assessment).toBeDefined();
      expect(assessment?.result).toBe('PASS');
      expect(assessment?.evidenceSufficiency).toBe('SUFFICIENT');
      expect(assessment?.ruleSource.clauseReference).toBe('Rule 6(1)(a) & Rule 10(1)');
    });

    it('6. should FAIL when manufacturer/packer declaration is entirely missing from label', () => {
      const analysis = createMockAnalysis([]);
      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-A');
      expect(assessment).toBeDefined();
      expect(assessment?.result).toBe('FAIL');
      expect(assessment?.explanation).toContain('No declaration of the name and complete address');
      expect(assessment?.severity).toBe('CRITICAL');
    });

    it('7. should return REQUIRES_VERIFICATION when manufacturer name is declared but address lacks postal city/PIN', () => {
      const analysis = createMockAnalysis([
        {
          type: 'MANUFACTURER_NAME_ADDRESS',
          rawText: 'Mfg by ABC Foods',
          confidence: 0.9,
          detectedLanguage: 'en',
        },
      ]);

      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-A');
      expect(assessment).toBeDefined();
      expect(assessment?.result).toBe('REQUIRES_VERIFICATION');
      expect(assessment?.explanation).toContain('address appears partial or lacks identifiable postal/city/pin');
    });

    it('8. should return INSUFFICIENT_EVIDENCE when blur or poor image quality prevents verification', () => {
      const analysis = createMockAnalysis([], { qualityAcceptable: false, sharpness: 20 });
      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-A');
      expect(assessment).toBeDefined();
      expect(assessment?.result).toBe('INSUFFICIENT_EVIDENCE');
      expect(assessment?.evidenceSufficiency).toBe('INSUFFICIENT');
    });
  });

  // ==========================================================================
  // Group 3: Rule 6(1)(b) Generic or Common Name (Tests 9–11)
  // ==========================================================================
  describe('Group 3: Rule 6(1)(b) Generic or Common Name of Commodity', () => {
    it('9. should PASS when generic name is clearly declared', () => {
      const analysis = createMockAnalysis([
        {
          type: 'GENERIC_NAME',
          rawText: 'Refined Sunflower Oil',
          confidence: 0.94,
          detectedLanguage: 'en',
        },
      ]);

      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-B');
      expect(assessment?.result).toBe('PASS');
    });

    it('10. should FAIL when common/generic commodity name is missing from package', () => {
      const analysis = createMockAnalysis([]);
      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-B');
      expect(assessment?.result).toBe('FAIL');
      expect(assessment?.explanation).toContain('Common or generic name of the commodity is missing');
    });

    it('11. should return INSUFFICIENT_EVIDENCE when extraction confidence is below 0.45', () => {
      const analysis = createMockAnalysis([
        {
          type: 'GENERIC_NAME',
          rawText: 'Unclear Oil',
          confidence: 0.35,
          detectedLanguage: 'en',
        },
      ]);

      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-B');
      expect(assessment?.result).toBe('INSUFFICIENT_EVIDENCE');
      expect(assessment?.evidenceSufficiency).toBe('LOW_CONFIDENCE');
    });
  });

  // ==========================================================================
  // Group 4: Rule 6(1)(c) & 11, 12, 13 Net Quantity in SI Units (Tests 12–15)
  // ==========================================================================
  describe('Group 4: Rule 6(1)(c) Net Quantity in Standard SI Units', () => {
    it('12. should PASS for valid standard SI unit declarations (500 g, 1 kg, 1 L, 10 N)', () => {
      const testCases = [
        { rawText: 'Net Weight: 500 g', unit: 'g', normalizedValue: 500 },
        { rawText: 'Net Qty: 1 kg', unit: 'kg', normalizedValue: 1 },
        { rawText: 'Net Volume: 1 L', unit: 'l', normalizedValue: 1 },
        { rawText: 'Quantity: 10 N', unit: 'N', normalizedValue: 10 },
      ];

      for (const tc of testCases) {
        const analysis = createMockAnalysis([
          {
            type: 'NET_QUANTITY',
            rawText: tc.rawText,
            unit: tc.unit,
            normalizedValue: tc.normalizedValue,
            confidence: 0.95,
            detectedLanguage: 'en',
          },
        ]);

        const summary = evaluateCompliance({
          inspectionId: '11111111-1111-4111-8111-111111111111',
          packageAnalysis: analysis,
        });

        const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-C');
        expect(assessment?.result).toBe('PASS');
      }
    });

    it('13. should FAIL when non-metric prohibited units (lbs, oz, dozen) are used under Rule 13(4)', () => {
      const prohibitedCases = ['Net Wt: 2 lbs', 'Net Contents: 16 oz', 'Quantity: 1 dozen'];

      for (const text of prohibitedCases) {
        const analysis = createMockAnalysis([
          {
            type: 'NET_QUANTITY',
            rawText: text,
            confidence: 0.95,
            detectedLanguage: 'en',
          },
        ]);

        const summary = evaluateCompliance({
          inspectionId: '11111111-1111-4111-8111-111111111111',
          packageAnalysis: analysis,
        });

        const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-C');
        expect(assessment?.result).toBe('FAIL');
        expect(assessment?.explanation).toContain('prohibited non-metric units');
      }
    });

    it('14. should FAIL when misleading expressions ("approx 500g", "not less than 1kg") are used under Rule 11(2)', () => {
      const analysis = createMockAnalysis([
        {
          type: 'NET_QUANTITY',
          rawText: 'Net Wt: approx 500g',
          confidence: 0.95,
          detectedLanguage: 'en',
        },
      ]);

      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-C');
      expect(assessment?.result).toBe('FAIL');
      expect(assessment?.explanation).toContain('strictly prohibited under Rule 11(2)');
    });

    it('15. should FAIL when net quantity declaration is missing', () => {
      const analysis = createMockAnalysis([]);
      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-C');
      expect(assessment?.result).toBe('FAIL');
      expect(assessment?.explanation).toContain('Net quantity declaration is missing');
    });
  });

  // ==========================================================================
  // Group 5: Rule 6(1)(d) Month & Year of Manufacture & Exemptions (Tests 16–18)
  // ==========================================================================
  describe('Group 5: Rule 6(1)(d) Month & Year of Manufacture and Exemptions', () => {
    it('16. should PASS when valid month and year is declared (e.g. 03/2026 or March 2026)', () => {
      const analysis = createMockAnalysis([
        {
          type: 'DATE_OF_MANUFACTURE',
          rawText: 'Mfg Date: 03/2026',
          confidence: 0.92,
          detectedLanguage: 'en',
        },
      ]);

      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-D');
      expect(assessment?.result).toBe('PASS');
    });

    it('17. should FAIL when date is missing on a non-exempt retail commodity', () => {
      const analysis = createMockAnalysis([]);
      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-D');
      expect(assessment?.result).toBe('FAIL');
      expect(assessment?.explanation).toContain('Month and year of manufacture, pre-packing, or import is missing');
    });

    it('18. should return NOT_APPLICABLE for Bidi, Agarbatti, or LPG under Rule 6(1)(g) Proviso A', () => {
      const analysis = createMockAnalysis([]);
      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
        commodityCategory: 'BIDI',
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-D');
      expect(assessment?.result).toBe('NOT_APPLICABLE');
      expect(assessment?.explanation).toContain('Rule 6(1)(g) Proviso A');
    });
  });

  // ==========================================================================
  // Group 6: Rule 6(1)(e) Retail Sale Price (MRP) & Sticker Prohibition (Tests 19–21)
  // ==========================================================================
  describe('Group 6: Rule 6(1)(e) Retail Sale Price (MRP) Inclusive of All Taxes', () => {
    it('19. should PASS for standard statutory MRP declaration with "inclusive of all taxes"', () => {
      const analysis = createMockAnalysis([
        {
          type: 'MRP',
          rawText: 'MRP Rs. 149.00 (inclusive of all taxes)',
          normalizedValue: 149.0,
          confidence: 0.95,
          detectedLanguage: 'en',
        },
      ]);

      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-E');
      expect(assessment?.result).toBe('PASS');
    });

    it('20. should FAIL when unauthorized overprinted sticker altering price is detected under Rule 6(3)', () => {
      const analysis = createMockAnalysis([
        {
          type: 'MRP',
          rawText: 'MRP Rs. 199.00 overprinted sticker altered price',
          normalizedValue: 199.0,
          confidence: 0.9,
          detectedLanguage: 'en',
        },
      ]);

      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-E');
      expect(assessment?.result).toBe('FAIL');
      expect(assessment?.explanation).toContain('Unauthorized sticker altering retail sale price');
    });

    it('21. should FAIL when MRP declares taxes extra under Rule 2(m)', () => {
      const analysis = createMockAnalysis([
        {
          type: 'MRP',
          rawText: 'MRP Rs. 150.00 taxes extra',
          normalizedValue: 150.0,
          confidence: 0.95,
          detectedLanguage: 'en',
        },
      ]);

      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-01-E');
      expect(assessment?.result).toBe('FAIL');
      expect(assessment?.explanation).toContain('inclusive of all taxes');
    });
  });

  // ==========================================================================
  // Group 7: Rule 6(2) Consumer Care Contact Details (Tests 22–23)
  // ==========================================================================
  describe('Group 7: Rule 6(2) Consumer Care Details', () => {
    it('22. should PASS when consumer complaints phone helpline or email is declared', () => {
      const analysis = createMockAnalysis([
        {
          type: 'CONSUMER_CARE_DETAILS',
          rawText: 'For consumer complaints contact Executive at 1800-102-2221 or customercare@brand.com',
          confidence: 0.93,
          detectedLanguage: 'en',
        },
      ]);

      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-02');
      expect(assessment?.result).toBe('PASS');
    });

    it('23. should FAIL when consumer care details are completely absent', () => {
      const analysis = createMockAnalysis([]);
      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-06-02');
      expect(assessment?.result).toBe('FAIL');
      expect(assessment?.explanation).toContain('Consumer care contact details for complaints are missing');
    });
  });

  // ==========================================================================
  // Group 8: Rule 7(2) Table I Numeral Height on PDP (Tests 24–25)
  // ==========================================================================
  describe('Group 8: Rule 7(2) Table I Minimum Numeral Height', () => {
    it('24. should PASS when measured numeral height satisfies Table I threshold (>= 4mm for > 500g)', () => {
      const analysis = createMockAnalysis(
        [
          {
            type: 'NET_QUANTITY',
            rawText: 'Net Wt: 1000 g',
            normalizedValue: 1000,
            unit: 'g',
            confidence: 0.95,
            detectedLanguage: 'en',
          },
        ],
        {
          measurements: [
            {
              id: 'numeral_height_qty',
              type: 'FONT_HEIGHT',
              value: 4.8,
              unit: 'mm',
              confidence: 0.95,
              calibrationApplied: true,
            },
          ],
        }
      );

      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
        packageNetQuantityGramsOrMl: 1000,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-07-02-T1');
      expect(assessment?.result).toBe('PASS');
      expect(assessment?.explanation).toContain('meets the statutory minimum of 4mm');
    });

    it('25. should FAIL when measured numeral height is below Table I threshold (2.5mm for 1000g package, min 4mm)', () => {
      const analysis = createMockAnalysis(
        [
          {
            type: 'NET_QUANTITY',
            rawText: 'Net Wt: 1000 g',
            normalizedValue: 1000,
            unit: 'g',
            confidence: 0.95,
            detectedLanguage: 'en',
          },
        ],
        {
          measurements: [
            {
              id: 'numeral_height_qty',
              type: 'FONT_HEIGHT',
              value: 2.5,
              unit: 'mm',
              confidence: 0.95,
              calibrationApplied: true,
            },
          ],
        }
      );

      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
        packageNetQuantityGramsOrMl: 1000,
      });

      const assessment = summary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-07-02-T1');
      expect(assessment?.result).toBe('FAIL');
      expect(assessment?.explanation).toContain('below the statutory minimum of 4mm');
    });
  });

  // ==========================================================================
  // Group 9: Rule 18(2) MRP Overcharge & Rule 3 Exemptions (Tests 26–27)
  // ==========================================================================
  describe('Group 9: Rule 18(2) Overcharge and Rule 3 Exemptions', () => {
    it('26. should evaluate Rule 18(2): FAIL on overcharge, PASS on compliant price, NOT_APPLICABLE when no sale price provided', () => {
      const analysis = createMockAnalysis([
        {
          type: 'MRP',
          rawText: 'MRP Rs. 100.00 incl of all taxes',
          normalizedValue: 100.0,
          confidence: 0.95,
          detectedLanguage: 'en',
        },
      ]);

      // Overcharge case: charged 120 vs MRP 100 -> FAIL
      const overchargeSummary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
        actualSalePrice: 120,
      });
      const overchargeAssessment = overchargeSummary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-18-02');
      expect(overchargeAssessment?.result).toBe('FAIL');
      expect(overchargeAssessment?.severity).toBe('CRITICAL');
      expect(overchargeAssessment?.explanation).toContain('overcharging violation under Rule 18(2)');

      // Compliant case: charged 95 vs MRP 100 -> PASS
      const compliantSummary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
        actualSalePrice: 95,
      });
      const compliantAssessment = compliantSummary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-18-02');
      expect(compliantAssessment?.result).toBe('PASS');

      // No transaction price case -> NOT_APPLICABLE
      const noSaleSummary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });
      const noSaleAssessment = noSaleSummary.assessments.find((a) => a.ruleId === 'GSR-202E-RULE-18-02');
      expect(noSaleAssessment?.result).toBe('NOT_APPLICABLE');
    });

    it('27. should return NOT_APPLICABLE under Rule 3 for packages > 25kg (Rule 3(a)) or Industrial/Institutional (Rule 3(b))', () => {
      const analysis = createMockAnalysis([]);

      // Rule 3(a): Wholesale > 25kg
      const wholesaleSummary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
        packageType: 'WHOLESALE',
        packageNetQuantityGramsOrMl: 50000, // 50kg
        commodityCategory: 'GRAIN',
      });
      expect(wholesaleSummary.overallStatus).toBe('NOT_APPLICABLE');
      expect(wholesaleSummary.assessments.every((a) => a.result === 'NOT_APPLICABLE')).toBe(true);

      // Rule 3(b): Industrial/Institutional
      const industrialSummary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
        packageType: 'INDUSTRIAL',
      });
      expect(industrialSummary.overallStatus).toBe('NOT_APPLICABLE');
      expect(industrialSummary.assessments[0]?.explanation).toContain('Rule 3(b)');
    });
  });

  // ==========================================================================
  // Zod Entity Validation Verification
  // ==========================================================================
  describe('Zod Schema Verification', () => {
    it('should validate compliance assessments and evaluation summaries against canonical Zod schemas', () => {
      const analysis = createMockAnalysis([
        {
          type: 'GENERIC_NAME',
          rawText: 'Atta',
          confidence: 0.9,
          detectedLanguage: 'en',
        },
      ]);

      const summary = evaluateCompliance({
        inspectionId: '11111111-1111-4111-8111-111111111111',
        packageAnalysis: analysis,
      });

      expect(() => ComplianceEvaluationSummarySchema.parse(summary)).not.toThrow();
      for (const assessment of summary.assessments) {
        expect(() => ComplianceAssessmentSchema.parse(assessment)).not.toThrow();
      }
    });
  });
});
