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
import { extractDeclarationCandidates } from './extraction/declarationExtractor.js';
import { normalizeDeclarations } from './normalization/normalizer.js';

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
  const allRegions: TextRegion[] = ocrResults.flatMap(r =>
    r.regions.map(reg => ({
      ...reg,
      imageId: ensureCanonicalUuid(reg.imageId),
    }))
  );

  // 3. Local CV Geometry & Visual Measurements
  const allMeasurements: VisualMeasurement[] = [];
  for (const img of sanitizedImages) {
    const surfaceRegions = allRegions.filter(r => r.imageId === img.imageId);
    const cvResult = computeLocalGeometry(img, surfaceRegions);
    allMeasurements.push(...cvResult.measurements);
  }

  // 4. Declaration Candidate Extraction
  const rawCandidates = extractDeclarationCandidates(allRegions);

  // 5. Deterministic Normalization
  const normalizedDeclarations: Declaration[] = normalizeDeclarations(rawCandidates).map(d => ({
    ...d,
    region: d.region ? { ...d.region, imageId: ensureCanonicalUuid(d.region.imageId) } : undefined,
  }));

  // 6. Build and validate canonical PackageAnalysis
  const rawAnalysis = {
    provider: 'LOCAL_OCR' as const,
    modelName: 'ondevice-ocr-cv-v1',
    quality: primaryQuality,
    declarations: normalizedDeclarations,
    textRegions: allRegions,
    visualMeasurements: allMeasurements,
    latencyMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };

  return PackageAnalysisSchema.parse(rawAnalysis);
}
