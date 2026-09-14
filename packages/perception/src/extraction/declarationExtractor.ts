/**
 * Declaration Candidate Extractor (Phase A.1)
 *
 * Scans detected OCR text regions using deterministic pattern recognition
 * to identify mandatory declarations under Legal Metrology (Packaged Commodities) Rules, 2011.
 *
 * Supports bilingual declarations: English + Devanagari (Hindi) and common Indian packaging forms:
 * - MRP ₹120.00, MRP Rs. 120.00, MRP Rs 120, MRP 120/-, M.R.P. 120.00
 * - NET QTY 500 g, NET WEIGHT 500g, Hindi metric units
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Pattern matching is an extraction mechanism, NOT a legal determination.
 * 2. Does NOT infer missing fields (returns only what is actually detected).
 * 3. Preserves rawText and TextRegion provenance on every candidate.
 * 4. Never fabricates values.
 */

import type { Declaration, DeclarationType, TextRegion } from '@lm-vision/shared-types';

export interface ExtractedCandidate {
  type: DeclarationType;
  rawText: string;
  matchedValue: string;
  unit?: string | null;
  confidence: number;
  region?: TextRegion;
}

// ============================================================================
// Deterministic Legal Metrology Pattern Matchers (English + Devanagari)
// ============================================================================

export const MRP_PATTERNS: RegExp[] = [
  // 1. English MRP with ₹, Rs., Rs, or trailing /-:
  // e.g. "MRP ₹120.00", "MRP Rs. 120.00", "MRP Rs 120", "MRP 120/-", "M.R.P. 120.00", "MAX RETAIL PRICE 120/-"
  /(?:M\.?R\.?P\.?|MAX\.?\s*RETAIL\s*PRICE|MAXIMUM\s*RETAIL\s*PRICE)\s*(?:RS\.?|INR|₹)?\s*[:.-]?\s*([0-9]+(?:\.[0-9]{1,2})?)(?:\s*\/-)?/i,
  // 2. Devanagari MRP patterns:
  // e.g. "एमआरपी ₹ 120.00", "एम.आर.पी. 120/-", "अधिकतम खुदरा मूल्य ₹ 120.00", "खुदरा मूल्य: 120/-"
  /(?:एम\.?आर\.?पी\.?|अधिकतम\s*खुदरा\s*मूल्य|खुदरा\s*मूल्य)\s*(?:रु\.?|रुपये|₹|RS\.?)?\s*[:.-]?\s*([0-9]+(?:\.[0-9]{1,2})?)(?:\s*\/-)?/i,
  // 3. Standalone Currency prefix: "₹ 120.00", "Rs. 120/-", "Rs 120", "रु. 120.00"
  /(?:RS\.?|INR|₹|रु\.?|रुपये)\s*[:.-]?\s*([0-9]+(?:\.[0-9]{1,2})?)(?:\s*\/-)?/i,
  // 4. Trailing currency suffix: "120.00 Rs", "120.00 ₹", "120/-"
  /\b([0-9]+(?:\.[0-9]{1,2})?)\s*(?:RS\.?|INR|₹|रु\.?)\b/i,
  /\b([0-9]+(?:\.[0-9]{1,2})?)\s*\/-/i,
];

export const METRIC_UNITS_PATTERN =
  '(?:kg|kgs|kilograms?|g|gm|gms|grams?|ml|mls|milliliters?|millilitres?|l|lt|ltr|litres?|liters?|m|meters?|cm|centimeters?|mm|millimeters?|n|no|numbers?|units?|pieces?|pcs?|कि\\.?ग्रा\\.?|किग्रा|किलोग्राम|ग्राम|ग्रा\\.?|लीटर|ली\\.?|मि\\.?ली\\.?|मिली|मिलीलीटर|मीटर|मी\\.?|से\\.?मी\\.?|सेंटीमीटर|संख्या|इकाई|नग)';

export const NET_QTY_PATTERNS: RegExp[] = [
  // 1. English Net Quantity / Weight headers: "NET QTY 500 g", "NET WEIGHT 500g", "NET WT. 500g", "N.W. 500g"
  new RegExp(
    `(?:NET\\s*(?:QTY|QUANTITY|WT|WEIGHT|VOL|VOLUME)|N\\.?\\s*W\\.?|N\\.?\\s*Q\\.?)\\s*[:.-]?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*(${METRIC_UNITS_PATTERN})`,
    'i'
  ),
  // 2. Hindi / Devanagari Net Quantity headers: "शुद्ध मात्रा 500 ग्राम", "शुद्ध वजन 1 कि.ग्रा.", "मात्रा: 500 g"
  new RegExp(
    `(?:शुद्ध\\s*(?:मात्रा|वजन|भार)|मात्रा|वजन|भार)\\s*[:.-]?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*(${METRIC_UNITS_PATTERN})`,
    'i'
  ),
  // 3. Standalone quantity + unit: "500 g", "500g", "1 कि.ग्रा.", "500 ग्राम"
  new RegExp(
    `\\b([0-9]+(?:\\.[0-9]+)?)\\s*(${METRIC_UNITS_PATTERN})`,
    'i'
  ),
];

export const DATE_PATTERNS: RegExp[] = [
  // 1. English manufacturing / packaging dates
  /(?:MFD|MFG|PACKED|PKD|MFR|PKG|DATE\s*OF\s*(?:MFG|MFD|PACKAGING|IMPORT|PACKING))\s*[:.-]?\s*([0-9]{1,2}[\/\.-][0-9]{4}|[A-Za-z]{3,}[\/\.\s-][0-9]{4}|[0-9]{1,2}[\/\.-][0-9]{1,2}[\/\.-][0-9]{2,4})/i,
  // 2. Hindi manufacturing / packaging dates: "निर्माण तिथि: 03/2026", "पैकिंग तिथि: 03/2026"
  /(?:निर्माण\s*तिथि|पैकिंग\s*तिथि|पैकिंग\s*दिनांक|निर्माण\s*दिनांक)\s*[:.-]?\s*([0-9]{1,2}[\/\.-][0-9]{4}|[0-9]{1,2}[\/\.-][0-9]{1,2}[\/\.-][0-9]{2,4})/i,
  // 3. Expiry / Best Before (English + Hindi)
  /(?:BEST\s*BEFORE|EXPIRY|EXP\.?|सर्वोत्तम\s*उपयोग|उपयोग\s*की\s*अंतिम\s*तिथि|समाप्ति\s*तिथि)\s*[:.-]?\s*([0-9]{1,2}[\/\.-][0-9]{4}|[A-Za-z]{3,}[\/\.\s-][0-9]{4}|[0-9]{1,2}\s*(?:MONTHS|YEARS|महीने|वर्ष))/i,
  // 4. Standalone MM/YYYY or DD/MM/YYYY
  /\b([0-9]{1,2}[\/\.-][0-9]{4})\b/,
  /\b([0-9]{1,2}[\/\.-][0-9]{1,2}[\/\.-][0-9]{2,4})\b/,
  /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*[\s\.-]+([0-9]{4})\b/i,
];

export const MFR_PATTERNS: RegExp[] = [
  // 1. English manufacturer / packer / importer
  /(?:MFD\.?\s*BY|MFG\.?\s*BY|MANUFACTURED\s*BY|PACKED\s*BY|PKD\.?\s*BY|IMPORTED\s*BY|MARKETED\s*BY)\s*[:.-]?\s*([^\n\r]+)/i,
  /(?:MADE\s*BY|PRODUCED\s*BY)\s*[:.-]?\s*([^\n\r]+)/i,
  // 2. Hindi manufacturer / packer
  /(?:निर्माता|द्वारा\s*निर्मित|द्वारा\s*पैक|पैकर|आयातकर्ता|विपणक)\s*[:.-]?\s*([^\n\r]+)/i,
];

export const CONSUMER_CARE_PATTERNS: RegExp[] = [
  // 1. English consumer care
  /(?:CONSUMER\s*CARE|CUSTOMER\s*CARE|HELPLINE|FEEDBACK|QUERIES|CONTACT|COMPLAINTS)\s*[:.-]?\s*([^\n\r]+)/i,
  /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
  /(?:TOLL\s*FREE|TEL|PHONE|NO\.?)\s*[:.-]?\s*(1800[- ]?[0-9]{3}[- ]?[0-9]{3,4}|[0-9]{10,11}|\+[0-9]{2}[- ]?[0-9]{10})/i,
  // 2. Hindi consumer care
  /(?:उपभोक्ता\s*सेवा|ग्राहक\s*सेवा|हेल्पलाइन|संपर्क)\s*[:.-]?\s*([^\n\r]+)/i,
];

export const ORIGIN_PATTERNS: RegExp[] = [
  /(?:COUNTRY\s*OF\s*ORIGIN|MADE\s*IN|PRODUCT\s*OF|मूल\s*देश)\s*[:.-]?\s*([A-Za-z\u0900-\u097F\s]+)/i,
];

/**
 * Helper to detect language from text
 */
function detectLanguage(text: string): string {
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);
  if (hasDevanagari && hasLatin) return 'hi+en';
  if (hasDevanagari) return 'hi';
  return 'en';
}

/**
 * Direct standalone MRP extractor for text
 */
export function extractMRP(text: string): { value: number; rawText: string; unit: 'INR'; isInclusive: boolean } | null {
  for (const pattern of MRP_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return {
        value: parseFloat(match[1]),
        rawText: text.trim(),
        unit: 'INR',
        isInclusive: /INCL|कर\s*सहित/i.test(text),
      };
    }
  }
  return null;
}

/**
 * Direct standalone Net Quantity extractor for text
 */
export function extractNetQuantity(text: string): { value: number; unit: string; rawText: string } | null {
  for (const pattern of NET_QTY_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1] && match[2]) {
      return {
        value: parseFloat(match[1]),
        unit: match[2].trim().toLowerCase(),
        rawText: text.trim(),
      };
    }
  }
  return null;
}

/**
 * Direct standalone Date extractor for text
 */
export function extractPackagingDate(text: string): { dateStr: string; isExpiry: boolean; rawText: string } | null {
  const isExpiry = /(?:BEST\s*BEFORE|EXPIRY|EXP\.?|सर्वोत्तम\s*उपयोग|उपयोग\s*की\s*अंतिम\s*तिथि|समाप्ति\s*तिथि)/i.test(text);
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const fullDate = match[2] ? `${match[1]} ${match[2]}` : match[1];
      return {
        dateStr: fullDate.trim(),
        isExpiry,
        rawText: text.trim(),
      };
    }
  }
  return null;
}

/**
 * Direct standalone Manufacturer extractor for text
 */
export function extractManufacturer(text: string): { nameAddress: string; rawText: string } | null {
  for (const pattern of MFR_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return {
        nameAddress: match[1].trim(),
        rawText: text.trim(),
      };
    }
  }
  return null;
}

/**
 * Direct standalone Consumer Care extractor for text
 */
export function extractConsumerCare(text: string): { contact: string; rawText: string } | null {
  for (const pattern of CONSUMER_CARE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return {
        contact: match[1].trim(),
        rawText: text.trim(),
      };
    }
  }
  return null;
}

/**
 * Direct standalone Country of Origin extractor for text
 */
export function extractCountryOfOrigin(text: string): { country: string; rawText: string } | null {
  for (const pattern of ORIGIN_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return {
        country: match[1].trim(),
        rawText: text.trim(),
      };
    }
  }
  return null;
}

/**
 * Extracts candidate declarations from a set of OCR text regions
 */
export function extractDeclarationCandidates(regions: TextRegion[]): Declaration[] {
  const declarations: Declaration[] = [];
  const matchedTypes = new Set<DeclarationType>();

  // Process regions in order (prioritizing high-confidence regions)
  for (const region of regions) {
    const text = region.text.trim();
    if (!text) continue;

    const lang = detectLanguage(text);

    // 1. MRP Extraction
    if (!matchedTypes.has('MRP')) {
      for (const pattern of MRP_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1]) {
          declarations.push({
            type: 'MRP',
            rawText: text,
            normalizedValue: parseFloat(match[1]),
            unit: 'INR',
            confidence: region.confidence ?? 0.85,
            region,
            isFormatStandard: /INCL|कर\s*सहित/i.test(text),
            detectedLanguage: lang,
          });
          matchedTypes.add('MRP');
          break;
        }
      }
    }

    // 2. Net Quantity Extraction
    if (!matchedTypes.has('NET_QUANTITY')) {
      for (const pattern of NET_QTY_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1] && match[2]) {
          declarations.push({
            type: 'NET_QUANTITY',
            rawText: text,
            normalizedValue: parseFloat(match[1]),
            unit: match[2].trim().toLowerCase(),
            confidence: region.confidence ?? 0.85,
            region,
            isFormatStandard: true,
            detectedLanguage: lang,
          });
          matchedTypes.add('NET_QUANTITY');
          break;
        }
      }
    }

    // 3. Date of Manufacture / Packaging
    if (!matchedTypes.has('DATE_OF_PACKAGING')) {
      for (const pattern of DATE_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const rawMatch = match[2] ? `${match[1]} ${match[2]}` : match[1];
          declarations.push({
            type: 'DATE_OF_PACKAGING',
            rawText: text,
            normalizedValue: rawMatch,
            unit: null,
            confidence: region.confidence ?? 0.85,
            region,
            isFormatStandard: true,
            detectedLanguage: lang,
          });
          matchedTypes.add('DATE_OF_PACKAGING');
          break;
        }
      }
    }

    // 4. Manufacturer Name & Address
    if (!matchedTypes.has('MANUFACTURER_NAME_ADDRESS')) {
      for (const pattern of MFR_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1]) {
          declarations.push({
            type: 'MANUFACTURER_NAME_ADDRESS',
            rawText: text,
            normalizedValue: match[1].trim(),
            unit: null,
            confidence: region.confidence ?? 0.85,
            region,
            isFormatStandard: true,
            detectedLanguage: lang,
          });
          matchedTypes.add('MANUFACTURER_NAME_ADDRESS');
          break;
        }
      }
    }

    // 5. Consumer Care Details
    if (!matchedTypes.has('CONSUMER_CARE_DETAILS')) {
      for (const pattern of CONSUMER_CARE_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1]) {
          declarations.push({
            type: 'CONSUMER_CARE_DETAILS',
            rawText: text,
            normalizedValue: match[1].trim(),
            unit: null,
            confidence: region.confidence ?? 0.85,
            region,
            isFormatStandard: true,
            detectedLanguage: lang,
          });
          matchedTypes.add('CONSUMER_CARE_DETAILS');
          break;
        }
      }
    }

    // 6. Country of Origin
    if (!matchedTypes.has('COUNTRY_OF_ORIGIN')) {
      for (const pattern of ORIGIN_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1]) {
          declarations.push({
            type: 'COUNTRY_OF_ORIGIN',
            rawText: text,
            normalizedValue: match[1].trim(),
            unit: null,
            confidence: region.confidence ?? 0.85,
            region,
            isFormatStandard: true,
            detectedLanguage: lang,
          });
          matchedTypes.add('COUNTRY_OF_ORIGIN');
          break;
        }
      }
    }
  }

  // 7. Generic / Common Name (Look for front surface title, or prominent header region)
  if (!matchedTypes.has('GENERIC_NAME')) {
    const titleRegion =
      regions.find(
        r =>
          r.surface === 'FRONT' &&
          !declarations.some(d => d.region?.id === r.id) &&
          r.text.length > 3 &&
          !/MRP|PKD|MFG|NET\s*(?:QTY|VOL|WT)|RS\.?|₹|1800-|CARE|एमआरपी|वजन|मात्रा/i.test(r.text)
      ) ||
      regions.find(
        r =>
          !declarations.some(d => d.region?.id === r.id) &&
          r.text.length > 3 &&
          !/MRP|PKD|MFG|NET\s*(?:QTY|VOL|WT)|RS\.?|₹|1800-|CARE|एमआरपी|वजन|मात्रा/i.test(r.text)
      );

    if (titleRegion) {
      declarations.push({
        type: 'GENERIC_NAME',
        rawText: titleRegion.text,
        normalizedValue: titleRegion.text.trim(),
        unit: null,
        confidence: titleRegion.confidence ?? 0.85,
        region: titleRegion,
        isFormatStandard: true,
        detectedLanguage: detectLanguage(titleRegion.text),
      });
    }
  }

  return declarations;
}
