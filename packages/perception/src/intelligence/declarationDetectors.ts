/**
 * Phase C: Modular Declaration Detectors
 *
 * Provides a modular, extensible detector suite for extracting Legal Metrology
 * declarations from raw OCR regions and spatial associations.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. Observational & Evidentiary Only: Never makes statutory legal determinations.
 * 2. Modular Interface: Future detectors can be added without rewriting the pipeline.
 * 3. Never Infer Missing Units: "NET QTY 500" must not become "500 g".
 * 4. Separate Dates: Manufacture/Packing dates strictly separated from Expiry/Best-Before.
 * 5. False-Positive Immunity: Normal words ("GODREJ", "PRODUCT") and random numbers
 *    (PIN, phone, batch, barcode) must NOT become MRP.
 * 6. Honest Confidence: Emits ConfidenceTier, native OCR confidence preserved or null.
 */

import type { DeclarationType } from '@lm-vision/shared-types';
import type {
  ConfidenceTier,
  DetectionResult,
  DetectorContext,
  EvidenceTraceability,
  IDeclarationDetector,
  StructuredDeclarationCandidate,
} from './candidateSchema.js';
import { normalizeNumericString } from './textNormalizer.js';
import { associateLabelsWithValues } from './spatialReasoningEngine.js';
import { ProductNameExtractor } from '../extraction/productNameExtractor.js';
import { MRPExtractor } from '../extraction/mrpExtractor.js';
import { NetQuantityExtractor } from '../extraction/netQuantityExtractor.js';
import { ManufacturerExtractor } from '../extraction/manufacturerExtractor.js';
import { PackerExtractor } from '../extraction/packerExtractor.js';
import { ImporterExtractor } from '../extraction/importerExtractor.js';
import { DateExtractor } from '../extraction/dateExtractor.js';
import { ConsumerCareExtractor } from '../extraction/consumerCareExtractor.js';

// ============================================================================
// Shared Metric Unit Canonical Mapping (English + Devanagari)
// ============================================================================

export const CANONICAL_UNIT_MAP: Record<string, string> = {
  g: 'g',
  gm: 'g',
  gms: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kgs: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  ml: 'ml',
  mls: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  l: 'l',
  lt: 'l',
  ltr: 'l',
  litre: 'l',
  litres: 'l',
  liter: 'l',
  liters: 'l',
  m: 'm',
  meter: 'm',
  meters: 'm',
  cm: 'cm',
  centimeter: 'cm',
  mm: 'mm',
  millimeter: 'mm',
  n: 'n',
  no: 'n',
  number: 'n',
  numbers: 'n',
  unit: 'n',
  units: 'n',
  piece: 'n',
  pieces: 'n',
  pc: 'n',
  pcs: 'n',
  // Devanagari
  'कि.ग्रा.': 'kg',
  'कि.ग्रा': 'kg',
  'किग्रा': 'kg',
  'किलोग्राम': 'kg',
  'ग्राम': 'g',
  'ग्रा.': 'g',
  'ग्रा': 'g',
  'लीटर': 'l',
  'ली.': 'l',
  'ली': 'l',
  'मि.ली.': 'ml',
  'मि.ली': 'ml',
  'मिली': 'ml',
  'मिलीलीटर': 'ml',
  'संख्या': 'n',
  'इकाई': 'n',
  'नग': 'n',
};

// ============================================================================
// 1. MRP Detector
// ============================================================================

export class MrpDetector implements IDeclarationDetector {
  public readonly fieldType: DeclarationType = 'MRP';
  public readonly detectorName = 'MrpDetector';

  private static readonly DIRECT_PATTERNS = [
    // English MRP formats:
    // "MRP ₹120", "MRP ₹120.00", "MRP Rs 120", "MRP Rs. 120", "MRP 120/-", "M.R.P. 120", "MAX RETAIL PRICE ₹120"
    /(?:M\.?R\.?P\.?|MAX\.?\s*RETAIL\s*PRICE|MAXIMUM\s*RETAIL\s*PRICE)\s*(?:RS\.?|INR|₹)?\s*[:.-]?\s*([0-9OIl|SBG]+(?:\.[0-9OIl|SBG]{1,2})?)(?:\s*\/-)?/i,
    // Hindi MRP formats:
    // "एमआरपी ₹ 120.00", "एम.आर.पी. 120/-", "अधिकतम खुदरा मूल्य ₹ 120.00", "खुदरा मूल्य: 120/-"
    /(?:एम\.?आर\.?पी\.?|अधिकतम\s*खुदरा\s*मूल्य|खुदरा\s*मूल्य)\s*(?:रु\.?|रुपये|₹|RS\.?)?\s*[:.-]?\s*([0-9OIl|SBG]+(?:\.[0-9OIl|SBG]{1,2})?)(?:\s*\/-)?/i,
    // Currency symbol + number: "₹ 120", "₹120.00", "Rs. 120", "Rs 120", "रु. 120"
    /(?:\b(?:RS\.?|INR|रु\.?|रुपये)\b|₹)\s*[:.-]?\s*([0-9OIl|SBG]+(?:\.[0-9OIl|SBG]{1,2})?)(?:\s*\/-)?/i,
    // Trailing currency or slash: "120/-"
    /\b([0-9OIl|SBG]+(?:\.[0-9OIl|SBG]{1,2})?)\s*\/-/i,
  ];

  // Regex patterns for false-positive numbers that must NEVER be confused with MRP
  private static readonly FALSE_POSITIVE_NUMBERS = [
    /\b[1-9][0-9]{5}\b/, // 6-digit PIN code (e.g. 422001)
    /(?:1800[- ]?[0-9]{3}[- ]?[0-9]{3,4})/, // Toll-free phone number
    /\b[0-9]{10,12}\b/, // 10-12 digit phone number or barcode
    /\b(?:BATCH|B\.?\s*NO|LOT)\b/i, // Batch indicator
  ];

  public detect(context: DetectorContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const timestamp = new Date().toISOString();

    // 1. Check direct single-region patterns
    for (const region of context.regions) {
      const text = region.text.trim();
      if (!text) continue;

      // False positive filter: reject phone number, PIN code, or barcode strings if lacking currency
      const hasCurrency = /(?:₹|\bRS\.?\b|\bINR\b|रु\.?|रुपये|\/-)/i.test(text);
      if (!hasCurrency && MrpDetector.FALSE_POSITIVE_NUMBERS.some((fp) => fp.test(text))) {
        continue;
      }

      for (const pattern of MrpDetector.DIRECT_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const rawNum = match[1];

          // Guard: rawNum must contain at least one true digit
          if (!/[0-9]/.test(rawNum)) {
            continue;
          }

          // Run conservative character normalization on numeric portion
          const norm = normalizeNumericString(rawNum, {
            fullLineContext: text,
            hint: 'CURRENCY',
          });

          if (norm.numericValue !== null && norm.numericValue > 0) {
            // Check if this number matches a 6-digit PIN with no currency symbol
            if (!/(?:₹|Rs\.?|INR|रु\.?|रुपये|\/-)/i.test(text) && /^[1-9][0-9]{5}$/.test(rawNum)) {
              continue; // Skip isolated PIN code
            }

            const confidenceTier: ConfidenceTier = norm.isAmbiguous
              ? 'MEDIUM_CONFIDENCE'
              : 'HIGH_CONFIDENCE';

            const traceability: EvidenceTraceability = {
              sourceRegionIds: [region.id],
              originalImageId: context.imageId,
              originalBoundingBox: region.boundingBox,
              extractionMethod: 'DIRECT_PATTERN',
              ocrPassName: context.passName,
              validationStatus: norm.isAmbiguous ? 'REQUIRES_VERIFICATION' : 'VALID',
              conflictStatus: 'NONE',
              timestamp,
            };

            const candidate: StructuredDeclarationCandidate = {
              fieldType: 'MRP',
              originalOCRText: text,
              normalizedText: `₹${norm.numericValue.toFixed(2)}`,
              normalizedValue: norm.numericValue,
              unit: 'INR',
              confidenceTier,
              nativeConfidence: region.confidence ?? null,
              isAmbiguous: norm.isAmbiguous,
              correctionsApplied: norm.correctionsApplied,
              traceability,
              sourceRegion: region,
            };

            results.push({ candidate, score: 0.95 });
            break;
          }
        }
      }
    }

    // 2. Check spatial associations (Label "MRP" in one region, Value in adjacent region)
    const spatialAssociations = associateLabelsWithValues(context.regions).filter(
      (a) => a.label.type === 'MRP'
    );

    for (const assoc of spatialAssociations) {
      const valText = assoc.value.valueText.trim();
      const numMatch = valText.match(/([0-9OIl|SBG]+(?:\.[0-9OIl|SBG]{1,2})?)/);
      if (numMatch && numMatch[1]) {
        const norm = normalizeNumericString(numMatch[1], {
          fullLineContext: valText,
          hint: 'CURRENCY',
        });

        if (norm.numericValue !== null && norm.numericValue > 0) {
          const isAmbiguous = assoc.score.isAmbiguous || norm.isAmbiguous;
          const confidenceTier: ConfidenceTier = isAmbiguous
            ? 'MEDIUM_CONFIDENCE'
            : assoc.score.compositeScore >= 0.7
            ? 'HIGH_CONFIDENCE'
            : 'MEDIUM_CONFIDENCE';

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
            fieldType: 'MRP',
            originalOCRText: `${assoc.label.labelText} | ${assoc.value.valueText}`,
            normalizedText: `₹${norm.numericValue.toFixed(2)}`,
            normalizedValue: norm.numericValue,
            unit: 'INR',
            confidenceTier,
            nativeConfidence: assoc.value.valueRegion.confidence ?? null,
            isAmbiguous,
            correctionsApplied: norm.correctionsApplied,
            traceability,
            sourceRegion: assoc.value.valueRegion,
            spatialScore: assoc.score,
          };

          results.push({ candidate, score: assoc.score.compositeScore });
        }
      }
    }

    // Return deduplicated/ranked results
    return results.sort((a, b) => b.score - a.score);
  }
}

// ============================================================================
// 2. Net Quantity Detector
// ============================================================================

export class NetQuantityDetector implements IDeclarationDetector {
  public readonly fieldType: DeclarationType = 'NET_QUANTITY';
  public readonly detectorName = 'NetQuantityDetector';

  private static readonly UNIT_REGEX_STRING =
    '(?:kg|kgs|kilograms?|g|gm|gms|grams?|ml|mls|milliliters?|millilitres?|l|lt|ltr|litres?|liters?|m|meters?|cm|centimeters?|mm|millimeters?|n|no|numbers?|units?|pieces?|pcs?|कि\\.?ग्रा\\.?|किग्रा|किलोग्राम|ग्राम|ग्रा\\.?|लीटर|ली\\.?|मि\\.?ली\\.?|मिली|मिलीलीटर|मीटर|संख्या|इकाई|नग)';

  private static readonly DIRECT_PATTERNS = [
    // Header + quantity + unit: "NET QTY 500 g", "NET WT. 1.5 kg", "शुद्ध मात्रा 500 ग्राम"
    new RegExp(
      `(?:NET\\s*(?:QTY|QUANTITY|WT|WEIGHT|VOL|VOLUME)|N\\.?\\s*W\\.?|शुद्ध\\s*(?:मात्रा|वजन|भार)|मात्रा|वजन)\\s*[:.-]?\\s*([0-9OIl|SBG]+(?:\\.[0-9OIl|SBG]+)?)\\s*(${NetQuantityDetector.UNIT_REGEX_STRING})`,
      'i'
    ),
    // Standalone quantity + unit: "500 g", "500g", "1 kg", "200 ml", "1 L", "1.5 kg", "1 कि.ग्रा."
    new RegExp(
      `\\b([0-9OIl|SBG]+(?:\\.[0-9OIl|SBG]+)?)\\s*(${NetQuantityDetector.UNIT_REGEX_STRING})\\b`,
      'i'
    ),
    // Missing unit pattern: "NET QTY 500", "NET WT: 500"
    // CRITICAL: Must extract number WITHOUT fabricating unit!
    /(?:NET\s*(?:QTY|QUANTITY|WT|WEIGHT|VOL|VOLUME)|N\.?\s*W\.?|शुद्ध\s*(?:मात्रा|वजन))\s*[:.-]?\s*([0-9OIl|SBG]+(?:\.[0-9OIl|SBG]+)?)\b/i,
  ];

  public detect(context: DetectorContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const timestamp = new Date().toISOString();

    // 1. Direct Pattern Extraction
    for (const region of context.regions) {
      const text = region.text.trim();
      if (!text) continue;

      // Reject regions that are clearly MRP or date
      if (/(?:₹|Rs\.?|INR|MFD|EXP)/i.test(text) && !/NET/i.test(text)) {
        continue;
      }

      for (const pattern of NetQuantityDetector.DIRECT_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const rawNum = match[1];
          const rawUnit = match[2] ? match[2].trim().toLowerCase() : null;

          const norm = normalizeNumericString(rawNum, {
            fullLineContext: text,
            hint: 'UNIT',
          });

          if (norm.numericValue !== null && norm.numericValue > 0) {
            const canonicalUnit = rawUnit ? CANONICAL_UNIT_MAP[rawUnit] || rawUnit : null;
            const isMissingUnit = canonicalUnit === null;

            // CRITICAL: If unit is missing, flag ambiguity and REQUIRES_VERIFICATION
            const isAmbiguous = norm.isAmbiguous || isMissingUnit;
            const confidenceTier: ConfidenceTier = isMissingUnit
              ? 'LOW_CONFIDENCE'
              : norm.isAmbiguous
              ? 'MEDIUM_CONFIDENCE'
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
              normalizedText: canonicalUnit ? `${norm.numericValue} ${canonicalUnit}` : `${norm.numericValue}`,
              normalizedValue: norm.numericValue,
              unit: canonicalUnit,
              confidenceTier,
              nativeConfidence: region.confidence ?? null,
              isAmbiguous,
              correctionsApplied: norm.correctionsApplied,
              traceability,
              sourceRegion: region,
            };

            results.push({ candidate, score: isMissingUnit ? 0.45 : 0.95 });
            break;
          }
        }
      }
    }

    // 2. Spatial Association Extraction (Label "NET QTY", Value "500 g" in adjacent region)
    const spatialAssociations = associateLabelsWithValues(context.regions).filter(
      (a) => a.label.type === 'NET_QUANTITY'
    );

    for (const assoc of spatialAssociations) {
      const valText = assoc.value.valueText.trim();
      const match = valText.match(
        new RegExp(
          `([0-9OIl|SBG]+(?:\\.[0-9OIl|SBG]+)?)(?:\\s*(${NetQuantityDetector.UNIT_REGEX_STRING}))?`,
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
          const canonicalUnit = rawUnit ? CANONICAL_UNIT_MAP[rawUnit] || rawUnit : null;
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

          results.push({ candidate, score: assoc.score.compositeScore });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}

// ============================================================================
// 3. Packaging & Manufacture Date Detector (Strictly Separate from Expiry)
// ============================================================================

export class PackagingDateDetector implements IDeclarationDetector {
  public readonly fieldType: DeclarationType = 'DATE_OF_PACKAGING';
  public readonly detectorName = 'PackagingDateDetector';

  private static readonly DATE_REGEX =
    '([0-9]{1,2}[\\/\\.-][0-9]{4}|[A-Za-z]{3,}[\\/\\.\\s-][0-9]{4}|[0-9]{1,2}[\\/\\.-][0-9]{1,2}[\\/\\.-][0-9]{2,4})';

  private static readonly DIRECT_PATTERNS = [
    // Manufacture or Packaging prefix (e.g. PKD: 03/2026, PKD DATE: 03/2026, MFG DATE: 01/2026)
    new RegExp(
      `(?:(?:MFD|MFG|PACKED|PKD|MFR|PKG)(?:\\s*DATE)?|DATE\\s*OF\\s*(?:MFG|MFD|PACKAGING|PACKING))\\s*[:.-]?\\s*${PackagingDateDetector.DATE_REGEX}`,
      'i'
    ),
    // Hindi manufacture / packing date
    new RegExp(
      `(?:निर्माण\\s*तिथि|पैकिंग\\s*तिथि|पैकिंग\\s*दिनांक|निर्माण\\s*दिनांक)\\s*[:.-]?\\s*${PackagingDateDetector.DATE_REGEX}`,
      'i'
    ),
  ];

  public detect(context: DetectorContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const timestamp = new Date().toISOString();

    for (const region of context.regions) {
      const text = region.text.trim();
      if (!text) continue;

      // CRITICAL: Reject regions with Expiry / Best Before indicators
      if (/(?:BEST\s*BEFORE|EXPIRY|EXP\.?|USE\s*BY|समाप्ति|सर्वोत्तम)/i.test(text)) {
        continue;
      }

      for (const pattern of PackagingDateDetector.DIRECT_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const dateStr = match[1].trim();

          const traceability: EvidenceTraceability = {
            sourceRegionIds: [region.id],
            originalImageId: context.imageId,
            originalBoundingBox: region.boundingBox,
            extractionMethod: 'DIRECT_PATTERN',
            ocrPassName: context.passName,
            validationStatus: 'VALID',
            conflictStatus: 'NONE',
            timestamp,
          };

          const candidate: StructuredDeclarationCandidate = {
            fieldType: 'DATE_OF_PACKAGING',
            originalOCRText: text,
            normalizedText: dateStr,
            normalizedValue: dateStr,
            unit: null,
            confidenceTier: 'HIGH_CONFIDENCE',
            nativeConfidence: region.confidence ?? null,
            isAmbiguous: false,
            correctionsApplied: [],
            traceability,
            sourceRegion: region,
          };

          results.push({ candidate, score: 0.95 });
          break;
        }
      }
    }

    // Spatial association
    const spatialAssociations = associateLabelsWithValues(context.regions).filter(
      (a) => a.label.type === 'DATE_OF_PACKAGING'
    );

    for (const assoc of spatialAssociations) {
      const valText = assoc.value.valueText.trim();
      const match = valText.match(new RegExp(PackagingDateDetector.DATE_REGEX, 'i'));
      if (match && match[1]) {
        const dateStr = match[1].trim();
        const isAmbiguous = assoc.score.isAmbiguous;

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
          fieldType: 'DATE_OF_PACKAGING',
          originalOCRText: `${assoc.label.labelText} | ${assoc.value.valueText}`,
          normalizedText: dateStr,
          normalizedValue: dateStr,
          unit: null,
          confidenceTier: isAmbiguous ? 'MEDIUM_CONFIDENCE' : 'HIGH_CONFIDENCE',
          nativeConfidence: assoc.value.valueRegion.confidence ?? null,
          isAmbiguous,
          correctionsApplied: [],
          traceability,
          sourceRegion: assoc.value.valueRegion,
          spatialScore: assoc.score,
        };

        results.push({ candidate, score: assoc.score.compositeScore });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}

// ============================================================================
// 4. Expiry & Best Before Detector (Strictly Separate from MFD/PKD)
// ============================================================================

export class ExpiryDateDetector implements IDeclarationDetector {
  public readonly fieldType: DeclarationType = 'EXPIRY_DATE_BEST_BEFORE';
  public readonly detectorName = 'ExpiryDateDetector';

  private static readonly DIRECT_PATTERNS = [
    /(?:BEST\s*BEFORE|EXPIRY|EXP\.?|USE\s*BY|EXP\s*DATE)\s*[:.-]?\s*([0-9]{1,2}[\/\.-][0-9]{4}|[A-Za-z]{3,}[\/\.\s-][0-9]{4}|[0-9]{1,2}[\/\.-][0-9]{1,2}[\/\.-][0-9]{2,4}|[0-9]{1,2}\s*(?:MONTHS|YEARS|DAYS))/i,
    /(?:सर्वोत्तम\s*उपयोग|उपयोग\s*की\s*अंतिम\s*तिथि|समाप्ति\s*तिथि)\s*[:.-]?\s*([0-9]{1,2}[\/\.-][0-9]{4}|[0-9]{1,2}[\/\.-][0-9]{1,2}[\/\.-][0-9]{2,4}|[0-9]{1,2}\s*(?:महीने|वर्ष))/i,
  ];

  public detect(context: DetectorContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const timestamp = new Date().toISOString();

    for (const region of context.regions) {
      const text = region.text.trim();
      if (!text) continue;

      // CRITICAL: Reject regions that are strictly manufacture/packaging dates
      if (/(?:MFD|MFG|PACKED|PKD|निर्माण)/i.test(text) && !/BEST\s*BEFORE|EXP/i.test(text)) {
        continue;
      }

      for (const pattern of ExpiryDateDetector.DIRECT_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const dateStr = match[1].trim();

          const traceability: EvidenceTraceability = {
            sourceRegionIds: [region.id],
            originalImageId: context.imageId,
            originalBoundingBox: region.boundingBox,
            extractionMethod: 'DIRECT_PATTERN',
            ocrPassName: context.passName,
            validationStatus: 'VALID',
            conflictStatus: 'NONE',
            timestamp,
          };

          const candidate: StructuredDeclarationCandidate = {
            fieldType: 'EXPIRY_DATE_BEST_BEFORE',
            originalOCRText: text,
            normalizedText: dateStr,
            normalizedValue: dateStr,
            unit: null,
            confidenceTier: 'HIGH_CONFIDENCE',
            nativeConfidence: region.confidence ?? null,
            isAmbiguous: false,
            correctionsApplied: [],
            traceability,
            sourceRegion: region,
          };

          results.push({ candidate, score: 0.95 });
          break;
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}

// ============================================================================
// 5. Manufacturer / Packer / Importer Detector
// ============================================================================

export class ManufacturerDetector implements IDeclarationDetector {
  public readonly fieldType: DeclarationType = 'MANUFACTURER_NAME_ADDRESS';
  public readonly detectorName = 'ManufacturerDetector';

  private static readonly DIRECT_PATTERNS = [
    /(?:MFD\.?\s*BY|MFG\.?\s*BY|MANUFACTURED\s*BY|PACKED\s*BY|PKD\.?\s*BY|IMPORTED\s*BY|MARKETED\s*BY)\s*[:.-]?\s*([^\n\r]+)/i,
    /(?:निर्माता|द्वारा\s*निर्मित|द्वारा\s*पैक|पैकर|आयातकर्ता)\s*[:.-]?\s*([^\n\r]+)/i,
  ];

  public detect(context: DetectorContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const timestamp = new Date().toISOString();

    for (const region of context.regions) {
      const text = region.text.trim();
      if (!text) continue;

      for (const pattern of ManufacturerDetector.DIRECT_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1] && match[1].trim().length >= 3) {
          const mfrName = match[1].trim();

          const traceability: EvidenceTraceability = {
            sourceRegionIds: [region.id],
            originalImageId: context.imageId,
            originalBoundingBox: region.boundingBox,
            extractionMethod: 'DIRECT_PATTERN',
            ocrPassName: context.passName,
            validationStatus: 'VALID',
            conflictStatus: 'NONE',
            timestamp,
          };

          const candidate: StructuredDeclarationCandidate = {
            fieldType: 'MANUFACTURER_NAME_ADDRESS',
            originalOCRText: text,
            normalizedText: mfrName,
            normalizedValue: mfrName,
            unit: null,
            confidenceTier: 'HIGH_CONFIDENCE',
            nativeConfidence: region.confidence ?? null,
            isAmbiguous: false,
            correctionsApplied: [],
            traceability,
            sourceRegion: region,
          };

          results.push({ candidate, score: 0.90 });
          break;
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}

// ============================================================================
// 6. Address Detector (Validates 6-Digit Indian PIN Structure)
// ============================================================================

export class AddressDetector implements IDeclarationDetector {
  public readonly fieldType: DeclarationType = 'MANUFACTURER_NAME_ADDRESS';
  public readonly detectorName = 'AddressDetector';

  // Indian postal PIN code syntax: 6 digits starting with 1-9
  private static readonly PIN_PATTERN = /\b([1-9][0-9]{5})\b/;
  private static readonly ADDRESS_KEYWORDS = /(?:Plot|Sector|Area|Road|Street|Phase|Zone|Estate|Nagar|Dist|District|Faridabad|Bengaluru|Bangalore|Mumbai|Delhi|Gujarat|Haryana|Karnataka|Maharashtra|Mehsana|Vapi|Survey)\b/i;

  public detect(context: DetectorContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const timestamp = new Date().toISOString();

    for (const region of context.regions) {
      const text = region.text.trim();
      if (!text || text.length < 10) continue;

      const hasPin = AddressDetector.PIN_PATTERN.test(text);
      const hasKeywords = AddressDetector.ADDRESS_KEYWORDS.test(text);

      if (hasPin || hasKeywords) {
        const traceability: EvidenceTraceability = {
          sourceRegionIds: [region.id],
          originalImageId: context.imageId,
          originalBoundingBox: region.boundingBox,
          extractionMethod: 'DIRECT_PATTERN',
          ocrPassName: context.passName,
          validationStatus: hasPin ? 'VALID' : 'REQUIRES_VERIFICATION',
          conflictStatus: 'NONE',
          timestamp,
        };

        const candidate: StructuredDeclarationCandidate = {
          fieldType: 'MANUFACTURER_NAME_ADDRESS',
          originalOCRText: text,
          normalizedText: text,
          normalizedValue: text,
          unit: null,
          confidenceTier: hasPin && hasKeywords ? 'HIGH_CONFIDENCE' : 'MEDIUM_CONFIDENCE',
          nativeConfidence: region.confidence ?? null,
          isAmbiguous: !hasPin,
          correctionsApplied: [],
          traceability,
          sourceRegion: region,
        };

        results.push({ candidate, score: hasPin && hasKeywords ? 0.88 : 0.70 });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}

// ============================================================================
// 7. Consumer Care Detector
// ============================================================================

export class ConsumerCareDetector implements IDeclarationDetector {
  public readonly fieldType: DeclarationType = 'CONSUMER_CARE_DETAILS';
  public readonly detectorName = 'ConsumerCareDetector';

  private static readonly DIRECT_PATTERNS = [
    /(?:CONSUMER\s*CARE|CUSTOMER\s*CARE|HELPLINE|FEEDBACK|QUERIES|COMPLAINTS|उपभोक्ता\s*सेवा|ग्राहक\s*सेवा)\s*[:.-]?\s*([^\n\r]+)/i,
    /(?:TOLL\s*FREE|TEL|PHONE|NO\.?)\s*[:.-]?\s*(1800[- ]?[0-9]{3}[- ]?[0-9]{3,4}|[0-9]{10,11}|\+[0-9]{2}[- ]?[0-9]{10})/i,
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
  ];

  public detect(context: DetectorContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const timestamp = new Date().toISOString();

    for (const region of context.regions) {
      const text = region.text.trim();
      if (!text) continue;

      for (const pattern of ConsumerCareDetector.DIRECT_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const detail = match[1].trim();

          const traceability: EvidenceTraceability = {
            sourceRegionIds: [region.id],
            originalImageId: context.imageId,
            originalBoundingBox: region.boundingBox,
            extractionMethod: 'DIRECT_PATTERN',
            ocrPassName: context.passName,
            validationStatus: 'VALID',
            conflictStatus: 'NONE',
            timestamp,
          };

          const candidate: StructuredDeclarationCandidate = {
            fieldType: 'CONSUMER_CARE_DETAILS',
            originalOCRText: text,
            normalizedText: detail,
            normalizedValue: detail,
            unit: null,
            confidenceTier: 'HIGH_CONFIDENCE',
            nativeConfidence: region.confidence ?? null,
            isAmbiguous: false,
            correctionsApplied: [],
            traceability,
            sourceRegion: region,
          };

          results.push({ candidate, score: 0.92 });
          break;
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}

// ============================================================================
// 8. Country of Origin Detector (Never Infers from Brand)
// ============================================================================

export class CountryOfOriginDetector implements IDeclarationDetector {
  public readonly fieldType: DeclarationType = 'COUNTRY_OF_ORIGIN';
  public readonly detectorName = 'CountryOfOriginDetector';

  private static readonly DIRECT_PATTERNS = [
    /(?:COUNTRY\s*OF\s*ORIGIN|MADE\s*IN|PRODUCT\s*OF|PRODUCED\s*IN)\s*[:.-]?\s*([A-Za-z\s]+)/i,
    /(?:मूल\s*देश|देश)\s*[:.-]?\s*([A-Za-z\u0900-\u097F\s]+)/i,
  ];

  public detect(context: DetectorContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const timestamp = new Date().toISOString();

    for (const region of context.regions) {
      const text = region.text.trim();
      if (!text) continue;

      for (const pattern of CountryOfOriginDetector.DIRECT_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1] && match[1].trim().length >= 2) {
          const country = match[1].trim();

          const traceability: EvidenceTraceability = {
            sourceRegionIds: [region.id],
            originalImageId: context.imageId,
            originalBoundingBox: region.boundingBox,
            extractionMethod: 'DIRECT_PATTERN',
            ocrPassName: context.passName,
            validationStatus: 'VALID',
            conflictStatus: 'NONE',
            timestamp,
          };

          const candidate: StructuredDeclarationCandidate = {
            fieldType: 'COUNTRY_OF_ORIGIN',
            originalOCRText: text,
            normalizedText: country,
            normalizedValue: country,
            unit: null,
            confidenceTier: 'HIGH_CONFIDENCE',
            nativeConfidence: region.confidence ?? null,
            isAmbiguous: false,
            correctionsApplied: [],
            traceability,
            sourceRegion: region,
          };

          results.push({ candidate, score: 0.90 });
          break;
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}

// ============================================================================
// Declaration Detector Registry
// ============================================================================

export class DeclarationDetectorRegistry {
  private readonly detectors: Map<DeclarationType, IDeclarationDetector[]> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    // 10 Target Packaging Fields (Hardened Dedicated Extractors)
    this.register(new ProductNameExtractor());
    this.register(new MRPExtractor());
    this.register(new NetQuantityExtractor());
    this.register(new ManufacturerExtractor());
    this.register(new PackerExtractor());
    this.register(new ImporterExtractor());
    this.register(new DateExtractor('DATE_OF_MANUFACTURE'));
    this.register(new DateExtractor('DATE_OF_PACKAGING'));
    this.register(new DateExtractor('DATE_OF_IMPORT'));
    this.register(new ConsumerCareExtractor());

    // Auxiliary / Legacy Detectors
    this.register(new ExpiryDateDetector());
    this.register(new AddressDetector());
    this.register(new CountryOfOriginDetector());
  }

  public register(detector: IDeclarationDetector): void {
    const list = this.detectors.get(detector.fieldType) || [];
    list.push(detector);
    this.detectors.set(detector.fieldType, list);
  }

  public detectAll(context: DetectorContext): StructuredDeclarationCandidate[] {
    const candidates: StructuredDeclarationCandidate[] = [];

    for (const [, detectorList] of this.detectors) {
      for (const detector of detectorList) {
        const results = detector.detect(context);
        const topResult = results[0];
        if (topResult) {
          // Take highest-scoring candidate for this detector
          candidates.push(topResult.candidate);
        }
      }
    }

    return candidates;
  }
}

export const defaultDetectorRegistry = new DeclarationDetectorRegistry();
