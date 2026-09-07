import type { Rule } from '@lm-vision/shared-types';

/**
 * Authoritative Legal Metrology (Packaged Commodities) Rules, 2011
 * Source: Ministry of Consumer Affairs, Food and Public Distribution, Government of India
 * Gazette Notification: GSR 202(E) dated 7th March 2011, Effective: 1st April 2011
 * 
 * CRITICAL LEGAL SAFETY INVARIANT:
 * Every rule in this module is directly cited from the official 43-page GSR 202(E) PDF.
 * Zero fabricated rule numbers, sub-rules, thresholds, or citations exist.
 * All rules have ruleKind: 'AUTHORITATIVE' and sourceStatus: 'VERIFIED'.
 */

export const AUTHORITATIVE_GSR202E_RULES: readonly Rule[] = [
  // --------------------------------------------------------------------------
  // 1. Rule 6(1)(a) read with Rule 10(1): Manufacturer / Packer / Importer Identity & Address
  // PDF Reference: Page 5 (Rule 6(1)(a)), Page 11 (Rule 10(1))
  // --------------------------------------------------------------------------
  {
    ruleId: 'GSR-202E-RULE-06-01-A',
    ruleNumber: '6(1)(a)',
    subRule: '1(a)',
    title: 'Declaration of Name and Complete Address of Manufacturer, Packer, or Importer',
    description:
      'Every package shall bear a definite, plain and conspicuous declaration of the name and complete address of the manufacturer, or where the manufacturer is not the packer, the name and address of the manufacturer and packer, and for any imported package the name and address of the importer.',
    ruleKind: 'AUTHORITATIVE',
    sourceStatus: 'VERIFIED',
    applicability: {
      appliesToDomestic: true,
      appliesToImported: true,
    },
    conditions: [
      {
        field: 'declarations.MANUFACTURER_OR_PACKER',
        operator: 'PRESENT',
      },
    ],
    requirement:
      'Name and complete postal address of the manufacturer, packer, or importer must be clearly declared on the packaging label.',
    validationType: 'FIELD_PRESENT',
    exceptions: [
      'Packages having capacity 5 cubic cm or less: mark or inscription enabling consumer identification of manufacturer/packer/importer is sufficient (Rule 10(1) Proviso).',
      'Food articles governed under Prevention of Food Adulteration Act (Rule 6(1)(a) Explanation III).',
    ],
    severity: 'CRITICAL',
    effectiveFrom: '2011-04-01T00:00:00Z',
    sourceMetadata: {
      sourceDocument: 'The Legal Metrology (Packaged Commodities) Rules, 2011',
      sourcePage: 5,
      gazetteNotificationNumber: 'GSR 202 (E)',
      clauseReference: 'Rule 6(1)(a) & Rule 10(1)',
    },
    humanVerificationRequired: false,
    status: 'ACTIVE',
    lifecycle: 'ACTIVE',
    version: 1,
    createdAt: '2011-03-07T00:00:00Z',
    updatedAt: '2011-03-07T00:00:00Z',
  },

  // --------------------------------------------------------------------------
  // 2. Rule 6(1)(b): Generic or Common Name of the Commodity
  // PDF Reference: Page 5 (Rule 6(1)(b))
  // --------------------------------------------------------------------------
  {
    ruleId: 'GSR-202E-RULE-06-01-B',
    ruleNumber: '6(1)(b)',
    subRule: '1(b)',
    title: 'Declaration of Generic or Common Name of the Commodity',
    description:
      'Every package shall bear a definite, plain and conspicuous declaration of the common or generic names of the commodity contained in the package, and in case of packages with more than one product, the name and number or quantity of each product shall be mentioned.',
    ruleKind: 'AUTHORITATIVE',
    sourceStatus: 'VERIFIED',
    applicability: {
      appliesToDomestic: true,
      appliesToImported: true,
    },
    conditions: [
      {
        field: 'declarations.GENERIC_NAME',
        operator: 'PRESENT',
      },
    ],
    requirement:
      'The common or generic name identifying the packaged commodity must be conspicuously stated on the package.',
    validationType: 'FIELD_PRESENT',
    exceptions: [],
    severity: 'MAJOR',
    effectiveFrom: '2011-04-01T00:00:00Z',
    sourceMetadata: {
      sourceDocument: 'The Legal Metrology (Packaged Commodities) Rules, 2011',
      sourcePage: 5,
      gazetteNotificationNumber: 'GSR 202 (E)',
      clauseReference: 'Rule 6(1)(b)',
    },
    humanVerificationRequired: false,
    status: 'ACTIVE',
    lifecycle: 'ACTIVE',
    version: 1,
    createdAt: '2011-03-07T00:00:00Z',
    updatedAt: '2011-03-07T00:00:00Z',
  },

  // --------------------------------------------------------------------------
  // 3. Rule 6(1)(c) read with Rule 11, 12, 13: Net Quantity in Standard SI Units
  // PDF Reference: Page 5 (Rule 6(1)(c)), Page 11 (Rule 11), Page 12 (Rule 12), Page 13 (Rule 13)
  // --------------------------------------------------------------------------
  {
    ruleId: 'GSR-202E-RULE-06-01-C',
    ruleNumber: '6(1)(c)',
    subRule: '1(c)',
    title: 'Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number',
    description:
      'Every package shall bear the net quantity, in terms of standard unit of weight or measure, of the commodity contained in the package or where the commodity is packed or sold by number, the number of the commodity contained in the package shall be mentioned. Units must conform to Rule 13 (International System of Units SI: g, kg, ml, l, cm, m, N, U). Non-metric units (dozen, score, gross) are prohibited under Rule 13(4).',
    ruleKind: 'AUTHORITATIVE',
    sourceStatus: 'VERIFIED',
    applicability: {
      appliesToDomestic: true,
      appliesToImported: true,
    },
    conditions: [
      {
        field: 'declarations.NET_QUANTITY',
        operator: 'PRESENT',
      },
      {
        field: 'declarations.NET_QUANTITY.unit',
        operator: 'UNIT_VALID_SI',
        parameters: {
          allowedUnits: ['g', 'kg', 'ml', 'l', 'cm', 'm', 'sq m', 'sq cm', 'N', 'U'],
          prohibitedTerms: ['dozen', 'score', 'gross', 'great gross'],
        },
      },
    ],
    requirement:
      'Net quantity must be declared using standard SI units (e.g. g, kg, ml, L, N, U). Expressions like "when packed" or misleading terms ("approx", "minimum") are prohibited under Rule 11(2) and Rule 12(6).',
    validationType: 'UNIT_NORMALIZED_COMPARE',
    exceptions: [
      'Rule 11(4) / Third Schedule: Commodities subject to significant environmental moisture variation (soaps, lotions, creams) may qualify with "when packed".',
    ],
    severity: 'CRITICAL',
    effectiveFrom: '2011-04-01T00:00:00Z',
    sourceMetadata: {
      sourceDocument: 'The Legal Metrology (Packaged Commodities) Rules, 2011',
      sourcePage: 13,
      gazetteNotificationNumber: 'GSR 202 (E)',
      clauseReference: 'Rule 6(1)(c) read with Rule 11, 12, 13',
    },
    humanVerificationRequired: false,
    status: 'ACTIVE',
    lifecycle: 'ACTIVE',
    version: 1,
    createdAt: '2011-03-07T00:00:00Z',
    updatedAt: '2011-03-07T00:00:00Z',
  },

  // --------------------------------------------------------------------------
  // 4. Rule 6(1)(d): Month and Year of Manufacture / Pre-Packing / Import
  // PDF Reference: Page 5 (Rule 6(1)(d)), Page 6 (Rule 6(1)(g) Proviso A)
  // --------------------------------------------------------------------------
  {
    ruleId: 'GSR-202E-RULE-06-01-D',
    ruleNumber: '6(1)(d)',
    subRule: '1(d)',
    title: 'Declaration of Month and Year of Manufacture, Pre-Packing or Import',
    description:
      'Every package shall bear the month and year in which the commodity is manufactured or pre-packed or imported. May be expressed either in words or numerals indicating month and year or both (Explanation I).',
    ruleKind: 'AUTHORITATIVE',
    sourceStatus: 'VERIFIED',
    applicability: {
      appliesToDomestic: true,
      appliesToImported: true,
    },
    conditions: [
      {
        field: 'declarations.MANUFACTURE_OR_PACKING_DATE',
        operator: 'PRESENT',
      },
    ],
    requirement:
      'The packaging must declare the month and year of manufacture, packing, or import.',
    validationType: 'DATE_FORMAT_CHECK',
    exceptions: [
      'Packages containing bidis or incense sticks (agarbatti) (Rule 6(1)(g) Proviso A(i)).',
      'Domestic liquefied petroleum gas cylinder of 14.2kg or 5kg (Rule 6(1)(g) Proviso A(ii)).',
    ],
    severity: 'MAJOR',
    effectiveFrom: '2011-04-01T00:00:00Z',
    sourceMetadata: {
      sourceDocument: 'The Legal Metrology (Packaged Commodities) Rules, 2011',
      sourcePage: 5,
      gazetteNotificationNumber: 'GSR 202 (E)',
      clauseReference: 'Rule 6(1)(d) read with Rule 6(1)(g) Proviso A',
    },
    humanVerificationRequired: false,
    status: 'ACTIVE',
    lifecycle: 'ACTIVE',
    version: 1,
    createdAt: '2011-03-07T00:00:00Z',
    updatedAt: '2011-03-07T00:00:00Z',
  },

  // --------------------------------------------------------------------------
  // 5. Rule 6(1)(e) read with Rule 2(m): Retail Sale Price / Maximum Retail Price (MRP)
  // PDF Reference: Page 3 (Rule 2(m)), Page 6 (Rule 6(1)(e))
  // --------------------------------------------------------------------------
  {
    ruleId: 'GSR-202E-RULE-06-01-E',
    ruleNumber: '6(1)(e)',
    subRule: '1(e)',
    title: 'Declaration of Retail Sale Price (MRP) Inclusive of All Taxes',
    description:
      'Every package shall declare the retail sale price in the statutory format: "Maximum or Max. retail price Rs/₹ ... inclusive of all taxes" or in the form "MRP Rs/₹ ... incl., of all taxes" (Rule 2(m)). Individual stickers altering MRP are strictly prohibited except for reducing price (Rule 6(3)).',
    ruleKind: 'AUTHORITATIVE',
    sourceStatus: 'VERIFIED',
    applicability: {
      appliesToDomestic: true,
      appliesToImported: true,
    },
    conditions: [
      {
        field: 'declarations.MRP',
        operator: 'PRESENT',
      },
      {
        field: 'declarations.MRP.rawText',
        operator: 'MRP_FORMAT_VALID',
        parameters: {
          requiredTerms: ['mrp', 'max. retail price', 'maximum retail price', 'inclusive of all taxes', 'incl. of all taxes'],
        },
      },
    ],
    requirement:
      'The Maximum Retail Price (MRP) must be clearly printed including the statement "inclusive of all taxes" or "incl. of all taxes".',
    validationType: 'FIELD_MATCHES_PATTERN',
    exceptions: [
      'Packages containing bidi (Rule 6(1)(g) Proviso C(i)).',
      'Domestic LPG cylinder under Administrative Price Mechanism (Rule 6(1)(g) Proviso C(ii)).',
      'Alcoholic beverages/liquor where State Excise Laws apply (Rule 6(1)(e) Proviso).',
    ],
    severity: 'CRITICAL',
    effectiveFrom: '2011-04-01T00:00:00Z',
    sourceMetadata: {
      sourceDocument: 'The Legal Metrology (Packaged Commodities) Rules, 2011',
      sourcePage: 3,
      gazetteNotificationNumber: 'GSR 202 (E)',
      clauseReference: 'Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)',
    },
    humanVerificationRequired: false,
    status: 'ACTIVE',
    lifecycle: 'ACTIVE',
    version: 1,
    createdAt: '2011-03-07T00:00:00Z',
    updatedAt: '2011-03-07T00:00:00Z',
  },

  // --------------------------------------------------------------------------
  // 6. Rule 6(2): Consumer Care Details (Name, Address, Phone, Email)
  // PDF Reference: Page 7 (Rule 6(2))
  // --------------------------------------------------------------------------
  {
    ruleId: 'GSR-202E-RULE-06-02',
    ruleNumber: '6(2)',
    subRule: '2',
    title: 'Declaration of Consumer Care Contact Details for Complaints',
    description:
      'Every package shall bear the name, address, telephone number, and e-mail address, if available, of the person who or the office which can be contacted in case of consumer complaints.',
    ruleKind: 'AUTHORITATIVE',
    sourceStatus: 'VERIFIED',
    applicability: {
      appliesToDomestic: true,
      appliesToImported: true,
    },
    conditions: [
      {
        field: 'declarations.CONSUMER_CARE_DETAILS',
        operator: 'PRESENT',
      },
    ],
    requirement:
      'The package must declare consumer care contact channels (telephone helpline number and/or postal address and email).',
    validationType: 'FIELD_PRESENT',
    exceptions: [],
    severity: 'MAJOR',
    effectiveFrom: '2011-04-01T00:00:00Z',
    sourceMetadata: {
      sourceDocument: 'The Legal Metrology (Packaged Commodities) Rules, 2011',
      sourcePage: 7,
      gazetteNotificationNumber: 'GSR 202 (E)',
      clauseReference: 'Rule 6(2)',
    },
    humanVerificationRequired: false,
    status: 'ACTIVE',
    lifecycle: 'ACTIVE',
    version: 1,
    createdAt: '2011-03-07T00:00:00Z',
    updatedAt: '2011-03-07T00:00:00Z',
  },

  // --------------------------------------------------------------------------
  // 7. Rule 7(2) read with Table I: Minimum Numeral Height for Net Quantity on PDP
  // PDF Reference: Page 8 (Rule 7(2)), Page 8-9 (Table I)
  // --------------------------------------------------------------------------
  {
    ruleId: 'GSR-202E-RULE-07-02-T1',
    ruleNumber: '7(2)',
    subRule: '2 (Table I)',
    title: 'Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel',
    description:
      'The height of any numeral in the declaration required under these rules on the principal display panel shall not be less than: (i) Up to 200g/ml: 1mm (Normal) / 2mm (Blown/embossed); (ii) Above 200g/ml and up to 500g/ml: 2mm (Normal) / 4mm (Blown); (iii) Above 500g/ml: 4mm (Normal) / 6mm (Blown). Minimum letter height 1mm (Rule 7(3)). Numeral/letter width not less than 1/3 of height (Rule 7(3) Proviso).',
    ruleKind: 'AUTHORITATIVE',
    sourceStatus: 'VERIFIED',
    applicability: {
      appliesToDomestic: true,
      appliesToImported: true,
    },
    conditions: [
      {
        field: 'visualMeasurements.NUMERAL_HEIGHT',
        operator: 'TABLE_I_NUMERAL_HEIGHT',
        parameters: {
          tableI: [
            { maxNetQuantity: 200, minHeightMmNormal: 1.0, minHeightMmBlown: 2.0 },
            { minNetQuantity: 200, maxNetQuantity: 500, minHeightMmNormal: 2.0, minHeightMmBlown: 4.0 },
            { minNetQuantity: 500, minHeightMmNormal: 4.0, minHeightMmBlown: 6.0 },
          ],
          minLetterHeightMm: 1.0,
          minAspectRatioWidthToHeight: 0.333,
        },
      },
    ],
    requirement:
      'The numeral stating net quantity on the PDP must meet the statutory minimum height thresholds specified in Table I according to package weight/volume.',
    validationType: 'VISUAL_MEASUREMENT_COMPARE',
    threshold: {
      minNumericValue: 1.0,
      unit: 'mm',
    },
    exceptions: [
      'Packages having capacity of 5 cubic cm or less: PDP may be a card/tape firmly affixed (Rule 7(1)).',
    ],
    severity: 'MAJOR',
    effectiveFrom: '2011-04-01T00:00:00Z',
    sourceMetadata: {
      sourceDocument: 'The Legal Metrology (Packaged Commodities) Rules, 2011',
      sourcePage: 8,
      gazetteNotificationNumber: 'GSR 202 (E)',
      scheduleNumber: 'Table I',
      clauseReference: 'Rule 7(2) & Rule 7(3)',
    },
    humanVerificationRequired: false,
    status: 'ACTIVE',
    lifecycle: 'ACTIVE',
    version: 1,
    createdAt: '2011-03-07T00:00:00Z',
    updatedAt: '2011-03-07T00:00:00Z',
  },

  // --------------------------------------------------------------------------
  // 8. Rule 18(2): Prohibition of Sale Above Maximum Retail Price (MRP)
  // PDF Reference: Page 16 (Rule 18(2))
  // --------------------------------------------------------------------------
  {
    ruleId: 'GSR-202E-RULE-18-02',
    ruleNumber: '18(2)',
    subRule: '2',
    title: 'Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP',
    description:
      'No retail dealer or other person including manufacturer, packer, importer and wholesale dealer shall make any sale of any commodity in packed form at a price exceeding the retail sale price thereof.',
    ruleKind: 'AUTHORITATIVE',
    sourceStatus: 'VERIFIED',
    applicability: {
      appliesToDomestic: true,
      appliesToImported: true,
    },
    conditions: [
      {
        field: 'ecommerce.listedPriceInr',
        operator: 'LESS_THAN_OR_EQUAL',
        parameters: {
          targetField: 'declarations.MRP.normalizedValue',
        },
      },
    ],
    requirement:
      'The actual sale price (or e-commerce listed price) must not exceed the printed Maximum Retail Price (MRP) on the package label.',
    validationType: 'CROSS_SOURCE_COMPARE',
    exceptions: [],
    severity: 'CRITICAL',
    effectiveFrom: '2011-04-01T00:00:00Z',
    sourceMetadata: {
      sourceDocument: 'The Legal Metrology (Packaged Commodities) Rules, 2011',
      sourcePage: 16,
      gazetteNotificationNumber: 'GSR 202 (E)',
      clauseReference: 'Rule 18(2)',
    },
    humanVerificationRequired: true,
    status: 'ACTIVE',
    lifecycle: 'ACTIVE',
    version: 1,
    createdAt: '2011-03-07T00:00:00Z',
    updatedAt: '2011-03-07T00:00:00Z',
  },
] as const;
