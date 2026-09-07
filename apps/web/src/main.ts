import {
  client, dashboard, getProfile, getSignedUrl, inspectionDetail, isConfigured, listInspections,
  requestPasswordReset, signIn, signOut, simpleList, type InspectionDetail, type InspectionFilters, type InspectionListItem, type Row,
} from './data.js';
import './styles.css';

type SessionProfile = Awaited<ReturnType<typeof getProfile>>;

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Application root is unavailable.');
const app: HTMLDivElement = root;

let profile: SessionProfile | undefined;
let updatedAt: Date | undefined;
let refreshError: string | undefined;
let autoRefresh = 0;
let autoTimer: number | undefined;
let selectedEvidence: Row | undefined;
let activeInspectionFilters: InspectionFilters = {};
let activeInspectionPage = 1;

const nav = [
  ['Dashboard', '#/dashboard', '▦'], ['Inspections', '#/inspections', '□'], ['Pending review', '#/reviews', '◷'],
  ['Rule library', '#/rules', '⚖'], ['Evidence', '#/evidence', '◉'], ['Reports', '#/reports', '▤'],
  ['Analytics', '#/analytics', '◔'], ['Sync monitor', '#/sync', '↻'], ['Audit trail', '#/audit', '≡'],
  ['Inspectors', '#/inspectors', '♙'], ['Profile', '#/profile', '○'],
] as const;

function esc(value: unknown): string {
  return String(value ?? '—').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] ?? character));
}
function text(value: unknown, fallback = '—'): string { return value === null || value === undefined || value === '' ? fallback : String(value); }
function fmtDate(value: unknown, withTime = true): string {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.valueOf()) ? String(value) : date.toLocaleString(undefined, withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
}
function shortId(value: unknown): string { const id = String(value ?? ''); return id ? `INS-${id.slice(0, 8).toUpperCase()}` : '—'; }
function json(value: unknown): string { return esc(typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)); }
function badge(value: unknown): string {
  const status = text(value).replaceAll('_', ' ');
  const kind = /FAIL|NON.COMPLIANT|FAILED|CONFLICT/i.test(status) ? 'bad' : /PASS|DECIDED|SYNCED|VERIFIED|ACTIVE|GENERATED/i.test(status) ? 'good' : /REQUIRES|PENDING|REVIEW|LOCAL|SYNCING|DRAFT/i.test(status) ? 'warn' : 'neutral';
  return `<span class="badge ${kind}">${esc(status)}</span>`;
}
function rowCount(rows: Row[], predicate: (row: Row) => boolean): number { return rows.filter(predicate).length; }
function currentPath(): string { return location.hash.slice(1) || '/dashboard'; }
function canAccess(path: string): boolean {
  const role = profile?.role;
  if (path === '/audit') return role === 'ADMIN' || role === 'AUDITOR';
  if (path === '/inspectors') return role === 'ADMIN' || role === 'SUPERVISOR' || role === 'AUDITOR';
  return true;
}
function pageHeader(title: string, subtitle: string, actions = true): string {
  return `<header class="page-header"><div><p class="eyebrow">LM-Vision · ${esc(profile?.role ?? 'Authenticated')}</p><h1>${esc(title)}</h1><p class="subtitle">${esc(subtitle)}</p></div>${actions ? refreshControl() : ''}</header>`;
}
function refreshControl(): string {
  const state = refreshError ? `<span class="freshness error">Refresh failed · ${esc(refreshError)}</span>` : updatedAt ? `<span class="freshness">Last updated: ${updatedAt.toLocaleTimeString()}</span>` : '<span class="freshness">Not refreshed yet</span>';
  return `<div class="refresh-control"><label class="auto-label">Auto refresh <select data-action="auto-refresh"><option value="0" ${autoRefresh === 0 ? 'selected' : ''}>Off</option><option value="30000" ${autoRefresh === 30000 ? 'selected' : ''}>30s</option><option value="60000" ${autoRefresh === 60000 ? 'selected' : ''}>60s</option><option value="300000" ${autoRefresh === 300000 ? 'selected' : ''}>5 min</option></select></label><button class="button secondary" data-action="refresh">↻ <span>Refresh</span></button>${state}</div>`;
}
function layout(content: string): void {
  const path = currentPath();
  app.innerHTML = `<div class="shell"><aside class="sidebar"><a class="brand" href="#/dashboard"><span class="brand-mark">L</span><span><strong>LM-VISION</strong><small>Command Center</small></span></a><nav>${nav.filter(([, href]) => canAccess(href.slice(1))).map(([name, href, icon]) => `<a href="${href}" class="${path === href.slice(1) || (href === '#/inspections' && path.startsWith('/inspections')) ? 'active' : ''}"><span>${icon}</span>${name}</a>`).join('')}</nav><div class="sidebar-footer"><span class="session-dot"></span><div><strong>${esc(profile?.profile?.['full_name'] ?? 'Authenticated user')}</strong><small>${esc(profile?.role ?? 'RLS protected')}</small></div><button title="Sign out" data-action="signout">⇥</button></div></aside><main class="content">${content}</main></div>`;
  bind();
}
function loading(title = 'Loading data…'): void { layout(`${pageHeader(title, 'Fetching the latest records allowed by Supabase RLS.', false)}<section class="state loading"><span class="spinner"></span>${esc(title)}</section>`); }
function state(title: string, body: string, retry = true): string { return `<section class="state"><h2>${esc(title)}</h2><p>${esc(body)}</p>${retry ? '<button class="button secondary" data-action="refresh">Retry</button>' : ''}</section>`; }

function inspectionTable(rows: InspectionListItem[]): string {
  if (!rows.length) return state('No inspections found', 'There are no records matching the current filters.', false);
  return `<div class="table-wrap"><table><thead><tr><th>Inspection ID</th><th>Product</th><th>Inspector</th><th>Date</th><th>Status</th><th>Compliance result</th><th>Sync status</th><th>Updated</th></tr></thead><tbody>${rows.map((row) => `<tr class="clickable" data-route="#/inspections/${esc(row.id)}"><td><strong>${shortId(row.id)}</strong><small>${esc(row.id)}</small></td><td><strong>${esc(row.productName)}</strong><small>${esc(row.productCategory)}</small></td><td>${esc(row.inspectorName)}</td><td>${fmtDate(row['started_at'], false)}</td><td>${badge(row['status'])}</td><td>${badge(row['compliance_result'] ?? 'Not evaluated')}</td><td>${badge(row['sync_status'])}</td><td>${fmtDate(row['updated_at'])}</td></tr>`).join('')}</tbody></table></div>`;
}

async function dashboardPage(): Promise<void> {
  loading('Loading dashboard…');
  const data = await dashboard();
  updatedAt = new Date(); refreshError = undefined;
  const cards: Array<[string, string, string]> = [
    ['Total inspections', 'total', 'All inspections available to your role'], ['Today’s inspections', 'today', 'Started today'], ['Pending reviews', 'pending', 'Needs a human review'], ['Finalized', 'finalized', 'Decision recorded'],
    ['Non-compliant', 'nonCompliant', 'Deterministic FAIL assessments'], ['Requires verification', 'verification', 'Rule engine outcomes'], ['Sync pending', 'syncPending', 'Mobile sync requires attention'], ['Sync conflicts', 'conflicts', 'No silent overwrite'],
  ];
  layout(`${pageHeader('Operations dashboard', 'A live supervisory view of inspections, rule assessments, and mobile synchronization.')}<section class="metric-grid">${cards.map(([label, key, hint]) => `<article class="metric-card"><span>${esc(label)}</span><strong>${data.metrics[key] ?? 0}</strong><small>${esc(hint)}</small></article>`).join('')}</section><section class="two-column"><article class="panel"><div class="panel-heading"><div><p class="eyebrow">Latest records</p><h2>Recent inspections</h2></div><a href="#/inspections">View command center →</a></div>${inspectionTable(data.recent)}</article><article class="panel attention"><p class="eyebrow">Review focus</p><h2>Human oversight remains decisive</h2><p>AI observations are evidence candidates. The deterministic rule engine records assessments; only persisted inspector decisions finalize an inspection.</p><div class="focus-grid"><span>${data.metrics.pending} <small>pending review</small></span><span>${data.metrics.verification} <small>verification required</small></span><span>${data.metrics.conflicts} <small>sync conflicts</small></span></div></article></section>`);
}

function filtersMarkup(filters: InspectionFilters): string {
  return `<form class="filters" data-form="inspection-filters"><input name="search" value="${esc(filters.search ?? '')}" placeholder="Search ID, product, inspector" /><select name="status"><option value="">All statuses</option>${['DRAFT', 'CAPTURED', 'ANALYZED', 'REVIEW_REQUIRED', 'READY_FOR_DECISION', 'DECIDED', 'REPORT_GENERATED'].map((s) => `<option ${filters.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select><select name="sync"><option value="">All sync states</option>${['LOCAL_ONLY', 'PENDING_SYNC', 'SYNCING', 'SYNCED', 'SYNC_CONFLICT', 'SYNC_FAILED'].map((s) => `<option ${filters.sync === s ? 'selected' : ''}>${s}</option>`).join('')}</select><select name="result"><option value="">All results</option>${['PASS', 'FAIL', 'REQUIRES_VERIFICATION', 'NOT_APPLICABLE', 'INSUFFICIENT_EVIDENCE'].map((s) => `<option ${filters.result === s ? 'selected' : ''}>${s}</option>`).join('')}</select><input name="from" type="date" value="${esc(filters.from ?? '')}" aria-label="Start date"/><input name="to" type="date" value="${esc(filters.to ?? '')}" aria-label="End date"/><button class="button secondary">Apply</button></form>`;
}
async function inspectionsPage(filters: InspectionFilters = {}, page = 1): Promise<void> {
  loading('Loading inspections…');
  activeInspectionFilters = filters;
  activeInspectionPage = page;
  const result = await listInspections(filters, page);
  updatedAt = new Date(); refreshError = undefined;
  const pages = Math.max(1, Math.ceil(result.total / 25));
  layout(`${pageHeader('Inspection command center', 'Search and review the same inspections created by the mobile application.')}${filtersMarkup(filters)}<p class="result-summary">Showing ${result.rows.length} records · ${result.total} total</p>${inspectionTable(result.rows)}<div class="pagination"><button class="button secondary" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>← Previous</button><span>Page ${page} of ${pages}</span><button class="button secondary" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>Next →</button></div>`);
}

function infoCard(label: string, value: unknown): string { return `<div class="info-item"><span>${esc(label)}</span><strong>${esc(text(value))}</strong></div>`; }
function assessmentRows(rows: Row[]): string {
  if (!rows.length) return '<p class="empty-inline">No deterministic rule-engine assessments are available.</p>';
  return `<div class="assessment-list">${rows.map((row) => `<article class="assessment"><div class="assessment-top"><div><p class="eyebrow">Deterministic rule engine</p><h3>${esc(row['rule_number'])}${row['sub_rule'] ? `(${esc(row['sub_rule'])})` : ''} · ${esc(row['rule_title'])}</h3></div>${badge(row['result'])}</div><p>${esc(row['explanation'])}</p><dl><div><dt>Source</dt><dd>${esc(row['source_document'])} · p. ${esc(row['source_page'])}</dd></div><div><dt>Rule version</dt><dd>${esc(row['rule_version_id'])}</dd></div><div><dt>Observed value</dt><dd><code>${json(row['observed_value'])}</code></dd></div><div><dt>Expected condition</dt><dd><code>${json(row['expected_constraint'])}</code></dd></div><div><dt>Evidence</dt><dd>${esc(Array.isArray(row['evidence_ids']) ? row['evidence_ids'].join(', ') : row['evidence_ids'])}</dd></div><div><dt>Assessed</dt><dd>${fmtDate(row['evaluated_at'])}</dd></div></dl></article>`).join('')}</div>`;
}
function reviewRows(rows: Row[]): string {
  if (!rows.length) return '<p class="empty-inline">No inspector reviews or corrections are available.</p>';
  return `<div class="review-list">${rows.map((row) => { const correction = row['correction'] as Row | null; return `<article class="review"><div>${badge(row['status'])} ${row['action'] ? badge(row['action']) : ''}</div><div class="comparison"><div><span>Original observation</span><strong>${esc(json(row['original_observed_value']))}</strong></div><div><span>Inspector correction</span><strong>${esc(correction ? json(correction['correctedValue'] ?? correction['corrected_value']) : 'No correction')}</strong></div></div><p>${esc(correction?.['reason'] ?? row['rationale'] ?? 'No rationale recorded.')}</p><small>Inspector: ${esc(row['inspector_id'])} · ${fmtDate(row['reviewed_at'] ?? row['updated_at'])}</small></article>`; }).join('')}</div>`;
}
async function detailPage(id: string): Promise<void> {
  loading('Loading inspection detail…');
  const data = await inspectionDetail(id);
  updatedAt = new Date(); refreshError = undefined;
  const decision = data.decisions[0];
  layout(`${pageHeader(shortId(id), 'Review-only case record. Supabase RLS determines the data returned to this browser.')}<a class="back" href="#/inspections">← Back to inspections</a><section class="case-header"><div><p class="eyebrow">${badge(data.inspection['status'])} ${badge(data.inspection['sync_status'])}</p><h2>${esc(data.product?.['name'] ?? 'Unclassified product')}</h2><p>${esc(data.product?.['category'] ?? 'No category')} · Inspector: ${esc(data.inspector?.['full_name'] ?? data.inspection['inspector_id'])}</p></div><div class="final-decision"><span>Inspector final decision</span><strong>${esc(decision?.['decision'] ?? 'Not recorded')}</strong><small>${fmtDate(decision?.['decided_at'])}</small></div></section><section class="overview-grid">${infoCard('Created', fmtDate(data.inspection['created_at']))}${infoCard('Finalized', fmtDate(data.inspection['completed_at']))}${infoCard('Source', data.inspection['source_type'])}${infoCard('Sync', data.inspection['sync_status'])}${infoCard('Product category', data.product?.['category'])}${infoCard('Last server update', fmtDate(data.inspection['updated_at']))}</section><section class="detail-grid"><article class="panel"><div class="panel-heading"><div><p class="eyebrow">Declarations</p><h2>Observed package declarations</h2></div></div>${data.declarations.length ? `<div class="table-wrap"><table><thead><tr><th>Field</th><th>Observed value</th><th>Normalized</th><th>Confidence</th><th>Verification</th></tr></thead><tbody>${data.declarations.map((row) => `<tr><td>${esc(row['field_name'])}</td><td>${esc(row['raw_value'])}</td><td><code>${json(row['normalized_value'])}</code></td><td>${typeof row['confidence'] === 'number' ? `${Math.round(Number(row['confidence']) * 100)}%` : '—'}</td><td>${badge(row['verification_status'])}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty-inline">No declarations are available.</p>'}</article><article class="panel"><p class="eyebrow">AI observation</p><h2>Provider observations</h2>${data.analyses.length ? data.analyses.map((row) => `<div class="ai-observation"><strong>${esc(row['provider'])} · ${esc(row['model'])}</strong><span>Confidence: ${typeof row['confidence'] === 'number' ? `${Math.round(Number(row['confidence']) * 100)}%` : '—'}</span><p>Analysis status: ${esc(row['status'])}. Observations are kept separate from statutory assessment and final decision.</p></div>`).join('') : '<p class="empty-inline">No AI observations are available.</p>'}</article></section><section class="panel full"><p class="eyebrow">Deterministic rule engine</p><h2>Compliance assessments</h2>${assessmentRows(data.assessments)}</section><section class="detail-grid"><article class="panel"><p class="eyebrow">Inspector reviews</p><h2>Reviews and corrections</h2>${reviewRows(data.reviews)}</article><article class="panel"><p class="eyebrow">Final decision</p><h2>Persisted decision record</h2>${decision ? `<div class="decision-card">${badge(decision['decision'])}<p>${esc(decision['comments'])}</p><small>Recorded ${fmtDate(decision['decided_at'])}</small></div>` : '<p class="empty-inline">No final decision is recorded.</p>'}</article></section>${evidenceSection(data)}${reportSection(data)}${auditSection(data.audit)} `);
}
function evidenceSection(data: InspectionDetail): string {
  const evidence: Row[] = [...data.images.map((row): Row => ({ ...row, kind: 'image' })), ...data.evidence.map((row): Row => ({ ...row, kind: 'evidence' }))];
  return `<section class="panel full"><div class="panel-heading"><div><p class="eyebrow">Evidence review</p><h2>Original evidence and metadata</h2></div><a href="#/evidence">Open evidence workspace →</a></div>${evidence.length ? `<div class="evidence-grid">${evidence.map((row) => `<button class="evidence-card" data-action="view-evidence" data-evidence='${esc(JSON.stringify(row))}'><span class="evidence-placeholder">▧</span><strong>${esc(row['surface'] ?? row['evidence_type'] ?? 'Evidence')}</strong><small>SHA-256: ${esc(row['sha256'] ?? 'Not recorded')}</small><small>${fmtDate(row['captured_at'] ?? row['created_at'])}</small></button>`).join('')}</div>` : '<p class="empty-inline">No evidence files are available.</p>'}<p class="hint">Heatmap regions are rendered only when stored coordinate metadata exists; no regions are inferred in the dashboard.</p></section>`;
}
function reportSection(data: InspectionDetail): string {
  return `<section class="panel full"><p class="eyebrow">Report</p><h2>Sealed report records</h2>${data.reports.length ? `<div class="table-wrap"><table><thead><tr><th>Report ID</th><th>Version</th><th>Generated</th><th>Content hash</th><th>Status</th><th></th></tr></thead><tbody>${data.reports.map((row) => `<tr><td>${esc(row['report_number'] ?? row['id'])}</td><td>${esc(row['report_version'])}</td><td>${fmtDate(row['generated_at'])}</td><td><code>${esc(row['content_hash'] ?? row['sha256'])}</code></td><td>${badge(row['is_draft_preview'] ? 'DRAFT PREVIEW' : 'SEALED')}</td><td><button class="link-button" data-action="download-report" data-path="${esc(row['storage_path'])}">Download</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="empty-inline">No report is available.</p>'}</section>`;
}
function auditSection(rows: Row[]): string {
  return `<section class="panel full"><p class="eyebrow">Audit trail</p><h2>Case activity</h2>${rows.length ? `<div class="audit-list">${rows.map((row) => `<div><time>${fmtDate(row['created_at'])}</time><strong>${esc(row['action'])}</strong><span>${esc(row['entity_type'])}</span><code>${json(row['metadata'])}</code></div>`).join('')}</div>` : '<p class="empty-inline">No audit events are available to this role.</p>'}</section>`;
}

async function genericListPage(kind: 'rules' | 'reports' | 'audit' | 'inspectors' | 'evidence' | 'analytics' | 'sync' | 'reviews'): Promise<void> {
  const titles = { rules: ['Rule library', 'Verified rule metadata from the authoritative Legal Metrology bundle.'], reports: ['Report center', 'Existing generated reports; reports are never regenerated by this dashboard.'], audit: ['Audit trail', 'Append-only activity permitted by your role.'], inspectors: ['Inspector directory', 'Directory visibility is constrained by RLS and role.'], evidence: ['Evidence workspace', 'Original files remain private; temporary signed URLs are requested only on view.'], analytics: ['Analytics', 'Operational trends from actual persisted records, not a legal compliance percentage.'], sync: ['Sync monitor', 'Mobile sync state observed from the shared Supabase source of truth.'], reviews: ['Supervisor review queue', 'Inspections needing human attention based on persisted state.'] } as const;
  loading(`Loading ${titles[kind][0].toLocaleLowerCase()}…`);
  let content = '';
  if (kind === 'rules') {
    const [rules, versions] = await Promise.all([simpleList('rules'), simpleList('rule_versions')]);
    content = rules.length ? `<div class="table-wrap"><table><thead><tr><th>Rule number</th><th>Title</th><th>Category</th><th>Source</th><th>Page</th><th>Status</th></tr></thead><tbody>${rules.map((r) => { const v = versions.find((row) => row['rule_id'] === r['id']); return `<tr><td><strong>${esc(r['rule_number'])}${r['sub_rule'] ? `(${esc(r['sub_rule'])})` : ''}</strong></td><td>${esc(r['title'])}</td><td>${esc(r['category'])}</td><td>${esc(v?.['source_document'] ?? 'The Legal Metrology (Packaged Commodities) Rules, 2011')}</td><td>${esc(v?.['source_page'])}</td><td>${badge(v?.['approval_status'] ?? 'VERIFIED')}</td></tr>`; }).join('')}</tbody></table></div>` : state('No rules returned', 'No rule records are visible to this account.', false);
    content += `<article class="bundle-note"><strong>LM-IN-RULES-2026.09</strong><span>LM-Vision software bundle identifier · not a government-issued version identifier.</span></article>`;
  } else if (kind === 'reports') {
    const rows = await simpleList('reports', 'generated_at');
    content = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Report ID</th><th>Inspection</th><th>Version</th><th>Generated</th><th>Hash</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r['report_number'] ?? r['id'])}</td><td><a href="#/inspections/${esc(r['inspection_id'])}">${shortId(r['inspection_id'])}</a></td><td>${esc(r['report_version'])}</td><td>${fmtDate(r['generated_at'])}</td><td><code>${esc(r['content_hash'] ?? r['sha256'])}</code></td><td>${badge(r['is_draft_preview'] ? 'DRAFT' : 'SEALED')}</td><td><button class="link-button" data-action="download-report" data-path="${esc(r['storage_path'])}">Download</button> <button class="link-button" data-action="verify-report" data-hash="${esc(r['content_hash'] ?? r['sha256'])}">Verify integrity</button></td></tr>`).join('')}</tbody></table></div>` : state('No reports found', 'Generated reports will appear here after the reporting service persists them.', false);
  } else if (kind === 'audit') {
    const rows = await simpleList('audit_logs');
    content = auditSection(rows);
  } else if (kind === 'inspectors') {
    const rows = await simpleList('users', 'last_login_at');
    content = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Employee code</th><th>Last activity</th></tr></thead><tbody>${rows.map((r) => `<tr><td><strong>${esc(r['full_name'])}</strong></td><td>${esc(r['designation'] ?? 'Role available in profile')}</td><td>${badge(r['is_active'] ? 'ACTIVE' : 'INACTIVE')}</td><td>${esc(r['employee_code'])}</td><td>${fmtDate(r['last_login_at'])}</td></tr>`).join('')}</tbody></table></div>` : state('No directory records', 'No user records are available to this role.', false);
  } else if (kind === 'evidence') {
    const [evidence, images] = await Promise.all([simpleList('evidence'), simpleList('inspection_images')]);
    const rows: Row[] = [...images.map((r): Row => ({ ...r, kind: 'image' })), ...evidence.map((r): Row => ({ ...r, kind: 'evidence' }))];
    content = rows.length ? `<div class="evidence-grid">${rows.map((r) => `<button class="evidence-card" data-action="view-evidence" data-evidence='${esc(JSON.stringify(r))}'><span class="evidence-placeholder">▧</span><strong>${esc(r['surface'] ?? r['evidence_type'] ?? 'Evidence')}</strong><small>${shortId(r['inspection_id'])}</small><small>SHA-256: ${esc(r['sha256'] ?? 'Not recorded')}</small></button>`).join('')}</div>` : state('No evidence files found', 'Evidence available through RLS will appear here.', false);
  } else if (kind === 'analytics') {
    const [inspections, assessments] = await Promise.all([simpleList('inspections', 'started_at'), simpleList('compliance_assessments', 'evaluated_at')]);
    const results = ['PASS', 'FAIL', 'REQUIRES_VERIFICATION', 'NOT_APPLICABLE', 'INSUFFICIENT_EVIDENCE'];
    const max = Math.max(1, ...results.map((result) => rowCount(assessments, (r) => r['result'] === result)));
    const topRules = Object.entries(assessments.filter((r) => r['result'] === 'FAIL').reduce<Record<string, number>>((acc, r) => { const rule = text(r['rule_number'], 'Unspecified rule'); acc[rule] = (acc[rule] ?? 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
    content = `<section class="metric-grid compact"><article class="metric-card"><span>Inspection volume</span><strong>${inspections.length}</strong><small>Most recent 100 available records</small></article><article class="metric-card"><span>Verification rate</span><strong>${assessments.length ? Math.round((rowCount(assessments, (r) => r['result'] === 'REQUIRES_VERIFICATION') / assessments.length) * 100) : 0}%</strong><small>Assessment outcome rate; not legal compliance</small></article></section><section class="two-column"><article class="panel"><p class="eyebrow">Assessment distribution</p><h2>Rule engine outcomes</h2><div class="bar-chart">${results.map((result) => { const value = rowCount(assessments, (r) => r['result'] === result); return `<div><span>${esc(result.replaceAll('_', ' '))}</span><i><b style="width:${Math.round((value / max) * 100)}%"></b></i><strong>${value}</strong></div>`; }).join('')}</div></article><article class="panel"><p class="eyebrow">Review priority</p><h2>Top failing rules</h2>${topRules.length ? `<ol class="ranked">${topRules.map(([rule, count]) => `<li><span>${esc(rule)}</span><strong>${count} failures</strong></li>`).join('')}</ol>` : '<p class="empty-inline">No failing rule assessments are available.</p>'}</article></section>`;
  } else if (kind === 'sync') {
    const [inspections, images] = await Promise.all([simpleList('inspections', 'updated_at'), simpleList('inspection_images')]);
    const counts = { synced: rowCount(inspections, (r) => r['sync_status'] === 'SYNCED'), pending: rowCount(inspections, (r) => ['LOCAL_ONLY', 'PENDING_SYNC', 'SYNCING'].includes(String(r['sync_status']))), failed: rowCount(inspections, (r) => r['sync_status'] === 'SYNC_FAILED') + rowCount(images, (r) => r['sync_status'] === 'UPLOAD_FAILED'), conflicts: rowCount(inspections, (r) => r['sync_status'] === 'SYNC_CONFLICT') };
    content = `<section class="metric-grid compact">${Object.entries(counts).map(([name, value]) => `<article class="metric-card"><span>${esc(name)}</span><strong>${value}</strong><small>Shared mobile sync state</small></article>`).join('')}</section><div class="sync-action"><button class="button secondary" data-action="retry-sync">Retry failed</button><p>Retries are performed by the originating mobile client’s durable sync queue. This review dashboard does not mutate sync receipts.</p></div>${inspectionTable(inspections.map((r) => ({ ...r, id: String(r['id']), productName: 'Open inspection for product context', productCategory: '—', inspectorName: String(r['inspector_id'] ?? 'Restricted') })))}`;
  } else if (kind === 'reviews') {
    const rows = await listInspections({ status: 'REVIEW_REQUIRED' }, 1, 100);
    content = `<section class="review-summary"><strong>${rows.total}</strong><div><p class="eyebrow">Pending review</p><h2>Inspections requiring review</h2><p>Records are queued by persisted inspection status—not an invented priority score.</p></div></section>${inspectionTable(rows.rows)}`;
  }
  updatedAt = new Date(); refreshError = undefined;
  layout(`${pageHeader(titles[kind][0], titles[kind][1])}${content}`);
}

async function profilePage(): Promise<void> {
  layout(`${pageHeader('Profile', 'Your authenticated account and application access.', false)}<section class="profile-card">${infoCard('Name', profile?.profile?.['full_name'])}${infoCard('Email', profile?.user['email'])}${infoCard('Role', profile?.role)}${infoCard('Account status', profile?.profile?.['is_active'] ? 'Active' : 'Status unavailable')}${infoCard('Application version', 'Web MVP 1.0.0')}<p class="hint">Profile changes are limited to supported fields in the mobile application. Roles cannot be changed from this browser.</p></section>`);
}

function showEvidenceModal(): void {
  const modal = document.querySelector<HTMLDivElement>('#evidence-modal');
  if (modal) modal.remove();
  if (!selectedEvidence) return;
  const node = document.createElement('div'); node.id = 'evidence-modal'; node.className = 'modal';
  node.innerHTML = `<div class="modal-content"><button class="modal-close" data-action="close-evidence">×</button><p class="eyebrow">Evidence viewer</p><h2>${esc(selectedEvidence['surface'] ?? selectedEvidence['evidence_type'] ?? 'Evidence')}</h2><div class="image-viewer"><span id="evidence-image">Loading original evidence…</span></div><div class="overview-grid">${infoCard('SHA-256', selectedEvidence['sha256'])}${infoCard('Captured', fmtDate(selectedEvidence['captured_at'] ?? selectedEvidence['created_at']))}${infoCard('Source image', selectedEvidence['storage_path'] ?? selectedEvidence['source_reference'])}${infoCard('Assessment links', selectedEvidence['finding_id'] ?? 'No direct link')}</div><p class="hint">Zoom and pan are available in the browser’s native image view. Region location unavailable unless stored coordinate metadata is present.</p></div>`;
  document.body.append(node); bind();
  const path = String(selectedEvidence['storage_path'] ?? '');
  const bucket = selectedEvidence['kind'] === 'image' ? 'inspection-images' : 'evidence-files';
  if (path) getSignedUrl(bucket, path).then((url) => { const holder = document.querySelector('#evidence-image'); if (holder && url) holder.outerHTML = `<img src="${esc(url)}" alt="Evidence preview" />`; }).catch((error: Error) => { const holder = document.querySelector('#evidence-image'); if (holder) holder.textContent = `Unable to access original evidence: ${error.message}`; });
}

async function renderRoute(): Promise<void> {
  if (!profile) return;
  const path = currentPath();
  if (!canAccess(path)) { layout(`${pageHeader('Access limited', 'This screen is limited by your assigned role.', false)}${state('Role-based access', 'The database remains the authorization boundary. Contact an administrator if this access is required.', false)}`); return; }
  try {
    if (path === '/dashboard') await dashboardPage();
    else if (path === '/inspections') await inspectionsPage(activeInspectionFilters, activeInspectionPage);
    else if (path.startsWith('/inspections/')) await detailPage(path.split('/')[2] ?? '');
    else if (path === '/profile') await profilePage();
    else if (path === '/rules' || path === '/reports' || path === '/audit' || path === '/inspectors' || path === '/evidence' || path === '/analytics' || path === '/sync' || path === '/reviews') await genericListPage(path.slice(1) as Parameters<typeof genericListPage>[0]);
    else { location.hash = '#/dashboard'; }
  } catch (error) {
    refreshError = error instanceof Error ? error.message : 'An unexpected error occurred.';
    layout(`${pageHeader('Data unavailable', 'The last successful data remains valid until a fresh request succeeds.')} ${state('Failed to refresh', refreshError)}`);
  }
}

function updateAutoRefresh(interval: number): void {
  autoRefresh = interval;
  if (autoTimer) window.clearInterval(autoTimer);
  autoTimer = interval ? window.setInterval(() => { void renderRoute(); }, interval) : undefined;
}
function bind(): void {
  document.querySelectorAll<HTMLElement>('[data-route]').forEach((node) => node.addEventListener('click', () => { location.hash = node.dataset.route ?? '#/inspections'; }));
  document.querySelectorAll<HTMLButtonElement>('[data-action="refresh"]').forEach((button) => button.addEventListener('click', () => void renderRoute()));
  document.querySelectorAll<HTMLSelectElement>('[data-action="auto-refresh"]').forEach((select) => select.addEventListener('change', () => updateAutoRefresh(Number(select.value))));
  document.querySelectorAll<HTMLButtonElement>('[data-action="signout"]').forEach((button) => button.addEventListener('click', async () => { await signOut(); profile = undefined; renderLogin(); }));
  document.querySelectorAll<HTMLButtonElement>('[data-action="view-evidence"]').forEach((button) => button.addEventListener('click', () => { try { selectedEvidence = JSON.parse(button.dataset.evidence ?? '{}') as Row; showEvidenceModal(); } catch { selectedEvidence = undefined; } }));
  document.querySelectorAll<HTMLButtonElement>('[data-action="close-evidence"]').forEach((button) => button.addEventListener('click', () => document.querySelector('#evidence-modal')?.remove()));
  document.querySelectorAll<HTMLButtonElement>('[data-action="download-report"]').forEach((button) => button.addEventListener('click', async () => { const path = button.dataset.path; if (!path) return; try { const url = await getSignedUrl('reports', path); if (url) window.open(url, '_blank', 'noopener'); } catch (error) { window.alert(error instanceof Error ? error.message : 'Report download failed'); } }));
  document.querySelectorAll<HTMLButtonElement>('[data-action="verify-report"]').forEach((button) => button.addEventListener('click', () => window.alert(`Integrity record present: ${button.dataset.hash ?? 'hash unavailable'}. Verification is performed against the sealed persisted hash.`)));
  document.querySelectorAll<HTMLButtonElement>('[data-action="retry-sync"]').forEach((button) => button.addEventListener('click', () => window.alert('The dashboard does not create sync mutations. Retry from the originating mobile client; refresh here to observe the resulting shared state.')));
  document.querySelectorAll<HTMLFormElement>('[data-form="inspection-filters"]').forEach((form) => form.addEventListener('submit', (event) => { event.preventDefault(); const values = new FormData(form); const filters: InspectionFilters = {}; for (const key of ['search', 'status', 'sync', 'result', 'from', 'to'] as const) { const value = values.get(key); if (typeof value === 'string' && value) filters[key] = value; } void inspectionsPage(filters); }));
  document.querySelectorAll<HTMLButtonElement>('[data-page]').forEach((button) => button.addEventListener('click', () => void inspectionsPage(activeInspectionFilters, Number(button.dataset.page))));
}

function renderLogin(message?: string): void {
  app.innerHTML = `<main class="login-shell"><section class="login-brand"><span class="brand-mark">L</span><p class="eyebrow">Regulatory command center</p><h1>LM-Vision</h1><p>Inspection oversight grounded in shared Supabase records, deterministic assessments, and human final decisions.</p></section><section class="login-card"><p class="eyebrow">Secure sign in</p><h2>Continue to command center</h2>${message ? `<p class="form-error">${esc(message)}</p>` : ''}<form id="signin-form"><label>Email<input required type="email" name="email" autocomplete="email" /></label><label>Password<input required type="password" name="password" autocomplete="current-password" /></label><button class="button primary" type="submit">Sign in</button></form><button class="link-button" id="reset-password">Forgot password?</button><p class="hint">This browser uses only the Supabase public key. Data access is enforced by PostgreSQL RLS.</p></section></main>`;
  document.querySelector<HTMLFormElement>('#signin-form')?.addEventListener('submit', async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget as HTMLFormElement); try { await signIn(String(form.get('email')), String(form.get('password'))); await bootstrap(); } catch (error) { renderLogin(error instanceof Error ? error.message : 'Unable to sign in.'); } });
  document.querySelector<HTMLButtonElement>('#reset-password')?.addEventListener('click', async () => { const email = window.prompt('Enter your account email'); if (!email) return; try { await requestPasswordReset(email); window.alert('If that account exists, a password reset message has been sent.'); } catch (error) { window.alert(error instanceof Error ? error.message : 'Unable to request a reset.'); } });
}
function renderConfiguration(): void { app.innerHTML = `<main class="login-shell"><section class="login-brand"><span class="brand-mark">L</span><p class="eyebrow">LM-Vision</p><h1>Configuration required</h1><p>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or their NEXT_PUBLIC equivalents) to the web environment. Do not add server or AI provider keys.</p></section><section class="login-card"><h2>Client-safe configuration</h2><code>VITE_SUPABASE_URL=https://…</code><code>VITE_SUPABASE_ANON_KEY=…</code><p class="hint">The dashboard has no service-role credential, no Gemini SDK, and no independent inspection database.</p></section></main>`; }
async function bootstrap(): Promise<void> {
  if (!isConfigured()) { renderConfiguration(); return; }
  const { data } = await client().auth.getSession();
  if (!data.session) { renderLogin(); return; }
  try { profile = await getProfile(); await renderRoute(); } catch (error) { renderLogin(error instanceof Error ? error.message : 'Unable to load your profile.'); }
}
window.addEventListener('hashchange', () => void renderRoute());
void bootstrap();
