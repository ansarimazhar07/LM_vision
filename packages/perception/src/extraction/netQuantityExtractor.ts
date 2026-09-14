/**
 * Dedicated Net Quantity Extractor
 *
 * Implements deterministic quantity and unit parsing under Legal Metrology Rules:
 * 1. Supports standard mass (g, kg), volume (ml, l), count (n, pcs, units), and length (m, cm, mm).
 * 2. Canonicalizes units deterministically while preserving original raw text.
 * 3. Requires strong quantity context for generic linear units (m, cm, mm) to avoid false associations.
 * 4. Missing unit must remain unresolved: "NET QTY 500" yields unit = null and REQUIRES_VERIFICATION. Never guesses "g".
 * 5. Robust false-positive rejection: PIN codes, phones, barcodes, batches, licenses, dates, and MRP.
 */

import type { DeclarationType } from '@lm-vision/shared-types';
import type {
  ConfidenceTier,
  DetectionResult,
  DetectorContext,
  EvidenceTraceability,
  IDeclarationDetector,
  StructuredDeclarationCandidate,
} from '../intelligence/candidateSchema.js';
import { normalizeNumericString } from '../intelligence/textNormalizer.js';
import { associateLabelsWithValues } from '../intelligence/spatialReasoningEngine.js';
import { LINEAR_DIMENSION_UNITS, validateNetQuantity } from './fieldValidators.js';

export const QUANTITY_UNIT_MAP: Record<string, { canonicalUnit: string; multiplier: number; targetUnit?: string }> = {
  g: { canonicalUnit: 'g', multiplier: 1 },
  gm: { canonicalUnit: 'g', multiplier: 1 },
  gms: { canonicalUnit: 'g', multiplier: 1 },
  gram: { canonicalUnit: 'g', multiplier: 1 },
  grams: { canonicalUnit: 'g', multiplier: 1 },
  kg: { canonicalUnit: 'kg', multiplier: 1000, targetUnit: 'g' },
  kgs: { canonicalUnit: 'kg', multiplier: 1000, targetUnit: 'g' },
  kilogram: { canonicalUnit: 'kg', multiplier: 1000, targetUnit: 'g' },
  kilograms: { canonicalUnit: 'kg', multiplier: 1000, targetUnit: 'g' },
  ml: { canonicalUnit: 'ml', multiplier: 1 },
  mls: { canonicalUnit: 'ml', multiplier: 1 },
  milliliter: { canonicalUnit: 'ml', multiplier: 1 },
  milliliters: { canonicalUnit: 'ml', multiplier: 1 },
  millilitre: { canonicalUnit: 'ml', multiplier: 1 },
  millilitres: { canonicalUnit: 'ml', multiplier: 1 },
  l: { canonicalUnit: 'l', multiplier: 1000, targetUnit: 'ml' },
  lt: { canonicalUnit: 'l', multiplier: 1000, targetUnit: 'ml' },
  ltr: { canonicalUnit: 'l', multiplier: 1000, targetUnit: 'ml' },
  litre: { canonicalUnit: 'l', multiplier: 1000, targetUnit: 'ml' },
  litres: { canonicalUnit: 'l', multiplier: 1000, targetUnit: 'ml' },
  liter: { canonicalUnit: 'l', multiplier: 1000, targetUnit: 'ml' },
  liters: { canonicalUnit: 'l', multiplier: 1000, targetUnit: 'ml' },
  n: { canonicalUnit: 'n', multiplier: 1 },
  no: { canonicalUnit: 'n', multiplier: 1 },
  number: { canonicalUnit: 'n', multiplier: 1 },
  numbers: { canonicalUnit: 'n', multiplier: 1 },
  unit: { canonicalUnit: 'n', multiplier: 1 },
  units: { canonicalUnit: 'n', multiplier: 1 },
  piece: { canonicalUnit: 'n', multiplier: 1 },
  pieces: { canonicalUnit: 'n', multiplier: 1 },
  pc: { canonicalUnit: 'n', multiplier: 1 },
  pcs: { canonicalUnit: 'n', multiplier: 1 },
  m: { canonicalUnit: 'm', multiplier: 1 },
  meter: { canonicalUnit: 'm', multiplier: 1 },
  meters: { canonicalUnit: 'm', multiplier: 1 },
  cm: { canonicalUnit: 'cm', multiplier: 1 },
  centimeter: { canonicalUnit: 'cm', multiplier: 1 },
  mm: { canonicalUnit: 'mm', multiplier: 1 },
  millimeter: { canonicalUnit: 'mm', multiplier: 1 },
  // Devanagari forms
  'कि.ग्रा.': { canonicalUnit: 'kg', multiplier: 1000, targetUnit: 'g' },
  'कि.ग्रा': { canonicalUnit: 'kg', multiplier: 1000, targetUnit: 'g' },
  'किग्रा': { canonicalUnit: 'kg', multiplier: 1000, targetUnit: 'g' },
  'किलोग्राम': { canonicalUnit: 'kg', multiplier: 1000, targetUnit: 'g' },
  'ग्राम': { canonicalUnit: 'g', multiplier: 1 },
  'ग्रा.': { canonicalUnit: 'g', multiplier: 1 },
  'ग्रा': { canonicalUnit: 'g', multiplier: 1 },
  'लीटर': { canonicalUnit: 'l', multiplier: 1000, targetUnit: 'ml' },
  'ली.': { canonicalUnit: 'l', multiplier: 1000, targetUnit: 'ml' },
  'ली': { canonicalUnit: 'l', multiplier: 1000, targetUnit: 'ml' },
  'मि.ली.': { canonicalUnit: 'ml', multiplier: 1 },
  'मि.ली': { canonicalUnit: 'ml', multiplier: 1 },
  'मिली': { canonicalUnit: 'ml', multiplier: 1 },
  'मिलीलीटर': { canonicalUnit: 'ml', multiplier: 1 },
  'मीटर': { canonicalUnit: 'm', multiplier: 1 },
  'संख्या': { canonicalUnit: 'n', multiplier: 1 },
  'इकाई': { canonicalUnit: 'n', multiplier: 1 },
  'नग': { canonicalUnit: 'n', multiplier: 1 },
};

const UNIT_REGEX_STRING =
  '(?:kg|kgs|kilograms?|g|gm|gms|grams?|ml|mls|milliliters?|millilitres?|l|lt|ltr|litres?|liters?|m|meters?|cm|centimeters?|mm|millimeters?|n|no|numbers?|units?|pieces?|pcs?|कि\\.?ग्रा\\.?|किग्रा|किलोग्राम|ग्राम|ग्रा\\.?|लीटर|ली\\.?|मि\\.?ली\\.?|मिली|मिलीलीटर|मीटर|संख्या|इकाई|नग)';

// False-positive patterns to avoid misclassifying other numbers as Net Quantity
const FALSE_POSITIVE_PATTERNS = [
  /\b[1-9][0-9]{5}\b/, // 6-digit PIN code (e.g. 422001)
  /(?:1800[- ]?[0-9]{3}[- ]?[0-9]{3,4})/, // Toll-free phone
  /\b(?:\+91[- ]?)?[6-9][0-9]{9}\b/, // Mobile phone
  /\b(?:BATCH|B\.?\s*NO|LOT)\s*[:.-]?\s*[A-Za-z0-9\-_]+/i, // Batch
  /\b(?:FSSAI|LIC\s*NO)\s*[:.-]?\s*[0-9]+/i, // License
  /\b(?:₹|RS\.?|INR|रु\.?)\s*[0-9]+/i, // MRP
];

export class NetQuantityExtractor implements IDeclarationDetector {
  public readonly fieldType: DeclarationType = 'NET_QUANTITY';
  public readonly detectorName = 'NetQuantityExtractor';

  private static readonly DIRECT_PATTERNS = [
    // 1. Explicit Header + quantity + unit
    new RegExp(
      `(?:NET\\s*(?:QTY|QUANTITY|WT|WEIGHT|VOL|VOLUME)|N\\.?\\s*W\\.?|N\\.?\\s*Q\\.?|शुद्ध\\s*(?:मात्रा|वजन|भार)|मात्रा|वजन)\\s*[:.-]?\\s*([0-9OIl|SBG]+(?:\\.[0-9OIl|SBG]+)?)\\s*(${UNIT_REGEX_STRING})`,
      'i'
    ),
    // 2. Standalone quantity + unit
    new RegExp(
      `\\b([0-9OIl|SBG]+(?:\\.[0-9OIl|SBG]+)?)\\s*(${UNIT_REGEX_STRING})\\b`,
      'i'
    ),
    // 3. Header with MISSING unit: "NET QTY 500", "NET WT: 500"
    /(?:NET\s*(?:QTY|QUANTITY|WT|WEIGHT|VOL|VOLUME)|N\.?\s*W\.?|शुद्ध\s*(?:मात्रा|वजन))\s*[:.-]?\s*([0-9OIl|SBG]+(?:\.[0-9OIl|SBG]+)?)\b/i,
  ];

  public detect(context: DetectorContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const timestamp = new Date().toISOString();

    for (const region of context.regions) {
      const text = region.text.trim();
      if (!text) continue;

      // Filter false positives if the region contains no Net Qty header
      const hasNetQtyHeader = /NET|N\.?W\.?|शुद्ध|मात्रा/i.test(text);
      if (!hasNetQtyHeader && FALSE_POSITIVE_PATTERNS.some((fp) => fp.test(text))) {
        continue;
      }

      for (const pattern of NetQuantityExtractor.DIRECT_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const rawNum = match[1];
          const rawUnit = match[2] ? match[2].trim().toLowerCase() : null;

          const norm = normalizeNumericString(rawNum, {
            fullLineContext: text,
            hint: 'UNIT',
          });

          if (norm.numericValue === null || norm.numericValue <= 0) continue;

          // Unit processing & canonicalization
          let canonicalUnit: string | null = null;
          let canonicalValue: number = norm.numericValue;

          if (rawUnit && QUANTITY_UNIT_MAP[rawUnit]) {
            const entry = QUANTITY_UNIT_MAP[rawUnit]!;
            canonicalUnit = entry.canonicalUnit;

            // Deterministic canonicalization for fractional kg / L
            if (entry.targetUnit && norm.numericValue < 1 && entry.multiplier > 1) {
              canonicalValue = norm.numericValue * entry.multiplier;
              canonicalUnit = entry.targetUnit;
            }
          }

          // Validation
          const validation = validateNetQuantity(canonicalValue, canonicalUnit, text);
          if (!validation.isValid && !validation.isAmbiguous) continue;

          const isMissingUnit = canonicalUnit === null;
          const isLinearUnit = canonicalUnit ? LINEAR_DIMENSION_UNITS.has(canonicalUnit) : false;

          // Missing units or linear units without header must remain LOW_CONFIDENCE
          const isAmbiguous = norm.isAmbiguous || isMissingUnit || validation.isAmbiguous;
          const confidenceTier: ConfidenceTier = isMissingUnit
            ? 'LOW_CONFIDENCE'
            : isAmbiguous
            ? 'MEDIUM_CONFIDENCE'
            : hasNetQtyHeader
            ? 'HIGH_CONFIDENCE'
            : isLinearUnit
            ? 'LOW_CONFIDENCE'
            : 'HIGH_CONFIDENCE';

          const traceability: EvidenceTraceability = {
            sourceRegionIds: [region.id],
            originalImageId: context.imageId,
            originalBoundingBox: region.boundingBox,
            extractionMethod: 'DIRECT_PATTERN',
            ocrPassName: context.passName,
            validationStatus: isAmbiguous ? 'REQUIRES_VERIFICATION' : 'VALID',
            conflictStatus: 'NONE',
            timestamp,
          };

          const candidate: StructuredDeclarationCandidate = {
            fieldType: 'NET_QUANTITY',
            originalOCRText: text,
            normalizedText: canonicalUnit ? `${canonicalValue} ${canonicalUnit}` : `${canonicalValue}`,
            normalizedValue: canonicalValue,
            unit: canonicalUnit,
            confidenceTier,
            nativeConfidence: region.confidence ?? null,
            isAmbiguous,
            correctionsApplied: norm.correctionsApplied,
            traceability,
            sourceRegion: region,
          };

          results.push({
            candidate,
            score: isMissingUnit ? 0.40 : hasNetQtyHeader ? 0.95 : 0.82,
          });
          break;
        }
      }
    }

    // 2. Spatial association: Label in one region ("NET QTY"), value in adjacent region ("500 g")
    const spatialAssocs = associateLabelsWithValues(context.regions).filter(
      (a) => a.label.type === 'NET_QUANTITY'
    );

    for (const assoc of spatialAssocs) {
      const valText = assoc.value.valueText.trim();
      const match = valText.match(
        new RegExp(
          `([0-9OIl|SBG]+(?:\\.[0-9OIl|SBG]+)?)(?:\\s*(${UNIT_REGEX_STRING}))?`,
          'i'
        )
      );

      if (match && match[1]) {
        const norm = normalizeNumericString(match[1], {
          fullLineContext: valText,
          hint: 'UNIT',
        });

        if (norm.numericValue !== null && norm.numericValue > 0) {
          const rawUnit = match[2] ? match[2].trim().toLowerCase() : null;
          const canonicalUnit = rawUnit && QUANTITY_UNIT_MAP[rawUnit] ? QUANTITY_UNIT_MAP[rawUnit]!.canonicalUnit : null;
          const isMissingUnit = canonicalUnit === null;

          const isAmbiguous = assoc.score.isAmbiguous || norm.isAmbiguous || isMissingUnit;
          const confidenceTier: ConfidenceTier = isMissingUnit
            ? 'LOW_CONFIDENCE'
            : isAmbiguous
            ? 'MEDIUM_CONFIDENCE'
            : 'HIGH_CONFIDENCE';

          const traceability: EvidenceTraceability = {
            sourceRegionIds: [assoc.label.labelRegion.id, assoc.value.valueRegion.id],
            originalImageId: context.imageId,
            originalBoundingBox: assoc.compositeBoundingBox,
            extractionMethod: 'SPATIAL_ASSOCIATION',
            ocrPassName: context.passName,
            validationStatus: isAmbiguous ? 'REQUIRES_VERIFICATION' : 'VALID',
            conflictStatus: 'NONE',
            timestamp,
          };

          const candidate: StructuredDeclarationCandidate = {
            fieldType: 'NET_QUANTITY',
            originalOCRText: `${assoc.label.labelText} | ${assoc.value.valueText}`,
            normalizedText: canonicalUnit ? `${norm.numericValue} ${canonicalUnit}` : `${norm.numericValue}`,
            normalizedValue: norm.numericValue,
            unit: canonicalUnit,
            confidenceTier,
            nativeConfidence: assoc.value.valueRegion.confidence ?? null,
            isAmbiguous,
            correctionsApplied: norm.correctionsApplied,
            traceability,
            sourceRegion: assoc.value.valueRegion,
            spatialScore: assoc.score,
          };

          results.push({
            candidate,
            score: isMissingUnit ? 0.38 : assoc.score.compositeScore,
          });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}
