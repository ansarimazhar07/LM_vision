/**
 * Phase C: Deterministic Multi-Signal Spatial Reasoning Engine
 *
 * Replaces simplistic nearest-neighbor association with deterministic,
 * multi-signal spatial reasoning for pairing declaration labels with their values.
 *
 * SIGNALS EVALUATED:
 * 1. Horizontal Distance: Normalized gap along the X-axis.
 * 2. Vertical Distance: Normalized gap along the Y-axis.
 * 3. Line Alignment: Baseline and top-edge horizontal alignment.
 * 4. Reading Order: English / Hindi left-to-right on same line, or directly below.
 * 5. Bounding Box Overlap & Proximity.
 * 6. Competing Labels: Penalty when a competing label is physically closer.
 * 7. Candidate Type Compatibility: Currency for MRP, metric unit for Net Qty, date for MFD/EXP.
 *
 * AMBIGUITY HANDLING:
 * If two candidates are similarly plausible (score delta < 0.15), marks isAmbiguous = true
 * and validationStatus = REQUIRES_VERIFICATION. Never guesses arbitrarily.
 */

import type { BoundingBox, DeclarationType, TextRegion } from '@lm-vision/shared-types';
import type { SpatialAssociationScore } from './candidateSchema.js';

export interface LabelOccurrence {
  type: DeclarationType;
  labelRegion: TextRegion;
  labelText: string;
}

export interface ValueOccurrence {
  valueRegion: TextRegion;
  valueText: string;
  hasCurrency: boolean;
  hasMetricUnit: boolean;
  hasDatePattern: boolean;
  hasPhonePattern: boolean;
  hasPinPattern: boolean;
}

export interface SpatialAssociationResult {
  label: LabelOccurrence;
  value: ValueOccurrence;
  score: SpatialAssociationScore;
  compositeBoundingBox: BoundingBox;
}

const LABEL_PATTERNS: Array<{ type: DeclarationType; pattern: RegExp }> = [
  {
    type: 'MRP',
    pattern: /\b(?:M\.?R\.?P\.?|MAX\.?\s*RETAIL\s*PRICE|MAXIMUM\s*RETAIL\s*PRICE|एम\.?आर\.?पी\.?|अधिकतम\s*खुदरा\s*मूल्य|खुदरा\s*मूल्य)\b/i,
  },
  {
    type: 'NET_QUANTITY',
    pattern: /\b(?:NET\s*(?:QTY|QUANTITY|WT|WEIGHT|VOL|VOLUME)|N\.?W\.?|N\.?Q\.?|शुद्ध\s*(?:मात्रा|वजन|भार)|मात्रा|वजन)\b/i,
  },
  {
    type: 'DATE_OF_PACKAGING',
    pattern: /\b(?:MFD|MFG|PACKED|PKD|MFR|PKG|DATE\s*OF\s*(?:MFG|MFD|PACKAGING|PACKING)|निर्माण\s*तिथि|पैकिंग\s*तिथि)\b/i,
  },
  {
    type: 'EXPIRY_DATE_BEST_BEFORE',
    pattern: /\b(?:BEST\s*BEFORE|EXPIRY|EXP\.?|USE\s*BY|सर्वोत्तम\s*उपयोग|समाप्ति\s*तिथि)\b/i,
  },
  {
    type: 'CONSUMER_CARE_DETAILS',
    pattern: /\b(?:CONSUMER\s*CARE|CUSTOMER\s*CARE|HELPLINE|FEEDBACK|QUERIES|TOLL\s*FREE|उपभोक्ता\s*सेवा|ग्राहक\s*सेवा)\b/i,
  },
  {
    type: 'MANUFACTURER_NAME_ADDRESS',
    pattern: /\b(?:MFD\.?\s*BY|MFG\.?\s*BY|MANUFACTURED\s*BY|PACKED\s*BY|PKD\.?\s*BY|IMPORTED\s*BY|निर्माता|द्वारा\s*निर्मित|पैकर)\b/i,
  },
  {
    type: 'COUNTRY_OF_ORIGIN',
    pattern: /\b(?:COUNTRY\s*OF\s*ORIGIN|MADE\s*IN|PRODUCT\s*OF|मूल\s*देश)\b/i,
  },
];

const CURRENCY_REGEX = /(?:₹|Rs\.?|INR|रु\.?|रुपये|\/-)/i;
const METRIC_UNIT_REGEX = /\b(?:g|gm|gms|gram|grams|kg|kgs|ml|mls|l|lt|ltr|किग्रा|कि\.ग्रा\.|ग्राम|मिली|लीटर|नग)\b/i;
const DATE_REGEX = /\b([0-9]{1,2}[\/\.-][0-9]{4}|[A-Za-z]{3,}[\/\.\s-][0-9]{4}|[0-9]{1,2}[\/\.-][0-9]{1,2}[\/\.-][0-9]{2,4})\b/i;
const PHONE_REGEX = /(?:1800[- ]?[0-9]{3}[- ]?[0-9]{3,4}|[0-9]{10,11}|\+[0-9]{2}[- ]?[0-9]{10})/;
const PIN_REGEX = /\b[1-9][0-9]{5}\b/;

/**
 * Detects whether a region serves as a declaration label.
 */
export function identifyLabels(regions: TextRegion[]): LabelOccurrence[] {
  const labels: LabelOccurrence[] = [];

  for (const region of regions) {
    const text = region.text.trim();
    for (const { type, pattern } of LABEL_PATTERNS) {
      if (pattern.test(text)) {
        labels.push({
          type,
          labelRegion: region,
          labelText: text,
        });
        break;
      }
    }
  }

  return labels;
}

/**
 * Characterizes candidate value regions.
 */
export function identifyCandidateValues(regions: TextRegion[]): ValueOccurrence[] {
  const values: ValueOccurrence[] = [];

  for (const region of regions) {
    const text = region.text.trim();
    const hasDigit = /[0-9]/.test(text);

    // Filter regions that could carry values (numbers, currencies, units, dates, contacts)
    const hasCurrency = CURRENCY_REGEX.test(text);
    const hasMetricUnit = METRIC_UNIT_REGEX.test(text);
    const hasDatePattern = DATE_REGEX.test(text);
    const hasPhonePattern = PHONE_REGEX.test(text);
    const hasPinPattern = PIN_REGEX.test(text);

    if (hasDigit || hasCurrency || hasMetricUnit || hasDatePattern || hasPhonePattern) {
      values.push({
        valueRegion: region,
        valueText: text,
        hasCurrency,
        hasMetricUnit,
        hasDatePattern,
        hasPhonePattern,
        hasPinPattern,
      });
    }
  }

  return values;
}

/**
 * Creates a normalized composite bounding box enclosing two regions.
 */
export function computeCompositeBox(boxA: BoundingBox, boxB: BoundingBox): BoundingBox {
  const xMin = Math.min(boxA.xMin, boxB.xMin);
  const yMin = Math.min(boxA.yMin, boxB.yMin);
  const xMax = Math.max(boxA.xMax, boxB.xMax);
  const yMax = Math.max(boxA.yMax, boxB.yMax);

  return {
    xMin: Number(xMin.toFixed(4)),
    yMin: Number(yMin.toFixed(4)),
    xMax: Number(xMax.toFixed(4)),
    yMax: Number(yMax.toFixed(4)),
    width: Number(Math.max(0, xMax - xMin).toFixed(4)),
    height: Number(Math.max(0, yMax - yMin).toFixed(4)),
    unit: 'NORMALIZED',
  };
}

/**
 * Evaluates spatial relationship signals between a label and candidate value.
 */
export function evaluateSpatialRelationship(
  label: LabelOccurrence,
  value: ValueOccurrence,
  allLabels: LabelOccurrence[]
): SpatialAssociationScore {
  const lBox = label.labelRegion.boundingBox;
  const vBox = value.valueRegion.boundingBox;

  // 1. Horizontal Distance: normalized gap along X-axis
  // In English / Hindi, value is typically to the right of label (xValMin >= xLabelMax)
  const isValueToRight = vBox.xMin >= lBox.xMin;
  const horizontalDistance = isValueToRight
    ? Math.max(0, vBox.xMin - lBox.xMax)
    : Math.max(0, lBox.xMin - vBox.xMax) + 0.3; // penalize leftward values

  // 2. Vertical Distance: normalized gap along Y-axis
  const labelYCenter = (lBox.yMin + lBox.yMax) / 2;
  const valueYCenter = (vBox.yMin + vBox.yMax) / 2;
  const verticalDistance = Math.abs(valueYCenter - labelYCenter);

  // 3. Line Alignment Score: baseline / top-edge alignment
  const topDiff = Math.abs(vBox.yMin - lBox.yMin);
  const alignmentScore = Math.max(0, 1 - topDiff * 6);

  // 4. Reading Order Score:
  // - Same line to right: score = 1.0
  // - Directly below: score = 0.75
  // - Unfavorable reading order: score = 0.1
  let readingOrderScore = 0.1;
  const verticalOverlap = Math.max(0, Math.min(lBox.yMax, vBox.yMax) - Math.max(lBox.yMin, vBox.yMin));
  const lHeight = lBox.height ?? (lBox.yMax - lBox.yMin);
  const vHeight = vBox.height ?? (vBox.yMax - vBox.yMin);
  const minHeight = Math.min(lHeight, vHeight);
  const isSameLine = minHeight > 0 && verticalOverlap / minHeight > 0.4;

  if (isSameLine && vBox.xMin >= lBox.xMin) {
    readingOrderScore = 1.0;
  } else if (vBox.yMin >= lBox.yMax - 0.02 && Math.abs((lBox.xMin + lBox.xMax) / 2 - (vBox.xMin + vBox.xMax) / 2) < 0.25) {
    // Value is directly below label
    readingOrderScore = 0.75;
  }

  // 5. Overlap Score
  const overlapScore = verticalOverlap > 0 ? 0.2 : 0.0;

  // 6. Competing Labels Penalty:
  // Is another label physically closer to this candidate value than the current label?
  let competingLabelPenalty = 0.0;
  const valueCenter = { x: (vBox.xMin + vBox.xMax) / 2, y: valueYCenter };
  const currentDist = Math.hypot(
    valueCenter.x - (lBox.xMin + lBox.xMax) / 2,
    valueCenter.y - labelYCenter
  );

  for (const otherLabel of allLabels) {
    if (otherLabel.labelRegion.id === label.labelRegion.id) continue;
    const oBox = otherLabel.labelRegion.boundingBox;
    const otherDist = Math.hypot(
      valueCenter.x - (oBox.xMin + oBox.xMax) / 2,
      valueCenter.y - (oBox.yMin + oBox.yMax) / 2
    );

    if (otherDist < currentDist) {
      // If the competing label is more compatible with the value type, heavy penalty
      competingLabelPenalty = Math.max(competingLabelPenalty, 0.4);
    }
  }

  // 7. Candidate Type Compatibility Score
  let typeCompatibilityScore = 0.0;
  switch (label.type) {
    case 'MRP': {
      if (value.hasCurrency) typeCompatibilityScore += 0.35;
      if (value.hasMetricUnit) typeCompatibilityScore -= 0.6; // metric unit cannot be MRP!
      if (value.hasDatePattern && !value.hasCurrency) typeCompatibilityScore -= 0.6; // dates cannot be MRP
      if (value.hasPhonePattern) typeCompatibilityScore -= 0.8; // phone numbers cannot be MRP!
      if (value.hasPinPattern && !value.hasCurrency && !value.valueText.includes('.')) typeCompatibilityScore -= 0.6; // 6-digit PIN is not MRP
      break;
    }

    case 'NET_QUANTITY': {
      if (value.hasMetricUnit) typeCompatibilityScore += 0.4;
      if (value.hasCurrency) typeCompatibilityScore -= 0.6; // currency cannot be Net Qty
      if (value.hasDatePattern) typeCompatibilityScore -= 0.6;
      if (value.hasPhonePattern) typeCompatibilityScore -= 0.8;
      break;
    }

    case 'DATE_OF_PACKAGING':
    case 'EXPIRY_DATE_BEST_BEFORE': {
      if (value.hasDatePattern) typeCompatibilityScore += 0.4;
      if (value.hasCurrency) typeCompatibilityScore -= 0.6;
      if (value.hasMetricUnit) typeCompatibilityScore -= 0.6;
      if (value.hasPhonePattern) typeCompatibilityScore -= 0.8;
      break;
    }

    case 'CONSUMER_CARE_DETAILS': {
      if (value.hasPhonePattern || value.valueText.includes('@')) typeCompatibilityScore += 0.5;
      if (value.hasCurrency) typeCompatibilityScore -= 0.5;
      break;
    }

    default:
      break;
  }

  // Composite Deterministic Score Calculation
  // S = w_read * ReadingOrder + w_align * Alignment + w_dist * (1 - dist) - w_comp * Competing + w_type * Compatibility
  const distanceFactor = Math.max(0, 1 - (horizontalDistance * 1.5 + verticalDistance * 2.0));
  const rawScore =
    readingOrderScore * 0.35 +
    alignmentScore * 0.25 +
    distanceFactor * 0.25 -
    competingLabelPenalty * 0.3 +
    typeCompatibilityScore;

  const compositeScore = Number(Math.max(0, Math.min(1.0, rawScore)).toFixed(4));

  return {
    horizontalDistance: Number(horizontalDistance.toFixed(4)),
    verticalDistance: Number(verticalDistance.toFixed(4)),
    alignmentScore: Number(alignmentScore.toFixed(4)),
    readingOrderScore: Number(readingOrderScore.toFixed(4)),
    overlapScore: Number(overlapScore.toFixed(4)),
    competingLabelPenalty: Number(competingLabelPenalty.toFixed(4)),
    typeCompatibilityScore: Number(typeCompatibilityScore.toFixed(4)),
    compositeScore,
    isAmbiguous: false,
  };
}

/**
 * Associates declaration labels with candidate value regions across a package surface.
 * Guarantees that conflicting or equally plausible candidates are flagged as ambiguous.
 */
export function associateLabelsWithValues(
  regions: TextRegion[]
): SpatialAssociationResult[] {
  const labels = identifyLabels(regions);
  const values = identifyCandidateValues(regions);

  const results: SpatialAssociationResult[] = [];

  for (const label of labels) {
    // Exclude candidate value that is identical to the label itself
    const candidateValues = values.filter(
      v => v.valueRegion.id !== label.labelRegion.id
    );

    const scoredCandidates: Array<{
      value: ValueOccurrence;
      score: SpatialAssociationScore;
    }> = [];

    for (const value of candidateValues) {
      const score = evaluateSpatialRelationship(label, value, labels);
      if (score.compositeScore >= 0.30) {
        scoredCandidates.push({ value, score });
      }
    }

    // Sort descending by composite score
    scoredCandidates.sort((a, b) => b.score.compositeScore - a.score.compositeScore);

    if (scoredCandidates.length === 0) {
      continue;
    }

    const top = scoredCandidates[0];
    if (!top) continue;

    let isAmbiguous = false;

    // Ambiguity Check: If top two candidates are within delta 0.15 of each other,
    // we cannot deterministically select one without verification.
    if (scoredCandidates.length > 1) {
      const runnerUp = scoredCandidates[1];
      if (runnerUp) {
        const delta = top.score.compositeScore - runnerUp.score.compositeScore;
        if (delta < 0.15 && runnerUp.score.compositeScore >= 0.35) {
          isAmbiguous = true;
        }
      }
    }

    const finalScore: SpatialAssociationScore = {
      ...top.score,
      isAmbiguous,
    };

    const compositeBox = computeCompositeBox(
      label.labelRegion.boundingBox,
      top.value.valueRegion.boundingBox
    );

    results.push({
      label,
      value: top.value,
      score: finalScore,
      compositeBoundingBox: compositeBox,
    });
  }

  return results;
}
