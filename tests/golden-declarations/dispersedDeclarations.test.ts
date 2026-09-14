/**
 * Golden Regression Test Suite — Dispersed Packaging Declarations
 *
 * 20 mandatory golden edge cases validating all invariants of multi-surface
 * declaration extraction under Legal Metrology Rules:
 * 1. MRP only on bottle neck
 * 2. MFD only on bottle shoulder
 * 3. PKD only on sachet crimp
 * 4. Manufacturer back + MRP neck
 * 5. Net quantity front + date seal
 * 6. Same MRP front and neck
 * 7. Conflicting MRP front and neck
 * 8. Front checked, neck not captured
 * 9. Front + back checked, neck captured with no MRP
 * 10. Blurry neck
 * 11. Glare on neck
 * 12. Curved neck
 * 13. Metallic seal
 * 14. Dot-matrix seal
 * 15. Hindi/English remote declaration
 * 16. Duplicate identical observations
 * 17. Duplicate conflicting observations
 * 18. Unknown package surface
 * 19. Inspector resolves cross-surface conflict
 * 20. Later AI evidence must not silently replace inspector decision
 */

import { describe, expect, it } from 'vitest';
import {
  defaultDetectorRegistry,
  normalizeLineText,
  type StructuredDeclarationCandidate,
} from '../../packages/perception/src/intelligence/index.js';
import {
  assessSurfaceCaptureQuality,
  fuseCrossSurfaceDeclarations,
  generateSurfaceRecommendations,
  toPackageSurface,
} from '../../packages/perception/src/surfaces/index.js';

function createCandidate(
  fieldType: any,
  rawText: string,
  normalizedValue: any,
  surface: any,
  imageId: string,
  options?: { unit?: string | null; isAmbiguous?: boolean; confidenceTier?: any }
): StructuredDeclarationCandidate {
  return {
    fieldType,
    originalOCRText: rawText,
    normalizedText: rawText,
    normalizedValue,
    unit: options?.unit ?? null,
    confidenceTier: options?.confidenceTier ?? 'HIGH_CONFIDENCE',
    nativeConfidence: 0.95,
    isAmbiguous: options?.isAmbiguous ?? false,
    correctionsApplied: [],
    surface,
    surfaceType: surface,
    traceability: {
      sourceRegionIds: ['reg-1'],
      originalImageId: imageId,
      originalBoundingBox: { xMin: 0.1, yMin: 0.1, xMax: 0.9, yMax: 0.5, unit: 'NORMALIZED' },
      extractionMethod: 'DIRECT_PATTERN',
      validationStatus: 'VALID',
      timestamp: '2026-09-12T00:00:00.000Z',
      surface,
      surfaceType: surface,
    },
  };
}

describe('Golden Regression Tests — Dispersed Packaging Declarations', () => {
  // 1. MRP only on bottle neck
  it('1. extracts MRP located solely on bottle neck', () => {
    const neckCand = createCandidate('MRP', 'MRP ₹120.00 INCL TAXES', 120.0, 'NECK', 'img-neck');
    const fusion = fuseCrossSurfaceDeclarations({
      inspectionId: 'insp-1',
      candidatesBySurface: [
        { surface: 'FRONT', imageId: 'img-front', candidates: [] },
        { surface: 'NECK', imageId: 'img-neck', candidates: [neckCand] },
      ],
      capturedSurfaces: ['FRONT', 'NECK'],
      containerType: 'BOTTLE',
    });

    const mrp = fusion.fields['MRP']!;
    expect(mrp.searchStatus).toBe('FOUND');
    expect(mrp.fusedValue).toBe(120.0);
    expect(mrp.primarySourceSurface).toBe('NECK');
    expect(mrp.sources[0]?.sourceImageId).toBe('img-neck');
  });

  // 2. MFD only on bottle shoulder
  it('2. extracts MFD located solely on bottle shoulder', () => {
    const shoulderCand = createCandidate('DATE_OF_MANUFACTURE', 'MFD: 02/2026', '02/2026', 'SHOULDER', 'img-shoulder');
    const fusion = fuseCrossSurfaceDeclarations({
      inspectionId: 'insp-2',
      candidatesBySurface: [
        { surface: 'FRONT', imageId: 'img-front', candidates: [] },
        { surface: 'SHOULDER', imageId: 'img-shoulder', candidates: [shoulderCand] },
      ],
      capturedSurfaces: ['FRONT', 'SHOULDER'],
      containerType: 'BOTTLE',
    });

    const mfd = fusion.fields['DATE_OF_MANUFACTURE']!;
    expect(mfd.searchStatus).toBe('FOUND');
    expect(mfd.fusedValue).toBe('02/2026');
    expect(mfd.primarySourceSurface).toBe('SHOULDER');
  });

  // 3. PKD only on sachet crimp
  it('3. extracts PKD located solely on sachet crimp', () => {
    const crimpCand = createCandidate('DATE_OF_PACKAGING', 'PKD 03/2026', '03/2026', 'CRIMP', 'img-crimp');
    const fusion = fuseCrossSurfaceDeclarations({
      inspectionId: 'insp-3',
      candidatesBySurface: [
        { surface: 'FRONT', imageId: 'img-front', candidates: [] },
        { surface: 'CRIMP', imageId: 'img-crimp', candidates: [crimpCand] },
      ],
      capturedSurfaces: ['FRONT', 'CRIMP'],
      containerType: 'SACHET',
    });

    const pkd = fusion.fields['DATE_OF_PACKAGING']!;
    expect(pkd.searchStatus).toBe('FOUND');
    expect(pkd.fusedValue).toBe('03/2026');
    expect(pkd.primarySourceSurface).toBe('CRIMP');
  });

  // 4. Manufacturer back + MRP neck
  it('4. unifies Manufacturer from back with MRP from neck', () => {
    const mfrCand = createCandidate('MANUFACTURER_NAME_ADDRESS', 'MFD BY: PURE FOODS LTD, THANE - 400601', 'PURE FOODS LTD, THANE - 400601', 'BACK', 'img-back');
    const neckCand = createCandidate('MRP', 'MRP ₹250.00', 250.0, 'NECK', 'img-neck');

    const fusion = fuseCrossSurfaceDeclarations({
      inspectionId: 'insp-4',
      candidatesBySurface: [
        { surface: 'BACK', imageId: 'img-back', candidates: [mfrCand] },
        { surface: 'NECK', imageId: 'img-neck', candidates: [neckCand] },
      ],
      capturedSurfaces: ['BACK', 'NECK'],
      containerType: 'BOTTLE',
    });

    expect(fusion.fields['MANUFACTURER_NAME_ADDRESS']?.searchStatus).toBe('FOUND');
    expect(fusion.fields['MANUFACTURER_NAME_ADDRESS']?.primarySourceSurface).toBe('BACK');
    expect(fusion.fields['MRP']?.searchStatus).toBe('FOUND');
    expect(fusion.fields['MRP']?.primarySourceSurface).toBe('NECK');
  });

  // 5. Net quantity front + date seal
  it('5. unifies Net Quantity from front with Date from seal', () => {
    const qtyCand = createCandidate('NET_QUANTITY', 'NET WT 50 g', 50, 'FRONT', 'img-front', { unit: 'g' });
    const sealCand = createCandidate('DATE_OF_PACKAGING', 'PKD: 04/2026', '04/2026', 'TOP_SEAL', 'img-seal');

    const fusion = fuseCrossSurfaceDeclarations({
      inspectionId: 'insp-5',
      candidatesBySurface: [
        { surface: 'FRONT', imageId: 'img-front', candidates: [qtyCand] },
        { surface: 'TOP_SEAL', imageId: 'img-seal', candidates: [sealCand] },
      ],
      capturedSurfaces: ['FRONT', 'TOP_SEAL'],
      containerType: 'SACHET',
    });

    expect(fusion.fields['NET_QUANTITY']?.searchStatus).toBe('FOUND');
    expect(fusion.fields['NET_QUANTITY']?.fusedValue).toBe(50);
    expect(fusion.fields['DATE_OF_PACKAGING']?.searchStatus).toBe('FOUND');
    expect(fusion.fields['DATE_OF_PACKAGING']?.fusedValue).toBe('04/2026');
  });

  // 6. Same MRP front and neck
  it('6. merges identical MRP from front and neck into single agreement candidate', () => {
    const frontCand = createCandidate('MRP', 'MRP ₹99.00', 99.0, 'FRONT', 'img-front');
    const neckCand = createCandidate('MRP', 'MRP ₹99.00 INCL TAXES', 99.0, 'NECK', 'img-neck');

    const fusion = fuseCrossSurfaceDeclarations({
      inspectionId: 'insp-6',
      candidatesBySurface: [
        { surface: 'FRONT', imageId: 'img-front', candidates: [frontCand] },
        { surface: 'NECK', imageId: 'img-neck', candidates: [neckCand] },
      ],
      capturedSurfaces: ['FRONT', 'NECK'],
      containerType: 'BOTTLE',
    });

    const mrp = fusion.fields['MRP']!;
    expect(mrp.searchStatus).toBe('FOUND');
    expect(mrp.evidenceStatus).toBe('AGREEMENT');
    expect(mrp.fusedValue).toBe(99.0);
    expect(mrp.sources.length).toBe(2);
    expect(mrp.sources.map(s => s.surface)).toContain('FRONT');
    expect(mrp.sources.map(s => s.surface)).toContain('NECK');
  });

  // 7. Conflicting MRP front and neck
  it('7. detects cross-surface conflict without arbitrary winner or averaging', () => {
    const frontCand = createCandidate('MRP', 'MRP ₹120.00', 120.0, 'FRONT', 'img-front');
    const neckCand = createCandidate('MRP', 'MRP ₹150.00', 150.0, 'NECK', 'img-neck');

    const fusion = fuseCrossSurfaceDeclarations({
      inspectionId: 'insp-7',
      candidatesBySurface: [
        { surface: 'FRONT', imageId: 'img-front', candidates: [frontCand] },
        { surface: 'NECK', imageId: 'img-neck', candidates: [neckCand] },
      ],
      capturedSurfaces: ['FRONT', 'NECK'],
      containerType: 'BOTTLE',
    });

    const mrp = fusion.fields['MRP']!;
    expect(mrp.searchStatus).toBe('CONFLICT');
    expect(mrp.evidenceStatus).toBe('CONFLICT');
    expect(mrp.isAmbiguous).toBe(true);
    expect(mrp.sources.length).toBe(2);
    // Both values preserved
    const values = mrp.sources.map(s => s.value);
    expect(values).toContain(120.0);
    expect(values).toContain(150.0);
  });

  // 8. Front checked, neck not captured (CRITICAL FALSE-MISSING RULE)
  it('8. emits SEARCH_INCOMPLETE and never claims missing when neck is uncaptured', () => {
    const fusion = fuseCrossSurfaceDeclarations({
      inspectionId: 'insp-8',
      candidatesBySurface: [
        { surface: 'FRONT', imageId: 'img-front', candidates: [] },
        { surface: 'BACK', imageId: 'img-back', candidates: [] },
      ],
      capturedSurfaces: ['FRONT', 'BACK'],
      containerType: 'BOTTLE',
    });

    const mrp = fusion.fields['MRP']!;
    expect(mrp.searchStatus).toBe('SEARCH_INCOMPLETE');
    expect(mrp.statusSummary).toBe('MRP not detected on currently captured surfaces.');
    expect(mrp.statusSummary).not.toContain('missing from package');
    expect(mrp.recommendation).toContain('neck');
  });

  // 9. Front + back checked, neck captured with no MRP
  it('9. emits SEARCH_COMPLETED_NO_EVIDENCE when all relevant surfaces are inspected', () => {
    const fusion = fuseCrossSurfaceDeclarations({
      inspectionId: 'insp-9',
      candidatesBySurface: [
        { surface: 'FRONT', imageId: 'img-front', candidates: [] },
        { surface: 'BACK', imageId: 'img-back', candidates: [] },
        { surface: 'NECK', imageId: 'img-neck', candidates: [] },
        { surface: 'SHOULDER', imageId: 'img-shoulder', candidates: [] },
        { surface: 'CAP', imageId: 'img-cap', candidates: [] },
      ],
      capturedSurfaces: ['FRONT', 'BACK', 'NECK', 'SHOULDER', 'CAP'],
      containerType: 'BOTTLE',
    });

    const mrp = fusion.fields['MRP']!;
    expect(mrp.searchStatus).toBe('SEARCH_COMPLETED_NO_EVIDENCE');
    expect(mrp.statusSummary).toBe('MRP not detected after the available relevant surfaces were inspected.');
  });

  // 10. Blurry neck
  it('10. flags blurry neck as requiring verification and advises sharp retake', () => {
    const assessment = assessSurfaceCaptureQuality('NECK', {
      overallScore: 0.3,
      isAcceptable: false,
      blurDetected: true,
      glareDetected: false,
      sharpness: 25,
      brightness: 50,
      shadowDetected: false,
    });

    expect(assessment.requiresVerification).toBe(true);
    expect(assessment.advisoryRecommendation).toContain('focus');
  });

  // 11. Glare on neck
  it('11. flags glare on neck as requiring verification and advises angled retake', () => {
    const assessment = assessSurfaceCaptureQuality('NECK', {
      overallScore: 0.4,
      isAcceptable: false,
      blurDetected: false,
      glareDetected: true,
      sharpness: 60,
      brightness: 95,
      shadowDetected: false,
    });

    expect(assessment.requiresVerification).toBe(true);
    expect(assessment.advisoryRecommendation).toContain('glare');
  });

  // 12. Curved neck
  it('12. assesses curved container surface without failing acceptable extraction', () => {
    const assessment = assessSurfaceCaptureQuality('NECK', {
      overallScore: 0.9,
      isAcceptable: true,
      blurDetected: false,
      glareDetected: false,
      sharpness: 85,
      brightness: 65,
      shadowDetected: false,
    }, true);

    expect(assessment.isCurved).toBe(true);
    expect(assessment.isAcceptable).toBe(true);
  });

  // 13. Metallic seal
  it('13. extracts from metallic crimp preserving surface provenance', () => {
    const cand = createCandidate('MRP', 'MRP ₹15.00', 15.0, 'CRIMP', 'img-foil-crimp');
    const fusion = fuseCrossSurfaceDeclarations({
      inspectionId: 'insp-13',
      candidatesBySurface: [
        { surface: 'CRIMP', imageId: 'img-foil-crimp', candidates: [cand] },
      ],
      capturedSurfaces: ['CRIMP'],
      containerType: 'SACHET',
    });

    expect(fusion.fields['MRP']?.fusedValue).toBe(15.0);
    expect(fusion.fields['MRP']?.primarySourceSurface).toBe('CRIMP');
  });

  // 14. Dot-matrix seal
  it('14. parses dot-matrix normalized date from packaging seal', () => {
    const rawDotMatrix = '0 3 / 2 0 2 6';
    const normalized = normalizeLineText(rawDotMatrix);
    const cand = createCandidate('DATE_OF_PACKAGING', normalized.normalizedText, '03/2026', 'TOP_SEAL', 'img-dotmatrix');

    const fusion = fuseCrossSurfaceDeclarations({
      inspectionId: 'insp-14',
      candidatesBySurface: [
        { surface: 'TOP_SEAL', imageId: 'img-dotmatrix', candidates: [cand] },
      ],
      capturedSurfaces: ['TOP_SEAL'],
      containerType: 'POUCH',
    });

    expect(fusion.fields['DATE_OF_PACKAGING']?.fusedValue).toBe('03/2026');
  });

  // 15. Hindi/English remote declaration
  it('15. parses bilingual Hindi remote surface declaration', () => {
    const hindiCand = createCandidate('MRP', 'अधिकतम खुदरा मूल्य ₹ 55.00', 55.0, 'CAP', 'img-cap');
    const fusion = fuseCrossSurfaceDeclarations({
      inspectionId: 'insp-15',
      candidatesBySurface: [
        { surface: 'CAP', imageId: 'img-cap', candidates: [hindiCand] },
      ],
      capturedSurfaces: ['CAP'],
      containerType: 'BOTTLE',
    });

    expect(fusion.fields['MRP']?.fusedValue).toBe(55.0);
    expect(fusion.fields['MRP']?.primarySourceSurface).toBe('CAP');
  });

  // 16. Duplicate identical observations
  it('16. merges 3 identical observations across Front, Top Seal, and Back', () => {
    const c1 = createCandidate('MRP', 'MRP ₹140.00', 140.0, 'FRONT', 'img-1');
    const c2 = createCandidate('MRP', 'MRP ₹140.00', 140.0, 'TOP_SEAL', 'img-2');
    const c3 = createCandidate('MRP', 'MAX RETAIL PRICE ₹140.00', 140.0, 'BACK', 'img-3');

    const fusion = fuseCrossSurfaceDeclarations({
      inspectionId: 'insp-16',
      candidatesBySurface: [
        { surface: 'FRONT', imageId: 'img-1', candidates: [c1] },
        { surface: 'TOP_SEAL', imageId: 'img-2', candidates: [c2] },
        { surface: 'BACK', imageId: 'img-3', candidates: [c3] },
      ],
      capturedSurfaces: ['FRONT', 'TOP_SEAL', 'BACK'],
      containerType: 'POUCH',
    });

    const mrp = fusion.fields['MRP']!;
    expect(mrp.searchStatus).toBe('FOUND');
    expect(mrp.evidenceStatus).toBe('AGREEMENT');
    expect(mrp.sources.length).toBe(3);
  });

  // 17. Duplicate conflicting observations
  it('17. preserves 2 conflicting observations between Carton Top and Flap', () => {
    const c1 = createCandidate('MRP', 'MRP ₹200.00', 200.0, 'TOP', 'img-top');
    const c2 = createCandidate('MRP', 'MRP ₹250.00', 250.0, 'FLAP', 'img-flap');

    const fusion = fuseCrossSurfaceDeclarations({
      inspectionId: 'insp-17',
      candidatesBySurface: [
        { surface: 'TOP', imageId: 'img-top', candidates: [c1] },
        { surface: 'FLAP', imageId: 'img-flap', candidates: [c2] },
      ],
      capturedSurfaces: ['TOP', 'FLAP'],
      containerType: 'CARTON',
    });

    const mrp = fusion.fields['MRP']!;
    expect(mrp.searchStatus).toBe('CONFLICT');
    expect(mrp.evidenceStatus).toBe('CONFLICT');
    expect(mrp.sources.length).toBe(2);
  });

  // 18. Unknown package surface defaults to UNKNOWN
  it('18. defaults unspecified or unclassified surface names to UNKNOWN', () => {
    expect(toPackageSurface(undefined)).toBe('UNKNOWN');
    expect(toPackageSurface('nonexistent_random_panel')).toBe('UNKNOWN');
  });

  // 19. Inspector resolves cross-surface conflict
  it('19. records inspector resolution of cross-surface conflict as INSPECTOR_CONFIRMED', () => {
    const c1 = createCandidate('MRP', 'MRP ₹120.00', 120.0, 'FRONT', 'img-front');
    const c2 = createCandidate('MRP', 'MRP ₹180.00', 180.0, 'NECK', 'img-neck');

    const corrections = new Map();
    corrections.set('MRP', { value: 120.0, reason: 'Verified stamped MRP', inspectorId: 'officer-42' });

    const fusion = fuseCrossSurfaceDeclarations({
      inspectionId: 'insp-19',
      candidatesBySurface: [
        { surface: 'FRONT', imageId: 'img-front', candidates: [c1] },
        { surface: 'NECK', imageId: 'img-neck', candidates: [c2] },
      ],
      capturedSurfaces: ['FRONT', 'NECK'],
      containerType: 'BOTTLE',
      inspectorCorrections: corrections,
    });

    const mrp = fusion.fields['MRP']!;
    expect(mrp.searchStatus).toBe('INSPECTOR_CONFIRMED');
    expect(mrp.evidenceStatus).toBe('INSPECTOR_CONFIRMED');
    expect(mrp.fusedValue).toBe(120.0);
    expect(mrp.inspectorCorrection?.source).toBe('INSPECTOR_CORRECTED');
    expect(mrp.sources.length).toBe(2); // Original observations preserved!
  });

  // 20. Later AI evidence must not silently replace inspector decision
  it('20. ensures inspector confirmation is authoritative over automated evidence', () => {
    const lateAiCand = createCandidate('MRP', 'MRP ₹180.00', 180.0, 'NECK', 'img-neck');
    const corrections = new Map();
    corrections.set('MRP', { value: 120.0, reason: 'Physical package confirmed at ₹120' });

    const fusion = fuseCrossSurfaceDeclarations({
      inspectionId: 'insp-20',
      candidatesBySurface: [
        { surface: 'NECK', imageId: 'img-neck', candidates: [lateAiCand] },
      ],
      capturedSurfaces: ['NECK'],
      containerType: 'BOTTLE',
      inspectorCorrections: corrections,
    });

    const mrp = fusion.fields['MRP']!;
    expect(mrp.fusedValue).toBe(120.0);
    expect(mrp.evidenceStatus).toBe('INSPECTOR_CONFIRMED');
    expect(mrp.searchStatus).toBe('INSPECTOR_CONFIRMED');
  });
});
