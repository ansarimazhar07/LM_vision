/**
 * Mobile On-Device Perception Bridge (Phase 10)
 *
 * Bridges LocalInspectionImage records into @lm-vision/perception,
 * executing 100% on-device image quality assessment, OCR, geometry, and
 * candidate declaration extraction.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Zero network requests: Operates completely offline in airplane mode.
 * 2. Does NOT import server-side AI SDKs or remote dependencies.
 * 3. Never produces legal verdicts; emits canonical PackageAnalysis.
 */

import type {
  ImageInputPayload,
  PackageAnalysis,
  PackageAnalysisInput,
} from '@lm-vision/shared-types';
import { runLocalPerceptionPipeline } from '@lm-vision/perception';
import type { LocalInspectionImage } from '../../state/draft';
import type { PipelineOptions } from './types';

export async function executeLocalPerception(
  images: LocalInspectionImage[],
  inspectionId: string,
  options?: PipelineOptions
): Promise<PackageAnalysis> {
  options?.onProgress?.({
    stage: 'NORMALIZING_IMAGES',
    label: 'Preparing package images for on-device perception...',
    progressPercent: 10,
  });

  if (!images || images.length === 0) {
    throw new Error('At least one package image is required for local perception.');
  }

  // Convert LocalInspectionImage to ImageInputPayload
  const inputImages: ImageInputPayload[] = images.map((img) => ({
    imageId: img.id,
    surface: img.surface,
    mimeType: img.mimeType || 'image/jpeg',
    fileUrl: img.fileUrl,
    base64Data: img.base64Data,
    isRealCapture: true,
  } as any));

  options?.onProgress?.({
    stage: 'ASSESSING_QUALITY',
    label: 'Assessing local image resolution, contrast, and sharpness...',
    progressPercent: 30,
  });

  options?.onProgress?.({
    stage: 'EXTRACTING_OCR',
    label: 'Running on-device OCR and detecting text regions...',
    progressPercent: 50,
  });

  options?.onProgress?.({
    stage: 'EXTRACTING_DECLARATIONS',
    label: 'Scanning candidate declarations (MRP, Net Qty, Dates, Mfr)...',
    progressPercent: 70,
  });

  options?.onProgress?.({
    stage: 'MEASURING_GEOMETRY',
    label: 'Estimating panel geometry and typography height...',
    progressPercent: 85,
  });

  const analysisInput: PackageAnalysisInput = {
    inspectionId,
    images: inputImages,
    options: {
      detectBlur: true,
      measureFontHeight: true,
      extractFullText: true,
      languageCodes: ['en', 'hi'],
    },
  };

  const analysis = await runLocalPerceptionPipeline(analysisInput);

  return analysis;
}
