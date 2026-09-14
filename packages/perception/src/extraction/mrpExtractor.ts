/**
 * Dedicated MRP Extractor
 *
 * Implements robust Maximum Retail Price extraction:
 * 1. Supports statutory English and Devanagari MRP declarations.
 * 2. Standalone ₹ values are treated as unconfirmed candidates, requiring verification.
 * 3. Distinguishes statutory MRP from offer prices, discount prices, and selling prices.
 * 4. Context-restricted OCR error repair (₹12O / ₹I20 -> ₹120) strictly within confirmed currency contexts.
 * 5. False-positive immunity: phone numbers, PIN codes, barcodes, batch numbers.
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
import { validateMRP } from './fieldValidators.js';

const MRP_HEADER_PATTERNS = [
  /(?:M\.?R\.?P\.?|MAX\.?\s*RETAIL\s*PRICE|MAXIMUM\s*RETAIL\s*PRICE)\s*(?:RS\.?|INR|₹)?\s*[:.-]?\s*([0-9OIl|SBG]+(?:\.[0-9OIl|SBG]{1,2})?)(?:\s*\/-)?/i,
  /(?:एम\.?आर\.?पी\.?|अधिकतम\s*खुदरा\s*मूल्य|खुदरा\s*मूल्य)\s*(?:रु\.?|रुपये|₹|RS\.?)?\s*[:.-]?\s*([0-9OIl|SBG]+(?:\.[0-9OIl|SBG]{1,2})?)(?:\s*\/-)?/i,
];

const STANDALONE_CURRENCY_PATTERNS = [
  /(?:\b(?:RS\.?|INR|रु\.?|रुपये)\b|₹)\s*[:.-]?\s*([0-9OIl|SBG]+(?:\.[0-9OIl|SBG]{1,2})?)(?:\s*\/-)?/i,
  /\b([0-9OIl|SBG]+(?:\.[0-9OIl|SBG]{1,2})?)\s*\/-/i,
];

const OFFER_PRICE_REGEX = /\b(?:OFFER|DISCOUNT|SPECIAL|DEAL|SELLING)\s*PRICE\b/i;

const FALSE_POSITIVE_NUMBERS = [
  /\b[1-9][0-9]{5}\b/, // 6-digit PIN code
  /(?:1800[- ]?[0-9]{3}[- ]?[0-9]{3,4})/, // Toll-free phone
  /\b(?:\+91[- ]?)?[6-9][0-9]{9}\b/, // Mobile phone
  /\b(?:BATCH|B\.?\s*NO|LOT)\b/i, // Batch indicator
];

export class MRPExtractor implements IDeclarationDetector {
  public readonly fieldType: DeclarationType = 'MRP';
  public readonly detectorName = 'MRPExtractor';

  public detect(context: DetectorContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const timestamp = new Date().toISOString();

    // 1. Direct Pattern Extraction
    for (const region of context.regions) {
      const text = region.text.trim();
      if (!text) continue;

      const hasExplicitLabel = /(?:M\.?R\.?P\.?|MAX\.?\s*RETAIL\s*PRICE|एम\.?आर\.?पी|अधिकतम\s*खुदरा\s*मूल्य)/i.test(text);
      const isOfferPrice = OFFER_PRICE_REGEX.test(text) && !hasExplicitLabel;

      if (isOfferPrice) continue; // Skip offer price regions without MRP label

      const hasCurrency = /(?:₹|\bRS\.?\b|\bINR\b|रु\.?|रुपये|\/-)/i.test(text);
      if (!hasCurrency && FALSE_POSITIVE_NUMBERS.some((fp) => fp.test(text))) {
        continue;
      }

      // Check explicit MRP patterns first
      for (const pattern of MRP_HEADER_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const rawNum = match[1];
          if (!/[0-9]/.test(rawNum)) continue;

          const norm = normalizeNumericString(rawNum, {
            fullLineContext: text,
            hint: 'CURRENCY',
          });

          if (norm.numericValue !== null && norm.numericValue > 0) {
            const validation = validateMRP(norm.numericValue, text, true);
            if (!validation.isValid) continue;

            const isAmbiguous = norm.isAmbiguous;
            const confidenceTier: ConfidenceTier = isAmbiguous
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
              fieldType: 'MRP',
              originalOCRText: text,
              normalizedText: `₹${norm.numericValue.toFixed(2)}`,
              normalizedValue: norm.numericValue,
              unit: 'INR',
              confidenceTier,
              nativeConfidence: region.confidence ?? null,
              isAmbiguous,
              correctionsApplied: norm.correctionsApplied,
              traceability,
              sourceRegion: region,
            };

            results.push({ candidate, score: 0.96 });
            break;
          }
        }
      }

      // Check standalone currency patterns if no explicit MRP matched on this region
      if (!results.some((r) => r.candidate.sourceRegion?.id === region.id)) {
        for (const pattern of STANDALONE_CURRENCY_PATTERNS) {
          const match = text.match(pattern);
          if (match && match[1]) {
            const rawNum = match[1];
            if (!/[0-9]/.test(rawNum)) continue;

            // Reject 6-digit PIN code matching currency pattern accidentally
            if (/^[1-9][0-9]{5}$/.test(rawNum)) continue;

            const norm = normalizeNumericString(rawNum, {
              fullLineContext: text,
              hint: 'CURRENCY',
            });

            if (norm.numericValue !== null && norm.numericValue > 0) {
              const validation = validateMRP(norm.numericValue, text, false);
              if (!validation.isValid) continue;

              // Standalone ₹ without explicit MRP label is an unconfirmed candidate
              const isAmbiguous = true;
              const confidenceTier: ConfidenceTier = 'MEDIUM_CONFIDENCE';

              const traceability: EvidenceTraceability = {
                sourceRegionIds: [region.id],
                originalImageId: context.imageId,
                originalBoundingBox: region.boundingBox,
                extractionMethod: 'DIRECT_PATTERN',
                ocrPassName: context.passName,
                validationStatus: 'REQUIRES_VERIFICATION',
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
                isAmbiguous,
                correctionsApplied: norm.correctionsApplied,
                traceability,
                sourceRegion: region,
              };

              results.push({ candidate, score: 0.70 });
              break;
            }
          }
        }
      }
    }

    // 2. Spatial Associations (Label "MRP" in one region, Value in adjacent region)
    const spatialAssocs = associateLabelsWithValues(context.regions).filter(
      (a) => a.label.type === 'MRP'
    );

    for (const assoc of spatialAssocs) {
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

    return results.sort((a, b) => b.score - a.score);
  }
}
