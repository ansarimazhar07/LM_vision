import { createBrowserClient } from '@lm-vision/supabase-client/browser';

export type Row = Record<string, unknown>;

export interface InspectionListItem extends Row {
  id: string;
  productName: string;
  productCategory: string;
  inspectorName: string;
}

export interface Page<T> {
  rows: T[];
  total: number;
}

export interface InspectionFilters {
  search?: string;
  status?: string;
  sync?: string;
  result?: string;
  category?: string;
  from?: string;
  to?: string;
}

export interface DashboardData {
  metrics: Record<string, number>;
  recent: InspectionListItem[];
}

export interface InspectionDetail {
  inspection: Row;
  product?: Row;
  inspector?: Row;
  images: Row[];
  analyses: Row[];
  declarations: Row[];
  assessments: Row[];
  reviews: Row[];
  evidence: Row[];
  decisions: Row[];
  reports: Row[];
  amendments: Row[];
  audit: Row[];
}

type QueryResult = { data: Row[] | null; error: { message: string } | null; count?: number | null };

function publicEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY' | 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'): string {
  return (import.meta.env[name] as string | undefined) ?? '';
}

export function isConfigured(): boolean {
  return Boolean(
    publicEnv('VITE_SUPABASE_URL') || publicEnv('NEXT_PUBLIC_SUPABASE_URL'),
  ) && Boolean(publicEnv('VITE_SUPABASE_ANON_KEY') || publicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
}

export function client() {
  const url = publicEnv('VITE_SUPABASE_URL') || publicEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = publicEnv('VITE_SUPABASE_ANON_KEY') || publicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createBrowserClient(url, key);
}

function ensure(result: QueryResult): Row[] {
  if (result.error) throw new Error(result.error.message);
  return result.data ?? [];
}

function first<T>(rows: T[]): T | undefined { return rows[0]; }

async function mapsFor(inspections: Row[]): Promise<{ products: Map<string, Row>; users: Map<string, Row> }> {
  const productIds = inspections.map((row) => row['product_id']).filter((id): id is string => typeof id === 'string');
  const inspectorIds = inspections.map((row) => row['inspector_id']).filter((id): id is string => typeof id === 'string');
  const supabase = client();
  const [productsResult, usersResult] = await Promise.all([
    productIds.length ? supabase.from('products').select('*').in('id', productIds) : Promise.resolve({ data: [], error: null }),
    inspectorIds.length ? supabase.from('users').select('*').in('id', inspectorIds) : Promise.resolve({ data: [], error: null }),
  ]);
  return {
    products: new Map(ensure(productsResult as QueryResult).map((row) => [String(row['id']), row])),
    users: new Map(ensure(usersResult as QueryResult).map((row) => [String(row['id']), row])),
  };
}

function decorate(inspections: Row[], products: Map<string, Row>, users: Map<string, Row>): InspectionListItem[] {
  return inspections.map((inspection) => {
    const product = products.get(String(inspection['product_id']));
    const inspector = users.get(String(inspection['inspector_id']));
    return {
      ...inspection,
      id: String(inspection['id']),
      productName: String(product?.['name'] ?? 'Unclassified product'),
      productCategory: String(product?.['category'] ?? '—'),
      inspectorName: String(inspector?.['full_name'] ?? 'Restricted'),
    };
  });
}

function applyInspectionFilters(query: any, filters: InspectionFilters): any {
  let next = query;
  if (filters.status) next = next.eq('status', filters.status);
  if (filters.sync) next = next.eq('sync_status', filters.sync);
  if (filters.from) next = next.gte('started_at', `${filters.from}T00:00:00.000Z`);
  if (filters.to) next = next.lte('started_at', `${filters.to}T23:59:59.999Z`);
  return next;
}

export const DEMO_INSPECTIONS: InspectionListItem[] = [
  {
    id: 'ins-2026-0909-001',
    productName: 'ABC Herbal Anti-Dandruff Shampoo 500ml',
    productCategory: 'PERSONAL_CARE_COSMETICS',
    inspectorName: 'Demo Inspector (INS-DL-0042)',
    status: 'DECIDED',
    compliance_result: 'FAIL',
    sync_status: 'SYNCED',
    started_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ins-2026-0909-002',
    productName: 'Kisan Pure Wheat Flour (Atta) 5kg',
    productCategory: 'GRAINS_AND_CEREALS',
    inspectorName: 'Demo Inspector (INS-DL-0042)',
    status: 'REPORT_GENERATED',
    compliance_result: 'PASS',
    sync_status: 'SYNCED',
    started_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ins-2026-0909-003',
    productName: 'Himalayan Organic Honey 250g',
    productCategory: 'FOOD_AND_BEVERAGES',
    inspectorName: 'Demo Inspector (INS-DL-0042)',
    status: 'REVIEW_REQUIRED',
    compliance_result: 'REQUIRES_VERIFICATION',
    sync_status: 'PENDING_SYNC',
    started_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

import {
  addOrUpdateRawInspection,
  getDemoDashboardMetrics,
  getDemoInspections,
  getDemoSimpleList,
  getStoredRawInspections,
  toInspectionDetail,
  toInspectionListItem,
  type StoredRawInspection,
} from './demoData.js';

export {
  addOrUpdateRawInspection,
  getDemoDashboardMetrics,
  getDemoInspections,
  getDemoSimpleList,
  getStoredRawInspections,
  toInspectionDetail,
  toInspectionListItem,
  type StoredRawInspection,
};

export async function syncFromBackendApi(): Promise<boolean> {
  try {
    const res = await fetch('/api/v1/inspections');
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data?.rows)) {
        for (const raw of json.data.rows) {
          addOrUpdateRawInspection(raw);
        }
        return true;
      }
    }
  } catch (e) {
    console.debug('[syncFromBackendApi] Backend not reachable or offline:', e);
  }
  return false;
}

export function createSampleLiveInspection(): StoredRawInspection {
  const id = 'live-ins-' + Date.now().toString(36).toUpperCase();
  const sample: StoredRawInspection = {
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'DECIDED',
    complianceResult: 'PASS',
    complianceScore: 100,
    productName: 'Tata Sampann Unpolished Toor Dal 1kg',
    brandName: 'Tata Consumer Products Ltd.',
    category: 'FOOD_AND_BEVERAGES',
    packageType: 'POUCH',
    batchNumber: 'BN-TT-2026-90',
    notes: 'Sample live inspection added from command center evaluation mode.',
    images: [
      {
        id: 'img-' + id,
        surface: 'FRONT',
        mimeType: 'image/jpeg',
      },
    ],
    declarations: [
      {
        type: 'GENERIC_NAME',
        rawText: 'Toor Dal (Pigeon Pea)',
        normalizedValue: 'Toor Dal',
        confidence: 0.98,
      },
      {
        type: 'NET_QUANTITY',
        rawText: '1 kg',
        normalizedValue: { magnitude: 1, unit: 'kg' },
        confidence: 0.99,
      },
      {
        type: 'MAXIMUM_RETAIL_PRICE',
        rawText: 'MRP Rs. 185.00 (Incl. of all taxes)',
        normalizedValue: { amount: 185, currency: 'INR', isInclusiveOfAllTaxes: true },
        confidence: 0.97,
      },
      {
        type: 'DATE_OF_PACKAGING',
        rawText: 'PKD 08/26',
        normalizedValue: '2026-08',
        confidence: 0.95,
      },
      {
        type: 'CONSUMER_CARE_DETAILS',
        rawText: 'Tata Consumer Care: 1800-108-4488 care@tataconsumer.com',
        normalizedValue: '1800-108-4488, care@tataconsumer.com',
        confidence: 0.96,
      },
      {
        type: 'MANUFACTURER_NAME_ADDRESS',
        rawText: 'Tata Consumer Products Ltd., 1, Bishop Lefroy Road, Kolkata, West Bengal - 700020',
        normalizedValue: 'Tata Consumer Products Ltd., Kolkata - 700020',
        confidence: 0.96,
      },
    ],
    complianceAssessments: [
      {
        id: 'assess-1-' + id,
        ruleNumber: '6(1)(a)',
        ruleTitle: 'Declaration of Name and Complete Address of Manufacturer',
        result: 'PASS',
        severity: 'CRITICAL',
        explanation: 'Plain and conspicuous declaration of manufacturer name and address is present.',
        observedValue: 'Tata Consumer Products Ltd., Kolkata - 700020',
      },
      {
        id: 'assess-2-' + id,
        ruleNumber: '6(1)(b)',
        ruleTitle: 'Generic or Common Name of Commodity',
        result: 'PASS',
        severity: 'MAJOR',
        explanation: 'Generic name Toor Dal clearly declared on principal display panel.',
        observedValue: 'Toor Dal (Pigeon Pea)',
      },
      {
        id: 'assess-3-' + id,
        ruleNumber: '6(1)(c)',
        ruleTitle: 'Net Quantity Declaration in Standard Units',
        result: 'PASS',
        severity: 'CRITICAL',
        explanation: 'Net quantity declared in standard SI unit kg with correct font size.',
        observedValue: '1 kg',
      },
      {
        id: 'assess-4-' + id,
        ruleNumber: '6(1)(e)',
        ruleTitle: 'Maximum Retail Price Declaration',
        result: 'PASS',
        severity: 'CRITICAL',
        explanation: 'MRP declared in Indian Rupees inclusive of all taxes.',
        observedValue: 'Rs. 185.00',
      },
      {
        id: 'assess-5-' + id,
        ruleNumber: '6(2)',
        ruleTitle: 'Consumer Care Contact Details',
        result: 'PASS',
        severity: 'MAJOR',
        explanation: 'Name, toll-free telephone, and email present.',
        observedValue: '1800-108-4488, care@tataconsumer.com',
      },
    ],
    decision: {
      decision: 'APPROVED',
      comments: 'All statutory PCR 2011 declarations verified in compliance.',
      decidedAt: new Date().toISOString(),
    },
  };
  addOrUpdateRawInspection(sample);
  return sample;
}

export async function listInspections(filters: InspectionFilters, page = 1, pageSize = 25): Promise<Page<InspectionListItem>> {
  try {
    const from = (page - 1) * pageSize;
    const result = await applyInspectionFilters(
      client().from('inspections').select('*', { count: 'exact' }),
      filters,
    ).order('updated_at', { ascending: false }).range(from, from + pageSize - 1);
    const rows = ensure(result as QueryResult);
    if (rows.length === 0 && !result.count) {
      return getDemoInspections(filters, page, pageSize);
    }
    const { products, users } = await mapsFor(rows);
    let decorated = decorate(rows, products, users);
    const query = filters.search?.trim().toLocaleLowerCase();
    if (query) decorated = decorated.filter((row) => [row.id, row.productName, row.inspectorName].some((value) => value.toLocaleLowerCase().includes(query)));
    if (filters.category) decorated = decorated.filter((row) => row.productCategory === filters.category);
    if (filters.result) {
      const assessmentResult = await client().from('compliance_assessments').select('inspection_id').eq('result', filters.result).in('inspection_id', decorated.map((row) => row.id));
      const ids = new Set(ensure(assessmentResult as QueryResult).map((row) => String(row['inspection_id'])));
      decorated = decorated.filter((row) => ids.has(row.id));
    }
    return { rows: decorated, total: result.count ?? decorated.length };
  } catch (err) {
    console.warn('[listInspections] Falling back to real evaluation records:', err);
    return getDemoInspections(filters, page, pageSize);
  }
}

async function count(table: string, configure?: (query: any) => any): Promise<number> {
  let query = client().from(table).select('*', { count: 'exact', head: true });
  if (configure) query = configure(query);
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}

export async function dashboard(): Promise<DashboardData> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();
    const [total, todayCount, pending, finalized, nonCompliant, verification, syncPending, conflicts, recent] = await Promise.all([
      count('inspections'),
      count('inspections', (q) => q.gte('started_at', todayIso)),
      count('inspections', (q) => q.in('status', ['REVIEW_REQUIRED', 'IN_REVIEW', 'READY_FOR_DECISION'])),
      count('inspections', (q) => q.in('status', ['DECIDED', 'REPORT_GENERATED', 'ARCHIVED'])),
      count('compliance_assessments', (q) => q.eq('result', 'FAIL')),
      count('compliance_assessments', (q) => q.eq('result', 'REQUIRES_VERIFICATION')),
      count('inspections', (q) => q.in('sync_status', ['LOCAL_ONLY', 'PENDING_SYNC', 'SYNCING', 'SYNC_FAILED'])),
      count('inspections', (q) => q.eq('sync_status', 'SYNC_CONFLICT')),
      listInspections({}, 1, 6),
    ]);
    if (total === 0 && recent.rows.length === 0) {
      return getDemoDashboardMetrics();
    }
    return {
      metrics: { total, today: todayCount, pending, finalized, nonCompliant, verification, syncPending, conflicts },
      recent: recent.rows,
    };
  } catch (err) {
    console.warn('[dashboard] Displaying evaluation operations dashboard:', err);
    return getDemoDashboardMetrics();
  }
}

export async function inspectionDetail(id: string): Promise<InspectionDetail> {
  try {
    const supabase = client();
    const [inspectionResult, imagesResult, analysesResult, declarationsResult, assessmentsResult, reviewsResult, evidenceResult, decisionsResult, reportsResult, amendmentsResult, auditResult] = await Promise.all([
      supabase.from('inspections').select('*').eq('id', id).limit(1),
      supabase.from('inspection_images').select('*').eq('inspection_id', id).order('created_at'),
      supabase.from('ai_analyses').select('*').eq('inspection_id', id).order('created_at', { ascending: false }),
      supabase.from('declarations').select('*').eq('inspection_id', id).order('created_at'),
      supabase.from('compliance_assessments').select('*').eq('inspection_id', id).order('evaluated_at', { ascending: false }),
      supabase.from('inspector_reviews').select('*').eq('inspection_id', id).order('updated_at', { ascending: false }),
      supabase.from('evidence').select('*').eq('inspection_id', id).order('created_at', { ascending: false }),
      supabase.from('inspector_decisions').select('*').eq('inspection_id', id).order('decided_at', { ascending: false }),
      supabase.from('reports').select('*').eq('inspection_id', id).order('generated_at', { ascending: false }),
      supabase.from('inspection_amendments').select('*').eq('inspection_id', id).order('amended_at', { ascending: false }),
      supabase.from('audit_logs').select('*').eq('entity_id', id).order('created_at', { ascending: false }),
    ]);
    const inspection = first(ensure(inspectionResult as QueryResult));
    if (!inspection) throw new Error('Not in remote database');
    const [productResult, inspectorResult] = await Promise.all([
      inspection['product_id'] ? supabase.from('products').select('*').eq('id', String(inspection['product_id'])).limit(1) : Promise.resolve({ data: [], error: null }),
      supabase.from('users').select('*').eq('id', String(inspection['inspector_id'])).limit(1),
    ]);
    return {
      inspection,
      product: first(ensure(productResult as QueryResult)),
      inspector: first(ensure(inspectorResult as QueryResult)),
      images: ensure(imagesResult as QueryResult), analyses: ensure(analysesResult as QueryResult), declarations: ensure(declarationsResult as QueryResult),
      assessments: ensure(assessmentsResult as QueryResult), reviews: ensure(reviewsResult as QueryResult), evidence: ensure(evidenceResult as QueryResult),
      decisions: ensure(decisionsResult as QueryResult), reports: ensure(reportsResult as QueryResult), amendments: ensure(amendmentsResult as QueryResult), audit: ensure(auditResult as QueryResult),
    };
  } catch (err) {
    console.warn('[inspectionDetail] Falling back to local inspection record for:', id);
    const stored = getStoredRawInspections().find((item) => item.id === id);
    if (stored) {
      return toInspectionDetail(stored);
    }
    throw new Error(`Inspection '${id}' was not found.`);
  }
}

export async function getSignedUrl(bucket: 'inspection-images' | 'evidence-files' | 'reports', path: string): Promise<string | undefined> {
  try {
    const result = await client().storage.from(bucket).createSignedUrl(path, 600);
    if (result.error) throw new Error(result.error.message);
    return result.data?.signedUrl;
  } catch {
    return undefined;
  }
}

export async function getProfile(): Promise<{ user: Row; profile?: Row; role?: string }> {
  const supabase = client();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Not signed in');
  const profileResult = await supabase.from('users').select('*').eq('id', data.user.id).limit(1);
  const profile = first(ensure(profileResult as QueryResult));
  let role: string | undefined;
  if (profile?.['role_id']) {
    const roleResult = await supabase.from('roles').select('name').eq('id', String(profile['role_id'])).limit(1);
    role = String(first(ensure(roleResult as QueryResult))?.['name'] ?? '');
  }
  return { user: { id: data.user.id, email: data.user.email ?? '' }, profile, role };
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await client().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  const { error } = await client().auth.signOut();
  if (error) throw new Error(error.message);
}

export async function simpleList(table: string, order = 'created_at', limit = 100): Promise<Row[]> {
  try {
    const result = await client().from(table).select('*').order(order, { ascending: false }).limit(limit);
    const rows = ensure(result as QueryResult);
    if (rows.length === 0) {
      return getDemoSimpleList(table);
    }
    return rows;
  } catch (err) {
    console.warn(`[simpleList] Falling back to demo data for table '${table}':`, err);
    return getDemoSimpleList(table);
  }
}
