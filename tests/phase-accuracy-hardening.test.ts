/**
 * Phase Offline Declaration Extraction Accuracy Hardening Tests
 *
 * Exhaustive unit tests for:
 * 1. Dedicated extractors for all 10 target fields
 * 2. Spatial windowing and reading-order line grouping
 * 3. Unit canonicalization and missing unit handling
 * 4. MRP character confusion repair (restricted to currency context)
 * 5. Manufacture vs Packing vs Import vs Expiry date separation
 * 6. Address grouping with and without PIN codes
 * 7. Consumer care extraction and isolation from address phone numbers
 * 8. Selective multi-pass trigger evaluation
 * 9. Field-aware consensus agreement
 * 10. False-positive immunity against PINs, phones, barcodes, batches
 */

import { describe, expect, it } from 'vitest';
import type { TextRegion } from '@lm-vision/shared-types';
import {
  ProductNameExtractor,
  ManufacturerExtractor,
  PackerExtractor,
  ImporterExtractor,
  NetQuantityExtractor,
  MRPExtractor,
  DateExtractor,
  ConsumerCareExtractor,
  extractBoundedWindows,
  sortRegionsReadingOrder,
  evaluateMultiPassTriggers,
  runFieldAwareConsensus,
  validateNetQuantity,
  validateMRP,
  validateDateCandidate,
  validateConsumerCare,
  validateEntityAddress,
} from '../packages/perception/src/index.js';

function makeRegion(id: string, text: string, box = { xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.2 }, surface: 'FRONT' | 'BACK' = 'BACK'): TextRegion {
  return {
    id,
    imageId: 'img-test-1',
    text,
    boundingBox: {
      ...box,
      width: Number((box.xMax - box.xMin).toFixed(4)),
      height: Number((box.yMax - box.yMin).toFixed(4)),
      unit: 'NORMALIZED',
    },
    confidence: 0.94,
    surface,
  };
}

describe('Offline Declaration Extraction Accuracy Hardening Unit Tests', () => {
  describe('1. Spatial Windowing & Reading Order', () => {
    it('sorts regions by 2D reading order (top-to-bottom, left-to-right on same line)', () => {
      const r1 = makeRegion('r1', 'Top Left', { xMin: 0.1, yMin: 0.1, xMax: 0.4, yMax: 0.15 });
      const r2 = makeRegion('r2', 'Top Right', { xMin: 0.5, yMin: 0.1, xMax: 0.8, yMax: 0.15 });
      const r3 = makeRegion('r3', 'Bottom', { xMin: 0.1, yMin: 0.5, xMax: 0.9, yMax: 0.55 });

      const sorted = sortRegionsReadingOrder([r3, r2, r1]);
      expect(sorted[0]!.id).toBe('r1');
      expect(sorted[1]!.id).toBe('r2');
      expect(sorted[2]!.id).toBe('r3');
    });

    it('creates bounded windows stopping at competing declaration headers', () => {
      const r1 = makeRegion('r1', 'Manufactured by: ABC Agro Ltd', { xMin: 0.1, yMin: 0.1, xMax: 0.8, yMax: 0.15 });
      const r2 = makeRegion('r2', 'Plot 4, Industrial Area, Solan', { xMin: 0.1, yMin: 0.16, xMax: 0.8, yMax: 0.2 });
      const r3 = makeRegion('r3', 'MRP ₹ 150.00', { xMin: 0.1, yMin: 0.25, xMax: 0.5, yMax: 0.3 });

      const windows = extractBoundedWindows([r1, r2, r3]);
      expect(windows.length).toBeGreaterThanOrEqual(2);

      const mfrWindow = windows.find((w) => w.declarationType === 'MANUFACTURER_NAME_ADDRESS');
      expect(mfrWindow).toBeDefined();
      expect(mfrWindow!.combinedText).toContain('ABC Agro Ltd');
      expect(mfrWindow!.combinedText).toContain('Industrial Area');
      expect(mfrWindow!.combinedText).not.toContain('MRP');
    });
  });

  describe('2. Product Name Extractor', () => {
    it('distinguishes product name from brand and generic slogans', () => {
      const extractor = new ProductNameExtractor();
      const regions = [
        makeRegion('r1', 'BRITANNIA', { xMin: 0.2, yMin: 0.1, xMax: 0.8, yMax: 0.18 }, 'FRONT'),
        makeRegion('r2', 'Bourbon Chocolate Biscuits', { xMin: 0.15, yMin: 0.22, xMax: 0.85, yMax: 0.32 }, 'FRONT'),
        makeRegion('r3', 'New & Improved Choco Cream', { xMin: 0.2, yMin: 0.35, xMax: 0.8, yMax: 0.4 }, 'FRONT'),
      ];

      const res = extractor.detect({ regions, imageId: 'img-1' });
      expect(res.length).toBe(1);
      expect(res[0]!.candidate.normalizedText).toBe('Bourbon Chocolate Biscuits');
    });

    it('flags ambiguity when two plausible product names compete closely', () => {
      const extractor = new ProductNameExtractor();
      const regions = [
        makeRegion('r1', 'Chakki Fresh Atta', { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.28 }, 'FRONT'),
        makeRegion('r2', 'Sharbati Wheat Flour', { xMin: 0.1, yMin: 0.3, xMax: 0.9, yMax: 0.38 }, 'FRONT'),
      ];

      const res = extractor.detect({ regions, imageId: 'img-1' });
      expect(res[0]!.candidate.isAmbiguous).toBe(true);
      expect(res[0]!.candidate.traceability.validationStatus).toBe('REQUIRES_VERIFICATION');
    });
  });

  describe('3. Entity & Address Extraction (MFR, PKD, IMP)', () => {
    it('validates address structure with PIN code', () => {
      const val = validateEntityAddress('Plot 15, Sector 6, Faridabad, Haryana - 121006', 'MANUFACTURER');
      expect(val.isValid).toBe(true);
      expect(val.isAmbiguous).toBe(false);
    });

    it('validates address structure without PIN code using premises keywords', () => {
      const val = validateEntityAddress('ABC Chemical Works, MIDC Industrial Area, Vapi, Gujarat', 'MANUFACTURER');
      expect(val.isValid).toBe(true);
      expect(val.isAmbiguous).toBe(true); // requires verification because PIN is missing
    });

    it('strictly separates manufacturer, packer, and importer', () => {
      const mfrExtractor = new ManufacturerExtractor();
      const pkrExtractor = new PackerExtractor();
      const impExtractor = new ImporterExtractor();

      const regions = [
        makeRegion('r1', 'Manufactured by: Mfr Corp, Delhi - 110001', { xMin: 0.1, yMin: 0.2, xMax: 0.9, yMax: 0.26 }),
        makeRegion('r2', 'Packed by: Pkr Logistics, Thane - 400601', { xMin: 0.1, yMin: 0.3, xMax: 0.9, yMax: 0.36 }),
        makeRegion('r3', 'Imported by: Imp Ventures, Mumbai - 400001', { xMin: 0.1, yMin: 0.4, xMax: 0.9, yMax: 0.46 }),
      ];

      const mfrRes = mfrExtractor.detect({ regions, imageId: 'img-1' });
      const pkrRes = pkrExtractor.detect({ regions, imageId: 'img-1' });
      const impRes = impExtractor.detect({ regions, imageId: 'img-1' });

      expect(mfrRes[0]!.candidate.normalizedText).toContain('Mfr Corp');
      expect(pkrRes[0]!.candidate.normalizedText).toContain('Pkr Logistics');
      expect(impRes[0]!.candidate.normalizedText).toContain('Imp Ventures');
    });
  });

  describe('4. Net Quantity Parser & False Positive Immunity', () => {
    it('canonicalizes fractional kilograms to grams (0.5 kg -> 500 g)', () => {
      const extractor = new NetQuantityExtractor();
      const regions = [makeRegion('r1', 'NET QTY: 0.5 kg')];
      const res = extractor.detect({ regions, imageId: 'img-1' });
      expect(res[0]!.candidate.normalizedValue).toBe(500);
      expect(res[0]!.candidate.unit).toBe('g');
    });

    it('leaves missing unit unresolved: "NET QTY 500" does not invent "500 g"', () => {
      const extractor = new NetQuantityExtractor();
      const regions = [makeRegion('r1', 'NET QTY: 500')];
      const res = extractor.detect({ regions, imageId: 'img-1' });
      expect(res[0]!.candidate.normalizedValue).toBe(500);
      expect(res[0]!.candidate.unit).toBeNull();
      expect(res[0]!.candidate.confidenceTier).toBe('LOW_CONFIDENCE');
      expect(res[0]!.candidate.traceability.validationStatus).toBe('REQUIRES_VERIFICATION');
    });

    it('requires explicit length/quantity context for linear units like m, cm, mm', () => {
      const valWithoutContext = validateNetQuantity(50, 'cm', 'Width 50 cm');
      expect(valWithoutContext.isValid).toBe(true);

      const valBare = validateNetQuantity(50, 'cm', '50 cm');
      expect(valBare.isValid).toBe(false);
      expect(valBare.isAmbiguous).toBe(true);
    });

    it('rejects PIN codes, phone numbers, and barcodes from becoming Net Quantity', () => {
      const extractor = new NetQuantityExtractor();
      const regions = [
        makeRegion('r1', 'Pin: 422001'),
        makeRegion('r2', 'Tel: 1800-111-2222'),
        makeRegion('r3', '8901030383748'),
        makeRegion('r4', 'Net Qty: 200 g'),
      ];
      const res = extractor.detect({ regions, imageId: 'img-1' });
      expect(res.length).toBe(1);
      expect(res[0]!.candidate.normalizedValue).toBe(200);
      expect(res[0]!.candidate.unit).toBe('g');
    });
  });

  describe('5. MRP Extractor & Currency Distinction', () => {
    it('repairs character confusion like ₹12O strictly within currency context', () => {
      const extractor = new MRPExtractor();
      const regions = [makeRegion('r1', 'MRP ₹ 12O.00')];
      const res = extractor.detect({ regions, imageId: 'img-1' });
      expect(res[0]!.candidate.normalizedValue).toBe(120);
    });

    it('distinguishes statutory MRP from offer price and discount price', () => {
      const extractor = new MRPExtractor();
      const regions = [
        makeRegion('r1', 'MRP ₹ 250.00'),
        makeRegion('r2', 'SPECIAL OFFER PRICE: ₹ 199.00'),
      ];
      const res = extractor.detect({ regions, imageId: 'img-1' });
      expect(res[0]!.candidate.normalizedValue).toBe(250);
    });

    it('treats standalone ₹ values as candidates requiring verification', () => {
      const extractor = new MRPExtractor();
      const regions = [makeRegion('r1', '₹ 85.00')];
      const res = extractor.detect({ regions, imageId: 'img-1' });
      expect(res[0]!.candidate.normalizedValue).toBe(85);
      expect(res[0]!.candidate.isAmbiguous).toBe(true);
      expect(res[0]!.candidate.traceability.validationStatus).toBe('REQUIRES_VERIFICATION');
    });
  });

  describe('6. Date Extractor & Strict Separation', () => {
    it('strictly separates manufacture date from expiry date without swapping', () => {
      const mfdExtractor = new DateExtractor('DATE_OF_MANUFACTURE');
      const regions = [
        makeRegion('r1', 'MFD: 04/2026'),
        makeRegion('r2', 'EXPIRY: 04/2028'),
      ];
      const res = mfdExtractor.detect({ regions, imageId: 'img-1' });
      expect(res[0]!.candidate.normalizedValue).toBe('04/2026');
      expect(res[0]!.candidate.normalizedValue).not.toBe('04/2028');
    });

    it('leaves bare dates unconfirmed and requiring verification', () => {
      const pkdExtractor = new DateExtractor('DATE_OF_PACKAGING');
      const regions = [makeRegion('r1', '05/2026')];
      const res = pkdExtractor.detect({ regions, imageId: 'img-1' });
      expect(res[0]!.candidate.isAmbiguous).toBe(true);
      expect(res[0]!.candidate.traceability.validationStatus).toBe('REQUIRES_VERIFICATION');
    });
  });

  describe('7. Consumer Care Details Extractor', () => {
    it('extracts toll-free helpline and email address', () => {
      const extractor = new ConsumerCareExtractor();
      const regions = [makeRegion('r1', 'Consumer Care Toll-Free: 1800-111-3333, email: care@brand.com')];
      const res = extractor.detect({ regions, imageId: 'img-1' });
      expect(res[0]!.candidate.normalizedText).toContain('1800-111-3333');
      expect(res[0]!.candidate.normalizedText).toContain('care@brand.com');
    });

    it('isolates phone numbers in manufacturer address from consumer care without care label', () => {
      const extractor = new ConsumerCareExtractor();
      const regions = [makeRegion('r1', 'Manufactured by: Zenith Mills Ltd, MIDC Plot 2, Phone: 022-24445555, Mumbai')];
      const res = extractor.detect({ regions, imageId: 'img-1' });
      expect(res.length).toBe(0);
    });
  });

  describe('8. Selective Multi-Pass Triggering', () => {
    it('triggers quality-enhanced and contrast passes when glare or low sharpness is detected', () => {
      const evaluation = evaluateMultiPassTriggers(
        {
          overallScore: 55,
          isAcceptable: false,
          sharpness: 50,
          brightness: 80,
          glareDetected: true,
          blurDetected: false,
          shadowDetected: false,
          warnings: ['Glare detected'],
        },
        []
      );

      expect(evaluation.shouldTriggerAdditionalPasses).toBe(true);
      expect(evaluation.recommendedPasses).toContain('QUALITY_ENHANCED');
      expect(evaluation.recommendedPasses).toContain('GRAYSCALE_CONTRAST');
    });
  });

  describe('9. Field-Aware Consensus', () => {
    it('reconciles equivalent numeric values across passes (₹120 vs 120.00)', () => {
      const cand1 = {
        fieldType: 'MRP' as const,
        originalOCRText: 'MRP ₹ 120',
        normalizedText: '₹120.00',
        normalizedValue: 120,
        unit: 'INR',
        confidenceTier: 'HIGH_CONFIDENCE' as const,
        nativeConfidence: 0.95,
        isAmbiguous: false,
        correctionsApplied: [],
        traceability: {
          sourceRegionIds: ['r1'],
          originalImageId: 'img-1',
          originalBoundingBox: { xMin: 0, yMin: 0, xMax: 1, yMax: 1, width: 1, height: 1, unit: 'NORMALIZED' as const },
          extractionMethod: 'DIRECT_PATTERN' as const,
          validationStatus: 'VALID' as const,
          timestamp: '2026-09-12T00:00:00Z',
        },
      };

      const cand2 = {
        ...cand1,
        originalOCRText: 'MRP 120/-',
        normalizedValue: 120.0,
      };

      const reconciled = runFieldAwareConsensus([
        { passName: 'STANDARD', candidates: [cand1] },
        { passName: 'ENHANCED', candidates: [cand2] },
      ]);

      expect(reconciled.length).toBe(1);
      expect(reconciled[0]!.normalizedValue).toBe(120);
      expect(reconciled[0]!.confidenceTier).toBe('HIGH_CONFIDENCE');
    });

    it('flags conflict when contradictory values are found across passes', () => {
      const candA = {
        fieldType: 'MRP' as const,
        originalOCRText: 'MRP ₹ 120',
        normalizedText: '₹120.00',
        normalizedValue: 120,
        unit: 'INR',
        confidenceTier: 'HIGH_CONFIDENCE' as const,
        nativeConfidence: 0.95,
        isAmbiguous: false,
        correctionsApplied: [],
        traceability: {
          sourceRegionIds: ['r1'],
          originalImageId: 'img-1',
          originalBoundingBox: { xMin: 0, yMin: 0, xMax: 1, yMax: 1, width: 1, height: 1, unit: 'NORMALIZED' as const },
          extractionMethod: 'DIRECT_PATTERN' as const,
          validationStatus: 'VALID' as const,
          timestamp: '2026-09-12T00:00:00Z',
        },
      };

      const candB = {
        ...candA,
        originalOCRText: 'MRP ₹ 180',
        normalizedText: '₹180.00',
        normalizedValue: 180,
      };

      const reconciled = runFieldAwareConsensus([
        { passName: 'STANDARD', candidates: [candA] },
        { passName: 'ENHANCED', candidates: [candB] },
      ]);

      expect(reconciled.length).toBe(1);
      expect(reconciled[0]!.confidenceTier).toBe('CONFLICT');
      expect(reconciled[0]!.isAmbiguous).toBe(true);
      expect(reconciled[0]!.traceability.validationStatus).toBe('REQUIRES_VERIFICATION');
    });
  });
});
