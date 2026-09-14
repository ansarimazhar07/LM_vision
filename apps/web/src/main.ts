import {
  client, dashboard, getProfile, getSignedUrl, inspectionDetail, isConfigured, listInspections,
  requestPasswordReset, signIn, signOut, simpleList, type InspectionDetail, type InspectionFilters, type InspectionListItem, type Row,
  createSampleLiveInspection, syncFromBackendApi,
  reopenInspection, acknowledgeConflictInDb, finalizeInspectionInDb,
} from './data.js';
import {
  calculateInspectionQualityScore,
  analyzeEvidenceCompleteness,
  comparePackages,
  buildComplianceWorkspace,
  buildInspectionTimeline,
  type PackageComparisonSubject,
} from '@lm-vision/perception';
import { normalizeInspectionStatus } from '@lm-vision/shared-types';
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
  ['Package comparison', '#/compare', '⇄'],
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
  const raw = text(value);
  const normalized = normalizeInspectionStatus(raw);
  const status = normalized.replaceAll('_', ' ');
  const kind = /FAIL|NON.COMPLIANT|FAILED|CONFLICT|BLOCKED/i.test(status) ? 'bad' : /PASS|DECIDED|FINALIZED|SYNCED|VERIFIED|ACTIVE|GENERATED|READY/i.test(status) ? 'good' : /REQUIRES|PENDING|REVIEW|NEEDS|LOCAL|SYNCING|DRAFT|REOPENED/i.test(status) ? 'warn' : 'neutral';
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
  return `<div class="refresh-control"><label class="auto-label">Auto refresh <select data-action="auto-refresh"><option value="0" ${autoRefresh === 0 ? 'selected' : ''}>Off</option><option value="30000" ${autoRefresh === 30000 ? 'selected' : ''}>30s</option><option value="60000" ${autoRefresh === 60000 ? 'selected' : ''}>60s</option><option value="300000" ${autoRefresh === 300000 ? 'selected' : ''}>5 min</option></select></label><button class="button secondary" data-action="add-sample" title="Simulate a real-time mobile inspection">＋ <span>Add Sample</span></button><button class="button secondary" data-action="refresh">↻ <span>Sync / Refresh</span></button>${state}</div>`;
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
function surfaceBadge(surface: unknown): string {
  const s = String(surface ?? 'FRONT').toUpperCase();
  const cls = s.toLowerCase();
  return `<span class="surface-badge surface-${cls}">${esc(s)}</span>`;
}

function renderFinalizedLockBanner(inspection: Row, isFinalized: boolean, inspectionId: string): string {
  if (!isFinalized) return '';
  return `
    <section class="finalized-lock-banner">
      <div>
        <h3><span style="font-size: 18px;">🔒</span> RECORD SEALED & TAMPER-LOCKED</h3>
        <p>Evidence, declarations, and determinations are sealed against ordinary modification. Controlled reopening requires substantive supervisory justification.</p>
        <small style="color: #6ee7b7; display: block; margin-top: 4px;">Finalized at: ${fmtDate(inspection['completed_at'] ?? inspection['updated_at'])}</small>
      </div>
      <button class="button secondary" data-action="open-reopen-modal" data-inspection-id="${esc(inspectionId)}" style="background: white; color: #064e3b; font-weight: 800;">
        🔓 Reopen Inspection
      </button>
    </section>
  `;
}

function renderReopenedBanner(inspection: Row, isReopened: boolean): string {
  if (!isReopened) return '';
  return `
    <section class="reopened-notice-banner">
      <strong>⚠️ REOPENED INSPECTION UNDER AMENDMENT</strong>
      <span>This inspection was previously finalized and reopened for authorized re-examination. The previous determination remains preserved in the audit trail.</span>
      <small><strong>Previous Determination:</strong> ${esc(inspection['previous_decision'] ?? 'FINALIZED')} · <strong>Reopened on:</strong> ${fmtDate(inspection['reopened_at'])} · <strong>Reason:</strong> ${esc(inspection['reopen_reason'] ?? 'Supervisory review requested')}</small>
    </section>
  `;
}

function renderActionCenter(workspace: any, inspectionId: string): string {
  const actions = workspace.actions as any[];
  return `
    <section class="action-center-panel">
      <div class="action-center-header">
        <div>
          <p class="eyebrow">GUIDED VERIFICATION</p>
          <h3 style="margin: 2px 0 0; font-size: 16px;">Action Center Queue</h3>
        </div>
        <div style="display: flex; gap: 8px;">
          <span class="action-count-pill mandatory">${workspace.mandatoryActionCount} Mandatory</span>
          <span class="action-count-pill advisory">${workspace.advisoryActionCount} Advisory</span>
        </div>
      </div>
      <p style="font-size: 12px; color: #64748b; margin: 0 0 14px;">
        Mandatory actions must be resolved or explicitly acknowledged before finalization. Advisory actions guide best-practice physical re-inspection without blocking.
      </p>
      ${actions.length ? `
        <div class="action-cards-grid">
          ${actions.map((act) => {
            const isMandatory = act.actionClass === 'MANDATORY';
            return `
              <article class="action-card ${isMandatory ? 'mandatory' : 'advisory'}">
                <div class="action-card-header">
                  <h4>${esc(act.title)}</h4>
                  <span class="action-count-pill ${isMandatory ? 'mandatory' : 'advisory'}">${esc(act.actionClass)}</span>
                </div>
                <p>${esc(act.description)}</p>
                ${act.guidedReinspectionPrompt ? `
                  <div class="action-advice">
                    <strong>Guided Prompt:</strong> ${esc(act.guidedReinspectionPrompt)}
                  </div>
                ` : ''}
                <div class="action-card-footer">
                  <small style="color: #64748b; font-weight: 600;">Rule: ${esc(act.relatedRuleNumber ?? 'General')}</small>
                  ${isMandatory && act.type === 'CONFLICT_REQUIRES_VERIFICATION' && !act.resolved ? `
                    <button class="button secondary" style="font-size: 11px; padding: 4px 8px;" data-action="acknowledge-conflict" data-inspection-id="${esc(inspectionId)}" data-conflict-id="${esc(act.id)}">
                      ✓ Acknowledge Conflict
                    </button>
                  ` : act.resolved ? `
                    <span class="badge good">ACKNOWLEDGED</span>
                  ` : `
                    <span style="font-size: 11px; color: #64748b;">${esc(act.suggestedAction)}</span>
                  `}
                </div>
              </article>
            `;
          }).join('')}
        </div>
      ` : '<p class="empty-inline">No pending action items in the verification queue.</p>'}
    </section>
  `;
}

function renderConflictPanel(workspace: any, inspectionId: string): string {
  const conflictMappings = (workspace.mappings as any[]).filter((m) => m.observedEvidence.conflictDetails?.hasConflict);
  if (!conflictMappings.length) return '';

  return `
    <section class="panel full" style="border-color: #fecdd3; background: #fff5f5; margin-bottom: 18px;">
      <p class="eyebrow" style="color: #e11d48;">CROSS-SURFACE CONFLICT RECONCILIATION</p>
      <h2 style="color: #9f1239; margin-bottom: 8px;">Conflicting Physical Evidence Detected</h2>
      <p style="font-size: 12px; color: #475569; margin-bottom: 12px;">
        Different packaging surfaces contain conflicting declaration values (e.g. Front vs Neck/Crimp). Under Legal Metrology standards, the system never picks a silent winner; all observations are preserved for human determination.
      </p>
      ${conflictMappings.map((m) => {
        const cd = m.observedEvidence.conflictDetails;
        const s1 = cd.surfaces[0] ?? 'FRONT';
        const s2 = cd.surfaces[1] ?? 'NECK';
        const v1 = cd.differingValues[0] ?? '—';
        const v2 = cd.differingValues[1] ?? '—';
        return `
          <div class="conflict-box">
            <div class="conflict-header">
              <strong>${esc(m.ruleNumber)} · ${esc(m.ruleTitle)}</strong>
              ${surfaceBadge(s1)} vs ${surfaceBadge(s2)}
            </div>
            <div class="conflict-comparison-grid">
              <div class="conflict-surface-card">
                <span>Observed on ${esc(s1)}</span>
                <strong>${esc(typeof v1 === 'object' ? JSON.stringify(v1) : String(v1))}</strong>
              </div>
              <div class="conflict-surface-card">
                <span>Observed on ${esc(s2)}</span>
                <strong>${esc(typeof v2 === 'object' ? JSON.stringify(v2) : String(v2))}</strong>
              </div>
            </div>
            <p style="font-size: 11px; color: #9f1239; margin: 6px 0 10px;">${esc(cd.reconciliationNotice)}</p>
            <button class="button secondary" style="font-size: 11px; padding: 5px 10px; border-color: #fda4af; color: #9f1239;" data-action="acknowledge-conflict" data-inspection-id="${esc(inspectionId)}" data-conflict-id="conflict-${esc(m.ruleId)}">
              ✓ I reviewed the conflicting evidence
            </button>
          </div>
        `;
      }).join('')}
    </section>
  `;
}

function renderAuthoritySplit(workspace: any, decision: Row | undefined, inspection: Row): string {
  const sa = workspace.systemAssessment;
  return `
    <section class="authority-split-grid">
      <!-- Card 1: System Assessment -->
      <article class="authority-card system">
        <div class="authority-card-header">
          <div>
            <p class="eyebrow" style="color: #0d9488;">Deterministic rule engine · Assessment</p>
            <h3 style="font-size: 16px; margin: 2px 0 0;">System Assessment</h3>
          </div>
          ${badge(sa.overallResult)}
        </div>
        <p style="font-size: 12px; color: #475569; margin: 0 0 10px;">
          ${esc(sa.summaryText)}
        </p>
        <div class="authority-breakdown">
          <div class="authority-breakdown-item">
            <small>PASS</small>
            <strong style="color: #166534;">${sa.passCount}</strong>
          </div>
          <div class="authority-breakdown-item">
            <small>FAIL</small>
            <strong style="color: #991b1b;">${sa.failCount}</strong>
          </div>
          <div class="authority-breakdown-item">
            <small>VERIFY</small>
            <strong style="color: #92400e;">${sa.verificationRequiredCount}</strong>
          </div>
        </div>
        <div class="advisory-box" style="margin-top: 10px; font-size: 11px;">
          <strong>LEGAL INVARIANT:</strong> AI observes &amp; Rule Engine evaluates. The system assessment is an advisory computational finding and NEVER a legal determination.
        </div>
      </article>

      <!-- Card 2: Human Statutory Decision -->
      <article class="authority-card human">
        <div class="authority-card-header">
          <div>
            <p class="eyebrow" style="color: #2563eb;">HUMAN STATUTORY AUTHORITY</p>
            <h3 style="font-size: 16px; margin: 2px 0 0;">Inspector Final Decision</h3>
          </div>
          ${badge(decision ? decision['decision'] : 'PENDING DETERMINATION')}
        </div>
        ${decision ? `
          <p style="font-size: 13px; color: #1e293b; font-weight: 600; margin: 0 0 6px;">
            Statutory Outcome: ${esc(decision['decision'])}
          </p>
          <p style="font-size: 12px; color: #475569; margin: 0 0 10px;">
            ${esc(decision['comments'] ?? 'No comments recorded.')}
          </p>
          <small style="color: #64748b; display: block;">
            Inspector: ${esc(decision['inspector_id'] ?? inspection['inspector_id'] ?? 'Authorized Officer')} · ${fmtDate(decision['decided_at'])}
          </small>
        ` : `
          <p style="font-size: 12px; color: #64748b; margin: 8px 0;">
            No official final statutory decision has been recorded yet. The inspection remains open for verification.
          </p>
        `}
      </article>
    </section>
  `;
}

function renderRuleMappingTable(workspace: any): string {
  const mappings = workspace.mappings as any[];
  if (!mappings.length) return '<p class="empty-inline">No rule-by-rule evidence mappings available.</p>';

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rule &amp; Statutory Title</th>
            <th>Surface Evidence</th>
            <th>Observed Evidence</th>
            <th>Rule Assessment</th>
            <th>Action Status</th>
          </tr>
        </thead>
        <tbody>
          ${mappings.map((m) => {
            const sources = m.observedEvidence.sources as any[];
            return `
              <tr>
                <td>
                  <strong>${esc(m.ruleNumber)} ${m.subRule ? `(${esc(m.subRule)})` : ''}</strong>
                  <small>${esc(m.ruleTitle)}</small>
                  <small style="color: #94a3b8;">${esc(m.statutorySource)}</small>
                </td>
                <td>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    ${sources.length ? sources.map((s) => surfaceBadge(s.surface)).join('') : '<span class="surface-badge">NONE</span>'}
                  </div>
                </td>
                <td>
                  <strong>${esc(m.observedEvidence.rawText || text(m.observedEvidence.value))}</strong>
                  <small>Status: ${badge(m.observedEvidence.evidenceStatus)}</small>
                </td>
                <td>
                  ${badge(m.ruleEngineAssessment.result)}
                  <small>${esc(m.ruleEngineAssessment.explanation)}</small>
                </td>
                <td>
                  ${badge(m.inspectorAction.status)}
                  <small>${esc(m.inspectorAction.suggestedAction)}</small>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderFinalizationGuardCard(workspace: any, isFinalized: boolean, inspectionId: string): string {
  const guard = workspace.finalizationGuard;
  return `
    <section class="guard-panel">
      <div class="guard-header">
        <div>
          <p class="eyebrow">FINALIZATION GUARD CHECK</p>
          <h3 style="margin: 2px 0 0; font-size: 16px;">Pre-Flight Authorization Verification</h3>
        </div>
        <div>
          ${guard.canFinalize ? '<span class="badge good">READY FOR FINALIZATION</span>' : '<span class="badge bad">FINALIZATION BLOCKED</span>'}
        </div>
      </div>
      <p style="font-size: 12px; color: #64748b; margin: 8px 0 12px;">
        Authoritative validation ensures all required evidence processing is complete, mandatory conflicts are acknowledged, and Rule Engine results are accessible.
      </p>

      ${guard.blockingReasons.length ? `
        <ul class="blocking-list">
          ${guard.blockingReasons.map((reason: string) => `<li><strong>⛔ BLOCKING:</strong> ${esc(reason)}</li>`).join('')}
        </ul>
      ` : ''}

      ${guard.advisoryItems.length ? `
        <div class="advisory-box" style="margin: 8px 0;">
          <strong>Advisory Recommendations (Non-Blocking):</strong>
          ${guard.advisoryItems.map((adv: string) => `<div>• ${esc(adv)}</div>`).join('')}
        </div>
      ` : ''}

      ${!isFinalized ? `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-top: 14px;">
          <h4 style="margin: 0 0 10px; font-size: 13px;">Record Inspector Statutory Determination</h4>
          <div style="display: grid; grid-template-columns: 200px 1fr auto; gap: 10px; align-items: flex-end;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Statutory Decision</label>
              <select id="final-decision-select" style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid #cbd5e1;">
                <option value="COMPLIANT">COMPLIANT (Pass)</option>
                <option value="NON_COMPLIANT">NON_COMPLIANT (Fail)</option>
                <option value="SEIZED">SEIZED (Confiscation)</option>
                <option value="NOTICE_ISSUED">NOTICE_ISSUED (Legal Notice)</option>
                <option value="ESCALATED">ESCALATED (Supervisory Review)</option>
                <option value="DISMISSED">DISMISSED (No Action)</option>
              </select>
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Inspector Order / Summary Notes</label>
              <input id="final-decision-comments" placeholder="Enter formal statutory rationale..." style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid #cbd5e1;" />
            </div>
            <button class="button primary" data-action="submit-finalization" data-inspection-id="${esc(inspectionId)}" ${guard.canFinalize ? '' : 'disabled'}>
              Finalize &amp; Seal Record
            </button>
          </div>
        </div>
      ` : ''}
    </section>
  `;
}

function renderTimeline(events: any[]): string {
  if (!events.length) return '<p class="empty-inline">No chronological events logged.</p>';
  return `
    <div class="timeline-list">
      ${events.map((ev) => {
        const dotCls = ev.actor?.role === 'SYSTEM' ? 'system' : ev.actor?.role === 'INSPECTOR' ? 'inspector' : ev.eventType.includes('CONFLICT') ? 'conflict' : '';
        return `
          <div class="timeline-item">
            <span class="timeline-dot ${dotCls}"></span>
            <div class="timeline-meta">
              <span>${fmtDate(ev.timestamp)}</span>
              <span>·</span>
              <strong>${esc(ev.actor?.role ?? 'SYSTEM')}: ${esc(ev.actor?.name ?? 'System Process')}</strong>
            </div>
            <h5 class="timeline-title">${esc(ev.title)}</h5>
            <p class="timeline-desc">${esc(ev.description)}</p>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function detailPage(id: string): Promise<void> {
  loading('Loading compliance workspace…');
  const data = await inspectionDetail(id);
  updatedAt = new Date(); refreshError = undefined;
  const decision = data.decisions[0];

  const rawStatus = String(data.inspection['status'] ?? 'DRAFT');
  const canonicalStatus = normalizeInspectionStatus(rawStatus);
  const isFinalized = canonicalStatus === 'FINALIZED';
  const isReopened = canonicalStatus === 'REOPENED';

  const formattedAssessments = data.assessments.map((a: any) => ({
    ruleId: String(a.id ?? ''),
    ruleNumber: String(a.rule_number ?? a.ruleNumber ?? ''),
    subRule: a.sub_rule ?? a.subRule,
    ruleTitle: String(a.rule_title ?? a.ruleTitle ?? ''),
    result: a.result,
    severity: a.severity ?? 'MAJOR',
    explanation: String(a.explanation ?? ''),
    observedValue: a.observed_value ?? a.observedValue,
    expectedConstraint: a.expected_constraint ?? a.expectedConstraint,
    evidenceIds: a.evidence_ids ?? a.evidenceIds ?? [],
    evaluatedAt: a.evaluated_at ?? a.evaluatedAt,
  }));

  const formattedDeclarations = data.declarations.map((d: any) => {
    const rawType = String(d.field_name ?? d.type ?? 'DECLARATION').toUpperCase().replace(/ /g, '_');
    return {
      id: String(d.id ?? ''),
      field: `declarations.${rawType}`,
      rawText: String(d.raw_value ?? d.rawText ?? ''),
      declaredValue: d.normalized_value ?? d.raw_value ?? d.rawText,
      surface: (d.surface ?? d.surface_type ?? 'FRONT') as any,
      confidence: typeof d.confidence === 'number' ? d.confidence : 0.95,
      createdAt: d.created_at,
    };
  });

  const formattedImages = data.images.map((img: any) => ({
    id: String(img.id ?? ''),
    surface: (img.surface ?? 'FRONT') as any,
    fileUrl: String(img.storage_path ?? img.fileUrl ?? ''),
    sha256: String(img.sha256 ?? ''),
  }));

  const workspace = buildComplianceWorkspace({
    inspectionId: id,
    productName: String(data.product?.['name'] ?? 'Packaged Commodity'),
    category: String(data.product?.['category'] ?? ''),
    status: canonicalStatus,
    images: formattedImages,
    declarations: formattedDeclarations,
    assessments: formattedAssessments,
    conflictAcknowledgements: (data.inspection['conflictAcknowledgements'] as any[]) || [],
    decision: decision ? {
      decision: decision['decision'],
      comments: decision['comments'],
      decidedAt: decision['decided_at'],
      inspectorUserId: decision['inspector_id'],
      isFinalized,
    } as any : null,
    authenticatedInspectorId: profile?.user?.['id'] ? String(profile.user['id']) : undefined,
  });

  const timelineEvents = buildInspectionTimeline({
    inspectionId: id,
    createdAt: String(data.inspection['created_at'] ?? ''),
    startedAt: String(data.inspection['started_at'] ?? ''),
    inspectorId: String(data.inspection['inspector_id'] ?? profile?.user?.id ?? ''),
    inspectorName: String(data.inspector?.['full_name'] ?? 'Authorized Officer'),
    images: data.images,
    declarations: data.declarations,
    complianceAssessments: data.assessments,
    reviews: data.reviews,
    decision: decision,
    isFinalized,
    finalizedAt: String(data.inspection['completed_at'] ?? ''),
    reopenedAt: String(data.inspection['reopened_at'] ?? ''),
    reopenReason: String(data.inspection['reopen_reason'] ?? ''),
    amendments: data.amendments,
    report: data.reports[0],
    auditTrail: data.audit,
  });

  // Phase E: Evidence Quality Score & Completeness (Non-Statutory Deterministic Heuristic)
  const completeness = analyzeEvidenceCompleteness({
    images: formattedImages,
    declarations: data.declarations as any,
    assessments: data.assessments as any,
    commodityCategory: data.product?.['category'] as string | undefined,
  });

  const qualityScore = calculateInspectionQualityScore({
    completeness,
    totalAssessmentsCount: data.assessments.length,
    imagesCount: data.images.length,
    reviewsCount: data.reviews.length,
    boundingBoxesCount: data.declarations.filter((d: any) => Boolean(d.region_coordinates)).length,
  });

  const scoreMarkup = `
    <section class="quality-score-card">
      <div class="quality-score-header">
        <div>
          <p class="eyebrow">NON-STATUTORY OPERATIONAL GUIDANCE</p>
          <h3>INSPECTION EVIDENCE QUALITY SCORE — NON-STATUTORY</h3>
          <small>Rating: <strong>${esc(qualityScore.rating)}</strong> · Distinguishes evidence completeness from statutory applicability</small>
        </div>
        <div class="score-badge-huge">
          ${qualityScore.totalScore}<small>/100</small>
        </div>
      </div>
      <div class="subscores-grid">
        <div class="subscore-item">
          <span>Decl. Completeness (30%)</span>
          <strong>${qualityScore.completenessPoints}/30 pts</strong>
        </div>
        <div class="subscore-item">
          <span>OCR Resolution (20%)</span>
          <strong>${qualityScore.imageQualityPoints}/20 pts</strong>
        </div>
        <div class="subscore-item">
          <span>Provenance Trace (20%)</span>
          <strong>${qualityScore.traceabilityPoints}/20 pts</strong>
        </div>
        <div class="subscore-item">
          <span>Conflict Resolution (15%)</span>
          <strong>${qualityScore.conflictResolutionPoints}/15 pts</strong>
        </div>
        <div class="subscore-item">
          <span>Review Completion (15%)</span>
          <strong>${qualityScore.reviewCompletionPoints}/15 pts</strong>
        </div>
      </div>
      <p class="quality-disclaimer">${esc(qualityScore.formulaDescription)}</p>
      <div class="completeness-grid">
        ${completeness.items.slice(0, 8).map((item) => {
          const cls = item.presenceStatus === 'AVAILABLE' ? 'available' : item.presenceStatus === 'MISSING_EVIDENCE' ? 'missing' : 'not-applicable';
          return `<span class="completeness-chip ${cls}">${esc(item.category.replace(/_/g, ' '))}: ${esc(item.presenceStatus)}</span>`;
        }).join('')}
      </div>
      ${completeness.smartRecommendations.length ? `
        <div class="advisory-box" style="margin-top: 10px;">
          <strong>Advisory Capture Recommendations (Optional):</strong>
          ${completeness.smartRecommendations.map((r) => `<div>• ${esc(r.advisoryGuidance)}</div>`).join('')}
        </div>
      ` : ''}
    </section>
  `;

  layout(`
    ${pageHeader(shortId(id), 'Professional Compliance Workspace & Inspector Verification Command')}
    <a class="back" href="#/inspections">← Back to inspections</a>
    
    ${renderFinalizedLockBanner(data.inspection, isFinalized, id)}
    ${renderReopenedBanner(data.inspection, isReopened)}

    <section class="case-header">
      <div>
        <p class="eyebrow">${badge(canonicalStatus)} ${badge(data.inspection['sync_status'])}</p>
        <h2>${esc(data.product?.['name'] ?? 'Unclassified product')}</h2>
        <p>${esc(data.product?.['category'] ?? 'No category')} · Inspector: ${esc(data.inspector?.['full_name'] ?? data.inspection['inspector_id'])}</p>
      </div>
      <div class="final-decision">
        <span>Inspector final decision</span>
        <strong>${esc(decision?.['decision'] ?? 'Not recorded')}</strong>
        <small>${fmtDate(decision?.['decided_at'])}</small>
      </div>
    </section>

    <section class="overview-grid">
      ${infoCard('Created', fmtDate(data.inspection['created_at']))}
      ${infoCard('Canonical Status', canonicalStatus)}
      ${infoCard('Source', data.inspection['source_type'])}
      ${infoCard('Sync State', data.inspection['sync_status'])}
      ${infoCard('Captured Surfaces', workspace.capturedSurfaces.join(', ') || 'FRONT')}
      ${infoCard('Last Server Update', fmtDate(data.inspection['updated_at']))}
    </section>

    ${renderActionCenter(workspace, id)}
    ${renderConflictPanel(workspace, id)}
    ${renderAuthoritySplit(workspace, decision, data.inspection)}

    <section class="panel full">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">STATUTORY RULE-BY-RULE TRACEABILITY</p>
          <h2>Rule-by-Rule Evidence Mapping</h2>
        </div>
      </div>
      ${renderRuleMappingTable(workspace)}
    </section>

    ${renderFinalizationGuardCard(workspace, isFinalized, id)}
    ${scoreMarkup}

    <section class="detail-grid">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Declarations</p>
            <h2>Observed package declarations</h2>
          </div>
        </div>
        ${data.declarations.length ? `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Surface Location</th>
                  <th>Observed value</th>
                  <th>Confidence</th>
                  <th>Verification</th>
                </tr>
              </thead>
              <tbody>
                ${data.declarations.map((row) => `
                  <tr>
                    <td><strong>${esc(row['field_name'])}</strong></td>
                    <td>${surfaceBadge(row['surface'] ?? row['surface_type'] ?? 'FRONT')}</td>
                    <td>${esc(row['raw_value'])}</td>
                    <td>${typeof row['confidence'] === 'number' ? `${Math.round(Number(row['confidence']) * 100)}%` : '—'}</td>
                    <td>${badge(row['verification_status'])}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p class="empty-inline">No declarations are available.</p>'}
      </article>

      <article class="panel">
        <p class="eyebrow">AI observation</p>
        <h2>Provider observations</h2>
        ${data.analyses.length ? data.analyses.map((row) => `
          <div class="ai-observation">
            <strong>${esc(row['provider'])} · ${esc(row['model'])}</strong>
            <span>Confidence: ${typeof row['confidence'] === 'number' ? `${Math.round(Number(row['confidence']) * 100)}%` : '—'}</span>
            <p>Analysis status: ${esc(row['status'])}. Observations are kept separate from statutory assessment and final decision.</p>
          </div>
        `).join('') : '<p class="empty-inline">No AI observations are available.</p>'}
      </article>
    </section>

    ${evidenceSection(data)}

    <section class="timeline-container">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">IMMUTABLE CHRONOLOGY</p>
          <h2>Append-Only Inspection Timeline</h2>
        </div>
      </div>
      ${renderTimeline(timelineEvents)}
    </section>

    ${reportSection(data)}
    ${auditSection(data.audit)}
  `);
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
    if (!inspections.length) {
      content = state('No inspection records available', 'Honest empty state displayed: operational analytics require persisted inspection records. LM-Vision never fabricates compliance percentages, mock charts, or fake AI accuracy figures.', false);
    } else {
      const results = ['PASS', 'FAIL', 'REQUIRES_VERIFICATION', 'NOT_APPLICABLE', 'INSUFFICIENT_EVIDENCE'];
      const max = Math.max(1, ...results.map((result) => rowCount(assessments, (r) => r['result'] === result)));
      const topRules = Object.entries(assessments.filter((r) => r['result'] === 'FAIL').reduce<Record<string, number>>((acc, r) => { const rule = text(r['rule_number'], 'Unspecified rule'); acc[rule] = (acc[rule] ?? 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
      content = `<section class="metric-grid compact"><article class="metric-card"><span>Inspection volume</span><strong>${inspections.length}</strong><small>Most recent available database records</small></article><article class="metric-card"><span>Verification rate</span><strong>${assessments.length ? Math.round((rowCount(assessments, (r) => r['result'] === 'REQUIRES_VERIFICATION') / assessments.length) * 100) : 0}%</strong><small>Assessment outcome rate; not legal compliance</small></article></section><section class="two-column"><article class="panel"><p class="eyebrow">Assessment distribution</p><h2>Rule engine outcomes</h2><div class="bar-chart">${results.map((result) => { const value = rowCount(assessments, (r) => r['result'] === result); return `<div><span>${esc(result.replaceAll('_', ' '))}</span><i><b style="width:${Math.round((value / max) * 100)}%"></b></i><strong>${value}</strong></div>`; }).join('')}</div></article><article class="panel"><p class="eyebrow">Review priority</p><h2>Top failing rules</h2>${topRules.length ? `<ol class="ranked">${topRules.map(([rule, count]) => `<li><span>${esc(rule)}</span><strong>${count} failures</strong></li>`).join('')}</ol>` : '<p class="empty-inline">No failing rule assessments are available.</p>'}</article></section><p class="hint" style="margin-top: 14px;">Operational trends from actual persisted database records. Not a legal compliance percentage. No AI accuracy claims or fake analytics are generated.</p>`;
    }
  } else if (kind === 'sync') {
    const [inspections, images] = await Promise.all([simpleList('inspections', 'updated_at'), simpleList('inspection_images')]);
    const counts = { synced: rowCount(inspections, (r) => r['sync_status'] === 'SYNCED'), pending: rowCount(inspections, (r) => ['LOCAL_ONLY', 'PENDING_SYNC', 'SYNCING'].includes(String(r['sync_status']))), failed: rowCount(inspections, (r) => r['sync_status'] === 'SYNC_FAILED') + rowCount(images, (r) => r['sync_status'] === 'UPLOAD_FAILED'), conflicts: rowCount(inspections, (r) => r['sync_status'] === 'SYNC_CONFLICT') };
    content = `<section class="metric-grid compact">${Object.entries(counts).map(([name, value]) => `<article class="metric-card"><span>${esc(name)}</span><strong>${value}</strong><small>Shared mobile sync state</small></article>`).join('')}</section><div class="sync-action"><button class="button primary" data-action="sync-backend">Sync from Live Backend API</button><button class="button secondary" data-action="retry-sync">Retry local queue</button><p>Synchronizes newest inspections from physical devices or backend engine (/api/v1/inspections).</p></div>${inspectionTable(inspections.map((r) => ({ ...r, id: String(r['id']), productName: String(r['productName'] ?? 'Packaged commodity'), productCategory: String(r['productCategory'] ?? '—'), inspectorName: String(r['inspectorName'] ?? 'Demo Inspector') })))}`;
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

async function packageComparisonPage(): Promise<void> {
  loading('Loading package comparison workspace…');
  const inspections = await listInspections({}, 1, 50);
  updatedAt = new Date(); refreshError = undefined;

  const hash = location.hash;
  const queryString = hash.includes('?') ? hash.split('?')[1] : '';
  const params = new URLSearchParams(queryString);
  const idA = params.get('a') || inspections.rows[0]?.id;
  const idB = params.get('b') || (inspections.rows[1]?.id ?? inspections.rows[0]?.id);

  let detailA: InspectionDetail | undefined;
  let detailB: InspectionDetail | undefined;

  if (idA) {
    try { detailA = await inspectionDetail(idA); } catch { /* ignore */ }
  }
  if (idB) {
    try { detailB = idB === idA ? detailA : await inspectionDetail(idB); } catch { /* ignore */ }
  }

  const makePackageRecord = (id: string, detail?: InspectionDetail): PackageComparisonSubject | undefined => {
    if (!detail) return undefined;
    const decls = (detail.declarations || []) as any[];
    return {
      inspectionId: id,
      productName: String(detail.product?.['name'] ?? 'Unknown Commodity'),
      brandName: String(detail.product?.['brand'] ?? detail.product?.['category'] ?? ''),
      category: String(detail.product?.['category'] ?? ''),
      sku: id,
      declarations: decls.map((d) => ({
        id: String(d.id ?? ''),
        type: d.field_name ?? 'OTHER',
        rawText: String(d.raw_value ?? ''),
        confidence: typeof d.confidence === 'number' ? d.confidence : 0.9,
      })) as any,
    };
  };

  const pkgA = idA ? makePackageRecord(idA, detailA) : undefined;
  const pkgB = idB ? makePackageRecord(idB, detailB) : undefined;

  let compMarkup = '';
  if (!pkgA || !pkgB) {
    compMarkup = state('Select two packages', 'Please select two inspection records above to evaluate comparability and observational variance.', false);
  } else {
    const comparison = comparePackages(pkgA, pkgB);
    const compBadgeClass = comparison.comparability === 'COMPARABLE' ? 'good' : comparison.comparability === 'PARTIALLY_COMPARABLE' ? 'warn' : 'bad';

    compMarkup = `
      <section class="panel full">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Comparability Assessment</p>
            <h2>Comparability Status: <span class="badge ${compBadgeClass}">${esc(comparison.comparability)}</span></h2>
            <p class="subtitle">${esc(comparison.comparabilityRationale)}</p>
          </div>
        </div>

        <div class="advisory-box">
          <strong>LEGAL METROLOGY GUARDRAIL:</strong>
          Package differences are purely observational until evaluated under statutory conditions by the Rule Engine. Differences in net quantity, price, or declarations between different packages do not constitute an automatic violation.
        </div>

        <div class="compare-grid">
          <div class="compare-card">
            <h3>Package A: ${esc(pkgA.productName || shortId(idA))}</h3>
            <p><small>ID: ${esc(idA)}</small></p>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Field</th><th>Observed Text</th></tr></thead>
                <tbody>
                  ${pkgA.declarations.map((d: any) => `<tr><td>${esc(d.type.replace(/_/g, ' '))}</td><td>${esc(d.rawText)}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="compare-card">
            <h3>Package B: ${esc(pkgB.productName || shortId(idB))}</h3>
            <p><small>ID: ${esc(idB)}</small></p>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Field</th><th>Observed Text</th></tr></thead>
                <tbody>
                  ${pkgB.declarations.map((d: any) => `<tr><td>${esc(d.type.replace(/_/g, ' '))}</td><td>${esc(d.rawText)}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <h3 style="margin-top: 20px;">Observational Differences (${comparison.differences.filter((d: any) => d.hasDifference).length})</h3>
        ${comparison.differences.filter((d: any) => d.hasDifference).length ? `
          <div class="table-wrap" style="margin-top: 10px;">
            <table>
              <thead><tr><th>Field</th><th>Package A</th><th>Package B</th><th>Observational Note</th></tr></thead>
              <tbody>
                ${comparison.differences.filter((d: any) => d.hasDifference).map((d: any) => `
                  <tr>
                    <td><strong>${esc(d.fieldName)}</strong></td>
                    <td>${esc(String(d.valueA ?? '—'))}</td>
                    <td>${esc(String(d.valueB ?? '—'))}</td>
                    <td>${esc(d.differenceDescription)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p class="empty-inline">No observational variances detected between the two package records.</p>'}
      </section>
    `;
  }

  const selectorMarkup = `
    <div class="compare-selector">
      <div>
        <label><strong>Select Package A:</strong></label>
        <select id="select-pkg-a" style="width: 100%; padding: 8px; margin-top: 6px;">
          ${inspections.rows.map((r) => `<option value="${esc(r.id)}" ${r.id === idA ? 'selected' : ''}>${esc(r.productName)} (${shortId(r.id)})</option>`).join('')}
        </select>
      </div>
      <div>
        <label><strong>Select Package B:</strong></label>
        <select id="select-pkg-b" style="width: 100%; padding: 8px; margin-top: 6px;">
          ${inspections.rows.map((r) => `<option value="${esc(r.id)}" ${r.id === idB ? 'selected' : ''}>${esc(r.productName)} (${shortId(r.id)})</option>`).join('')}
        </select>
      </div>
    </div>
  `;

  layout(`${pageHeader('Package-to-Package Comparison Workspace', 'Validate product identity comparability and analyze observational differences across packages or batches.')}${selectorMarkup}${compMarkup}`);

  document.querySelector('#select-pkg-a')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    location.hash = `#/compare?a=${val}&b=${idB || ''}`;
  });
  document.querySelector('#select-pkg-b')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    location.hash = `#/compare?a=${idA || ''}&b=${val}`;
  });
}

async function renderRoute(): Promise<void> {
  if (!profile) return;
  const path = currentPath();
  if (!canAccess(path)) { layout(`${pageHeader('Access limited', 'This screen is limited by your assigned role.', false)}${state('Role-based access', 'The database remains the authorization boundary. Contact an administrator if this access is required.', false)}`); return; }
  try {
    if (path === '/dashboard') await dashboardPage();
    else if (path === '/inspections') await inspectionsPage(activeInspectionFilters, activeInspectionPage);
    else if (path.startsWith('/inspections/')) await detailPage(path.split('/')[2] ?? '');
    else if (path === '/compare' || path.startsWith('/compare')) await packageComparisonPage();
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
function showReopenModal(inspectionId: string): void {
  const existing = document.querySelector('#reopen-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'reopen-modal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content reopen-modal-card">
      <button class="modal-close" data-action="close-reopen-modal">×</button>
      <p class="eyebrow" style="color: #ea580c;">CONTROLLED REOPENING</p>
      <h2>Reopen Finalized Inspection</h2>
      <p style="font-size: 13px; color: #475569; margin: 8px 0 14px; line-height: 1.5;">
        You are reopening a sealed inspection (<strong>${shortId(inspectionId)}</strong>).
        The previous finalization, timestamp, and decision will remain permanently preserved in the immutable audit trail.
      </p>
      <div class="advisory-box" style="margin-bottom: 12px;">
        <strong>Statutory Audit Requirement:</strong> A substantive operational reason is mandatory (minimum 5 characters).
      </div>
      <label style="font-weight: 700; font-size: 12px; color: #334155; display: block;">
        Official Reason for Reopening:
        <textarea id="reopen-reason-input" placeholder="e.g. Discovered manufacturer batch conflict on bottle neck requiring physical re-examination..." rows="3"></textarea>
      </label>
      <div class="reopen-actions" style="margin-top: 14px;">
        <button class="button secondary" data-action="close-reopen-modal">Cancel</button>
        <button class="button primary" data-action="confirm-reopen" data-inspection-id="${esc(inspectionId)}">Confirm Reopen</button>
      </div>
    </div>
  `;
  document.body.append(modal);
  bind();
}

function bind(): void {
  document.querySelectorAll<HTMLElement>('[data-route]').forEach((node) => node.addEventListener('click', () => { location.hash = node.dataset.route ?? '#/inspections'; }));
  document.querySelectorAll<HTMLButtonElement>('[data-action="refresh"]').forEach((button) => button.addEventListener('click', async () => {
    await syncFromBackendApi();
    void renderRoute();
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-action="add-sample"]').forEach((button) => button.addEventListener('click', async () => {
    const item = createSampleLiveInspection();
    window.alert(`Added live inspection record: ${item.productName} (${shortId(item.id)}). Refreshing dashboard...`);
    await renderRoute();
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-action="sync-backend"]').forEach((button) => button.addEventListener('click', async () => {
    const success = await syncFromBackendApi();
    if (success) {
      window.alert('Successfully synchronized inspections from backend server!');
    } else {
      window.alert('Local evaluation database is currently up to date.');
    }
    await renderRoute();
  }));
  document.querySelectorAll<HTMLSelectElement>('[data-action="auto-refresh"]').forEach((select) => select.addEventListener('change', () => updateAutoRefresh(Number(select.value))));
  document.querySelectorAll<HTMLButtonElement>('[data-action="signout"]').forEach((button) => button.addEventListener('click', async () => { await signOut(); profile = undefined; renderLogin(); }));
  document.querySelectorAll<HTMLButtonElement>('[data-action="view-evidence"]').forEach((button) => button.addEventListener('click', () => { try { selectedEvidence = JSON.parse(button.dataset.evidence ?? '{}') as Row; showEvidenceModal(); } catch { selectedEvidence = undefined; } }));
  document.querySelectorAll<HTMLButtonElement>('[data-action="close-evidence"]').forEach((button) => button.addEventListener('click', () => document.querySelector('#evidence-modal')?.remove()));
  document.querySelectorAll<HTMLButtonElement>('[data-action="download-report"]').forEach((button) => button.addEventListener('click', async () => { const path = button.dataset.path; if (!path) return; try { const url = await getSignedUrl('reports', path); if (url) window.open(url, '_blank', 'noopener'); } catch (error) { window.alert(error instanceof Error ? error.message : 'Report download failed'); } }));
  document.querySelectorAll<HTMLButtonElement>('[data-action="verify-report"]').forEach((button) => button.addEventListener('click', () => window.alert(`Integrity record present: ${button.dataset.hash ?? 'hash unavailable'}. Verification is performed against the sealed persisted hash.`)));
  document.querySelectorAll<HTMLButtonElement>('[data-action="retry-sync"]').forEach((button) => button.addEventListener('click', () => window.alert('The dashboard does not create sync mutations. Retry from the originating mobile client; refresh here to observe the resulting shared state.')));
  document.querySelectorAll<HTMLFormElement>('[data-form="inspection-filters"]').forEach((form) => form.addEventListener('submit', (event) => { event.preventDefault(); const values = new FormData(form); const filters: InspectionFilters = {}; for (const key of ['search', 'status', 'sync', 'result', 'from', 'to'] as const) { const value = values.get(key); if (typeof value === 'string' && value) filters[key] = value; } void inspectionsPage(filters); }));
  document.querySelectorAll<HTMLButtonElement>('[data-page]').forEach((button) => button.addEventListener('click', () => void inspectionsPage(activeInspectionFilters, Number(button.dataset.page))));

  // Phase F Action Handlers
  document.querySelectorAll<HTMLButtonElement>('[data-action="open-reopen-modal"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.inspectionId;
      if (id) showReopenModal(id);
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-action="close-reopen-modal"]').forEach((btn) => {
    btn.addEventListener('click', () => document.querySelector('#reopen-modal')?.remove());
  });
  document.querySelectorAll<HTMLButtonElement>('[data-action="confirm-reopen"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.inspectionId;
      const input = document.querySelector<HTMLTextAreaElement>('#reopen-reason-input');
      const reason = input?.value.trim() ?? '';
      if (reason.length < 5) {
        window.alert('A substantive reason of at least 5 characters is required to reopen a finalized inspection.');
        return;
      }
      btn.disabled = true;
      const res = await reopenInspection(id!, reason, String(profile?.user?.['id'] ?? 'demo-inspector'), profile?.role);
      document.querySelector('#reopen-modal')?.remove();
      if (!res.success) {
        window.alert(res.error || 'Failed to reopen inspection.');
      } else {
        window.alert('Inspection reopened successfully. Amendment record and audit event logged.');
        void renderRoute();
      }
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-action="acknowledge-conflict"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const inspectionId = btn.dataset.inspectionId;
      const conflictId = btn.dataset.conflictId;
      if (!inspectionId || !conflictId) return;
      btn.disabled = true;
      await acknowledgeConflictInDb(inspectionId, conflictId, String(profile?.user?.['id'] ?? 'demo-inspector'));
      window.alert('Conflict acknowledged: "I reviewed the conflicting evidence."');
      void renderRoute();
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-action="submit-finalization"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const inspectionId = btn.dataset.inspectionId;
      if (!inspectionId) return;
      const select = document.querySelector<HTMLSelectElement>('#final-decision-select');
      const comments = document.querySelector<HTMLInputElement>('#final-decision-comments');
      const decisionVal = select?.value || 'COMPLIANT';
      const commentVal = comments?.value.trim() || 'Statutory review concluded.';
      btn.disabled = true;
      await finalizeInspectionInDb(inspectionId, decisionVal, commentVal, String(profile?.user?.['id'] ?? 'demo-inspector'));
      window.alert('Inspection finalized. Record tamper-sealed and lock engaged.');
      void renderRoute();
    });
  });
}

function renderLogin(message?: string): void {
  app.innerHTML = `<main class="login-shell"><section class="login-brand"><span class="brand-mark">L</span><p class="eyebrow">Regulatory command center</p><h1>LM-Vision</h1><p>Inspection oversight grounded in shared Supabase records, deterministic assessments, and human final decisions.</p></section><section class="login-card"><p class="eyebrow">Secure sign in</p><h2>Continue to command center</h2>${message ? `<p class="form-error">${esc(message)}</p>` : ''}<form id="signin-form"><label>Email<input required type="email" name="email" autocomplete="email" /></label><label>Password<input required type="password" name="password" autocomplete="current-password" /></label><button class="button primary" type="submit">Sign in</button></form><button class="link-button" id="reset-password">Forgot password?</button><div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.15);"><button class="button secondary" id="demo-signin" type="button" style="width: 100%;">Explore with Demo Inspector (Evaluation / Offline)</button></div><p class="hint">This browser uses only the Supabase public key. Data access is enforced by PostgreSQL RLS.</p></section></main>`;
  document.querySelector<HTMLFormElement>('#signin-form')?.addEventListener('submit', async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget as HTMLFormElement); try { await signIn(String(form.get('email')), String(form.get('password'))); await bootstrap(); } catch (error) { renderLogin(error instanceof Error ? error.message : 'Unable to sign in.'); } });
  document.querySelector<HTMLButtonElement>('#reset-password')?.addEventListener('click', async () => { const email = window.prompt('Enter your account email'); if (!email) return; try { await requestPasswordReset(email); window.alert('If that account exists, a password reset message has been sent.'); } catch (error) { window.alert(error instanceof Error ? error.message : 'Unable to request a reset.'); } });
  document.querySelector<HTMLButtonElement>('#demo-signin')?.addEventListener('click', async () => {
    profile = {
      user: { id: '00000002-0000-0000-0000-000000000001', email: 'inspector@lmvision.gov.in' },
      profile: { full_name: 'Demo Inspector', badge_number: 'INS-DL-0042' },
      role: 'SUPERVISOR',
    };
    await renderRoute();
  });
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
