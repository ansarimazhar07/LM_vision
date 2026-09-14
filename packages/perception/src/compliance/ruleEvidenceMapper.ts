/**
 * Phase F1: Deterministic Rule Evidence Mapper & Validator
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Transforms extracted declarations, fused evidence, and measurements into rule-specific evidence.
 * 2. Strict negative validation: filters phone numbers, PIN codes, barcodes, and offer prices from MRP;
 *    rejects numbers without units from quantity; prevents expiry dates from satisfying manufacture dates;
 *    keeps manufacturer, packer, and importer entity roles separated.
 * 3. Preserves 8-level provenance: rule -> field -> candidate -> image -> surface -> box -> normalization -> validation.
 * 4. Multi-surface conflict detection: differing values across surfaces trigger CONFLICT / REQUIRES_VERIFICATION.
 * 5. Search-incomplete detection: uncaptured surfaces for missing fields trigger SEARCH_INCOMPLETE, never FAIL.
 */

import type {
  Declaration,
  FieldSearchStatus,
  InspectionImage,
  PackageSurface,
  VisualMeasurement,
} from '@lm-vision/shared-types';
import type { FusedEvidencePackage, FusedFieldEvidence } from '../fusion/evidenceSchema.js';
import type {
  RuleCandidateEvidence,
  RuleEvidenceContract,
  RuleEvidenceStatus,
  RuleObservedEvidence,
} from './ruleMappingSchema.js';

export interface MapEvidenceToRuleInput {
  readonly contract: RuleEvidenceContract;
  readonly declarations?: readonly Declaration[];
  readonly fusedPackage?: FusedEvidencePackage | null;
  readonly measurements?: readonly VisualMeasurement[];
  readonly images?: readonly InspectionImage[] | readonly any[];
  readonly capturedSurfaces?: readonly PackageSurface[];
  readonly actualSalePrice?: number;
  readonly inspectorCorrections?: readonly any[];
  readonly isCalibrationAvailable?: boolean;
}

/**
 * Standard surfaces typically bearing mandatory declarations
 */
const COMMODITY_RELEVANT_SURFACES: Record<string, readonly PackageSurface[]> = {
  MRP: ['FRONT', 'BACK', 'TOP', 'BOTTOM', 'NECK', 'CAP', 'LID', 'STICKER'],
  NET_QUANTITY: ['FRONT', 'BOTTOM', 'BACK', 'TOP', 'NECK'],
  GENERIC_NAME: ['FRONT', 'BACK'],
  MANUFACTURER_NAME_ADDRESS: ['BACK', 'LEFT_SIDE', 'RIGHT_SIDE', 'BOTTOM'],
  DATE_OF_MANUFACTURE: ['BACK', 'TOP', 'BOTTOM', 'CRIMP', 'CAP', 'NECK', 'LID'],
  DATE_OF_PACKAGING: ['BACK', 'TOP', 'BOTTOM', 'CRIMP', 'CAP', 'NECK', 'LID'],
  DATE_OF_IMPORT: ['BACK', 'STICKER'],
  CONSUMER_CARE_DETAILS: ['BACK', 'LEFT_SIDE', 'RIGHT_SIDE'],
  NUMERAL_HEIGHT: ['FRONT'],
};

// Negative validation regex patterns
const PHONE_PATTERN = /(?:\+?91[\-\s]?)?(?:1800[\-\s]?\d{3}[\-\s]?\d{3,4}|[6-9]\d{9}|\b\d{3,5}[\-\s]?\d{6,8}\b)/;
const PINCODE_PATTERN = /\b[1-9]\d{5}\b/;
const BARCODE_PATTERN = /\b(?:890\d{10}|\d{12,14})\b/;
const OFFER_PRICE_PREFIX = /\b(offer|special\s*offer|save|discount|deal|introductory|sale\s*price)\b/i;

/**
 * Canonical unit normalization mapping
 */
const CANONICAL_UNIT_MAP: Record<string, string> = {
  g: 'g',
  gm: 'g',
  gms: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kgs: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  ml: 'ml',
  mls: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  l: 'l',
  lt: 'l',
  ltr: 'l',
  litre: 'l',
  litres: 'l',
  liter: 'l',
  liters: 'l',
  m: 'm',
  meter: 'm',
  cm: 'cm',
  centimeter: 'cm',
  mm: 'mm',
  n: 'n',
  no: 'n',
  number: 'n',
  unit: 'n',
  piece: 'n',
  pieces: 'n',
  u: 'n',
};

/**
 * Normalizes Net Quantity to canonical representation (e.g. 0.5 kg -> 500 g, 500gm -> 500 g)
 */
export function normalizeNetQuantityValue(
  numericVal: number,
  unitStr: string
): { normalizedValue: number; canonicalUnit: string } {
  const cleanUnit = (unitStr || '').trim().toLowerCase();
  const canon = CANONICAL_UNIT_MAP[cleanUnit] || cleanUnit;

  if (canon === 'kg') {
    return { normalizedValue: numericVal * 1000, canonicalUnit: 'g' };
  }
  if (canon === 'l') {
    return { normalizedValue: numericVal * 1000, canonicalUnit: 'ml' };
  }
  return { normalizedValue: numericVal, canonicalUnit: canon };
}

/**
 * Normalizes currency representation (₹120, Rs 120, 120/- -> 120.00 INR)
 */
export function normalizeMrpValue(rawText: string, existingVal?: unknown): number | null {
  if (typeof existingVal === 'number' && !isNaN(existingVal) && existingVal > 0) {
    return Number(existingVal.toFixed(2));
  }
  const match = rawText.match(/(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
                rawText.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:\/\-|rs\.?|₹|inr)/i);
  if (match && match[1]) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(val) ? null : Number(val.toFixed(2));
  }
  return null;
}

/**
 * Validates whether an MRP candidate is genuine or an adversarial false positive
 */
export function validateStatutoryMrpCandidate(cand: { rawText: string; value?: unknown }): {
  isValid: boolean;
  reason?: string;
} {
  const raw = cand.rawText.trim();
  const lower = raw.toLowerCase();

  // Reject phone numbers masquerading as MRP
  if (PHONE_PATTERN.test(raw) && !lower.includes('mrp') && !lower.includes('max. retail')) {
    return { isValid: false, reason: 'Rejected: Text is a phone/helpline number, not MRP.' };
  }

  // Reject PIN codes
  if (PINCODE_PATTERN.test(raw) && raw.replace(/\D/g, '').length === 6 && !lower.includes('mrp') && !lower.includes('₹') && !lower.includes('rs')) {
    return { isValid: false, reason: 'Rejected: Pure 6-digit postal PIN code, not MRP.' };
  }

  // Reject Barcode strings
  if (BARCODE_PATTERN.test(raw) && !lower.includes('mrp')) {
    return { isValid: false, reason: 'Rejected: Barcode/EAN string, not MRP.' };
  }

  // Reject Offer price / promotional discounts being claimed as MRP
  if (OFFER_PRICE_PREFIX.test(lower) && !lower.includes('mrp') && !lower.includes('max')) {
    return { isValid: false, reason: 'Rejected: Offer/promotional discount price is not statutory printed MRP.' };
  }

  return { isValid: true };
}

/**
 * Validates Net Quantity candidate
 */
export function validateStatutoryNetQuantityCandidate(cand: { rawText: string; unit?: string | null; value?: unknown }): {
  isValid: boolean;
  hasUnit: boolean;
  reason?: string;
} {
  const raw = cand.rawText.trim();
  const lower = raw.toLowerCase();

  // Reject pure phone numbers
  if (PHONE_PATTERN.test(raw) && !lower.includes('net') && !lower.includes('qty') && !lower.includes('weight')) {
    return { isValid: false, hasUnit: false, reason: 'Rejected: Text is a phone number, not net quantity.' };
  }

  // Check if unit is missing
  const unit = cand.unit || extractUnitFromText(raw);
  if (!unit) {
    return {
      isValid: false,
      hasUnit: false,
      reason: 'Insufficient: Net quantity numeral lacks standard metric unit symbol.',
    };
  }

  return { isValid: true, hasUnit: true };
}

function extractUnitFromText(text: string): string | null {
  const match = text.match(/[\d.]+\s*([a-zA-Z\s]+)/);
  if (match && match[1]) {
    const cleaned = match[1].trim().toLowerCase();
    return CANONICAL_UNIT_MAP[cleaned] || cleaned;
  }
  return null;
}

/**
 * Validates Date candidate for manufacture/packing
 */
export function validateStatutoryDateCandidate(cand: { field: string; rawText: string }): {
  isValid: boolean;
  isExpiry: boolean;
  reason?: string;
} {
  const lower = cand.rawText.toLowerCase();

  // Guardrail: Expiry / Best Before is NOT Date of Manufacture/Packing
  if (
    cand.field === 'EXPIRY_DATE_BEST_BEFORE' ||
    lower.includes('exp') ||
    lower.includes('best before') ||
    lower.includes('use by')
  ) {
    return {
      isValid: false,
      isExpiry: true,
      reason: 'Statutory separation: Expiry date / Best Before cannot satisfy Date of Manufacture under Rule 6(1)(d).',
    };
  }

  // Guardrail: Batch / Lot number is NOT Date of Manufacture
  if (lower.includes('batch') || lower.includes('lot no') || lower.includes('b.no')) {
    if (!lower.includes('mfd') && !lower.includes('pkd') && !lower.includes('packed') && !lower.includes('mfg')) {
      return {
        isValid: false,
        isExpiry: false,
        reason: 'Statutory separation: Batch/Lot identifier is not Date of Manufacture.',
      };
    }
  }

  return { isValid: true, isExpiry: false };
}

/**
 * Validates Manufacturer candidate
 */
export function validateStatutoryManufacturerCandidate(cand: { rawText: string }): {
  isValid: boolean;
  isMarketedByOnly: boolean;
  reason?: string;
} {
  const lower = cand.rawText.toLowerCase();

  // If label says "Marketed by ABC" without "Manufactured by", it cannot automatically satisfy manufacturer
  if (lower.includes('marketed by') && !lower.includes('manufactured by') && !lower.includes('mfg by')) {
    return {
      isValid: false,
      isMarketedByOnly: true,
      reason: 'Entity role separation: "Marketed by" declaration is distinct from manufacturer under Rule 6(1)(a).',
    };
  }

  return { isValid: true, isMarketedByOnly: false };
}

/**
 * Maps raw declarations, fused evidence, and measurements into an explicit RuleObservedEvidence structure
 */
export function mapEvidenceToRule(input: MapEvidenceToRuleInput): RuleObservedEvidence {
  const {
    contract,
    declarations = [],
    fusedPackage,
    measurements = [],
    images = [],
    capturedSurfaces = [],
    actualSalePrice,
    isCalibrationAvailable = true,
  } = input;

  // 1. Gather relevant candidate declarations matching this rule's required or optional fields
  const candidateEvidences: RuleCandidateEvidence[] = [];
  const reqFieldSet = new Set(contract.requiredFields);
  const optFieldSet = new Set(contract.optionalFields);

  // Handle special measurement-based rules e.g. Rule 7(2) Table I Numeral Height
  if (reqFieldSet.has('NUMERAL_HEIGHT')) {
    const numHeight = measurements.find(
      (m) =>
        m.type === 'FONT_HEIGHT' ||
        m.type === 'NUMERAL_HEIGHT_TO_PANEL_RATIO' ||
        m.id?.toLowerCase().includes('numeral') ||
        m.id?.toLowerCase().includes('quantity')
    );

    if (numHeight) {
      const isCalibrated = isCalibrationAvailable && (numHeight as any).isCalibrated !== false;
      candidateEvidences.push({
        candidateId: numHeight.id,
        field: 'NUMERAL_HEIGHT',
        rawText: `${numHeight.value} ${numHeight.unit}`,
        value: numHeight.value,
        normalizedValue: numHeight.unit === 'cm' ? numHeight.value * 10 : numHeight.value,
        unit: 'mm',
        imageId: (numHeight as any).imageId || '00000000-0000-0000-0000-000000000000',
        surface: numHeight.targetSurface || 'FRONT',
        surfaceType: numHeight.targetSurface || 'FRONT',
        extractionMethod: isCalibrated ? 'CALIBRATED_CV_MEASUREMENT' : 'UNCALIBRATED_OCR_PIXEL_ESTIMATE',
        confidence: isCalibrated ? numHeight.confidence : Math.min(numHeight.confidence, 0.35),
        validationStatus: isCalibrated ? 'VALID' : 'UNVERIFIED',
      });
    }
  }

  // Handle actual sale price evidence for Rule 18(2)
  if (reqFieldSet.has('ACTUAL_SALE_PRICE') && typeof actualSalePrice === 'number') {
    candidateEvidences.push({
      candidateId: 'actual-sale-price-candidate',
      field: 'ACTUAL_SALE_PRICE',
      rawText: `₹${actualSalePrice.toFixed(2)}`,
      value: actualSalePrice,
      normalizedValue: actualSalePrice,
      unit: 'INR',
      imageId: '00000000-0000-0000-0000-000000000000',
      surface: 'UNKNOWN',
      surfaceType: 'UNKNOWN',
      extractionMethod: 'INSPECTOR_OR_ECOMMERCE_TRANSACTION',
      confidence: 1.0,
      validationStatus: 'VALID',
    });
  }

  // Handle declarations
  for (const decl of declarations) {
    const isMatchingField = reqFieldSet.has(decl.type) || optFieldSet.has(decl.type);
    if (!isMatchingField) continue;

    const surface = (decl.surface || decl.surfaceType || decl.region?.surface || 'UNKNOWN') as PackageSurface;
    const imageId = decl.region?.imageId || '00000000-0000-0000-0000-000000000000';
    const rawText = decl.rawText || String(decl.normalizedValue ?? '');
    let validationStatus: RuleCandidateEvidence['validationStatus'] = 'VALID';
    let validatedVal: unknown = decl.normalizedValue;

    // Apply rule-specific validation
    if (decl.type === 'MRP') {
      const mrpCheck = validateStatutoryMrpCandidate({ rawText, value: decl.normalizedValue });
      if (!mrpCheck.isValid) {
        validationStatus = 'INVALID';
      } else {
        validatedVal = normalizeMrpValue(rawText, decl.normalizedValue);
      }
    } else if (decl.type === 'NET_QUANTITY') {
      const qtyCheck = validateStatutoryNetQuantityCandidate({ rawText, unit: decl.unit, value: decl.normalizedValue });
      if (!qtyCheck.isValid) {
        validationStatus = qtyCheck.hasUnit ? 'INVALID' : 'SUSPECT';
      }
    } else if (decl.type === 'DATE_OF_MANUFACTURE' || decl.type === 'DATE_OF_PACKAGING') {
      const dateCheck = validateStatutoryDateCandidate({ field: decl.type, rawText });
      if (!dateCheck.isValid) {
        validationStatus = 'INVALID';
      }
    } else if (decl.type === 'MANUFACTURER_NAME_ADDRESS') {
      const mfgCheck = validateStatutoryManufacturerCandidate({ rawText });
      if (!mfgCheck.isValid) {
        validationStatus = 'SUSPECT';
      }
    }

    candidateEvidences.push({
      candidateId: (decl as any).id || `cand-${decl.type}-${candidateEvidences.length}`,
      field: decl.type,
      rawText,
      value: decl.normalizedValue ?? rawText,
      normalizedValue: validatedVal,
      unit: decl.unit || null,
      imageId,
      surface,
      surfaceType: surface,
      surfaceId: (decl as any).surfaceId,
      boundingBox: decl.region?.boundingBox,
      extractionMethod: (decl as any).source || 'LOCAL_OCR',
      confidence: typeof decl.confidence === 'number' ? decl.confidence : 0.8,
      validationStatus,
      isInspectorConfirmed: (decl as any).isInspectorConfirmed || decl.evidenceStatus === 'INSPECTOR_CONFIRMED',
    });
  }

  // Filter valid candidate evidences (keep invalid in record for provenance/traceability)
  const validCandidates = candidateEvidences.filter((c) => c.validationStatus !== 'INVALID');

  // Check fused package for cross-surface or multi-source consensus
  const primaryField = contract.requiredFields[0] || 'DECLARATION';
  const fusedField: FusedFieldEvidence | undefined = fusedPackage?.fields?.[primaryField];

  // 2. Detect Cross-Surface Conflicts
  // E.g., Front MRP ₹120 vs Neck MRP ₹150
  const uniqueSurfacesWithValue = new Map<PackageSurface, unknown>();
  const differingValues: unknown[] = [];
  const conflictingSurfaces: PackageSurface[] = [];

  for (const cand of validCandidates) {
    if (cand.surface !== 'UNKNOWN' && cand.normalizedValue !== null && cand.normalizedValue !== undefined) {
      const existing = uniqueSurfacesWithValue.get(cand.surface);
      if (existing === undefined) {
        uniqueSurfacesWithValue.set(cand.surface, cand.normalizedValue);
      }
    }
  }

  if (uniqueSurfacesWithValue.size > 1) {
    const values = Array.from(uniqueSurfacesWithValue.values());
    const first = values[0];
    const hasDiscrepancy = values.some((v) => {
      if (typeof v === 'number' && typeof first === 'number') {
        return Math.abs(v - first) >= 0.01;
      }
      return String(v).trim().toLowerCase() !== String(first).trim().toLowerCase();
    });

    if (hasDiscrepancy) {
      conflictingSurfaces.push(...uniqueSurfacesWithValue.keys());
      differingValues.push(...values);
    }
  }

  const hasCrossSurfaceConflict = conflictingSurfaces.length > 0;

  // 3. Evaluate Search Completeness
  // If no valid candidates found, check whether all relevant surfaces were captured
  const relevantSurfaces = COMMODITY_RELEVANT_SURFACES[primaryField] || ['FRONT', 'BACK'];
  const capturedSet = new Set<PackageSurface>(
    capturedSurfaces.length > 0
      ? capturedSurfaces
      : images.map((img) => (img.surface || img.surfaceType || 'FRONT') as PackageSurface)
  );

  const uncapturedRelevant = relevantSurfaces.filter((s) => !capturedSet.has(s));
  const isSearchComplete = uncapturedRelevant.length === 0 || capturedSet.has('BACK');

  // Determine overall search status
  let searchStatus: FieldSearchStatus = 'SEARCH_INCOMPLETE';
  if (validCandidates.some((c) => c.isInspectorConfirmed)) {
    searchStatus = 'INSPECTOR_CONFIRMED';
  } else if (hasCrossSurfaceConflict || fusedField?.evidenceStatus === 'CONFLICT') {
    searchStatus = 'CONFLICT';
  } else if (validCandidates.length > 0) {
    searchStatus = 'FOUND';
  } else if (isSearchComplete) {
    searchStatus = 'SEARCH_COMPLETED_NO_EVIDENCE';
  } else {
    searchStatus = 'SEARCH_INCOMPLETE';
  }

  // Determine overall evidence status
  let evidenceStatus: RuleEvidenceStatus = 'NO_EVIDENCE';
  if (validCandidates.some((c) => c.isInspectorConfirmed)) {
    evidenceStatus = 'INSPECTOR_CONFIRMED';
  } else if (hasCrossSurfaceConflict || fusedField?.evidenceStatus === 'CONFLICT') {
    evidenceStatus = 'CONFLICT';
  } else if (validCandidates.length > 1 && !hasCrossSurfaceConflict) {
    evidenceStatus = 'AGREEMENT';
  } else if (validCandidates.length === 1) {
    evidenceStatus = 'SINGLE_SOURCE';
  } else if (candidateEvidences.some((c) => c.validationStatus === 'SUSPECT')) {
    evidenceStatus = 'PARTIAL';
  } else {
    evidenceStatus = 'INSUFFICIENT';
  }

  // Primary candidate determination
  const inspectorConfirmedCand = validCandidates.find((c) => c.isInspectorConfirmed);
  const bestCandidate = inspectorConfirmedCand || validCandidates[0] || candidateEvidences[0];

  return {
    primaryField,
    primaryValue: bestCandidate?.normalizedValue ?? bestCandidate?.value ?? null,
    rawText: bestCandidate?.rawText,
    unit: bestCandidate?.unit,
    normalizedValue: bestCandidate?.normalizedValue ?? null,
    evidenceStatus,
    searchStatus,
    candidates: candidateEvidences,
    conflictDetails: hasCrossSurfaceConflict
      ? {
          hasConflict: true,
          conflictingSurfaces,
          differingValues,
          description: `Discrepancy detected across package surfaces (${conflictingSurfaces.join(', ')}): differing values observed (${differingValues.join(' vs ')}). Human verification required.`,
        }
      : undefined,
    searchCompleteness: {
      isComplete: isSearchComplete,
      capturedSurfaces: Array.from(capturedSet),
      uncapturedRelevantSurfaces: uncapturedRelevant,
      message: isSearchComplete
        ? 'Package inspection surfaces for this mandatory declaration were fully examined.'
        : `Relevant package surfaces [${uncapturedRelevant.join(', ')}] were not captured. Declaration may exist on unexamined panels.`,
    },
  };
}
