/**
 * Dispersed Packaging Offline Benchmark Test Suite
 *
 * Runs the 20-product Dispersed Benchmark Suite to evaluate multi-surface
 * declaration extraction, conflict detection, false missing prevention,
 * and surface capture recommendations.
 */

import { describe, expect, it } from 'vitest';
import { DISPERSED_BENCHMARK_DATASET } from './dispersedPackagingBenchmarkDataset.js';
import { DispersedBenchmarkRunner } from './dispersedBenchmarkRunner.js';

describe('Dispersed Packaging Offline Benchmark Suite', () => {
  const runner = new DispersedBenchmarkRunner();

  it('evaluates the 20-product Dispersed Declaration Benchmark Dataset', () => {
    const metrics = runner.evaluateDataset(DISPERSED_BENCHMARK_DATASET);

    console.log('[DISPERSED BENCHMARK RESULTS]:', JSON.stringify(metrics, null, 2));

    expect(metrics.totalProducts).toBeGreaterThanOrEqual(20);
    expect(metrics.totalSurfacesEvaluated).toBeGreaterThanOrEqual(35);

    // 1. Field Extraction Accuracy: >= 90%
    expect(metrics.fieldExtractionAccuracy).toBeGreaterThanOrEqual(0.90);

    // 2. Cross-Surface Association Accuracy: >= 95%
    expect(metrics.crossSurfaceAssociationAccuracy).toBeGreaterThanOrEqual(0.95);

    // 3. Surface Localization Accuracy: >= 95%
    expect(metrics.surfaceLocalizationAccuracy).toBeGreaterThanOrEqual(0.95);

    // 4. Duplicate Merge Accuracy: 100%
    expect(metrics.duplicateMergeAccuracy).toBe(1.0);

    // 5. Conflict Detection Accuracy: 100%
    expect(metrics.conflictDetectionAccuracy).toBe(1.0);

    // 6. False Missing Field Rate: STRICTLY 0.0% (Primary Guardrail!)
    expect(metrics.falseMissingFieldRate).toBe(0.0);

    // 7. Correct Search Incomplete Classification: >= 95%
    expect(metrics.correctSearchIncompleteRate).toBeGreaterThanOrEqual(0.95);

    // 8. Correct Search Complete No Evidence Classification: >= 95%
    expect(metrics.correctSearchCompleteNoEvidenceRate).toBeGreaterThanOrEqual(0.95);

    // 9. Capture Recommendation Accuracy: >= 90%
    expect(metrics.captureRecommendationAccuracy).toBeGreaterThanOrEqual(0.90);

    // 10. False Positive Extraction Rate: <= 5%
    expect(metrics.falsePositiveExtractionRate).toBeLessThanOrEqual(0.05);
  });
});
