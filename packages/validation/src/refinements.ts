import { z } from 'zod';

/**
 * Standard Legal Metrology approved unit symbols
 * Note: Under Legal Metrology rules, non-standard unit symbols like 'gms', 'kilo', 'ltrs', etc.
 * are explicitly non-compliant. Standard symbols are 'g', 'kg', 'ml', 'l', 'cm', 'm', 'mm', 'N', 'u'.
 */
export const APPROVED_METROLOGY_UNITS = [
  'g',
  'kg',
  'mg',
  'ml',
  'l',
  'cm',
  'm',
  'mm',
  'N',
  'u',
  'pcs',
] as const;

export const LegalMetrologyUnitSchema = z.enum(APPROVED_METROLOGY_UNITS, {
  errorMap: () => ({
    message: `Unit must be one of approved Legal Metrology symbols: ${APPROVED_METROLOGY_UNITS.join(', ')}`,
  }),
});

/**
 * Validates EAN-13 / UPC-A / GTIN check digit
 */
export function isValidBarcodeChecksum(barcode: string): boolean {
  const clean = barcode.trim();
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(clean)) {
    return false;
  }

  const digits = clean.split('').map(Number);
  const checkDigit = digits[digits.length - 1];
  const payload = digits.slice(0, digits.length - 1);

  // Modulo 10 check digit calculation
  let sum = 0;
  for (let i = payload.length - 1, weight = 3; i >= 0; i--) {
    sum += (payload[i] ?? 0) * weight;
    weight = weight === 3 ? 1 : 3;
  }

  const calculatedCheck = (10 - (sum % 10)) % 10;
  return checkDigit === calculatedCheck;
}

export const BarcodeWithChecksumSchema = z
  .string()
  .refine(isValidBarcodeChecksum, {
    message: 'Barcode check digit does not match EAN/UPC modulo-10 algorithm',
  });

/**
 * Normalizes unit string representation
 */
export function normalizeMetrologyUnit(rawUnit: string): string {
  const trimmed = rawUnit.trim().toLowerCase();
  switch (trimmed) {
    case 'gms':
    case 'gm':
    case 'gram':
    case 'grams':
      return 'g';
    case 'kgs':
    case 'kilo':
    case 'kilogram':
    case 'kilograms':
      return 'kg';
    case 'ltr':
    case 'ltrs':
    case 'litre':
    case 'litres':
    case 'liter':
      return 'l';
    case 'mls':
    case 'millilitre':
    case 'millilitres':
      return 'ml';
    case 'mtr':
    case 'meter':
    case 'meters':
      return 'm';
    default:
      return rawUnit.trim();
  }
}
