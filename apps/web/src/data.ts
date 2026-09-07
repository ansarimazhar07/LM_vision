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

export async function listInspections(filters: InspectionFilters, page = 1, pageSize = 25): Promise<Page<InspectionListItem>> {
  const from = (page - 1) * pageSize;
  const result = await applyInspectionFilters(
    client().from('inspections').select('*', { count: 'exact' }),
    filters,
  ).order('updated_at', { ascending: false }).range(from, from + pageSize - 1);
  const rows = ensure(result as QueryResult);
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
}

async function count(table: string, configure?: (query: any) => any): Promise<number> {
  let query = client().from(table).select('*', { count: 'exact', head: true });
  if (configure) query = configure(query);
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}

export async function dashboard(): Promise<DashboardData> {
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
  return {
    metrics: { total, today: todayCount, pending, finalized, nonCompliant, verification, syncPending, conflicts },
    recent: recent.rows,
  };
}

export async function inspectionDetail(id: string): Promise<InspectionDetail> {
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
  if (!inspection) throw new Error('Inspection was not found or is not available to this account.');
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
}

export async function getSignedUrl(bucket: 'inspection-images' | 'evidence-files' | 'reports', path: string): Promise<string | undefined> {
  const result = await client().storage.from(bucket).createSignedUrl(path, 600);
  if (result.error) throw new Error(result.error.message);
  return result.data?.signedUrl;
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
  const result = await client().from(table).select('*').order(order, { ascending: false }).limit(limit);
  return ensure(result as QueryResult);
}
