/**
 * On-Device Perception Pipeline (Phase 10)
 *
 * Coordinates quality assessment, OCR, geometry, declaration extraction,
 * and normalization into a canonical PackageAnalysis.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. 100% Offline: Zero HTTP / fetch / network requests.
 * 2. Emits canonical PackageAnalysis validated against PackageAnalysisSchema.
 * 3. Never produces legal verdicts.
 */

import type {
  Declaration,
  ImageInputPayload,
  ImageQuality,
  PackageAnalysis,
  PackageAnalysisInput,
  TextRegion,
  VisualMeasurement,
} from '@lm-vision/shared-types';
import { PackageAnalysisSchema } from '@lm-vision/shared-types';
import { assessImageQuality } from './quality/qualityAnalyzer.js';
import { extractMultiImageText } from './ocr/ocrEngine.js';
import { computeLocalGeometry } from './cv/cvGeometry.js';
import {
  type DerivedTransformMetadata,
  mapDerivedBoxToOriginal,
} from './cv/perspectiveTransform.js';
import { extractDeclarationCandidates } from './extraction/declarationExtractor.js';
import { normalizeDeclarations } from './normalization/normalizer.js';
import {
  defaultDetectorRegistry,
  associateLabelsWithValues,
  normalizeLineText,
  type StructuredDeclarationCandidate,
} from './intelligence/index.js';
import { runFieldAwareConsensus } from './extraction/fieldAwareConsensus.js';
import {
  fuseCrossSurfaceDeclarations,
  normalizeContainerType,
  toPackageSurface,
} from './surfaces/index.js';



const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const idToUuidMap = new Map<string, string>();

function ensureCanonicalUuid(id?: string): string {
  if (id && UUID_REGEX.test(id)) {
    return id;
  }
  const key = id || 'default';
  if (!idToUuidMap.has(key)) {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    idToUuidMap.set(key, uuid);
  }
  return idToUuidMap.get(key)!;
}

export async function runLocalPerceptionPipeline(input: PackageAnalysisInput): Promise<PackageAnalysis> {
  const startTime = Date.now();

  if (!input.images || input.images.length === 0) {
    throw new Error('At least one package image is required for local perception.');
  }

  // Sanitize image payloads to guarantee valid UUID imageId
  const sanitizedImages: ImageInputPayload[] = input.images.map((img) => ({
    ...img,
    imageId: ensureCanonicalUuid(img.imageId),
  }));

  // 1. Image Quality Assessment
  const qualityAssessments: ImageQuality[] = sanitizedImages.map((img: ImageInputPayload) =>
    assessImageQuality({
      imageId: img.imageId,
      base64Data: img.base64Data,
      fileUrl: img.fileUrl,
      fileSizeBytes: (img as any).fileSizeBytes,
      width: (img as any).width,
      height: (img as any).height,
      mimeType: img.mimeType,
      surface: img.surface,
    })
  );

  // Aggregate quality (worst-case overall score)
  const lowestOverallScore = Math.min(...qualityAssessments.map(q => q.overallScore));
  const combinedWarnings = Array.from(new Set(qualityAssessments.flatMap(q => q.warnings)));
  const primaryQuality: ImageQuality = {
    overallScore: lowestOverallScore,
    isAcceptable: qualityAssessments.every(q => q.isAcceptable),
    sharpness: Math.round(qualityAssessments.reduce((sum, q) => sum + q.sharpness, 0) / qualityAssessments.length),
    brightness: Math.round(qualityAssessments.reduce((sum, q) => sum + q.brightness, 0) / qualityAssessments.length),
    glareDetected: qualityAssessments.some(q => q.glareDetected),
    blurDetected: qualityAssessments.some(q => q.blurDetected),
    shadowDetected: qualityAssessments.some(q => q.shadowDetected),
    warnings: combinedWarnings,
  };

  // 2. On-Device OCR Text Extraction across surfaces
  const ocrResults = await extractMultiImageText(sanitizedImages);
  const allRegions: TextRegion[] = ocrResults.flatMap((r) =>
    r.regions.map((reg) => {
      const canonicalImageId = ensureCanonicalUuid(reg.imageId);
      // If the source image had a derived transformation (perspective or crop),
      // re-map coordinates back to original image space [0.0, 1.0]
      const matchingImg = sanitizedImages.find((img) => img.imageId === canonicalImageId);
      const meta: DerivedTransformMetadata | undefined = (matchingImg as any)?.transformMetadata;
      const boxCoords = meta
        ? mapDerivedBoxToOriginal(
            {
              xMin: reg.boundingBox.xMin,
              yMin: reg.boundingBox.yMin,
              xMax: reg.boundingBox.xMax,
              yMax: reg.boundingBox.yMax,
            },
            meta
          )
        : reg.boundingBox;

      const originalBoundingBox = {
        ...boxCoords,
        unit: 'NORMALIZED' as const,
        width: Number(Math.max(0, boxCoords.xMax - boxCoords.xMin).toFixed(4)),
        height: Number(Math.max(0, boxCoords.yMax - boxCoords.yMin).toFixed(4)),
      };

      return {
        ...reg,
        imageId: canonicalImageId,
        boundingBox: originalBoundingBox,
      };
    })
  );


  // 3. Local CV Geometry & Visual Measurements
  const allMeasurements: VisualMeasurement[] = [];
  for (const img of sanitizedImages) {
    const surfaceRegions = allRegions.filter((r) => r.imageId === img.imageId);
    const cvResult = computeLocalGeometry(img, surfaceRegions);
    allMeasurements.push(...cvResult.measurements);
  }

  // 4. Phase C: Conservative OCR Normalization & Spatial Reasoning
  const normStart = Date.now();
  const normalizedRegions = allRegions.map((reg) => {
    const lineNorm = normalizeLineText(reg.text);
    return {
      ...reg,
      text: lineNorm.normalizedText,
      originalText: reg.text,
    };
  });
  const ocrNormalizationTimeMs = Date.now() - normStart;

  const spatialStart = Date.now();
  const spatialAssociations = associateLabelsWithValues(normalizedRegions);
  const spatialReasoningTimeMs = Date.now() - spatialStart;

  // 5. Phase C: Modular Declaration Detection across surfaces
  const extractStart = Date.now();
  const perImageCandidates: Array<{ passName: string; candidates: StructuredDeclarationCandidate[] }> = [];
  for (const img of sanitizedImages) {
    const imgRegions = normalizedRegions.filter((r) => r.imageId === img.imageId);
    const candidates = defaultDetectorRegistry.detectAll({
      regions: imgRegions,
      imageId: img.imageId,
      passName: img.surface || 'STANDARD',
    });
    // Attach surface provenance to candidates
    const surfaceType = toPackageSurface(img.surface || 'UNKNOWN');
    for (const cand of candidates) {
      cand.surface = surfaceType;
      cand.surfaceType = surfaceType;
      cand.traceability.surface = surfaceType;
      cand.traceability.surfaceType = surfaceType;
      cand.traceability.originalImageId = img.imageId;
    }
    perImageCandidates.push({ passName: img.surface || 'STANDARD', candidates });
  }
  const candidateExtractionTimeMs = Date.now() - extractStart;

  // 6. Multi-Pass OCR Consensus (Field-Aware)
  const consensusStart = Date.now();
  const structuredCandidates = runFieldAwareConsensus(perImageCandidates);
  const consensusTimeMs = Date.now() - consensusStart;
  const totalPhaseCTimeMs = ocrNormalizationTimeMs + spatialReasoningTimeMs + candidateExtractionTimeMs + consensusTimeMs;

  // 6b. Cross-Surface Dispersed Declaration Fusion & Search State Engine
  const crossSurfacePackage = fuseCrossSurfaceDeclarations({
    inspectionId: ensureCanonicalUuid(input.inspectionId),
    candidatesBySurface: perImageCandidates.map((pic) => {
      const matchImg = sanitizedImages.find((si) => (si.surface || 'STANDARD') === pic.passName);
      return {
        surface: toPackageSurface(matchImg?.surface || 'UNKNOWN'),
        imageId: matchImg?.imageId || '',
        candidates: pic.candidates,
      };
    }),
    capturedSurfaces: sanitizedImages.map((si) => toPackageSurface(si.surface || 'UNKNOWN')),
    containerType: normalizeContainerType(input.packagingTypeHint),
  });

  // 7. Map Structured Evidence Candidates to canonical Declaration records
  const phaseCDeclarations: Declaration[] = structuredCandidates.map((cand) => {
    const surface = cand.surface || cand.sourceRegion?.surface || 'UNKNOWN';
    const fieldFusion = crossSurfacePackage.fields[cand.fieldType];
    return {
      type: cand.fieldType,
      rawText: cand.originalOCRText,
      normalizedValue: cand.normalizedValue,
      unit: cand.unit,
      confidence:
        cand.nativeConfidence ??
        (cand.confidenceTier === 'HIGH_CONFIDENCE'
          ? 0.95
          : cand.confidenceTier === 'MEDIUM_CONFIDENCE'
          ? 0.75
          : 0.50),
      region: cand.sourceRegion
        ? {
            ...cand.sourceRegion,
            imageId: ensureCanonicalUuid(cand.sourceRegion.imageId),
            surface: toPackageSurface(cand.sourceRegion.surface || surface),
            surfaceType: toPackageSurface(cand.sourceRegion.surface || surface),
          }
        : undefined,
      surface: toPackageSurface(surface),
      surfaceType: toPackageSurface(surface),
      evidenceStatus: fieldFusion?.evidenceStatus || (cand.confidenceTier === 'CONFLICT' ? 'CONFLICT' : 'FOUND'),
      sources: fieldFusion?.sources || cand.supportingObservations,
      isFormatStandard: cand.traceability.validationStatus === 'VALID',
      detectedLanguage: /[\u0900-\u097F]/.test(cand.originalOCRText) ? 'hi' : 'en',
    };
  });

  // Fallback candidate extraction for generic/supplemental fields (e.g. GENERIC_NAME)
  const legacyCandidates = extractDeclarationCandidates(allRegions);
  for (const legacy of legacyCandidates) {
    if (!phaseCDeclarations.some((d) => d.type === legacy.type)) {
      phaseCDeclarations.push(legacy);
    }
  }

  // Final deterministic normalization
  const normalizedDeclarations: Declaration[] = normalizeDeclarations(phaseCDeclarations).map((d) => ({
    ...d,
    region: d.region ? { ...d.region, imageId: ensureCanonicalUuid(d.region.imageId) } : undefined,
  }));

  // 8. Build and validate canonical PackageAnalysis
  const rawAnalysis = {
    provider: 'LOCAL_OCR' as const,
    modelName: 'ondevice-ocr-cv-v1',
    quality: primaryQuality,
    declarations: normalizedDeclarations,
    textRegions: allRegions,
    visualMeasurements: allMeasurements,
    rawResponse: {
      phase: 'PHASE_C_OCR_INTELLIGENCE',
      evidenceGuaranteedImmutable: true,
      coordinateSpace: 'ORIGINAL_NORMALIZED_0_TO_1',
      totalSurfacesAnalyzed: sanitizedImages.length,
      crossSurface: crossSurfacePackage,
      phaseC: {
        totalStructuredCandidates: structuredCandidates.length,
        structuredCandidates,
        spatialAssociationsCount: spatialAssociations.length,
        performanceMetrics: {
          ocrNormalizationTimeMs,
          candidateExtractionTimeMs,
          spatialReasoningTimeMs,
          consensusTimeMs,
          totalPhaseCTimeMs,
        },
      },
    },
    latencyMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };

  return PackageAnalysisSchema.parse(rawAnalysis);
}
