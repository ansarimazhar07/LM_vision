/**
 * Dedicated Importer Name & Address Extractor
 *
 * Implements strict importer extraction for imported packaged commodities:
 * 1. Detects statutory importer headers (English + Hindi).
 * 2. Uses bounded evidence windows to group importer entity name and address.
 * 3. Never infers importer = manufacturer.
 * 4. Works with or without a 6-digit Indian PIN code.
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
import { extractBoundedWindows } from './declarationWindowing.js';
import { INDIAN_PIN_REGEX, validateEntityAddress } from './fieldValidators.js';

export const IMPORTER_HEADER_PATTERNS = [
  /(?:IMPORTED\s*BY|IMPORTER\s*:?|IMP\.?\s*BY)\s*[:.-]?\s*([^\n\r]*)/i,
  /(?:आयातकर्ता|द्वारा\s*आयातित|आयात\s*द्वारा)\s*[:.-]?\s*([^\n\r]*)/i,
];

export class ImporterExtractor implements IDeclarationDetector {
  public readonly fieldType: DeclarationType = 'IMPORTER_NAME_ADDRESS';
  public readonly detectorName = 'ImporterExtractor';

  public detect(context: DetectorContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const timestamp = new Date().toISOString();

    // 1. Search bounded windows anchored on IMPORTER_NAME_ADDRESS
    const windows = extractBoundedWindows(context.regions, { maxLines: 5 }).filter(
      (w) => w.declarationType === 'IMPORTER_NAME_ADDRESS'
    );

    for (const win of windows) {
      let fullText = win.combinedText;

      for (const pat of IMPORTER_HEADER_PATTERNS) {
        fullText = fullText.replace(pat, '$1').trim();
      }

      const validation = validateEntityAddress(fullText, 'IMPORTER');
      if (!validation.isValid) continue;

      const hasPin = INDIAN_PIN_REGEX.test(fullText);
      const confidenceTier: ConfidenceTier = hasPin ? 'HIGH_CONFIDENCE' : 'MEDIUM_CONFIDENCE';

      const traceability: EvidenceTraceability = {
        sourceRegionIds: [win.anchorRegion.id, ...win.bodyRegions.map((r) => r.id)],
        originalImageId: context.imageId,
        originalBoundingBox: win.compositeBoundingBox,
        extractionMethod: 'SPATIAL_ASSOCIATION',
        ocrPassName: context.passName,
        validationStatus: validation.isAmbiguous ? 'REQUIRES_VERIFICATION' : 'VALID',
        conflictStatus: 'NONE',
        timestamp,
      };

      const candidate: StructuredDeclarationCandidate = {
        fieldType: 'IMPORTER_NAME_ADDRESS',
        originalOCRText: win.combinedText,
        normalizedText: fullText,
        normalizedValue: fullText,
        unit: null,
        confidenceTier,
        nativeConfidence: win.anchorRegion.confidence ?? null,
        isAmbiguous: validation.isAmbiguous,
        correctionsApplied: [],
        traceability,
        sourceRegion: win.anchorRegion,
      };

      results.push({ candidate, score: hasPin ? 0.94 : 0.80 });
    }

    // 2. Fallback: single region direct pattern match
    if (results.length === 0) {
      for (const region of context.regions) {
        const text = region.text.trim();
        for (const pat of IMPORTER_HEADER_PATTERNS) {
          const m = text.match(pat);
          if (m && m[1] && m[1].trim().length >= 4) {
            const impText = m[1].trim();
            const hasPin = INDIAN_PIN_REGEX.test(impText);

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
              fieldType: 'IMPORTER_NAME_ADDRESS',
              originalOCRText: text,
              normalizedText: impText,
              normalizedValue: impText,
              unit: null,
              confidenceTier: hasPin ? 'HIGH_CONFIDENCE' : 'MEDIUM_CONFIDENCE',
              nativeConfidence: region.confidence ?? null,
              isAmbiguous: !hasPin,
              correctionsApplied: [],
              traceability,
              sourceRegion: region,
            };

            results.push({ candidate, score: hasPin ? 0.90 : 0.74 });
            break;
          }
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}
