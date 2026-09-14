/**
 * Deterministic Surface Recommendation & Camera Guidance Engine
 *
 * Evaluates unresolved declaration fields, container priors, and captured surfaces
 * to generate ranked, non-blocking advisory capture recommendations.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Strictly advisory: Recommendations guide human capture; automated capture is prohibited.
 * 2. Does not assume presence: Never claims a declaration is guaranteed to be on a recommended surface.
 * 3. Surface-aware guidance: Provides specific, actionable camera framing tips per surface type.
 */

import type { DeclarationType, PackageSurface } from '@lm-vision/shared-types';
import {
  getAdvisoryRelevantSurfaces,
  type PackagingContainerType,
} from './surfaceTaxonomy.js';

export interface SurfaceQualityInfo {
  glareDetected?: boolean;
  blurDetected?: boolean;
  isAcceptable?: boolean;
}

export interface SurfaceRecommendationInput {
  unresolvedFields: DeclarationType[];
  containerType: PackagingContainerType;
  capturedSurfaces: PackageSurface[];
  surfaceQualityMap?: Map<PackageSurface, SurfaceQualityInfo>;
}

export interface AdvisorySurfaceRecommendation {
  id: string;
  targetSurface: PackageSurface;
  targetField: DeclarationType;
  advisoryGuidance: string;
  cameraGuidance: string;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  isAdvisory: true;
}

/**
 * Returns deterministic camera guidance text tailored to specific physical surfaces.
 */
export function getCameraGuidanceForSurface(surface: PackageSurface): string {
  switch (surface) {
    case 'NECK':
      return 'Capture the bottle neck in focus.';
    case 'TOP_SEAL':
      return 'Capture the complete top crimp/seal.';
    case 'BOTTOM_SEAL':
      return 'Capture the bottom crimp/seal clearly.';
    case 'BOTTOM':
      return 'Capture the bottom marking without glare.';
    case 'CAP':
      return 'Capture the printed or stamped area clearly.';
    case 'SHOULDER':
      return 'Capture the bottle shoulder clearly.';
    case 'CRIMP':
      return 'Capture the sealed/crimped edge without glare.';
    case 'FLAP':
      return 'Capture the carton flap in focus.';
    case 'LID':
      return 'Capture the lid surface clearly.';
    case 'EDGE':
      return 'Capture the package edge clearly.';
    case 'FRONT':
      return 'Capture the front display panel straight on.';
    case 'BACK':
      return 'Capture the back declaration panel in good light.';
    default:
      return 'Capture the package surface clearly in focus without glare.';
  }
}

/**
 * Generates ranked advisory capture recommendations for unresolved fields.
 */
export function generateSurfaceRecommendations(
  input: SurfaceRecommendationInput
): AdvisorySurfaceRecommendation[] {
  const recommendations: AdvisorySurfaceRecommendation[] = [];
  const capturedSet = new Set<PackageSurface>(input.capturedSurfaces);

  // 1. Check for captured surfaces with severe glare or blur that should be retaken
  if (input.surfaceQualityMap) {
    for (const [surface, quality] of input.surfaceQualityMap.entries()) {
      if (quality.glareDetected) {
        recommendations.push({
          id: `rec-retake-glare-${surface}`,
          targetSurface: surface,
          targetField: input.unresolvedFields[0] || 'MRP',
          advisoryGuidance: `Retake ${surface} image with reduced glare to inspect fine print.`,
          cameraGuidance: `Angle camera away from direct reflection when capturing ${surface}.`,
          reason: `Specular glare detected on ${surface} image.`,
          priority: 'HIGH',
          isAdvisory: true,
        });
      } else if (quality.blurDetected || quality.isAcceptable === false) {
        recommendations.push({
          id: `rec-retake-blur-${surface}`,
          targetSurface: surface,
          targetField: input.unresolvedFields[0] || 'MRP',
          advisoryGuidance: `Hold device steady and retake ${surface} image in sharp focus.`,
          cameraGuidance: `Tap screen to focus on numbers on ${surface}.`,
          reason: `Image sharpness on ${surface} is insufficient for reliable extraction.`,
          priority: 'HIGH',
          isAdvisory: true,
        });
      }
    }
  }

  // 2. Identify uncaptured relevant surfaces for unresolved fields
  const seenSurfaceFieldPairs = new Set<string>();

  for (const field of input.unresolvedFields) {
    const relevantSurfaces = getAdvisoryRelevantSurfaces(field, input.containerType);
    const uncaptured = relevantSurfaces.filter((s) => !capturedSet.has(s));

    for (const targetSurface of uncaptured) {
      const pairKey = `${targetSurface}_${field}`;
      if (seenSurfaceFieldPairs.has(pairKey)) continue;
      seenSurfaceFieldPairs.add(pairKey);

      const fieldLabel = field.replace(/_/g, ' ');
      const cameraGuidance = getCameraGuidanceForSurface(targetSurface);

      const isHighPriority =
        (field === 'MRP' || field === 'DATE_OF_PACKAGING' || field === 'DATE_OF_MANUFACTURE') &&
        (targetSurface === 'NECK' || targetSurface === 'TOP_SEAL' || targetSurface === 'CRIMP' || targetSurface === 'CAP');

      recommendations.push({
        id: `rec-${field.toLowerCase()}-${targetSurface.toLowerCase()}`,
        targetSurface,
        targetField: field,
        advisoryGuidance: `Check ${targetSurface.replace(/_/g, ' ').toLowerCase()} for additional ${fieldLabel} marking.`,
        cameraGuidance,
        reason: `${fieldLabel} not detected on currently captured surfaces.`,
        priority: isHighPriority ? 'HIGH' : 'MEDIUM',
        isAdvisory: true,
      });
    }
  }

  return recommendations;
}
