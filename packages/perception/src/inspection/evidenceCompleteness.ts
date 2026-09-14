/**
 * Phase E: Evidence Completeness Analyzer & Smart Capture Guidance
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Strictly decouples photographic evidence presence from statutory legal compliance.
 * 2. Distinguishes AVAILABLE, MISSING_EVIDENCE, NOT_ASSESSED, NOT_APPLICABLE based on
 *    authoritative Rule Engine assessments.
 * 3. Never turns "evidence not captured" into "legal declaration missing" unless
 *    the Rule Engine has established statutory applicability and identified missing evidence.
 * 4. Smart capture recommendations are strictly evidence-driven and advisory.
 *    Uncontrolled automated camera capture is strictly forbidden.
 */

import type {
  ComplianceAssessment,
  Declaration,
  DeclarationType,
  EcommerceListing,
  ImageQuality,
  PackageSurface,
} from '@lm-vision/shared-types';
import type { FusedEvidencePackage } from '../fusion/evidenceSchema.js';
import type {
  EvidenceCompletenessAnalysis,
  EvidenceCompletenessItem,
  EvidencePresenceStatus,
  OverallCompletenessStatus,
  SmartCaptureRecommendation,
} from './findingSchema.js';

export interface AnalyzeEvidenceCompletenessInput {
  readonly images?: ReadonlyArray<{
    readonly id?: string;
    readonly surface?: PackageSurface;
    readonly quality?: ImageQuality;
    readonly fileUrl?: string;
  }>;
  readonly declarations?: readonly Declaration[];
  readonly assessments?: readonly ComplianceAssessment[];
  readonly fusedPackage?: FusedEvidencePackage;
  readonly ecommerceListing?: EcommerceListing;
  readonly commodityCategory?: string;
}

/**
 * Standard declaration areas assessed under Legal Metrology (Packaged Commodities) Rules, 2011.
 */
interface StandardCategorySpec {
  readonly category: string;
  readonly fieldType: DeclarationType;
  readonly ruleCitationMatcher: string; // matches ruleNumber e.g. "6(1)(e)"
  readonly label: string;
  readonly defaultSurface: PackageSurface;
}

const STANDARD_CATEGORIES: readonly StandardCategorySpec[] = [
  {
    category: 'MRP Declaration',
    fieldType: 'MRP',
    ruleCitationMatcher: '6(1)(e)',
    label: 'Maximum Retail Price (MRP)',
    defaultSurface: 'BACK',
  },
  {
    category: 'Net Quantity Declaration',
    fieldType: 'NET_QUANTITY',
    ruleCitationMatcher: '6(1)(b)',
    label: 'Net Quantity with Standard Unit',
    defaultSurface: 'FRONT',
  },
  {
    category: 'Manufacturer / Packer / Importer',
    fieldType: 'MANUFACTURER_NAME_ADDRESS',
    ruleCitationMatcher: '6(1)(d)',
    label: 'Manufacturer or Packer Name & Address',
    defaultSurface: 'BACK',
  },
  {
    category: 'Date Marking',
    fieldType: 'DATE_OF_PACKAGING',
    ruleCitationMatcher: '6(1)(c)',
    label: 'Date of Manufacture / Packaging / Expiry',
    defaultSurface: 'BACK',
  },
  {
    category: 'Consumer Care Helpline',
    fieldType: 'CONSUMER_CARE_DETAILS',
    ruleCitationMatcher: '6(2)',
    label: 'Consumer Care Phone / Email / Address',
    defaultSurface: 'BACK',
  },
  {
    category: 'Country of Origin',
    fieldType: 'COUNTRY_OF_ORIGIN',
    ruleCitationMatcher: '6(1)(a)',
    label: 'Country of Origin (Mandatory for imported goods)',
    defaultSurface: 'BACK',
  },
  {
    category: 'Generic Name of Commodity',
    fieldType: 'GENERIC_NAME',
    ruleCitationMatcher: '6(1)(a)',
    label: 'Generic Name or Common Description',
    defaultSurface: 'FRONT',
  },
];

/**
 * Deterministically analyzes evidence completeness for an inspection.
 */
export function analyzeEvidenceCompleteness(
  input: AnalyzeEvidenceCompletenessInput
): EvidenceCompletenessAnalysis {
  const images = input.images || [];
  const declarations = input.declarations || [];
  const assessments = input.assessments || [];
  const fusedPackage = input.fusedPackage;

  const capturedSurfaces = new Set<PackageSurface>(
    images.map((img) => img.surface || 'FRONT')
  );

  const items: EvidenceCompletenessItem[] = [];
  const smartRecommendations: SmartCaptureRecommendation[] = [];

  // 1. Analyze Photographic Surface Coverage
  const hasFrontImage = capturedSurfaces.has('FRONT');
  const hasBackImage = capturedSurfaces.has('BACK');
  const hasMultipleSurfaces = capturedSurfaces.size >= 2;

  items.push({
    category: 'Principal Display Panel (Front Surface)',
    presenceStatus: hasFrontImage ? 'AVAILABLE' : 'MISSING_EVIDENCE',
    isApplicable: true,
    details: hasFrontImage
      ? 'Front package photograph captured and available for inspection.'
      : 'Front surface photograph not detected in evidence workspace.',
  });

  items.push({
    category: 'Information Panel (Rear Surface)',
    presenceStatus: hasBackImage ? 'AVAILABLE' : 'MISSING_EVIDENCE',
    isApplicable: true,
    details: hasBackImage
      ? 'Rear declaration panel photograph captured and available for inspection.'
      : 'Rear surface photograph not detected in evidence workspace.',
  });

  if (!hasFrontImage) {
    smartRecommendations.push({
      id: 'rec-front-surface',
      triggerReason: 'Principal display panel (front) photograph is absent.',
      advisoryGuidance:
        'Capture a clear, well-lit photograph of the front package face (Principal Display Panel).',
      targetSurface: 'FRONT',
      priority: 'HIGH',
      isAdvisory: true,
    });
  }

  if (!hasBackImage) {
    smartRecommendations.push({
      id: 'rec-rear-surface',
      triggerReason: 'Information panel (rear) photograph is absent.',
      advisoryGuidance:
        'Capture a clear, well-lit photograph of the rear/side declaration panel.',
      targetSurface: 'BACK',
      priority: 'HIGH',
      isAdvisory: true,
    });
  }

  // 2. Image Physical Quality Checks
  images.forEach((img, idx) => {
    const q = img.quality;
    if (!q) return;

    if (q.glareDetected) {
      smartRecommendations.push({
        id: `rec-glare-${idx}`,
        triggerReason: `Glare detected on ${img.surface || 'package'} image (glare index elevated).`,
        advisoryGuidance:
          'Adjust camera angle or diffuse lighting to eliminate specular glare reflections over declarations.',
        targetSurface: img.surface,
        priority: 'MEDIUM',
        isAdvisory: true,
      });
    }

    if (q.blurDetected || (typeof q.sharpness === 'number' && q.sharpness < 50)) {
      smartRecommendations.push({
        id: `rec-blur-${idx}`,
        triggerReason: `Blur or low sharpness detected on ${img.surface || 'package'} image.`,
        advisoryGuidance:
          'Hold camera steady and re-focus directly on small printed text regions.',
        targetSurface: img.surface,
        priority: 'HIGH',
        isAdvisory: true,
      });
    }
  });

  // 3. Analyze Declaration Fields against Rule Engine Applicability
  for (const spec of STANDARD_CATEGORIES) {
    // Determine statutory applicability from Rule Engine assessments
    const matchingAssessment = assessments.find((a) =>
      a.ruleNumber?.includes(spec.ruleCitationMatcher)
    );

    let isApplicable = true;
    let presenceStatus: EvidencePresenceStatus = 'AVAILABLE';
    let details = '';

    if (matchingAssessment) {
      if (matchingAssessment.result === 'NOT_APPLICABLE') {
        isApplicable = false;
        presenceStatus = 'NOT_APPLICABLE';
        details = `Statutory requirement evaluated as NOT_APPLICABLE by Rule Engine (${matchingAssessment.ruleNumber}).`;
      } else if (matchingAssessment.result === 'INSUFFICIENT_EVIDENCE') {
        presenceStatus = 'MISSING_EVIDENCE';
        details = `Rule Engine indicates insufficient physical evidence to assess this declaration (${matchingAssessment.ruleNumber}).`;
      } else {
        // PASS, FAIL, or REQUIRES_VERIFICATION
        presenceStatus = 'AVAILABLE';
        details = `Evidence available and evaluated by Rule Engine (${matchingAssessment.ruleNumber}).`;
      }
    } else {
      // If no assessment exists, check if declarations or fused evidence has it
      const decl = declarations.find((d) => d.type === spec.fieldType);
      const fusedField = fusedPackage?.fields[spec.fieldType];

      if (decl || (fusedField && fusedField.fusedValue !== undefined && fusedField.fusedValue !== null)) {
        presenceStatus = 'AVAILABLE';
        details = 'Declaration extracted from package observations.';
      } else {
        presenceStatus = 'NOT_ASSESSED';
        details = 'Statutory rule for this field was not included in evaluated bundle.';
      }
    }

    // Check fused evidence for specific field status
    const fieldFusion = fusedPackage?.fields[spec.fieldType];
    const observedSource = fieldFusion?.primarySource || 'LOCAL_OCR';
    const confidence = fieldFusion?.confidenceTier || 0.9;
    const searchStatus = fieldFusion?.searchStatus;
    const relevantSurfaces = fieldFusion?.searchCompleteness?.relevantSurfaces;
    const uncapturedRelevantSurfaces = fieldFusion?.searchCompleteness?.uncapturedRelevantSurfaces;

    items.push({
      category: spec.category,
      fieldType: spec.fieldType,
      presenceStatus,
      isApplicable,
      observedSource,
      confidence,
      details,
      searchStatus,
      relevantSurfaces,
      uncapturedRelevantSurfaces,
    });

    // Trigger smart capture recommendation if applicable and missing
    if (isApplicable && presenceStatus === 'MISSING_EVIDENCE') {
      const surfaceGuidance = fieldFusion?.searchCompleteness?.recommendation ||
        (uncapturedRelevantSurfaces && uncapturedRelevantSurfaces.length > 0
          ? `Check ${uncapturedRelevantSurfaces.map(s => s.replace(/_/g, ' ').toLowerCase()).join(' / ')} for additional ${spec.label} marking.`
          : `Move closer and capture a sharp macro photograph of the ${spec.label} declaration panel.`);

      const targetSurface = (uncapturedRelevantSurfaces && uncapturedRelevantSurfaces[0]) || spec.defaultSurface;

      smartRecommendations.push({
        id: `rec-missing-${spec.fieldType.toLowerCase()}`,
        triggerReason: fieldFusion?.searchStatus === 'SEARCH_INCOMPLETE'
          ? `${spec.label} not detected on currently captured surfaces.`
          : `Insufficient evidence captured for mandatory ${spec.label}.`,
        advisoryGuidance: surfaceGuidance,
        targetSurface,
        targetField: spec.fieldType,
        priority: 'HIGH',
        isAdvisory: true,
      });
    }
  }

  // 4. E-Commerce External Evidence Status
  if (input.ecommerceListing) {
    items.push({
      category: 'E-Commerce Catalog Listing Record',
      presenceStatus: 'AVAILABLE',
      isApplicable: true,
      observedSource: 'ECOMMERCE',
      details: `Online listing from platform '${input.ecommerceListing.platformName}' available for observational cross-check.`,
    });
  } else {
    items.push({
      category: 'E-Commerce Catalog Listing Record',
      presenceStatus: 'NOT_ASSESSED',
      isApplicable: false,
      details: 'No e-commerce listing provided for this physical inspection.',
    });
  }

  // Count metrics
  let availableCount = 0;
  let missingCount = 0;
  let notApplicableCount = 0;
  let notAssessedCount = 0;

  for (const item of items) {
    if (item.presenceStatus === 'AVAILABLE') availableCount++;
    else if (item.presenceStatus === 'MISSING_EVIDENCE') missingCount++;
    else if (item.presenceStatus === 'NOT_APPLICABLE') notApplicableCount++;
    else if (item.presenceStatus === 'NOT_ASSESSED') notAssessedCount++;
  }

  // Determine overall status
  let overallStatus: OverallCompletenessStatus = 'COMPLETE';
  if (missingCount >= 3 || (!hasFrontImage && !hasBackImage)) {
    overallStatus = 'INSUFFICIENT';
  } else if (missingCount > 0 || !hasMultipleSurfaces) {
    overallStatus = 'PARTIAL';
  }

  return {
    overallStatus,
    items,
    availableCount,
    missingCount,
    notApplicableCount,
    notAssessedCount,
    smartRecommendations,
    disclaimer:
      'EVIDENCE COMPLETENESS ADVISORY — NON-STATUTORY: Measures availability of usable physical photographs and declaration panels for inspector review. Completeness does NOT constitute statutory legal compliance.',
  };
}

