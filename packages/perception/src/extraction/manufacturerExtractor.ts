/**
 * Dedicated Manufacturer Name & Address Extractor
 *
 * Implements robust entity and multi-line address extraction:
 * 1. Detects statutory manufacturer headers (English + Hindi).
 * 2. Uses bounded evidence windows to group company name and multi-line address.
 * 3. Stops immediately when a competing declaration header (PACKED BY, MRP, etc.) begins.
 * 4. Groups address structure with or without a 6-digit Indian PIN code.
 * 5. Strictly isolates manufacturer from packer, importer, and marketer.
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

export const MFR_HEADER_PATTERNS = [
  /(?:MFD\.?\s*BY|MFG\.?\s*BY|MANUFACTURED\s*BY|MANUFACTURER\s*:?|PRODUCED\s*BY|MADE\s*BY)\s*[:.-]?\s*([^\n\r]*)/i,
  /(?:निर्माता|द्वारा\s*निर्मित|उत्पादक)\s*[:.-]?\s*([^\n\r]*)/i,
];

export class ManufacturerExtractor implements IDeclarationDetector {
  public readonly fieldType: DeclarationType = 'MANUFACTURER_NAME_ADDRESS';
  public readonly detectorName = 'ManufacturerExtractor';

  public detect(context: DetectorContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const timestamp = new Date().toISOString();

    // 1. First, search bounded windows anchored on MANUFACTURER_NAME_ADDRESS
    const windows = extractBoundedWindows(context.regions, { maxLines: 5 }).filter(
      (w) => w.declarationType === 'MANUFACTURER_NAME_ADDRESS'
    );

    for (const win of windows) {
      let fullText = win.combinedText;

      // Strip the header prefix itself from the fullText to get pure entity + address
      for (const pat of MFR_HEADER_PATTERNS) {
        fullText = fullText.replace(pat, '$1').trim();
      }

      const validation = validateEntityAddress(fullText, 'MANUFACTURER');
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
        fieldType: 'MANUFACTURER_NAME_ADDRESS',
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

      results.push({
        candidate,
        score: hasPin ? 0.95 : 0.82,
      });
    }

    // 2. Fallback: single-line direct pattern match if no window was formed
    if (results.length === 0) {
      for (const region of context.regions) {
        const text = region.text.trim();
        for (const pat of MFR_HEADER_PATTERNS) {
          const m = text.match(pat);
          if (m && m[1] && m[1].trim().length >= 5) {
            const mfrText = m[1].trim();
            const hasPin = INDIAN_PIN_REGEX.test(mfrText);

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
              normalizedText: mfrText,
              normalizedValue: mfrText,
              unit: null,
              confidenceTier: hasPin ? 'HIGH_CONFIDENCE' : 'MEDIUM_CONFIDENCE',
              nativeConfidence: region.confidence ?? null,
              isAmbiguous: !hasPin,
              correctionsApplied: [],
              traceability,
              sourceRegion: region,
            };

            results.push({ candidate, score: hasPin ? 0.90 : 0.75 });
            break;
          }
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}
