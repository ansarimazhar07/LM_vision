/**
 * Phase D: Hybrid Evidence Fusion Engine
 *
 * Implements multi-source evidence fusion reconciling:
 * - On-device Local OCR/CV Perception (ML Kit, Phase B CV, Phase C OCR Intelligence)
 * - Cloud Multimodal AI (Gemini / OpenAI via secure HTTPS backend)
 * - E-Commerce platform listings (external supporting discrepancy evidence)
 * - Human Inspector review & corrections
 *
 * ARCHITECTURAL PRINCIPLES & GUARDRAILS:
 * 1. AI observes. OCR extracts. Evidence fuses. Rules evaluate. Inspector decides.
 * 2. NEVER silently pick a winner when meaningful evidence conflicts.
 * 3. Confidence measures EVIDENCE QUALITY, not source count. Severely blurred images cap confidence.
 * 4. Inspector confirmation establishes human-verified truth while preserving all source evidence.
 * 5. E-Commerce discrepancies are external supporting evidence, never automatic legal violations.
 * 6. Legal status (PASS/FAIL/REQUIRES_VERIFICATION) and Evidence status (AGREEMENT/CONFLICT) are strictly decoupled.
 * 7. Traceability & provenance survive fusion intact.
 * 8. Zero cloud AI calls or secrets from client/mobile.
 */

import type {
  Declaration,
  DeclarationType,
  EcommerceListing,
  ImageQuality,
  PackageAnalysis,
  TextRegion,
} from '@lm-vision/shared-types';
import type {
  InspectorCorrectionProvenance,
  StructuredDeclarationCandidate,
} from '../intelligence/candidateSchema.js';
import type {
  EcommerceDiscrepancyEvidence,
  EvidenceStatus,
  FusedEvidencePackage,
  FusedFieldEvidence,
} from './evidenceSchema.js';

import { compareFieldValues } from './conflictResolver.js';
import { evaluateEvidenceConfidence } from './confidenceEngine.js';
import {
  gatherFieldEvidence,
  type InspectorCorrectionItem,
} from './fieldEvidenceMerger.js';

export interface FuseEvidenceInput {
  inspectionId?: string;
  localCandidates?: StructuredDeclarationCandidate[];
  localDeclarations?: Declaration[];
  localAnalysis?: PackageAnalysis;
  remoteDeclarations?: Declaration[];
  remoteAnalysis?: PackageAnalysis;
  remoteProvider?: 'GEMINI' | 'OPENAI' | 'GROK';
  ecommerceListing?: EcommerceListing;
  inspectorCorrections?: InspectorCorrectionItem[];
  quality?: ImageQuality;
  aiAvailable?: boolean;
  aiErrorReason?: string;
  existingCompletedDecision?: {
    overallStatus?: string;
    inspectorConfirmed?: boolean;
    timestamp?: string;
  };
}

export interface FuseEvidenceResult {
  fusedPackage: FusedEvidencePackage;
  declarations: Declaration[];
  packageAnalysis: PackageAnalysis;
}

const DEFAULT_QUALITY: ImageQuality = {
  overallScore: 0.85,
  isAcceptable: true,
  sharpness: 80,
  brightness: 75,
  glareDetected: false,
  blurDetected: false,
  shadowDetected: false,
  warnings: [],
};

/**
 * Executes hybrid evidence fusion across all available sources.
 */
export function fuseEvidence(input: FuseEvidenceInput): FuseEvidenceResult {
  const startTime = Date.now();
  const inspectionId =
    input.inspectionId ||
    (input.localAnalysis?.rawResponse?.inspectionId as string) ||
    '00000000-0000-0000-0000-000000000000';

  const quality: ImageQuality =
    input.quality ||
    input.localAnalysis?.quality ||
    input.remoteAnalysis?.quality ||
    DEFAULT_QUALITY;

  // Extract local candidates / declarations
  let localCandidates = input.localCandidates;
  if (!localCandidates && input.localAnalysis?.rawResponse?.phaseC) {
    const pc = input.localAnalysis.rawResponse.phaseC as Record<string, unknown>;
    if (Array.isArray(pc.structuredCandidates)) {
      localCandidates = pc.structuredCandidates as StructuredDeclarationCandidate[];
    }
  }

  const localDeclarations = input.localDeclarations || input.localAnalysis?.declarations;
  const remoteDeclarations = input.remoteDeclarations || input.remoteAnalysis?.declarations;
  const remoteProvider = input.remoteProvider || (
    input.remoteAnalysis?.provider === 'OPENAI'
      ? 'OPENAI'
      : input.remoteAnalysis?.provider === 'GROK'
      ? 'GROK'
      : 'GEMINI'
  );

  // Gather evidence across sources
  const gatheredFieldMap = gatherFieldEvidence({
    localCandidates,
    localDeclarations,
    remoteDeclarations,
    remoteProvider,
    ecommerceListing: input.ecommerceListing,
    inspectorCorrections: input.inspectorCorrections,
  });

  const fusedFields: Record<string, FusedFieldEvidence> = {};
  let conflictingFieldCount = 0;
  let inspectorConfirmedFieldCount = 0;

  for (const [fieldType, gathered] of gatheredFieldMap.entries()) {
    const items = gathered.items;
    const inspectorCorr = gathered.inspectorCorrection;

    // Filter evidence by source category
    const localItems = items.filter(
      (i) => i.sourceType === 'LOCAL_OCR' || i.sourceType === 'LOCAL_CONSENSUS'
    );
    const aiItems = items.filter(
      (i) => i.sourceType === 'GEMINI' || i.sourceType === 'OPENAI' || i.sourceType === 'GROK'
    );
    const ecomItems = items.filter((i) => i.sourceType === 'ECOMMERCE');

    const primaryLocal = localItems[0];
    const primaryAi = aiItems[0];

    // CASE 1: Human Inspector Confirmation
    if (inspectorCorr) {
      inspectorConfirmedFieldCount++;
      const inspectorProvenance: InspectorCorrectionProvenance = {
        originalCandidate: inspectorCorr.originalValue,
        correctedCandidate: inspectorCorr.correctedValue,
        source: 'INSPECTOR_CORRECTED',
        reason: inspectorCorr.reason,
        inspectorId: inspectorCorr.inspectorUserId,
        correctedAt: inspectorCorr.correctedAt || new Date().toISOString(),
      };

      // Check if later AI evidence arrived that conflicts with human inspector decision
      let pendingReview = false;
      let reviewNotice = '';
      if (primaryAi && primaryAi.value != null) {
        const aiComparison = compareFieldValues(
          fieldType,
          inspectorCorr.correctedValue,
          null,
          primaryAi.value,
          primaryAi.unit
        );
        if (!aiComparison.isEqual) {
          pendingReview = true;
          reviewNotice = `New AI evidence (${String(primaryAi.value)}) differs from human decision. Review required.`;
        }
      }

      fusedFields[fieldType] = {
        fieldType,
        fusedValue: inspectorCorr.correctedValue,
        evidenceStatus: 'INSPECTOR_CONFIRMED',
        confidenceTier: 'HIGH_CONFIDENCE',
        isAmbiguous: false,
        sources: items,
        primarySource: 'INSPECTOR',
        explanation: `Human Inspector confirmed observation: '${String(inspectorCorr.correctedValue)}'. All raw source observations preserved. ${reviewNotice}`.trim(),
        inspectorCorrection: inspectorProvenance,
        pendingReview,
      };
      continue;
    }

    // CASE 2: Both Local Perception and Cloud AI observed
    if (primaryLocal && primaryAi) {
      // Guardrail 7 & 8: Check for partial or unsupported observations
      const localHasValue = primaryLocal.value != null && String(primaryLocal.value).trim().length > 0;
      const aiHasValue = primaryAi.value != null && String(primaryAi.value).trim().length > 0;

      // Check if local detected only label (e.g. "MRP" without amount) while AI detected value
      const isLocalLabelOnly =
        !localHasValue &&
        primaryLocal.rawText &&
        /^(mrp|m\.r\.p\.|net wt|net qty|pkg|mfg|exp|batch)$/i.test(primaryLocal.rawText.trim());

      if (isLocalLabelOnly && aiHasValue) {
        // Guardrail 8: PARTIAL EVIDENCE MUST REMAIN PARTIAL
        const conf = evaluateEvidenceConfidence({
          items,
          hasConflict: false,
          isPartial: true,
          isInspectorConfirmed: false,
          quality,
        });

        fusedFields[fieldType] = {
          fieldType,
          fusedValue: primaryAi.value,
          fusedUnit: primaryAi.unit,
          evidenceStatus: 'PARTIAL',
          confidenceTier: conf,
          isAmbiguous: false,
          sources: items,
          primarySource: primaryAi.sourceType,
          explanation: `Partial observation: Local detected label only ('${primaryLocal.rawText}'); ${primaryAi.sourceType} observed value '${String(primaryAi.value)}'.`,
        };
      } else if (localHasValue && aiHasValue) {
        // Compare field values with deterministic, field-aware comparison
        const comparison = compareFieldValues(
          fieldType,
          primaryLocal.value,
          primaryLocal.unit,
          primaryAi.value,
          primaryAi.unit
        );

        if (comparison.isEqual) {
          // Both agree!
          const conf = evaluateEvidenceConfidence({
            items,
            hasConflict: false,
            isPartial: false,
            isInspectorConfirmed: false,
            quality,
          });

          fusedFields[fieldType] = {
            fieldType,
            fusedValue: comparison.normalizedA ?? primaryLocal.value,
            fusedUnit: primaryLocal.unit ?? primaryAi.unit,
            evidenceStatus: 'AGREEMENT',
            confidenceTier: conf,
            isAmbiguous: false,
            sources: items,
            primarySource: primaryLocal.sourceType,
            explanation: `Multi-source agreement: Local OCR and ${primaryAi.sourceType} corroborate '${String(primaryLocal.value)}'.`,
          };
        } else {
          // Guardrail 4: REAL CONFLICT! NEVER SILENTLY PICK A WINNER!
          conflictingFieldCount++;
          fusedFields[fieldType] = {
            fieldType,
            fusedValue: null, // Zero silent winner
            fusedUnit: primaryLocal.unit ?? primaryAi.unit,
            evidenceStatus: 'CONFLICT',
            confidenceTier: 'CONFLICT',
            isAmbiguous: true,
            sources: items,
            primarySource: primaryLocal.sourceType,
            explanation: `Contradiction detected: Local OCR observed '${String(primaryLocal.value)}', but ${primaryAi.sourceType} observed '${String(primaryAi.value)}'. Requires inspector verification.`,
            discrepancyReason: comparison.reason,
          };
        }
      } else if (localHasValue && !aiHasValue) {
        // Local has value, AI has nothing
        const conf = evaluateEvidenceConfidence({
          items,
          hasConflict: false,
          isPartial: false,
          isInspectorConfirmed: false,
          quality,
        });

        fusedFields[fieldType] = {
          fieldType,
          fusedValue: primaryLocal.value,
          fusedUnit: primaryLocal.unit,
          evidenceStatus: 'AGREEMENT',
          confidenceTier: conf,
          isAmbiguous: false,
          sources: items,
          primarySource: primaryLocal.sourceType,
          explanation: `Local perception observed '${String(primaryLocal.value)}' (${primaryLocal.sourceType}).`,
        };
      } else if (!localHasValue && aiHasValue) {
        // AI has value, Local has nothing
        // Guardrail 7: AI evidence must be evidence-backed (must have region or decent native confidence)
        const hasEvidenceRegion = primaryAi.boundingBox !== undefined || (primaryAi.evidenceRegionIds && primaryAi.evidenceRegionIds.length > 0);
        const hasGoodConfidence = primaryAi.nativeConfidence !== undefined && primaryAi.nativeConfidence !== null && primaryAi.nativeConfidence >= 0.60;

        if (!hasEvidenceRegion && !hasGoodConfidence) {
          // Unsupported AI claim
          fusedFields[fieldType] = {
            fieldType,
            fusedValue: null,
            evidenceStatus: 'INSUFFICIENT',
            confidenceTier: 'LOW_CONFIDENCE',
            isAmbiguous: true,
            sources: items,
            primarySource: primaryAi.sourceType,
            explanation: `Uncorroborated AI observation '${String(primaryAi.value)}' lacks supporting visual region and native confidence.`,
          };
        } else {
          const conf = evaluateEvidenceConfidence({
            items,
            hasConflict: false,
            isPartial: !hasEvidenceRegion,
            isInspectorConfirmed: false,
            quality,
          });

          fusedFields[fieldType] = {
            fieldType,
            fusedValue: primaryAi.value,
            fusedUnit: primaryAi.unit,
            evidenceStatus: 'PARTIAL',
            confidenceTier: conf,
            isAmbiguous: false,
            sources: items,
            primarySource: primaryAi.sourceType,
            explanation: `Observation from cloud AI (${primaryAi.sourceType}): '${String(primaryAi.value)}'.`,
          };
        }
      }
      continue;
    }

    // CASE 3: Only Local Perception observed (Offline / AI unavailable)
    if (primaryLocal) {
      const conf = evaluateEvidenceConfidence({
        items,
        hasConflict: false,
        isPartial: primaryLocal.value == null,
        isInspectorConfirmed: false,
        quality,
      });

      fusedFields[fieldType] = {
        fieldType,
        fusedValue: primaryLocal.value,
        fusedUnit: primaryLocal.unit,
        evidenceStatus: primaryLocal.value != null ? 'AGREEMENT' : 'PARTIAL',
        confidenceTier: conf,
        isAmbiguous: false,
        sources: items,
        primarySource: primaryLocal.sourceType,
        explanation: `On-device perception observation: '${String(primaryLocal.value)}' (${primaryLocal.sourceType}).`,
      };
      continue;
    }

    // CASE 4: Only Cloud AI observed
    if (primaryAi) {
      const hasEvidenceRegion =
        primaryAi.boundingBox !== undefined ||
        (primaryAi.evidenceRegionIds && primaryAi.evidenceRegionIds.length > 0);
      const hasGoodConfidence =
        primaryAi.nativeConfidence !== undefined &&
        primaryAi.nativeConfidence !== null &&
        primaryAi.nativeConfidence >= 0.60;

      if (!hasEvidenceRegion && !hasGoodConfidence) {
        // Guardrail 7: Unsupported AI claim without local corroboration or visual region
        fusedFields[fieldType] = {
          fieldType,
          fusedValue: null,
          evidenceStatus: 'INSUFFICIENT',
          confidenceTier: 'LOW_CONFIDENCE',
          isAmbiguous: true,
          sources: items,
          primarySource: primaryAi.sourceType,
          explanation: `Uncorroborated AI observation '${String(primaryAi.value)}' lacks supporting visual region and native confidence.`,
        };
      } else {
        const conf = evaluateEvidenceConfidence({
          items,
          hasConflict: false,
          isPartial: !hasEvidenceRegion,
          isInspectorConfirmed: false,
          quality,
        });

        fusedFields[fieldType] = {
          fieldType,
          fusedValue: primaryAi.value,
          fusedUnit: primaryAi.unit,
          evidenceStatus: 'PARTIAL',
          confidenceTier: conf,
          isAmbiguous: false,
          sources: items,
          primarySource: primaryAi.sourceType,
          explanation: `Cloud AI observation: '${String(primaryAi.value)}' (${primaryAi.sourceType}).`,
        };
      }
      continue;
    }


    // CASE 5: Only E-Commerce observed (Cannot create legal declaration on its own)
    if (ecomItems.length > 0) {
      fusedFields[fieldType] = {
        fieldType,
        fusedValue: null,
        evidenceStatus: 'INSUFFICIENT',
        confidenceTier: 'INSUFFICIENT_EVIDENCE',
        isAmbiguous: false,
        sources: items,
        primarySource: 'ECOMMERCE',
        explanation: `E-commerce listing detected '${String(ecomItems[0]?.value)}', but packaging label observation is missing.`,
      };
    }
  }

  // Guardrail 9: Check E-Commerce Discrepancies (External supporting evidence only)
  if (input.ecommerceListing) {
    const ecom = input.ecommerceListing;
    const mrpField = fusedFields['MRP'];
    if (mrpField && mrpField.fusedValue !== null && mrpField.fusedValue !== undefined) {
      const physicalMrp = typeof mrpField.fusedValue === 'number'
        ? mrpField.fusedValue
        : parseFloat(String(mrpField.fusedValue));

      const onlinePrice = ecom.listedMrpInr ?? ecom.listedPriceInr;

      if (!isNaN(physicalMrp) && onlinePrice !== undefined) {
        const hasDiscrepancy = Math.abs(physicalMrp - onlinePrice) >= 0.01;
        const ecomDisc: EcommerceDiscrepancyEvidence = {
          platform: ecom.platformName,
          physicalValue: physicalMrp,
          listedValue: onlinePrice,
          hasDiscrepancy,
          explanation: hasDiscrepancy
            ? `Printed packaging MRP is ₹${physicalMrp.toFixed(2)}, but online catalog listing on ${ecom.platformName} is ₹${onlinePrice.toFixed(2)}.`
            : `Packaging MRP matches ${ecom.platformName} online listing price (₹${physicalMrp.toFixed(2)}).`,
          timestamp: ecom.capturedAt || new Date().toISOString(),
        };
        mrpField.ecommerceDiscrepancy = ecomDisc;
      }
    }
  }

  // Determine overall status
  const hasConflicts = conflictingFieldCount > 0;
  let overallStatus: EvidenceStatus = 'AGREEMENT';
  if (hasConflicts) {
    overallStatus = 'CONFLICT';
  } else if (inspectorConfirmedFieldCount > 0) {
    overallStatus = 'INSPECTOR_CONFIRMED';
  } else if (Object.values(fusedFields).some((f) => f.evidenceStatus === 'PARTIAL')) {
    overallStatus = 'PARTIAL';
  } else if (Object.keys(fusedFields).length === 0) {
    overallStatus = 'INSUFFICIENT';
  }

  const aiAvailable = input.aiAvailable ?? (
    input.remoteDeclarations !== undefined && input.remoteDeclarations.length > 0
  );

  const fusedPackage: FusedEvidencePackage = {
    inspectionId,
    fields: fusedFields,
    overallStatus,
    hasConflicts,
    conflictingFieldCount,
    aiAvailable,
    aiProviderName: aiAvailable ? remoteProvider : undefined,
    fusedAt: new Date().toISOString(),
    latencyMs: Date.now() - startTime,
    newEvidenceAfterDecision:
      input.existingCompletedDecision?.inspectorConfirmed === true &&
      (hasConflicts || Object.values(fusedFields).some((f) => f.pendingReview === true)),
  };


  // Convert fused fields into canonical Declaration[] for downstream Rule Engine
  const canonicalDeclarations: Declaration[] = [];

  for (const [fieldTypeStr, field] of Object.entries(fusedFields)) {
    const fieldType = fieldTypeStr as DeclarationType;

    // Find calibrated region from local source
    const localItem = field.sources.find(
      (s) => s.sourceType === 'LOCAL_OCR' || s.sourceType === 'LOCAL_CONSENSUS'
    );
    const aiItem = field.sources.find(
      (s) => s.sourceType === 'GEMINI' || s.sourceType === 'OPENAI' || s.sourceType === 'GROK'
    );

    let region: TextRegion | undefined;
    if (localItem && localItem.boundingBox) {
      region = {
        id: localItem.evidenceRegionIds?.[0] || `region-${fieldType}`,
        imageId: localItem.sourceImageId || '00000000-0000-0000-0000-000000000000',
        surface: localItem.surface || 'FRONT',
        boundingBox: localItem.boundingBox,
        text: localItem.rawText || String(localItem.value || ''),
        confidence: localItem.nativeConfidence ?? 0.85,
      };
    } else if (aiItem && aiItem.boundingBox) {
      region = {
        id: aiItem.evidenceRegionIds?.[0] || `region-ai-${fieldType}`,
        imageId: aiItem.sourceImageId || '00000000-0000-0000-0000-000000000000',
        surface: aiItem.surface || 'FRONT',
        boundingBox: aiItem.boundingBox,
        text: aiItem.rawText || String(aiItem.value || ''),
        confidence: aiItem.nativeConfidence ?? 0.85,
      };
    }

    if (field.evidenceStatus === 'CONFLICT') {
      // Guardrail 4 & 10: CONFLICT is represented honestly.
      // We emit confidence: 0.35 (below 0.45) so Rule Engine evaluates as REQUIRES_VERIFICATION / INSUFFICIENT_EVIDENCE
      // rather than manufacturing an artificial violation or picking a winner.
      const localVal = localItem ? String(localItem.value) : 'unobserved';
      const aiVal = aiItem ? String(aiItem.value) : 'unobserved';

      canonicalDeclarations.push({
        type: fieldType,
        rawText: `CONFLICT: Local OCR observed '${localVal}' vs AI observed '${aiVal}'`,
        normalizedValue: null,
        unit: field.fusedUnit || null,
        confidence: 0.35,
        region,
        isFormatStandard: false,
        detectedLanguage: 'en',
      });
    } else if (field.evidenceStatus === 'INSPECTOR_CONFIRMED') {
      canonicalDeclarations.push({
        type: fieldType,
        rawText: String(field.fusedValue ?? ''),
        normalizedValue: field.fusedValue as string | number | null,
        unit: field.fusedUnit || null,
        confidence: 0.99,
        region,
        isFormatStandard: true,
        detectedLanguage: 'en',
      });
    } else {
      // AGREEMENT or PARTIAL
      const confNum =
        field.confidenceTier === 'HIGH_CONFIDENCE'
          ? 0.95
          : field.confidenceTier === 'MEDIUM_CONFIDENCE'
          ? 0.75
          : 0.40;

      const rawText =
        localItem?.rawText ||
        aiItem?.rawText ||
        String(field.fusedValue ?? '');

      canonicalDeclarations.push({
        type: fieldType,
        rawText,
        normalizedValue: field.fusedValue as string | number | null,
        unit: field.fusedUnit || null,
        confidence: confNum,
        region,
        isFormatStandard: field.evidenceStatus === 'AGREEMENT',
        detectedLanguage: /[\u0900-\u097F]/.test(rawText) ? 'hi' : 'en',
      });
    }
  }

  // Preserve existing PackageAnalysis structure (Guardrail 1)
  const packageAnalysis: PackageAnalysis = {
    provider: (aiAvailable ? 'HYBRID' : 'LOCAL_OCR') as any,
    modelName: aiAvailable ? `hybrid-fusion-${remoteProvider.toLowerCase()}` : 'local-evidence-fusion-v1',
    quality,
    declarations: canonicalDeclarations,
    textRegions: input.localAnalysis?.textRegions || [],
    visualMeasurements: input.localAnalysis?.visualMeasurements || [],
    rawResponse: {
      ...input.localAnalysis?.rawResponse,
      phase: 'PHASE_D_HYBRID_EVIDENCE_FUSION',
      phaseD: fusedPackage,
    },
    latencyMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };

  return {
    fusedPackage,
    declarations: canonicalDeclarations,
    packageAnalysis,
  };
}
