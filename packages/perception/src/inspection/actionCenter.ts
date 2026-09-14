/**
 * Phase E: Inspector Action Center & Prioritized Action Queue
 *
 * ARCHITECTURAL GUARDRAILS:
 * 1. Action items are deterministic based on actual evidence and Rule Engine findings.
 * 2. Zero AI-generated subjective severity — uses explicit deterministic priority.
 * 3. Prioritizes:
 *    P1_CRITICAL: OCR/AI Conflicts, Required Inspector Corrections
 *    P2_HIGH: Needs Verification findings, Statutory Non-Compliance, Missing Mandatory Evidence
 *    P3_ADVISORY: Image quality advisories, E-Commerce price discrepancies (observational)
 */

import type { ImageQuality } from '@lm-vision/shared-types';
import type { FusedEvidencePackage } from '../fusion/evidenceSchema.js';
import type {
  EcommerceDiscrepancyAnalysis,
  EvidenceCompletenessAnalysis,
  ExplainableFinding,
  InspectorActionItem,
} from './findingSchema.js';

export interface GenerateActionQueueInput {
  readonly findings: readonly ExplainableFinding[];
  readonly completeness: EvidenceCompletenessAnalysis;
  readonly fusedPackage?: FusedEvidencePackage;
  readonly imageQuality?: ImageQuality;
  readonly ecommerceDiscrepancy?: EcommerceDiscrepancyAnalysis | null;
}

export function generateInspectorActionQueue(
  input: GenerateActionQueueInput
): InspectorActionItem[] {
  const { findings, completeness, fusedPackage, imageQuality, ecommerceDiscrepancy } = input;
  const items: InspectorActionItem[] = [];

  // 1. Unresolved Multi-Source Observation Conflicts (P1_CRITICAL)
  if (fusedPackage && fusedPackage.hasConflicts) {
    Object.entries(fusedPackage.fields).forEach(([field, fusion]) => {
      if (fusion.evidenceStatus === 'CONFLICT') {
        const localVal = fusion.sources.find((s) => s.sourceType.startsWith('LOCAL'))?.value;
        const aiVal = fusion.sources.find((s) => s.sourceType === 'GEMINI' || s.sourceType === 'OPENAI')?.value;
        items.push({
          id: `act-conflict-${field.toLowerCase()}`,
          type: 'OCR_AI_CONFLICT',
          title: `Evidence Conflict: ${field.replace(/_/g, ' ')}`,
          description: `Local OCR observed '${String(localVal ?? 'N/A')}' vs Cloud AI '${String(aiVal ?? 'N/A')}'. Reconcile multi-source observations.`,
          priority: 'P1_CRITICAL',
          relatedField: field as any,
          suggestedAction: 'Inspect physical package and confirm authoritative declared value.',
          resolved: Boolean(fusion.inspectorCorrection),
        });
      }
    });
  }

  // 2. Pending Human Reviews & Verifications from Rule Engine (P2_HIGH)
  findings.forEach((f) => {
    if (f.legalAssessment === 'REQUIRES_VERIFICATION') {
      items.push({
        id: `act-verify-${f.id}`,
        type: 'NEEDS_VERIFICATION',
        title: `Verification Required: ${f.ruleTitle}`,
        description: f.explanation,
        priority: 'P2_HIGH',
        relatedRuleId: f.ruleId,
        suggestedAction: f.suggestedInspectorAction || 'Review physical declaration against statutory rule.',
        resolved: false,
      });
    } else if (f.legalAssessment === 'INSUFFICIENT_EVIDENCE') {
      items.push({
        id: `act-insufficient-${f.id}`,
        type: 'MISSING_DECLARATION_EVIDENCE',
        title: `Insufficient Evidence: ${f.ruleTitle}`,
        description: f.explanation,
        priority: 'P2_HIGH',
        relatedRuleId: f.ruleId,
        suggestedAction: f.insufficientEvidenceDetails?.suggestedCaptureAction || 'Capture closer photograph of declaration.',
        resolved: false,
      });
    }
  });

  // 3. Evidence Completeness Missing Categories (P2_HIGH)
  completeness.items.forEach((item, idx) => {
    if (item.isApplicable && item.presenceStatus === 'MISSING_EVIDENCE') {
      // Avoid duplicating if already covered by an assessment finding
      const alreadyCovered = items.some((it) => it.relatedField === item.fieldType);
      if (!alreadyCovered) {
        items.push({
          id: `act-missing-ev-${idx}`,
          type: 'MISSING_DECLARATION_EVIDENCE',
          title: `Missing Evidence: ${item.category}`,
          description: item.details || `No usable photograph of ${item.category} has been recorded.`,
          priority: 'P2_HIGH',
          relatedField: item.fieldType,
          suggestedAction: 'Capture a well-lit photograph containing this mandatory declaration panel.',
          resolved: false,
        });
      }
    }
  });

  // 4. Image Quality Issues (P3_ADVISORY)
  if (imageQuality) {
    if (imageQuality.glareDetected) {
      items.push({
        id: 'act-img-glare',
        type: 'IMAGE_QUALITY_ISSUE',
        title: 'Specular Glare on Package Image',
        description: 'Reflective glare detected which may obscure statutory printed text.',
        priority: 'P3_ADVISORY',
        suggestedAction: 'Tilt package away from direct light source and retake photo if necessary.',
        resolved: false,
      });
    }
    if (imageQuality.blurDetected || (typeof imageQuality.sharpness === 'number' && imageQuality.sharpness < 50)) {
      items.push({
        id: 'act-img-blur',
        type: 'LOW_EVIDENCE_QUALITY',
        title: 'Low Sharpness / Motion Blur',
        description: 'Image sharpness is below threshold for reliable optical character extraction.',
        priority: 'P3_ADVISORY',
        suggestedAction: 'Stabilize device camera and ensure good ambient illumination.',
        resolved: false,
      });
    }
  }

  // 5. E-Commerce Discrepancy Observational Notice (P3_ADVISORY)
  if (ecommerceDiscrepancy && ecommerceDiscrepancy.hasDiscrepancy) {
    items.push({
      id: 'act-ecom-discrepancy',
      type: 'ECOMMERCE_DISCREPANCY',
      title: 'E-Commerce Price Discrepancy (Observational)',
      description: `Physical MRP (₹${ecommerceDiscrepancy.physicalMrp}) differs from online catalog price (₹${ecommerceDiscrepancy.onlinePrice}) on ${ecommerceDiscrepancy.platform}.`,
      priority: 'P3_ADVISORY',
      suggestedAction: 'Review external catalog discrepancy as supporting observational evidence. Note: Difference does not by itself establish a violation.',
      resolved: false,
    });
  }

  // Deterministic sorting: P1_CRITICAL > P2_HIGH > P3_ADVISORY
  const priorityOrder: Record<InspectorActionItem['priority'], number> = {
    P1_CRITICAL: 1,
    P2_HIGH: 2,
    P3_ADVISORY: 3,
  };

  return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}
