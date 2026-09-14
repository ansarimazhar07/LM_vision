/**
 * Dedicated Consumer Care Details Extractor
 *
 * Implements strict consumer care contact extraction:
 * 1. Extracts toll-free numbers, landlines, mobile helplines, support emails, and portals.
 * 2. Requires consumer care context (CONSUMER CARE, CUSTOMER CARE, HELPLINE, FEEDBACK, ग्राहक सेवा).
 * 3. Contacts embedded inside manufacturer/packer addresses remain separate unless explicitly labeled as care details.
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
import {
  EMAIL_REGEX,
  PHONE_REGEX,
  TOLL_FREE_REGEX,
  validateConsumerCare,
} from './fieldValidators.js';

export const CONSUMER_CARE_HEADER_REGEX =
  /(?:CONSUMER\s*CARE|CUSTOMER\s*CARE|HELPLINE|FEEDBACK|QUERIES|COMPLAINTS|उपभोक्ता\s*सेवा|ग्राहक\s*सेवा|कस्टमर\s*केयर|हेल्पलाइन)\b/i;

const MFR_ADDRESS_CONTEXT_REGEX =
  /(?:MANUFACTURED|PACKED|IMPORTED|PRODUCED|Plot|Sector|MIDC|GIDC|RIICO|Pvt\.?\s*Ltd|Industrial\s*Area)\b/i;

export class ConsumerCareExtractor implements IDeclarationDetector {
  public readonly fieldType: DeclarationType = 'CONSUMER_CARE_DETAILS';
  public readonly detectorName = 'ConsumerCareExtractor';

  public detect(context: DetectorContext): DetectionResult[] {
    const results: DetectionResult[] = [];
    const timestamp = new Date().toISOString();

    for (const region of context.regions) {
      const text = region.text.trim();
      if (!text) continue;

      const hasCareHeader = CONSUMER_CARE_HEADER_REGEX.test(text);
      const hasMfrAddressContext = MFR_ADDRESS_CONTEXT_REGEX.test(text);

      // Constraint 7: If this region has manufacturer address context but NO consumer care header,
      // any telephone number inside is part of the address, NOT consumer care!
      if (hasMfrAddressContext && !hasCareHeader) {
        continue;
      }

      // Check for contacts
      const tollFreeMatch = text.match(TOLL_FREE_REGEX);
      const emailMatch = text.match(EMAIL_REGEX);
      const phoneMatch = text.match(PHONE_REGEX);

      if (hasCareHeader || tollFreeMatch || emailMatch) {
        const contactParts: string[] = [];
        if (tollFreeMatch) contactParts.push(tollFreeMatch[0]);
        if (phoneMatch && !contactParts.includes(phoneMatch[0])) contactParts.push(phoneMatch[0]);
        if (emailMatch) contactParts.push(emailMatch[0]);

        // If no explicit regex match but has care header, take text after header
        if (contactParts.length === 0 && hasCareHeader) {
          const stripped = text.replace(CONSUMER_CARE_HEADER_REGEX, '').replace(/^[:.-]/, '').trim();
          if (stripped.length >= 4) {
            contactParts.push(stripped);
          }
        }

        if (contactParts.length === 0) continue;

        const combinedContact = contactParts.join(' | ');
        const validation = validateConsumerCare(combinedContact, hasCareHeader);
        if (!validation.isValid && !validation.isAmbiguous) continue;

        const isAmbiguous = validation.isAmbiguous;
        const confidenceTier: ConfidenceTier = isAmbiguous
          ? 'MEDIUM_CONFIDENCE'
          : hasCareHeader
          ? 'HIGH_CONFIDENCE'
          : 'MEDIUM_CONFIDENCE';

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
          fieldType: 'CONSUMER_CARE_DETAILS',
          originalOCRText: text,
          normalizedText: combinedContact,
          normalizedValue: combinedContact,
          unit: null,
          confidenceTier,
          nativeConfidence: region.confidence ?? null,
          isAmbiguous,
          correctionsApplied: [],
          traceability,
          sourceRegion: region,
        };

        results.push({
          candidate,
          score: hasCareHeader ? 0.95 : 0.80,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}
