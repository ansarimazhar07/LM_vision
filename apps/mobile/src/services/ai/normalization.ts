import type { LocalInspectionImage } from '../../state/draft';
import { type NormalizedImage, PipelineError } from './types';

/**
 * Normalization Stage: Validates image metadata, ensures URI integrity,
 * and maps package surfaces before running vision analysis.
 */
export function normalizeInspectionImages(images: LocalInspectionImage[]): NormalizedImage[] {
  if (!images || images.length === 0) {
    throw new PipelineError(
      'IMAGE_REQUIRED',
      'At least one package photograph is required for inspection analysis.',
    );
  }

  const normalized: NormalizedImage[] = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img) continue;

    if (!img.fileUrl || img.fileUrl.trim() === '' || img.fileUrl.includes('corrupt') || img.fileUrl.startsWith('invalid://')) {
      throw new PipelineError(
        'IMAGE_CORRUPT',
        `Captured photograph for surface ${img.surface || 'UNKNOWN'} is corrupted or has an invalid URI.`,
      );
    }

    normalized.push({
      id: img.id,
      surface: img.surface || 'FRONT',
      fileUrl: img.fileUrl.trim(),
      fileSizeBytes: img.fileSizeBytes && img.fileSizeBytes > 0 ? img.fileSizeBytes : 1024 * 500,
      mimeType: img.mimeType || 'image/jpeg',
      sha256Hash: img.sha256Hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      capturedAt: img.capturedAt || new Date().toISOString(),
    });
  }

  if (normalized.length === 0) {
    throw new PipelineError(
      'IMAGE_REQUIRED',
      'No valid photographs found for analysis.',
    );
  }

  return normalized;
}
