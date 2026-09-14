/**
 * Phase F1: Authoritative Legal Metrology Rule Evidence Contracts & Versioned Registry
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Mappings are directly cited from official GSR 202(E) PDF & authoritative rules in @lm-vision/rules.
 * 2. Versioned contract registry — does NOT hardcode "only 8 rules". Dynamically discovers and registers
 *    contracts from the loaded Rule Bundle Manifest, supporting amendment-aware expansions.
 * 3. Dynamic fallback contract inference for unmapped or custom statutory rules via rule.conditions.
 */

import type { Rule } from '@lm-vision/shared-types';
import {
  loadAuthoritativeRuleBundle,
} from '@lm-vision/rules';
import type { RuleEvidenceContract } from './ruleMappingSchema.js';

/**
 * Built-in canonical statutory contracts verified against GSR 202(E) 2011 PDF citations:
 */
const CANONICAL_GSR202E_CONTRACTS: readonly RuleEvidenceContract[] = [
  // 1. Rule 6(1)(a) read with Rule 10(1) (PDF Page 5 & 11)
  {
    ruleId: 'GSR-202E-RULE-06-01-A',
    ruleNumber: '6(1)(a)',
    subRule: '1(a)',
    title: 'Declaration of Name and Complete Address of Manufacturer, Packer, or Importer',
    requirement:
      'Every package shall bear a definite, plain and conspicuous declaration of the name and complete address of the manufacturer, or where the manufacturer is not the packer, the name and address of the manufacturer and packer, and for any imported package the name and address of the importer.',
    statutoryCitation: 'Rule 6(1)(a) & Rule 10(1) (GSR 202(E) p. 5, 11)',
    requiredFields: ['MANUFACTURER_NAME_ADDRESS', 'PACKER_NAME_ADDRESS', 'IMPORTER_NAME_ADDRESS'],
    optionalFields: ['COUNTRY_OF_ORIGIN'],
    supportingSignals: ['pinCode', 'street', 'city', 'state', 'postalDetails'],
    insufficientConditions: [
      'SEARCH_INCOMPLETE',
      'CONFLICT',
      'LOW_CONFIDENCE',
      'IMAGE_UNACCEPTABLE',
      'ADDRESS_MISSING_POSTAL_DETAILS',
    ],
  },

  // 2. Rule 6(1)(b) (PDF Page 5)
  {
    ruleId: 'GSR-202E-RULE-06-01-B',
    ruleNumber: '6(1)(b)',
    subRule: '1(b)',
    title: 'Declaration of Generic or Common Name of the Commodity',
    requirement:
      'Every package shall bear a definite, plain and conspicuous declaration of the common or generic names of the commodity contained in the package.',
    statutoryCitation: 'Rule 6(1)(b) (GSR 202(E) p. 5)',
    requiredFields: ['GENERIC_NAME'],
    optionalFields: ['PRODUCT_NAME'],
    supportingSignals: ['categoryKeyword', 'commodityDescription'],
    insufficientConditions: [
      'SEARCH_INCOMPLETE',
      'CONFLICT',
      'LOW_CONFIDENCE',
      'IMAGE_UNACCEPTABLE',
    ],
  },

  // 3. Rule 6(1)(c) read with Rule 11, 12, 13 (PDF Page 5, 11-13)
  {
    ruleId: 'GSR-202E-RULE-06-01-C',
    ruleNumber: '6(1)(c)',
    subRule: '1(c)',
    title: 'Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number',
    requirement:
      'Every package shall bear the net quantity, in terms of standard unit of weight or measure, of the commodity contained in the package conforming strictly to Rule 13 SI units (g, kg, ml, l, cm, m, sq m, n, u). Non-metric units are prohibited.',
    statutoryCitation: 'Rule 6(1)(c) read with Rule 11, 12, 13 (GSR 202(E) p. 5, 11-13)',
    requiredFields: ['NET_QUANTITY'],
    optionalFields: ['UNIT_SALE_PRICE'],
    supportingSignals: ['numericQuantity', 'metricUnitSymbol', 'surfacePDP'],
    insufficientConditions: [
      'SEARCH_INCOMPLETE',
      'CONFLICT',
      'LOW_CONFIDENCE',
      'MISSING_UNIT',
      'UNRESOLVED_NUMERIC_VALUE',
      'IMAGE_UNACCEPTABLE',
    ],
  },

  // 4. Rule 6(1)(d) read with Rule 6(1)(g) Proviso A (PDF Page 5-6)
  {
    ruleId: 'GSR-202E-RULE-06-01-D',
    ruleNumber: '6(1)(d)',
    subRule: '1(d)',
    title: 'Declaration of Month and Year of Manufacture, Pre-Packing or Import',
    requirement:
      'Every package shall bear the month and year in which the commodity is manufactured or pre-packed or imported. Expressed either in words or numerals indicating month and year.',
    statutoryCitation: 'Rule 6(1)(d) read with Rule 6(1)(g) Proviso A (GSR 202(E) p. 5-6)',
    requiredFields: ['DATE_OF_MANUFACTURE', 'DATE_OF_PACKAGING', 'DATE_OF_IMPORT'],
    optionalFields: ['BATCH_NUMBER'],
    supportingSignals: ['monthNumeralOrWord', 'fourDigitYear'],
    insufficientConditions: [
      'SEARCH_INCOMPLETE',
      'CONFLICT',
      'LOW_CONFIDENCE',
      'IMAGE_UNACCEPTABLE',
      'EXPIRY_ONLY_NO_MFD',
      'AMBIGUOUS_DATE_FORMAT',
    ],
  },

  // 5. Rule 6(1)(e) read with Rule 2(m) & Rule 6(3) (PDF Page 3, 6)
  {
    ruleId: 'GSR-202E-RULE-06-01-E',
    ruleNumber: '6(1)(e)',
    subRule: '1(e)',
    title: 'Declaration of Retail Sale Price (MRP) Inclusive of All Taxes',
    requirement:
      'Every package shall declare the retail sale price in statutory format: "Maximum or Max. retail price Rs/₹ ... inclusive of all taxes" or "MRP Rs/₹ ... incl., of all taxes". Individual alteration stickers are strictly prohibited.',
    statutoryCitation: 'Rule 2(m) read with Rule 6(1)(e) & Rule 6(3) (GSR 202(E) p. 3, 6)',
    requiredFields: ['MRP'],
    optionalFields: ['UNIT_SALE_PRICE'],
    supportingSignals: ['inclusiveOfAllTaxesPhrase', 'currencySymbol', 'numericPrice'],
    insufficientConditions: [
      'SEARCH_INCOMPLETE',
      'CONFLICT',
      'LOW_CONFIDENCE',
      'OFFER_PRICE_ONLY',
      'MISSING_TAX_INCLUSION',
      'IMAGE_UNACCEPTABLE',
    ],
  },

  // 6. Rule 6(2) (PDF Page 7)
  {
    ruleId: 'GSR-202E-RULE-06-02',
    ruleNumber: '6(2)',
    subRule: '2',
    title: 'Declaration of Consumer Care Contact Details for Complaints',
    requirement:
      'Every package shall bear the name, address, telephone number, and e-mail address, if available, of the person who or office which can be contacted in case of consumer complaints.',
    statutoryCitation: 'Rule 6(2) (GSR 202(E) p. 7)',
    requiredFields: ['CONSUMER_CARE_DETAILS'],
    optionalFields: [],
    supportingSignals: ['helplineTelephone', 'emailAddress', 'complaintsAddress'],
    insufficientConditions: [
      'SEARCH_INCOMPLETE',
      'CONFLICT',
      'LOW_CONFIDENCE',
      'NO_COMMUNICATION_CHANNEL',
      'IMAGE_UNACCEPTABLE',
    ],
  },

  // 7. Rule 7(2) read with Table I (PDF Page 8-9)
  {
    ruleId: 'GSR-202E-RULE-07-02-T1',
    ruleNumber: '7(2)',
    subRule: '2 (Table I)',
    title: 'Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel',
    requirement:
      'The height of any numeral in the declaration required under these rules on the principal display panel shall not be less than the minimum statutory heights specified in Table I according to package weight/volume.',
    statutoryCitation: 'Rule 7(2) & Rule 7(3) Table I (GSR 202(E) p. 8-9)',
    requiredFields: ['NUMERAL_HEIGHT'],
    optionalFields: ['FONT_HEIGHT', 'PDP_AREA', 'LETTER_HEIGHT', 'NET_QUANTITY'],
    supportingSignals: ['calibratedScaleMm', 'physicalGaugeMeasurement', 'aspectRatio'],
    insufficientConditions: [
      'MEASUREMENT_UNAVAILABLE',
      'UNCALIBRATED_PIXEL_DATA',
      'LOW_CONFIDENCE',
    ],
  },

  // 8. Rule 18(2) (PDF Page 16)
  {
    ruleId: 'GSR-202E-RULE-18-02',
    ruleNumber: '18(2)',
    subRule: '2',
    title: 'Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP',
    requirement:
      'No retail dealer or other person shall make any sale of any commodity in packed form at a price exceeding the retail sale price thereof.',
    statutoryCitation: 'Rule 18(2) (GSR 202(E) p. 16)',
    requiredFields: ['MRP', 'ACTUAL_SALE_PRICE'],
    optionalFields: ['ECOMMERCE_LISTED_PRICE'],
    supportingSignals: ['receiptPrice', 'cashRegisterEntry', 'ecommercePlatformPrice'],
    insufficientConditions: [
      'SALE_PRICE_UNAVAILABLE',
      'PRINTED_MRP_UNRESOLVED',
      'INSPECTOR_VERIFICATION_REQUIRED',
    ],
  },
];

/**
 * Versioned Rule Evidence Contract Registry
 *
 * Allows dynamic registration and discovery of rule evidence contracts.
 * Not hardcoded to a static count — discovers contracts for whatever rules
 * are loaded in the authoritative bundle.
 */
export class RuleEvidenceContractRegistry {
  private readonly contractsById = new Map<string, RuleEvidenceContract>();
  private readonly contractsByNumber = new Map<string, RuleEvidenceContract>();
  private bundleVersion: string = '2026.09';

  constructor() {
    this.initializeFromAuthoritativeBundle();
  }

  /**
   * Initializes contracts from the authoritative rule bundle.
   */
  private initializeFromAuthoritativeBundle(): void {
    const loadedBundle = loadAuthoritativeRuleBundle();
    this.bundleVersion = loadedBundle.manifest.bundleVersion;

    // 1. Register canonical GSR 202(E) contracts
    for (const contract of CANONICAL_GSR202E_CONTRACTS) {
      this.registerContract(contract);
    }

    // 2. Discover any additional rules in the bundle that lack explicit contracts
    for (const rule of loadedBundle.rules) {
      if (!this.contractsById.has(rule.ruleId)) {
        const inferred = this.inferContractFromRule(rule);
        this.registerContract(inferred);
      }
    }
  }

  /**
   * Registers or overrides a rule evidence contract.
   */
  public registerContract(contract: RuleEvidenceContract): void {
    this.contractsById.set(contract.ruleId, contract);
    this.contractsByNumber.set(contract.ruleNumber, contract);
  }

  /**
   * Retrieves a contract by Rule ID (e.g. 'GSR-202E-RULE-06-01-E').
   */
  public getContract(ruleId: string): RuleEvidenceContract | undefined {
    return this.contractsById.get(ruleId);
  }

  /**
   * Retrieves a contract by Rule Number (e.g. '6(1)(e)' or '18(2)').
   */
  public getContractByRuleNumber(ruleNumber: string): RuleEvidenceContract | undefined {
    return this.contractsByNumber.get(ruleNumber);
  }

  /**
   * Returns all registered contracts.
   */
  public getAllContracts(): readonly RuleEvidenceContract[] {
    return Array.from(this.contractsById.values());
  }

  /**
   * Returns the underlying rule bundle version.
   */
  public getBundleVersion(): string {
    return this.bundleVersion;
  }

  /**
   * Dynamically infers a rule evidence contract from a Rule entity definition.
   */
  public inferContractFromRule(rule: Rule): RuleEvidenceContract {
    const requiredFields: string[] = [];

    if (rule.conditions && Array.isArray(rule.conditions)) {
      for (const cond of rule.conditions) {
        if (cond.field && typeof cond.field === 'string') {
          const cleanedField = cond.field.replace(/^declarations\./, '').split('.')[0] || cond.field;
          if (!requiredFields.includes(cleanedField)) {
            requiredFields.push(cleanedField);
          }
        }
      }
    }

    if (requiredFields.length === 0) {
      requiredFields.push('DECLARATION');
    }

    return {
      ruleId: rule.ruleId,
      ruleNumber: rule.ruleNumber,
      subRule: rule.subRule,
      title: rule.title,
      requirement: rule.requirement || rule.description,
      statutoryCitation: rule.sourceMetadata?.clauseReference || `Rule ${rule.ruleNumber}`,
      requiredFields,
      optionalFields: [],
      supportingSignals: ['surfaceProvenance'],
      insufficientConditions: ['SEARCH_INCOMPLETE', 'CONFLICT', 'LOW_CONFIDENCE', 'IMAGE_UNACCEPTABLE'],
    };
  }
}

// Global singleton instance
let defaultRegistry: RuleEvidenceContractRegistry | null = null;

export function getRuleEvidenceContractRegistry(): RuleEvidenceContractRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new RuleEvidenceContractRegistry();
  }
  return defaultRegistry;
}
