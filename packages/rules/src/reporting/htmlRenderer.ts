/**
 * Canonical HTML Report Renderer (Phase 9)
 *
 * Produces clean, responsive, print-optimized HTML5 document.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Strict HTML entity escaping against script/markup injection.
 * 2. Prominent DRAFT watermark and banner if isDraftPreview === true.
 * 3. Side-by-side AI observation vs. Inspector correction display.
 * 4. Distinct presentation for Authoritative vs. Demo/Test rules.
 * 5. Forensic evidence block distinguishing original image SHA-256 from derived thumbnails.
 * 6. Cryptographic verification seal block with contentHash and reportHash.
 * 7. Non-governmental software disclaimer.
 */

import type { InspectionReport } from '@lm-vision/shared-types';

/**
 * Escapes HTML characters to prevent XSS and template injection
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats a date string
 */
function formatDate(isoStr?: string): string {
  if (!isoStr) return 'N/A';
  try {
    return new Date(isoStr).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' IST';
  } catch {
    return isoStr;
  }
}

/**
 * Status badge CSS classes and styles
 */
function getResultBadge(result: string): string {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    PASS: { bg: '#e6f4ea', color: '#137333', label: 'PASS' },
    FAIL: { bg: '#fce8e6', color: '#c5221f', label: 'FAIL' },
    REQUIRES_VERIFICATION: { bg: '#fef7e0', color: '#b06000', label: 'REQUIRES VERIFICATION' },
    NOT_APPLICABLE: { bg: '#f1f3f4', color: '#5f6368', label: 'NOT APPLICABLE' },
    INSUFFICIENT_EVIDENCE: { bg: '#fef7e0', color: '#b06000', label: 'INSUFFICIENT EVIDENCE' },
  };

  const badge = map[result] || { bg: '#f1f3f4', color: '#333', label: result };
  return `<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:${badge.bg};color:${badge.color};">${escapeHtml(badge.label)}</span>`;
}

function getDecisionBadge(decision?: string): string {
  if (!decision) return '<span style="color:#666;">Pending</span>';
  const map: Record<string, { bg: string; color: string }> = {
    COMPLIANT: { bg: '#e6f4ea', color: '#137333' },
    NON_COMPLIANT: { bg: '#fce8e6', color: '#c5221f' },
    SEIZED: { bg: '#5f2120', color: '#ffffff' },
    NOTICE_ISSUED: { bg: '#fef7e0', color: '#b06000' },
    ESCALATED: { bg: '#e8f0fe', color: '#1a73e8' },
    DISMISSED: { bg: '#f1f3f4', color: '#5f6368' },
  };
  const b = map[decision] || { bg: '#f1f3f4', color: '#333' };
  return `<span style="display:inline-block;padding:5px 12px;border-radius:6px;font-size:13px;font-weight:700;background:${b.bg};color:${b.color};">${escapeHtml(decision)}</span>`;
}

/**
 * Renders an InspectionReport to a self-contained responsive HTML string
 */
export function renderReportToHtml(report: InspectionReport): string {
  const isDraft = report.isDraftPreview;
  const authoritativeAssessments = report.complianceAssessments.filter(a => a.ruleKind === 'AUTHORITATIVE');
  const testAssessments = report.complianceAssessments.filter(a => a.ruleKind !== 'AUTHORITATIVE');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(report.reportNumber)} - Inspection Report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.5;
      color: #1a1a1a;
      background-color: #f8f9fa;
      margin: 0;
      padding: 24px;
    }
    .report-container {
      max-width: 960px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 36px 44px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      position: relative;
    }
    ${isDraft ? `
    .draft-watermark {
      position: fixed;
      top: 45%;
      left: 20%;
      transform: translate(-10%, -50%) rotate(-35deg);
      font-size: 80px;
      font-weight: 900;
      color: rgba(220, 53, 69, 0.12);
      pointer-events: none;
      z-index: 9999;
      letter-spacing: 6px;
      text-transform: uppercase;
      user-select: none;
    }
    .draft-banner {
      background: #fff3cd;
      border: 1px solid #ffeeba;
      color: #856404;
      padding: 12px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    ` : ''}
    .header-block {
      border-bottom: 2px solid #202124;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      gap: 16px;
    }
    .header-top > div:first-child { flex: 1 1 auto; min-width: 0; }
    .app-brand {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #0b57d0;
      text-transform: uppercase;
    }
    .report-title {
      font-size: 22px;
      font-weight: 800;
      color: #202124;
      margin: 4px 0 0 0;
      overflow-wrap: anywhere;
    }
    .report-number {
      font-family: monospace;
      font-size: 15px;
      font-weight: 700;
      color: #3c4043;
      background: #f1f3f4;
      padding: 4px 10px;
      border-radius: 4px;
    }
    .disclaimer-box {
      background: #f8f9fa;
      border-left: 3px solid #0b57d0;
      padding: 10px 14px;
      font-size: 12px;
      color: #5f6368;
      margin: 16px 0 24px 0;
      border-radius: 0 4px 4px 0;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #202124;
      border-bottom: 1px solid #dadce0;
      padding-bottom: 6px;
      margin: 28px 0 14px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .meta-box {
      background: #f8f9fa;
      border: 1px solid #e8eaed;
      border-radius: 6px;
      padding: 14px 16px;
      font-size: 13px;
    }
    .meta-row {
      display: grid;
      grid-template-columns: minmax(90px, 36%) minmax(0, 1fr);
      gap: 8px;
      padding: 4px 0;
      border-bottom: 1px dotted #dadce0;
    }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { color: #5f6368; font-weight: 500; }
    .meta-value { color: #202124; font-weight: 600; text-align: left; overflow-wrap: anywhere; min-width: 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 12px;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #dadce0;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    th {
      background-color: #f1f3f4;
      font-weight: 700;
      color: #3c4043;
    }
    tr:nth-child(even) { background-color: #fcfcfc; }
    .side-by-side {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #f8f9fa;
      border: 1px solid #e8eaed;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
      font-size: 12px;
    }
    .side-column { padding: 8px; border-radius: 4px; }
    .ai-col { background: #e8f0fe; border-left: 3px solid #1a73e8; }
    .inspector-col { background: #fef7e0; border-left: 3px solid #f9ab00; }
    .seal-box {
      background: #f1f3f4;
      border: 1px solid #dadce0;
      border-radius: 6px;
      padding: 14px 16px;
      margin-top: 28px;
      font-family: monospace;
      font-size: 11px;
      color: #3c4043;
      word-break: break-all;
    }
    .evidence-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .evidence-card {
      border: 1px solid #dadce0;
      border-radius: 6px;
      padding: 10px;
      font-size: 11px;
      background: #fafafa;
    }
    .hash-text {
      font-family: monospace;
      font-size: 10px;
      color: #5f6368;
      word-break: break-all;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .report-container { border: none; box-shadow: none; padding: 12px; max-width: 100%; }
      .draft-watermark { position: absolute; }
    }
  </style>
</head>
<body>
  ${isDraft ? `<div class="draft-watermark">DRAFT / PREVIEW</div>` : ''}

  <div class="report-container">
    ${isDraft ? `
    <div class="draft-banner">
      <span>NOTICE</span>
      <div>
        <strong>DRAFT / PREVIEW REPORT</strong> - Preliminary record. Not valid for statutory enforcement until finalized and signed.
      </div>
    </div>` : ''}

    <header class="header-block">
      <div class="header-top">
        <div>
          <div class="app-brand">LM-Vision Legal Metrology Intelligence</div>
          <h1 class="report-title">${escapeHtml(report.title)}</h1>
        </div>
        <div class="report-number">${escapeHtml(report.reportNumber)}</div>
      </div>
      <div class="disclaimer-box">
        <strong>Statutory Notice:</strong> LM-Vision is an AI-assisted regulatory verification software platform. This report represents the findings and determinations of the inspector and is not a government-issued certificate unless officially endorsed by statutory authorities. Evaluated against Legal Metrology (Packaged Commodities) Rules, 2011 [GSR 202(E)].
      </div>
    </header>

    <!-- SECTION 1 & 2: Inspection & Inspector Metadata -->
    <div class="grid-2">
      <div class="meta-box">
        <div style="font-weight:700;margin-bottom:8px;color:#202124;">Inspection Record</div>
        <div class="meta-row"><span class="meta-label">Inspection ID</span><span class="meta-value" style="font-family:monospace;">${escapeHtml(report.inspectionId)}</span></div>
        <div class="meta-row"><span class="meta-label">Inspection Status</span><span class="meta-value">${escapeHtml(report.inspectionStatus)}</span></div>
        <div class="meta-row"><span class="meta-label">Report Version</span><span class="meta-value">${escapeHtml(report.reportVersion)}</span></div>
        <div class="meta-row"><span class="meta-label">Generated At</span><span class="meta-value">${escapeHtml(formatDate(report.generatedAt))}</span></div>
        <div class="meta-row"><span class="meta-label">Rule Bundle</span><span class="meta-value">${escapeHtml(report.ruleBundleId)} (${escapeHtml(report.ruleBundleVersion)})</span></div>
      </div>

      <div class="meta-box">
        <div style="font-weight:700;margin-bottom:8px;color:#202124;">Inspector Profile</div>
        <div class="meta-row"><span class="meta-label">Inspector Name</span><span class="meta-value">${escapeHtml(report.inspectorName)}</span></div>
        <div class="meta-row"><span class="meta-label">Inspector ID</span><span class="meta-value" style="font-family:monospace;">${escapeHtml(report.inspectorId)}</span></div>
        <div class="meta-row"><span class="meta-label">Role</span><span class="meta-value">${escapeHtml(report.inspectorRole)}</span></div>
        <div class="meta-row"><span class="meta-label">Source Type</span><span class="meta-value">${escapeHtml(report.inspectionMetadata.sourceType)}</span></div>
        <div class="meta-row"><span class="meta-label">Location</span><span class="meta-value">${escapeHtml(report.inspectionMetadata.location || 'Field Inspection')}</span></div>
      </div>
    </div>

    <!-- SECTION 3: Product Identification -->
    <div class="section-title">Product Details</div>
    <div class="meta-box" style="margin-bottom:16px;">
      <div class="grid-2">
        <div>
          <div class="meta-row"><span class="meta-label">Product Name</span><span class="meta-value">${escapeHtml(report.product.productName)}</span></div>
          <div class="meta-row"><span class="meta-label">Brand Name</span><span class="meta-value">${escapeHtml(report.product.brandName)}</span></div>
          <div class="meta-row"><span class="meta-label">Generic Name</span><span class="meta-value">${escapeHtml(report.product.genericName || '-')}</span></div>
          <div class="meta-row"><span class="meta-label">Category</span><span class="meta-value">${escapeHtml(report.product.category)}</span></div>
        </div>
        <div>
          <div class="meta-row"><span class="meta-label">Packaging Type</span><span class="meta-value">${escapeHtml(report.product.packagingType)}</span></div>
          <div class="meta-row"><span class="meta-label">Batch Number</span><span class="meta-value">${escapeHtml(report.product.batchNumber || '-')}</span></div>
          <div class="meta-row"><span class="meta-label">Barcode / GTIN</span><span class="meta-value">${escapeHtml(report.product.barcode || '-')}</span></div>
          <div class="meta-row"><span class="meta-label">Declared MRP</span><span class="meta-value">${report.product.declaredMrp != null ? 'Rs. ' + escapeHtml(report.product.declaredMrp) : '-'}</span></div>
        </div>
      </div>
    </div>

    <!-- SECTION 4: Inspector Final Decision -->
    <div class="section-title">Inspector Final Decision</div>
    <div class="meta-box" style="margin-bottom:20px;border-left:4px solid #0b57d0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-weight:700;font-size:14px;">Determination Status:</span>
        ${getDecisionBadge(report.finalDecision?.decision)}
      </div>
      <div class="meta-row"><span class="meta-label">Summary / Rationale</span><span class="meta-value">${escapeHtml(report.finalDecision?.summaryNotes || (isDraft ? 'Inspection in progress - decision pending' : 'No notes'))}</span></div>
      <div class="meta-row"><span class="meta-label">Total Violations Found</span><span class="meta-value" style="color:${report.totalViolationsFound > 0 ? '#c5221f' : '#137333'};">${escapeHtml(report.totalViolationsFound)}</span></div>
      ${report.finalDecision?.penaltyRecommendation ? `
      <div class="meta-row"><span class="meta-label">Statutory Notice / Penalty</span><span class="meta-value">${escapeHtml(report.finalDecision.penaltyRecommendation.noticeType)} (Section: ${escapeHtml(report.finalDecision.penaltyRecommendation.proposedSection)})</span></div>
      ` : ''}
      <div class="meta-row"><span class="meta-label">Decided At</span><span class="meta-value">${escapeHtml(formatDate(report.finalDecision?.decidedAt))}</span></div>
    </div>

    <!-- SECTION 5: Extracted Mandatory Declarations -->
    <div class="section-title">Physical Declarations (Observed & Verified)</div>
    ${report.declarations.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Declaration Type</th>
          <th>Extracted Raw Text</th>
          <th>Normalized Value</th>
          <th>Confidence</th>
        </tr>
      </thead>
      <tbody>
        ${report.declarations.map(d => `
        <tr>
          <td><strong>${escapeHtml(d.type)}</strong></td>
          <td>${escapeHtml(d.rawText)}</td>
          <td>${escapeHtml(d.normalizedValue != null ? String(d.normalizedValue) + (d.unit ? ' ' + d.unit : '') : '-')}</td>
          <td>${Math.round((d.confidence ?? 0) * 100)}%</td>
        </tr>`).join('')}
      </tbody>
    </table>
    ` : `<p style="font-size:13px;color:#666;">No declarations recorded.</p>`}

    <!-- SECTION 6: Deterministic Compliance Assessments -->
    <div class="section-title">Legal Metrology Compliance Evaluation (GSR 202(E))</div>
    ${authoritativeAssessments.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th style="width:75px;">Rule</th>
          <th>Requirement / Title</th>
          <th style="width:140px;">Result</th>
          <th>Observed vs. Expected</th>
          <th>Statutory Citation</th>
        </tr>
      </thead>
      <tbody>
        ${authoritativeAssessments.map(a => `
        <tr>
          <td><strong>Rule ${escapeHtml(a.ruleNumber)}</strong></td>
          <td>${escapeHtml(a.ruleTitle)}</td>
          <td>${getResultBadge(a.result)}</td>
          <td>
            <div style="font-size:11px;">${escapeHtml(a.explanation)}</div>
            ${a.observedValue != null ? `<div style="color:#5f6368;font-size:10px;">Observed: ${escapeHtml(JSON.stringify(a.observedValue))}</div>` : ''}
          </td>
          <td style="font-size:10px;color:#5f6368;">
            ${escapeHtml(a.ruleSource?.gazetteNotificationNumber || a.ruleSource?.sourceDocument || 'GSR 202(E) 2011')}${a.ruleSource?.clauseReference ? ' ' + escapeHtml(a.ruleSource.clauseReference) : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
    ` : `<p style="font-size:13px;color:#666;">No authoritative compliance assessments recorded.</p>`}

    ${testAssessments.length > 0 ? `
    <div style="font-size:13px;font-weight:700;color:#e37400;margin:16px 0 8px 0;">Non-Authoritative / Test Rule Evaluations:</div>
    <table>
      <thead>
        <tr>
          <th>Rule</th>
          <th>Title</th>
          <th>Result</th>
          <th>Kind</th>
        </tr>
      </thead>
      <tbody>
        ${testAssessments.map(a => `
        <tr>
          <td>Rule ${escapeHtml(a.ruleNumber)}</td>
          <td>${escapeHtml(a.ruleTitle)}</td>
          <td>${getResultBadge(a.result)}</td>
          <td><span style="background:#fef7e0;color:#b06000;padding:2px 6px;border-radius:4px;font-size:10px;">${escapeHtml(a.ruleKind)}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
    ` : ''}

    <!-- SECTION 7: Side-by-Side AI Observations vs Inspector Corrections -->
    ${report.corrections.length > 0 ? `
    <div class="section-title">Inspector Human Verifications & Corrections</div>
    ${report.corrections.map(c => `
    <div class="side-by-side">
      <div class="side-column ai-col">
        <strong>Original AI Observation</strong><br>
        <span style="font-size:11px;color:#5f6368;">Field: ${escapeHtml(c.declarationType || 'General Observation')}</span><br>
        <div style="margin-top:4px;font-family:monospace;">${escapeHtml(JSON.stringify(c.originalValue ?? 'Unspecified'))}</div>
        <span style="font-size:10px;color:#5f6368;">AI Confidence: ${c.originalConfidence != null ? Math.round(c.originalConfidence * 100) + '%' : 'N/A'}</span>
      </div>
      <div class="side-column inspector-col">
        <strong>Verified / Corrected by Inspector</strong><br>
        <span style="font-size:11px;color:#5f6368;">Corrected Value:</span><br>
        <div style="margin-top:4px;font-family:monospace;font-weight:bold;">${escapeHtml(JSON.stringify(c.correctedValue))}</div>
        <div style="margin-top:4px;font-size:11px;"><strong>Reason:</strong> ${escapeHtml(c.reason)}</div>
        <span style="font-size:10px;color:#5f6368;">Time: ${escapeHtml(formatDate(c.correctedAt))}</span>
      </div>
    </div>`).join('')}
    ` : ''}

    <!-- SECTION 8: Forensic Evidence Appendix -->
    <div class="section-title">Forensic Evidence Appendix</div>
    ${report.evidence.length > 0 ? `
    <div class="evidence-grid">
      ${report.evidence.map(e => `
      <div class="evidence-card">
        <strong>${escapeHtml(e.title)}</strong><br>
        <span style="color:#5f6368;">Type: ${escapeHtml(e.type)}</span><br>
        <span style="color:#5f6368;">Captured: ${escapeHtml(formatDate(e.capturedAt))}</span><br>
        <span style="color:#5f6368;">Size: ${Math.round((e.fileSizeBytes || 0) / 1024)} KB</span><br>
        <div style="margin-top:6px;font-weight:bold;color:#202124;">Original Evidence SHA-256:</div>
        <div class="hash-text">${escapeHtml(e.sha256Hash)}</div>
        <div style="margin-top:4px;font-size:9px;color:#5f6368;">
          Thumbnail derived from Evidence ID: ${escapeHtml(e.id)}
        </div>
      </div>`).join('')}
    </div>
    ` : `<p style="font-size:13px;color:#666;">No evidence attached.</p>`}

    <!-- SECTION 9: Amendments History (if any) -->
    ${report.amendments.length > 0 ? `
    <div class="section-title">Post-Finalization Amendment History</div>
    <table>
      <thead>
        <tr>
          <th>Amendment Time</th>
          <th>Previous Decision</th>
          <th>Amended Decision</th>
          <th>Reason</th>
        </tr>
      </thead>
      <tbody>
        ${report.amendments.map(am => `
        <tr>
          <td>${escapeHtml(formatDate(am.amendedAt))}</td>
          <td>${escapeHtml(am.previousDecision)}</td>
          <td><strong>${escapeHtml(am.newDecision)}</strong></td>
          <td>${escapeHtml(am.amendmentReason)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    ` : ''}

    <!-- SECTION 10: Cryptographic Verification Seal -->
    <div class="seal-box">
      <div style="font-weight:bold;margin-bottom:6px;font-size:12px;color:#202124;">
        CRYPTOGRAPHIC INTEGRITY SEAL & AUDIT TRAIL
      </div>
      <div><strong>Content Hash (SHA-256):</strong> ${escapeHtml(report.contentHash)}</div>
      <div style="margin-top:3px;"><strong>Report Hash (SHA-256):</strong> ${escapeHtml(report.reportHash)}</div>
      <div style="margin-top:6px;font-size:10px;color:#5f6368;">
        This cryptographic seal verifies that the inspection findings, GSR 202(E) determinations, inspector review corrections, and evidence hashes are identical to the finalized record. Any alteration of this document invalidates this signature.
      </div>
    </div>
  </div>
</body>
</html>`;
}
