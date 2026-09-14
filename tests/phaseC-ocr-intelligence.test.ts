/**
 * Phase C: Advanced Offline OCR Intelligence, Declaration Extraction,
 * OCR Consensus & Evidence Fusion Test Suite
 *
 * Validates:
 * 1. Conservative character normalization (numeric-context only, word guards intact).
 * 2. Multi-signal spatial reasoning (no simple nearest-neighbor).
 * 3. Modular declaration detectors (MRP, Net Qty, Dates, Mfr, Address, Consumer Care, Origin).
 * 4. Strict separation of manufacture/packing dates and expiry/best-before dates.
 * 5. Multi-pass OCR consensus with conflict detection (REQUIRES_VERIFICATION).
 * 6. Honest confidence tiers without manufactured percentages.
 * 7. Evidence traceability back to source OCR regions and original bounding boxes.
 * 8. Inspector correction provenance (original OCR evidence never overwritten).
 * 9. Real package validation (Atta, Shampoo, Biscuits, Oil, Bilingual Hindi/English).
 * 10. False-positive immunity (words like "GODREJ", random numbers like PIN/phone/batch).
 * 11. Spatial false-positive disambiguation (multiple numbers adjacent).
 * 12. 100% offline network isolation.
 */

import { describe, it, expect } from 'vitest';
import type { TextRegion, PackageAnalysisInput } from '@lm-vision/shared-types';
import {
  isStronglyNumericContext,
  normalizeNumericString,
  normalizeLineText,
  associateLabelsWithValues,
  MrpDetector,
  NetQuantityDetector,
  PackagingDateDetector,
  ExpiryDateDetector,
  ManufacturerDetector,
  AddressDetector,
  ConsumerCareDetector,
  CountryOfOriginDetector,
  DeclarationDetectorRegistry,
  reconcileFieldCandidates,
  runMultiPassConsensus,
  recordInspectorCorrection,
  runLocalPerceptionPipeline,
  type StructuredDeclarationCandidate,
} from '../packages/perception/src/index.js';

describe('Phase C: OCR Normalization & Character Confusion Handling', () => {
  it('substitutes confusable characters strictly inside identified numeric contexts', () => {
    // "MRP ₹12O.OO" -> "O" -> "0"
    const mrpResult = normalizeNumericString('₹12O.OO', { hint: 'CURRENCY' });
    expect(mrpResult.normalizedText).toBe('₹120.00');
    expect(mrpResult.numericValue).toBe(120.0);
    expect(mrpResult.correctionsApplied.length).toBeGreaterThan(0);
    expect(mrpResult.originalOCRText).toBe('₹12O.OO');

    // "50O g" -> "O" -> "0"
    const netQtyResult = normalizeNumericString('50O', {
      fullLineContext: 'NET QTY 50O g',
      hint: 'UNIT',
    });
    expect(netQtyResult.normalizedText).toBe('500');
    expect(netQtyResult.numericValue).toBe(500);

    // S -> 5 in currency
    const sResult = normalizeNumericString('₹S0.00', { hint: 'CURRENCY' });
    expect(sResult.normalizedText).toBe('₹50.00');
    expect(sResult.numericValue).toBe(50.0);

    // B -> 8 in currency
    const bResult = normalizeNumericString('₹B0.00', { hint: 'CURRENCY' });
    expect(bResult.normalizedText).toBe('₹80.00');
    expect(bResult.numericValue).toBe(80.0);
  });

  it('MANDATORY FALSE POSITIVE TEST: Never corrupts normal alphabetic words', () => {
    const protectedWords = [
      'GODREJ',
      'PRODUCT',
      'ORIGINAL',
      'PREMIUM',
      'BEST QUALITY',
      'NATURAL',
      'ORGANIC',
      'BATCH',
      'INDIA',
    ];

    for (const word of protectedWords) {
      expect(isStronglyNumericContext(word, 0, word)).toBe(false);

      const res = normalizeNumericString(word);
      expect(res.normalizedText).toBe(word);
      expect(res.numericValue).toBeNull();
      expect(res.correctionsApplied).toHaveLength(0);
    }
  });

  it('normalizes full lines while preserving alphabetic text', () => {
    const line = 'GODREJ CONSUMER PRODUCTS MRP ₹12O.OO NET QTY 50O g';
    const norm = normalizeLineText(line);

    expect(norm.normalizedText).toContain('GODREJ CONSUMER PRODUCTS');
    expect(norm.normalizedText).toContain('₹120.00');
    expect(norm.normalizedText).toContain('500 g');
    expect(norm.originalText).toBe(line);
    expect(norm.corrections.length).toBeGreaterThan(0);
  });

  it('flags isAmbiguous = true when ambiguous character substitutions occur', () => {
    const ambig = normalizeNumericString('12?5O', { hint: 'GENERIC_NUMERIC' });
    expect(ambig.isAmbiguous).toBe(true);
  });
});

describe('Phase C: Spatial Reasoning (No Simple Nearest Neighbor)', () => {
  it('correctly associates multiple adjacent labels with their respective values', () => {
    // Spatial layout simulating package display:
    // Line 1: MRP [0.1, 0.2]             ₹120 [0.4, 0.2]
    // Line 2: NET QTY [0.1, 0.25]        500 g [0.4, 0.25]
    // Line 3: PHONE [0.1, 0.3]           1800-123-4567 [0.4, 0.3]
    // Line 4: PIN [0.1, 0.35]            422001 [0.4, 0.35]
    const dummyImageId = '00000000-0000-4000-8000-000000000001';

    const regions: TextRegion[] = [
      {
        id: 'reg-mrp-lbl',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.25, yMax: 0.23, width: 0.15, height: 0.03, unit: 'NORMALIZED' },
        text: 'MRP',
        confidence: 0.95,
      },
      {
        id: 'reg-mrp-val',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.35, yMin: 0.2, xMax: 0.5, yMax: 0.23, width: 0.15, height: 0.03, unit: 'NORMALIZED' },
        text: '₹120.00',
        confidence: 0.95,
      },
      {
        id: 'reg-net-lbl',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.1, yMin: 0.26, xMax: 0.25, yMax: 0.29, width: 0.15, height: 0.03, unit: 'NORMALIZED' },
        text: 'NET QTY',
        confidence: 0.95,
      },
      {
        id: 'reg-net-val',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.35, yMin: 0.26, xMax: 0.5, yMax: 0.29, width: 0.15, height: 0.03, unit: 'NORMALIZED' },
        text: '500 g',
        confidence: 0.95,
      },
      {
        id: 'reg-phone-lbl',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.1, yMin: 0.32, xMax: 0.25, yMax: 0.35, width: 0.15, height: 0.03, unit: 'NORMALIZED' },
        text: 'CONSUMER CARE',
        confidence: 0.95,
      },
      {
        id: 'reg-phone-val',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.35, yMin: 0.32, xMax: 0.65, yMax: 0.35, width: 0.3, height: 0.03, unit: 'NORMALIZED' },
        text: '1800-123-4567',
        confidence: 0.95,
      },
      {
        id: 'reg-pin-val',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.35, yMin: 0.38, xMax: 0.5, yMax: 0.41, width: 0.15, height: 0.03, unit: 'NORMALIZED' },
        text: 'FARIDABAD 121004',
        confidence: 0.95,
      },
    ];

    const associations = associateLabelsWithValues(regions);

    // Find MRP association
    const mrpAssoc = associations.find((a) => a.label.type === 'MRP');
    expect(mrpAssoc).toBeDefined();
    expect(mrpAssoc?.value.valueText).toBe('₹120.00');

    // Find Net Qty association
    const netAssoc = associations.find((a) => a.label.type === 'NET_QUANTITY');
    expect(netAssoc).toBeDefined();
    expect(netAssoc?.value.valueText).toBe('500 g');

    // Find Consumer Care association
    const phoneAssoc = associations.find((a) => a.label.type === 'CONSUMER_CARE_DETAILS');
    expect(phoneAssoc).toBeDefined();
    expect(phoneAssoc?.value.valueText).toBe('1800-123-4567');
  });

  it('marks isAmbiguous = true when two candidate values are equally plausible', () => {
    const dummyImageId = '00000000-0000-4000-8000-000000000001';
    const ambiguousRegions: TextRegion[] = [
      {
        id: 'lbl-mrp',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.1, yMin: 0.5, xMax: 0.25, yMax: 0.55, width: 0.15, height: 0.05, unit: 'NORMALIZED' },
        text: 'MRP',
        confidence: 0.9,
      },
      {
        id: 'val-1',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.3, yMin: 0.5, xMax: 0.45, yMax: 0.55, width: 0.15, height: 0.05, unit: 'NORMALIZED' },
        text: '120.00',
        confidence: 0.9,
      },
      {
        id: 'val-2',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.5, yMin: 0.5, xMax: 0.65, yMax: 0.55, width: 0.15, height: 0.05, unit: 'NORMALIZED' },
        text: '130.00',
        confidence: 0.9,
      },
    ];

    const associations = associateLabelsWithValues(ambiguousRegions);
    const mrp = associations.find((a) => a.label.type === 'MRP');
    expect(mrp).toBeDefined();
    expect(mrp?.score.isAmbiguous).toBe(true);
  });
});

describe('Phase C: Modular Declaration Detectors', () => {
  const dummyImageId = '00000000-0000-4000-8000-000000000001';

  it('MrpDetector extracts various standard Indian MRP formats', () => {
    const formats = [
      'MRP ₹120',
      'MRP ₹120.00',
      'MRP Rs 120',
      'MRP Rs. 120.00',
      'MRP 120/-',
      'M.R.P. 120',
      'MAX RETAIL PRICE ₹120',
      'अधिकतम खुदरा मूल्य ₹ 120.00',
      'एमआरपी ₹ 120.00',
    ];

    const detector = new MrpDetector();

    for (const fmt of formats) {
      const regions: TextRegion[] = [
        {
          id: 'reg-mrp',
          imageId: dummyImageId,
          surface: 'FRONT',
          boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.5, yMax: 0.15, width: 0.4, height: 0.05, unit: 'NORMALIZED' },
          text: fmt,
          confidence: 0.95,
        },
      ];

      const results = detector.detect({ regions, imageId: dummyImageId });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].candidate.normalizedValue).toBe(120);
      expect(results[0].candidate.unit).toBe('INR');
      expect(results[0].candidate.confidenceTier).toBe('HIGH_CONFIDENCE');
    }
  });

  it('MrpDetector REJECTS false positive numbers (PIN, phone, barcode, batch)', () => {
    const detector = new MrpDetector();
    const nonMrpRegions: TextRegion[] = [
      {
        id: 'reg-pin',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.5, yMax: 0.15, width: 0.4, height: 0.05, unit: 'NORMALIZED' },
        text: 'PIN CODE: 422001',
        confidence: 0.95,
      },
      {
        id: 'reg-phone',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.5, yMax: 0.25, width: 0.4, height: 0.05, unit: 'NORMALIZED' },
        text: 'TOLL FREE: 1800-111-2222',
        confidence: 0.95,
      },
      {
        id: 'reg-barcode',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.1, yMin: 0.3, xMax: 0.5, yMax: 0.35, width: 0.4, height: 0.05, unit: 'NORMALIZED' },
        text: '8901030383748',
        confidence: 0.95,
      },
      {
        id: 'reg-batch',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.1, yMin: 0.4, xMax: 0.5, yMax: 0.45, width: 0.4, height: 0.05, unit: 'NORMALIZED' },
        text: 'BATCH NO: B-4022',
        confidence: 0.95,
      },
    ];

    const results = detector.detect({ regions: nonMrpRegions, imageId: dummyImageId });
    expect(results).toHaveLength(0);
  });

  it('NetQuantityDetector supports English and Hindi units and NEVER infers missing units', () => {
    const detector = new NetQuantityDetector();

    // English units
    const englishTest = detector.detect({
      regions: [
        {
          id: 'reg-1',
          imageId: dummyImageId,
          surface: 'FRONT',
          boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.5, yMax: 0.15, width: 0.4, height: 0.05, unit: 'NORMALIZED' },
          text: 'NET QTY: 500 g',
          confidence: 0.95,
        },
      ],
      imageId: dummyImageId,
    });
    expect(englishTest[0].candidate.normalizedValue).toBe(500);
    expect(englishTest[0].candidate.unit).toBe('g');

    // Hindi units
    const hindiTest = detector.detect({
      regions: [
        {
          id: 'reg-2',
          imageId: dummyImageId,
          surface: 'FRONT',
          boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.5, yMax: 0.15, width: 0.4, height: 0.05, unit: 'NORMALIZED' },
          text: 'शुद्ध मात्रा 1 कि.ग्रा.',
          confidence: 0.95,
        },
      ],
      imageId: dummyImageId,
    });
    expect(hindiTest[0].candidate.normalizedValue).toBe(1);
    expect(hindiTest[0].candidate.unit).toBe('kg');

    // CRITICAL: Missing unit test ("NET QTY 500") -> Must NOT infer "500 g"
    const missingUnitTest = detector.detect({
      regions: [
        {
          id: 'reg-3',
          imageId: dummyImageId,
          surface: 'FRONT',
          boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.5, yMax: 0.15, width: 0.4, height: 0.05, unit: 'NORMALIZED' },
          text: 'NET QTY: 500',
          confidence: 0.95,
        },
      ],
      imageId: dummyImageId,
    });
    expect(missingUnitTest[0].candidate.normalizedValue).toBe(500);
    expect(missingUnitTest[0].candidate.unit).toBeNull();
    expect(missingUnitTest[0].candidate.isAmbiguous).toBe(true);
    expect(missingUnitTest[0].candidate.confidenceTier).toBe('LOW_CONFIDENCE');
    expect(missingUnitTest[0].candidate.traceability.validationStatus).toBe('REQUIRES_VERIFICATION');
  });

  it('strictly separates Manufacture/Packing Date from Expiry/Best-Before', () => {
    const pkgDetector = new PackagingDateDetector();
    const expDetector = new ExpiryDateDetector();

    const mixedRegions: TextRegion[] = [
      {
        id: 'reg-mfd',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.5, yMax: 0.15, width: 0.4, height: 0.05, unit: 'NORMALIZED' },
        text: 'PKD DATE: 03/2026',
        confidence: 0.95,
      },
      {
        id: 'reg-exp',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.5, yMax: 0.25, width: 0.4, height: 0.05, unit: 'NORMALIZED' },
        text: 'BEST BEFORE 12 MONTHS FROM PACKAGING',
        confidence: 0.95,
      },
    ];

    // Packaging detector must ONLY extract PKD and NEVER extract expiry
    const pkgResults = pkgDetector.detect({ regions: mixedRegions, imageId: dummyImageId });
    expect(pkgResults).toHaveLength(1);
    expect(pkgResults[0].candidate.fieldType).toBe('DATE_OF_PACKAGING');
    expect(pkgResults[0].candidate.normalizedValue).toBe('03/2026');

    // Expiry detector must ONLY extract Best Before and NEVER extract PKD
    const expResults = expDetector.detect({ regions: mixedRegions, imageId: dummyImageId });
    expect(expResults).toHaveLength(1);
    expect(expResults[0].candidate.fieldType).toBe('EXPIRY_DATE_BEST_BEFORE');
    expect(expResults[0].candidate.normalizedValue).toBe('12 MONTHS');
  });

  it('Manufacturer, Address, Consumer Care, and Country of Origin detectors extract accurately', () => {
    const mfrDetector = new ManufacturerDetector();
    const addrDetector = new AddressDetector();
    const careDetector = new ConsumerCareDetector();
    const originDetector = new CountryOfOriginDetector();

    const regions: TextRegion[] = [
      {
        id: 'r-mfr',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.8, yMax: 0.15, width: 0.7, height: 0.05, unit: 'NORMALIZED' },
        text: 'Mfg & Pkd by: Golden Mills Pvt. Ltd.',
        confidence: 0.95,
      },
      {
        id: 'r-addr',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.8, yMax: 0.25, width: 0.7, height: 0.05, unit: 'NORMALIZED' },
        text: 'Plot 12, Industrial Area, Sector 58, Faridabad, Haryana - 121004',
        confidence: 0.95,
      },
      {
        id: 'r-care',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.1, yMin: 0.3, xMax: 0.8, yMax: 0.35, width: 0.7, height: 0.05, unit: 'NORMALIZED' },
        text: 'Customer Care: 1800-111-2222 | care@goldenmills.com',
        confidence: 0.95,
      },
      {
        id: 'r-origin',
        imageId: dummyImageId,
        surface: 'FRONT',
        boundingBox: { xMin: 0.1, yMin: 0.4, xMax: 0.8, yMax: 0.45, width: 0.7, height: 0.05, unit: 'NORMALIZED' },
        text: 'Country of Origin: India',
        confidence: 0.95,
      },
    ];

    const mfr = mfrDetector.detect({ regions, imageId: dummyImageId });
    expect(mfr[0].candidate.normalizedValue).toBe('Golden Mills Pvt. Ltd.');

    const addr = addrDetector.detect({ regions, imageId: dummyImageId });
    expect(addr[0].candidate.normalizedValue).toContain('121004');

    const care = careDetector.detect({ regions, imageId: dummyImageId });
    expect(care[0].candidate.normalizedValue).toContain('1800-111-2222');

    const origin = originDetector.detect({ regions, imageId: dummyImageId });
    expect(origin[0].candidate.normalizedValue).toBe('India');
  });

  it('allows registering custom declaration detectors into DeclarationDetectorRegistry', () => {
    const registry = new DeclarationDetectorRegistry();
    const customDetector = {
      fieldType: 'OTHER' as const,
      detectorName: 'CustomFssaiDetector',
      detect: () => [
        {
          candidate: {
            fieldType: 'OTHER' as const,
            originalOCRText: 'FSSAI Lic. No. 10012011000123',
            normalizedText: '10012011000123',
            normalizedValue: '10012011000123',
            unit: null,
            confidenceTier: 'HIGH_CONFIDENCE' as const,
            nativeConfidence: 0.95,
            isAmbiguous: false,
            correctionsApplied: [],
            traceability: {
              sourceRegionIds: ['custom-1'],
              originalImageId: dummyImageId,
              originalBoundingBox: { xMin: 0, yMin: 0, xMax: 1, yMax: 1, width: 1, height: 1, unit: 'NORMALIZED' as const },
              extractionMethod: 'DIRECT_PATTERN' as const,
              validationStatus: 'VALID' as const,
              conflictStatus: 'NONE' as const,
              timestamp: new Date().toISOString(),
            },
          },
          score: 0.99,
        },
      ],
    };

    registry.register(customDetector);
    const candidates = registry.detectAll({ regions: [], imageId: dummyImageId });
    expect(candidates.some((c) => c.normalizedValue === '10012011000123')).toBe(true);
  });
});

describe('Phase C: Multi-Pass OCR Consensus & Conflict Handling', () => {
  const dummyImageId = '00000000-0000-4000-8000-000000000001';

  const makeCandidate = (
    val: number,
    passName: string
  ): StructuredDeclarationCandidate => ({
    fieldType: 'MRP',
    originalOCRText: `MRP ₹${val}`,
    normalizedText: `₹${val.toFixed(2)}`,
    normalizedValue: val,
    unit: 'INR',
    confidenceTier: 'HIGH_CONFIDENCE',
    nativeConfidence: 0.9,
    isAmbiguous: false,
    correctionsApplied: [],
    traceability: {
      sourceRegionIds: [`reg-${passName}`],
      originalImageId: dummyImageId,
      originalBoundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.5, yMax: 0.2, width: 0.4, height: 0.1, unit: 'NORMALIZED' },
      extractionMethod: 'DIRECT_PATTERN',
      ocrPassName: passName,
      validationStatus: 'VALID',
      conflictStatus: 'NONE',
      timestamp: new Date().toISOString(),
    },
  });

  it('selects dominant candidate when passes agree by majority (2 vs 1)', () => {
    // Pass 1: ₹120, Pass 2: ₹120, Pass 3: ₹180
    const pass1 = makeCandidate(120, 'STANDARD');
    const pass2 = makeCandidate(120, 'ENHANCED');
    const pass3 = makeCandidate(180, 'PERSPECTIVE');

    const result = reconcileFieldCandidates('MRP', [pass1, pass2, pass3]);
    expect(result.primaryCandidate.normalizedValue).toBe(120);
    expect(result.hasConflict).toBe(true);
    expect(result.alternateCandidates).toHaveLength(1);
    expect(result.alternateCandidates[0].normalizedValue).toBe(180);
    expect(result.primaryCandidate.traceability.conflictStatus).toBe('CONSENSUS_RESOLVED');
  });

  it('produces REQUIRES_VERIFICATION when passes conflict with a tie (1 vs 1)', () => {
    // Pass 1: ₹120, Pass 2: ₹180
    const pass1 = makeCandidate(120, 'STANDARD');
    const pass2 = makeCandidate(180, 'ENHANCED');

    const result = reconcileFieldCandidates('MRP', [pass1, pass2]);
    expect(result.hasConflict).toBe(true);
    expect(result.isAmbiguous).toBe(true);
    expect(result.primaryCandidate.confidenceTier).toBe('CONFLICT');
    expect(result.primaryCandidate.traceability.validationStatus).toBe('REQUIRES_VERIFICATION');
    expect(result.primaryCandidate.traceability.conflictStatus).toBe('UNRESOLVED_CONFLICT');
  });

  it('runs multi-pass consensus across candidate arrays', () => {
    const passes = [
      { passName: 'STANDARD', candidates: [makeCandidate(120, 'STANDARD')] },
      { passName: 'ENHANCED', candidates: [makeCandidate(120, 'ENHANCED')] },
      { passName: 'GRAYSCALE', candidates: [makeCandidate(180, 'GRAYSCALE')] },
    ];

    const consensus = runMultiPassConsensus(passes);
    expect(consensus).toHaveLength(1);
    expect(consensus[0].normalizedValue).toBe(120);
  });
});

describe('Phase C: Evidence Traceability & Inspector Corrections', () => {
  const dummyImageId = '00000000-0000-4000-8000-000000000001';

  it('preserves original OCR evidence when inspector submits a correction', () => {
    const originalCandidate: StructuredDeclarationCandidate = {
      fieldType: 'MRP',
      originalOCRText: 'MRP ₹120.00',
      normalizedText: '₹120.00',
      normalizedValue: 120,
      unit: 'INR',
      confidenceTier: 'HIGH_CONFIDENCE',
      nativeConfidence: 0.92,
      isAmbiguous: false,
      correctionsApplied: [],
      traceability: {
        sourceRegionIds: ['reg-1'],
        originalImageId: dummyImageId,
        originalBoundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.4, yMax: 0.25, width: 0.3, height: 0.05, unit: 'NORMALIZED' },
        extractionMethod: 'DIRECT_PATTERN',
        validationStatus: 'VALID',
        conflictStatus: 'NONE',
        timestamp: '2026-09-10T10:00:00.000Z',
      },
    };

    // Inspector modifies value to ₹180
    const corrected = recordInspectorCorrection(
      originalCandidate,
      180,
      'Physical label shows 180 overwritten after price revision',
      'inspector-user-123'
    );

    // CRITICAL INVARIANT: Original OCR text must NEVER be overwritten
    expect(corrected.originalOCRText).toBe('MRP ₹120.00');
    expect(corrected.normalizedValue).toBe(180);

    // Provenance must capture both originalCandidate and correctedCandidate
    expect(corrected.inspectorCorrection).toBeDefined();
    expect(corrected.inspectorCorrection?.originalCandidate).toBe(120);
    expect(corrected.inspectorCorrection?.correctedCandidate).toBe(180);
    expect(corrected.inspectorCorrection?.source).toBe('INSPECTOR_CORRECTED');
    expect(corrected.inspectorCorrection?.inspectorId).toBe('inspector-user-123');
    expect(corrected.traceability.extractionMethod).toBe('INSPECTOR_CORRECTED');
  });
});

describe('Phase C: Real Package Photographs & Pipeline Integration', () => {
  it('analyzes Atta package photograph and captures Phase C performance metrics', async () => {
    const input: PackageAnalysisInput = {
      images: [
        {
          imageId: '11111111-1111-4111-8111-111111111111',
          fileUrl: 'file:///d:/antiprojects/LM-Vision/storage/sample_atta.jpg',
          surface: 'FRONT',
        },
      ],
    };

    const analysis = await runLocalPerceptionPipeline(input);

    expect(analysis.provider).toBe('LOCAL_OCR');
    expect(analysis.rawResponse?.phase).toBe('PHASE_C_OCR_INTELLIGENCE');

    // Declarations extracted
    const mrp = analysis.declarations.find((d) => d.type === 'MRP');
    expect(mrp).toBeDefined();
    expect(mrp?.normalizedValue).toBe(45);
    expect(mrp?.unit).toBe('INR');

    const netQty = analysis.declarations.find((d) => d.type === 'NET_QUANTITY');
    expect(netQty).toBeDefined();
    expect(netQty?.normalizedValue).toBe(500);
    expect(netQty?.unit).toBe('g');

    // Performance metrics captured
    const perf = (analysis.rawResponse as any)?.phaseC?.performanceMetrics;
    expect(perf).toBeDefined();
    expect(perf.ocrNormalizationTimeMs).toBeGreaterThanOrEqual(0);
    expect(perf.spatialReasoningTimeMs).toBeGreaterThanOrEqual(0);
    expect(perf.candidateExtractionTimeMs).toBeGreaterThanOrEqual(0);
    expect(perf.totalPhaseCTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('analyzes Shampoo bottle package photograph with bilingual text', async () => {
    const input: PackageAnalysisInput = {
      images: [
        {
          imageId: '22222222-2222-4222-8222-222222222222',
          fileUrl: 'file:///d:/antiprojects/LM-Vision/storage/shampoo_back.jpg',
          surface: 'BACK',
        },
      ],
    };

    const analysis = await runLocalPerceptionPipeline(input);
    const mrp = analysis.declarations.find((d) => d.type === 'MRP');
    expect(mrp?.normalizedValue).toBe(185);

    const netVol = analysis.declarations.find((d) => d.type === 'NET_QUANTITY');
    expect(netVol?.normalizedValue).toBe(200);
    expect(netVol?.unit).toBe('ml');
  });

  it('analyzes Biscuits pack photograph', async () => {
    const input: PackageAnalysisInput = {
      images: [
        {
          imageId: '33333333-3333-4333-8333-333333333333',
          fileUrl: 'file:///d:/antiprojects/LM-Vision/storage/biscuit_wrapper.jpg',
          surface: 'FRONT',
        },
      ],
    };

    const analysis = await runLocalPerceptionPipeline(input);
    const mrp = analysis.declarations.find((d) => d.type === 'MRP');
    expect(mrp?.normalizedValue).toBe(30);

    const netWt = analysis.declarations.find((d) => d.type === 'NET_QUANTITY');
    expect(netWt?.normalizedValue).toBe(100);
    expect(netWt?.unit).toBe('g');
  });

  it('analyzes Edible Oil pouch photograph', async () => {
    const input: PackageAnalysisInput = {
      images: [
        {
          imageId: '44444444-4444-4444-8444-444444444444',
          fileUrl: 'file:///d:/antiprojects/LM-Vision/storage/oil_pouch.jpg',
          surface: 'FRONT',
        },
      ],
    };

    const analysis = await runLocalPerceptionPipeline(input);
    const mrp = analysis.declarations.find((d) => d.type === 'MRP');
    expect(mrp?.normalizedValue).toBe(165);

    const netQty = analysis.declarations.find((d) => d.type === 'NET_QUANTITY');
    expect(netQty?.normalizedValue).toBe(1);
    expect(netQty?.unit).toBe('l');
  });
});

describe('Phase C: Offline Network Isolation Guarantee', () => {
  it('runs without making any global network requests', async () => {
    // Intercept fetch if present
    const originalFetch = globalThis.fetch;
    let networkCalled = false;
    globalThis.fetch = async () => {
      networkCalled = true;
      throw new Error('NETWORK CALL DETECTED: Offline invariant violated!');
    };

    try {
      const input: PackageAnalysisInput = {
        images: [
          {
            imageId: '55555555-5555-4555-8555-555555555555',
            fileUrl: 'file:///d:/antiprojects/LM-Vision/storage/sample_atta.jpg',
            surface: 'FRONT',
          },
        ],
      };

      await runLocalPerceptionPipeline(input);
      expect(networkCalled).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
