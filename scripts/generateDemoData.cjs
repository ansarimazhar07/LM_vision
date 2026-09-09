const fs = require('fs');
const path = require('path');

const inspectionsJsonPath = path.resolve(__dirname, '../services/ai-engine/data/inspections.json');
const outputPath = path.resolve(__dirname, '../apps/web/src/demoData.ts');

const rawInspections = JSON.parse(fs.readFileSync(inspectionsJsonPath, 'utf8'));

// Truncate overly long base64 strings to keep module lightweight
rawInspections.forEach((item) => {
  if (item.images) {
    item.images.forEach((img) => {
      if (img.base64Thumbnail && img.base64Thumbnail.length > 50000) {
        img.base64Thumbnail = img.base64Thumbnail.slice(0, 1000);
      }
    });
  }
});

const content = `// ============================================================================
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

export const BASE_DEMO_INSPECTIONS: StoredRawInspection[] = ${JSON.stringify(rawInspections, null, 2)};

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
`;

fs.writeFileSync(outputPath, content, 'utf8');
console.log('Successfully generated apps/web/src/demoData.ts');
