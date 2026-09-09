// ============================================================================
// LM-Vision Web Dashboard - Comprehensive Real Evaluation & Demo Dataset
// ============================================================================

import type { InspectionDetail, InspectionListItem, Page, Row } from './data.js';

export interface StoredRawInspection {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  complianceResult: string;
  complianceScore: number;
  productName: string;
  brandName?: string;
  category: string;
  packageType: string;
  batchNumber?: string;
  notes?: string;
  images: Array<{
    id: string;
    surface: string;
    mimeType: string;
    base64Thumbnail?: string;
    fileUrl?: string;
    [key: string]: any;
  }>;
  declarations: Array<{
    type?: string;
    rawText?: string;
    normalizedValue?: unknown;
    confidence?: number;
    detectedLanguage?: string;
    region?: any;
    [key: string]: any;
  }>;
  complianceAssessments: Array<{
    id?: string;
    ruleId?: string;
    ruleNumber?: string;
    subRule?: string;
    ruleTitle?: string;
    result?: string;
    severity?: string;
    explanation?: string;
    observedValue?: unknown;
    expectedConstraint?: unknown;
    evidenceIds?: string[];
    ruleSource?: {
      sourceDocument?: string;
      sourcePage?: number;
      gazetteNotificationNumber?: string;
      clauseReference?: string;
      [key: string]: any;
    };
    evaluatedAt?: string;
    [key: string]: any;
  }>;
  decision?: {
    decision: string;
    comments?: string;
    decidedAt?: string;
    [key: string]: any;
  };
  report?: {
    reportNumber: string;
    contentHash: string;
    reportHash: string;
    hasPdf: boolean;
    generatedAt: string;
    isDraftPreview?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

export const BASE_DEMO_INSPECTIONS: StoredRawInspection[] = [
  {
    "id": "1adf96b3-9dba-49b1-a5fd-11fa3a7a3aff",
    "createdAt": "2026-09-07T17:43:39.187Z",
    "updatedAt": "2026-09-07T17:43:39.187Z",
    "status": "DECIDED",
    "complianceResult": "PASS",
    "complianceScore": 100,
    "productName": "Chicken Masala Mixed Masala Powder",
    "brandName": "Brand Not Declared",
    "category": "FOOD_BEVERAGE",
    "packageType": "POUCH",
    "images": [],
    "declarations": [
      {
        "type": "BARCODE_QR",
        "rawText": "8 901786 160129",
        "normalizedValue": "8901786160129",
        "unit": null,
        "confidence": 0.99,
        "region": {
          "id": "d1d1dc40-bf3f-477e-b8a7-286519922839",
          "imageId": "59e52b47-0fde-4a47-8b98-8efedbea523e",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.6,
            "yMin": 0.53,
            "xMax": 0.73,
            "yMax": 0.58,
            "unit": "NORMALIZED"
          },
          "text": "8 901786 160129",
          "confidence": 0.99
        },
        "detectedLanguage": "en"
      },
      {
        "type": "CONSUMER_CARE_DETAILS",
        "rawText": "Registered Office and Executive Consumer Care Contact Everest Food Products Pvt. Ltd. Krushal Centre, G.M. Road, Mumbai - 400 089, Maharashtra. • Ph. No.: +91-22-25259915 customercare@everestspices.com www.everestfoods.com",
        "normalizedValue": "Everest Food Products Pvt. Ltd. Krushal Centre, G.M. Road, Mumbai - 400 089, Maharashtra. Ph. No.: +91-22-25259915, customercare@everestspices.com, www.everestfoods.com",
        "unit": null,
        "confidence": 0.97,
        "region": {
          "id": "8c77146d-592d-4ce9-9d76-833c910f598d",
          "imageId": "59e52b47-0fde-4a47-8b98-8efedbea523e",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.34,
            "yMin": 0.48,
            "xMax": 0.6,
            "yMax": 0.55,
            "unit": "NORMALIZED"
          },
          "text": "Registered Office and Executive Consumer Care Contact Everest Food Products Pvt. Ltd. Krushal Centre, G.M. Road, Mumbai - 400 089, Maharashtra. • Ph. No.: +91-22-25259915 customercare@everestspices.com www.everestfoods.com",
          "confidence": 0.97
        },
        "detectedLanguage": "en"
      },
      {
        "type": "DATE_OF_PACKAGING",
        "rawText": "APR24",
        "normalizedValue": "2024-04",
        "unit": null,
        "confidence": 0.93,
        "region": {
          "id": "a01e9604-5d08-47d3-8325-b8921fc4f0ba",
          "imageId": "59e52b47-0fde-4a47-8b98-8efedbea523e",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.26,
            "yMin": 0.54,
            "xMax": 0.3,
            "yMax": 0.59,
            "unit": "NORMALIZED"
          },
          "text": "APR24",
          "confidence": 0.93
        },
        "detectedLanguage": "en"
      },
      {
        "type": "EXPIRY_DATE_BEST_BEFORE",
        "rawText": "JUN27",
        "normalizedValue": "2027-06",
        "unit": null,
        "confidence": 0.93,
        "region": {
          "id": "7f488cae-e664-4a7d-b1f7-0acb556d5520",
          "imageId": "59e52b47-0fde-4a47-8b98-8efedbea523e",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.26,
            "yMin": 0.48,
            "xMax": 0.3,
            "yMax": 0.54,
            "unit": "NORMALIZED"
          },
          "text": "JUN27",
          "confidence": 0.93
        },
        "detectedLanguage": "en"
      },
      {
        "type": "GENERIC_NAME",
        "rawText": "Chicken Masala Mixed Masala Powder",
        "normalizedValue": "Chicken Masala",
        "unit": null,
        "confidence": 0.98,
        "region": {
          "id": "177d6c20-3adf-49fd-83c7-e0f69d9952a0",
          "imageId": "23834a29-8617-40ac-ac0f-f653b9c0b346",
          "surface": "FRONT",
          "boundingBox": {
            "xMin": 0.32,
            "yMin": 0.37,
            "xMax": 0.62,
            "yMax": 0.43,
            "unit": "NORMALIZED"
          },
          "text": "Chicken Masala Mixed Masala Powder",
          "confidence": 0.98
        },
        "detectedLanguage": "en"
      },
      {
        "type": "GENERIC_NAME",
        "rawText": "चिकन मसाला",
        "normalizedValue": "चिकन मसाला",
        "unit": null,
        "confidence": 0.98,
        "region": {
          "id": "0382bed2-9d1d-425b-ad88-54b3103e18cc",
          "imageId": "59e52b47-0fde-4a47-8b98-8efedbea523e",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.37,
            "yMin": 0.31,
            "xMax": 0.5,
            "yMax": 0.33,
            "unit": "NORMALIZED"
          },
          "text": "चिकन मसाला",
          "confidence": 0.98
        },
        "detectedLanguage": "hi"
      },
      {
        "type": "MANUFACTURER_NAME_ADDRESS",
        "rawText": "Manufactured & Packed by : Everest Food Products Pvt. Ltd. (E) 4/B, L.B.S. Marg, Vikhroli (W), Mumbai - 400083, Maharashtra. (U) Survey No. 40, Gangadevi Road, Palgam - 396170, Tal.: Umbergaon - Gujarat.",
        "normalizedValue": "Everest Food Products Pvt. Ltd., (E) 4/B, L.B.S. Marg, Vikhroli (W), Mumbai - 400083, Maharashtra. (U) Survey No. 40, Gangadevi Road, Palgam - 396170, Tal.: Umbergaon - Gujarat.",
        "unit": null,
        "confidence": 0.96,
        "region": {
          "id": "45580f2a-2507-40c8-b277-7d71d4977894",
          "imageId": "59e52b47-0fde-4a47-8b98-8efedbea523e",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.34,
            "yMin": 0.41,
            "xMax": 0.72,
            "yMax": 0.46,
            "unit": "NORMALIZED"
          },
          "text": "Manufactured & Packed by : Everest Food Products Pvt. Ltd. (E) 4/B, L.B.S. Marg, Vikhroli (W), Mumbai - 400083, Maharashtra. (U) Survey No. 40, Gangadevi Road, Palgam - 396170, Tal.: Umbergaon - Gujarat.",
          "confidence": 0.96
        },
        "detectedLanguage": "en"
      },
      {
        "type": "MRP",
        "rawText": "₹ 10.00",
        "normalizedValue": "10.00",
        "unit": "INR",
        "confidence": 0.98,
        "region": {
          "id": "e1eab95c-0e0b-4317-8f88-75a2082e34b5",
          "imageId": "59e52b47-0fde-4a47-8b98-8efedbea523e",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.26,
            "yMin": 0.41,
            "xMax": 0.3,
            "yMax": 0.48,
            "unit": "NORMALIZED"
          },
          "text": "₹ 10.00",
          "confidence": 0.98
        },
        "detectedLanguage": "en"
      },
      {
        "type": "MRP",
        "rawText": "₹10/-",
        "normalizedValue": "10.00",
        "unit": "INR",
        "confidence": 0.99,
        "region": {
          "id": "a2d5cf43-cffa-4320-be60-55b8e00b40a1",
          "imageId": "23834a29-8617-40ac-ac0f-f653b9c0b346",
          "surface": "FRONT",
          "boundingBox": {
            "xMin": 0.58,
            "yMin": 0.41,
            "xMax": 0.68,
            "yMax": 0.48,
            "unit": "NORMALIZED"
          },
          "text": "₹10/-",
          "confidence": 0.99
        },
        "detectedLanguage": "en"
      },
      {
        "type": "NET_QUANTITY",
        "rawText": "12g",
        "normalizedValue": "12",
        "unit": "g",
        "confidence": 0.95,
        "region": {
          "id": "30cab19c-05fe-45fc-b77a-0d40478a3d45",
          "imageId": "59e52b47-0fde-4a47-8b98-8efedbea523e",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.26,
            "yMin": 0.59,
            "xMax": 0.3,
            "yMax": 0.62,
            "unit": "NORMALIZED"
          },
          "text": "12g",
          "confidence": 0.95
        },
        "detectedLanguage": "en"
      },
      {
        "type": "UNIT_SALE_PRICE",
        "rawText": "₹ 0.83/g",
        "normalizedValue": "0.83",
        "unit": "₹/g",
        "confidence": 0.95,
        "region": {
          "id": "4d7695aa-9c5e-4882-9c27-db9406743c24",
          "imageId": "59e52b47-0fde-4a47-8b98-8efedbea523e",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.26,
            "yMin": 0.32,
            "xMax": 0.3,
            "yMax": 0.4,
            "unit": "NORMALIZED"
          },
          "text": "₹ 0.83/g",
          "confidence": 0.95
        },
        "detectedLanguage": "en"
      }
    ],
    "complianceAssessments": [
      {
        "id": "43ab2c16-0990-48ea-82d0-503c8477499c",
        "inspectionId": "1adf96b3-9dba-49b1-a5fd-11fa3a7a3aff",
        "ruleId": "GSR-202E-RULE-06-01-A",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(a)",
        "subRule": "1(a)",
        "ruleTitle": "Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(a) & Rule 10(1)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Definite and conspicuous declaration of manufacturer/packer name and address is present in compliance with Rule 6(1)(a) and Rule 10(1).",
        "observedValue": "Manufactured & Packed by : Everest Food Products Pvt. Ltd. (E) 4/B, L.B.S. Marg, Vikhroli (W), Mumbai - 400083, Maharashtra. (U) Survey No. 40, Gangadevi Road, Palgam - 396170, Tal.: Umbergaon - Gujarat.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.96,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-07T17:42:17.731Z",
        "createdAt": "2026-09-07T17:42:17.731Z"
      },
      {
        "id": "0c02d1ae-742a-4f23-b053-da6c011b5e34",
        "inspectionId": "1adf96b3-9dba-49b1-a5fd-11fa3a7a3aff",
        "ruleId": "GSR-202E-RULE-06-01-B",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(b)",
        "subRule": "1(b)",
        "ruleTitle": "Declaration of Generic or Common Name of the Commodity",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(b)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Generic or common name of the commodity is clearly declared in compliance with Rule 6(1)(b).",
        "observedValue": "Chicken Masala Mixed Masala Powder",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.98,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-07T17:42:17.731Z",
        "createdAt": "2026-09-07T17:42:17.731Z"
      },
      {
        "id": "291d8029-b858-42cc-89ca-2095b5a14f4a",
        "inspectionId": "1adf96b3-9dba-49b1-a5fd-11fa3a7a3aff",
        "ruleId": "GSR-202E-RULE-06-01-C",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(c)",
        "subRule": "1(c)",
        "ruleTitle": "Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 13,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(c) read with Rule 11, 12, 13"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Net quantity is declared in standard SI units in compliance with Rule 6(1)(c) and Rule 13.",
        "observedValue": "12g",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.95,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-07T17:42:17.731Z",
        "createdAt": "2026-09-07T17:42:17.731Z"
      },
      {
        "id": "7a3cf4ec-d58b-4b01-9b65-0681ca7e549e",
        "inspectionId": "1adf96b3-9dba-49b1-a5fd-11fa3a7a3aff",
        "ruleId": "GSR-202E-RULE-06-01-D",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(d)",
        "subRule": "1(d)",
        "ruleTitle": "Declaration of Month and Year of Manufacture, Pre-Packing or Import",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(d) read with Rule 6(1)(g) Proviso A"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Month and year of manufacture/packing/import is clearly declared in compliance with Rule 6(1)(d).",
        "observedValue": "APR24",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.93,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-07T17:42:17.731Z",
        "createdAt": "2026-09-07T17:42:17.731Z"
      },
      {
        "id": "4701d61c-7217-472f-b23b-92f4c3e68496",
        "inspectionId": "1adf96b3-9dba-49b1-a5fd-11fa3a7a3aff",
        "ruleId": "GSR-202E-RULE-06-01-E",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(e)",
        "subRule": "1(e)",
        "ruleTitle": "Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 3,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)"
        },
        "result": "REQUIRES_VERIFICATION",
        "evidenceSufficiency": "LOW_CONFIDENCE",
        "severity": "CRITICAL",
        "explanation": "MRP declared with numeric value but mandatory phrase \"inclusive of all taxes\" is not clearly confirmed on label.",
        "observedValue": "₹10/-",
        "expectedConstraint": "MRP Rs ... inclusive of all taxes (Rule 2(m))",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.99,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-07T17:42:17.731Z",
        "createdAt": "2026-09-07T17:42:17.731Z"
      },
      {
        "id": "24f2cba7-3e3d-4465-afaa-41a36286ab02",
        "inspectionId": "1adf96b3-9dba-49b1-a5fd-11fa3a7a3aff",
        "ruleId": "GSR-202E-RULE-06-02",
        "ruleVersionId": "1",
        "ruleNumber": "6(2)",
        "subRule": "2",
        "ruleTitle": "Declaration of Consumer Care Contact Details for Complaints",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 7,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(2)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Consumer care contact details (telephone/email/address) are provided in accordance with Rule 6(2).",
        "observedValue": "Registered Office and Executive Consumer Care Contact Everest Food Products Pvt. Ltd. Krushal Centre, G.M. Road, Mumbai - 400 089, Maharashtra. • Ph. No.: +91-22-25259915 customercare@everestspices.com www.everestfoods.com",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.97,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-07T17:42:17.731Z",
        "createdAt": "2026-09-07T17:42:17.731Z"
      },
      {
        "id": "e135fcd2-f1e5-4a7a-b79f-119c9660d242",
        "inspectionId": "1adf96b3-9dba-49b1-a5fd-11fa3a7a3aff",
        "ruleId": "GSR-202E-RULE-07-02-T1",
        "ruleVersionId": "1",
        "ruleNumber": "7(2)",
        "subRule": "2 (Table I)",
        "ruleTitle": "Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 8,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "scheduleNumber": "Table I",
          "clauseReference": "Rule 7(2) & Rule 7(3)"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: 1mm).",
        "expectedConstraint": ">= 1mm (Table I)",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.3,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-07T17:42:17.731Z",
        "createdAt": "2026-09-07T17:42:17.731Z"
      },
      {
        "id": "a718eae9-3d43-4096-b1a6-2c7dfe9815e3",
        "inspectionId": "1adf96b3-9dba-49b1-a5fd-11fa3a7a3aff",
        "ruleId": "GSR-202E-RULE-18-02",
        "ruleVersionId": "1",
        "ruleNumber": "18(2)",
        "subRule": "2",
        "ruleTitle": "Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 16,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 18(2)"
        },
        "result": "NOT_APPLICABLE",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 1,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-07T17:42:17.731Z",
        "createdAt": "2026-09-07T17:42:17.731Z"
      }
    ],
    "findings": [
      {
        "id": "4701d61c-7217-472f-b23b-92f4c3e68496",
        "ruleId": "GSR-202E-RULE-06-01-E",
        "title": "6(1)(e)(1(e)) - Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
        "description": "MRP declared with numeric value but mandatory phrase \"inclusive of all taxes\" is not clearly confirmed on label.",
        "status": "MANUAL_REVIEW"
      }
    ],
    "report": {
      "reportNumber": "LM-REP-2026-1ADF96B3",
      "contentHash": "3c1b4de11f8bb16de8c35f0accad992c1b38c800e4a09219521f81185120ea99",
      "reportHash": "eb461571f8d8e2fe857eb6fa4ddfee448a0f9d2fef402d9049f5d3c14ceebd8c",
      "hasPdf": true,
      "generatedAt": "2026-09-07T17:43:30.687Z",
      "isDraftPreview": false
    },
    "decision": {
      "decision": "COMPLIANT",
      "comments": "Good",
      "decidedAt": "2026-09-07T17:43:13.004Z"
    }
  },
  {
    "id": "798a124a-7966-4dc7-81e1-121059a80028",
    "createdAt": "2026-09-07T18:01:56.778Z",
    "updatedAt": "2026-09-07T18:03:23.492Z",
    "status": "DECIDED",
    "complianceResult": "FAIL",
    "complianceScore": 38,
    "productName": "PACKAGED DRINKING WATER OZONISED",
    "category": "COMMODITY",
    "packageType": "PACKAGE",
    "images": [
      {
        "id": "5b3ce5ea-8f3b-47b8-b1c6-72f296ed5363",
        "surface": "FRONT",
        "mimeType": "image/jpeg",
        "base64Thumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAQwAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMADQkKCwoIDQsKCw4ODQ8TIBUTEhITJxweFyAuKTEwLiktLDM6Sj4zNkY3LC1AV0FGTE5SU1IyPlphWlBgSlFST//bAEMBDg4OExETJhUVJk81LTVPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT//AABEIDMAJkAMBIgACEQEDEQH/xAAbAAADAQEBAQEAAAAAAAAA"
      },
      {
        "id": "1a1d4f20-341a-47c6-8618-b3cdff9f105a",
        "surface": "BACK",
        "mimeType": "image/jpeg",
        "base64Thumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAQwAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMADQkKCwoIDQsKCw4ODQ8TIBUTEhITJxweFyAuKTEwLiktLDM6Sj4zNkY3LC1AV0FGTE5SU1IyPlphWlBgSlFST//bAEMBDg4OExETJhUVJk81LTVPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT//AABEIDMAJkAMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAA"
      }
    ],
    "declarations": [
      {
        "type": "GENERIC_NAME",
        "rawText": "PACKAGED DRINKING WATER OZONISED",
        "normalizedValue": "PACKAGED DRINKING WATER",
        "unit": null,
        "confidence": 0.95,
        "region": {
          "id": "0c974a7a-0e3a-4024-b8bd-175bc6850627",
          "imageId": "1a1d4f20-341a-47c6-8618-b3cdff9f105a",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.233,
            "yMin": 0.325,
            "xMax": 0.408,
            "yMax": 0.342,
            "unit": "NORMALIZED"
          },
          "text": "PACKAGED DRINKING WATER OZONISED",
          "confidence": 0.95
        },
        "detectedLanguage": "en"
      },
      {
        "type": "NET_QUANTITY",
        "rawText": "NET QUANTITY: 1L",
        "normalizedValue": 1,
        "unit": "L",
        "confidence": 0.98,
        "region": {
          "id": "7ba98119-4bb2-4d73-802a-f18b801a57a7",
          "imageId": "1a1d4f20-341a-47c6-8618-b3cdff9f105a",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.581,
            "yMin": 0.518,
            "xMax": 0.638,
            "yMax": 0.567,
            "unit": "NORMALIZED"
          },
          "text": "NET QUANTITY: 1L",
          "confidence": 0.98
        },
        "detectedLanguage": "en"
      },
      {
        "type": "COUNTRY_OF_ORIGIN",
        "rawText": "MADE IN INDIA",
        "normalizedValue": "India",
        "unit": null,
        "confidence": 0.98,
        "region": {
          "id": "0ff030de-df7d-46c6-93c4-ff619745281b",
          "imageId": "1a1d4f20-341a-47c6-8618-b3cdff9f105a",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.583,
            "yMin": 0.388,
            "xMax": 0.644,
            "yMax": 0.401,
            "unit": "NORMALIZED"
          },
          "text": "MADE IN INDIA",
          "confidence": 0.98
        },
        "detectedLanguage": "en"
      },
      {
        "type": "PACKER_NAME_ADDRESS",
        "rawText": "MKT BY: BISLERI INTERNATIONAL PVT. LTD. 5TH FLOOR, CTS NO. 525/1A1/A, WESTERN EXPRESS HIGHWAY, ANDHERI (EAST), MUMBAI - 400 099, MAHARASHTRA.",
        "normalizedValue": "BISLERI INTERNATIONAL PVT. LTD. 5TH FLOOR, CTS NO. 525/1A1/A, WESTERN EXPRESS HIGHWAY, ANDHERI (EAST), MUMBAI - 400 099, MAHARASHTRA",
        "unit": null,
        "confidence": 0.95,
        "region": {
          "id": "54c20038-98f2-4b34-8751-656f83b87c5b",
          "imageId": "1a1d4f20-341a-47c6-8618-b3cdff9f105a",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.236,
            "yMin": 0.418,
            "xMax": 0.493,
            "yMax": 0.453,
            "unit": "NORMALIZED"
          },
          "text": "MKT BY: BISLERI INTERNATIONAL PVT. LTD. 5TH FLOOR, CTS NO. 525/1A1/A, WESTERN EXPRESS HIGHWAY, ANDHERI (EAST), MUMBAI - 400 099, MAHARASHTRA.",
          "confidence": 0.95
        },
        "detectedLanguage": "en"
      },
      {
        "type": "EXPIRY_DATE_BEST_BEFORE",
        "rawText": "BEST BEFORE SIX MONTHS FROM MANUFACTURE",
        "normalizedValue": "6 months from manufacture",
        "unit": null,
        "confidence": 0.95,
        "region": {
          "id": "cedb5377-bf04-4965-9584-b2369c4fc50e",
          "imageId": "1a1d4f20-341a-47c6-8618-b3cdff9f105a",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.239,
            "yMin": 0.461,
            "xMax": 0.413,
            "yMax": 0.475,
            "unit": "NORMALIZED"
          },
          "text": "BEST BEFORE SIX MONTHS FROM MANUFACTURE",
          "confidence": 0.95
        },
        "detectedLanguage": "en"
      },
      {
        "type": "CONSUMER_CARE_DETAILS",
        "rawText": "CONTACT: CUSTOMER CARE EXECUTIVE 1800-121-1007 EMAIL: WECARE@BISLERI.CO.IN ADDRESS: SAME AS MKT BY ADDRESS VISIT US @ WWW.BISLERI.COM",
        "normalizedValue": "1800-121-1007, WECARE@BISLERI.CO.IN",
        "unit": null,
        "confidence": 0.95,
        "region": {
          "id": "b24fb3c0-94fe-429a-a8eb-d5d052144dcb",
          "imageId": "1a1d4f20-341a-47c6-8618-b3cdff9f105a",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.241,
            "yMin": 0.525,
            "xMax": 0.551,
            "yMax": 0.581,
            "unit": "NORMALIZED"
          },
          "text": "CONTACT: CUSTOMER CARE EXECUTIVE 1800-121-1007 EMAIL: WECARE@BISLERI.CO.IN ADDRESS: SAME AS MKT BY ADDRESS VISIT US @ WWW.BISLERI.COM",
          "confidence": 0.95
        },
        "detectedLanguage": "en"
      },
      {
        "type": "BARCODE_QR",
        "rawText": "8906017290040",
        "normalizedValue": "8906017290040",
        "unit": null,
        "confidence": 0.98,
        "region": {
          "id": "01ebb0ba-2553-4cc9-af76-dbe91a139d14",
          "imageId": "1a1d4f20-341a-47c6-8618-b3cdff9f105a",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.578,
            "yMin": 0.403,
            "xMax": 0.643,
            "yMax": 0.518,
            "unit": "NORMALIZED"
          },
          "text": "8906017290040",
          "confidence": 0.98
        },
        "detectedLanguage": "en"
      },
      {
        "type": "OTHER",
        "rawText": "Lic. No. 11524998000680",
        "normalizedValue": "11524998000680",
        "unit": null,
        "confidence": 0.95,
        "region": {
          "id": "757345f3-15f9-4db3-92e5-afe641e264f5",
          "imageId": "1a1d4f20-341a-47c6-8618-b3cdff9f105a",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.512,
            "yMin": 0.371,
            "xMax": 0.645,
            "yMax": 0.387,
            "unit": "NORMALIZED"
          },
          "text": "Lic. No. 11524998000680",
          "confidence": 0.95
        },
        "detectedLanguage": "en"
      }
    ],
    "complianceAssessments": [
      {
        "id": "3b02e8d5-db7f-4218-abc9-e6ab45ce2310",
        "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
        "ruleId": "GSR-202E-RULE-06-01-A",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(a)",
        "subRule": "1(a)",
        "ruleTitle": "Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(a) & Rule 10(1)"
        },
        "result": "REQUIRES_VERIFICATION",
        "evidenceSufficiency": "LOW_CONFIDENCE",
        "severity": "CRITICAL",
        "explanation": "Manufacturer/packer name is declared, but the address appears partial or lacks identifiable postal/city/pin details. Rule 10(1) requires a complete address.",
        "observedValue": "MKT BY: BISLERI INTERNATIONAL PVT. LTD. 5TH FLOOR, CTS NO. 525/1A1/A, WESTERN EXPRESS HIGHWAY, ANDHERI (EAST), MUMBAI - 400 099, MAHARASHTRA.",
        "expectedConstraint": "Name and complete postal address enabling consumer identification",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.95,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-07T18:01:56.782Z",
        "createdAt": "2026-09-07T18:01:56.782Z"
      },
      {
        "id": "41db3eaa-7b93-4e7b-a106-0c486ffb3548",
        "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
        "ruleId": "GSR-202E-RULE-06-01-B",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(b)",
        "subRule": "1(b)",
        "ruleTitle": "Declaration of Generic or Common Name of the Commodity",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(b)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Generic or common name of the commodity is clearly declared in compliance with Rule 6(1)(b).",
        "observedValue": "PACKAGED DRINKING WATER OZONISED",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.95,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-07T18:01:56.782Z",
        "createdAt": "2026-09-07T18:01:56.782Z"
      },
      {
        "id": "11dcafe3-b14c-4902-94f5-88b1464cf91e",
        "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
        "ruleId": "GSR-202E-RULE-06-01-C",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(c)",
        "subRule": "1(c)",
        "ruleTitle": "Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 13,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(c) read with Rule 11, 12, 13"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Net quantity is declared in standard SI units in compliance with Rule 6(1)(c) and Rule 13.",
        "observedValue": "NET QUANTITY: 1L",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.98,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-07T18:01:56.782Z",
        "createdAt": "2026-09-07T18:01:56.782Z"
      },
      {
        "id": "62483e33-779f-4a24-ab92-94a1d7b80911",
        "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
        "ruleId": "GSR-202E-RULE-06-01-D",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(d)",
        "subRule": "1(d)",
        "ruleTitle": "Declaration of Month and Year of Manufacture, Pre-Packing or Import",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(d) read with Rule 6(1)(g) Proviso A"
        },
        "result": "FAIL",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Month and year of manufacture, pre-packing, or import is missing from the package in violation of Rule 6(1)(d).",
        "deviation": "Mandatory manufacturing or packaging date missing.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.95,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-07T18:01:56.782Z",
        "createdAt": "2026-09-07T18:01:56.782Z"
      },
      {
        "id": "65d47c0f-69c6-4673-86fa-8e229b55d50b",
        "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
        "ruleId": "GSR-202E-RULE-06-01-E",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(e)",
        "subRule": "1(e)",
        "ruleTitle": "Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 3,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)"
        },
        "result": "FAIL",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Maximum Retail Price (MRP) declaration is missing from the package in violation of Rule 6(1)(e).",
        "deviation": "Mandatory MRP declaration not found on package.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.95,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-07T18:01:56.782Z",
        "createdAt": "2026-09-07T18:01:56.782Z"
      },
      {
        "id": "0d2c4aa1-733c-4a22-a366-ba67ba33bad7",
        "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
        "ruleId": "GSR-202E-RULE-06-02",
        "ruleVersionId": "1",
        "ruleNumber": "6(2)",
        "subRule": "2",
        "ruleTitle": "Declaration of Consumer Care Contact Details for Complaints",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 7,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(2)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Consumer care contact details (telephone/email/address) are provided in accordance with Rule 6(2).",
        "observedValue": "CONTACT: CUSTOMER CARE EXECUTIVE 1800-121-1007 EMAIL: WECARE@BISLERI.CO.IN ADDRESS: SAME AS MKT BY ADDRESS VISIT US @ WWW.BISLERI.COM",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.95,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-07T18:01:56.782Z",
        "createdAt": "2026-09-07T18:01:56.782Z"
      },
      {
        "id": "25d2994f-c48e-4aed-835d-e2c1a54ec16a",
        "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
        "ruleId": "GSR-202E-RULE-07-02-T1",
        "ruleVersionId": "1",
        "ruleNumber": "7(2)",
        "subRule": "2 (Table I)",
        "ruleTitle": "Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 8,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "scheduleNumber": "Table I",
          "clauseReference": "Rule 7(2) & Rule 7(3)"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: 4mm).",
        "expectedConstraint": ">= 4mm (Table I)",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.3,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-07T18:01:56.782Z",
        "createdAt": "2026-09-07T18:01:56.782Z"
      },
      {
        "id": "f6270658-9f63-462a-925f-fa233e3f23a6",
        "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
        "ruleId": "GSR-202E-RULE-18-02",
        "ruleVersionId": "1",
        "ruleNumber": "18(2)",
        "subRule": "2",
        "ruleTitle": "Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 16,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 18(2)"
        },
        "result": "NOT_APPLICABLE",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 1,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-07T18:01:56.782Z",
        "createdAt": "2026-09-07T18:01:56.782Z"
      }
    ],
    "complianceSummary": {
      "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
      "engineVersion": "1.0.0",
      "ruleBundleId": "LM-IN-RULES-2026.09",
      "ruleCountEvaluated": 8,
      "passCount": 3,
      "failCount": 2,
      "requiresVerificationCount": 1,
      "notApplicableCount": 1,
      "insufficientEvidenceCount": 1,
      "assessments": [
        {
          "id": "3b02e8d5-db7f-4218-abc9-e6ab45ce2310",
          "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
          "ruleId": "GSR-202E-RULE-06-01-A",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(a)",
          "subRule": "1(a)",
          "ruleTitle": "Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(a) & Rule 10(1)"
          },
          "result": "REQUIRES_VERIFICATION",
          "evidenceSufficiency": "LOW_CONFIDENCE",
          "severity": "CRITICAL",
          "explanation": "Manufacturer/packer name is declared, but the address appears partial or lacks identifiable postal/city/pin details. Rule 10(1) requires a complete address.",
          "observedValue": "MKT BY: BISLERI INTERNATIONAL PVT. LTD. 5TH FLOOR, CTS NO. 525/1A1/A, WESTERN EXPRESS HIGHWAY, ANDHERI (EAST), MUMBAI - 400 099, MAHARASHTRA.",
          "expectedConstraint": "Name and complete postal address enabling consumer identification",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.95,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-07T18:01:56.782Z",
          "createdAt": "2026-09-07T18:01:56.782Z"
        },
        {
          "id": "41db3eaa-7b93-4e7b-a106-0c486ffb3548",
          "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
          "ruleId": "GSR-202E-RULE-06-01-B",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(b)",
          "subRule": "1(b)",
          "ruleTitle": "Declaration of Generic or Common Name of the Commodity",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(b)"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Generic or common name of the commodity is clearly declared in compliance with Rule 6(1)(b).",
          "observedValue": "PACKAGED DRINKING WATER OZONISED",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.95,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-07T18:01:56.782Z",
          "createdAt": "2026-09-07T18:01:56.782Z"
        },
        {
          "id": "11dcafe3-b14c-4902-94f5-88b1464cf91e",
          "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
          "ruleId": "GSR-202E-RULE-06-01-C",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(c)",
          "subRule": "1(c)",
          "ruleTitle": "Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 13,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(c) read with Rule 11, 12, 13"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "Net quantity is declared in standard SI units in compliance with Rule 6(1)(c) and Rule 13.",
          "observedValue": "NET QUANTITY: 1L",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.98,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-07T18:01:56.782Z",
          "createdAt": "2026-09-07T18:01:56.782Z"
        },
        {
          "id": "62483e33-779f-4a24-ab92-94a1d7b80911",
          "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
          "ruleId": "GSR-202E-RULE-06-01-D",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(d)",
          "subRule": "1(d)",
          "ruleTitle": "Declaration of Month and Year of Manufacture, Pre-Packing or Import",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(d) read with Rule 6(1)(g) Proviso A"
          },
          "result": "FAIL",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Month and year of manufacture, pre-packing, or import is missing from the package in violation of Rule 6(1)(d).",
          "deviation": "Mandatory manufacturing or packaging date missing.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.95,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-07T18:01:56.782Z",
          "createdAt": "2026-09-07T18:01:56.782Z"
        },
        {
          "id": "65d47c0f-69c6-4673-86fa-8e229b55d50b",
          "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
          "ruleId": "GSR-202E-RULE-06-01-E",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(e)",
          "subRule": "1(e)",
          "ruleTitle": "Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 3,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)"
          },
          "result": "FAIL",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "Maximum Retail Price (MRP) declaration is missing from the package in violation of Rule 6(1)(e).",
          "deviation": "Mandatory MRP declaration not found on package.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.95,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-07T18:01:56.782Z",
          "createdAt": "2026-09-07T18:01:56.782Z"
        },
        {
          "id": "0d2c4aa1-733c-4a22-a366-ba67ba33bad7",
          "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
          "ruleId": "GSR-202E-RULE-06-02",
          "ruleVersionId": "1",
          "ruleNumber": "6(2)",
          "subRule": "2",
          "ruleTitle": "Declaration of Consumer Care Contact Details for Complaints",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 7,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(2)"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Consumer care contact details (telephone/email/address) are provided in accordance with Rule 6(2).",
          "observedValue": "CONTACT: CUSTOMER CARE EXECUTIVE 1800-121-1007 EMAIL: WECARE@BISLERI.CO.IN ADDRESS: SAME AS MKT BY ADDRESS VISIT US @ WWW.BISLERI.COM",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.95,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-07T18:01:56.782Z",
          "createdAt": "2026-09-07T18:01:56.782Z"
        },
        {
          "id": "25d2994f-c48e-4aed-835d-e2c1a54ec16a",
          "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
          "ruleId": "GSR-202E-RULE-07-02-T1",
          "ruleVersionId": "1",
          "ruleNumber": "7(2)",
          "subRule": "2 (Table I)",
          "ruleTitle": "Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 8,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "scheduleNumber": "Table I",
            "clauseReference": "Rule 7(2) & Rule 7(3)"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: 4mm).",
          "expectedConstraint": ">= 4mm (Table I)",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.3,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-07T18:01:56.782Z",
          "createdAt": "2026-09-07T18:01:56.782Z"
        },
        {
          "id": "f6270658-9f63-462a-925f-fa233e3f23a6",
          "inspectionId": "798a124a-7966-4dc7-81e1-121059a80028",
          "ruleId": "GSR-202E-RULE-18-02",
          "ruleVersionId": "1",
          "ruleNumber": "18(2)",
          "subRule": "2",
          "ruleTitle": "Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 16,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 18(2)"
          },
          "result": "NOT_APPLICABLE",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 1,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-07T18:01:56.782Z",
          "createdAt": "2026-09-07T18:01:56.782Z"
        }
      ],
      "overallStatus": "FAIL",
      "evaluatedAt": "2026-09-07T18:01:56.782Z"
    },
    "findings": [
      {
        "id": "3b02e8d5-db7f-4218-abc9-e6ab45ce2310",
        "ruleId": "GSR-202E-RULE-06-01-A",
        "title": "6(1)(a)(1(a)) - Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
        "description": "Manufacturer/packer name is declared, but the address appears partial or lacks identifiable postal/city/pin details. Rule 10(1) requires a complete address.",
        "status": "MANUAL_REVIEW",
        "severity": "CRITICAL"
      },
      {
        "id": "62483e33-779f-4a24-ab92-94a1d7b80911",
        "ruleId": "GSR-202E-RULE-06-01-D",
        "title": "6(1)(d)(1(d)) - Declaration of Month and Year of Manufacture, Pre-Packing or Import",
        "description": "Month and year of manufacture, pre-packing, or import is missing from the package in violation of Rule 6(1)(d).",
        "status": "VIOLATION",
        "severity": "MAJOR"
      },
      {
        "id": "65d47c0f-69c6-4673-86fa-8e229b55d50b",
        "ruleId": "GSR-202E-RULE-06-01-E",
        "title": "6(1)(e)(1(e)) - Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
        "description": "Maximum Retail Price (MRP) declaration is missing from the package in violation of Rule 6(1)(e).",
        "status": "VIOLATION",
        "severity": "CRITICAL"
      }
    ],
    "report": {
      "reportNumber": "LM-REP-2026-798A124A",
      "contentHash": "52c23d7687ced4291e1e8479640787bb9d7337e2c32eb2b112ac4c92b07d1a8d",
      "reportHash": "1cff34a45a5feb5122a3c13b000ac4c0087637b2b885032b13da1e9fe79099b1",
      "hasPdf": true,
      "generatedAt": "2026-09-07T18:03:20.852Z",
      "isDraftPreview": false
    },
    "decision": {
      "decision": "COMPLIANT",
      "comments": "Gt",
      "decidedAt": "2026-09-07T18:02:54.235Z"
    }
  },
  {
    "id": "11111111-1111-4111-8111-111111111111",
    "createdAt": "2026-09-08T01:35:52.269Z",
    "updatedAt": "2026-09-08T18:26:54.279Z",
    "status": "ANALYZED",
    "complianceResult": "FAIL",
    "complianceScore": 63,
    "productName": "Herbal Anti-Dandruff Shampoo",
    "brandName": "Manufactured by: Herbal Labs India Pvt Ltd, Industrial Area, Solan, HP - 173220",
    "category": "COMMODITY",
    "packageType": "PACKAGE",
    "images": [
      {
        "id": "22222222-2222-4222-8222-222222222222",
        "surface": "FRONT",
        "mimeType": "image/jpeg",
        "base64Thumbnail": "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVGPoZAEffA/2V6H4MAAAAAElFTkSuQmCCiVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVGPoZAEffA/2V6H4MAAAAAElFTkSuQmCC"
      },
      {
        "id": "33333333-3333-4333-8333-333333333333",
        "surface": "BACK",
        "mimeType": "image/jpeg",
        "base64Thumbnail": "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVGPoZAEffA/2V6H4MAAAAAElFTkSuQmCCiVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVGPoZAEffA/2V6H4MAAAAAElFTkSuQmCC"
      }
    ],
    "declarations": [
      {
        "type": "GENERIC_NAME",
        "rawText": "Herbal Anti-Dandruff Shampoo",
        "normalizedValue": "Herbal Anti-Dandruff Shampoo",
        "unit": null,
        "confidence": 0.98,
        "region": {
          "id": "dd15abb2-4dcb-4a75-83c6-2839f258a311",
          "imageId": "22222222-2222-4222-8222-222222222222",
          "surface": "FRONT",
          "boundingBox": {
            "xMin": 0.1,
            "yMin": 0.2,
            "xMax": 0.9,
            "yMax": 0.35,
            "unit": "NORMALIZED"
          },
          "text": "Herbal Anti-Dandruff Shampoo",
          "confidence": 0.98
        },
        "detectedLanguage": "en"
      },
      {
        "type": "NET_QUANTITY",
        "rawText": "Net Vol. 180 ml",
        "normalizedValue": 180,
        "unit": "ml",
        "confidence": 0.95,
        "region": {
          "id": "d847b2c1-cadb-45f4-9aa1-0e8d997ce929",
          "imageId": "22222222-2222-4222-8222-222222222222",
          "surface": "FRONT",
          "boundingBox": {
            "xMin": 0.3,
            "yMin": 0.75,
            "xMax": 0.7,
            "yMax": 0.85,
            "unit": "NORMALIZED"
          },
          "text": "Net Vol. 180 ml",
          "confidence": 0.95
        },
        "detectedLanguage": "en"
      },
      {
        "type": "MRP",
        "rawText": "MRP Rs. 240.00 (Incl. of all taxes)",
        "normalizedValue": 240,
        "unit": "INR",
        "confidence": 0.99,
        "region": {
          "id": "598e9916-cd22-4645-a981-270903872f16",
          "imageId": "22222222-2222-4222-8222-222222222222",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.2,
            "yMin": 0.6,
            "xMax": 0.8,
            "yMax": 0.7,
            "unit": "NORMALIZED"
          },
          "text": "MRP Rs. 240.00 (Incl. of all taxes)",
          "confidence": 0.99
        },
        "detectedLanguage": "en"
      },
      {
        "type": "MANUFACTURER_NAME_ADDRESS",
        "rawText": "Manufactured by: Herbal Labs India Pvt Ltd, Industrial Area, Solan, HP - 173220",
        "normalizedValue": "Herbal Labs India Pvt Ltd, Solan, HP",
        "unit": null,
        "confidence": 0.92,
        "detectedLanguage": "en"
      },
      {
        "type": "CONSUMER_CARE_DETAILS",
        "rawText": "Consumer Care Cell: 1800-11-2233 / care@herballabs.example.com",
        "normalizedValue": "1800-11-2233",
        "unit": null,
        "confidence": 0.94,
        "detectedLanguage": "en"
      }
    ],
    "complianceAssessments": [
      {
        "id": "46aa81bd-175b-4db3-8966-83decfe47d96",
        "inspectionId": "11111111-1111-4111-8111-111111111111",
        "ruleId": "GSR-202E-RULE-06-01-A",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(a)",
        "subRule": "1(a)",
        "ruleTitle": "Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(a) & Rule 10(1)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Definite and conspicuous declaration of manufacturer/packer name and address is present in compliance with Rule 6(1)(a) and Rule 10(1).",
        "observedValue": "Manufactured by: Herbal Labs India Pvt Ltd, Industrial Area, Solan, HP - 173220",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.92,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T18:26:54.279Z",
        "createdAt": "2026-09-08T18:26:54.279Z"
      },
      {
        "id": "b22d346c-247f-40cc-9569-964118ccf6f1",
        "inspectionId": "11111111-1111-4111-8111-111111111111",
        "ruleId": "GSR-202E-RULE-06-01-B",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(b)",
        "subRule": "1(b)",
        "ruleTitle": "Declaration of Generic or Common Name of the Commodity",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(b)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Generic or common name of the commodity is clearly declared in compliance with Rule 6(1)(b).",
        "observedValue": "Herbal Anti-Dandruff Shampoo",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.98,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T18:26:54.279Z",
        "createdAt": "2026-09-08T18:26:54.279Z"
      },
      {
        "id": "2a9613b7-36d8-4fda-86f9-df5c44bec06b",
        "inspectionId": "11111111-1111-4111-8111-111111111111",
        "ruleId": "GSR-202E-RULE-06-01-C",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(c)",
        "subRule": "1(c)",
        "ruleTitle": "Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 13,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(c) read with Rule 11, 12, 13"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Net quantity is declared in standard SI units in compliance with Rule 6(1)(c) and Rule 13.",
        "observedValue": "Net Vol. 180 ml",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.95,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T18:26:54.279Z",
        "createdAt": "2026-09-08T18:26:54.279Z"
      },
      {
        "id": "dcf553ac-7112-4028-aea5-075814755df2",
        "inspectionId": "11111111-1111-4111-8111-111111111111",
        "ruleId": "GSR-202E-RULE-06-01-D",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(d)",
        "subRule": "1(d)",
        "ruleTitle": "Declaration of Month and Year of Manufacture, Pre-Packing or Import",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(d) read with Rule 6(1)(g) Proviso A"
        },
        "result": "FAIL",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Month and year of manufacture, pre-packing, or import is missing from the package in violation of Rule 6(1)(d).",
        "deviation": "Mandatory manufacturing or packaging date missing.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.95,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T18:26:54.279Z",
        "createdAt": "2026-09-08T18:26:54.279Z"
      },
      {
        "id": "fb806ee8-2983-41cf-b897-6ce963c8b52d",
        "inspectionId": "11111111-1111-4111-8111-111111111111",
        "ruleId": "GSR-202E-RULE-06-01-E",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(e)",
        "subRule": "1(e)",
        "ruleTitle": "Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 3,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Maximum Retail Price (MRP) is declared in statutory format inclusive of all taxes in compliance with Rule 6(1)(e) & Rule 2(m).",
        "observedValue": "MRP Rs. 240.00 (Incl. of all taxes)",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.99,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T18:26:54.279Z",
        "createdAt": "2026-09-08T18:26:54.279Z"
      },
      {
        "id": "c07144ba-d36a-4e8f-a409-ba1b39ef92f6",
        "inspectionId": "11111111-1111-4111-8111-111111111111",
        "ruleId": "GSR-202E-RULE-06-02",
        "ruleVersionId": "1",
        "ruleNumber": "6(2)",
        "subRule": "2",
        "ruleTitle": "Declaration of Consumer Care Contact Details for Complaints",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 7,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(2)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Consumer care contact details (telephone/email/address) are provided in accordance with Rule 6(2).",
        "observedValue": "Consumer Care Cell: 1800-11-2233 / care@herballabs.example.com",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.94,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T18:26:54.279Z",
        "createdAt": "2026-09-08T18:26:54.279Z"
      },
      {
        "id": "e6ee766f-d294-4724-931e-f38b2775dfc7",
        "inspectionId": "11111111-1111-4111-8111-111111111111",
        "ruleId": "GSR-202E-RULE-07-02-T1",
        "ruleVersionId": "1",
        "ruleNumber": "7(2)",
        "subRule": "2 (Table I)",
        "ruleTitle": "Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 8,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "scheduleNumber": "Table I",
          "clauseReference": "Rule 7(2) & Rule 7(3)"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: 4mm).",
        "expectedConstraint": ">= 4mm (Table I)",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.3,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T18:26:54.279Z",
        "createdAt": "2026-09-08T18:26:54.279Z"
      },
      {
        "id": "cdb101b9-75c2-43ea-ab55-413b1c64a111",
        "inspectionId": "11111111-1111-4111-8111-111111111111",
        "ruleId": "GSR-202E-RULE-18-02",
        "ruleVersionId": "1",
        "ruleNumber": "18(2)",
        "subRule": "2",
        "ruleTitle": "Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 16,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 18(2)"
        },
        "result": "NOT_APPLICABLE",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 1,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T18:26:54.279Z",
        "createdAt": "2026-09-08T18:26:54.279Z"
      }
    ],
    "complianceSummary": {
      "inspectionId": "11111111-1111-4111-8111-111111111111",
      "engineVersion": "1.0.0",
      "ruleBundleId": "LM-IN-RULES-2026.09",
      "ruleCountEvaluated": 8,
      "passCount": 5,
      "failCount": 1,
      "requiresVerificationCount": 0,
      "notApplicableCount": 1,
      "insufficientEvidenceCount": 1,
      "assessments": [
        {
          "id": "46aa81bd-175b-4db3-8966-83decfe47d96",
          "inspectionId": "11111111-1111-4111-8111-111111111111",
          "ruleId": "GSR-202E-RULE-06-01-A",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(a)",
          "subRule": "1(a)",
          "ruleTitle": "Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(a) & Rule 10(1)"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "Definite and conspicuous declaration of manufacturer/packer name and address is present in compliance with Rule 6(1)(a) and Rule 10(1).",
          "observedValue": "Manufactured by: Herbal Labs India Pvt Ltd, Industrial Area, Solan, HP - 173220",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.92,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T18:26:54.279Z",
          "createdAt": "2026-09-08T18:26:54.279Z"
        },
        {
          "id": "b22d346c-247f-40cc-9569-964118ccf6f1",
          "inspectionId": "11111111-1111-4111-8111-111111111111",
          "ruleId": "GSR-202E-RULE-06-01-B",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(b)",
          "subRule": "1(b)",
          "ruleTitle": "Declaration of Generic or Common Name of the Commodity",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(b)"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Generic or common name of the commodity is clearly declared in compliance with Rule 6(1)(b).",
          "observedValue": "Herbal Anti-Dandruff Shampoo",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.98,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T18:26:54.279Z",
          "createdAt": "2026-09-08T18:26:54.279Z"
        },
        {
          "id": "2a9613b7-36d8-4fda-86f9-df5c44bec06b",
          "inspectionId": "11111111-1111-4111-8111-111111111111",
          "ruleId": "GSR-202E-RULE-06-01-C",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(c)",
          "subRule": "1(c)",
          "ruleTitle": "Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 13,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(c) read with Rule 11, 12, 13"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "Net quantity is declared in standard SI units in compliance with Rule 6(1)(c) and Rule 13.",
          "observedValue": "Net Vol. 180 ml",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.95,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T18:26:54.279Z",
          "createdAt": "2026-09-08T18:26:54.279Z"
        },
        {
          "id": "dcf553ac-7112-4028-aea5-075814755df2",
          "inspectionId": "11111111-1111-4111-8111-111111111111",
          "ruleId": "GSR-202E-RULE-06-01-D",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(d)",
          "subRule": "1(d)",
          "ruleTitle": "Declaration of Month and Year of Manufacture, Pre-Packing or Import",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(d) read with Rule 6(1)(g) Proviso A"
          },
          "result": "FAIL",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Month and year of manufacture, pre-packing, or import is missing from the package in violation of Rule 6(1)(d).",
          "deviation": "Mandatory manufacturing or packaging date missing.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.95,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T18:26:54.279Z",
          "createdAt": "2026-09-08T18:26:54.279Z"
        },
        {
          "id": "fb806ee8-2983-41cf-b897-6ce963c8b52d",
          "inspectionId": "11111111-1111-4111-8111-111111111111",
          "ruleId": "GSR-202E-RULE-06-01-E",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(e)",
          "subRule": "1(e)",
          "ruleTitle": "Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 3,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "Maximum Retail Price (MRP) is declared in statutory format inclusive of all taxes in compliance with Rule 6(1)(e) & Rule 2(m).",
          "observedValue": "MRP Rs. 240.00 (Incl. of all taxes)",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.99,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T18:26:54.279Z",
          "createdAt": "2026-09-08T18:26:54.279Z"
        },
        {
          "id": "c07144ba-d36a-4e8f-a409-ba1b39ef92f6",
          "inspectionId": "11111111-1111-4111-8111-111111111111",
          "ruleId": "GSR-202E-RULE-06-02",
          "ruleVersionId": "1",
          "ruleNumber": "6(2)",
          "subRule": "2",
          "ruleTitle": "Declaration of Consumer Care Contact Details for Complaints",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 7,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(2)"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Consumer care contact details (telephone/email/address) are provided in accordance with Rule 6(2).",
          "observedValue": "Consumer Care Cell: 1800-11-2233 / care@herballabs.example.com",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.94,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T18:26:54.279Z",
          "createdAt": "2026-09-08T18:26:54.279Z"
        },
        {
          "id": "e6ee766f-d294-4724-931e-f38b2775dfc7",
          "inspectionId": "11111111-1111-4111-8111-111111111111",
          "ruleId": "GSR-202E-RULE-07-02-T1",
          "ruleVersionId": "1",
          "ruleNumber": "7(2)",
          "subRule": "2 (Table I)",
          "ruleTitle": "Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 8,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "scheduleNumber": "Table I",
            "clauseReference": "Rule 7(2) & Rule 7(3)"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: 4mm).",
          "expectedConstraint": ">= 4mm (Table I)",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.3,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T18:26:54.279Z",
          "createdAt": "2026-09-08T18:26:54.279Z"
        },
        {
          "id": "cdb101b9-75c2-43ea-ab55-413b1c64a111",
          "inspectionId": "11111111-1111-4111-8111-111111111111",
          "ruleId": "GSR-202E-RULE-18-02",
          "ruleVersionId": "1",
          "ruleNumber": "18(2)",
          "subRule": "2",
          "ruleTitle": "Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 16,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 18(2)"
          },
          "result": "NOT_APPLICABLE",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 1,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T18:26:54.279Z",
          "createdAt": "2026-09-08T18:26:54.279Z"
        }
      ],
      "overallStatus": "FAIL",
      "evaluatedAt": "2026-09-08T18:26:54.279Z"
    },
    "findings": [
      {
        "id": "dcf553ac-7112-4028-aea5-075814755df2",
        "ruleId": "GSR-202E-RULE-06-01-D",
        "title": "6(1)(d)(1(d)) - Declaration of Month and Year of Manufacture, Pre-Packing or Import",
        "description": "Month and year of manufacture, pre-packing, or import is missing from the package in violation of Rule 6(1)(d).",
        "status": "VIOLATION",
        "severity": "MAJOR"
      }
    ]
  },
  {
    "id": "SYNC-TEST-001",
    "createdAt": "2026-09-08T01:40:01.536Z",
    "updatedAt": "2026-09-08T01:40:24.305Z",
    "status": "DECIDED",
    "complianceResult": "PASS",
    "complianceScore": 100,
    "productName": "Instant Masala Noodles 70g",
    "brandName": "NoodleChef",
    "category": "COMMODITY",
    "packageType": "PACKAGE",
    "images": [],
    "declarations": [
      {
        "id": "dec-1",
        "field": "declarations.NET_QUANTITY",
        "declaredValue": "70 g",
        "standardizedValue": "70 g",
        "unit": "g",
        "status": "PRESENT",
        "boundingPolygons": [],
        "ruleReference": "GSR-202E-RULE-06-01-A"
      }
    ],
    "complianceAssessments": [
      {
        "id": "41bc8dcd-282b-49b4-ba75-1e2aa87ff516",
        "inspectionId": "SYNC-TEST-001",
        "ruleId": "GSR-202E-RULE-06-01-A",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(a)",
        "subRule": "1(a)",
        "ruleTitle": "Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(a) & Rule 10(1)"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Manufacturer or packer declaration could not be extracted due to poor image quality or blur. Re-take inspection image with clear lighting.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.2,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:40:01.545Z",
        "createdAt": "2026-09-08T01:40:01.545Z"
      },
      {
        "id": "6e84c96f-6d20-4461-830e-0095041cf1f3",
        "inspectionId": "SYNC-TEST-001",
        "ruleId": "GSR-202E-RULE-06-01-B",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(b)",
        "subRule": "1(b)",
        "ruleTitle": "Declaration of Generic or Common Name of the Commodity",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(b)"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Generic/common commodity name could not be extracted due to poor image quality or blur.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.2,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:40:01.545Z",
        "createdAt": "2026-09-08T01:40:01.545Z"
      },
      {
        "id": "d06cecb5-8873-4bc1-94fb-8dc2e0c006ff",
        "inspectionId": "SYNC-TEST-001",
        "ruleId": "GSR-202E-RULE-06-01-C",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(c)",
        "subRule": "1(c)",
        "ruleTitle": "Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 13,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(c) read with Rule 11, 12, 13"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Net quantity declaration could not be extracted due to poor image quality or blur.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.2,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:40:01.545Z",
        "createdAt": "2026-09-08T01:40:01.545Z"
      },
      {
        "id": "de34eeb1-d876-4337-8d3a-0e57773ddb07",
        "inspectionId": "SYNC-TEST-001",
        "ruleId": "GSR-202E-RULE-06-01-D",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(d)",
        "subRule": "1(d)",
        "ruleTitle": "Declaration of Month and Year of Manufacture, Pre-Packing or Import",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(d) read with Rule 6(1)(g) Proviso A"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Date of manufacture/packing could not be extracted due to poor image quality or blur.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.2,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:40:01.545Z",
        "createdAt": "2026-09-08T01:40:01.545Z"
      },
      {
        "id": "c3e60af1-f805-4a49-8d63-9360ee4da6da",
        "inspectionId": "SYNC-TEST-001",
        "ruleId": "GSR-202E-RULE-06-01-E",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(e)",
        "subRule": "1(e)",
        "ruleTitle": "Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 3,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Maximum Retail Price (MRP) could not be extracted due to poor image quality or blur.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.2,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:40:01.545Z",
        "createdAt": "2026-09-08T01:40:01.545Z"
      },
      {
        "id": "b281fe6d-d1fa-44e8-b465-d0e2aa512652",
        "inspectionId": "SYNC-TEST-001",
        "ruleId": "GSR-202E-RULE-06-02",
        "ruleVersionId": "1",
        "ruleNumber": "6(2)",
        "subRule": "2",
        "ruleTitle": "Declaration of Consumer Care Contact Details for Complaints",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 7,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(2)"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Consumer care details could not be extracted due to poor image quality or blur.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.2,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:40:01.545Z",
        "createdAt": "2026-09-08T01:40:01.545Z"
      },
      {
        "id": "58938313-2ab6-47dd-ba77-77aa2b77798f",
        "inspectionId": "SYNC-TEST-001",
        "ruleId": "GSR-202E-RULE-07-02-T1",
        "ruleVersionId": "1",
        "ruleNumber": "7(2)",
        "subRule": "2 (Table I)",
        "ruleTitle": "Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 8,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "scheduleNumber": "Table I",
          "clauseReference": "Rule 7(2) & Rule 7(3)"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: 1mm).",
        "expectedConstraint": ">= 1mm (Table I)",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.3,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:40:01.545Z",
        "createdAt": "2026-09-08T01:40:01.545Z"
      },
      {
        "id": "37395b92-fc88-4341-9a9f-b2fd9f35fafa",
        "inspectionId": "SYNC-TEST-001",
        "ruleId": "GSR-202E-RULE-18-02",
        "ruleVersionId": "1",
        "ruleNumber": "18(2)",
        "subRule": "2",
        "ruleTitle": "Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 16,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 18(2)"
        },
        "result": "NOT_APPLICABLE",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 1,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:40:01.545Z",
        "createdAt": "2026-09-08T01:40:01.545Z"
      }
    ],
    "complianceSummary": {
      "inspectionId": "SYNC-TEST-001",
      "engineVersion": "1.0.0",
      "ruleBundleId": "LM-IN-RULES-2026.09",
      "ruleCountEvaluated": 8,
      "passCount": 0,
      "failCount": 0,
      "requiresVerificationCount": 0,
      "notApplicableCount": 1,
      "insufficientEvidenceCount": 7,
      "assessments": [
        {
          "id": "41bc8dcd-282b-49b4-ba75-1e2aa87ff516",
          "inspectionId": "SYNC-TEST-001",
          "ruleId": "GSR-202E-RULE-06-01-A",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(a)",
          "subRule": "1(a)",
          "ruleTitle": "Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(a) & Rule 10(1)"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "Manufacturer or packer declaration could not be extracted due to poor image quality or blur. Re-take inspection image with clear lighting.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.2,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:40:01.545Z",
          "createdAt": "2026-09-08T01:40:01.545Z"
        },
        {
          "id": "6e84c96f-6d20-4461-830e-0095041cf1f3",
          "inspectionId": "SYNC-TEST-001",
          "ruleId": "GSR-202E-RULE-06-01-B",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(b)",
          "subRule": "1(b)",
          "ruleTitle": "Declaration of Generic or Common Name of the Commodity",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(b)"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Generic/common commodity name could not be extracted due to poor image quality or blur.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.2,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:40:01.545Z",
          "createdAt": "2026-09-08T01:40:01.545Z"
        },
        {
          "id": "d06cecb5-8873-4bc1-94fb-8dc2e0c006ff",
          "inspectionId": "SYNC-TEST-001",
          "ruleId": "GSR-202E-RULE-06-01-C",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(c)",
          "subRule": "1(c)",
          "ruleTitle": "Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 13,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(c) read with Rule 11, 12, 13"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "Net quantity declaration could not be extracted due to poor image quality or blur.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.2,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:40:01.545Z",
          "createdAt": "2026-09-08T01:40:01.545Z"
        },
        {
          "id": "de34eeb1-d876-4337-8d3a-0e57773ddb07",
          "inspectionId": "SYNC-TEST-001",
          "ruleId": "GSR-202E-RULE-06-01-D",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(d)",
          "subRule": "1(d)",
          "ruleTitle": "Declaration of Month and Year of Manufacture, Pre-Packing or Import",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(d) read with Rule 6(1)(g) Proviso A"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Date of manufacture/packing could not be extracted due to poor image quality or blur.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.2,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:40:01.545Z",
          "createdAt": "2026-09-08T01:40:01.545Z"
        },
        {
          "id": "c3e60af1-f805-4a49-8d63-9360ee4da6da",
          "inspectionId": "SYNC-TEST-001",
          "ruleId": "GSR-202E-RULE-06-01-E",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(e)",
          "subRule": "1(e)",
          "ruleTitle": "Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 3,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "Maximum Retail Price (MRP) could not be extracted due to poor image quality or blur.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.2,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:40:01.545Z",
          "createdAt": "2026-09-08T01:40:01.545Z"
        },
        {
          "id": "b281fe6d-d1fa-44e8-b465-d0e2aa512652",
          "inspectionId": "SYNC-TEST-001",
          "ruleId": "GSR-202E-RULE-06-02",
          "ruleVersionId": "1",
          "ruleNumber": "6(2)",
          "subRule": "2",
          "ruleTitle": "Declaration of Consumer Care Contact Details for Complaints",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 7,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(2)"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Consumer care details could not be extracted due to poor image quality or blur.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.2,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:40:01.545Z",
          "createdAt": "2026-09-08T01:40:01.545Z"
        },
        {
          "id": "58938313-2ab6-47dd-ba77-77aa2b77798f",
          "inspectionId": "SYNC-TEST-001",
          "ruleId": "GSR-202E-RULE-07-02-T1",
          "ruleVersionId": "1",
          "ruleNumber": "7(2)",
          "subRule": "2 (Table I)",
          "ruleTitle": "Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 8,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "scheduleNumber": "Table I",
            "clauseReference": "Rule 7(2) & Rule 7(3)"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: 1mm).",
          "expectedConstraint": ">= 1mm (Table I)",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.3,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:40:01.545Z",
          "createdAt": "2026-09-08T01:40:01.545Z"
        },
        {
          "id": "37395b92-fc88-4341-9a9f-b2fd9f35fafa",
          "inspectionId": "SYNC-TEST-001",
          "ruleId": "GSR-202E-RULE-18-02",
          "ruleVersionId": "1",
          "ruleNumber": "18(2)",
          "subRule": "2",
          "ruleTitle": "Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 16,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 18(2)"
          },
          "result": "NOT_APPLICABLE",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 1,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:40:01.545Z",
          "createdAt": "2026-09-08T01:40:01.545Z"
        }
      ],
      "overallStatus": "INSUFFICIENT_EVIDENCE",
      "evaluatedAt": "2026-09-08T01:40:01.545Z"
    },
    "findings": [],
    "decision": {
      "decision": "NON_COMPLIANT",
      "comments": "Missing consumer care address",
      "decidedAt": "2026-09-08T01:40:24.296Z"
    }
  },
  {
    "id": "test-sync-1788832099277",
    "createdAt": "2026-09-08T01:48:19.277Z",
    "updatedAt": "2026-09-08T01:54:31.676Z",
    "status": "ANALYZED",
    "complianceResult": "REQUIRES_VERIFICATION",
    "complianceScore": 67,
    "productName": "Organic Green Tea 100g",
    "brandName": "TeaLeaf Co.",
    "category": "COMMODITY",
    "packageType": "PACKAGE",
    "images": [],
    "declarations": [
      {
        "type": "GENERIC_NAME",
        "rawText": "Organic Green Tea",
        "confidence": 0.95,
        "surface": "FRONT"
      },
      {
        "type": "NET_QUANTITY",
        "rawText": "100g",
        "normalizedValue": 100,
        "unit": "g",
        "confidence": 0.92,
        "surface": "FRONT"
      },
      {
        "type": "MRP",
        "rawText": "Rs. 299",
        "normalizedValue": 299,
        "unit": "INR",
        "confidence": 0.88,
        "surface": "FRONT"
      }
    ],
    "complianceAssessments": [
      {
        "id": "08133b3b-e36f-4c49-9b52-221904d26fe4",
        "inspectionId": "test-sync-1788832099277",
        "ruleId": "GSR-202E-RULE-06-01-A",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(a)",
        "subRule": "1(a)",
        "ruleTitle": "Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(a) & Rule 10(1)"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Manufacturer or packer declaration could not be extracted due to poor image quality or blur. Re-take inspection image with clear lighting.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.2,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:48:19.387Z",
        "createdAt": "2026-09-08T01:48:19.387Z"
      },
      {
        "id": "4c6c7dbd-547a-4530-8986-77729ce76105",
        "inspectionId": "test-sync-1788832099277",
        "ruleId": "GSR-202E-RULE-06-01-B",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(b)",
        "subRule": "1(b)",
        "ruleTitle": "Declaration of Generic or Common Name of the Commodity",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(b)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Generic or common name of the commodity is clearly declared in compliance with Rule 6(1)(b).",
        "observedValue": "Organic Green Tea",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.95,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:48:19.387Z",
        "createdAt": "2026-09-08T01:48:19.387Z"
      },
      {
        "id": "908a78a3-7b9e-4224-8e4a-6515b695b2d1",
        "inspectionId": "test-sync-1788832099277",
        "ruleId": "GSR-202E-RULE-06-01-C",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(c)",
        "subRule": "1(c)",
        "ruleTitle": "Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 13,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(c) read with Rule 11, 12, 13"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Net quantity is declared in standard SI units in compliance with Rule 6(1)(c) and Rule 13.",
        "observedValue": "100g",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.92,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:48:19.387Z",
        "createdAt": "2026-09-08T01:48:19.387Z"
      },
      {
        "id": "7eee3465-8b7b-4fa6-9e1f-ae999d790570",
        "inspectionId": "test-sync-1788832099277",
        "ruleId": "GSR-202E-RULE-06-01-D",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(d)",
        "subRule": "1(d)",
        "ruleTitle": "Declaration of Month and Year of Manufacture, Pre-Packing or Import",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(d) read with Rule 6(1)(g) Proviso A"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Date of manufacture/packing could not be extracted due to poor image quality or blur.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.2,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:48:19.387Z",
        "createdAt": "2026-09-08T01:48:19.387Z"
      },
      {
        "id": "5fa7b070-63e8-40a0-8f96-0c2069ffc9b2",
        "inspectionId": "test-sync-1788832099277",
        "ruleId": "GSR-202E-RULE-06-01-E",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(e)",
        "subRule": "1(e)",
        "ruleTitle": "Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 3,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)"
        },
        "result": "REQUIRES_VERIFICATION",
        "evidenceSufficiency": "LOW_CONFIDENCE",
        "severity": "CRITICAL",
        "explanation": "MRP declared with numeric value but mandatory phrase \"inclusive of all taxes\" is not clearly confirmed on label.",
        "observedValue": "Rs. 299",
        "expectedConstraint": "MRP Rs ... inclusive of all taxes (Rule 2(m))",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.88,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:48:19.387Z",
        "createdAt": "2026-09-08T01:48:19.387Z"
      },
      {
        "id": "5dc21023-d700-4ab8-a17d-ba306e538e6f",
        "inspectionId": "test-sync-1788832099277",
        "ruleId": "GSR-202E-RULE-06-02",
        "ruleVersionId": "1",
        "ruleNumber": "6(2)",
        "subRule": "2",
        "ruleTitle": "Declaration of Consumer Care Contact Details for Complaints",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 7,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(2)"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Consumer care details could not be extracted due to poor image quality or blur.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.2,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:48:19.387Z",
        "createdAt": "2026-09-08T01:48:19.387Z"
      },
      {
        "id": "58159300-d181-40b0-9307-9b05a739b6d6",
        "inspectionId": "test-sync-1788832099277",
        "ruleId": "GSR-202E-RULE-07-02-T1",
        "ruleVersionId": "1",
        "ruleNumber": "7(2)",
        "subRule": "2 (Table I)",
        "ruleTitle": "Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 8,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "scheduleNumber": "Table I",
          "clauseReference": "Rule 7(2) & Rule 7(3)"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: 1mm).",
        "expectedConstraint": ">= 1mm (Table I)",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.3,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:48:19.387Z",
        "createdAt": "2026-09-08T01:48:19.387Z"
      },
      {
        "id": "741db4b7-61ad-4759-a1af-d1f7c5655f8d",
        "inspectionId": "test-sync-1788832099277",
        "ruleId": "GSR-202E-RULE-18-02",
        "ruleVersionId": "1",
        "ruleNumber": "18(2)",
        "subRule": "2",
        "ruleTitle": "Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 16,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 18(2)"
        },
        "result": "NOT_APPLICABLE",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 1,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:48:19.387Z",
        "createdAt": "2026-09-08T01:48:19.387Z"
      }
    ],
    "complianceSummary": {
      "inspectionId": "test-sync-1788832099277",
      "engineVersion": "1.0.0",
      "ruleBundleId": "LM-IN-RULES-2026.09",
      "ruleCountEvaluated": 8,
      "passCount": 2,
      "failCount": 0,
      "requiresVerificationCount": 1,
      "notApplicableCount": 1,
      "insufficientEvidenceCount": 4,
      "assessments": [
        {
          "id": "08133b3b-e36f-4c49-9b52-221904d26fe4",
          "inspectionId": "test-sync-1788832099277",
          "ruleId": "GSR-202E-RULE-06-01-A",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(a)",
          "subRule": "1(a)",
          "ruleTitle": "Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(a) & Rule 10(1)"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "Manufacturer or packer declaration could not be extracted due to poor image quality or blur. Re-take inspection image with clear lighting.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.2,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:48:19.387Z",
          "createdAt": "2026-09-08T01:48:19.387Z"
        },
        {
          "id": "4c6c7dbd-547a-4530-8986-77729ce76105",
          "inspectionId": "test-sync-1788832099277",
          "ruleId": "GSR-202E-RULE-06-01-B",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(b)",
          "subRule": "1(b)",
          "ruleTitle": "Declaration of Generic or Common Name of the Commodity",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(b)"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Generic or common name of the commodity is clearly declared in compliance with Rule 6(1)(b).",
          "observedValue": "Organic Green Tea",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.95,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:48:19.387Z",
          "createdAt": "2026-09-08T01:48:19.387Z"
        },
        {
          "id": "908a78a3-7b9e-4224-8e4a-6515b695b2d1",
          "inspectionId": "test-sync-1788832099277",
          "ruleId": "GSR-202E-RULE-06-01-C",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(c)",
          "subRule": "1(c)",
          "ruleTitle": "Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 13,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(c) read with Rule 11, 12, 13"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "Net quantity is declared in standard SI units in compliance with Rule 6(1)(c) and Rule 13.",
          "observedValue": "100g",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.92,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:48:19.387Z",
          "createdAt": "2026-09-08T01:48:19.387Z"
        },
        {
          "id": "7eee3465-8b7b-4fa6-9e1f-ae999d790570",
          "inspectionId": "test-sync-1788832099277",
          "ruleId": "GSR-202E-RULE-06-01-D",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(d)",
          "subRule": "1(d)",
          "ruleTitle": "Declaration of Month and Year of Manufacture, Pre-Packing or Import",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(d) read with Rule 6(1)(g) Proviso A"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Date of manufacture/packing could not be extracted due to poor image quality or blur.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.2,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:48:19.387Z",
          "createdAt": "2026-09-08T01:48:19.387Z"
        },
        {
          "id": "5fa7b070-63e8-40a0-8f96-0c2069ffc9b2",
          "inspectionId": "test-sync-1788832099277",
          "ruleId": "GSR-202E-RULE-06-01-E",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(e)",
          "subRule": "1(e)",
          "ruleTitle": "Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 3,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)"
          },
          "result": "REQUIRES_VERIFICATION",
          "evidenceSufficiency": "LOW_CONFIDENCE",
          "severity": "CRITICAL",
          "explanation": "MRP declared with numeric value but mandatory phrase \"inclusive of all taxes\" is not clearly confirmed on label.",
          "observedValue": "Rs. 299",
          "expectedConstraint": "MRP Rs ... inclusive of all taxes (Rule 2(m))",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.88,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:48:19.387Z",
          "createdAt": "2026-09-08T01:48:19.387Z"
        },
        {
          "id": "5dc21023-d700-4ab8-a17d-ba306e538e6f",
          "inspectionId": "test-sync-1788832099277",
          "ruleId": "GSR-202E-RULE-06-02",
          "ruleVersionId": "1",
          "ruleNumber": "6(2)",
          "subRule": "2",
          "ruleTitle": "Declaration of Consumer Care Contact Details for Complaints",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 7,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(2)"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Consumer care details could not be extracted due to poor image quality or blur.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.2,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:48:19.387Z",
          "createdAt": "2026-09-08T01:48:19.387Z"
        },
        {
          "id": "58159300-d181-40b0-9307-9b05a739b6d6",
          "inspectionId": "test-sync-1788832099277",
          "ruleId": "GSR-202E-RULE-07-02-T1",
          "ruleVersionId": "1",
          "ruleNumber": "7(2)",
          "subRule": "2 (Table I)",
          "ruleTitle": "Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 8,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "scheduleNumber": "Table I",
            "clauseReference": "Rule 7(2) & Rule 7(3)"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: 1mm).",
          "expectedConstraint": ">= 1mm (Table I)",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.3,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:48:19.387Z",
          "createdAt": "2026-09-08T01:48:19.387Z"
        },
        {
          "id": "741db4b7-61ad-4759-a1af-d1f7c5655f8d",
          "inspectionId": "test-sync-1788832099277",
          "ruleId": "GSR-202E-RULE-18-02",
          "ruleVersionId": "1",
          "ruleNumber": "18(2)",
          "subRule": "2",
          "ruleTitle": "Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 16,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 18(2)"
          },
          "result": "NOT_APPLICABLE",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 1,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:48:19.387Z",
          "createdAt": "2026-09-08T01:48:19.387Z"
        }
      ],
      "overallStatus": "REQUIRES_VERIFICATION",
      "evaluatedAt": "2026-09-08T01:48:19.387Z"
    },
    "findings": [
      {
        "id": "5fa7b070-63e8-40a0-8f96-0c2069ffc9b2",
        "ruleId": "GSR-202E-RULE-06-01-E",
        "title": "6(1)(e)(1(e)) - Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
        "description": "MRP declared with numeric value but mandatory phrase \"inclusive of all taxes\" is not clearly confirmed on label.",
        "status": "MANUAL_REVIEW",
        "severity": "CRITICAL"
      }
    ],
    "report": {
      "reportNumber": "LM-REP-2026-TEST1234",
      "contentHash": "f0f51f9a967a3d202438f8c838e0c197a364aa9723bcd27ea1de38a891337bf0",
      "reportHash": "80dcffd3da7d8f0960776263d7db0bb2e86afd979c762feac9a291d905fee478",
      "hasPdf": true,
      "generatedAt": "2026-09-08T01:54:31.444Z",
      "isDraftPreview": true
    }
  },
  {
    "id": "live-sync-test-1788832191262",
    "createdAt": "2026-09-08T01:49:51.263Z",
    "updatedAt": "2026-09-08T01:49:51.371Z",
    "status": "ANALYZED",
    "complianceResult": "REQUIRES_VERIFICATION",
    "complianceScore": 75,
    "productName": "Basmati Rice 5kg",
    "brandName": "India Gate",
    "category": "COMMODITY",
    "packageType": "PACKAGE",
    "images": [],
    "declarations": [
      {
        "type": "GENERIC_NAME",
        "rawText": "Basmati Rice",
        "confidence": 0.95
      },
      {
        "type": "NET_QUANTITY",
        "rawText": "5 kg",
        "normalizedValue": 5000,
        "unit": "g",
        "confidence": 0.92
      },
      {
        "type": "MRP",
        "rawText": "Rs. 899/-",
        "normalizedValue": 899,
        "unit": "INR",
        "confidence": 0.88
      },
      {
        "type": "MANUFACTURER_NAME_ADDRESS",
        "rawText": "India Gate Foods Ltd, Delhi",
        "confidence": 0.9
      }
    ],
    "complianceAssessments": [
      {
        "id": "345abf83-eb52-4885-ac22-61faae239273",
        "inspectionId": "live-sync-test-1788832191262",
        "ruleId": "GSR-202E-RULE-06-01-A",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(a)",
        "subRule": "1(a)",
        "ruleTitle": "Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(a) & Rule 10(1)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Definite and conspicuous declaration of manufacturer/packer name and address is present in compliance with Rule 6(1)(a) and Rule 10(1).",
        "observedValue": "India Gate Foods Ltd, Delhi",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.9,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:49:51.373Z",
        "createdAt": "2026-09-08T01:49:51.373Z"
      },
      {
        "id": "fad82d5c-58c8-44c1-95ab-ea44e5f9778e",
        "inspectionId": "live-sync-test-1788832191262",
        "ruleId": "GSR-202E-RULE-06-01-B",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(b)",
        "subRule": "1(b)",
        "ruleTitle": "Declaration of Generic or Common Name of the Commodity",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(b)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Generic or common name of the commodity is clearly declared in compliance with Rule 6(1)(b).",
        "observedValue": "Basmati Rice",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.95,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:49:51.373Z",
        "createdAt": "2026-09-08T01:49:51.373Z"
      },
      {
        "id": "7c1be924-520f-4391-bcb7-f70573854699",
        "inspectionId": "live-sync-test-1788832191262",
        "ruleId": "GSR-202E-RULE-06-01-C",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(c)",
        "subRule": "1(c)",
        "ruleTitle": "Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 13,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(c) read with Rule 11, 12, 13"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Net quantity is declared in standard SI units in compliance with Rule 6(1)(c) and Rule 13.",
        "observedValue": "5 kg",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.92,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:49:51.373Z",
        "createdAt": "2026-09-08T01:49:51.373Z"
      },
      {
        "id": "68759a6a-5938-4593-aff9-6191e4424a94",
        "inspectionId": "live-sync-test-1788832191262",
        "ruleId": "GSR-202E-RULE-06-01-D",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(d)",
        "subRule": "1(d)",
        "ruleTitle": "Declaration of Month and Year of Manufacture, Pre-Packing or Import",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(d) read with Rule 6(1)(g) Proviso A"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Date of manufacture/packing could not be extracted due to poor image quality or blur.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.2,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:49:51.373Z",
        "createdAt": "2026-09-08T01:49:51.373Z"
      },
      {
        "id": "4a014896-7986-4a70-b8de-db41b44f349f",
        "inspectionId": "live-sync-test-1788832191262",
        "ruleId": "GSR-202E-RULE-06-01-E",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(e)",
        "subRule": "1(e)",
        "ruleTitle": "Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 3,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)"
        },
        "result": "REQUIRES_VERIFICATION",
        "evidenceSufficiency": "LOW_CONFIDENCE",
        "severity": "CRITICAL",
        "explanation": "MRP declared with numeric value but mandatory phrase \"inclusive of all taxes\" is not clearly confirmed on label.",
        "observedValue": "Rs. 899/-",
        "expectedConstraint": "MRP Rs ... inclusive of all taxes (Rule 2(m))",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.88,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:49:51.373Z",
        "createdAt": "2026-09-08T01:49:51.373Z"
      },
      {
        "id": "f59c310d-6954-4e89-8a11-0735f5cf24bb",
        "inspectionId": "live-sync-test-1788832191262",
        "ruleId": "GSR-202E-RULE-06-02",
        "ruleVersionId": "1",
        "ruleNumber": "6(2)",
        "subRule": "2",
        "ruleTitle": "Declaration of Consumer Care Contact Details for Complaints",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 7,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(2)"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Consumer care details could not be extracted due to poor image quality or blur.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.2,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:49:51.373Z",
        "createdAt": "2026-09-08T01:49:51.373Z"
      },
      {
        "id": "070d374e-3c84-4816-a5ec-c3fcf76b3d5e",
        "inspectionId": "live-sync-test-1788832191262",
        "ruleId": "GSR-202E-RULE-07-02-T1",
        "ruleVersionId": "1",
        "ruleNumber": "7(2)",
        "subRule": "2 (Table I)",
        "ruleTitle": "Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 8,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "scheduleNumber": "Table I",
          "clauseReference": "Rule 7(2) & Rule 7(3)"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: 4mm).",
        "expectedConstraint": ">= 4mm (Table I)",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.3,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:49:51.373Z",
        "createdAt": "2026-09-08T01:49:51.373Z"
      },
      {
        "id": "9db63ccd-1116-4365-ab63-7a9817feea46",
        "inspectionId": "live-sync-test-1788832191262",
        "ruleId": "GSR-202E-RULE-18-02",
        "ruleVersionId": "1",
        "ruleNumber": "18(2)",
        "subRule": "2",
        "ruleTitle": "Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 16,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 18(2)"
        },
        "result": "NOT_APPLICABLE",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 1,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:49:51.373Z",
        "createdAt": "2026-09-08T01:49:51.373Z"
      }
    ],
    "complianceSummary": {
      "inspectionId": "live-sync-test-1788832191262",
      "engineVersion": "1.0.0",
      "ruleBundleId": "LM-IN-RULES-2026.09",
      "ruleCountEvaluated": 8,
      "passCount": 3,
      "failCount": 0,
      "requiresVerificationCount": 1,
      "notApplicableCount": 1,
      "insufficientEvidenceCount": 3,
      "assessments": [
        {
          "id": "345abf83-eb52-4885-ac22-61faae239273",
          "inspectionId": "live-sync-test-1788832191262",
          "ruleId": "GSR-202E-RULE-06-01-A",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(a)",
          "subRule": "1(a)",
          "ruleTitle": "Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(a) & Rule 10(1)"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "Definite and conspicuous declaration of manufacturer/packer name and address is present in compliance with Rule 6(1)(a) and Rule 10(1).",
          "observedValue": "India Gate Foods Ltd, Delhi",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.9,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:49:51.373Z",
          "createdAt": "2026-09-08T01:49:51.373Z"
        },
        {
          "id": "fad82d5c-58c8-44c1-95ab-ea44e5f9778e",
          "inspectionId": "live-sync-test-1788832191262",
          "ruleId": "GSR-202E-RULE-06-01-B",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(b)",
          "subRule": "1(b)",
          "ruleTitle": "Declaration of Generic or Common Name of the Commodity",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(b)"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Generic or common name of the commodity is clearly declared in compliance with Rule 6(1)(b).",
          "observedValue": "Basmati Rice",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.95,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:49:51.373Z",
          "createdAt": "2026-09-08T01:49:51.373Z"
        },
        {
          "id": "7c1be924-520f-4391-bcb7-f70573854699",
          "inspectionId": "live-sync-test-1788832191262",
          "ruleId": "GSR-202E-RULE-06-01-C",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(c)",
          "subRule": "1(c)",
          "ruleTitle": "Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 13,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(c) read with Rule 11, 12, 13"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "Net quantity is declared in standard SI units in compliance with Rule 6(1)(c) and Rule 13.",
          "observedValue": "5 kg",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.92,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:49:51.373Z",
          "createdAt": "2026-09-08T01:49:51.373Z"
        },
        {
          "id": "68759a6a-5938-4593-aff9-6191e4424a94",
          "inspectionId": "live-sync-test-1788832191262",
          "ruleId": "GSR-202E-RULE-06-01-D",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(d)",
          "subRule": "1(d)",
          "ruleTitle": "Declaration of Month and Year of Manufacture, Pre-Packing or Import",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(d) read with Rule 6(1)(g) Proviso A"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Date of manufacture/packing could not be extracted due to poor image quality or blur.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.2,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:49:51.373Z",
          "createdAt": "2026-09-08T01:49:51.373Z"
        },
        {
          "id": "4a014896-7986-4a70-b8de-db41b44f349f",
          "inspectionId": "live-sync-test-1788832191262",
          "ruleId": "GSR-202E-RULE-06-01-E",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(e)",
          "subRule": "1(e)",
          "ruleTitle": "Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 3,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)"
          },
          "result": "REQUIRES_VERIFICATION",
          "evidenceSufficiency": "LOW_CONFIDENCE",
          "severity": "CRITICAL",
          "explanation": "MRP declared with numeric value but mandatory phrase \"inclusive of all taxes\" is not clearly confirmed on label.",
          "observedValue": "Rs. 899/-",
          "expectedConstraint": "MRP Rs ... inclusive of all taxes (Rule 2(m))",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.88,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:49:51.373Z",
          "createdAt": "2026-09-08T01:49:51.373Z"
        },
        {
          "id": "f59c310d-6954-4e89-8a11-0735f5cf24bb",
          "inspectionId": "live-sync-test-1788832191262",
          "ruleId": "GSR-202E-RULE-06-02",
          "ruleVersionId": "1",
          "ruleNumber": "6(2)",
          "subRule": "2",
          "ruleTitle": "Declaration of Consumer Care Contact Details for Complaints",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 7,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(2)"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Consumer care details could not be extracted due to poor image quality or blur.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.2,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:49:51.373Z",
          "createdAt": "2026-09-08T01:49:51.373Z"
        },
        {
          "id": "070d374e-3c84-4816-a5ec-c3fcf76b3d5e",
          "inspectionId": "live-sync-test-1788832191262",
          "ruleId": "GSR-202E-RULE-07-02-T1",
          "ruleVersionId": "1",
          "ruleNumber": "7(2)",
          "subRule": "2 (Table I)",
          "ruleTitle": "Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 8,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "scheduleNumber": "Table I",
            "clauseReference": "Rule 7(2) & Rule 7(3)"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: 4mm).",
          "expectedConstraint": ">= 4mm (Table I)",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.3,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:49:51.373Z",
          "createdAt": "2026-09-08T01:49:51.373Z"
        },
        {
          "id": "9db63ccd-1116-4365-ab63-7a9817feea46",
          "inspectionId": "live-sync-test-1788832191262",
          "ruleId": "GSR-202E-RULE-18-02",
          "ruleVersionId": "1",
          "ruleNumber": "18(2)",
          "subRule": "2",
          "ruleTitle": "Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 16,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 18(2)"
          },
          "result": "NOT_APPLICABLE",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 1,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T01:49:51.373Z",
          "createdAt": "2026-09-08T01:49:51.373Z"
        }
      ],
      "overallStatus": "REQUIRES_VERIFICATION",
      "evaluatedAt": "2026-09-08T01:49:51.373Z"
    },
    "findings": [
      {
        "id": "4a014896-7986-4a70-b8de-db41b44f349f",
        "ruleId": "GSR-202E-RULE-06-01-E",
        "title": "6(1)(e)(1(e)) - Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
        "description": "MRP declared with numeric value but mandatory phrase \"inclusive of all taxes\" is not clearly confirmed on label.",
        "status": "MANUAL_REVIEW",
        "severity": "CRITICAL"
      }
    ]
  },
  {
    "id": "012cd8fb-3e9f-4489-8c9b-e50795af122c",
    "createdAt": "2026-09-08T02:02:53.359Z",
    "updatedAt": "2026-09-08T02:02:53.359Z",
    "status": "DECIDED",
    "complianceResult": "PASS",
    "complianceScore": 100,
    "productName": "ULTRA MATTE FINISH SUNSCREEN",
    "brandName": "Brand Not Declared",
    "category": "PHARMACEUTICAL_HEALTHCARE",
    "packageType": "BOTTLE",
    "images": [],
    "declarations": [
      {
        "type": "CONSUMER_CARE_DETAILS",
        "rawText": "Email: care@renonlife.com or Call at: +91-8295160579",
        "normalizedValue": "care@renonlife.com / +91-8295160579",
        "unit": null,
        "confidence": 0.97,
        "region": {
          "id": "2128a13a-e88a-4049-8007-64884e1c1f7f",
          "imageId": "07f3bcb5-ec16-47a3-a6b0-838471fadd10",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.326,
            "yMin": 0.599,
            "xMax": 0.513,
            "yMax": 0.612,
            "unit": "NORMALIZED"
          },
          "text": "Email: care@renonlife.com or Call at: +91-8295160579",
          "confidence": 0.97
        },
        "detectedLanguage": "en"
      },
      {
        "type": "COUNTRY_OF_ORIGIN",
        "rawText": "INDIA",
        "normalizedValue": "INDIA",
        "unit": null,
        "confidence": 0.99,
        "region": {
          "id": "869dd2d9-ac09-47e8-a37f-0f408fa817c4",
          "imageId": "07f3bcb5-ec16-47a3-a6b0-838471fadd10",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.482,
            "yMin": 0.536,
            "xMax": 0.507,
            "yMax": 0.544,
            "unit": "NORMALIZED"
          },
          "text": "INDIA",
          "confidence": 0.99
        },
        "detectedLanguage": "en"
      },
      {
        "type": "EXPIRY_DATE_BEST_BEFORE",
        "rawText": "Exp.Date : Best before 24 months from Mfg. Date",
        "normalizedValue": "24 months from Mfg. Date",
        "unit": null,
        "confidence": 0.96,
        "region": {
          "id": "b876b545-80fb-40d1-84bb-50a1884f2543",
          "imageId": "07f3bcb5-ec16-47a3-a6b0-838471fadd10",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.326,
            "yMin": 0.488,
            "xMax": 0.524,
            "yMax": 0.502,
            "unit": "NORMALIZED"
          },
          "text": "Exp.Date : Best before 24 months from Mfg. Date",
          "confidence": 0.96
        },
        "detectedLanguage": "en"
      },
      {
        "type": "GENERIC_NAME",
        "rawText": "ULTRA MATTE FINISH SUNSCREEN",
        "normalizedValue": "ULTRA MATTE FINISH SUNSCREEN",
        "unit": null,
        "confidence": 0.98,
        "region": {
          "id": "80a1da88-3cce-43c4-b038-31b5581530e2",
          "imageId": "fcda8ff0-e998-4710-b48b-37269ac59cd0",
          "surface": "FRONT",
          "boundingBox": {
            "xMin": 0.365,
            "yMin": 0.351,
            "xMax": 0.576,
            "yMax": 0.388,
            "unit": "NORMALIZED"
          },
          "text": "ULTRA MATTE FINISH SUNSCREEN",
          "confidence": 0.98
        },
        "detectedLanguage": "en"
      },
      {
        "type": "MANUFACTURER_NAME_ADDRESS",
        "rawText": "MANUFACTURED BY: HCP WELLNESS PVT.LTD. plot no.- 8, Ozone Industrial Park,Bavla-Bagodara Highway, Bhayla, Ahmedabad -382220, Gujrat, INDIA.",
        "normalizedValue": "HCP WELLNESS PVT.LTD., plot no.- 8, Ozone Industrial Park, Bavla-Bagodara Highway, Bhayla, Ahmedabad - 382220, Gujrat, INDIA",
        "unit": null,
        "confidence": 0.97,
        "region": {
          "id": "1a89f925-38d8-4bda-a044-0c20009e18f2",
          "imageId": "07f3bcb5-ec16-47a3-a6b0-838471fadd10",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.318,
            "yMin": 0.521,
            "xMax": 0.568,
            "yMax": 0.551,
            "unit": "NORMALIZED"
          },
          "text": "MANUFACTURED BY: HCP WELLNESS PVT.LTD. plot no.- 8, Ozone Industrial Park,Bavla-Bagodara Highway, Bhayla, Ahmedabad -382220, Gujrat, INDIA.",
          "confidence": 0.97
        },
        "detectedLanguage": "en"
      },
      {
        "type": "MRP",
        "rawText": "MRP : 599.00",
        "normalizedValue": "599.00",
        "unit": "INR",
        "confidence": 0.98,
        "region": {
          "id": "57cf0c97-bdb0-4cf1-b622-7b23fe31d4f9",
          "imageId": "07f3bcb5-ec16-47a3-a6b0-838471fadd10",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.327,
            "yMin": 0.435,
            "xMax": 0.428,
            "yMax": 0.448,
            "unit": "NORMALIZED"
          },
          "text": "MRP : 599.00",
          "confidence": 0.98
        },
        "detectedLanguage": "en"
      },
      {
        "type": "NET_QUANTITY",
        "rawText": "50 gm",
        "normalizedValue": "50",
        "unit": "g",
        "confidence": 0.99,
        "region": {
          "id": "1c6af4d5-d612-474a-9b0c-c500162beb5d",
          "imageId": "fcda8ff0-e998-4710-b48b-37269ac59cd0",
          "surface": "FRONT",
          "boundingBox": {
            "xMin": 0.461,
            "yMin": 0.718,
            "xMax": 0.528,
            "yMax": 0.732,
            "unit": "NORMALIZED"
          },
          "text": "50 gm",
          "confidence": 0.99
        },
        "detectedLanguage": "en"
      },
      {
        "type": "NET_QUANTITY",
        "rawText": "Net wt. : 50 gm / 1.8 oz",
        "normalizedValue": "50",
        "unit": "g",
        "confidence": 0.98,
        "region": {
          "id": "d814a953-ce4a-4971-8e2f-006f14e6cc22",
          "imageId": "07f3bcb5-ec16-47a3-a6b0-838471fadd10",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.326,
            "yMin": 0.482,
            "xMax": 0.442,
            "yMax": 0.494,
            "unit": "NORMALIZED"
          },
          "text": "Net wt. : 50 gm / 1.8 oz",
          "confidence": 0.98
        },
        "detectedLanguage": "en"
      },
      {
        "type": "PACKER_NAME_ADDRESS",
        "rawText": "MARKETED BY: BeyondKart 84-A, HUDA Sector 24, Panipat,132103",
        "normalizedValue": "BeyondKart, 84-A, HUDA Sector 24, Panipat, 132103",
        "unit": null,
        "confidence": 0.96,
        "region": {
          "id": "4254bfc6-b488-4066-92c1-9d93932405de",
          "imageId": "07f3bcb5-ec16-47a3-a6b0-838471fadd10",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.324,
            "yMin": 0.576,
            "xMax": 0.459,
            "yMax": 0.596,
            "unit": "NORMALIZED"
          },
          "text": "MARKETED BY: BeyondKart 84-A, HUDA Sector 24, Panipat,132103",
          "confidence": 0.96
        },
        "detectedLanguage": "en"
      },
      {
        "type": "UNIT_SALE_PRICE",
        "rawText": "USP : 11.98/g",
        "normalizedValue": "11.98",
        "unit": "g",
        "confidence": 0.97,
        "region": {
          "id": "06860d14-ecca-4822-83e3-70af528f7f05",
          "imageId": "07f3bcb5-ec16-47a3-a6b0-838471fadd10",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.328,
            "yMin": 0.451,
            "xMax": 0.426,
            "yMax": 0.463,
            "unit": "NORMALIZED"
          },
          "text": "USP : 11.98/g",
          "confidence": 0.97
        },
        "detectedLanguage": "en"
      }
    ],
    "complianceAssessments": [
      {
        "id": "419a7cb6-a5db-4cf1-bc03-922b8e7d15c7",
        "inspectionId": "012cd8fb-3e9f-4489-8c9b-e50795af122c",
        "ruleId": "GSR-202E-RULE-06-01-A",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(a)",
        "subRule": "1(a)",
        "ruleTitle": "Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(a) & Rule 10(1)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Definite and conspicuous declaration of manufacturer/packer name and address is present in compliance with Rule 6(1)(a) and Rule 10(1).",
        "observedValue": "MANUFACTURED BY: HCP WELLNESS PVT.LTD. plot no.- 8, Ozone Industrial Park,Bavla-Bagodara Highway, Bhayla, Ahmedabad -382220, Gujrat, INDIA.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.97,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:59:37.381Z",
        "createdAt": "2026-09-08T01:59:37.381Z"
      },
      {
        "id": "25f2e8d1-b8b0-40ec-a388-2dc4cb4a2324",
        "inspectionId": "012cd8fb-3e9f-4489-8c9b-e50795af122c",
        "ruleId": "GSR-202E-RULE-06-01-B",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(b)",
        "subRule": "1(b)",
        "ruleTitle": "Declaration of Generic or Common Name of the Commodity",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(b)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Generic or common name of the commodity is clearly declared in compliance with Rule 6(1)(b).",
        "observedValue": "ULTRA MATTE FINISH SUNSCREEN",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.98,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:59:37.381Z",
        "createdAt": "2026-09-08T01:59:37.381Z"
      },
      {
        "id": "4adddcb5-b23b-4854-bc09-f76b4baa3bda",
        "inspectionId": "012cd8fb-3e9f-4489-8c9b-e50795af122c",
        "ruleId": "GSR-202E-RULE-06-01-C",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(c)",
        "subRule": "1(c)",
        "ruleTitle": "Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 13,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(c) read with Rule 11, 12, 13"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Net quantity is declared in standard SI units in compliance with Rule 6(1)(c) and Rule 13.",
        "observedValue": "50 gm",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.99,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:59:37.381Z",
        "createdAt": "2026-09-08T01:59:37.381Z"
      },
      {
        "id": "af06d3da-d010-4a27-b7b5-9e3bc9128c37",
        "inspectionId": "012cd8fb-3e9f-4489-8c9b-e50795af122c",
        "ruleId": "GSR-202E-RULE-06-01-D",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(d)",
        "subRule": "1(d)",
        "ruleTitle": "Declaration of Month and Year of Manufacture, Pre-Packing or Import",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(d) read with Rule 6(1)(g) Proviso A"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Date of manufacture/packing could not be extracted due to poor image quality or blur.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.2,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:59:37.381Z",
        "createdAt": "2026-09-08T01:59:37.381Z"
      },
      {
        "id": "908d54b9-dbc7-475e-aa44-906a7fd5caae",
        "inspectionId": "012cd8fb-3e9f-4489-8c9b-e50795af122c",
        "ruleId": "GSR-202E-RULE-06-01-E",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(e)",
        "subRule": "1(e)",
        "ruleTitle": "Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 3,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)"
        },
        "result": "REQUIRES_VERIFICATION",
        "evidenceSufficiency": "LOW_CONFIDENCE",
        "severity": "CRITICAL",
        "explanation": "MRP text present but numeric price value could not be unambiguously resolved.",
        "observedValue": "MRP : 599.00",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.98,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:59:37.381Z",
        "createdAt": "2026-09-08T01:59:37.381Z"
      },
      {
        "id": "3c2a4d48-931f-4c11-81ac-6a316256f574",
        "inspectionId": "012cd8fb-3e9f-4489-8c9b-e50795af122c",
        "ruleId": "GSR-202E-RULE-06-02",
        "ruleVersionId": "1",
        "ruleNumber": "6(2)",
        "subRule": "2",
        "ruleTitle": "Declaration of Consumer Care Contact Details for Complaints",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 7,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(2)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Consumer care contact details (telephone/email/address) are provided in accordance with Rule 6(2).",
        "observedValue": "Email: care@renonlife.com or Call at: +91-8295160579",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.97,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:59:37.381Z",
        "createdAt": "2026-09-08T01:59:37.381Z"
      },
      {
        "id": "2e4bdae0-3882-4291-8dca-c09b9479791a",
        "inspectionId": "012cd8fb-3e9f-4489-8c9b-e50795af122c",
        "ruleId": "GSR-202E-RULE-07-02-T1",
        "ruleVersionId": "1",
        "ruleNumber": "7(2)",
        "subRule": "2 (Table I)",
        "ruleTitle": "Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 8,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "scheduleNumber": "Table I",
          "clauseReference": "Rule 7(2) & Rule 7(3)"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: 1mm).",
        "expectedConstraint": ">= 1mm (Table I)",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.3,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:59:37.381Z",
        "createdAt": "2026-09-08T01:59:37.381Z"
      },
      {
        "id": "7468680e-7b66-493e-b249-0f4254676b02",
        "inspectionId": "012cd8fb-3e9f-4489-8c9b-e50795af122c",
        "ruleId": "GSR-202E-RULE-18-02",
        "ruleVersionId": "1",
        "ruleNumber": "18(2)",
        "subRule": "2",
        "ruleTitle": "Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 16,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 18(2)"
        },
        "result": "NOT_APPLICABLE",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 1,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T01:59:37.381Z",
        "createdAt": "2026-09-08T01:59:37.381Z"
      }
    ],
    "findings": [
      {
        "id": "908d54b9-dbc7-475e-aa44-906a7fd5caae",
        "ruleId": "GSR-202E-RULE-06-01-E",
        "title": "6(1)(e)(1(e)) - Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
        "description": "MRP text present but numeric price value could not be unambiguously resolved.",
        "status": "MANUAL_REVIEW"
      }
    ],
    "report": {
      "reportNumber": "LM-REP-2026-012CD8FB",
      "contentHash": "31876692f2a9bdf505de3d80ab76b4298d1a061ffd61ec12fcf9f7a95297354f",
      "reportHash": "73073314ae829cdca34c04e96a98bea179ad62249b179d39ac02204b4ab6400b",
      "hasPdf": true,
      "generatedAt": "2026-09-08T02:02:50.787Z",
      "isDraftPreview": false
    },
    "decision": {
      "decision": "COMPLIANT",
      "comments": "Yrs",
      "decidedAt": "2026-09-08T02:00:36.742Z"
    }
  },
  {
    "id": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
    "createdAt": "2026-09-08T05:04:45.205Z",
    "updatedAt": "2026-09-08T05:07:20.196Z",
    "status": "DECIDED",
    "complianceResult": "REQUIRES_VERIFICATION",
    "complianceScore": 63,
    "productName": "Chicken Masala Mixed Masala Powder",
    "brandName": "Manufactured & Packed by : Everest Food Products Pvt. Ltd. (E) 4/B, L.B.S. Marg, Vikhroli (W), Mumbai - 400083, Maharashtra. (U) Survey No. 40, Gangadevi Road, Palgam - 396170, Tal.: Umbergaon - Gujarat.",
    "category": "FOOD_BEVERAGE",
    "packageType": "POUCH",
    "notes": "Dvcrdjjj",
    "images": [
      {
        "id": "512a6b52-e589-42b0-b40e-4486b2699a51",
        "surface": "FRONT",
        "fileUrl": "file:///data/user/0/host.exp.exponent/cache/ExperienceData/%2540lm-vision%252Flm-vision-inspector/Camera/aa0dfa5d-da32-4b79-baf9-f53c2527d7cd.jpg",
        "mimeType": "image/jpeg",
        "base64Thumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAQwAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMADQkKCwoIDQsKCw4ODQ8TIBUTEhITJxweFyAuKTEwLiktLDM6Sj4zNkY3LC1AV0FGTE5SU1IyPlphWlBgSlFST//bAEMBDg4OExETJhUVJk81LTVPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT//AABEIDMAJkAMBIgACEQEDEQH/xAAcAAADAQEBAQEBAAAAAAAA",
        "qualityScore": 0.92
      },
      {
        "id": "3655ec84-8d98-4888-9184-80100630c753",
        "surface": "BACK",
        "fileUrl": "file:///data/user/0/host.exp.exponent/cache/ExperienceData/%2540lm-vision%252Flm-vision-inspector/Camera/fd1457bc-1338-4d5a-bbe5-fd4cfaa04c34.jpg",
        "mimeType": "image/jpeg",
        "base64Thumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAQwAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMADQkKCwoIDQsKCw4ODQ8TIBUTEhITJxweFyAuKTEwLiktLDM6Sj4zNkY3LC1AV0FGTE5SU1IyPlphWlBgSlFST//bAEMBDg4OExETJhUVJk81LTVPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT//AABEIDMAJkAMBIgACEQEDEQH/xAAbAAADAQEBAQEAAAAAAAAA",
        "qualityScore": 0.92
      }
    ],
    "declarations": [
      {
        "type": "GENERIC_NAME",
        "rawText": "Chicken Masala Mixed Masala Powder",
        "normalizedValue": "Chicken Masala Mixed Masala Powder",
        "unit": null,
        "confidence": 0.98,
        "region": {
          "id": "7854b9ce-085c-4f4a-8607-05a1313bc741",
          "imageId": "512a6b52-e589-42b0-b40e-4486b2699a51",
          "surface": "FRONT",
          "boundingBox": {
            "xMin": 0.308,
            "yMin": 0.372,
            "xMax": 0.627,
            "yMax": 0.437,
            "unit": "NORMALIZED"
          },
          "text": "Chicken Masala Mixed Masala Powder",
          "confidence": 0.98
        },
        "detectedLanguage": "en"
      },
      {
        "type": "MRP",
        "rawText": "₹10/-",
        "normalizedValue": 10,
        "unit": "INR",
        "confidence": 0.95,
        "region": {
          "id": "1a8bdab4-768e-475f-898b-b457414b9f57",
          "imageId": "512a6b52-e589-42b0-b40e-4486b2699a51",
          "surface": "FRONT",
          "boundingBox": {
            "xMin": 0.579,
            "yMin": 0.418,
            "xMax": 0.681,
            "yMax": 0.489,
            "unit": "NORMALIZED"
          },
          "text": "₹10/-",
          "confidence": 0.95
        },
        "detectedLanguage": "en"
      },
      {
        "type": "NET_QUANTITY",
        "rawText": "12g",
        "normalizedValue": 12,
        "unit": "g",
        "confidence": 0.95,
        "region": {
          "id": "c904557f-bf21-4ac5-98c5-9e1abec811a0",
          "imageId": "3655ec84-8d98-4888-9184-80100630c753",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.219,
            "yMin": 0.643,
            "xMax": 0.245,
            "yMax": 0.678,
            "unit": "NORMALIZED"
          },
          "text": "12g",
          "confidence": 0.95
        },
        "detectedLanguage": "en"
      },
      {
        "type": "DATE_OF_PACKAGING",
        "rawText": "APR24",
        "normalizedValue": "2024-04",
        "unit": null,
        "confidence": 0.95,
        "region": {
          "id": "faa0cbe4-cbc2-4945-bf6d-e969631a08ad",
          "imageId": "3655ec84-8d98-4888-9184-80100630c753",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.22,
            "yMin": 0.583,
            "xMax": 0.245,
            "yMax": 0.638,
            "unit": "NORMALIZED"
          },
          "text": "APR24",
          "confidence": 0.95
        },
        "detectedLanguage": "en"
      },
      {
        "type": "EXPIRY_DATE_BEST_BEFORE",
        "rawText": "JUN27",
        "normalizedValue": "2027-06",
        "unit": null,
        "confidence": 0.95,
        "region": {
          "id": "85c8ad9c-bc51-4a4c-a8e6-6eb32f5ada92",
          "imageId": "3655ec84-8d98-4888-9184-80100630c753",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.22,
            "yMin": 0.539,
            "xMax": 0.246,
            "yMax": 0.582,
            "unit": "NORMALIZED"
          },
          "text": "JUN27",
          "confidence": 0.95
        },
        "detectedLanguage": "en"
      },
      {
        "type": "MRP",
        "rawText": "₹ 10.00",
        "normalizedValue": 10,
        "unit": "INR",
        "confidence": 0.96,
        "region": {
          "id": "463e5bc8-fe71-4c50-9691-f8c4ca9723d0",
          "imageId": "3655ec84-8d98-4888-9184-80100630c753",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.211,
            "yMin": 0.388,
            "xMax": 0.24,
            "yMax": 0.463,
            "unit": "NORMALIZED"
          },
          "text": "₹ 10.00",
          "confidence": 0.96
        },
        "detectedLanguage": "en"
      },
      {
        "type": "UNIT_SALE_PRICE",
        "rawText": "₹ 0.83/g",
        "normalizedValue": 0.83,
        "unit": "INR/g",
        "confidence": 0.94,
        "region": {
          "id": "776db8dc-686f-4366-959b-e8bfc24b4d91",
          "imageId": "3655ec84-8d98-4888-9184-80100630c753",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.212,
            "yMin": 0.311,
            "xMax": 0.239,
            "yMax": 0.385,
            "unit": "NORMALIZED"
          },
          "text": "₹ 0.83/g",
          "confidence": 0.94
        },
        "detectedLanguage": "en"
      },
      {
        "type": "MANUFACTURER_NAME_ADDRESS",
        "rawText": "Manufactured & Packed by : Everest Food Products Pvt. Ltd. (E) 4/B, L.B.S. Marg, Vikhroli (W), Mumbai - 400083, Maharashtra. (U) Survey No. 40, Gangadevi Road, Palgam - 396170, Tal.: Umbergaon - Gujarat.",
        "normalizedValue": "Everest Food Products Pvt. Ltd., Mumbai / Palgam",
        "unit": null,
        "confidence": 0.96,
        "region": {
          "id": "3fef9e41-bc7e-4c5a-b722-ae9895bf8022",
          "imageId": "3655ec84-8d98-4888-9184-80100630c753",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.311,
            "yMin": 0.426,
            "xMax": 0.748,
            "yMax": 0.481,
            "unit": "NORMALIZED"
          },
          "text": "Manufactured & Packed by : Everest Food Products Pvt. Ltd. (E) 4/B, L.B.S. Marg, Vikhroli (W), Mumbai - 400083, Maharashtra. (U) Survey No. 40, Gangadevi Road, Palgam - 396170, Tal.: Umbergaon - Gujarat.",
          "confidence": 0.96
        },
        "detectedLanguage": "en"
      },
      {
        "type": "CONSUMER_CARE_DETAILS",
        "rawText": "Registered Office and Executive Consumer Care Contact Everest Food Products Pvt. Ltd. Krushal Centre, G.M. Road, Mumbai - 400 089, Maharashtra. • Ph. No.: +91-22-25259915 customercare@everestspices.com www.everestfoods.com",
        "normalizedValue": "Ph: +91-22-25259915, customercare@everestspices.com, www.everestfoods.com",
        "unit": null,
        "confidence": 0.95,
        "region": {
          "id": "5f5a3a0f-3a5e-4977-a80f-a23b2db1bcaf",
          "imageId": "3655ec84-8d98-4888-9184-80100630c753",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.311,
            "yMin": 0.501,
            "xMax": 0.617,
            "yMax": 0.588,
            "unit": "NORMALIZED"
          },
          "text": "Registered Office and Executive Consumer Care Contact Everest Food Products Pvt. Ltd. Krushal Centre, G.M. Road, Mumbai - 400 089, Maharashtra. • Ph. No.: +91-22-25259915 customercare@everestspices.com www.everestfoods.com",
          "confidence": 0.95
        },
        "detectedLanguage": "en"
      },
      {
        "type": "BARCODE_QR",
        "rawText": "8901786160129",
        "normalizedValue": "8901786160129",
        "unit": null,
        "confidence": 0.98,
        "region": {
          "id": "d442cd1c-0348-44ad-8c65-92f76d9b0a69",
          "imageId": "3655ec84-8d98-4888-9184-80100630c753",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.622,
            "yMin": 0.56,
            "xMax": 0.741,
            "yMax": 0.608,
            "unit": "NORMALIZED"
          },
          "text": "8901786160129",
          "confidence": 0.98
        },
        "detectedLanguage": "en"
      }
    ],
    "complianceAssessments": [
      {
        "id": "c649cb1a-9c54-4d87-b8f3-e2a3ece93e42",
        "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
        "ruleId": "GSR-202E-RULE-06-01-A",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(a)",
        "subRule": "1(a)",
        "ruleTitle": "Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(a) & Rule 10(1)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Definite and conspicuous declaration of manufacturer/packer name and address is present in compliance with Rule 6(1)(a) and Rule 10(1).",
        "observedValue": "Manufactured & Packed by : Everest Food Products Pvt. Ltd. (E) 4/B, L.B.S. Marg, Vikhroli (W), Mumbai - 400083, Maharashtra. (U) Survey No. 40, Gangadevi Road, Palgam - 396170, Tal.: Umbergaon - Gujarat.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.96,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T05:04:44.811Z",
        "createdAt": "2026-09-08T05:04:44.811Z"
      },
      {
        "id": "59be1bed-4d19-49db-a6dd-118a635e496b",
        "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
        "ruleId": "GSR-202E-RULE-06-01-B",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(b)",
        "subRule": "1(b)",
        "ruleTitle": "Declaration of Generic or Common Name of the Commodity",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(b)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Generic or common name of the commodity is clearly declared in compliance with Rule 6(1)(b).",
        "observedValue": "Chicken Masala Mixed Masala Powder",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.98,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T05:04:44.811Z",
        "createdAt": "2026-09-08T05:04:44.811Z"
      },
      {
        "id": "1c519b53-74dd-44ef-a05d-957d2083f6e7",
        "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
        "ruleId": "GSR-202E-RULE-06-01-C",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(c)",
        "subRule": "1(c)",
        "ruleTitle": "Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 13,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(c) read with Rule 11, 12, 13"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Net quantity is declared in standard SI units in compliance with Rule 6(1)(c) and Rule 13.",
        "observedValue": "12g",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.95,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T05:04:44.811Z",
        "createdAt": "2026-09-08T05:04:44.811Z"
      },
      {
        "id": "56f1f293-09d4-445b-8833-1e2885c3c15a",
        "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
        "ruleId": "GSR-202E-RULE-06-01-D",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(d)",
        "subRule": "1(d)",
        "ruleTitle": "Declaration of Month and Year of Manufacture, Pre-Packing or Import",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(d) read with Rule 6(1)(g) Proviso A"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Month and year of manufacture/packing/import is clearly declared in compliance with Rule 6(1)(d).",
        "observedValue": "APR24",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.95,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T05:04:44.811Z",
        "createdAt": "2026-09-08T05:04:44.811Z"
      },
      {
        "id": "fdf0538f-9f78-4f1c-b484-23c364786ed9",
        "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
        "ruleId": "GSR-202E-RULE-06-01-E",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(e)",
        "subRule": "1(e)",
        "ruleTitle": "Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 3,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)"
        },
        "result": "REQUIRES_VERIFICATION",
        "evidenceSufficiency": "LOW_CONFIDENCE",
        "severity": "CRITICAL",
        "explanation": "MRP declared with numeric value but mandatory phrase \"inclusive of all taxes\" is not clearly confirmed on label.",
        "observedValue": "₹10/-",
        "expectedConstraint": "MRP Rs ... inclusive of all taxes (Rule 2(m))",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.95,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T05:04:44.811Z",
        "createdAt": "2026-09-08T05:04:44.811Z"
      },
      {
        "id": "a3fe731f-3f3c-459e-b6b2-e7e79c12ea5c",
        "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
        "ruleId": "GSR-202E-RULE-06-02",
        "ruleVersionId": "1",
        "ruleNumber": "6(2)",
        "subRule": "2",
        "ruleTitle": "Declaration of Consumer Care Contact Details for Complaints",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 7,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(2)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Consumer care contact details (telephone/email/address) are provided in accordance with Rule 6(2).",
        "observedValue": "Registered Office and Executive Consumer Care Contact Everest Food Products Pvt. Ltd. Krushal Centre, G.M. Road, Mumbai - 400 089, Maharashtra. • Ph. No.: +91-22-25259915 customercare@everestspices.com www.everestfoods.com",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.95,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T05:04:44.811Z",
        "createdAt": "2026-09-08T05:04:44.811Z"
      },
      {
        "id": "e42c2bb2-fd95-4d3d-8194-e5681ec85b34",
        "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
        "ruleId": "GSR-202E-RULE-07-02-T1",
        "ruleVersionId": "1",
        "ruleNumber": "7(2)",
        "subRule": "2 (Table I)",
        "ruleTitle": "Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 8,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "scheduleNumber": "Table I",
          "clauseReference": "Rule 7(2) & Rule 7(3)"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: 1mm).",
        "expectedConstraint": ">= 1mm (Table I)",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.3,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T05:04:44.811Z",
        "createdAt": "2026-09-08T05:04:44.811Z"
      },
      {
        "id": "97ed64ed-ad51-49e8-b924-798538010336",
        "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
        "ruleId": "GSR-202E-RULE-18-02",
        "ruleVersionId": "1",
        "ruleNumber": "18(2)",
        "subRule": "2",
        "ruleTitle": "Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 16,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 18(2)"
        },
        "result": "NOT_APPLICABLE",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 1,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T05:04:44.811Z",
        "createdAt": "2026-09-08T05:04:44.811Z"
      }
    ],
    "complianceSummary": {
      "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
      "engineVersion": "1.0.0",
      "ruleBundleId": "LM-IN-RULES-2026.09",
      "ruleCountEvaluated": 8,
      "passCount": 5,
      "failCount": 0,
      "requiresVerificationCount": 1,
      "notApplicableCount": 1,
      "insufficientEvidenceCount": 1,
      "assessments": [
        {
          "id": "c649cb1a-9c54-4d87-b8f3-e2a3ece93e42",
          "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
          "ruleId": "GSR-202E-RULE-06-01-A",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(a)",
          "subRule": "1(a)",
          "ruleTitle": "Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(a) & Rule 10(1)"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "Definite and conspicuous declaration of manufacturer/packer name and address is present in compliance with Rule 6(1)(a) and Rule 10(1).",
          "observedValue": "Manufactured & Packed by : Everest Food Products Pvt. Ltd. (E) 4/B, L.B.S. Marg, Vikhroli (W), Mumbai - 400083, Maharashtra. (U) Survey No. 40, Gangadevi Road, Palgam - 396170, Tal.: Umbergaon - Gujarat.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.96,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T05:04:44.811Z",
          "createdAt": "2026-09-08T05:04:44.811Z"
        },
        {
          "id": "59be1bed-4d19-49db-a6dd-118a635e496b",
          "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
          "ruleId": "GSR-202E-RULE-06-01-B",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(b)",
          "subRule": "1(b)",
          "ruleTitle": "Declaration of Generic or Common Name of the Commodity",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(b)"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Generic or common name of the commodity is clearly declared in compliance with Rule 6(1)(b).",
          "observedValue": "Chicken Masala Mixed Masala Powder",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.98,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T05:04:44.811Z",
          "createdAt": "2026-09-08T05:04:44.811Z"
        },
        {
          "id": "1c519b53-74dd-44ef-a05d-957d2083f6e7",
          "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
          "ruleId": "GSR-202E-RULE-06-01-C",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(c)",
          "subRule": "1(c)",
          "ruleTitle": "Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 13,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(c) read with Rule 11, 12, 13"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "Net quantity is declared in standard SI units in compliance with Rule 6(1)(c) and Rule 13.",
          "observedValue": "12g",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.95,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T05:04:44.811Z",
          "createdAt": "2026-09-08T05:04:44.811Z"
        },
        {
          "id": "56f1f293-09d4-445b-8833-1e2885c3c15a",
          "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
          "ruleId": "GSR-202E-RULE-06-01-D",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(d)",
          "subRule": "1(d)",
          "ruleTitle": "Declaration of Month and Year of Manufacture, Pre-Packing or Import",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(d) read with Rule 6(1)(g) Proviso A"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Month and year of manufacture/packing/import is clearly declared in compliance with Rule 6(1)(d).",
          "observedValue": "APR24",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.95,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T05:04:44.811Z",
          "createdAt": "2026-09-08T05:04:44.811Z"
        },
        {
          "id": "fdf0538f-9f78-4f1c-b484-23c364786ed9",
          "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
          "ruleId": "GSR-202E-RULE-06-01-E",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(e)",
          "subRule": "1(e)",
          "ruleTitle": "Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 3,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)"
          },
          "result": "REQUIRES_VERIFICATION",
          "evidenceSufficiency": "LOW_CONFIDENCE",
          "severity": "CRITICAL",
          "explanation": "MRP declared with numeric value but mandatory phrase \"inclusive of all taxes\" is not clearly confirmed on label.",
          "observedValue": "₹10/-",
          "expectedConstraint": "MRP Rs ... inclusive of all taxes (Rule 2(m))",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.95,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T05:04:44.811Z",
          "createdAt": "2026-09-08T05:04:44.811Z"
        },
        {
          "id": "a3fe731f-3f3c-459e-b6b2-e7e79c12ea5c",
          "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
          "ruleId": "GSR-202E-RULE-06-02",
          "ruleVersionId": "1",
          "ruleNumber": "6(2)",
          "subRule": "2",
          "ruleTitle": "Declaration of Consumer Care Contact Details for Complaints",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 7,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(2)"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Consumer care contact details (telephone/email/address) are provided in accordance with Rule 6(2).",
          "observedValue": "Registered Office and Executive Consumer Care Contact Everest Food Products Pvt. Ltd. Krushal Centre, G.M. Road, Mumbai - 400 089, Maharashtra. • Ph. No.: +91-22-25259915 customercare@everestspices.com www.everestfoods.com",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.95,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T05:04:44.811Z",
          "createdAt": "2026-09-08T05:04:44.811Z"
        },
        {
          "id": "e42c2bb2-fd95-4d3d-8194-e5681ec85b34",
          "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
          "ruleId": "GSR-202E-RULE-07-02-T1",
          "ruleVersionId": "1",
          "ruleNumber": "7(2)",
          "subRule": "2 (Table I)",
          "ruleTitle": "Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 8,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "scheduleNumber": "Table I",
            "clauseReference": "Rule 7(2) & Rule 7(3)"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: 1mm).",
          "expectedConstraint": ">= 1mm (Table I)",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.3,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T05:04:44.811Z",
          "createdAt": "2026-09-08T05:04:44.811Z"
        },
        {
          "id": "97ed64ed-ad51-49e8-b924-798538010336",
          "inspectionId": "2d4cc348-ecd0-44d2-96e0-ba4cbff40795",
          "ruleId": "GSR-202E-RULE-18-02",
          "ruleVersionId": "1",
          "ruleNumber": "18(2)",
          "subRule": "2",
          "ruleTitle": "Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 16,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 18(2)"
          },
          "result": "NOT_APPLICABLE",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 1,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T05:04:44.811Z",
          "createdAt": "2026-09-08T05:04:44.811Z"
        }
      ],
      "overallStatus": "REQUIRES_VERIFICATION",
      "evaluatedAt": "2026-09-08T05:04:44.811Z"
    },
    "findings": [
      {
        "id": "fdf0538f-9f78-4f1c-b484-23c364786ed9",
        "ruleId": "GSR-202E-RULE-06-01-E",
        "title": "6(1)(e)(1(e)) - Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
        "description": "MRP declared with numeric value but mandatory phrase \"inclusive of all taxes\" is not clearly confirmed on label.",
        "status": "MANUAL_REVIEW",
        "severity": "CRITICAL"
      }
    ],
    "decision": {
      "decision": "COMPLIANT",
      "comments": "Dvcrdjjj",
      "decidedAt": "2026-09-08T05:06:06.958Z"
    },
    "report": {
      "reportNumber": "LM-REP-2026-2D4CC348",
      "contentHash": "79b1a6f56f548075ecfe065498a4db1a77246094342f04fb3e2de8a058995fb1",
      "reportHash": "3bbd2a2295c22f4386e68061229974acbb14978f2bb5f559f50809a0d07dfe09",
      "hasPdf": true,
      "generatedAt": "2026-09-08T05:06:46.222Z",
      "isDraftPreview": false
    }
  },
  {
    "id": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
    "createdAt": "2026-09-08T19:32:21.644Z",
    "updatedAt": "2026-09-08T19:32:21.644Z",
    "status": "ANALYZED",
    "complianceResult": "REQUIRES_VERIFICATION",
    "complianceScore": 63,
    "productName": "ULTRA MATTE FINISH SUNSCREEN",
    "brandName": "HCP WELLNESS PVT.LTD. plot no.- 8, Ozone Industrial Park, Bavla-Bagodara Highway, Bhayla, Ahmedabad - 382220, Gujrat, INDIA.",
    "category": "COMMODITY",
    "packageType": "PACKAGE",
    "batchNumber": "10/23",
    "images": [
      {
        "id": "39883df0-f53b-4daa-95d2-6fa266f33383",
        "surface": "FRONT",
        "mimeType": "image/jpeg",
        "base64Thumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAIQAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMADQkKCwoIDQsKCw4ODQ8TIBUTEhITJxweFyAuKTEwLiktLDM6Sj4zNkY3LC1AV0FGTE5SU1IyPlphWlBgSlFST//bAEMBDg4OExETJhUVJk81LTVPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT//AABEIEEAMMAMBIgACEQEDEQH/xAAbAAADAQEBAQEAAAAAAAAA"
      },
      {
        "id": "6f46dcd8-f609-4c12-a6a5-603adeb71c92",
        "surface": "BACK",
        "mimeType": "image/jpeg",
        "base64Thumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAIQAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMADQkKCwoIDQsKCw4ODQ8TIBUTEhITJxweFyAuKTEwLiktLDM6Sj4zNkY3LC1AV0FGTE5SU1IyPlphWlBgSlFST//bAEMBDg4OExETJhUVJk81LTVPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT//AABEIEEAMMAMBIgACEQEDEQH/xAAbAAEBAQEBAQEBAAAAAAAA"
      }
    ],
    "declarations": [
      {
        "type": "GENERIC_NAME",
        "rawText": "ULTRA MATTE FINISH SUNSCREEN",
        "normalizedValue": "ULTRA MATTE FINISH SUNSCREEN",
        "unit": null,
        "confidence": 0.98,
        "region": {
          "id": "d29df456-0272-4cb9-973c-93a347be6cb9",
          "imageId": "39883df0-f53b-4daa-95d2-6fa266f33383",
          "surface": "FRONT",
          "boundingBox": {
            "xMin": 0.34,
            "yMin": 0.27,
            "xMax": 0.59,
            "yMax": 0.32,
            "unit": "NORMALIZED"
          },
          "text": "ULTRA MATTE FINISH SUNSCREEN",
          "confidence": 0.98
        },
        "detectedLanguage": "en"
      },
      {
        "type": "NET_QUANTITY",
        "rawText": "50 gm",
        "normalizedValue": 50,
        "unit": "g",
        "confidence": 0.99,
        "region": {
          "id": "a11e7054-52c1-438e-b7d3-9f507e7c56ad",
          "imageId": "39883df0-f53b-4daa-95d2-6fa266f33383",
          "surface": "FRONT",
          "boundingBox": {
            "xMin": 0.45,
            "yMin": 0.74,
            "xMax": 0.53,
            "yMax": 0.77,
            "unit": "NORMALIZED"
          },
          "text": "50 gm",
          "confidence": 0.99
        },
        "detectedLanguage": "en"
      },
      {
        "type": "DATE_OF_MANUFACTURE",
        "rawText": "10/23",
        "normalizedValue": "2023-10",
        "unit": null,
        "confidence": 0.9,
        "region": {
          "id": "01d70e29-191b-480b-a4fc-7d57d5440bc5",
          "imageId": "39883df0-f53b-4daa-95d2-6fa266f33383",
          "surface": "FRONT",
          "boundingBox": {
            "xMin": 0.3,
            "yMin": 0.08,
            "xMax": 0.53,
            "yMax": 0.11,
            "unit": "NORMALIZED"
          },
          "text": "10/23",
          "confidence": 0.9
        },
        "detectedLanguage": "en"
      },
      {
        "type": "MRP",
        "rawText": "599.00",
        "normalizedValue": 599,
        "unit": "INR",
        "confidence": 0.99,
        "region": {
          "id": "0f12a901-2f4c-4a47-ad60-6792c720db50",
          "imageId": "6f46dcd8-f609-4c12-a6a5-603adeb71c92",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.4,
            "yMin": 0.54,
            "xMax": 0.45,
            "yMax": 0.56,
            "unit": "NORMALIZED"
          },
          "text": "599.00",
          "confidence": 0.99
        },
        "detectedLanguage": "en"
      },
      {
        "type": "UNIT_SALE_PRICE",
        "rawText": "11.98/g",
        "normalizedValue": 11.98,
        "unit": "INR/g",
        "confidence": 0.98,
        "region": {
          "id": "eaf89e21-9497-4829-ba2a-5750d7599a64",
          "imageId": "6f46dcd8-f609-4c12-a6a5-603adeb71c92",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.4,
            "yMin": 0.56,
            "xMax": 0.45,
            "yMax": 0.58,
            "unit": "NORMALIZED"
          },
          "text": "11.98/g",
          "confidence": 0.98
        },
        "detectedLanguage": "en"
      },
      {
        "type": "EXPIRY_DATE_BEST_BEFORE",
        "rawText": "Best before 24 months from Mfg. Date",
        "normalizedValue": "24 months",
        "unit": "months",
        "confidence": 0.97,
        "region": {
          "id": "391b41b6-06ab-4ebd-bbab-46bafd5d6a81",
          "imageId": "6f46dcd8-f609-4c12-a6a5-603adeb71c92",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.4,
            "yMin": 0.6,
            "xMax": 0.58,
            "yMax": 0.63,
            "unit": "NORMALIZED"
          },
          "text": "Best before 24 months from Mfg. Date",
          "confidence": 0.97
        },
        "detectedLanguage": "en"
      },
      {
        "type": "MANUFACTURER_NAME_ADDRESS",
        "rawText": "HCP WELLNESS PVT.LTD. plot no.- 8, Ozone Industrial Park, Bavla-Bagodara Highway, Bhayla, Ahmedabad - 382220, Gujrat, INDIA.",
        "normalizedValue": "HCP WELLNESS PVT.LTD. plot no.- 8, Ozone Industrial Park, Bavla-Bagodara Highway, Bhayla, Ahmedabad - 382220, Gujrat, INDIA.",
        "unit": null,
        "confidence": 0.95,
        "region": {
          "id": "7a695516-c755-40d1-839f-8feed75e09a3",
          "imageId": "6f46dcd8-f609-4c12-a6a5-603adeb71c92",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.32,
            "yMin": 0.65,
            "xMax": 0.64,
            "yMax": 0.71,
            "unit": "NORMALIZED"
          },
          "text": "HCP WELLNESS PVT.LTD. plot no.- 8, Ozone Industrial Park, Bavla-Bagodara Highway, Bhayla, Ahmedabad - 382220, Gujrat, INDIA.",
          "confidence": 0.95
        },
        "detectedLanguage": "en"
      },
      {
        "type": "PACKER_NAME_ADDRESS",
        "rawText": "BeyondKart 84-A, HUDA Sector 24, Panipat, 132103",
        "normalizedValue": "BeyondKart 84-A, HUDA Sector 24, Panipat, 132103",
        "unit": null,
        "confidence": 0.95,
        "region": {
          "id": "7188e3e1-5b22-459e-b4f1-e5e7d379505b",
          "imageId": "6f46dcd8-f609-4c12-a6a5-603adeb71c92",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.33,
            "yMin": 0.73,
            "xMax": 0.52,
            "yMax": 0.77,
            "unit": "NORMALIZED"
          },
          "text": "BeyondKart 84-A, HUDA Sector 24, Panipat, 132103",
          "confidence": 0.95
        },
        "detectedLanguage": "en"
      },
      {
        "type": "CONSUMER_CARE_DETAILS",
        "rawText": "Email: care@renonlife.com or Call at: +91-8295160579",
        "normalizedValue": "Email: care@renonlife.com, Phone: +91-8295160579",
        "unit": null,
        "confidence": 0.97,
        "region": {
          "id": "7983eecb-abc8-4b4c-bfd5-09cc613bce89",
          "imageId": "6f46dcd8-f609-4c12-a6a5-603adeb71c92",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.34,
            "yMin": 0.76,
            "xMax": 0.59,
            "yMax": 0.79,
            "unit": "NORMALIZED"
          },
          "text": "Email: care@renonlife.com or Call at: +91-8295160579",
          "confidence": 0.97
        },
        "detectedLanguage": "en"
      },
      {
        "type": "COUNTRY_OF_ORIGIN",
        "rawText": "INDIA",
        "normalizedValue": "India",
        "unit": null,
        "confidence": 0.99,
        "region": {
          "id": "3130197e-0213-4ddc-9101-e7f754a5a817",
          "imageId": "6f46dcd8-f609-4c12-a6a5-603adeb71c92",
          "surface": "BACK",
          "boundingBox": {
            "xMin": 0.53,
            "yMin": 0.66,
            "xMax": 0.56,
            "yMax": 0.68,
            "unit": "NORMALIZED"
          },
          "text": "INDIA",
          "confidence": 0.99
        },
        "detectedLanguage": "en"
      }
    ],
    "complianceAssessments": [
      {
        "id": "feb87453-fb4e-4b8e-bad9-f799e19c9d03",
        "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
        "ruleId": "GSR-202E-RULE-06-01-A",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(a)",
        "subRule": "1(a)",
        "ruleTitle": "Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(a) & Rule 10(1)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Definite and conspicuous declaration of manufacturer/packer name and address is present in compliance with Rule 6(1)(a) and Rule 10(1).",
        "observedValue": "HCP WELLNESS PVT.LTD. plot no.- 8, Ozone Industrial Park, Bavla-Bagodara Highway, Bhayla, Ahmedabad - 382220, Gujrat, INDIA.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.95,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T19:32:21.645Z",
        "createdAt": "2026-09-08T19:32:21.645Z"
      },
      {
        "id": "7969268e-59bc-4798-acb3-8c80af8fe502",
        "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
        "ruleId": "GSR-202E-RULE-06-01-B",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(b)",
        "subRule": "1(b)",
        "ruleTitle": "Declaration of Generic or Common Name of the Commodity",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(b)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Generic or common name of the commodity is clearly declared in compliance with Rule 6(1)(b).",
        "observedValue": "ULTRA MATTE FINISH SUNSCREEN",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.98,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T19:32:21.645Z",
        "createdAt": "2026-09-08T19:32:21.645Z"
      },
      {
        "id": "50ba69a6-97ec-4400-b11a-1aea4ce5e12f",
        "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
        "ruleId": "GSR-202E-RULE-06-01-C",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(c)",
        "subRule": "1(c)",
        "ruleTitle": "Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 13,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(c) read with Rule 11, 12, 13"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "Net quantity is declared in standard SI units in compliance with Rule 6(1)(c) and Rule 13.",
        "observedValue": "50 gm",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.99,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T19:32:21.645Z",
        "createdAt": "2026-09-08T19:32:21.645Z"
      },
      {
        "id": "24526d56-9e34-4d1c-b631-8bf8b388c749",
        "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
        "ruleId": "GSR-202E-RULE-06-01-D",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(d)",
        "subRule": "1(d)",
        "ruleTitle": "Declaration of Month and Year of Manufacture, Pre-Packing or Import",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 5,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(1)(d) read with Rule 6(1)(g) Proviso A"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Month and year of manufacture/packing/import is clearly declared in compliance with Rule 6(1)(d).",
        "observedValue": "10/23",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.9,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T19:32:21.645Z",
        "createdAt": "2026-09-08T19:32:21.645Z"
      },
      {
        "id": "35b678d9-ed1e-4018-9dff-d5ae7cf22dd7",
        "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
        "ruleId": "GSR-202E-RULE-06-01-E",
        "ruleVersionId": "1",
        "ruleNumber": "6(1)(e)",
        "subRule": "1(e)",
        "ruleTitle": "Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 3,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)"
        },
        "result": "REQUIRES_VERIFICATION",
        "evidenceSufficiency": "LOW_CONFIDENCE",
        "severity": "CRITICAL",
        "explanation": "MRP declared with numeric value but mandatory phrase \"inclusive of all taxes\" is not clearly confirmed on label.",
        "observedValue": "599.00",
        "expectedConstraint": "MRP Rs ... inclusive of all taxes (Rule 2(m))",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.99,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T19:32:21.645Z",
        "createdAt": "2026-09-08T19:32:21.645Z"
      },
      {
        "id": "8b315821-24c3-47ab-b2c7-5737d1422331",
        "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
        "ruleId": "GSR-202E-RULE-06-02",
        "ruleVersionId": "1",
        "ruleNumber": "6(2)",
        "subRule": "2",
        "ruleTitle": "Declaration of Consumer Care Contact Details for Complaints",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 7,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 6(2)"
        },
        "result": "PASS",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Consumer care contact details (telephone/email/address) are provided in accordance with Rule 6(2).",
        "observedValue": "Email: care@renonlife.com or Call at: +91-8295160579",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.97,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T19:32:21.645Z",
        "createdAt": "2026-09-08T19:32:21.645Z"
      },
      {
        "id": "d864aa17-5a72-4555-aa04-bd6b39a6274a",
        "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
        "ruleId": "GSR-202E-RULE-07-02-T1",
        "ruleVersionId": "1",
        "ruleNumber": "7(2)",
        "subRule": "2 (Table I)",
        "ruleTitle": "Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 8,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "scheduleNumber": "Table I",
          "clauseReference": "Rule 7(2) & Rule 7(3)"
        },
        "result": "INSUFFICIENT_EVIDENCE",
        "evidenceSufficiency": "INSUFFICIENT",
        "severity": "MAJOR",
        "explanation": "Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: 1mm).",
        "expectedConstraint": ">= 1mm (Table I)",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 0.3,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T19:32:21.645Z",
        "createdAt": "2026-09-08T19:32:21.645Z"
      },
      {
        "id": "7c2c7cc3-be42-4386-a2d7-d3622ec1e21f",
        "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
        "ruleId": "GSR-202E-RULE-18-02",
        "ruleVersionId": "1",
        "ruleNumber": "18(2)",
        "subRule": "2",
        "ruleTitle": "Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP",
        "ruleKind": "AUTHORITATIVE",
        "ruleSource": {
          "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
          "sourcePage": 16,
          "gazetteNotificationNumber": "GSR 202 (E)",
          "clauseReference": "Rule 18(2)"
        },
        "result": "NOT_APPLICABLE",
        "evidenceSufficiency": "SUFFICIENT",
        "severity": "CRITICAL",
        "explanation": "No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.",
        "declarationIds": [],
        "evidenceIds": [],
        "confidence": 1,
        "engineVersion": "1.0.0",
        "ruleBundleId": "LM-IN-RULES-2026.09",
        "evaluatedAt": "2026-09-08T19:32:21.645Z",
        "createdAt": "2026-09-08T19:32:21.645Z"
      }
    ],
    "complianceSummary": {
      "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
      "engineVersion": "1.0.0",
      "ruleBundleId": "LM-IN-RULES-2026.09",
      "ruleCountEvaluated": 8,
      "passCount": 5,
      "failCount": 0,
      "requiresVerificationCount": 1,
      "notApplicableCount": 1,
      "insufficientEvidenceCount": 1,
      "assessments": [
        {
          "id": "feb87453-fb4e-4b8e-bad9-f799e19c9d03",
          "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
          "ruleId": "GSR-202E-RULE-06-01-A",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(a)",
          "subRule": "1(a)",
          "ruleTitle": "Declaration of Name and Complete Address of Manufacturer, Packer, or Importer",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(a) & Rule 10(1)"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "Definite and conspicuous declaration of manufacturer/packer name and address is present in compliance with Rule 6(1)(a) and Rule 10(1).",
          "observedValue": "HCP WELLNESS PVT.LTD. plot no.- 8, Ozone Industrial Park, Bavla-Bagodara Highway, Bhayla, Ahmedabad - 382220, Gujrat, INDIA.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.95,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T19:32:21.645Z",
          "createdAt": "2026-09-08T19:32:21.645Z"
        },
        {
          "id": "7969268e-59bc-4798-acb3-8c80af8fe502",
          "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
          "ruleId": "GSR-202E-RULE-06-01-B",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(b)",
          "subRule": "1(b)",
          "ruleTitle": "Declaration of Generic or Common Name of the Commodity",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(b)"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Generic or common name of the commodity is clearly declared in compliance with Rule 6(1)(b).",
          "observedValue": "ULTRA MATTE FINISH SUNSCREEN",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.98,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T19:32:21.645Z",
          "createdAt": "2026-09-08T19:32:21.645Z"
        },
        {
          "id": "50ba69a6-97ec-4400-b11a-1aea4ce5e12f",
          "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
          "ruleId": "GSR-202E-RULE-06-01-C",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(c)",
          "subRule": "1(c)",
          "ruleTitle": "Declaration of Net Quantity in Standard SI Units of Weight, Measure or Number",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 13,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(c) read with Rule 11, 12, 13"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "Net quantity is declared in standard SI units in compliance with Rule 6(1)(c) and Rule 13.",
          "observedValue": "50 gm",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.99,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T19:32:21.645Z",
          "createdAt": "2026-09-08T19:32:21.645Z"
        },
        {
          "id": "24526d56-9e34-4d1c-b631-8bf8b388c749",
          "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
          "ruleId": "GSR-202E-RULE-06-01-D",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(d)",
          "subRule": "1(d)",
          "ruleTitle": "Declaration of Month and Year of Manufacture, Pre-Packing or Import",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 5,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(1)(d) read with Rule 6(1)(g) Proviso A"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Month and year of manufacture/packing/import is clearly declared in compliance with Rule 6(1)(d).",
          "observedValue": "10/23",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.9,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T19:32:21.645Z",
          "createdAt": "2026-09-08T19:32:21.645Z"
        },
        {
          "id": "35b678d9-ed1e-4018-9dff-d5ae7cf22dd7",
          "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
          "ruleId": "GSR-202E-RULE-06-01-E",
          "ruleVersionId": "1",
          "ruleNumber": "6(1)(e)",
          "subRule": "1(e)",
          "ruleTitle": "Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 3,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 2(m) read with Rule 6(1)(e) & Rule 6(3)"
          },
          "result": "REQUIRES_VERIFICATION",
          "evidenceSufficiency": "LOW_CONFIDENCE",
          "severity": "CRITICAL",
          "explanation": "MRP declared with numeric value but mandatory phrase \"inclusive of all taxes\" is not clearly confirmed on label.",
          "observedValue": "599.00",
          "expectedConstraint": "MRP Rs ... inclusive of all taxes (Rule 2(m))",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.99,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T19:32:21.645Z",
          "createdAt": "2026-09-08T19:32:21.645Z"
        },
        {
          "id": "8b315821-24c3-47ab-b2c7-5737d1422331",
          "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
          "ruleId": "GSR-202E-RULE-06-02",
          "ruleVersionId": "1",
          "ruleNumber": "6(2)",
          "subRule": "2",
          "ruleTitle": "Declaration of Consumer Care Contact Details for Complaints",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 7,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 6(2)"
          },
          "result": "PASS",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Consumer care contact details (telephone/email/address) are provided in accordance with Rule 6(2).",
          "observedValue": "Email: care@renonlife.com or Call at: +91-8295160579",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.97,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T19:32:21.645Z",
          "createdAt": "2026-09-08T19:32:21.645Z"
        },
        {
          "id": "d864aa17-5a72-4555-aa04-bd6b39a6274a",
          "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
          "ruleId": "GSR-202E-RULE-07-02-T1",
          "ruleVersionId": "1",
          "ruleNumber": "7(2)",
          "subRule": "2 (Table I)",
          "ruleTitle": "Minimum Height of Numerals in Net Quantity Declaration on Principal Display Panel",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 8,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "scheduleNumber": "Table I",
            "clauseReference": "Rule 7(2) & Rule 7(3)"
          },
          "result": "INSUFFICIENT_EVIDENCE",
          "evidenceSufficiency": "INSUFFICIENT",
          "severity": "MAJOR",
          "explanation": "Visual measurement of numeral height is not available. Physical gauge measurement required under Rule 7(2) Table I (statutory minimum: 1mm).",
          "expectedConstraint": ">= 1mm (Table I)",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 0.3,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T19:32:21.645Z",
          "createdAt": "2026-09-08T19:32:21.645Z"
        },
        {
          "id": "7c2c7cc3-be42-4386-a2d7-d3622ec1e21f",
          "inspectionId": "4ab36520-ccbe-4da3-be45-1c344916c4ad",
          "ruleId": "GSR-202E-RULE-18-02",
          "ruleVersionId": "1",
          "ruleNumber": "18(2)",
          "subRule": "2",
          "ruleTitle": "Prohibition Against Selling Pre-Packaged Commodity Exceeding Declared MRP",
          "ruleKind": "AUTHORITATIVE",
          "ruleSource": {
            "sourceDocument": "The Legal Metrology (Packaged Commodities) Rules, 2011",
            "sourcePage": 16,
            "gazetteNotificationNumber": "GSR 202 (E)",
            "clauseReference": "Rule 18(2)"
          },
          "result": "NOT_APPLICABLE",
          "evidenceSufficiency": "SUFFICIENT",
          "severity": "CRITICAL",
          "explanation": "No actual sale price or retail purchase transaction provided for comparison. Rule 18(2) applies when sale occurs.",
          "declarationIds": [],
          "evidenceIds": [],
          "confidence": 1,
          "engineVersion": "1.0.0",
          "ruleBundleId": "LM-IN-RULES-2026.09",
          "evaluatedAt": "2026-09-08T19:32:21.645Z",
          "createdAt": "2026-09-08T19:32:21.645Z"
        }
      ],
      "overallStatus": "REQUIRES_VERIFICATION",
      "evaluatedAt": "2026-09-08T19:32:21.645Z"
    },
    "findings": [
      {
        "id": "35b678d9-ed1e-4018-9dff-d5ae7cf22dd7",
        "ruleId": "GSR-202E-RULE-06-01-E",
        "title": "6(1)(e)(1(e)) - Declaration of Retail Sale Price (MRP) Inclusive of All Taxes",
        "description": "MRP declared with numeric value but mandatory phrase \"inclusive of all taxes\" is not clearly confirmed on label.",
        "status": "MANUAL_REVIEW",
        "severity": "CRITICAL"
      }
    ]
  }
];

export const DEMO_RULES: Row[] = [
  {
    id: 'GSR-202E-RULE-06-01-A',
    rule_number: '6(1)(a)',
    sub_rule: '1(a)',
    title: 'Manufacturer, Packer, or Importer Identity & Address',
    category: 'IDENTITY_ADDRESS',
    description: 'Definite and conspicuous declaration of name and complete address of manufacturer/packer.',
  },
  {
    id: 'GSR-202E-RULE-06-01-B',
    rule_number: '6(1)(b)',
    sub_rule: '1(b)',
    title: 'Generic or Common Name of Commodity',
    category: 'PRODUCT_IDENTITY',
    description: 'Generic or common name of the commodity clearly stated.',
  },
  {
    id: 'GSR-202E-RULE-06-01-C',
    rule_number: '6(1)(c)',
    sub_rule: '1(c)',
    title: 'Net Quantity Declaration & Units',
    category: 'NET_QUANTITY',
    description: 'Net quantity in standard units of mass, volume, length, or number with correct symbols.',
  },
  {
    id: 'GSR-202E-RULE-06-01-D',
    rule_number: '6(1)(d)',
    sub_rule: '1(d)',
    title: 'Month & Year of Manufacture / Packaging / Import',
    category: 'DATE_MARKING',
    description: 'Month and year in which commodity is manufactured, packed, or imported.',
  },
  {
    id: 'GSR-202E-RULE-06-01-E',
    rule_number: '6(1)(e)',
    sub_rule: '1(e)',
    title: 'Maximum Retail Price (MRP) Declaration',
    category: 'PRICING',
    description: 'MRP in Indian Rupees inclusive of all taxes.',
  },
  {
    id: 'GSR-202E-RULE-06-02',
    rule_number: '6(2)',
    sub_rule: '2',
    title: 'Consumer Care Contact Details',
    category: 'CONSUMER_CARE',
    description: 'Name, address, telephone number, and email address of person or office for consumer complaints.',
  },
  {
    id: 'GSR-202E-RULE-07-02-T1',
    rule_number: '7(2)',
    sub_rule: '2',
    title: 'Unit Sale Price (USP) Declaration',
    category: 'PRICING',
    description: 'Unit sale price declared in Rs. per g/ml/piece where package net quantity exceeds statutory thresholds.',
  },
  {
    id: 'GSR-202E-RULE-18-02',
    rule_number: '18(2)',
    sub_rule: '2',
    title: 'Prohibition Against Overcharging Above Stated MRP',
    category: 'PRICING',
    description: 'No retail dealer or person shall sell at price exceeding MRP.',
  },
];

export const DEMO_RULE_VERSIONS: Row[] = DEMO_RULES.map((r) => ({
  id: String(r.id) + '-v1',
  rule_id: r.id,
  source_document: 'The Legal Metrology (Packaged Commodities) Rules, 2011',
  source_page: 5,
  gazette_notification_number: 'GSR 202(E)',
  approval_status: 'VERIFIED',
}));

export const DEMO_USERS: Row[] = [
  {
    id: '00000002-0000-0000-0000-000000000001',
    full_name: 'Demo Inspector',
    designation: 'Legal Metrology Field Officer',
    badge_number: 'INS-DL-0042',
    employee_code: 'LM-DEL-042',
    is_active: true,
    last_login_at: new Date().toISOString(),
  },
  {
    id: '00000002-0000-0000-0000-000000000002',
    full_name: 'Senior Inspector R. Sharma',
    designation: 'Senior Inspector',
    badge_number: 'INS-DL-0018',
    employee_code: 'LM-DEL-018',
    is_active: true,
    last_login_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '00000002-0000-0000-0000-000000000003',
    full_name: 'Zonal Controller A. Verma',
    designation: 'Zonal Controller / Supervisor',
    badge_number: 'SUP-DL-0004',
    employee_code: 'LM-HQ-004',
    is_active: true,
    last_login_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

const STORAGE_KEY = 'lm_vision_demo_inspections';

export function getStoredRawInspections(): StoredRawInspection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[DemoData] Could not read from localStorage:', err);
  }
  // Initialize storage with base demo inspections
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(BASE_DEMO_INSPECTIONS));
  } catch {}
  return [...BASE_DEMO_INSPECTIONS];
}

export function saveStoredRawInspections(list: StoredRawInspection[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('[DemoData] Could not save to localStorage:', err);
  }
}

export function addOrUpdateRawInspection(inspection: StoredRawInspection): void {
  const current = getStoredRawInspections();
  const index = current.findIndex((item) => item.id === inspection.id);
  if (index >= 0) {
    current[index] = inspection;
  } else {
    current.unshift(inspection);
  }
  saveStoredRawInspections(current);
}

export function toInspectionListItem(item: StoredRawInspection): InspectionListItem {
  return {
    id: item.id,
    productName: item.productName || 'Packaged Commodity',
    productCategory: item.category || 'COMMODITY',
    inspectorName: 'Demo Inspector (INS-DL-0042)',
    status: item.status || 'ANALYZED',
    compliance_result: item.complianceResult || 'PASS',
    sync_status: 'SYNCED',
    started_at: item.createdAt || new Date().toISOString(),
    updated_at: item.updatedAt || new Date().toISOString(),
    compliance_score: item.complianceScore ?? 100,
  };
}

export function toInspectionDetail(item: StoredRawInspection): InspectionDetail {
  const inspection: Row = {
    id: item.id,
    source_type: 'MOBILE_DEVICE',
    status: item.status || 'ANALYZED',
    sync_status: 'SYNCED',
    compliance_result: item.complianceResult,
    compliance_score: item.complianceScore,
    started_at: item.createdAt,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    completed_at: item.status === 'DECIDED' ? item.updatedAt : null,
  };

  const product: Row = {
    id: 'prod-' + item.id,
    name: item.productName || 'Packaged Commodity',
    brand: item.brandName || 'Declared Manufacturer',
    category: item.category || 'COMMODITY',
    package_type: item.packageType || 'POUCH',
    batch_number: item.batchNumber || 'BN-2026',
  };

  const inspector: Row = {
    id: '00000002-0000-0000-0000-000000000001',
    full_name: 'Demo Inspector',
    badge_number: 'INS-DL-0042',
    designation: 'Field Inspector',
  };

  const declarations: Row[] = (item.declarations || []).map((d, index) => ({
    id: 'decl-' + index,
    inspection_id: item.id,
    field_name: (d.type || 'DECLARATION').replace(/_/g, ' '),
    raw_value: d.rawText,
    normalized_value: d.normalizedValue ?? d.rawText,
    confidence: d.confidence ?? 0.95,
    verification_status: (d.confidence ?? 1) >= 0.85 ? 'AUTOMATICALLY_VERIFIED' : 'NEEDS_REVIEW',
    created_at: item.createdAt,
  }));

  const assessments: Row[] = (item.complianceAssessments || []).map((a) => ({
    id: a.id || 'assess-' + a.ruleNumber,
    inspection_id: item.id,
    rule_number: a.ruleNumber,
    sub_rule: a.subRule || '',
    rule_title: a.ruleTitle,
    result: a.result,
    explanation: a.explanation,
    source_document: a.ruleSource?.sourceDocument || 'The Legal Metrology (Packaged Commodities) Rules, 2011',
    source_page: a.ruleSource?.sourcePage || 5,
    rule_version_id: 'LM-IN-RULES-2026.09',
    observed_value: a.observedValue ?? 'Observed on packaging',
    expected_constraint: a.expectedConstraint ?? 'Mandatory under PCR 2011',
    evidence_ids: a.evidenceIds || ['EVID-' + a.ruleNumber],
    evaluated_at: a.evaluatedAt || item.createdAt,
    severity: a.severity || 'MAJOR',
  }));

  const analyses: Row[] = [
    {
      id: 'analysis-' + item.id,
      inspection_id: item.id,
      provider: 'GEMINI',
      model: 'gemini-1.5-flash',
      confidence: (item.complianceScore ?? 95) / 100,
      status: 'COMPLETED',
      created_at: item.createdAt,
    },
  ];

  const images: Row[] = (item.images || []).map((img) => ({
    id: img.id,
    inspection_id: item.id,
    surface: img.surface,
    mime_type: img.mimeType,
    storage_path: img.fileUrl || ('samples/' + img.id),
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    captured_at: item.createdAt,
    thumbnail: img.base64Thumbnail,
  }));

  const evidence: Row[] = images.map((img) => ({
    id: 'evid-' + img.id,
    inspection_id: item.id,
    evidence_type: 'IMAGE',
    surface: img.surface,
    storage_path: img.storage_path,
    sha256: img.sha256,
    created_at: img.captured_at,
  }));

  const decisions: Row[] = item.decision
    ? [
        {
          id: 'dec-' + item.id,
          inspection_id: item.id,
          decision: item.decision.decision,
          comments: item.decision.comments || 'Statutory review concluded.',
          decided_at: item.decision.decidedAt || item.updatedAt,
        },
      ]
    : item.status === 'DECIDED'
    ? [
        {
          id: 'dec-' + item.id,
          inspection_id: item.id,
          decision: item.complianceResult === 'PASS' ? 'APPROVED' : 'VIOLATION_NOTICE_ISSUED',
          comments:
            item.complianceResult === 'PASS'
              ? 'Complies with the Legal Metrology (Packaged Commodities) Rules, 2011.'
              : 'Deficiencies noted in mandatory declarations. Case marked for supervisory action.',
          decided_at: item.updatedAt,
        },
      ]
    : [];

  const reports: Row[] = [
    {
      id: 'rep-' + item.id,
      report_number: item.report?.reportNumber || ('REP-LM-2026-' + item.id.slice(0, 6).toUpperCase()),
      inspection_id: item.id,
      report_version: '1.0',
      content_hash: item.report?.contentHash || '7a8f9c1e2b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
      generated_at: item.report?.generatedAt || item.updatedAt,
      is_draft_preview: item.status !== 'DECIDED',
      storage_path: 'reports/' + item.id + '.pdf',
    },
  ];

  const audit: Row[] = [
    {
      id: 'aud-1-' + item.id,
      created_at: item.createdAt,
      action: 'INSPECTION_CREATED',
      entity_type: 'INSPECTION',
      metadata: { source: 'MOBILE_APP', inspector: 'Demo Inspector' },
    },
    {
      id: 'aud-2-' + item.id,
      created_at: item.updatedAt,
      action: item.status === 'DECIDED' ? 'DECISION_PERSISTED' : 'ANALYSIS_EVALUATED',
      entity_type: 'ASSESSMENT',
      metadata: { score: item.complianceScore, result: item.complianceResult },
    },
  ];

  const reviews: Row[] = assessments
    .filter((a) => a.result === 'REQUIRES_VERIFICATION' || a.result === 'FAIL')
    .slice(0, 2)
    .map((a, idx) => ({
      id: 'rev-' + idx + '-' + item.id,
      inspection_id: item.id,
      assessment_id: a.id,
      inspector_id: 'Demo Inspector (INS-DL-0042)',
      status: 'UNDER_SUPERVISORY_REVIEW',
      action: a.result === 'FAIL' ? 'PENALTY_PROPOSAL' : 'CLARIFICATION_REQUESTED',
      original_observed_value: a.observed_value,
      correction: null,
      rationale: a.explanation,
      reviewed_at: item.updatedAt,
    }));

  return {
    inspection,
    product,
    inspector,
    images,
    analyses,
    declarations,
    assessments,
    reviews,
    evidence,
    decisions,
    reports,
    amendments: [],
    audit,
  };
}

export function getDemoInspections(filters: any = {}, page = 1, pageSize = 25): Page<InspectionListItem> {
  const rawList = getStoredRawInspections();
  let items = rawList.map(toInspectionListItem);

  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter((it) => it.id.toLowerCase().includes(q) || it.productName.toLowerCase().includes(q) || it.inspectorName.toLowerCase().includes(q));
  }
  if (filters.status) {
    items = items.filter((it) => it.status === filters.status);
  }
  if (filters.result) {
    items = items.filter((it) => it.compliance_result === filters.result);
  }
  if (filters.category) {
    items = items.filter((it) => it.productCategory === filters.category);
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  const rows = items.slice(start, start + pageSize);

  return { rows, total };
}

export function getDemoDashboardMetrics(): {
  metrics: Record<string, number>;
  recent: InspectionListItem[];
} {
  const rawList = getStoredRawInspections();
  const rows = rawList.map(toInspectionListItem);

  const total = rows.length;
  const today = rows.filter((r) => {
    const date = new Date(String(r.started_at));
    const now = new Date();
    return date.toDateString() === now.toDateString();
  }).length || total;

  const pending = rows.filter((r) => r.status === 'REVIEW_REQUIRED' || r.status === 'ANALYZED').length;
  const finalized = rows.filter((r) => r.status === 'DECIDED' || r.status === 'REPORT_GENERATED').length;
  const nonCompliant = rows.filter((r) => r.compliance_result === 'FAIL').length;
  const verification = rows.filter((r) => r.compliance_result === 'REQUIRES_VERIFICATION').length;
  const syncPending = rows.filter((r) => r.sync_status === 'PENDING_SYNC').length;

  return {
    metrics: {
      total,
      today,
      pending,
      finalized,
      nonCompliant,
      verification,
      syncPending,
      conflicts: 0,
    },
    recent: rows.slice(0, 6),
  };
}

export function getDemoSimpleList(table: string): Row[] {
  const rawList = getStoredRawInspections();
  switch (table) {
    case 'rules':
      return DEMO_RULES;
    case 'rule_versions':
      return DEMO_RULE_VERSIONS;
    case 'users':
      return DEMO_USERS;
    case 'inspections':
      return rawList.map(toInspectionListItem);
    case 'compliance_assessments':
      return rawList.flatMap((item) => toInspectionDetail(item).assessments);
    case 'reports':
      return rawList.flatMap((item) => toInspectionDetail(item).reports);
    case 'audit_logs':
      return rawList.flatMap((item) => toInspectionDetail(item).audit);
    case 'evidence':
      return rawList.flatMap((item) => toInspectionDetail(item).evidence);
    case 'inspection_images':
      return rawList.flatMap((item) => toInspectionDetail(item).images);
    default:
      return [];
  }
}
