/**
 * Benchmark Runner Test Suite
 *
 * Executes the offline extraction benchmark against both:
 * 1. Tuning Set (72 products, ~360 images)
 * 2. Held-Out Test Set (48 products, ~240 images)
 *
 * Verifies field-level precision, recall, F1, localization accuracy,
 * complete record accuracy, and abstention quality.
 */

import { describe, expect, it } from 'vitest';
import {
  TUNING_BENCHMARK_SET,
  HELD_OUT_TEST_SET,
} from './indianPackagingBenchmarkDataset.js';
import { OfflineBenchmarkRunner, type BenchmarkReportSummary } from './benchmarkRunner.js';

describe('Indian Packaging Offline Benchmark Suite', () => {
  const runner = new OfflineBenchmarkRunner();

  it('evaluates the 72-product Tuning Benchmark Set', () => {
    const report: BenchmarkReportSummary = runner.evaluateProducts(TUNING_BENCHMARK_SET, 'Tuning Set (72 Products)');

    expect(report.totalProducts).toBe(72);
    expect(report.totalImagesEvaluated).toBeGreaterThanOrEqual(300);

    // Verify all 10 target fields are present in the report
    const targetFields = [
      'PRODUCT_NAME',
      'MANUFACTURER',
      'PACKER',
      'IMPORTER',
      'NET_QUANTITY',
      'MRP',
      'MANUFACTURE_DATE',
      'PACKING_DATE',
      'IMPORT_DATE',
      'CONSUMER_CARE',
    ];

    for (const field of targetFields) {
      expect(report.fieldMetrics).toHaveProperty(field);
      const m = report.fieldMetrics[field]!;
      console.log(`[BENCHMARK TUNING] ${field}:`, JSON.stringify(m));
      expect(m.precision).toBeGreaterThanOrEqual(0.85);
      expect(m.recall).toBeGreaterThanOrEqual(0.85);
      expect(m.localizationAccuracy).toBeGreaterThanOrEqual(0.85);
    }

    // Complete record accuracy
    expect(report.completeRecordAccuracy).toBeGreaterThanOrEqual(0.80);

    // Abstention quality
    expect(report.abstentionQuality.abstentionAccuracy).toBeGreaterThanOrEqual(0.90);
    expect(report.abstentionQuality.correctAbstention).toBeGreaterThan(0);
  });

  it('evaluates the 48-product Frozen Held-Out Test Set', () => {
    // Configuration is frozen; evaluate untouched held-out set
    const report: BenchmarkReportSummary = runner.evaluateProducts(HELD_OUT_TEST_SET, 'Held-Out Test Set (48 Products)');

    expect(report.totalProducts).toBe(48);
    expect(report.totalImagesEvaluated).toBeGreaterThanOrEqual(200);

    const targetFields = [
      'PRODUCT_NAME',
      'MANUFACTURER',
      'PACKER',
      'IMPORTER',
      'NET_QUANTITY',
      'MRP',
      'MANUFACTURE_DATE',
      'PACKING_DATE',
      'IMPORT_DATE',
      'CONSUMER_CARE',
    ];

    for (const field of targetFields) {
      expect(report.fieldMetrics).toHaveProperty(field);
      const m = report.fieldMetrics[field]!;
      console.log(`[BENCHMARK HELD-OUT] ${field}:`, JSON.stringify(m));
      expect(m.precision).toBeGreaterThanOrEqual(0.85);
      expect(m.recall).toBeGreaterThanOrEqual(0.85);
      expect(m.localizationAccuracy).toBeGreaterThanOrEqual(0.85);
    }

    // Complete record accuracy on held-out set
    expect(report.completeRecordAccuracy).toBeGreaterThanOrEqual(0.80);

    // Abstention quality
    expect(report.abstentionQuality.abstentionAccuracy).toBeGreaterThanOrEqual(0.90);
    expect(report.abstentionQuality.correctAbstention).toBeGreaterThan(0);
  });
});
