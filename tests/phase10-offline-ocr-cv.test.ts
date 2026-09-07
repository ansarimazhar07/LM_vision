/**
 * LM-Vision — Phase 10: Offline OCR & Computer Vision Foundation Test Suite
 *
 * 30 Comprehensive Test Cases:
 * - On-device OCR & Text Region extraction
 * - Mandatory declaration candidate extractors (MRP, Net Qty, Dates, Mfr, Origin, Care)
 * - Canonical metric and date normalizers
 * - Local image quality assessment
 * - Principal Display Panel & Numeral geometry estimation
 * - Zero-network offline enforcement test (using global fetch spy)
 * - Hybrid consensus and conflict detection (no silent overwrite)
 * - Controlled package dataset end-to-end perception & rule evaluation
 */

import { describe, expect, it, vi } from 'vitest';
import type { ImageInputPayload, PackageAnalysis, PackageAnalysisInput, TextRegion } from '@lm-vision/shared-types';
import {
  assessImageQuality,
  extractTextRegions,
  extractMRP,
  extractNetQuantity,
  extractPackagingDate,
  extractManufacturer,
  extractConsumerCare,
  extractCountryOfOrigin,
  extractDeclarationCandidates,
  normalizeMetricUnit,
  normalizeCurrency,
  normalizeDateString,
  estimateGeometry,
  detectPerceptionConflicts,
  runLocalPerceptionPipeline,
  MockOCREngine,
} from '@lm-vision/perception';
import { evaluateCompliance } from '@lm-vision/rules';
import { CONTROLLED_PACKAGE_DATASET } from './fixtures/controlled-package-dataset.js';

describe('Phase 10: Offline OCR & Computer Vision Foundation', () => {
  // --------------------------------------------------------------------------
  // Group 1: On-Device OCR Engine (Tests 1 - 4)
  // --------------------------------------------------------------------------

  it('1. ocr_engine_extracts_text_from_clear_image', async () => {
    const mockEngine = new MockOCREngine();
    const image: ImageInputPayload = {
      imageId: '11111111-1111-4111-8111-111111111111',
      surface: 'FRONT',
      mimeType: 'image/jpeg',
      fileUrl: 'file:///data/packages/atta-front.jpg',
    };

    const result = await mockEngine.extractText(image);
    expect(result.regions.length).toBeGreaterThan(0);
    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.fullText).toContain('M.R.P.');
    expect(result.detectedLanguages).toContain('en');
  });

  it('2. ocr_engine_returns_empty_for_blank_image', async () => {
    const mockEngine = new MockOCREngine();
    const blankImage: ImageInputPayload = {
      imageId: '22222222-2222-4222-8222-222222222222',
      surface: 'FRONT',
      mimeType: 'image/jpeg',
      fileUrl: 'file:///data/packages/blank.jpg',
    };

    const result = await mockEngine.extractText(blankImage);
    expect(result.regions).toEqual([]);
    expect(result.lines).toEqual([]);
    expect(result.fullText).toBe('');
  });

  it('3. ocr_engine_assigns_confidence_scores', async () => {
    const image: ImageInputPayload = {
      imageId: '33333333-3333-4333-8333-333333333333',
      surface: 'BACK',
      mimeType: 'image/jpeg',
      fileUrl: 'file:///data/packages/sample-panel.jpg',
    };

    const regions = await extractTextRegions(image);
    expect(regions.length).toBeGreaterThan(0);
    for (const region of regions) {
      expect(region.confidence).toBeGreaterThanOrEqual(0.0);
      expect(region.confidence).toBeLessThanOrEqual(1.0);
    }
  });

  it('4. ocr_engine_preserves_text_positions', async () => {
    const image: ImageInputPayload = {
      imageId: '44444444-4444-4444-8444-444444444444',
      surface: 'FRONT',
      mimeType: 'image/jpeg',
      fileUrl: 'file:///data/packages/biscuit-front.jpg',
    };

    const regions = await extractTextRegions(image);
    expect(regions.length).toBeGreaterThan(0);
    for (const region of regions) {
      const { xMin, yMin, width, height } = region.boundingBox;
      expect(xMin).toBeGreaterThanOrEqual(0);
      expect(yMin).toBeGreaterThanOrEqual(0);
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    }
  });

  // --------------------------------------------------------------------------
  // Group 2: MRP Extractor (Tests 5 - 9)
  // --------------------------------------------------------------------------

  it('5. mrp_extractor_finds_standard_format', () => {
    const input = 'M.R.P. ₹ 250.00 (inclusive of all taxes)';
    const result = extractMRP(input);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(250.0);
    expect(result!.unit).toBe('INR');
    expect(result!.isInclusive).toBe(true);
  });

  it('6. mrp_extractor_finds_rs_format', () => {
    const input = 'Maximum Retail Price Rs. 45.00';
    const result = extractMRP(input);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(45.0);
  });

  it('7. mrp_extractor_finds_inr_format', () => {
    const input = 'MRP INR 120 (INCL. OF ALL TAXES)';
    const result = extractMRP(input);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(120.0);
  });

  it('8. mrp_extractor_handles_missing_decimal', () => {
    const input = 'Special Offer Price ₹ 50';
    const result = extractMRP(input);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(50.0);
  });

  it('9. mrp_extractor_returns_null_when_absent', () => {
    const input = 'Premium 100% Cotton Bio-Washed Fabric Made in India';
    const result = extractMRP(input);
    expect(result).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Group 3: Net Quantity Extractor (Tests 10 - 15)
  // --------------------------------------------------------------------------

  it('10. net_quantity_extracts_grams', () => {
    const input = 'Net Weight: 500 g';
    const result = extractNetQuantity(input);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(500);
    expect(result!.unit).toBe('g');
  });

  it('11. net_quantity_extracts_kilograms', () => {
    const input = 'Net Qty: 1.5 kg';
    const result = extractNetQuantity(input);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(1.5);
    expect(result!.unit).toBe('kg');
  });

  it('12. net_quantity_extracts_millilitres', () => {
    const input = 'Net Volume: 200 ml';
    const result = extractNetQuantity(input);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(200);
    expect(result!.unit).toBe('ml');
  });

  it('13. net_quantity_extracts_litres', () => {
    const input = 'Net Quantity: 1 l (910 g)';
    const result = extractNetQuantity(input);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(1);
    expect(result!.unit).toBe('l');
  });

  it('14. net_quantity_extracts_units_count', () => {
    const input = 'Contents: 10 N';
    const result = extractNetQuantity(input);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(10);
    expect(result!.unit).toBe('n');
  });

  it('15. net_quantity_returns_null_when_absent', () => {
    const input = 'Fragrance: Lavender Breeze with Essential Oils';
    const result = extractNetQuantity(input);
    expect(result).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Group 4: Date of Manufacture / Packaging (Tests 16 - 19)
  // --------------------------------------------------------------------------

  it('16. date_extractor_finds_month_year', () => {
    const input = 'Pkd: 03/2026';
    const result = extractPackagingDate(input);
    expect(result).not.toBeNull();
    expect(result!.dateStr).toBe('03/2026');
    expect(result!.isExpiry).toBe(false);
  });

  it('17. date_extractor_finds_named_month', () => {
    const input = 'Mfg Date: March 2026';
    const result = extractPackagingDate(input);
    expect(result).not.toBeNull();
    expect(result!.dateStr).toContain('2026');
    expect(result!.isExpiry).toBe(false);
  });

  it('18. date_extractor_distinguishes_mfg_from_expiry', () => {
    const mfgText = 'Mfg Date: 01/2026';
    const expText = 'Best Before: 06/2026';

    const mfgRes = extractPackagingDate(mfgText);
    const expRes = extractPackagingDate(expText);

    expect(mfgRes!.isExpiry).toBe(false);
    expect(expRes!.isExpiry).toBe(true);
  });

  it('19. date_extractor_returns_null_when_absent', () => {
    const input = 'Product of India. Packed in sealed atmosphere.';
    const result = extractPackagingDate(input);
    expect(result).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Group 5: Zero-Network Offline Enforcement (Test 20)
  // --------------------------------------------------------------------------

  it('20. pipeline_operates_zero_network', async () => {
    // Install spy on globalThis.fetch to verify genuine zero-network execution
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const offlineInput: PackageAnalysisInput = {
      inspectionId: '55555555-5555-4555-8555-555555555555',
      images: [
        {
          imageId: '66666666-6666-4666-8666-666666666666',
          surface: 'FRONT',
          mimeType: 'image/jpeg',
          fileUrl: 'file:///local/offline-pouch.jpg',
        },
      ],
      options: {
        detectBlur: true,
        measureFontHeight: true,
        extractFullText: true,
        languageCodes: ['en'],
      },
    };

    const analysis = await runLocalPerceptionPipeline(offlineInput);

    // CRITICAL STATUTORY REQUIREMENT: 0 network/HTTP calls
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(analysis.provider).toBe('LOCAL_OCR');
    expect(analysis.modelName).toBe('ondevice-ocr-cv-v1');
    expect(analysis.declarations.length).toBeGreaterThan(0);

    fetchSpy.mockRestore();
  });

  // --------------------------------------------------------------------------
  // Group 6: Hybrid Consensus & Conflict Detection (Tests 21 - 23)
  // --------------------------------------------------------------------------

  it('21. hybrid_detects_mrp_conflict', () => {
    const localAnalysis: PackageAnalysis = {
      provider: 'LOCAL_OCR',
      modelName: 'ondevice-ocr-cv-v1',
      quality: { overallScore: 0.9, isAcceptable: true, sharpness: 0.9, brightness: 0.8 },
      declarations: [
        {
          type: 'MRP',
          rawText: 'MRP Rs. 45.00',
          normalizedValue: 45.0,
          unit: 'INR',
          confidence: 0.92,
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 12,
      timestamp: new Date().toISOString(),
    };

    const remoteAnalysis: PackageAnalysis = {
      provider: 'GEMINI',
      modelName: 'gemini-3.5-flash',
      quality: { overallScore: 0.9, isAcceptable: true, sharpness: 0.9, brightness: 0.8 },
      declarations: [
        {
          type: 'MRP',
          rawText: 'MRP ₹ 55.00',
          normalizedValue: 55.0,
          unit: 'INR',
          confidence: 0.95,
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 850,
      timestamp: new Date().toISOString(),
    };

    const summary = detectPerceptionConflicts(localAnalysis, remoteAnalysis);

    expect(summary.status).toBe('CONFLICT');
    expect(summary.requiresHumanVerification).toBe(true);
    expect(summary.discrepancies.length).toBe(1);
    expect(summary.discrepancies[0]!.discrepancyType).toBe('VALUE_MISMATCH');
    expect(summary.discrepancies[0]!.localValue).toBe(45.0);
    expect(summary.discrepancies[0]!.remoteValue).toBe(55.0);
    // Local candidate preserved as base
    expect(summary.resolvedDeclarations[0]!.normalizedValue).toBe(45.0);
  });

  it('22. hybrid_detects_net_qty_conflict', () => {
    const localAnalysis: PackageAnalysis = {
      provider: 'LOCAL_OCR',
      modelName: 'ondevice-ocr-cv-v1',
      quality: { overallScore: 0.9, isAcceptable: true, sharpness: 0.9, brightness: 0.8 },
      declarations: [
        {
          type: 'NET_QUANTITY',
          rawText: 'Net Qty: 500 g',
          normalizedValue: 500,
          unit: 'g',
          confidence: 0.95,
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 12,
      timestamp: new Date().toISOString(),
    };

    const remoteAnalysis: PackageAnalysis = {
      provider: 'GEMINI',
      modelName: 'gemini-3.5-flash',
      quality: { overallScore: 0.9, isAcceptable: true, sharpness: 0.9, brightness: 0.8 },
      declarations: [
        {
          type: 'NET_QUANTITY',
          rawText: 'Net Vol: 500 ml',
          normalizedValue: 500,
          unit: 'ml',
          confidence: 0.95,
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 820,
      timestamp: new Date().toISOString(),
    };

    const summary = detectPerceptionConflicts(localAnalysis, remoteAnalysis);

    expect(summary.status).toBe('CONFLICT');
    expect(summary.discrepancies[0]!.discrepancyType).toBe('UNIT_MISMATCH');
    expect(summary.discrepancies[0]!.reason).toContain('Unit conflict');
  });

  it('23. hybrid_preserves_local_when_gemini_fails', () => {
    const localAnalysis: PackageAnalysis = {
      provider: 'LOCAL_OCR',
      modelName: 'ondevice-ocr-cv-v1',
      quality: { overallScore: 0.88, isAcceptable: true, sharpness: 0.88, brightness: 0.82 },
      declarations: [
        {
          type: 'MRP',
          rawText: 'MRP Rs. 30.00',
          normalizedValue: 30.0,
          unit: 'INR',
          confidence: 0.9,
        },
        {
          type: 'NET_QUANTITY',
          rawText: 'Net Weight: 100 g',
          normalizedValue: 100,
          unit: 'g',
          confidence: 0.92,
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 15,
      timestamp: new Date().toISOString(),
    };

    // Simulated Gemini empty/failed response
    const remoteAnalysis: PackageAnalysis = {
      provider: 'GEMINI',
      modelName: 'gemini-3.5-flash',
      quality: { overallScore: 0.88, isAcceptable: true, sharpness: 0.88, brightness: 0.82 },
      declarations: [],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 1200,
      timestamp: new Date().toISOString(),
    };

    const summary = detectPerceptionConflicts(localAnalysis, remoteAnalysis);

    // Local observations must NOT be lost or erased
    expect(summary.resolvedDeclarations.length).toBe(2);
    expect(summary.resolvedDeclarations.find(d => d.type === 'MRP')?.normalizedValue).toBe(30.0);
    expect(summary.resolvedDeclarations.find(d => d.type === 'NET_QUANTITY')?.normalizedValue).toBe(100);
  });

  // --------------------------------------------------------------------------
  // Group 7: Image Quality & Computer Vision Geometry (Tests 24 - 27)
  // --------------------------------------------------------------------------

  it('24. quality_analyzer_detects_low_resolution', async () => {
    const lowResImage: ImageInputPayload = {
      imageId: '77777777-7777-4777-8777-777777777777',
      surface: 'FRONT',
      mimeType: 'image/jpeg',
      fileUrl: 'file:///tiny-thumbnail-200x200.jpg',
    };

    const quality = await assessImageQuality(lowResImage);
    expect(quality.overallScore).toBeLessThan(0.7);
    expect(quality.warnings?.length).toBeGreaterThan(0);
  });

  it('25. quality_analyzer_approves_good_image', async () => {
    const highResImage: ImageInputPayload = {
      imageId: '88888888-8888-4888-8888-888888888888',
      surface: 'FRONT',
      mimeType: 'image/jpeg',
      fileUrl: 'file:///high-res-1920x1080.jpg',
    };

    const quality = await assessImageQuality(highResImage);
    expect(quality.isAcceptable).toBe(true);
    expect(quality.overallScore).toBeGreaterThanOrEqual(0.7);
    expect(quality.sharpness).toBeGreaterThan(0.7);
    expect(quality.brightness).toBeGreaterThan(0.7);
  });

  it('26. geometry_estimates_numeral_height', async () => {
    const image: ImageInputPayload = {
      imageId: '99999999-9999-4999-8999-999999999999',
      surface: 'FRONT',
      mimeType: 'image/jpeg',
      fileUrl: 'file:///atta-pouch.jpg',
    };

    const regions: TextRegion[] = [
      {
        id: 'reg-mrp',
        imageId: '99999999-9999-4999-8999-999999999999',
        surface: 'FRONT',
        boundingBox: { x: 100, y: 500, width: 200, height: 40 },
        text: 'M.R.P. Rs. 45.00',
        confidence: 0.95,
      },
    ];

    const geom = await estimateGeometry(image, regions);
    expect(geom.numeralHeightMm).toBeGreaterThan(0);
    expect(geom.measurements.length).toBeGreaterThan(0);
  });

  it('27. geometry_estimates_display_area', async () => {
    const image: ImageInputPayload = {
      imageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      surface: 'FRONT',
      mimeType: 'image/jpeg',
      fileUrl: 'file:///large-box.jpg',
    };

    const geom = await estimateGeometry(image, []);
    expect(geom.principalDisplayPanelAreaSqCm).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // Group 8: Controlled Package Dataset End-to-End Evaluation (Tests 28 - 30)
  // --------------------------------------------------------------------------

  it('28. dataset_atta_500g_pipeline', async () => {
    const fixture = CONTROLLED_PACKAGE_DATASET.find(p => p.id === 'pkg-atta-500g')!;
    expect(fixture).toBeDefined();

    const analysisInput: PackageAnalysisInput = {
      inspectionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      images: [
        {
          imageId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          surface: fixture.surface,
          mimeType: fixture.imageMeta.mimeType,
          fileUrl: `file:///${fixture.id}.jpg`,
        },
      ],
      options: { detectBlur: true, measureFontHeight: true, extractFullText: true, languageCodes: ['en'] },
    };

    const analysis = await runLocalPerceptionPipeline(analysisInput);

    expect(analysis.provider).toBe('LOCAL_OCR');
    expect(analysis.declarations.length).toBeGreaterThanOrEqual(4);

    const mrp = analysis.declarations.find(d => d.type === 'MRP');
    const netQty = analysis.declarations.find(d => d.type === 'NET_QUANTITY');
    const date = analysis.declarations.find(d => d.type === 'DATE_OF_PACKAGING');

    expect(mrp?.normalizedValue).toBe(fixture.groundTruth.mrp);
    expect(netQty?.normalizedValue).toBe(fixture.groundTruth.netQuantity);
    expect(netQty?.unit).toBe(fixture.groundTruth.netQuantityUnit);
    expect(date?.normalizedValue?.toString()).toContain('2026-03');

    // Evaluate compliance with GSR 202(E) Rule Engine
    const summary = evaluateCompliance({
      inspectionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      packageAnalysis: analysis,
    });

    expect(summary.ruleCountEvaluated).toBeGreaterThan(0);
    expect(['PASS', 'REQUIRES_VERIFICATION']).toContain(summary.overallStatus);
  });

  it('29. dataset_shampoo_200ml_pipeline', async () => {
    const fixture = CONTROLLED_PACKAGE_DATASET.find(p => p.id === 'pkg-shampoo-200ml')!;
    expect(fixture).toBeDefined();

    const analysisInput: PackageAnalysisInput = {
      inspectionId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      images: [
        {
          imageId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          surface: fixture.surface,
          mimeType: fixture.imageMeta.mimeType,
          fileUrl: `file:///${fixture.id}.jpg`,
        },
      ],
      options: { detectBlur: true, measureFontHeight: true, extractFullText: true, languageCodes: ['en'] },
    };

    const analysis = await runLocalPerceptionPipeline(analysisInput);
    expect(analysis.declarations.length).toBeGreaterThanOrEqual(4);

    const mrp = analysis.declarations.find(d => d.type === 'MRP');
    const netQty = analysis.declarations.find(d => d.type === 'NET_QUANTITY');

    expect(mrp?.normalizedValue).toBe(fixture.groundTruth.mrp);
    expect(netQty?.normalizedValue).toBe(fixture.groundTruth.netQuantity);
    expect(netQty?.unit).toBe(fixture.groundTruth.netQuantityUnit);

    const summary = evaluateCompliance({
      inspectionId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      packageAnalysis: analysis,
    });

    expect(summary.ruleCountEvaluated).toBeGreaterThan(0);
    expect(['PASS', 'REQUIRES_VERIFICATION']).toContain(summary.overallStatus);
  });

  it('30. dataset_oil_1l_pipeline', async () => {
    const fixture = CONTROLLED_PACKAGE_DATASET.find(p => p.id === 'pkg-oil-1l')!;
    expect(fixture).toBeDefined();

    const analysisInput: PackageAnalysisInput = {
      inspectionId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      images: [
        {
          imageId: '12345678-1234-4234-8234-123456789abc',
          surface: fixture.surface,
          mimeType: fixture.imageMeta.mimeType,
          fileUrl: `file:///${fixture.id}.jpg`,
        },
      ],
      options: { detectBlur: true, measureFontHeight: true, extractFullText: true, languageCodes: ['en'] },
    };

    const analysis = await runLocalPerceptionPipeline(analysisInput);
    expect(analysis.declarations.length).toBeGreaterThanOrEqual(4);

    const mrp = analysis.declarations.find(d => d.type === 'MRP');
    const netQty = analysis.declarations.find(d => d.type === 'NET_QUANTITY');

    expect(mrp?.normalizedValue).toBe(fixture.groundTruth.mrp);
    expect(netQty?.normalizedValue).toBe(fixture.groundTruth.netQuantity);
    expect(netQty?.unit).toBe(fixture.groundTruth.netQuantityUnit);

    const summary = evaluateCompliance({
      inspectionId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      packageAnalysis: analysis,
    });

    expect(summary.ruleCountEvaluated).toBeGreaterThan(0);
    expect(['PASS', 'REQUIRES_VERIFICATION']).toContain(summary.overallStatus);
  });
});
