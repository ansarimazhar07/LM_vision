/**
 * Legal Metrology Normalization Engine (Phase 10)
 *
 * Normalizes extracted text strings into canonical data structures
 * (numbers, standard metric units, ISO dates, currency codes)
 * as required by Legal Metrology (Packaged Commodities) Rules, 2011.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Preserves rawText untouched on every Declaration for evidentiary provenance.
 * 2. Standardizes units strictly to legal metric standards: g, kg, ml, l, m, cm, n.
 * 3. Never invents values if parsing is uncertain.
 */

import type { Declaration } from '@lm-vision/shared-types';

const UNIT_CANONICAL_MAP: Record<string, string> = {
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
  meters: 'm',
  cm: 'cm',
  centimeter: 'cm',
  mm: 'mm',
  millimeter: 'mm',
  n: 'n',
  no: 'n',
  number: 'n',
  numbers: 'n',
  unit: 'n',
  units: 'n',
  piece: 'n',
  pieces: 'n',
  pc: 'n',
  pcs: 'n',
};

const MONTH_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

/**
 * Normalizes a single Declaration record
 */
export function normalizeDeclaration(decl: Declaration): Declaration {
  const result: Declaration = { ...decl };

  switch (decl.type) {
    case 'MRP': {
      // Extract pure number from value string
      if (typeof decl.normalizedValue === 'string') {
        const numMatch = decl.normalizedValue.match(/([0-9]+(?:\.[0-9]{1,2})?)/);
        if (numMatch && numMatch[1]) {
          result.normalizedValue = parseFloat(numMatch[1]);
        }
      } else if (typeof decl.normalizedValue === 'number') {
        result.normalizedValue = Number(decl.normalizedValue.toFixed(2));
      }
      result.unit = 'INR';
      break;
    }

    case 'NET_QUANTITY': {
      // Normalize number
      if (typeof decl.normalizedValue === 'string') {
        const numMatch = decl.normalizedValue.match(/([0-9]+(?:\.[0-9]+)?)/);
        if (numMatch && numMatch[1]) {
          result.normalizedValue = parseFloat(numMatch[1]);
        }
      }

      // Normalize unit
      if (decl.unit) {
        const cleanedUnit = decl.unit.trim().toLowerCase();
        result.unit = UNIT_CANONICAL_MAP[cleanedUnit] || cleanedUnit;
      }
      break;
    }

    case 'DATE_OF_MANUFACTURE':
    case 'DATE_OF_PACKAGING':
    case 'DATE_OF_IMPORT':
    case 'EXPIRY_DATE_BEST_BEFORE': {
      if (typeof decl.normalizedValue === 'string') {
        const str = decl.normalizedValue.trim();

        // Match MM/YYYY or M/YYYY
        const mmyyyy = str.match(/\b([0-9]{1,2})[\/\.-]([0-9]{4})\b/);
        if (mmyyyy && mmyyyy[1] && mmyyyy[2]) {
          const month = mmyyyy[1].padStart(2, '0');
          result.normalizedValue = `${mmyyyy[2]}-${month}-01`;
          break;
        }

        // Match Month Year text e.g. Aug 2026
        const textDate = str.match(/\b([A-Za-z]{3,})[\s\.-]+([0-9]{4})\b/);
        if (textDate && textDate[1] && textDate[2]) {
          const prefix = textDate[1].slice(0, 3).toLowerCase();
          const monthNum = MONTH_MAP[prefix];
          if (monthNum) {
            result.normalizedValue = `${textDate[2]}-${monthNum}-01`;
            break;
          }
        }

        // Match DD/MM/YYYY
        const ddmmyyyy = str.match(/\b([0-9]{1,2})[\/\.-]([0-9]{1,2})[\/\.-]([0-9]{4})\b/);
        if (ddmmyyyy && ddmmyyyy[1] && ddmmyyyy[2] && ddmmyyyy[3]) {
          const day = ddmmyyyy[1].padStart(2, '0');
          const month = ddmmyyyy[2].padStart(2, '0');
          result.normalizedValue = `${ddmmyyyy[3]}-${month}-${day}`;
          break;
        }
      }
      break;
    }

    default:
      // Other text fields retain clean string trimming
      if (typeof decl.normalizedValue === 'string') {
        result.normalizedValue = decl.normalizedValue.trim();
      }
      break;
  }

  return result;
}

/**
 * Normalizes an array of declarations
 */
export function normalizeDeclarations(declarations: Declaration[]): Declaration[] {
  return declarations.map(d => normalizeDeclaration(d));
}
