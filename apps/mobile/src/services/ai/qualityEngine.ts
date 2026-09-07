import type { ImageQuality } from '@lm-vision/shared-types';
import { type NormalizedImage, PipelineError } from './types';

/**
 * Mock Quality Engine: Deterministic assessment of sharpness, glare,
 * blur, and statutory legibility of captured photographs.
 */
export function assessImageQuality(
  images: NormalizedImage[],
  simulateFailure: boolean = false,
): ImageQuality {
  if (simulateFailure) {
    throw new PipelineError(
      'QUALITY_REJECTED',
      'Image quality rejected: excessive blur or glare makes statutory declarations illegible.',
    );
  }

  for (const img of images) {
    if (img.fileUrl.includes('blurry') || img.fileUrl.includes('rejected')) {
      throw new PipelineError(
        'QUALITY_REJECTED',
        `Surface ${img.surface} photo rejected: focus sharpness is below minimum legal threshold.`,
      );
    }
  }

  return {
    overallScore: 0.94,
    isAcceptable: true,
    sharpness: 92,
    brightness: 88,
    glareDetected: false,
    blurDetected: false,
    shadowDetected: false,
    estimatedDpi: 300,
    warnings: [],
  };
}
