import type {
  PackageAnalysis,
  Declaration,
  DeclarationType,
  ComplianceAssessment,
  ComplianceEvaluationSummary,
  ComplianceResult,
  EvidenceSufficiency,
  Severity,
  Rule,
} from '@lm-vision/shared-types';
import {
  loadAuthoritativeRuleBundle,
  getAllAuthoritativeRules,
} from './bundle/rule-bundle-loader.js';
import { AUTHORITATIVE_BUNDLE_ID } from './bundle/manifest.js';

export const RULE_ENGINE_VERSION = '1.0.0';

/**
 * Standard SI Units permitted under Rule 13 of Legal Metrology (Packaged Commodities) Rules, 2011
 */
const VALID_SI_WEIGHT_UNITS = new Set(['g', 'kg', 'mg']);
const VALID_SI_VOLUME_UNITS = new Set(['ml', 'l', 'cubic cm']);
const VALID_SI_LENGTH_UNITS = new Set(['mm', 'cm', 'm']);
const VALID_SI_AREA_UNITS = new Set(['sq cm', 'sq m', 'sq mm']);
const VALID_SI_COUNT_UNITS = new Set(['n', 'u', 'count', 'piece', 'pieces']);

const PROHIBITED_NON_METRIC_UNITS = [
  'lb',
  'lbs',
  'pound',
  'pounds',
  'oz',
  'ounce',
  'ounces',
  'fluid ounce',
  'fl oz',
  'dozen',
  'dz',
  'score',
  'gross',
  'great gross',
];

export interface ComplianceEvaluationInput {
  readonly inspectionId: string;
  readonly packageAnalysis: PackageAnalysis;
  readonly actualSalePrice?: number;
  readonly packageType?: 'RETAIL' | 'WHOLESALE' | 'INDUSTRIAL' | 'INSTITUTIONAL';
  readonly commodityCategory?: string;
  readonly packageNetQuantityGramsOrMl?: number;
  readonly isBlownMouldedOrPerforated?: boolean;
  readonly options?: {
    readonly rules?: readonly Rule[];
  };
}

/**
 * Cross-platform RFC 4122 v4 UUID generator that works across React Native, Node, and Web
 * without importing the Node standard library 'crypto' module.
 */
function generateUUID(): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Helper to construct a canonical ComplianceAssessment entity with all required fields
 */
function createAssessment(params: {
  id?: string;
  inspectionId: string;
  rule: Rule;
  result: ComplianceResult;
  evidenceSufficiency: EvidenceSufficiency;
  severity?: Severity;
  explanation: string;
  observedValue?: unknown;
  expectedConstraint?: unknown;
  deviation?: string;
  declarationIds?: string[];
  evidenceIds?: string[];
  confidence?: number;
  aiExplanation?: string;
  evaluatedAt: string;
}): ComplianceAssessment {
  const ruleSource = params.rule.sourceMetadata ?? {
    sourceDocument: 'The Legal Metrology (Packaged Commodities) Rules, 2011',
    sourcePage: 1,
    gazetteNotificationNumber: 'G.S.R. 202(E)',
    clauseReference: params.rule.ruleNumber,
  };

  return {
    id: params.id ?? generateUUID(),
    inspectionId: params.inspectionId,
    ruleId: params.rule.ruleId,
    ruleVersionId: String(params.rule.version ?? 1),
    ruleNumber: params.rule.ruleNumber,
    subRule: params.rule.subRule,
    ruleTitle: params.rule.title,
    ruleKind: params.rule.ruleKind,
    ruleSource,
    result: params.result,
    evidenceSufficiency: params.evidenceSufficiency,
    severity: params.severity ?? params.rule.severity,
    explanation: params.explanation,
    observedValue: params.observedValue,
    expectedConstraint: params.expectedConstraint,
    deviation: params.deviation,
    declarationIds: params.declarationIds ?? [],
    evidenceIds: params.evidenceIds ?? [],
    confidence: params.confidence ?? 1.0,
    aiExplanation: params.aiExplanation,
    engineVersion: RULE_ENGINE_VERSION,
    ruleBundleId: AUTHORITATIVE_BUNDLE_ID,
    evaluatedAt: params.evaluatedAt,
    createdAt: params.evaluatedAt,
  };
}

/**
 * Helper to find declarations matching any of the candidate types.
 */
function findDeclarations(
  declarations: readonly Declaration[],
  types: readonly DeclarationType[]
): Declaration[] {
  const typeSet = new Set(types);
  return declarations.filter((d) => typeSet.has(d.type));
}

/**
 * Parses numeric value from quantity raw text if not already normalized.
 * e.g., "500 g" -> { value: 500, unit: "g" }
 */
function parseQuantity(
  rawText: string,
  existingNormalized?: unknown,
  existingUnit?: string | null
): { value: number | null; unit: string | null } {
  if (typeof existingNormalized === 'number' && existingUnit) {
    return { value: existingNormalized, unit: existingUnit.toLowerCase().trim() };
  }

  const match = rawText.match(/([\d.]+)\s*([a-zA-Z\s]+)/);
  if (match && match[1] && match[2]) {
    const val = parseFloat(match[1]);
    return {
      value: isNaN(val) ? null : val,
      unit: match[2].toLowerCase().trim(),
    };
  }

  return { value: null, unit: null };
}

/**
 * Parses numeric MRP value from text.
 * e.g., "MRP Rs. 149.00 (incl. of all taxes)" -> 149.00
 */
function parseMrp(rawText: string, existingNormalized?: unknown): number | null {
  if (typeof existingNormalized === 'number') {
    return existingNormalized;
  }
  const match = rawText.match(/(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (match && match[1]) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(val) ? null : val;
  }
  return null;
}

/**
 * Evaluates package analysis observations against the authoritative Legal Metrology Rules, 2011 (GSR 202(E)).
 * 
 * CORE PRINCIPLES:
 * 1. Offline-First: 0 network calls, 0 external APIs, 0 LLM inferences.
 * 2. Deterministic: Same input strictly yields identical outputs.
 * 3. Accurate Legal Outcomes: Produces PASS, FAIL, REQUIRES_VERIFICATION, NOT_APPLICABLE, INSUFFICIENT_EVIDENCE.
 * 4. Grounded in GSR 202(E): Cites exact statutory sections and pages.
 */
export function evaluateCompliance(input: ComplianceEvaluationInput): ComplianceEvaluationSummary {
  // Ensure bundle is loaded and verified
  loadAuthoritativeRuleBundle();

  const rules = input.options?.rules ?? getAllAuthoritativeRules();
  const declarations = input.packageAnalysis.declarations ?? [];
  const measurements = input.packageAnalysis.visualMeasurements ?? [];
  const quality = input.packageAnalysis.quality;
  const isImageUnacceptable = Boolean(quality && (!quality.isAcceptable || quality.sharpness < 35));
  const now = new Date().toISOString();

  const assessments: ComplianceAssessment[] = [];

  // --------------------------------------------------------------------------
  // Check Rule 3 General Scope Exemptions (GSR 202(E) Page 3)
  // --------------------------------------------------------------------------
  const isInstitutionalOrIndustrial =
    input.packageType === 'INSTITUTIONAL' || input.packageType === 'INDUSTRIAL';

  // Rule 3(a): Quantity > 25 kg or 25 L (excluding cement/fertilizer up to 50 kg)
  const isWholesaleBulkExempt =
    input.packageType === 'WHOLESALE' &&
    typeof input.packageNetQuantityGramsOrMl === 'number' &&
    input.packageNetQuantityGramsOrMl > 25000 &&
    !['CEMENT', 'FERTILIZER'].includes((input.commodityCategory ?? '').toUpperCase());

  for (const rule of rules) {
    // If package is exempt under Rule 3, retail rules are NOT_APPLICABLE
    if (isInstitutionalOrIndustrial) {
      assessments.push(
        createAssessment({
          inspectionId: input.inspectionId,
          rule,
          result: 'NOT_APPLICABLE',
          evidenceSufficiency: 'SUFFICIENT',
          explanation:
            'Packaged commodity is designated for industrial or institutional consumers and is exempted from Chapter II retail packaging provisions under GSR 202(E) Rule 3(b).',
          confidence: 1.0,
          evaluatedAt: now,
        })
      );
      continue;
    }

    if (isWholesaleBulkExempt) {
      assessments.push(
        createAssessment({
          inspectionId: input.inspectionId,
          rule,
          result: 'NOT_APPLICABLE',
          evidenceSufficiency: 'SUFFICIENT',
          explanation:
            'Package contains quantity exceeding 25 kg/L (excluding cement/fertiliser up to 50 kg) and is exempted from Chapter II retail packaging provisions under GSR 202(E) Rule 3(a).',
          observedValue: input.packageNetQuantityGramsOrMl,
          expectedConstraint: '<= 25000g or 25000ml',
          confidence: 1.0,
          evaluatedAt: now,
        })
      );
      continue;
    }

    // ------------------------------------------------------------------------
    // Rule Evaluation Dispatch by Rule ID
    // ------------------------------------------------------------------------
    switch (rule.ruleId) {
      // ----------------------------------------------------------------------
      // 1. Rule 6(1)(a) & 10(1): Manufacturer / Packer / Importer Name & Address
      // ----------------------------------------------------------------------
      case 'GSR-202E-RULE-06-01-A': {
        const mfgDecs = findDeclarations(declarations, [
          'MANUFACTURER_NAME_ADDRESS',
          'PACKER_NAME_ADDRESS',
          'IMPORTER_NAME_ADDRESS',
        ]);
        const primaryDec = mfgDecs[0];

        if (!primaryDec) {
          if (isImageUnacceptable) {
            assessments.push(
              createAssessment({
                inspectionId: input.inspectionId,
                rule,
                result: 'INSUFFICIENT_EVIDENCE',
                evidenceSufficiency: 'INSUFFICIENT',
                explanation:
                  'Manufacturer or packer declaration could not be extracted due to poor image quality or blur. Re-take inspection image with clear lighting.',
                confidence: 0.2,
                evaluatedAt: now,
              })
            );
          } else {
            assessments.push(
              createAssessment({
                inspectionId: input.inspectionId,
                rule,
                result: 'FAIL',
                evidenceSufficiency: 'SUFFICIENT',
                explanation:
                  'No declaration of the name and complete address of the manufacturer, packer, or importer found on the package label (Rule 6(1)(a) & Rule 10(1)).',
                deviation: 'Mandatory declaration missing from packaging label.',
                confidence: 0.95,
                evaluatedAt: now,
              })
            );
          }
          break;
        }

        if (primaryDec.confidence < 0.45) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'INSUFFICIENT_EVIDENCE',
              evidenceSufficiency: 'LOW_CONFIDENCE',
              explanation: `Manufacturer/packer declaration extracted with low confidence (${(primaryDec.confidence * 100).toFixed(0)}%). Visual verification required.`,
              observedValue: primaryDec.rawText,
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
          break;
        }

        const rawLower = primaryDec.rawText.toLowerCase();
        const hasLocationOrPin =
          /\b\d{6}\b/.test(primaryDec.rawText) ||
          /(road|street|nagar|plot|industrial|estate|dist|district|state|city|india|pin|post)/i.test(
            rawLower
          );

        if (primaryDec.rawText.trim().length < 12 || !hasLocationOrPin) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'REQUIRES_VERIFICATION',
              evidenceSufficiency: 'LOW_CONFIDENCE',
              explanation:
                'Manufacturer/packer name is declared, but the address appears partial or lacks identifiable postal/city/pin details. Rule 10(1) requires a complete address.',
              observedValue: primaryDec.rawText,
              expectedConstraint: 'Name and complete postal address enabling consumer identification',
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
        } else {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'PASS',
              evidenceSufficiency: 'SUFFICIENT',
              explanation:
                'Definite and conspicuous declaration of manufacturer/packer name and address is present in compliance with Rule 6(1)(a) and Rule 10(1).',
              observedValue: primaryDec.rawText,
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
        }
        break;
      }

      // ----------------------------------------------------------------------
      // 2. Rule 6(1)(b): Generic or Common Name of Commodity
      // ----------------------------------------------------------------------
      case 'GSR-202E-RULE-06-01-B': {
        const nameDecs = findDeclarations(declarations, ['GENERIC_NAME']);
        const primaryDec = nameDecs[0];

        if (!primaryDec) {
          if (isImageUnacceptable) {
            assessments.push(
              createAssessment({
                inspectionId: input.inspectionId,
                rule,
                result: 'INSUFFICIENT_EVIDENCE',
                evidenceSufficiency: 'INSUFFICIENT',
                explanation:
                  'Generic/common commodity name could not be extracted due to poor image quality or blur.',
                confidence: 0.2,
                evaluatedAt: now,
              })
            );
          } else {
            assessments.push(
              createAssessment({
                inspectionId: input.inspectionId,
                rule,
                result: 'FAIL',
                evidenceSufficiency: 'SUFFICIENT',
                explanation:
                  'Common or generic name of the commodity is missing from the package label in violation of Rule 6(1)(b).',
                deviation: 'Generic/common name declaration not found.',
                confidence: 0.95,
                evaluatedAt: now,
              })
            );
          }
          break;
        }

        if (primaryDec.confidence < 0.45) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'INSUFFICIENT_EVIDENCE',
              evidenceSufficiency: 'LOW_CONFIDENCE',
              explanation:
                'Commodity name extracted with low confidence. Physical verification required.',
              observedValue: primaryDec.rawText,
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
        } else {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'PASS',
              evidenceSufficiency: 'SUFFICIENT',
              explanation:
                'Generic or common name of the commodity is clearly declared in compliance with Rule 6(1)(b).',
              observedValue: primaryDec.rawText,
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
        }
        break;
      }

      // ----------------------------------------------------------------------
      // 3. Rule 6(1)(c) & 11, 12, 13: Net Quantity in Standard SI Units
      // ----------------------------------------------------------------------
      case 'GSR-202E-RULE-06-01-C': {
        const netQtyDecs = findDeclarations(declarations, ['NET_QUANTITY']);
        const primaryDec = netQtyDecs[0];

        if (!primaryDec) {
          if (isImageUnacceptable) {
            assessments.push(
              createAssessment({
                inspectionId: input.inspectionId,
                rule,
                result: 'INSUFFICIENT_EVIDENCE',
                evidenceSufficiency: 'INSUFFICIENT',
                explanation:
                  'Net quantity declaration could not be extracted due to poor image quality or blur.',
                confidence: 0.2,
                evaluatedAt: now,
              })
            );
          } else {
            assessments.push(
              createAssessment({
                inspectionId: input.inspectionId,
                rule,
                result: 'FAIL',
                evidenceSufficiency: 'SUFFICIENT',
                explanation:
                  'Net quantity declaration is missing from the package in violation of Rule 6(1)(c).',
                deviation: 'Mandatory net quantity declaration not found.',
                confidence: 0.95,
                evaluatedAt: now,
              })
            );
          }
          break;
        }

        if (primaryDec.confidence < 0.45) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'INSUFFICIENT_EVIDENCE',
              evidenceSufficiency: 'LOW_CONFIDENCE',
              explanation:
                'Net quantity extracted with low confidence. Physical inspection required.',
              observedValue: primaryDec.rawText,
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
          break;
        }

        const parsed = parseQuantity(primaryDec.rawText, primaryDec.normalizedValue, primaryDec.unit);
        const rawLower = primaryDec.rawText.toLowerCase();

        // Check for non-metric prohibited units (Rule 13(4))
        const hasProhibitedUnit = PROHIBITED_NON_METRIC_UNITS.some((u) =>
          new RegExp(`\\b${u}\\b`, 'i').test(rawLower)
        );

        if (hasProhibitedUnit) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'FAIL',
              evidenceSufficiency: 'SUFFICIENT',
              explanation:
                'Net quantity is declared in prohibited non-metric units (e.g. lbs, oz, dozen). Rule 13 strictly prohibits non-standard units.',
              observedValue: primaryDec.rawText,
              expectedConstraint: 'Standard SI metric units (g, kg, ml, L, N, U)',
              deviation: 'Prohibited non-metric unit declared.',
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
          break;
        }

        // Check for misleading expressions like "approx" or "not less than" (Rule 11(2))
        const hasMisleadingTerms = /\b(approx|approx\.|approximately|not less than|minimum)\b/i.test(
          rawLower
        );
        if (hasMisleadingTerms) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'FAIL',
              evidenceSufficiency: 'SUFFICIENT',
              explanation:
                'Net quantity statement contains qualifying words like "approx" or "not less than", which are strictly prohibited under Rule 11(2).',
              observedValue: primaryDec.rawText,
              deviation: 'Misleading qualification term used with net quantity.',
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
          break;
        }

        // Validate SI unit
        const unit = parsed.unit ?? '';
        const isValidUnit =
          VALID_SI_WEIGHT_UNITS.has(unit) ||
          VALID_SI_VOLUME_UNITS.has(unit) ||
          VALID_SI_LENGTH_UNITS.has(unit) ||
          VALID_SI_AREA_UNITS.has(unit) ||
          VALID_SI_COUNT_UNITS.has(unit) ||
          /^(g|gm|gms|kg|kgs|ml|l|ltr|ltrs|meter|metre|m|cm|mm|n|u)$/i.test(unit);

        if (!isValidUnit || parsed.value === null) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'REQUIRES_VERIFICATION',
              evidenceSufficiency: 'LOW_CONFIDENCE',
              explanation:
                'Net quantity unit or numeric value could not be definitively validated as a standard SI symbol. Verification required.',
              observedValue: primaryDec.rawText,
              expectedConstraint: 'Standard SI unit (g, kg, ml, L, N, U)',
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
        } else {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'PASS',
              evidenceSufficiency: 'SUFFICIENT',
              explanation:
                'Net quantity is declared in standard SI units in compliance with Rule 6(1)(c) and Rule 13.',
              observedValue: primaryDec.rawText,
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
        }
        break;
      }

      // ----------------------------------------------------------------------
      // 4. Rule 6(1)(d) & 6(1)(g) Proviso A: Month and Year of Manufacture/Packing
      // ----------------------------------------------------------------------
      case 'GSR-202E-RULE-06-01-D': {
        const cat = (input.commodityCategory ?? '').toLowerCase();
        const isBidiOrAgarbattiOrLpg =
          cat.includes('bidi') ||
          cat.includes('agarbatti') ||
          cat.includes('incense') ||
          cat.includes('lpg');

        if (isBidiOrAgarbattiOrLpg) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'NOT_APPLICABLE',
              evidenceSufficiency: 'SUFFICIENT',
              explanation:
                'Exempted from declaration of month and year of manufacture or pre-packing under GSR 202(E) Rule 6(1)(g) Proviso A.',
              confidence: 1.0,
              evaluatedAt: now,
            })
          );
          break;
        }

        const dateDecs = findDeclarations(declarations, [
          'DATE_OF_MANUFACTURE',
          'DATE_OF_PACKAGING',
          'DATE_OF_IMPORT',
        ]);
        const primaryDec = dateDecs[0];

        if (!primaryDec) {
          if (isImageUnacceptable) {
            assessments.push(
              createAssessment({
                inspectionId: input.inspectionId,
                rule,
                result: 'INSUFFICIENT_EVIDENCE',
                evidenceSufficiency: 'INSUFFICIENT',
                explanation:
                  'Date of manufacture/packing could not be extracted due to poor image quality or blur.',
                confidence: 0.2,
                evaluatedAt: now,
              })
            );
          } else {
            assessments.push(
              createAssessment({
                inspectionId: input.inspectionId,
                rule,
                result: 'FAIL',
                evidenceSufficiency: 'SUFFICIENT',
                explanation:
                  'Month and year of manufacture, pre-packing, or import is missing from the package in violation of Rule 6(1)(d).',
                deviation: 'Mandatory manufacturing or packaging date missing.',
                confidence: 0.95,
                evaluatedAt: now,
              })
            );
          }
          break;
        }

        if (primaryDec.confidence < 0.45) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'INSUFFICIENT_EVIDENCE',
              evidenceSufficiency: 'LOW_CONFIDENCE',
              explanation:
                'Date declaration extracted with low confidence. Physical label inspection required.',
              observedValue: primaryDec.rawText,
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
          break;
        }

        // Rule 6(1)(d) Explanation I: Month and year may be expressed in words or numerals
        const hasValidDatePattern =
          /(?:\b\d{1,2}[\/\-\.]\d{2,4}\b)|(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*[\/\-\.,]?\s*\d{2,4})/i.test(
            primaryDec.rawText
          );

        if (!hasValidDatePattern) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'REQUIRES_VERIFICATION',
              evidenceSufficiency: 'LOW_CONFIDENCE',
              explanation:
                'Date declaration present but format does not clearly convey month and year. Rule 6(1)(d) Explanation I requires unambiguous month and year.',
              observedValue: primaryDec.rawText,
              expectedConstraint: 'Month and year in words or numerals (e.g. MM/YYYY or Month YYYY)',
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
        } else {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'PASS',
              evidenceSufficiency: 'SUFFICIENT',
              explanation:
                'Month and year of manufacture/packing/import is clearly declared in compliance with Rule 6(1)(d).',
              observedValue: primaryDec.rawText,
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
        }
        break;
      }

      // ----------------------------------------------------------------------
      // 5. Rule 6(1)(e) & 2(m), 6(3): Retail Sale Price (MRP) Inclusive of All Taxes
      // ----------------------------------------------------------------------
      case 'GSR-202E-RULE-06-01-E': {
        const cat = (input.commodityCategory ?? '').toLowerCase();
        const isBidiOrLpg = cat.includes('bidi') || cat.includes('lpg');
        if (isBidiOrLpg) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'NOT_APPLICABLE',
              evidenceSufficiency: 'SUFFICIENT',
              explanation:
                'Exempted from MRP declaration under GSR 202(E) Rule 6(1)(g) Proviso C.',
              confidence: 1.0,
              evaluatedAt: now,
            })
          );
          break;
        }

        const mrpDecs = findDeclarations(declarations, ['MRP']);
        const primaryDec = mrpDecs[0];

        if (!primaryDec) {
          if (isImageUnacceptable) {
            assessments.push(
              createAssessment({
                inspectionId: input.inspectionId,
                rule,
                result: 'INSUFFICIENT_EVIDENCE',
                evidenceSufficiency: 'INSUFFICIENT',
                explanation:
                  'Maximum Retail Price (MRP) could not be extracted due to poor image quality or blur.',
                confidence: 0.2,
                evaluatedAt: now,
              })
            );
          } else {
            assessments.push(
              createAssessment({
                inspectionId: input.inspectionId,
                rule,
                result: 'FAIL',
                evidenceSufficiency: 'SUFFICIENT',
                explanation:
                  'Maximum Retail Price (MRP) declaration is missing from the package in violation of Rule 6(1)(e).',
                deviation: 'Mandatory MRP declaration not found on package.',
                confidence: 0.95,
                evaluatedAt: now,
              })
            );
          }
          break;
        }

        if (primaryDec.confidence < 0.45) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'INSUFFICIENT_EVIDENCE',
              evidenceSufficiency: 'LOW_CONFIDENCE',
              explanation:
                'MRP declaration extracted with low confidence. Physical inspection required.',
              observedValue: primaryDec.rawText,
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
          break;
        }

        const rawLower = primaryDec.rawText.toLowerCase();

        // Check sticker alteration violation (Rule 6(3))
        if (
          rawLower.includes('sticker') &&
          (rawLower.includes('overprinted') ||
            rawLower.includes('altered') ||
            rawLower.includes('revised up'))
        ) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'FAIL',
              evidenceSufficiency: 'SUFFICIENT',
              explanation:
                'Unauthorized sticker altering retail sale price detected in direct violation of Rule 6(3).',
              observedValue: primaryDec.rawText,
              deviation: 'Individual sticker altering MRP is prohibited under Rule 6(3).',
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
          break;
        }

        // Check if explicitly states "taxes extra" or "exclusive of taxes" (Prohibited under Rule 2(m))
        if (rawLower.includes('taxes extra') || rawLower.includes('exclusive of taxes')) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'FAIL',
              evidenceSufficiency: 'SUFFICIENT',
              explanation:
                'MRP is declared with taxes extra or exclusive of taxes. Rule 2(m) strictly requires retail sale price to be inclusive of all taxes.',
              observedValue: primaryDec.rawText,
              expectedConstraint: 'MRP Rs ... inclusive of all taxes',
              deviation: 'Taxes stated as extra, prohibited under Rule 2(m).',
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
          break;
        }

        const parsedValue = parseMrp(primaryDec.rawText, primaryDec.normalizedValue);
        const hasTaxPhrase =
          rawLower.includes('incl') ||
          rawLower.includes('taxes') ||
          rawLower.includes('all taxes');

        if (parsedValue === null) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'REQUIRES_VERIFICATION',
              evidenceSufficiency: 'LOW_CONFIDENCE',
              explanation:
                'MRP text present but numeric price value could not be unambiguously resolved.',
              observedValue: primaryDec.rawText,
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
        } else if (!hasTaxPhrase) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'REQUIRES_VERIFICATION',
              evidenceSufficiency: 'LOW_CONFIDENCE',
              explanation:
                'MRP declared with numeric value but mandatory phrase "inclusive of all taxes" is not clearly confirmed on label.',
              observedValue: primaryDec.rawText,
              expectedConstraint: 'MRP Rs ... inclusive of all taxes (Rule 2(m))',
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
        } else {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'PASS',
              evidenceSufficiency: 'SUFFICIENT',
              explanation:
                'Maximum Retail Price (MRP) is declared in statutory format inclusive of all taxes in compliance with Rule 6(1)(e) & Rule 2(m).',
              observedValue: primaryDec.rawText,
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
        }
        break;
      }

      // ----------------------------------------------------------------------
      // 6. Rule 6(2): Consumer Care Details
      // ----------------------------------------------------------------------
      case 'GSR-202E-RULE-06-02': {
        const careDecs = findDeclarations(declarations, ['CONSUMER_CARE_DETAILS']);
        const primaryDec = careDecs[0];

        if (!primaryDec) {
          if (isImageUnacceptable) {
            assessments.push(
              createAssessment({
                inspectionId: input.inspectionId,
                rule,
                result: 'INSUFFICIENT_EVIDENCE',
                evidenceSufficiency: 'INSUFFICIENT',
                explanation:
                  'Consumer care details could not be extracted due to poor image quality or blur.',
                confidence: 0.2,
                evaluatedAt: now,
              })
            );
          } else {
            assessments.push(
              createAssessment({
                inspectionId: input.inspectionId,
                rule,
                result: 'FAIL',
                evidenceSufficiency: 'SUFFICIENT',
                explanation:
                  'Consumer care contact details for complaints are missing from the package in violation of Rule 6(2).',
                deviation: 'Consumer care contact channels missing.',
                confidence: 0.95,
                evaluatedAt: now,
              })
            );
          }
          break;
        }

        if (primaryDec.confidence < 0.45) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'INSUFFICIENT_EVIDENCE',
              evidenceSufficiency: 'LOW_CONFIDENCE',
              explanation:
                'Consumer care details extracted with low confidence. Physical label inspection required.',
              observedValue: primaryDec.rawText,
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
          break;
        }

        const rawLower = primaryDec.rawText.toLowerCase();
        const hasPhone = /(?:tel|phone|call|toll\s*free|help(?:line)?|ph)\s*[:\-\s]?\s*[\d\+\s\-]{6,15}/i.test(
          primaryDec.rawText
        );
        const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(primaryDec.rawText);
        const hasPostalOrAddress = /(?:contact|address|executive|manager|po box|care\s*cell)/i.test(
          rawLower
        );

        if (!hasPhone && !hasEmail && !hasPostalOrAddress) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'FAIL',
              evidenceSufficiency: 'SUFFICIENT',
              explanation:
                'Consumer care declaration lacks contact channel. Rule 6(2) requires telephone number, email, or complete contact address for consumer complaints.',
              observedValue: primaryDec.rawText,
              expectedConstraint: 'Telephone number, address, or email of consumer complaints office',
              deviation: 'No reachable consumer contact channel declared.',
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
        } else {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'PASS',
              evidenceSufficiency: 'SUFFICIENT',
              explanation:
                'Consumer care contact details (telephone/email/address) are provided in accordance with Rule 6(2).',
              observedValue: primaryDec.rawText,
              confidence: primaryDec.confidence,
              evaluatedAt: now,
            })
          );
        }
        break;
      }

      // ----------------------------------------------------------------------
      // 7. Rule 7(2) read with Table I: Minimum Numeral Height on PDP
      // ----------------------------------------------------------------------
      case 'GSR-202E-RULE-07-02-T1': {
        let qtyVal = input.packageNetQuantityGramsOrMl;
        if (typeof qtyVal !== 'number') {
          const qtyDecs = findDeclarations(declarations, ['NET_QUANTITY']);
          const firstQty = qtyDecs[0];
          if (firstQty) {
            const parsed = parseQuantity(firstQty.rawText, firstQty.normalizedValue, firstQty.unit);
            if (typeof parsed.value === 'number') {
              if (parsed.unit?.includes('kg') || parsed.unit?.includes('l')) {
                qtyVal = parsed.value * 1000;
              } else {
                qtyVal = parsed.value;
              }
            }
          }
        }

        const isBlown = Boolean(input.isBlownMouldedOrPerforated);
        let minRequiredMm = 1.0;
        if (typeof qtyVal === 'number') {
          if (qtyVal > 500) {
            minRequiredMm = isBlown ? 6.0 : 4.0;
          } else if (qtyVal > 200) {
            minRequiredMm = isBlown ? 4.0 : 2.0;
          } else {
            minRequiredMm = isBlown ? 2.0 : 1.0;
          }
        } else {
          minRequiredMm = isBlown ? 2.0 : 1.0;
        }

        const numeralHeightMeasure = measurements.find(
          (m) =>
            m.type === 'FONT_HEIGHT' ||
            m.type === 'NUMERAL_HEIGHT_TO_PANEL_RATIO' ||
            m.id?.toLowerCase().includes('numeral') ||
            m.id?.toLowerCase().includes('quantity')
        );

        if (!numeralHeightMeasure) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'INSUFFICIENT_EVIDENCE',
              evidenceSufficiency: 'INSUFFICIENT',
              explanation: `Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: ${minRequiredMm}mm).`,
              expectedConstraint: `>= ${minRequiredMm}mm (Table I)`,
              confidence: 0.3,
              evaluatedAt: now,
            })
          );
          break;
        }

        if (numeralHeightMeasure.confidence < 0.45) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'INSUFFICIENT_EVIDENCE',
              evidenceSufficiency: 'LOW_CONFIDENCE',
              explanation:
                'Numeral height measurement confidence is below calibrated threshold. Manual physical verification required.',
              observedValue: `${numeralHeightMeasure.value} ${numeralHeightMeasure.unit}`,
              expectedConstraint: `>= ${minRequiredMm}mm`,
              confidence: numeralHeightMeasure.confidence,
              evaluatedAt: now,
            })
          );
          break;
        }

        const measuredHeightMm =
          numeralHeightMeasure.unit === 'cm'
            ? numeralHeightMeasure.value * 10
            : numeralHeightMeasure.value;

        if (measuredHeightMm < minRequiredMm) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'FAIL',
              evidenceSufficiency: 'SUFFICIENT',
              explanation: `Measured numeral height (${measuredHeightMm.toFixed(1)}mm) is below the statutory minimum of ${minRequiredMm}mm prescribed in Rule 7(2) Table I.`,
              observedValue: `${measuredHeightMm.toFixed(1)}mm`,
              expectedConstraint: `>= ${minRequiredMm}mm (Rule 7(2) Table I)`,
              deviation: `Numeral height deficit of ${(minRequiredMm - measuredHeightMm).toFixed(1)}mm.`,
              confidence: numeralHeightMeasure.confidence,
              evaluatedAt: now,
            })
          );
        } else {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'PASS',
              evidenceSufficiency: 'SUFFICIENT',
              explanation: `Numeral height (${measuredHeightMm.toFixed(1)}mm) meets the statutory minimum of ${minRequiredMm}mm required under Rule 7(2) Table I.`,
              observedValue: `${measuredHeightMm.toFixed(1)}mm`,
              expectedConstraint: `>= ${minRequiredMm}mm`,
              confidence: numeralHeightMeasure.confidence,
              evaluatedAt: now,
            })
          );
        }
        break;
      }

      // ----------------------------------------------------------------------
      // 8. Rule 18(2): Prohibition of Sale Above Declared MRP
      // ----------------------------------------------------------------------
      case 'GSR-202E-RULE-18-02': {
        const mrpDecs = findDeclarations(declarations, ['MRP']);
        const firstMrp = mrpDecs[0];
        const mrpValue =
          firstMrp != null
            ? parseMrp(firstMrp.rawText, firstMrp.normalizedValue)
            : null;

        if (typeof input.actualSalePrice !== 'number') {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'NOT_APPLICABLE',
              evidenceSufficiency: 'SUFFICIENT',
              explanation:
                'No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.',
              confidence: 1.0,
              evaluatedAt: now,
            })
          );
          break;
        }

        if (mrpValue === null) {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'REQUIRES_VERIFICATION',
              evidenceSufficiency: 'LOW_CONFIDENCE',
              explanation: `Actual sale price (₹${input.actualSalePrice}) was provided, but package MRP could not be extracted for comparison.`,
              observedValue: `Actual sale price: ₹${input.actualSalePrice}`,
              confidence: 0.5,
              evaluatedAt: now,
            })
          );
          break;
        }

        if (input.actualSalePrice > mrpValue) {
          const excess = (input.actualSalePrice - mrpValue).toFixed(2);
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'FAIL',
              evidenceSufficiency: 'SUFFICIENT',
              severity: 'CRITICAL',
              explanation: `Sale price (₹${input.actualSalePrice}) exceeds declared package MRP (₹${mrpValue}) by ₹${excess}. Severe overcharging violation under Rule 18(2).`,
              observedValue: `Sale Price: ₹${input.actualSalePrice}`,
              expectedConstraint: `<= Declared MRP ₹${mrpValue}`,
              deviation: `Overcharge of ₹${excess}`,
              confidence: 0.98,
              evaluatedAt: now,
            })
          );
        } else {
          assessments.push(
            createAssessment({
              inspectionId: input.inspectionId,
              rule,
              result: 'PASS',
              evidenceSufficiency: 'SUFFICIENT',
              explanation: `Sale price (₹${input.actualSalePrice}) does not exceed declared MRP (₹${mrpValue}), in compliance with Rule 18(2).`,
              observedValue: `Sale Price: ₹${input.actualSalePrice}, MRP: ₹${mrpValue}`,
              expectedConstraint: `<= Declared MRP ₹${mrpValue}`,
              confidence: 0.98,
              evaluatedAt: now,
            })
          );
        }
        break;
      }

      default: {
        // Fallback for custom or test rules
        assessments.push(
          createAssessment({
            inspectionId: input.inspectionId,
            rule,
            result: 'REQUIRES_VERIFICATION',
            evidenceSufficiency: 'LOW_CONFIDENCE',
            explanation: `Custom or unhandled rule ${rule.ruleId} requires manual inspector evaluation.`,
            confidence: 0.5,
            evaluatedAt: now,
          })
        );
        break;
      }
    }
  }

  // --------------------------------------------------------------------------
  // Compute Overall Compliance Status & Aggregated Counts
  // --------------------------------------------------------------------------
  let passCount = 0;
  let failCount = 0;
  let requiresVerificationCount = 0;
  let notApplicableCount = 0;
  let insufficientEvidenceCount = 0;

  for (const a of assessments) {
    switch (a.result) {
      case 'PASS':
        passCount++;
        break;
      case 'FAIL':
        failCount++;
        break;
      case 'REQUIRES_VERIFICATION':
        requiresVerificationCount++;
        break;
      case 'NOT_APPLICABLE':
        notApplicableCount++;
        break;
      case 'INSUFFICIENT_EVIDENCE':
        insufficientEvidenceCount++;
        break;
    }
  }

  let overallStatus: ComplianceResult = 'PASS';
  if (failCount > 0) {
    overallStatus = 'FAIL';
  } else if (requiresVerificationCount > 0) {
    overallStatus = 'REQUIRES_VERIFICATION';
  } else if (insufficientEvidenceCount > 0) {
    overallStatus = 'INSUFFICIENT_EVIDENCE';
  } else if (passCount === 0 && notApplicableCount > 0) {
    overallStatus = 'NOT_APPLICABLE';
  }

  return {
    inspectionId: input.inspectionId,
    engineVersion: RULE_ENGINE_VERSION,
    ruleBundleId: AUTHORITATIVE_BUNDLE_ID,
    ruleCountEvaluated: assessments.length,
    passCount,
    failCount,
    requiresVerificationCount,
    notApplicableCount,
    insufficientEvidenceCount,
    assessments,
    overallStatus,
    evaluatedAt: now,
  };
}
