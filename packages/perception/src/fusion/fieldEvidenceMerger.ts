/**
 * Phase D: Field Evidence Merger
 *
 * Gathers and organizes evidence items from all available sources:
 * - Local Phase C structured candidates
 * - Remote Multimodal AI observations (Gemini / OpenAI)
 * - E-Commerce platform listings
 * - Human Inspector corrections
 *
 * Retains complete source provenance and ensures no source is overwritten.
 */

import type { Declaration, DeclarationType, EcommerceListing } from '@lm-vision/shared-types';
import type { StructuredDeclarationCandidate } from '../intelligence/candidateSchema.js';
import type { FieldEvidenceItem } from './evidenceSchema.js';

export interface InspectorCorrectionItem {
  declarationType?: string;
  originalValue?: unknown;
  correctedValue: unknown;
  reason?: string;
  inspectorUserId?: string;
  correctedAt?: string;
}

export interface GatheredFieldEvidence {
  fieldType: DeclarationType;
  items: FieldEvidenceItem[];
  inspectorCorrection?: InspectorCorrectionItem;
}

export interface MergeInput {
  localCandidates?: StructuredDeclarationCandidate[];
  localDeclarations?: Declaration[];
  remoteDeclarations?: Declaration[];
  remoteProvider?: 'GEMINI' | 'OPENAI' | 'GROK';
  ecommerceListing?: EcommerceListing;
  inspectorCorrections?: InspectorCorrectionItem[];
}

/**
 * Gathers and groups evidence items by DeclarationType across all active sources.
 */
export function gatherFieldEvidence(input: MergeInput): Map<DeclarationType, GatheredFieldEvidence> {
  const fieldMap = new Map<DeclarationType, GatheredFieldEvidence>();
  const now = new Date().toISOString();

  const getOrCreate = (type: DeclarationType): GatheredFieldEvidence => {
    let existing = fieldMap.get(type);
    if (!existing) {
      existing = { fieldType: type, items: [] };
      fieldMap.set(type, existing);
    }
    return existing;
  };

  // 1. Process Local Phase C Candidates
  if (input.localCandidates && input.localCandidates.length > 0) {
    for (const cand of input.localCandidates) {
      const fieldGroup = getOrCreate(cand.fieldType);
      const isConsensus =
        cand.traceability.ocrPassName === 'MULTI_PASS_CONSENSUS' ||
        cand.traceability.conflictStatus === 'CONSENSUS_RESOLVED';

      fieldGroup.items.push({
        sourceType: isConsensus ? 'LOCAL_CONSENSUS' : 'LOCAL_OCR',
        value: cand.normalizedValue,
        rawText: cand.originalOCRText,
        unit: cand.unit,
        confidenceTier: cand.confidenceTier,
        nativeConfidence: cand.nativeConfidence,
        evidenceRegionIds: cand.traceability.sourceRegionIds,
        boundingBox: cand.traceability.originalBoundingBox,
        sourceImageId: cand.traceability.originalImageId,
        surface: cand.surface || cand.traceability.surface,
        surfaceType: cand.surfaceType || cand.traceability.surfaceType,
        surfaceId: cand.surfaceId || cand.traceability.surfaceId,
        captureId: cand.captureId || cand.traceability.captureId,
        timestamp: cand.traceability.timestamp || now,
        metadata: {
          extractionMethod: cand.traceability.extractionMethod,
          correctionsApplied: cand.correctionsApplied,
          ocrPassName: cand.traceability.ocrPassName,
        },
      });
    }
  } else if (input.localDeclarations && input.localDeclarations.length > 0) {
    // Fallback: Use local declarations when structured candidates are not explicitly provided
    for (const decl of input.localDeclarations) {
      const fieldGroup = getOrCreate(decl.type);
      const confTier: import('../intelligence/candidateSchema.js').ConfidenceTier =
        decl.confidence >= 0.85
          ? 'HIGH_CONFIDENCE'
          : decl.confidence >= 0.60
          ? 'MEDIUM_CONFIDENCE'
          : 'LOW_CONFIDENCE';

      fieldGroup.items.push({
        sourceType: 'LOCAL_OCR',
        value: decl.normalizedValue,
        rawText: decl.rawText,
        unit: decl.unit,
        confidenceTier: confTier,
        nativeConfidence: decl.confidence,
        evidenceRegionIds: decl.region ? [decl.region.id] : [],
        boundingBox: decl.region?.boundingBox,
        sourceImageId: decl.region?.imageId,
        surface: decl.surface,
        surfaceType: decl.surfaceType,
        surfaceId: decl.surfaceId,
        captureId: decl.captureId,
        timestamp: now,
        metadata: {
          isFormatStandard: decl.isFormatStandard,
          detectedLanguage: decl.detectedLanguage,
        },
      });
    }
  }


  // 2. Process Remote AI Observations (Gemini / OpenAI / Grok)
  if (input.remoteDeclarations) {
    const aiSource = input.remoteProvider === 'OPENAI'
      ? 'OPENAI'
      : input.remoteProvider === 'GROK'
      ? 'GROK'
      : 'GEMINI';

    for (const decl of input.remoteDeclarations) {
      const fieldGroup = getOrCreate(decl.type);

      const confTier =
        decl.confidence >= 0.85
          ? 'HIGH_CONFIDENCE'
          : decl.confidence >= 0.60
          ? 'MEDIUM_CONFIDENCE'
          : 'LOW_CONFIDENCE';

      fieldGroup.items.push({
        sourceType: aiSource,
        value: decl.normalizedValue,
        rawText: decl.rawText,
        unit: decl.unit,
        confidenceTier: confTier,
        nativeConfidence: decl.confidence,
        evidenceRegionIds: decl.region ? [decl.region.id] : [],
        boundingBox: decl.region?.boundingBox,
        sourceImageId: decl.region?.imageId,
        timestamp: now,
        metadata: {
          isFormatStandard: decl.isFormatStandard,
          detectedLanguage: decl.detectedLanguage,
        },
      });
    }
  }

  // 3. Process E-Commerce Listing Supporting Evidence
  if (input.ecommerceListing) {
    const ecom = input.ecommerceListing;

    // MRP / Listing Price
    if (ecom.listedMrpInr !== undefined || ecom.listedPriceInr !== undefined) {
      const priceVal = ecom.listedMrpInr ?? ecom.listedPriceInr;
      const fieldGroup = getOrCreate('MRP');
      fieldGroup.items.push({
        sourceType: 'ECOMMERCE',
        value: priceVal,
        rawText: `Listed ₹${priceVal} on ${ecom.platformName}`,
        unit: 'INR',
        confidenceTier: 'MEDIUM_CONFIDENCE',
        timestamp: ecom.capturedAt || now,
        metadata: {
          platform: ecom.platformName,
          productUrl: ecom.productUrl,
          isExplicitMrp: ecom.listedMrpInr !== undefined,
        },
      });
    }

    // Net Quantity
    if (ecom.listedNetQuantity) {
      const fieldGroup = getOrCreate('NET_QUANTITY');
      fieldGroup.items.push({
        sourceType: 'ECOMMERCE',
        value: ecom.listedNetQuantity,
        rawText: ecom.listedNetQuantity,
        confidenceTier: 'MEDIUM_CONFIDENCE',
        timestamp: ecom.capturedAt || now,
        metadata: { platform: ecom.platformName },
      });
    }

    // Country of Origin
    if (ecom.listedCountryOfOrigin) {
      const fieldGroup = getOrCreate('COUNTRY_OF_ORIGIN');
      fieldGroup.items.push({
        sourceType: 'ECOMMERCE',
        value: ecom.listedCountryOfOrigin,
        rawText: ecom.listedCountryOfOrigin,
        confidenceTier: 'MEDIUM_CONFIDENCE',
        timestamp: ecom.capturedAt || now,
        metadata: { platform: ecom.platformName },
      });
    }

    // Manufacturer
    if (ecom.listedManufacturer) {
      const fieldGroup = getOrCreate('MANUFACTURER_NAME_ADDRESS');
      fieldGroup.items.push({
        sourceType: 'ECOMMERCE',
        value: ecom.listedManufacturer,
        rawText: ecom.listedManufacturer,
        confidenceTier: 'MEDIUM_CONFIDENCE',
        timestamp: ecom.capturedAt || now,
        metadata: { platform: ecom.platformName },
      });
    }
  }

  // 4. Process Human Inspector Corrections
  if (input.inspectorCorrections) {
    for (const corr of input.inspectorCorrections) {
      if (!corr.declarationType) continue;
      const declType = corr.declarationType as DeclarationType;
      const fieldGroup = getOrCreate(declType);

      fieldGroup.inspectorCorrection = corr;

      fieldGroup.items.push({
        sourceType: 'INSPECTOR',
        value: corr.correctedValue,
        confidenceTier: 'HIGH_CONFIDENCE',
        timestamp: corr.correctedAt || now,
        metadata: {
          reason: corr.reason,
          inspectorId: corr.inspectorUserId,
          originalValue: corr.originalValue,
        },
      });
    }
  }

  return fieldMap;
}
