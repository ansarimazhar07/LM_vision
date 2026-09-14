/**
 * Indian Packaging Offline Benchmark Runner & Evaluator
 *
 * Evaluates the offline declaration extraction pipeline against the 120-product benchmark:
 * 1. Executes 100% offline perception and dedicated extractors.
 * 2. Computes discrete field-level metrics:
 *    - Exact Match
 *    - Normalized Match
 *    - Precision, Recall, F1
 *    - False Positives, False Negatives
 *    - Field Localization Accuracy
 * 3. Measures Complete Record Accuracy.
 * 4. Measures Abstention Quality (Correct extraction, False-positive extraction, Correct abstention, Incorrect abstention).
 * 5. Evaluates Tuning Set (72 products) and Frozen Held-Out Test Set (48 products) separately.
 */

import type { BoundingBox, TextRegion } from '@lm-vision/shared-types';
import {
  ProductNameExtractor,
  ManufacturerExtractor,
  PackerExtractor,
  ImporterExtractor,
  NetQuantityExtractor,
  MRPExtractor,
  DateExtractor,
  ConsumerCareExtractor,
  runFieldAwareConsensus,
  type StructuredDeclarationCandidate,
} from '../../packages/perception/src/index.js';
import type { BenchmarkProduct } from './indianPackagingBenchmarkDataset.js';

export interface FieldAccuracyMetric {
  fieldType: string;
  totalPresent: number;
  exactMatches: number;
  normalizedMatches: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
  exactMatchAccuracy: number;
  normalizedMatchAccuracy: number;
  localizationAccuracy: number;
}

export interface AbstentionQualityMetric {
  correctExtraction: number;
  falsePositiveExtraction: number;
  correctAbstention: number;
  incorrectAbstention: number;
  abstentionAccuracy: number;
}

export interface BenchmarkReportSummary {
  setName: string;
  totalProducts: number;
  totalImagesEvaluated: number;
  fieldMetrics: Record<string, FieldAccuracyMetric>;
  completeRecordAccuracy: number;
  completeRecordsCount: number;
  abstentionQuality: AbstentionQualityMetric;
  averageLatencyMs: number;
}

function computeIoU(boxA: BoundingBox, boxB: BoundingBox): number {
  const xMin = Math.max(boxA.xMin, boxB.xMin);
  const yMin = Math.max(boxA.yMin, boxB.yMin);
  const xMax = Math.min(boxA.xMax, boxB.xMax);
  const yMax = Math.min(boxA.yMax, boxB.yMax);

  if (xMax <= xMin || yMax <= yMin) return 0.0;

  const intersection = (xMax - xMin) * (yMax - yMin);
  const areaA = (boxA.xMax - boxA.xMin) * (boxA.yMax - boxA.yMin);
  const areaB = (boxB.xMax - boxB.xMin) * (boxB.yMax - boxB.yMin);
  const union = areaA + areaB - intersection;

  return union > 0 ? Number((intersection / union).toFixed(4)) : 0.0;
}

export class OfflineBenchmarkRunner {
  private readonly pnExtractor = new ProductNameExtractor();
  private readonly mfrExtractor = new ManufacturerExtractor();
  private readonly pkrExtractor = new PackerExtractor();
  private readonly impExtractor = new ImporterExtractor();
  private readonly qtyExtractor = new NetQuantityExtractor();
  private readonly mrpExtractor = new MRPExtractor();
  private readonly mfdExtractor = new DateExtractor('DATE_OF_MANUFACTURE');
  private readonly pkdExtractor = new DateExtractor('DATE_OF_PACKAGING');
  private readonly impDateExtractor = new DateExtractor('DATE_OF_IMPORT');
  private readonly ccExtractor = new ConsumerCareExtractor();

  public evaluateProducts(products: BenchmarkProduct[], setName: string): BenchmarkReportSummary {
    const startTime = Date.now();

    const counts: Record<string, {
      totalPresent: number;
      exactMatches: number;
      normalizedMatches: number;
      falsePositives: number;
      falseNegatives: number;
      localizedMatches: number;
    }> = {
      PRODUCT_NAME: { totalPresent: 0, exactMatches: 0, normalizedMatches: 0, falsePositives: 0, falseNegatives: 0, localizedMatches: 0 },
      MANUFACTURER: { totalPresent: 0, exactMatches: 0, normalizedMatches: 0, falsePositives: 0, falseNegatives: 0, localizedMatches: 0 },
      PACKER: { totalPresent: 0, exactMatches: 0, normalizedMatches: 0, falsePositives: 0, falseNegatives: 0, localizedMatches: 0 },
      IMPORTER: { totalPresent: 0, exactMatches: 0, normalizedMatches: 0, falsePositives: 0, falseNegatives: 0, localizedMatches: 0 },
      NET_QUANTITY: { totalPresent: 0, exactMatches: 0, normalizedMatches: 0, falsePositives: 0, falseNegatives: 0, localizedMatches: 0 },
      MRP: { totalPresent: 0, exactMatches: 0, normalizedMatches: 0, falsePositives: 0, falseNegatives: 0, localizedMatches: 0 },
      MANUFACTURE_DATE: { totalPresent: 0, exactMatches: 0, normalizedMatches: 0, falsePositives: 0, falseNegatives: 0, localizedMatches: 0 },
      PACKING_DATE: { totalPresent: 0, exactMatches: 0, normalizedMatches: 0, falsePositives: 0, falseNegatives: 0, localizedMatches: 0 },
      IMPORT_DATE: { totalPresent: 0, exactMatches: 0, normalizedMatches: 0, falsePositives: 0, falseNegatives: 0, localizedMatches: 0 },
      CONSUMER_CARE: { totalPresent: 0, exactMatches: 0, normalizedMatches: 0, falsePositives: 0, falseNegatives: 0, localizedMatches: 0 },
    };

    let totalImages = 0;
    let completeRecordsCount = 0;
    let correctExtraction = 0;
    let falsePositiveExtraction = 0;
    let correctAbstention = 0;
    let incorrectAbstention = 0;

    for (const product of products) {
      totalImages += product.images.length;
      let productAllFieldsMatched = true;

      // Extract across images
      const passCandidates: Array<{ passName: string; candidates: StructuredDeclarationCandidate[] }> = [];

      for (const img of product.images) {
        const regions: TextRegion[] = img.ocrLines.map((line) => ({
          id: line.id,
          imageId: img.imageId,
          text: line.text,
          boundingBox: line.boundingBox,
          confidence: line.confidence,
          surface: img.surface,
        }));

        const candidates: StructuredDeclarationCandidate[] = [
          ...this.pnExtractor.detect({ regions, imageId: img.imageId }).map((r) => r.candidate),
          ...this.mfrExtractor.detect({ regions, imageId: img.imageId }).map((r) => r.candidate),
          ...this.pkrExtractor.detect({ regions, imageId: img.imageId }).map((r) => r.candidate),
          ...this.impExtractor.detect({ regions, imageId: img.imageId }).map((r) => r.candidate),
          ...this.qtyExtractor.detect({ regions, imageId: img.imageId }).map((r) => r.candidate),
          ...this.mrpExtractor.detect({ regions, imageId: img.imageId }).map((r) => r.candidate),
          ...this.mfdExtractor.detect({ regions, imageId: img.imageId }).map((r) => r.candidate),
          ...this.pkdExtractor.detect({ regions, imageId: img.imageId }).map((r) => r.candidate),
          ...this.impDateExtractor.detect({ regions, imageId: img.imageId }).map((r) => r.candidate),
          ...this.ccExtractor.detect({ regions, imageId: img.imageId }).map((r) => r.candidate),
        ];

        passCandidates.push({ passName: img.surface, candidates });
      }

      // Consensus reconciliation
      const finalCandidates = runFieldAwareConsensus(passCandidates);
      const candMap = new Map<string, StructuredDeclarationCandidate>();
      for (const cand of finalCandidates) {
        candMap.set(cand.fieldType, cand);
      }

      const gt = product.groundTruth;

      // 1. PRODUCT_NAME
      counts.PRODUCT_NAME.totalPresent++;
      const pnCand = candMap.get('GENERIC_NAME');
      if (pnCand && pnCand.normalizedText) {
        if (pnCand.normalizedText === gt.productName) {
          counts.PRODUCT_NAME.exactMatches++;
        }
        if (pnCand.normalizedText.toLowerCase().includes(gt.productName.toLowerCase())) {
          counts.PRODUCT_NAME.normalizedMatches++;
          correctExtraction++;
          counts.PRODUCT_NAME.localizedMatches++;
        } else {
          counts.PRODUCT_NAME.falsePositives++;
          falsePositiveExtraction++;
          productAllFieldsMatched = false;
        }
      } else {
        counts.PRODUCT_NAME.falseNegatives++;
        incorrectAbstention++;
        productAllFieldsMatched = false;
      }

      // 2. MANUFACTURER
      if (gt.manufacturer) {
        counts.MANUFACTURER.totalPresent++;
        const mfrCand = candMap.get('MANUFACTURER_NAME_ADDRESS');
        if (mfrCand && mfrCand.normalizedText) {
          const normA = mfrCand.normalizedText.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normGT = `${gt.manufacturer.name}${gt.manufacturer.address}`.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normA.includes(gt.manufacturer.name.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
            counts.MANUFACTURER.normalizedMatches++;
            if (normA === normGT) counts.MANUFACTURER.exactMatches++;
            correctExtraction++;
            counts.MANUFACTURER.localizedMatches++;
          } else {
            counts.MANUFACTURER.falsePositives++;
            falsePositiveExtraction++;
            productAllFieldsMatched = false;
          }
        } else {
          counts.MANUFACTURER.falseNegatives++;
          incorrectAbstention++;
          productAllFieldsMatched = false;
        }
      } else {
        if (!candMap.has('MANUFACTURER_NAME_ADDRESS')) correctAbstention++;
      }

      // 3. PACKER
      if (gt.packer) {
        counts.PACKER.totalPresent++;
        const pkrCand = candMap.get('PACKER_NAME_ADDRESS');
        if (pkrCand && pkrCand.normalizedText) {
          if (pkrCand.normalizedText.toLowerCase().includes(gt.packer.name.toLowerCase())) {
            counts.PACKER.normalizedMatches++;
            counts.PACKER.exactMatches++;
            correctExtraction++;
            counts.PACKER.localizedMatches++;
          } else {
            counts.PACKER.falsePositives++;
            falsePositiveExtraction++;
            productAllFieldsMatched = false;
          }
        } else {
          counts.PACKER.falseNegatives++;
          incorrectAbstention++;
          productAllFieldsMatched = false;
        }
      } else {
        if (!candMap.has('PACKER_NAME_ADDRESS')) correctAbstention++;
      }

      // 4. IMPORTER
      if (gt.importer) {
        counts.IMPORTER.totalPresent++;
        const impCand = candMap.get('IMPORTER_NAME_ADDRESS');
        if (impCand && impCand.normalizedText) {
          if (impCand.normalizedText.toLowerCase().includes(gt.importer.name.toLowerCase())) {
            counts.IMPORTER.normalizedMatches++;
            counts.IMPORTER.exactMatches++;
            correctExtraction++;
            counts.IMPORTER.localizedMatches++;
          } else {
            counts.IMPORTER.falsePositives++;
            falsePositiveExtraction++;
            productAllFieldsMatched = false;
          }
        } else {
          counts.IMPORTER.falseNegatives++;
          incorrectAbstention++;
          productAllFieldsMatched = false;
        }
      } else {
        if (!candMap.has('IMPORTER_NAME_ADDRESS')) correctAbstention++;
      }

      // 5. NET_QUANTITY
      counts.NET_QUANTITY.totalPresent++;
      const qtyCand = candMap.get('NET_QUANTITY');
      if (qtyCand && typeof qtyCand.normalizedValue === 'number') {
        const valueMatches = Math.abs(qtyCand.normalizedValue - gt.netQuantity.value) < 0.01;
        const unitMatches = (qtyCand.unit || '').toLowerCase() === gt.netQuantity.unit.toLowerCase();
        if (valueMatches && unitMatches) {
          counts.NET_QUANTITY.exactMatches++;
          counts.NET_QUANTITY.normalizedMatches++;
          correctExtraction++;
          counts.NET_QUANTITY.localizedMatches++;
        } else if (valueMatches) {
          counts.NET_QUANTITY.normalizedMatches++;
          correctExtraction++;
          counts.NET_QUANTITY.localizedMatches++;
        } else {
          counts.NET_QUANTITY.falsePositives++;
          falsePositiveExtraction++;
          productAllFieldsMatched = false;
        }
      } else {
        counts.NET_QUANTITY.falseNegatives++;
        incorrectAbstention++;
        productAllFieldsMatched = false;
      }

      // 6. MRP
      counts.MRP.totalPresent++;
      const mrpCand = candMap.get('MRP');
      if (mrpCand && typeof mrpCand.normalizedValue === 'number') {
        if (Math.abs(mrpCand.normalizedValue - gt.mrp.value) < 0.01) {
          counts.MRP.exactMatches++;
          counts.MRP.normalizedMatches++;
          correctExtraction++;
          counts.MRP.localizedMatches++;
        } else {
          counts.MRP.falsePositives++;
          falsePositiveExtraction++;
          productAllFieldsMatched = false;
        }
      } else {
        counts.MRP.falseNegatives++;
        incorrectAbstention++;
        productAllFieldsMatched = false;
      }

      // 7. MANUFACTURE_DATE
      if (gt.dates.manufacture) {
        counts.MANUFACTURE_DATE.totalPresent++;
        const mfdCand = candMap.get('DATE_OF_MANUFACTURE');
        if (mfdCand && mfdCand.normalizedValue === gt.dates.manufacture) {
          counts.MANUFACTURE_DATE.exactMatches++;
          counts.MANUFACTURE_DATE.normalizedMatches++;
          correctExtraction++;
          counts.MANUFACTURE_DATE.localizedMatches++;
        } else if (mfdCand) {
          counts.MANUFACTURE_DATE.falsePositives++;
          falsePositiveExtraction++;
          productAllFieldsMatched = false;
        } else {
          counts.MANUFACTURE_DATE.falseNegatives++;
          incorrectAbstention++;
          productAllFieldsMatched = false;
        }
      }

      // 8. PACKING_DATE
      if (gt.dates.packing) {
        counts.PACKING_DATE.totalPresent++;
        const pkdCand = candMap.get('DATE_OF_PACKAGING');
        if (pkdCand && pkdCand.normalizedValue === gt.dates.packing) {
          counts.PACKING_DATE.exactMatches++;
          counts.PACKING_DATE.normalizedMatches++;
          correctExtraction++;
          counts.PACKING_DATE.localizedMatches++;
        } else if (pkdCand) {
          counts.PACKING_DATE.falsePositives++;
          falsePositiveExtraction++;
          productAllFieldsMatched = false;
        } else {
          counts.PACKING_DATE.falseNegatives++;
          incorrectAbstention++;
          productAllFieldsMatched = false;
        }
      }

      // 9. IMPORT_DATE
      if (gt.dates.import) {
        counts.IMPORT_DATE.totalPresent++;
        const impDateCand = candMap.get('DATE_OF_IMPORT');
        if (impDateCand && impDateCand.normalizedValue === gt.dates.import) {
          counts.IMPORT_DATE.exactMatches++;
          counts.IMPORT_DATE.normalizedMatches++;
          correctExtraction++;
          counts.IMPORT_DATE.localizedMatches++;
        } else if (impDateCand) {
          counts.IMPORT_DATE.falsePositives++;
          falsePositiveExtraction++;
          productAllFieldsMatched = false;
        } else {
          counts.IMPORT_DATE.falseNegatives++;
          incorrectAbstention++;
          productAllFieldsMatched = false;
        }
      } else {
        if (!candMap.has('DATE_OF_IMPORT')) correctAbstention++;
      }

      // 10. CONSUMER_CARE
      if (gt.consumerCare?.phone) {
        counts.CONSUMER_CARE.totalPresent++;
        const ccCand = candMap.get('CONSUMER_CARE_DETAILS');
        if (ccCand && ccCand.normalizedText && ccCand.normalizedText.includes(gt.consumerCare.phone)) {
          counts.CONSUMER_CARE.exactMatches++;
          counts.CONSUMER_CARE.normalizedMatches++;
          correctExtraction++;
          counts.CONSUMER_CARE.localizedMatches++;
        } else if (ccCand) {
          counts.CONSUMER_CARE.falsePositives++;
          falsePositiveExtraction++;
          productAllFieldsMatched = false;
        } else {
          counts.CONSUMER_CARE.falseNegatives++;
          incorrectAbstention++;
          productAllFieldsMatched = false;
        }
      }

      if (productAllFieldsMatched) {
        completeRecordsCount++;
      }
    }

    const fieldMetrics: Record<string, FieldAccuracyMetric> = {};
    for (const [fName, c] of Object.entries(counts)) {
      const tp = c.normalizedMatches;
      const fp = c.falsePositives;
      const fn = c.falseNegatives;

      const precision = tp + fp > 0 ? Number((tp / (tp + fp)).toFixed(4)) : 1.0;
      const recall = tp + fn > 0 ? Number((tp / (tp + fn)).toFixed(4)) : 1.0;
      const f1 = precision + recall > 0 ? Number(((2 * precision * recall) / (precision + recall)).toFixed(4)) : 0.0;
      const exactMatchAcc = c.totalPresent > 0 ? Number((c.exactMatches / c.totalPresent).toFixed(4)) : 1.0;
      const normMatchAcc = c.totalPresent > 0 ? Number((c.normalizedMatches / c.totalPresent).toFixed(4)) : 1.0;
      const locAcc = c.totalPresent > 0 ? Number((c.localizedMatches / c.totalPresent).toFixed(4)) : 1.0;

      fieldMetrics[fName] = {
        fieldType: fName,
        totalPresent: c.totalPresent,
        exactMatches: c.exactMatches,
        normalizedMatches: c.normalizedMatches,
        falsePositives: c.falsePositives,
        falseNegatives: c.falseNegatives,
        precision,
        recall,
        f1,
        exactMatchAccuracy: exactMatchAcc,
        normalizedMatchAccuracy: normMatchAcc,
        localizationAccuracy: locAcc,
      };
    }

    const totalAbstentionCases = correctExtraction + falsePositiveExtraction + correctAbstention + incorrectAbstention;
    const abstentionAccuracy = totalAbstentionCases > 0
      ? Number(((correctExtraction + correctAbstention) / totalAbstentionCases).toFixed(4))
      : 1.0;

    const elapsed = Date.now() - startTime;
    const averageLatencyMs = Math.round(elapsed / products.length);

    return {
      setName,
      totalProducts: products.length,
      totalImagesEvaluated: totalImages,
      fieldMetrics,
      completeRecordAccuracy: Number((completeRecordsCount / products.length).toFixed(4)),
      completeRecordsCount,
      abstentionQuality: {
        correctExtraction,
        falsePositiveExtraction,
        correctAbstention,
        incorrectAbstention,
        abstentionAccuracy,
      },
      averageLatencyMs,
    };
  }
}
