/**
 * Dedicated Product Name / Generic Name Extractor
 *
 * Implements sophisticated extraction for PRODUCT_NAME (GENERIC_NAME under GSR 202(E)):
 * 1. Does NOT simply pick the largest or front-most text line.
 * 2. Distinguishes brand name, product name, slogans, ingredients, and variants.
 * 3. Uses product-category dictionaries as supporting signals ONLY (never mandatory).
 * 4. Flags multiple plausible candidates with isAmbiguous = true and REQUIRES_VERIFICATION.
 */

import type { DeclarationType, TextRegion } from '@lm-vision/shared-types';
import type {
  ConfidenceTier,
  DetectionResult,
  DetectorContext,
  EvidenceTraceability,
  IDeclarationDetector,
  StructuredDeclarationCandidate,
} from '../intelligence/candidateSchema.js';
import { validateProductNameCandidate } from './fieldValidators.js';

// Supporting category signals (dictionary membership is NOT mandatory)
export const COMMON_PRODUCT_CATEGORIES = [
  'atta',
  'flour',
  'wheat',
  'rice',
  'dal',
  'pulse',
  'oil',
  'ghee',
  'tea',
  'coffee',
  'biscuit',
  'biscuits',
  'cookies',
  'snack',
  'snacks',
  'namkeen',
  'noodle',
  'noodles',
  'pasta',
  'soap',
  'shampoo',
  'conditioner',
  'detergent',
  'toothpaste',
  'juice',
  'drink',
  'beverage',
  'masala',
  'spice',
  'spices',
  'salt',
  'sugar',
  'honey',
  'butter',
  'paneer',
  'milk',
  'dahi',
  'oats',
  'cereal',
  'chocolate',
  'chips',
  'sauce',
  'ketchup',
  'washing powder',
  'dishwash',
  // Hindi category terms
  'आटा',
  'चावल',
  'दाल',
  'तेल',
  'घी',
  'चाय',
  'कॉफी',
  'बिस्कुट',
  'साबुन',
  'मसाला',
  'नमक',
];

export interface ScoredNameCandidate {
  region: TextRegion;
  text: string;
  categoryScore: number;
  prominenceScore: number;
  compositeScore: number;
  isBrandLikely: boolean;
  isSloganLikely: boolean;
}

export class ProductNameExtractor implements IDeclarationDetector {
  public readonly fieldType: DeclarationType = 'GENERIC_NAME';
  public readonly detectorName = 'ProductNameExtractor';

  public detect(context: DetectorContext): DetectionResult[] {
    const scoredCandidates: ScoredNameCandidate[] = [];
    const timestamp = new Date().toISOString();

    for (const region of context.regions) {
      const text = region.text.trim();
      const validation = validateProductNameCandidate(text);
      if (!validation.isValid) continue;

      // 1. Supporting category match (supporting signal only)
      const lower = text.toLowerCase();
      const hasCategoryMatch = COMMON_PRODUCT_CATEGORIES.some((cat) =>
        lower.includes(cat.toLowerCase())
      );
      const categoryScore = hasCategoryMatch ? 0.35 : 0.0;

      // 2. Spatial prominence
      const box = region.boundingBox;
      const height = box.height ?? 0.05;
      const isFront = region.surface === 'FRONT';
      const isUpperHalf = (box.yMin + box.yMax) / 2 < 0.6;
      const prominenceScore =
        (isFront ? 0.25 : 0.0) +
        (isUpperHalf ? 0.15 : 0.0) +
        Math.min(0.25, height * 2.0);

      // 3. Negative indicators for brand / slogan
      const wordCount = text.split(/\s+/).length;
      const isSingleWordUpper = wordCount === 1 && /^[A-Z]{3,}$/.test(text);
      const isBrandLikely = isSingleWordUpper && !hasCategoryMatch;
      const isSloganLikely = wordCount > 6 && !hasCategoryMatch;

      // Composite score
      let compositeScore = 0.30 + categoryScore + prominenceScore;
      if (isBrandLikely) compositeScore -= 0.20;
      if (isSloganLikely) compositeScore -= 0.25;

      compositeScore = Math.max(0.1, Math.min(1.0, compositeScore));

      scoredCandidates.push({
        region,
        text,
        categoryScore,
        prominenceScore,
        compositeScore,
        isBrandLikely,
        isSloganLikely,
      });
    }

    if (scoredCandidates.length === 0) {
      return [];
    }

    // Sort descending by composite score
    scoredCandidates.sort((a, b) => b.compositeScore - a.compositeScore);

    const top = scoredCandidates[0]!;
    const runnerUp = scoredCandidates[1];

    // Check ambiguity: if top two are close in score, flag REQUIRES_VERIFICATION
    let isAmbiguous = false;
    if (runnerUp && top.compositeScore - runnerUp.compositeScore < 0.12) {
      isAmbiguous = true;
    }

    const confidenceTier: ConfidenceTier = isAmbiguous
      ? 'MEDIUM_CONFIDENCE'
      : top.compositeScore >= 0.7
      ? 'HIGH_CONFIDENCE'
      : 'MEDIUM_CONFIDENCE';

    const traceability: EvidenceTraceability = {
      sourceRegionIds: [top.region.id],
      originalImageId: context.imageId,
      originalBoundingBox: top.region.boundingBox,
      extractionMethod: 'DIRECT_PATTERN',
      ocrPassName: context.passName,
      validationStatus: isAmbiguous ? 'REQUIRES_VERIFICATION' : 'VALID',
      conflictStatus: 'NONE',
      timestamp,
    };

    const alternateCandidates: StructuredDeclarationCandidate[] = scoredCandidates
      .slice(1, 4)
      .map((alt) => ({
        fieldType: 'GENERIC_NAME',
        originalOCRText: alt.text,
        normalizedText: alt.text,
        normalizedValue: alt.text,
        unit: null,
        confidenceTier: 'LOW_CONFIDENCE',
        nativeConfidence: alt.region.confidence ?? null,
        isAmbiguous: true,
        correctionsApplied: [],
        traceability: {
          sourceRegionIds: [alt.region.id],
          originalImageId: context.imageId,
          originalBoundingBox: alt.region.boundingBox,
          extractionMethod: 'DIRECT_PATTERN',
          validationStatus: 'REQUIRES_VERIFICATION',
          timestamp,
        },
        sourceRegion: alt.region,
      }));

    const primaryCandidate: StructuredDeclarationCandidate = {
      fieldType: 'GENERIC_NAME',
      originalOCRText: top.text,
      normalizedText: top.text,
      normalizedValue: top.text,
      unit: null,
      confidenceTier,
      nativeConfidence: top.region.confidence ?? null,
      isAmbiguous,
      correctionsApplied: [],
      traceability,
      sourceRegion: top.region,
      alternateCandidates: alternateCandidates.length > 0 ? alternateCandidates : undefined,
    };

    return [{ candidate: primaryCandidate, score: top.compositeScore }];
  }
}
