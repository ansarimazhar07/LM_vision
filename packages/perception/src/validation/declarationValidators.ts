/**
 * Declaration Syntax & Structure Validators (Phase A.1)
 *
 * Provides deterministic syntax and structural validation for extracted OCR packaging declarations.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. Validates SYNTAX and STRUCTURE only (numeric format, date layout, unit string structure).
 * 2. Does NOT introduce arbitrary price limits or commercial assumptions.
 * 3. Does NOT determine legal compliance (statutory compliance is strictly the Rule Engine's responsibility).
 * 4. Never fabricates values or PASS/FAIL legal decisions.
 */

export interface SyntaxValidationResult {
  isValidSyntax: boolean;
  errors: string[];
}

/**
 * Validates the syntax and structure of an extracted MRP declaration value.
 * Requires a positive numeric amount with standard currency decimal precision (0 to 2 decimal places).
 */
export function validateMRPSyntax(value: number | string): SyntaxValidationResult {
  const errors: string[] = [];

  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(numericValue) || numericValue <= 0) {
    errors.push('MRP value must be a positive number.');
    return { isValidSyntax: false, errors };
  }

  // Verify decimal precision does not exceed 2 decimal places
  const strVal = typeof value === 'number' ? value.toString() : value.trim();
  const decimalMatch = strVal.match(/\.([0-9]+)/);
  if (decimalMatch && decimalMatch[1] && decimalMatch[1].length > 2) {
    errors.push('MRP cannot have more than 2 decimal places.');
  }

  return {
    isValidSyntax: errors.length === 0,
    errors,
  };
}

/**
 * Standard legal metric and count units supported under Legal Metrology.
 */
export const VALID_METRIC_UNITS = new Set([
  'g',
  'kg',
  'ml',
  'l',
  'm',
  'cm',
  'mm',
  'n',
  'u',
]);

/**
 * Validates the syntax and structure of a Net Quantity declaration.
 * Requires a positive numeric quantity and an identifiable unit identifier.
 */
export function validateNetQuantitySyntax(
  value: number | string,
  unit?: string | null
): SyntaxValidationResult {
  const errors: string[] = [];

  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(numericValue) || numericValue <= 0) {
    errors.push('Net Quantity must be a positive numeric value.');
  }

  if (!unit || typeof unit !== 'string' || unit.trim().length === 0) {
    errors.push('Net Quantity must specify a measurement unit.');
  }

  return {
    isValidSyntax: errors.length === 0,
    errors,
  };
}

/**
 * Validates the syntax of a date declaration string (e.g. MM/YYYY, DD/MM/YYYY, or Month-YYYY).
 */
export function validateDateSyntax(dateStr: string): SyntaxValidationResult {
  const errors: string[] = [];

  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim().length === 0) {
    return { isValidSyntax: false, errors: ['Date string is empty.'] };
  }

  const clean = dateStr.trim();

  // Pattern A: MM/YYYY, MM-YYYY, MM.YYYY
  const mmyyyy = clean.match(/^([0-9]{1,2})[\/\.-]([0-9]{4})$/);
  if (mmyyyy && mmyyyy[1] && mmyyyy[2]) {
    const month = parseInt(mmyyyy[1], 10);
    const year = parseInt(mmyyyy[2], 10);
    if (month < 1 || month > 12) {
      errors.push(`Invalid month: ${month}. Month must be between 01 and 12.`);
    }
    if (year < 1900 || year > 2100) {
      errors.push(`Invalid year format: ${year}.`);
    }
    return { isValidSyntax: errors.length === 0, errors };
  }

  // Pattern B: DD/MM/YYYY
  const ddmmyyyy = clean.match(/^([0-9]{1,2})[\/\.-]([0-9]{1,2})[\/\.-]([0-9]{2,4})$/);
  if (ddmmyyyy && ddmmyyyy[1] && ddmmyyyy[2] && ddmmyyyy[3]) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10);
    if (day < 1 || day > 31) {
      errors.push(`Invalid day: ${day}. Day must be between 1 and 31.`);
    }
    if (month < 1 || month > 12) {
      errors.push(`Invalid month: ${month}. Month must be between 1 and 12.`);
    }
    return { isValidSyntax: errors.length === 0, errors };
  }

  // Pattern C: Mon YYYY (e.g. Jan 2026, MARCH 2026)
  const monthNames = /^(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*[\s\.-]+([0-9]{4})$/i;
  if (monthNames.test(clean)) {
    return { isValidSyntax: true, errors: [] };
  }

  // Pattern D: Duration (e.g. 12 months, 2 years)
  if (/^[0-9]{1,2}\s*(?:MONTHS|YEARS|महीने|वर्ष)/i.test(clean)) {
    return { isValidSyntax: true, errors: [] };
  }

  errors.push(`Unrecognized date syntax: "${clean}". Expected MM/YYYY, DD/MM/YYYY, or Mon YYYY.`);
  return {
    isValidSyntax: false,
    errors,
  };
}

/**
 * Validates the structure of a Manufacturer / Packer / Importer address.
 */
export function validateManufacturerAddressSyntax(addressText: string): SyntaxValidationResult {
  const errors: string[] = [];

  if (!addressText || typeof addressText !== 'string' || addressText.trim().length < 5) {
    errors.push('Manufacturer/address declaration text is too short to constitute a verifiable address.');
  }

  return {
    isValidSyntax: errors.length === 0,
    errors,
  };
}
