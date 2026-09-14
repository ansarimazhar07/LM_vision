/**
 * Surface-Specific Quality & Adverse Condition Handler
 *
 * Evaluates physical surface-specific photographic quality (glare on foil/neck,
 * curvature on cylindrical bottles, dot-matrix stamps, crimped seams) to guard
 * against false declaration absences caused by poor capture quality.
 *
 * ARCHITECTURAL INVARIANT:
 * Suboptimal image quality on a remote surface (glare, blur, curvature) must trigger
 * REQUIRES_VERIFICATION and an advisory retake recommendation; it must NEVER be
 * interpreted as statutory declaration absence.
 */

import type { ImageQuality, PackageSurface } from '@lm-vision/shared-types';

export interface SurfaceQualityAssessment {
  surface: PackageSurface;
  isAcceptable: boolean;
  requiresVerification: boolean;
  glareDetected: boolean;
  blurDetected: boolean;
  isCurved: boolean;
  statusReason?: string;
  advisoryRecommendation?: string;
}

/**
 * Assesses quality for a specific physical package surface capture.
 */
export function assessSurfaceCaptureQuality(
  surface: PackageSurface,
  quality?: ImageQuality,
  isCurvedContainer: boolean = false
): SurfaceQualityAssessment {
  const glare = quality?.glareDetected ?? false;
  const blur = quality?.blurDetected ?? false;
  const acceptable = quality?.isAcceptable ?? true;

  if (glare) {
    return {
      surface,
      isAcceptable: false,
      requiresVerification: true,
      glareDetected: true,
      blurDetected: blur,
      isCurved: isCurvedContainer,
      statusReason: `Specular glare detected on ${surface} surface.`,
      advisoryRecommendation: `Retake ${surface.toLowerCase()} image with reduced glare by angling the camera away from direct reflection.`,
    };
  }

  if (blur || !acceptable) {
    return {
      surface,
      isAcceptable: false,
      requiresVerification: true,
      glareDetected: false,
      blurDetected: true,
      isCurved: isCurvedContainer,
      statusReason: `Focus sharpness on ${surface} is insufficient for reliable fine-print extraction.`,
      advisoryRecommendation: `Hold camera steady and retake ${surface.toLowerCase()} image in focus.`,
    };
  }

  return {
    surface,
    isAcceptable: true,
    requiresVerification: false,
    glareDetected: false,
    blurDetected: false,
    isCurved: isCurvedContainer,
  };
}
