/**
 * Dedicated Date Extractor (Manufacture, Packing, Import & Expiry Separation)
 *
 * Implements strict, context-bound date extraction:
 * 1. Strictly separates:
 *    - DATE_OF_MANUFACTURE
 *    - DATE_OF_PACKAGING
 *    - DATE_OF_IMPORT
 *    - EXPIRY_DATE_BEST_BEFORE
 * 2. Never infers a date field from a bare month/year without contextual evidence.
 * 3. Never swaps MFD and EXP dates when both appear on the package.
 */

import type {
  DetectionResult,
  DetectorContext,
  EvidenceTraceability,
  IDeclarationDetector,
  StructuredDeclarationCandidate,
} from '../intelligence/candidateSchema.js';
import { validateDateCandidate } from './fieldValidators.js';

const DATE_VALUE_REGEX =
  '([0-9]{1,2}[\\/\\.-][0-9]{4}|[A-Za-z]{3,}[\\/\\.\\s-][0-9]{4}|[0-9]{1,2}[\\/\\.-][0-9]{1,2}[\\/\\.-][0-9]{2,4})';

// Dedicated Label Patterns
export const MFD_HEADER_PATTERNS = [
  new RegExp(
    `(?:(?:MFD|MFG|MANUFACTURED|MFR)(?:\\s*DATE)?|DATE\\s*OF\\s*(?:MFG|MFD|MANUFACTURE)|निर्माण\\s*(?:तिथि|दिनांक))\\s*[:.-]?\\s*${DATE_VALUE_REGEX}`,
    'i'
  ),
];

export const PKD_HEADER_PATTERNS = [
  new RegExp(
    `(?:(?:PACKED|PKD|PKG)(?:\\s*DATE)?|DATE\\s*OF\\s*(?:PACKAGING|PACKING|PKD)|पैकिंग\\s*(?:तिथि|दिनांक))\\s*[:.-]?\\s*${DATE_VALUE_REGEX}`,
    'i'
  ),
];

export const IMP_HEADER_PATTERNS = [
  new RegExp(
    `(?:(?:IMPORTED|IMPORT|IMP)(?:\\s*DATE)?|DATE\\s*OF\\s*(?:IMPORT|IMP)|आयात\\s*(?:तिथि|दिनांक))\\s*[:.-]?\\s*${DATE_VALUE_REGEX}`,
    'i'
  ),
];

export const EXP_HEADER_PATTERNS = [
  new RegExp(
    `(?:(?:BEST\\s*BEFORE|EXPIRY|EXP\\.?|USE\\s*BY|EXP\\s*DATE)|सर्वोत्तम\\s*उपयोग|उपयोग\\s*की\\s*अंतिम\\s*तिथि|समाप्ति\\s*तिथि)\\s*[:.-]?\\s*(?:${DATE_VALUE_REGEX}|([0-9]{1,2}\\s*(?:MONTHS|YEARS|महीने|वर्ष)))`,
    'i'
  ),
];

export class DateExtractor implements IDeclarationDetector {
  constructor(
    public readonly fieldType:
      | 'DATE_OF_MANUFACTURE'
      | 'DATE_OF_PACKAGING'
      | 'DATE_OF_IMPORT' = 'DATE_OF_PACKAGING'
  ) {}

  public get detectorName(): string {
    return `DateExtractor_${this.fieldType}`;
  }

  public detect(context: DetectorContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const timestamp = new Date().toISOString();

    let targetPatterns: RegExp[];
    switch (this.fieldType) {
      case 'DATE_OF_MANUFACTURE':
        targetPatterns = MFD_HEADER_PATTERNS;
        break;
      case 'DATE_OF_IMPORT':
        targetPatterns = IMP_HEADER_PATTERNS;
        break;
      case 'DATE_OF_PACKAGING':
      default:
        targetPatterns = PKD_HEADER_PATTERNS;
        break;
    }

    for (const region of context.regions) {
      const text = region.text.trim();
      if (!text) continue;

      // 1. First, check if this region is explicitly an EXPIRY date:
      // If so, do NOT allow it to be captured as manufacture or packing date!
      const isExpiry = EXP_HEADER_PATTERNS.some((expPat) => expPat.test(text));
      if (isExpiry) {
        continue;
      }

      // 2. Check target date patterns
      for (const pattern of targetPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const dateStr = match[1].trim();

          const validation = validateDateCandidate(dateStr, this.fieldType, true);
          if (!validation.isValid) continue;

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
            fieldType: this.fieldType,
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

    // 3. Fallback: bare date with no label
    // If no contextual date was found, check if a bare date appears in this region.
    // In strict accordance with Constraint 6, a bare date must NOT be blindly accepted.
    // It is marked as ambiguous with REQUIRES_VERIFICATION.
    if (results.length === 0 && this.fieldType === 'DATE_OF_PACKAGING') {
      const bareDateRegex = new RegExp(`\\b${DATE_VALUE_REGEX}\\b`, 'i');
      for (const region of context.regions) {
        const text = region.text.trim();
        // Reject if region contains any other header (MRP, NET QTY, EXP, BATCH)
        if (/(?:MRP|NET|QTY|EXP|BEST|BATCH|LOT|Rs|₹)/i.test(text)) continue;

        const match = text.match(bareDateRegex);
        if (match && match[1]) {
          const dateStr = match[1].trim();
          const validation = validateDateCandidate(dateStr, this.fieldType, false);
          if (!validation.isAmbiguous && !validation.isValid) continue;

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
            fieldType: this.fieldType,
            originalOCRText: text,
            normalizedText: dateStr,
            normalizedValue: dateStr,
            unit: null,
            confidenceTier: 'LOW_CONFIDENCE',
            nativeConfidence: region.confidence ?? null,
            isAmbiguous: true,
            correctionsApplied: ['BARE_DATE_UNCONFIRMED'],
            traceability,
            sourceRegion: region,
          };

          results.push({ candidate, score: 0.40 });
          break;
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}
