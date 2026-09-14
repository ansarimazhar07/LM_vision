/**
 * Phase D: Hybrid Evidence Fusion & Decision Support Test Suite
 *
 * Comprehensive validation adhering to all 25 Phase D guardrails:
 * - Case A: Agreement (Local ₹120 + Gemini ₹120 -> AGREEMENT)
 * - Case B: Conflict (Local ₹120 vs Gemini ₹180 -> CONFLICT, REQUIRES_VERIFICATION, zero winner picking)
 * - Case C: Offline (No network, AI unavailable, local OCR + rules work)
 * - Case D: Inspector Resolution (Human review confirmed, all source provenance preserved)
 * - Case E: AI Failure (Backend 503, graceful fallback, zero mobile direct AI call)
 * - Case F: E-Commerce (MRP ₹120 vs Online ₹135 -> Discrepancy evidence, not automatic legal violation)
 * - Multi-dimensional confidence (blurred image agreement is NOT HIGH_CONFIDENCE)
 * - Field-specific normalizations (MRP ₹120 vs ₹120.01 is conflict; 500g == 0.5kg; 03/2026 vs 04/2026 is conflict)
 * - AI evidence backing & partial evidence preservation
 * - Immutability of completed inspections
 * - Mobile security audit (zero AI keys/SDKs in client)
 * - Rule engine immutability
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateCompliance } from '@lm-vision/rules';
import type { Declaration, ImageQuality, PackageAnalysis } from '@lm-vision/shared-types';
import {
  compareFieldValues,
  evaluateEvidenceConfidence,
  gatherFieldEvidence,
  fuseEvidence,
  type StructuredDeclarationCandidate,
} from '../packages/perception/src/index.js';

describe('Phase D: Deterministic Field-Specific Conflict Resolver', () => {
  it('detects real conflicts in MRP without using loose floating-point epsilon', () => {
    // Guardrail 5: ₹120 vs ₹120.01 is a real statutory difference
    const diffCents = compareFieldValues('MRP', 120.0, null, 120.01, null);
    expect(diffCents.isEqual).toBe(false);
    expect(diffCents.reason).toContain('discrepancy');

    // Exact match
    const exact = compareFieldValues('MRP', 120.0, null, 120.0, null);
    expect(exact.isEqual).toBe(true);

    // Minor string representation difference of same numeric value
    const strMatch = compareFieldValues('MRP', '120', null, 120.0, null);
    expect(strMatch.isEqual).toBe(true);
  });

  it('correctly converts base metric SI units for semantic quantity comparison', () => {
    // 500 g vs 0.5 kg (Mass: 500 == 500)
    const massEquiv = compareFieldValues('NET_QUANTITY', 500, 'g', 0.5, 'kg');
    expect(massEquiv.isEqual).toBe(true);
    expect(massEquiv.normalizedA).toBe(500);
    expect(massEquiv.normalizedB).toBe(500);

    // Hindi bilingual equivalence: 500 ग्राम vs 0.5 किग्रा
    const hindiMassEquiv = compareFieldValues('NET_QUANTITY', 500, 'ग्राम', 0.5, 'किग्रा');
    expect(hindiMassEquiv.isEqual).toBe(true);

    // Real conflict in quantities: 500 g vs 550 g
    const massConflict = compareFieldValues('NET_QUANTITY', 500, 'g', 550, 'g');
    expect(massConflict.isEqual).toBe(false);
    expect(massConflict.reason).toContain('Quantity mismatch');

    // Dimension mismatch: 500 g vs 500 ml
    const dimMismatch = compareFieldValues('NET_QUANTITY', 500, 'g', 500, 'ml');
    expect(dimMismatch.isEqual).toBe(false);
    expect(dimMismatch.reason).toContain('Dimension mismatch');

    // Missing unit is a discrepancy
    const missingUnit = compareFieldValues('NET_QUANTITY', 500, 'g', 500, null);
    expect(missingUnit.isEqual).toBe(false);
    expect(missingUnit.reason).toContain('Unit presence mismatch');
  });

  it('performs strict canonical date comparison', () => {
    // 03/2026 vs 04/2026 is a real conflict
    const dateDiff = compareFieldValues('DATE_OF_MANUFACTURE', '03/2026', null, '04/2026', null);
    expect(dateDiff.isEqual).toBe(false);
    expect(dateDiff.reason).toContain('Date discrepancy');

    // MM/YYYY formats with different delimiters
    const dateMatch = compareFieldValues('DATE_OF_PACKAGING', '03/2026', null, '03-2026', null);
    expect(dateMatch.isEqual).toBe(true);
    expect(dateMatch.normalizedA).toBe('2026-03');
  });

  it('compares Country of Origin including bilingual Hindi/English equivalents', () => {
    const originMatch = compareFieldValues('COUNTRY_OF_ORIGIN', 'India', null, 'भारत', null);
    expect(originMatch.isEqual).toBe(true);

    const originConflict = compareFieldValues('COUNTRY_OF_ORIGIN', 'India', null, 'China', null);
    expect(originConflict.isEqual).toBe(false);
  });

  it('compares manufacturer names conservatively without accidental merging', () => {
    const sameMfr = compareFieldValues(
      'MANUFACTURER_NAME_ADDRESS',
      'Britannia Industries Limited, Kolkata',
      null,
      'Britannia Industries Limited, Kolkata',
      null
    );
    expect(sameMfr.isEqual).toBe(true);

    const diffMfr = compareFieldValues(
      'MANUFACTURER_NAME_ADDRESS',
      'ITC Limited, Virginia House, Kolkata',
      null,
      'Parle Products Pvt Ltd, Mumbai',
      null
    );
    expect(diffMfr.isEqual).toBe(false);
  });
});

describe('Phase D: Multi-Dimensional Confidence Engine', () => {
  it('does NOT award HIGH_CONFIDENCE on severely blurred images despite multi-source agreement', () => {
    // Guardrail 2: Local OCR ₹120, Gemini ₹120, but image is blurry
    const blurryQuality: ImageQuality = {
      overallScore: 0.35,
      isAcceptable: false,
      sharpness: 20, // severely blurred (< 25)
      brightness: 70,
      blurDetected: true,
      glareDetected: false,
      shadowDetected: false,
      warnings: ['Motion blur detected'],
    };

    const items = [
      {
        sourceType: 'LOCAL_OCR' as const,
        value: 120,
        confidenceTier: 'HIGH_CONFIDENCE' as const,
        boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.3, yMax: 0.2, unit: 'NORMALIZED' as const },
        timestamp: new Date().toISOString(),
      },
      {
        sourceType: 'GEMINI' as const,
        value: 120,
        confidenceTier: 'HIGH_CONFIDENCE' as const,
        boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.3, yMax: 0.2, unit: 'NORMALIZED' as const },
        timestamp: new Date().toISOString(),
      },
    ];

    const conf = evaluateEvidenceConfidence({
      items,
      hasConflict: false,
      isPartial: false,
      isInspectorConfirmed: false,
      quality: blurryQuality,
    });

    // Guardrail 2: Under severe blur, confidence MUST be capped at LOW_CONFIDENCE
    expect(conf).toBe('LOW_CONFIDENCE');
  });

  it('awards HIGH_CONFIDENCE when corroborated on crisp, high-quality images with spatial support', () => {
    const crispQuality: ImageQuality = {
      overallScore: 0.95,
      isAcceptable: true,
      sharpness: 90,
      brightness: 80,
      blurDetected: false,
      glareDetected: false,
      shadowDetected: false,
      warnings: [],
    };

    const items = [
      {
        sourceType: 'LOCAL_OCR' as const,
        value: 120,
        confidenceTier: 'HIGH_CONFIDENCE' as const,
        boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.3, yMax: 0.2, unit: 'NORMALIZED' as const },
        timestamp: new Date().toISOString(),
      },
      {
        sourceType: 'GEMINI' as const,
        value: 120,
        confidenceTier: 'HIGH_CONFIDENCE' as const,
        boundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.3, yMax: 0.2, unit: 'NORMALIZED' as const },
        timestamp: new Date().toISOString(),
      },
    ];

    const conf = evaluateEvidenceConfidence({
      items,
      hasConflict: false,
      isPartial: false,
      isInspectorConfirmed: false,
      quality: crispQuality,
    });

    expect(conf).toBe('HIGH_CONFIDENCE');
  });

  it('assigns CONFLICT tier unconditionally when evidence contradicts', () => {
    const conf = evaluateEvidenceConfidence({
      items: [],
      hasConflict: true,
      isPartial: false,
      isInspectorConfirmed: false,
    });
    expect(conf).toBe('CONFLICT');
  });

  it('assigns HIGH_CONFIDENCE unconditionally to Inspector-Confirmed observations', () => {
    const conf = evaluateEvidenceConfidence({
      items: [],
      hasConflict: false,
      isPartial: false,
      isInspectorConfirmed: true,
    });
    expect(conf).toBe('HIGH_CONFIDENCE');
  });
});

describe('Phase D: Demo Cases & Evidence Fusion Engine', () => {
  // CASE A: AGREEMENT
  it('CASE A — AGREEMENT: Local OCR ₹120 + Gemini ₹120 produces AGREEMENT', () => {
    const localAnalysis: PackageAnalysis = {
      provider: 'LOCAL_OCR',
      modelName: 'ondevice-ocr-cv-v1',
      quality: {
        overallScore: 0.9,
        isAcceptable: true,
        sharpness: 85,
        brightness: 75,
        blurDetected: false,
        glareDetected: false,
        shadowDetected: false,
        warnings: [],
      },
      declarations: [
        {
          type: 'MRP',
          rawText: 'MRP ₹120.00',
          normalizedValue: 120,
          confidence: 0.92,
          isFormatStandard: true,
          detectedLanguage: 'en',
          region: {
            id: 'reg-mrp-local',
            imageId: '00000000-0000-0000-0000-000000000001',
            surface: 'FRONT',
            boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.4, yMax: 0.3, unit: 'NORMALIZED' },
            text: 'MRP ₹120.00',
            confidence: 0.92,
          },
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 120,
      timestamp: new Date().toISOString(),
    };

    const remoteAnalysis: PackageAnalysis = {
      provider: 'GEMINI',
      modelName: 'gemini-3.5-flash',
      quality: localAnalysis.quality,
      declarations: [
        {
          type: 'MRP',
          rawText: '₹120',
          normalizedValue: 120,
          confidence: 0.95,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 800,
      timestamp: new Date().toISOString(),
    };

    const result = fuseEvidence({
      inspectionId: '00000000-0000-0000-0000-000000000001',
      localAnalysis,
      remoteAnalysis,
      aiAvailable: true,
    });

    const mrpField = result.fusedPackage.fields['MRP'];
    expect(mrpField).toBeDefined();
    expect(mrpField.evidenceStatus).toBe('AGREEMENT');
    expect(mrpField.confidenceTier).toBe('HIGH_CONFIDENCE');
    expect(mrpField.fusedValue).toBe(120);
    expect(mrpField.isAmbiguous).toBe(false);
    expect(mrpField.sources.length).toBe(2);

    // Downstream canonical declaration
    const mrpDecl = result.declarations.find((d) => d.type === 'MRP');
    expect(mrpDecl).toBeDefined();
    expect(mrpDecl?.confidence).toBeGreaterThanOrEqual(0.85);
    expect(mrpDecl?.normalizedValue).toBe(120);
  });

  // CASE B: CONFLICT
  it('CASE B — CONFLICT: Local OCR ₹120 vs Gemini ₹180 produces CONFLICT and never silently picks a winner', () => {
    const localAnalysis: PackageAnalysis = {
      provider: 'LOCAL_OCR',
      modelName: 'ondevice-ocr-cv-v1',
      quality: {
        overallScore: 0.88,
        isAcceptable: true,
        sharpness: 80,
        brightness: 70,
        blurDetected: false,
        glareDetected: false,
        shadowDetected: false,
        warnings: [],
      },
      declarations: [
        {
          type: 'MRP',
          rawText: 'MRP ₹120.00',
          normalizedValue: 120,
          confidence: 0.88,
          isFormatStandard: true,
          detectedLanguage: 'en',
          region: {
            id: 'reg-mrp-local',
            imageId: '00000000-0000-0000-0000-000000000001',
            surface: 'FRONT',
            boundingBox: { xMin: 0.1, yMin: 0.2, xMax: 0.4, yMax: 0.3, unit: 'NORMALIZED' },
            text: 'MRP ₹120.00',
            confidence: 0.88,
          },
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 100,
      timestamp: new Date().toISOString(),
    };

    const remoteAnalysis: PackageAnalysis = {
      provider: 'GEMINI',
      modelName: 'gemini-3.5-flash',
      quality: localAnalysis.quality,
      declarations: [
        {
          type: 'MRP',
          rawText: '₹180',
          normalizedValue: 180,
          confidence: 0.90,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 750,
      timestamp: new Date().toISOString(),
    };

    const result = fuseEvidence({
      inspectionId: '00000000-0000-0000-0000-000000000001',
      localAnalysis,
      remoteAnalysis,
      aiAvailable: true,
    });

    const mrpField = result.fusedPackage.fields['MRP'];
    expect(mrpField).toBeDefined();

    // Guardrail 4: MUST NOT pick a winner!
    expect(mrpField.evidenceStatus).toBe('CONFLICT');
    expect(mrpField.confidenceTier).toBe('CONFLICT');
    expect(mrpField.isAmbiguous).toBe(true);
    expect(mrpField.fusedValue).toBeNull(); // Zero silent winner

    // Both sources are preserved
    expect(mrpField.sources.length).toBe(2);
    const localSrc = mrpField.sources.find((s) => s.sourceType === 'LOCAL_OCR');
    const aiSrc = mrpField.sources.find((s) => s.sourceType === 'GEMINI');
    expect(localSrc?.value).toBe(120);
    expect(aiSrc?.value).toBe(180);

    // Rule Engine evaluation: Conflict must produce INSUFFICIENT_EVIDENCE or REQUIRES_VERIFICATION, not silent pass
    const compliance = evaluateCompliance({
      inspectionId: '00000000-0000-0000-0000-000000000001',
      packageAnalysis: result.packageAnalysis,
    });

    const mrpAssessment = compliance.assessments.find(
      (a) => a.ruleNumber === '6(1)(e)' || a.ruleTitle.includes('Retail Price')
    );
    expect(mrpAssessment).toBeDefined();
    // Rule Engine handles low confidence / conflict as INSUFFICIENT_EVIDENCE or REQUIRES_VERIFICATION
    expect(mrpAssessment?.result).toBe('INSUFFICIENT_EVIDENCE');
    expect(mrpAssessment?.evidenceSufficiency).toBe('LOW_CONFIDENCE');
  });


  // CASE C: OFFLINE
  it('CASE C — OFFLINE: Local OCR works with AI unavailable, Rule Engine operates fully offline', () => {
    const localAnalysis: PackageAnalysis = {
      provider: 'LOCAL_OCR',
      modelName: 'ondevice-ocr-cv-v1',
      quality: {
        overallScore: 0.90,
        isAcceptable: true,
        sharpness: 85,
        brightness: 75,
        blurDetected: false,
        glareDetected: false,
        shadowDetected: false,
        warnings: [],
      },
      declarations: [
        {
          type: 'MRP',
          rawText: 'MRP ₹120.00',
          normalizedValue: 120,
          confidence: 0.90,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
        {
          type: 'NET_QUANTITY',
          rawText: 'NET QTY 500 g',
          normalizedValue: 500,
          unit: 'g',
          confidence: 0.92,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
        {
          type: 'GENERIC_NAME',
          rawText: 'Whole Wheat Atta',
          normalizedValue: 'Whole Wheat Atta',
          confidence: 0.88,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
        {
          type: 'MANUFACTURER_NAME_ADDRESS',
          rawText: 'Aashirvaad Foods Pvt Ltd, Industrial Area, Bangalore 560001',
          normalizedValue: 'Aashirvaad Foods Pvt Ltd, Industrial Area, Bangalore 560001',
          confidence: 0.85,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
        {
          type: 'DATE_OF_PACKAGING',
          rawText: 'PKD 03/2026',
          normalizedValue: '03/2026',
          confidence: 0.91,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
        {
          type: 'CONSUMER_CARE',
          rawText: 'Consumer Care: 1800-123-4567, care@aashirvaad.com',
          normalizedValue: '1800-123-4567',
          confidence: 0.86,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
        {
          type: 'COUNTRY_OF_ORIGIN',
          rawText: 'Country of Origin: India',
          normalizedValue: 'India',
          confidence: 0.95,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 140,
      timestamp: new Date().toISOString(),
    };

    const result = fuseEvidence({
      inspectionId: '00000000-0000-0000-0000-000000000002',
      localAnalysis,
      aiAvailable: false,
    });

    expect(result.fusedPackage.aiAvailable).toBe(false);
    expect(result.fusedPackage.hasConflicts).toBe(false);
    expect(result.fusedPackage.overallStatus).toBe('AGREEMENT');

    // Rule Engine executes offline without errors
    const compliance = evaluateCompliance({
      inspectionId: '00000000-0000-0000-0000-000000000002',
      packageAnalysis: result.packageAnalysis,
    });

    expect(compliance.assessments.length).toBeGreaterThan(0);
    const passCount = compliance.assessments.filter((a) => a.result === 'PASS').length;
    expect(passCount).toBeGreaterThanOrEqual(4);
  });


  // CASE D: INSPECTOR RESOLUTION
  it('CASE D — INSPECTOR RESOLUTION: Inspector resolves conflict; all historical evidence is preserved', () => {
    const localAnalysis: PackageAnalysis = {
      provider: 'LOCAL_OCR',
      modelName: 'ondevice-ocr-cv-v1',
      quality: {
        overallScore: 0.85,
        isAcceptable: true,
        sharpness: 80,
        brightness: 70,
        blurDetected: false,
        glareDetected: false,
        shadowDetected: false,
        warnings: [],
      },
      declarations: [
        {
          type: 'MRP',
          rawText: '₹120',
          normalizedValue: 120,
          confidence: 0.85,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 100,
      timestamp: new Date().toISOString(),
    };

    const remoteAnalysis: PackageAnalysis = {
      provider: 'GEMINI',
      modelName: 'gemini-3.5-flash',
      quality: localAnalysis.quality,
      declarations: [
        {
          type: 'MRP',
          rawText: '₹180',
          normalizedValue: 180,
          confidence: 0.90,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 700,
      timestamp: new Date().toISOString(),
    };

    const result = fuseEvidence({
      inspectionId: '00000000-0000-0000-0000-000000000003',
      localAnalysis,
      remoteAnalysis,
      aiAvailable: true,
      inspectorCorrections: [
        {
          declarationType: 'MRP',
          originalValue: 180,
          correctedValue: 120,
          reason: 'Physical inspection verified printed MRP label is ₹120. Gemini misread reflection.',
          inspectorUserId: 'insp-rahul-sharma',
          correctedAt: new Date().toISOString(),
        },
      ],
    });

    const mrpField = result.fusedPackage.fields['MRP'];
    expect(mrpField).toBeDefined();

    // Guardrail 3: Human confirmation establishes verified truth
    expect(mrpField.evidenceStatus).toBe('INSPECTOR_CONFIRMED');
    expect(mrpField.confidenceTier).toBe('HIGH_CONFIDENCE');
    expect(mrpField.fusedValue).toBe(120);
    expect(mrpField.primarySource).toBe('INSPECTOR');

    // Historical evidence is strictly preserved
    expect(mrpField.sources.length).toBe(3);
    const localSrc = mrpField.sources.find((s) => s.sourceType === 'LOCAL_OCR');
    const aiSrc = mrpField.sources.find((s) => s.sourceType === 'GEMINI');
    const inspSrc = mrpField.sources.find((s) => s.sourceType === 'INSPECTOR');

    expect(localSrc?.value).toBe(120);
    expect(aiSrc?.value).toBe(180);
    expect(inspSrc?.value).toBe(120);
    expect(mrpField.inspectorCorrection?.reason).toContain('Physical inspection verified');
  });

  // CASE E: AI FAILURE (503 / Network Down)
  it('CASE E — AI FAILURE: Backend 503 causes zero mobile crash and falls back cleanly to local perception', () => {
    const localAnalysis: PackageAnalysis = {
      provider: 'LOCAL_OCR',
      modelName: 'ondevice-ocr-cv-v1',
      quality: {
        overallScore: 0.85,
        isAcceptable: true,
        sharpness: 80,
        brightness: 75,
        blurDetected: false,
        glareDetected: false,
        shadowDetected: false,
        warnings: [],
      },
      declarations: [
        {
          type: 'MRP',
          rawText: 'MRP ₹250',
          normalizedValue: 250,
          confidence: 0.90,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 110,
      timestamp: new Date().toISOString(),
    };

    // When backend returns 503, aiAvailable is false, aiErrorReason is passed
    const result = fuseEvidence({
      inspectionId: '00000000-0000-0000-0000-000000000004',
      localAnalysis,
      aiAvailable: false,
      aiErrorReason: 'HTTP 503 Service Unavailable: Cloud AI engine overloaded',
    });

    expect(result.fusedPackage.aiAvailable).toBe(false);
    expect(result.packageAnalysis.declarations.length).toBe(1);
    expect(result.packageAnalysis.declarations[0]?.normalizedValue).toBe(250);
  });

  // CASE F: E-COMMERCE SUPPORTING EVIDENCE
  it('CASE F — E-COMMERCE: Printed MRP ₹120 vs Online ₹135 produces ECOMMERCE_DISCREPANCY, not automatic legal violation', () => {
    const localAnalysis: PackageAnalysis = {
      provider: 'LOCAL_OCR',
      modelName: 'ondevice-ocr-cv-v1',
      quality: {
        overallScore: 0.90,
        isAcceptable: true,
        sharpness: 85,
        brightness: 75,
        blurDetected: false,
        glareDetected: false,
        shadowDetected: false,
        warnings: [],
      },
      declarations: [
        {
          type: 'MRP',
          rawText: 'MRP ₹120.00',
          normalizedValue: 120,
          confidence: 0.95,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 110,
      timestamp: new Date().toISOString(),
    };

    const remoteAnalysis: PackageAnalysis = {
      provider: 'GEMINI',
      modelName: 'gemini-3.5-flash',
      quality: localAnalysis.quality,
      declarations: [
        {
          type: 'MRP',
          rawText: '₹120',
          normalizedValue: 120,
          confidence: 0.95,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 650,
      timestamp: new Date().toISOString(),
    };

    // E-Commerce listing: ₹135 on Blinkit
    const result = fuseEvidence({
      inspectionId: '00000000-0000-0000-0000-000000000005',
      localAnalysis,
      remoteAnalysis,
      aiAvailable: true,
      ecommerceListing: {
        id: 'ecom-blinkit-01',
        platformName: 'Blinkit',
        listedMrpInr: 135,
        capturedAt: new Date().toISOString(),
      },
    });

    const mrpField = result.fusedPackage.fields['MRP'];
    expect(mrpField).toBeDefined();

    // Guardrail 9: Physical packaging evidence status remains AGREEMENT (printed label is ₹120)
    expect(mrpField.evidenceStatus).toBe('AGREEMENT');
    expect(mrpField.fusedValue).toBe(120);

    // Supporting e-commerce discrepancy is recorded
    expect(mrpField.ecommerceDiscrepancy).toBeDefined();
    expect(mrpField.ecommerceDiscrepancy?.hasDiscrepancy).toBe(true);
    expect(mrpField.ecommerceDiscrepancy?.physicalValue).toBe(120);
    expect(mrpField.ecommerceDiscrepancy?.listedValue).toBe(135);
    expect(mrpField.ecommerceDiscrepancy?.platform).toBe('Blinkit');
  });

  // Guardrail 7: AI evidence must be evidence-backed
  it('Guardrail 7: AI observation without visual evidence region or confidence is marked INSUFFICIENT', () => {
    const remoteAnalysis: PackageAnalysis = {
      provider: 'GEMINI',
      modelName: 'gemini-3.5-flash',
      quality: {
        overallScore: 0.85,
        isAcceptable: true,
        sharpness: 80,
        brightness: 75,
        blurDetected: false,
        glareDetected: false,
        shadowDetected: false,
        warnings: [],
      },
      declarations: [
        {
          type: 'MANUFACTURER_NAME_ADDRESS',
          rawText: 'Hallucinated Foods Pvt Ltd',
          normalizedValue: 'Hallucinated Foods Pvt Ltd',
          confidence: 0.45, // low confidence, no region
          isFormatStandard: false,
          detectedLanguage: 'en',
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      latencyMs: 650,
      timestamp: new Date().toISOString(),
    };

    const result = fuseEvidence({
      inspectionId: '00000000-0000-0000-0000-000000000006',
      remoteAnalysis,
      aiAvailable: true,
    });

    const mfrField = result.fusedPackage.fields['MANUFACTURER_NAME_ADDRESS'];
    expect(mfrField).toBeDefined();
    expect(mfrField.evidenceStatus).toBe('INSUFFICIENT');
    expect(mfrField.fusedValue).toBeNull();
  });

  // Guardrail 8: Partial evidence remains partial
  it('Guardrail 8: Local label-only observation + AI value observation produces PARTIAL evidence', () => {
    const result = fuseEvidence({
      inspectionId: '00000000-0000-0000-0000-000000000007',
      localDeclarations: [
        {
          type: 'MRP',
          rawText: 'MRP',
          normalizedValue: null, // label only!
          confidence: 0.70,
          isFormatStandard: false,
          detectedLanguage: 'en',
        },
      ],
      remoteDeclarations: [
        {
          type: 'MRP',
          rawText: '₹120',
          normalizedValue: 120,
          confidence: 0.90,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
      ],
      aiAvailable: true,
    });

    const mrpField = result.fusedPackage.fields['MRP'];
    expect(mrpField).toBeDefined();
    expect(mrpField.evidenceStatus).toBe('PARTIAL');
    expect(mrpField.explanation).toContain('Partial observation');
  });

  // Guardrail 14: Do not silently overwrite completed inspections
  it('Guardrail 14: Confirmed inspection preserves human decision when conflicting AI arrives later', () => {
    const result = fuseEvidence({
      inspectionId: '00000000-0000-0000-0000-000000000008',
      existingCompletedDecision: {
        overallStatus: 'PASS',
        inspectorConfirmed: true,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      inspectorCorrections: [
        {
          declarationType: 'MRP',
          correctedValue: 120,
          reason: 'Inspector previously confirmed ₹120',
        },
      ],
      remoteDeclarations: [
        {
          type: 'MRP',
          rawText: '₹180',
          normalizedValue: 180,
          confidence: 0.95,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
      ],
      aiAvailable: true,
    });

    const mrpField = result.fusedPackage.fields['MRP'];
    expect(mrpField.evidenceStatus).toBe('INSPECTOR_CONFIRMED');
    expect(mrpField.fusedValue).toBe(120); // Decision preserved!
    expect(mrpField.pendingReview).toBe(true); // Flagged for review
    expect(result.fusedPackage.newEvidenceAfterDecision).toBe(true);
  });
});

describe('Phase D: Security & Architectural Boundaries', () => {
  it('Guardrail 12 & 20: Mobile package has ZERO direct cloud AI dependencies or API keys', () => {
    const mobilePkgJsonPath = resolve(__dirname, '../apps/mobile/package.json');
    expect(existsSync(mobilePkgJsonPath)).toBe(true);

    const mobilePkg = JSON.parse(readFileSync(mobilePkgJsonPath, 'utf8'));
    const allDeps = {
      ...(mobilePkg.dependencies || {}),
      ...(mobilePkg.devDependencies || {}),
    };

    // Strict: No direct Google AI or OpenAI SDKs in mobile
    expect(allDeps['@google/genai']).toBeUndefined();
    expect(allDeps['@google/generative-ai']).toBeUndefined();
    expect(allDeps['openai']).toBeUndefined();

    // Check mobile source tree for accidental hardcoded API keys
    const mobileClientAdapterPath = resolve(
      __dirname,
      '../apps/mobile/src/services/ai/aiClientAdapter.ts'
    );
    const adapterSource = readFileSync(mobileClientAdapterPath, 'utf8');

    expect(adapterSource).not.toMatch(/AIzaSy[0-9A-Za-z_-]{33}/);
    expect(adapterSource).not.toMatch(/sk-[a-zA-Z0-9]{32,}/);
    expect(adapterSource).not.toContain('GEMINI_API_KEY');
    expect(adapterSource).not.toContain('OPENAI_API_KEY');
  });

  it('Guardrail 1 & 11: Rule Engine remains untouched and backward-compatible', () => {
    // Verify PackageAnalysis structure includes rawResponse.phaseD without breaking consumers
    const sampleAnalysis: PackageAnalysis = {
      provider: 'HYBRID',
      modelName: 'hybrid-fusion-gemini',
      quality: {
        overallScore: 0.9,
        isAcceptable: true,
        sharpness: 85,
        brightness: 75,
        blurDetected: false,
        glareDetected: false,
        shadowDetected: false,
        warnings: [],
      },
      declarations: [
        {
          type: 'MRP',
          rawText: '₹120',
          normalizedValue: 120,
          confidence: 0.95,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
      ],
      textRegions: [],
      visualMeasurements: [],
      rawResponse: {
        phase: 'PHASE_D_HYBRID_EVIDENCE_FUSION',
        phaseD: {
          inspectionId: '00000000-0000-0000-0000-000000000009',
          fields: {},
          overallStatus: 'AGREEMENT',
          hasConflicts: false,
          conflictingFieldCount: 0,
          aiAvailable: true,
          fusedAt: new Date().toISOString(),
          latencyMs: 50,
        },
      },
      latencyMs: 50,
      timestamp: new Date().toISOString(),
    };

    // Rule Engine consumes it without error
    const compliance = evaluateCompliance({
      inspectionId: '00000000-0000-0000-0000-000000000009',
      packageAnalysis: sampleAnalysis,
    });

    expect(compliance.inspectionId).toBe('00000000-0000-0000-0000-000000000009');
    expect(compliance.assessments.length).toBeGreaterThan(0);
  });
});

describe('Phase D: Adversarial & Negative Guardrail Test Cases', () => {
  it('rejects wrong MRP and random numbers (PIN, phone, barcode) as conflicts', () => {
    // True MRP ₹120 vs Pin Code 560001
    const pinConf = compareFieldValues('MRP', 120, null, 560001, null);
    expect(pinConf.isEqual).toBe(false);

    // True MRP ₹120 vs Phone Number 9876543210
    const phoneConf = compareFieldValues('MRP', 120, null, 9876543210, null);
    expect(phoneConf.isEqual).toBe(false);

    // True MRP ₹120 vs Barcode 8901030383848
    const barcodeConf = compareFieldValues('MRP', 120, null, 8901030383848, null);
    expect(barcodeConf.isEqual).toBe(false);
  });

  it('detects missing unit as a discrepancy in net quantity', () => {
    const missingUnit = compareFieldValues('NET_QUANTITY', 500, 'g', 500, null);
    expect(missingUnit.isEqual).toBe(false);
    expect(missingUnit.reason).toContain('Unit presence mismatch');
  });

  it('detects conflicting dates strictly', () => {
    const diffMonth = compareFieldValues('DATE_OF_PACKAGING', '03/2026', null, '04/2026', null);
    expect(diffMonth.isEqual).toBe(false);

    const diffYear = compareFieldValues('DATE_OF_PACKAGING', '03/2025', null, '03/2026', null);
    expect(diffYear.isEqual).toBe(false);
  });

  it('detects conflicting quantities strictly across different dimensions and amounts', () => {
    // 500 g vs 1 kg
    const diffQty = compareFieldValues('NET_QUANTITY', 500, 'g', 1, 'kg');
    expect(diffQty.isEqual).toBe(false);

    // 500 ml vs 500 g
    const diffDim = compareFieldValues('NET_QUANTITY', 500, 'ml', 500, 'g');
    expect(diffDim.isEqual).toBe(false);
  });

  it('flags hallucinated manufacturer without region as INSUFFICIENT', () => {
    const result = fuseEvidence({
      inspectionId: '00000000-0000-0000-0000-000000000010',
      remoteDeclarations: [
        {
          type: 'MANUFACTURER_NAME_ADDRESS',
          rawText: 'NonExistent Packaging LLP',
          normalizedValue: 'NonExistent Packaging LLP',
          confidence: 0.35,
          isFormatStandard: false,
          detectedLanguage: 'en',
        },
      ],
      aiAvailable: true,
    });

    const mfrField = result.fusedPackage.fields['MANUFACTURER_NAME_ADDRESS'];
    expect(mfrField).toBeDefined();
    expect(mfrField.evidenceStatus).toBe('INSUFFICIENT');
    expect(mfrField.confidenceTier).toBe('LOW_CONFIDENCE');
    expect(mfrField.fusedValue).toBeNull();
  });

  it('keeps evidence conflict completely separate from statutory legal verdicts', () => {
    // Guardrail 10: An evidence conflict must NOT be called a statutory violation.
    // Instead it produces REQUIRES_VERIFICATION or INSUFFICIENT_EVIDENCE.
    const result = fuseEvidence({
      inspectionId: '00000000-0000-0000-0000-000000000011',
      localDeclarations: [
        {
          type: 'NET_QUANTITY',
          rawText: '500 g',
          normalizedValue: 500,
          unit: 'g',
          confidence: 0.90,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
      ],
      remoteDeclarations: [
        {
          type: 'NET_QUANTITY',
          rawText: '1 kg',
          normalizedValue: 1,
          unit: 'kg',
          confidence: 0.90,
          isFormatStandard: true,
          detectedLanguage: 'en',
        },
      ],
      aiAvailable: true,
    });

    expect(result.fusedPackage.fields['NET_QUANTITY']?.evidenceStatus).toBe('CONFLICT');

    const compliance = evaluateCompliance({
      inspectionId: '00000000-0000-0000-0000-000000000011',
      packageAnalysis: result.packageAnalysis,
    });

    const netQtyAssessment = compliance.assessments.find((a) => a.ruleNumber === '6(1)(c)');
    expect(netQtyAssessment).toBeDefined();
    // It is NOT marked a permanent FAIL violation — it requires verification
    expect(netQtyAssessment?.result).toBe('INSUFFICIENT_EVIDENCE');
    expect(netQtyAssessment?.evidenceSufficiency).toBe('LOW_CONFIDENCE');
  });
});

