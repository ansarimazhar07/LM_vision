/**
 * Dedicated Packer Name & Address Extractor
 *
 * Implements strict packer extraction:
 * 1. Detects statutory packer headers (English + Hindi).
 * 2. Recognizes explicit joint declarations ("Manufactured & Packed by: ...").
 * 3. Keeps packer strictly separate from manufacturer when distinct headers exist.
 * 4. Never infers packer = manufacturer unless explicitly stated in the text.
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

export const PACKER_HEADER_PATTERNS = [
  /(?:PACKED\s*BY|PKD\.?\s*BY|PACKER\s*:?|PACKING\s*BY)\s*[:.-]?\s*([^\n\r]*)/i,
  /(?:द्वारा\s*पैक|पैकर|पैकिंग\s*द्वारा)\s*[:.-]?\s*([^\n\r]*)/i,
];

export const JOINT_MFG_PKD_PATTERNS = [
  /(?:(?:MFD|MFG|MANUFACTURED)\s*(?:&|AND)\s*(?:PKD|PACKED)\s*BY)\s*[:.-]?\s*([^\n\r]*)/i,
  /(?:निर्मित\s*(?:एवं|और|व)\s*पैक\s*द्वारा)\s*[:.-]?\s*([^\n\r]*)/i,
];

export class PackerExtractor implements IDeclarationDetector {
  public readonly fieldType: DeclarationType = 'PACKER_NAME_ADDRESS';
  public readonly detectorName = 'PackerExtractor';

  public detect(context: DetectorContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const timestamp = new Date().toISOString();

    // 1. Check for explicit joint declarations: "Manufactured & Packed by: ABC..."
    for (const region of context.regions) {
      const text = region.text.trim();
      for (const pat of JOINT_MFG_PKD_PATTERNS) {
        const m = text.match(pat);
        if (m && m[1] && m[1].trim().length >= 4) {
          const entityText = m[1].trim();
          const hasPin = INDIAN_PIN_REGEX.test(entityText);

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
            fieldType: 'PACKER_NAME_ADDRESS',
            originalOCRText: text,
            normalizedText: entityText,
            normalizedValue: entityText,
            unit: null,
            confidenceTier: hasPin ? 'HIGH_CONFIDENCE' : 'MEDIUM_CONFIDENCE',
            nativeConfidence: region.confidence ?? null,
            isAmbiguous: false,
            correctionsApplied: ['JOINT_DECLARATION_IDENTIFIED'],
            traceability,
            sourceRegion: region,
          };

          results.push({ candidate, score: 0.95 });
          break;
        }
      }
    }

    if (results.length > 0) {
      return results;
    }

    // 2. Check bounded windows anchored on PACKER_NAME_ADDRESS
    const windows = extractBoundedWindows(context.regions, { maxLines: 5 }).filter(
      (w) => w.declarationType === 'PACKER_NAME_ADDRESS'
    );

    for (const win of windows) {
      let fullText = win.combinedText;

      for (const pat of PACKER_HEADER_PATTERNS) {
        fullText = fullText.replace(pat, '$1').trim();
      }

      const validation = validateEntityAddress(fullText, 'PACKER');
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
        fieldType: 'PACKER_NAME_ADDRESS',
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

      results.push({ candidate, score: hasPin ? 0.92 : 0.80 });
    }

    // 3. Fallback: single region direct pattern match
    if (results.length === 0) {
      for (const region of context.regions) {
        const text = region.text.trim();
        for (const pat of PACKER_HEADER_PATTERNS) {
          const m = text.match(pat);
          if (m && m[1] && m[1].trim().length >= 4) {
            const pkdText = m[1].trim();
            const hasPin = INDIAN_PIN_REGEX.test(pkdText);

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
              fieldType: 'PACKER_NAME_ADDRESS',
              originalOCRText: text,
              normalizedText: pkdText,
              normalizedValue: pkdText,
              unit: null,
              confidenceTier: hasPin ? 'HIGH_CONFIDENCE' : 'MEDIUM_CONFIDENCE',
              nativeConfidence: region.confidence ?? null,
              isAmbiguous: !hasPin,
              correctionsApplied: [],
              traceability,
              sourceRegion: region,
            };

            results.push({ candidate, score: hasPin ? 0.88 : 0.72 });
            break;
          }
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}
