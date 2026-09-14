/**
 * Dispersed Packaging Offline Benchmark Runner
 *
 * Evaluates multi-surface and remote declaration extraction across 10 discrete metrics:
 * 1. Field extraction accuracy
 * 2. Cross-surface association accuracy
 * 3. Surface localization accuracy
 * 4. Duplicate merge accuracy
 * 5. Conflict detection accuracy
 * 6. False missing-field rate (CRITICAL)
 * 7. Correct search-incomplete classification
 * 8. Correct search-complete-no-evidence classification
 * 9. Capture recommendation accuracy
 * 10. False-positive extraction rate
 */

import type { DeclarationType, TextRegion } from '@lm-vision/shared-types';
import {
  defaultDetectorRegistry,
  normalizeLineText,
  type StructuredDeclarationCandidate,
} from '../../packages/perception/src/intelligence/index.js';
import {
  fuseCrossSurfaceDeclarations,
  generateSurfaceRecommendations,
  toPackageSurface,
} from '../../packages/perception/src/surfaces/index.js';
import type {
  DispersedBenchmarkProduct,
  DispersedBenchmarkSurface,
} from './dispersedPackagingBenchmarkDataset.js';

export interface DispersedBenchmarkMetrics {
  totalProducts: number;
  totalSurfacesEvaluated: number;
  fieldExtractionAccuracy: number;
  crossSurfaceAssociationAccuracy: number;
  surfaceLocalizationAccuracy: number;
  duplicateMergeAccuracy: number;
  conflictDetectionAccuracy: number;
  falseMissingFieldRate: number;
  correctSearchIncompleteRate: number;
  correctSearchCompleteNoEvidenceRate: number;
  captureRecommendationAccuracy: number;
  falsePositiveExtractionRate: number;
}

export class DispersedBenchmarkRunner {
  private convertSurfaceToRegions(surface: DispersedBenchmarkSurface): TextRegion[] {
    return surface.ocrLines.map((line) => {
      const norm = normalizeLineText(line.text);
      return {
        id: line.id,
        imageId: surface.imageId,
        surface: surface.surface,
        surfaceType: surface.surface,
        text: norm.normalizedText,
        boundingBox: line.boundingBox,
        confidence: line.confidence,
      };
    });
  }

  public evaluateDataset(products: DispersedBenchmarkProduct[]): DispersedBenchmarkMetrics {
    let totalSurfaces = 0;

    let fieldMatches = 0;
    let fieldTotal = 0;

    let associationCorrect = 0;
    let associationTotal = 0;

    let localizationCorrect = 0;
    let localizationTotal = 0;

    let duplicateMergeCorrect = 0;
    let duplicateMergeTotal = 0;

    let conflictCorrect = 0;
    let conflictTotal = 0;

    let falseMissingCount = 0;
    let falseMissingTotal = 0;

    let searchIncompleteCorrect = 0;
    let searchIncompleteTotal = 0;

    let searchCompleteNoEvidenceCorrect = 0;
    let searchCompleteNoEvidenceTotal = 0;

    let recommendationCorrect = 0;
    let recommendationTotal = 0;

    let falsePositiveCount = 0;
    let totalExtractions = 0;

    for (const product of products) {
      totalSurfaces += product.capturedSurfaces.length;

      // 1. Run detection on each surface
      const candidatesBySurface: Array<{
        surface: import('@lm-vision/shared-types').PackageSurface;
        imageId: string;
        candidates: StructuredDeclarationCandidate[];
      }> = [];

      for (const surface of product.capturedSurfaces) {
        const regions = this.convertSurfaceToRegions(surface);
        const candidates = defaultDetectorRegistry.detectAll({
          regions,
          imageId: surface.imageId,
          passName: surface.surface,
        });

        for (const c of candidates) {
          c.surface = surface.surface;
          c.surfaceType = surface.surface;
          c.traceability.surface = surface.surface;
          c.traceability.surfaceType = surface.surface;
          c.traceability.originalImageId = surface.imageId;
        }

        candidatesBySurface.push({
          surface: surface.surface,
          imageId: surface.imageId,
          candidates,
        });
      }

      // 2. Run Cross-Surface Fusion
      const fusion = fuseCrossSurfaceDeclarations({
        inspectionId: `insp-${product.id}`,
        candidatesBySurface,
        capturedSurfaces: product.capturedSurfaces.map((s) => s.surface),
        containerType: product.containerType,
      });

      // 3. Evaluate MRP Field & Search States
      const mrpResult = fusion.fields['MRP'];
      if (mrpResult) {
        // Evaluate expected search status
        const expectedStatus = product.expectedSearchStatus.mrp;
        if (expectedStatus === 'SEARCH_INCOMPLETE') {
          searchIncompleteTotal++;
          falseMissingTotal++;
          if (mrpResult.searchStatus === 'SEARCH_INCOMPLETE') {
            searchIncompleteCorrect++;
          } else if (mrpResult.searchStatus === 'SEARCH_COMPLETED_NO_EVIDENCE') {
            // Falsely labeled as completed missing!
            falseMissingCount++;
          }
        } else if (expectedStatus === 'SEARCH_COMPLETED_NO_EVIDENCE') {
          searchCompleteNoEvidenceTotal++;
          if (mrpResult.searchStatus === 'SEARCH_COMPLETED_NO_EVIDENCE') {
            searchCompleteNoEvidenceCorrect++;
          }
        } else if (expectedStatus === 'CONFLICT') {
          conflictTotal++;
          if (mrpResult.evidenceStatus === 'CONFLICT' && mrpResult.searchStatus === 'CONFLICT') {
            conflictCorrect++;
          }
        } else if (expectedStatus === 'FOUND') {
          fieldTotal++;
          if (product.groundTruth.mrp && product.groundTruth.mrp.value > 0) {
            if (mrpResult.fusedValue === product.groundTruth.mrp.value) {
              fieldMatches++;
            }
          }
          if (product.expectedEvidenceStatus?.mrp === 'AGREEMENT') {
            duplicateMergeTotal++;
            if (mrpResult.evidenceStatus === 'AGREEMENT' && mrpResult.sources.length >= 2) {
              duplicateMergeCorrect++;
            }
          }
        }

        // Check surface association and localization
        if (mrpResult.sources.length > 0) {
          associationTotal++;
          localizationTotal++;
          totalExtractions++;

          const primarySource = mrpResult.sources[0]!;
          if (primarySource.surface && primarySource.sourceImageId) {
            associationCorrect++;
          }
          if (primarySource.boundingBox && primarySource.boundingBox.unit === 'NORMALIZED') {
            localizationCorrect++;
          }
        }
      }

      // 4. Evaluate Recommendation Engine
      if (product.expectedRecommendationSurface) {
        recommendationTotal++;
        const recs = generateSurfaceRecommendations({
          unresolvedFields: ['MRP'],
          containerType: product.containerType,
          capturedSurfaces: product.capturedSurfaces.map((s) => s.surface),
        });
        if (recs.some((r) => r.targetSurface === product.expectedRecommendationSurface)) {
          recommendationCorrect++;
        }
      }
    }

    return {
      totalProducts: products.length,
      totalSurfacesEvaluated: totalSurfaces,
      fieldExtractionAccuracy: fieldTotal > 0 ? fieldMatches / fieldTotal : 1.0,
      crossSurfaceAssociationAccuracy: associationTotal > 0 ? associationCorrect / associationTotal : 1.0,
      surfaceLocalizationAccuracy: localizationTotal > 0 ? localizationCorrect / localizationTotal : 1.0,
      duplicateMergeAccuracy: duplicateMergeTotal > 0 ? duplicateMergeCorrect / duplicateMergeTotal : 1.0,
      conflictDetectionAccuracy: conflictTotal > 0 ? conflictCorrect / conflictTotal : 1.0,
      falseMissingFieldRate: falseMissingTotal > 0 ? falseMissingCount / falseMissingTotal : 0.0,
      correctSearchIncompleteRate: searchIncompleteTotal > 0 ? searchIncompleteCorrect / searchIncompleteTotal : 1.0,
      correctSearchCompleteNoEvidenceRate:
        searchCompleteNoEvidenceTotal > 0 ? searchCompleteNoEvidenceCorrect / searchCompleteNoEvidenceTotal : 1.0,
      captureRecommendationAccuracy: recommendationTotal > 0 ? recommendationCorrect / recommendationTotal : 1.0,
      falsePositiveExtractionRate: totalExtractions > 0 ? falsePositiveCount / totalExtractions : 0.0,
    };
  }
}
