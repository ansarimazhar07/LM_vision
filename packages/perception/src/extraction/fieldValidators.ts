/**
 * Field-Specific Semantic & Syntactic Validators
 *
 * Provides dedicated validation functions for each of the 10 target Legal Metrology fields.
 * Rejects obvious false positives, prevents cross-field contamination, and checks contextual requirements.
 */

export interface ValidationOutcome {
  isValid: boolean;
  isAmbiguous: boolean;
  reasons: string[];
  normalizedValue?: string | number | null;
}

// ============================================================================
// 1. PRODUCT_NAME (GENERIC_NAME) Validator
// ============================================================================

const GENERIC_SLOGAN_PATTERNS = [
  /^(?:100%\s*(?:pure|natural|organic|genuine|fresh))$/i,
  /^(?:new\s*(?:&|and)?\s*improved)$/i,
  /^(?:best\s*(?:ever|quality|choice))$/i,
  /^(?:rich\s*taste|great\s*aroma|super\s*saver|special\s*offer)$/i,
  /^(?:extra\s*(?:power|shine|clean|strong))$/i,
];

export function validateProductNameCandidate(text: string): ValidationOutcome {
  const clean = text.trim();
  const reasons: string[] = [];

  if (clean.length < 3) {
    reasons.push('Product name candidate is too short (< 3 chars).');
    return { isValid: false, isAmbiguous: false, reasons };
  }

  // Reject purely numeric or barcode-like strings
  if (/^[0-9\s.,\-_/:#]+$/.test(clean)) {
    reasons.push('Candidate is purely numeric or punctuation.');
    return { isValid: false, isAmbiguous: false, reasons };
  }

  // Reject generic slogans
  for (const slogan of GENERIC_SLOGAN_PATTERNS) {
    if (slogan.test(clean)) {
      reasons.push(`Candidate matches marketing slogan pattern: "${clean}".`);
      return { isValid: false, isAmbiguous: false, reasons };
    }
  }

  // Reject declaration headers
  if (/^(?:M\.?R\.?P\.?|NET\s*QTY|MFD|PKD|EXP|BEST\s*BEFORE|BATCH|FSSAI|LIC)\b/i.test(clean)) {
    reasons.push('Candidate is a statutory declaration header.');
    return { isValid: false, isAmbiguous: false, reasons };
  }

  return {
    isValid: true,
    isAmbiguous: false,
    reasons: [],
    normalizedValue: clean,
  };
}

// ============================================================================
// 2, 3, 4. MANUFACTURER, PACKER, IMPORTER Address Validators
// ============================================================================

export const INDIAN_PIN_REGEX = /\b([1-9][0-9]{5})\b/;

const PREMISES_KEYWORDS =
  /(?:Plot|Sector|Area|Road|Street|Phase|Zone|Estate|Nagar|Dist|District|Faridabad|Bengaluru|Bangalore|Mumbai|Delhi|Gujarat|Haryana|Karnataka|Maharashtra|Mehsana|Vapi|Survey|Bhiwadi|Gurugram|Noida|Kolkata|Pune|Chennai|Hyderabad|Village|Taluk|Post|P\.O\.|MIDC|GIDC|RIICO|Pvt\.?\s*Ltd\.?|Limited|Corporation|Industries|Works|Foods|Cosmetics|Products)\b/i;

export function validateEntityAddress(
  text: string,
  expectedType: 'MANUFACTURER' | 'PACKER' | 'IMPORTER'
): ValidationOutcome {
  const clean = text.trim();
  const reasons: string[] = [];

  if (clean.length < 5) {
    reasons.push(`${expectedType} declaration text is too short to constitute an address.`);
    return { isValid: false, isAmbiguous: false, reasons };
  }

  const hasPin = INDIAN_PIN_REGEX.test(clean);
  const hasKeywords = PREMISES_KEYWORDS.test(clean);

  // Address grouping must work even without a recognized PIN if premises/address keywords exist
  if (!hasPin && !hasKeywords) {
    reasons.push(`${expectedType} text lacks both a 6-digit PIN and identifiable address tokens.`);
    return {
      isValid: false,
      isAmbiguous: true,
      reasons,
    };
  }

  return {
    isValid: true,
    isAmbiguous: !hasPin, // Mark as requiring verification if no PIN is present
    reasons: [],
    normalizedValue: clean,
  };
}

// ============================================================================
// 5. NET_QUANTITY Validator
// ============================================================================

export const LINEAR_DIMENSION_UNITS = new Set(['m', 'cm', 'mm', 'meter', 'meters', 'मीटर']);

export function validateNetQuantity(
  numericValue: number | null,
  unit: string | null,
  fullText: string
): ValidationOutcome {
  const reasons: string[] = [];

  if (numericValue === null || isNaN(numericValue) || numericValue <= 0) {
    reasons.push('Net quantity must be a positive number.');
    return { isValid: false, isAmbiguous: false, reasons };
  }

  // Missing unit must remain unresolved
  if (!unit || unit.trim().length === 0) {
    reasons.push('Net quantity unit is missing.');
    return {
      isValid: false,
      isAmbiguous: true,
      reasons,
      normalizedValue: numericValue,
    };
  }

  const cleanUnit = unit.trim().toLowerCase();

  // Linear units (m, cm, mm) require explicit quantity/length context to avoid false associations
  if (LINEAR_DIMENSION_UNITS.has(cleanUnit)) {
    const hasLinearContext =
      /(?:NET\s*(?:QTY|QUANTITY|LENGTH|WT|WEIGHT)|LENGTH|WIDTH|HEIGHT|BREADTH|SIZE|DIMENSION|चौड़ाई|लम्बाई|ऊंचाई|मात्रा)/i.test(fullText);
    if (!hasLinearContext) {
      reasons.push(
        `Generic linear unit "${cleanUnit}" rejected without explicit length/quantity context.`
      );
      return { isValid: false, isAmbiguous: true, reasons };
    }
  }

  return {
    isValid: true,
    isAmbiguous: false,
    reasons: [],
    normalizedValue: `${numericValue} ${cleanUnit}`,
  };
}

// ============================================================================
// 6. MRP Validator
// ============================================================================

export function validateMRP(
  numericValue: number | null,
  fullText: string,
  hasExplicitMrpLabel: boolean
): ValidationOutcome {
  const reasons: string[] = [];

  if (numericValue === null || isNaN(numericValue) || numericValue <= 0) {
    reasons.push('MRP must be a positive numeric amount.');
    return { isValid: false, isAmbiguous: false, reasons };
  }

  // Reject offer / discount / external prices if labeled as such without MRP
  const isOfferPrice = /\b(?:OFFER|DISCOUNT|SPECIAL|DEAL|SELLING|ONLINE)\s*PRICE\b/i.test(fullText);
  if (isOfferPrice && !hasExplicitMrpLabel) {
    reasons.push('Price is explicitly qualified as an offer/discount price, not statutory MRP.');
    return { isValid: false, isAmbiguous: false, reasons };
  }

  // Standalone ₹ without explicit MRP label is an unconfirmed candidate
  const isAmbiguous = !hasExplicitMrpLabel;

  return {
    isValid: true,
    isAmbiguous,
    reasons: isAmbiguous ? ['Price is a standalone currency amount without explicit statutory MRP header.'] : [],
    normalizedValue: numericValue,
  };
}

// ============================================================================
// 7, 8, 9. DATE Validators (Manufacture, Packing, Import)
// ============================================================================

export function validateDateCandidate(
  dateStr: string,
  targetField: 'DATE_OF_MANUFACTURE' | 'DATE_OF_PACKAGING' | 'DATE_OF_IMPORT',
  hasContextualLabel: boolean
): ValidationOutcome {
  const clean = dateStr.trim();

  if (!clean) {
    return { isValid: false, isAmbiguous: false, reasons: ['Date string is empty.'] };
  }

  // Check valid month/year syntax: MM/YYYY or Mon YYYY
  const monthYearMatch = clean.match(/^([0-9]{1,2})[\/\.-]([0-9]{4})$/);
  if (monthYearMatch && monthYearMatch[1] && monthYearMatch[2]) {
    const month = parseInt(monthYearMatch[1], 10);
    const year = parseInt(monthYearMatch[2], 10);
    if (month < 1 || month > 12) {
      return { isValid: false, isAmbiguous: false, reasons: [`Invalid month: ${month}`] };
    }
    if (year < 1900 || year > 2100) {
      return { isValid: false, isAmbiguous: false, reasons: [`Invalid year: ${year}`] };
    }
  }

  // Never infer a date field from a bare month/year without contextual evidence
  if (!hasContextualLabel) {
    return {
      isValid: false,
      isAmbiguous: true,
      reasons: [`Bare date "${clean}" cannot be assigned to ${targetField} without contextual label.`],
    };
  }

  return {
    isValid: true,
    isAmbiguous: false,
    reasons: [],
    normalizedValue: clean,
  };
}

// ============================================================================
// 10. CONSUMER_CARE Validator
// ============================================================================

export const TOLL_FREE_REGEX = /\b1800[- ]?[0-9]{3}[- ]?[0-9]{3,4}\b/;
export const PHONE_REGEX = /\b(?:\+91[- ]?)?[6-9][0-9]{9}\b/;
export const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

export function validateConsumerCare(
  text: string,
  hasConsumerCareContext: boolean
): ValidationOutcome {
  const clean = text.trim();
  const reasons: string[] = [];

  const hasTollFree = TOLL_FREE_REGEX.test(clean);
  const hasPhone = PHONE_REGEX.test(clean);
  const hasEmail = EMAIL_REGEX.test(clean);

  if (!hasTollFree && !hasPhone && !hasEmail && clean.length < 5) {
    reasons.push('Consumer care text does not contain a recognizable contact method.');
    return { isValid: false, isAmbiguous: false, reasons };
  }

  // Phone numbers in manufacturer/packer addresses must remain separate unless supported by consumer care context
  if (!hasConsumerCareContext && !hasTollFree && !hasEmail) {
    return {
      isValid: false,
      isAmbiguous: true,
      reasons: ['Phone number lacks consumer care context and may belong to manufacturer address.'],
    };
  }

  return {
    isValid: true,
    isAmbiguous: false,
    reasons: [],
    normalizedValue: clean,
  };
}
