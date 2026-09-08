/**
 * Server-side PDF report renderer.
 *
 * The PDF is a concise inspection record. It preserves the canonical report
 * data, but only shows operationally useful fields in the main document.
 * Long values are measured before drawing so they cannot escape cards or rows.
 */

import PDFDocument from 'pdfkit';
import type { InspectionReport } from '@lm-vision/shared-types';

type PDFDoc = InstanceType<typeof PDFDocument>;

const PAGE = { left: 40, right: 555, width: 515, bottom: 748, footerY: 770 };
const COLORS = {
  ink: '#172033',
  muted: '#64748b',
  border: '#dbe3ee',
  soft: '#f5f7fb',
  header: '#e9eef5',
  blue: '#2457a6',
  green: '#18794e',
  red: '#b42318',
  amber: '#a15c00',
};

function formatDate(value?: string): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' IST';
}

function display(value: unknown, fallback = 'Not recorded'): string {
  if (value === null || value === undefined || value === '') return fallback;
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function ruleSource(assessment: InspectionReport['complianceAssessments'][number]): string {
  const source = assessment.ruleSource?.gazetteNotificationNumber || assessment.ruleSource?.sourceDocument || 'GSR 202(E) 2011';
  return `${source}${assessment.ruleSource?.clauseReference ? ` ${assessment.ruleSource.clauseReference}` : ''}`;
}

function resultColor(result: string): string {
  if (result === 'PASS' || result === 'COMPLIANT') return COLORS.green;
  if (result === 'FAIL' || result === 'NON_COMPLIANT') return COLORS.red;
  return COLORS.amber;
}

function resultLabel(result: string): string {
  return result.replaceAll('_', ' ');
}

function textHeight(doc: PDFDoc, value: string, width: number, fontSize: number, font = 'Helvetica'): number {
  doc.font(font).fontSize(fontSize);
  return doc.heightOfString(value || ' ', { width, lineGap: 1 });
}

function ensureSpace(doc: PDFDoc, height: number): void {
  if (doc.y + height > PAGE.bottom) doc.addPage();
}

function sectionTitle(doc: PDFDoc, title: string): void {
  ensureSpace(doc, 30);
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(12).text(title, PAGE.left, doc.y);
  doc.strokeColor(COLORS.border).lineWidth(0.7).moveTo(PAGE.left, doc.y + 5).lineTo(PAGE.right, doc.y + 5).stroke();
  doc.y += 15;
}

function drawMetaCard(
  doc: PDFDoc,
  title: string,
  fields: Array<[string, string]>,
  x: number,
  y: number,
  width: number,
): number {
  const innerWidth = width - 16;
  const rowHeights = fields.map(([label, value]) => Math.max(16, textHeight(doc, `${label}: ${value}`, innerWidth, 8)) + 4);
  const height = 25 + rowHeights.reduce((sum, item) => sum + item, 0) + 8;
  doc.rect(x, y, width, height).fillAndStroke(COLORS.soft, COLORS.border);
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(9).text(title, x + 8, y + 8, { width: innerWidth });
  let rowY = y + 25;
  fields.forEach(([label, value], index) => {
    const rowHeight = rowHeights[index] ?? 18;
    const labelText = `${label}: `;
    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text(labelText, x + 8, rowY, { width: innerWidth });
    const labelWidth = Math.min(doc.widthOfString(labelText), innerWidth * 0.38);
    doc.fillColor(COLORS.ink).font('Helvetica').fontSize(8).text(value, x + 8 + labelWidth, rowY, { width: innerWidth - labelWidth });
    rowY += rowHeight;
  });
  return height;
}

function drawTable(
  doc: PDFDoc,
  headers: string[],
  rows: string[][],
  widths: number[],
  colorForRow?: (row: string[]) => string | undefined,
): void {
  const headerHeight = 23;
  const drawHeader = () => {
    ensureSpace(doc, headerHeight + 12);
    const y = doc.y;
    doc.rect(PAGE.left, y, PAGE.width, headerHeight).fill(COLORS.header);
    let x = PAGE.left;
    headers.forEach((header, index) => {
      const width = widths[index] ?? 0;
      doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(7.5).text(header, x + 5, y + 7, { width: width - 10 });
      x += width;
    });
    doc.y = y + headerHeight;
  };

  drawHeader();
  rows.forEach((row, rowIndex) => {
    const heights = row.map((cell, index) => Math.max(16, textHeight(doc, cell, (widths[index] ?? 0) - 10, 7.5)));
    const height = Math.max(...heights) + 10;
    if (doc.y + height > PAGE.bottom) {
      doc.addPage();
      drawHeader();
    }
    const y = doc.y;
    doc.rect(PAGE.left, y, PAGE.width, height).fillAndStroke(rowIndex % 2 === 0 ? '#ffffff' : '#fbfcfe', COLORS.border);
    const rowColor = colorForRow?.(row);
    let x = PAGE.left;
    row.forEach((cell, index) => {
      const width = widths[index] ?? 0;
      doc.fillColor(index === 2 && rowColor ? rowColor : COLORS.ink)
        .font(index === 0 || index === 2 ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(7.5)
        .text(cell, x + 5, y + 5, { width: width - 10, lineGap: 1 });
      x += width;
    });
    doc.y = y + height;
  });
}

function drawEvidenceTable(doc: PDFDoc, report: InspectionReport): void {
  const rows = report.evidence.map((e, index) => [
    String(index + 1),
    display(e.title),
    `${display(e.type)}\nCaptured: ${formatDate(e.capturedAt)}\nSize: ${Math.round((e.fileSizeBytes || 0) / 1024)} KB`,
    `Evidence ID: ${e.id}\nSHA-256: ${e.sha256Hash}`,
  ]);
  drawTable(doc, ['#', 'Evidence', 'Capture', 'Provenance'], rows, [28, 140, 130, 217]);
}

/** Generates a readable A4 PDF from a validated canonical report. */
export async function generateReportPdf(report: InspectionReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
        info: {
          Title: `${report.reportNumber} - Inspection Report`,
          Author: report.inspectorName,
          Subject: 'Legal Metrology Compliance Inspection Report',
          Keywords: 'legal metrology, GSR 202(E), inspection, compliance',
          CreationDate: new Date(report.generatedAt),
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const isDraft = report.isDraftPreview;
      const authoritative = report.complianceAssessments.filter((a) => a.ruleKind === 'AUTHORITATIVE');
      const decision = report.finalDecision?.decision || (isDraft ? 'PENDING' : 'NOT RECORDED');
      const decisionLabel = resultLabel(decision);

      // ASCII-only headings avoid broken emoji glyphs in mobile PDF viewers.
      doc.fillColor(COLORS.blue).font('Helvetica-Bold').fontSize(10).text('LM-VISION | LEGAL METROLOGY INSPECTION REPORT', PAGE.left, 40);
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(`Report No: ${report.reportNumber}`, PAGE.left, 41, { width: PAGE.width, align: 'right' });
      doc.strokeColor(COLORS.ink).lineWidth(1).moveTo(PAGE.left, 58).lineTo(PAGE.right, 58).stroke();
      doc.y = 72;

      if (isDraft) {
        doc.rect(PAGE.left, doc.y, PAGE.width, 26).fillAndStroke('#fff7e0', '#f1c46a');
        doc.fillColor(COLORS.amber).font('Helvetica-Bold').fontSize(8.5).text('DRAFT / PREVIEW - Not a finalized inspection record.', PAGE.left + 9, doc.y + 8, { width: PAGE.width - 18 });
        doc.y += 38;
      }

      doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(20).text(isDraft ? 'DRAFT / PREVIEW INSPECTION REPORT' : 'FINALIZED INSPECTION REPORT', PAGE.left, doc.y, { width: PAGE.width });
      doc.y += 8;
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8.5).text('AI-assisted verification record. Final determination is made by the inspector. Reference: Legal Metrology (Packaged Commodities) Rules, 2011 [GSR 202(E)].', PAGE.left, doc.y, { width: PAGE.width, lineGap: 1 });
      doc.y += 14;

      const metaY = doc.y;
      const leftHeight = drawMetaCard(doc, 'Inspection Record', [
        ['Inspection ID', report.inspectionId],
        ['Status', report.inspectionStatus],
        ['Report version', report.reportVersion],
        ['Generated', formatDate(report.generatedAt)],
        ['Rule bundle', `${report.ruleBundleId} (${report.ruleBundleVersion})`],
      ], PAGE.left, metaY, 250);
      const rightHeight = drawMetaCard(doc, 'Inspector', [
        ['Name', report.inspectorName],
        ['Inspector ID', report.inspectorId],
        ['Role', report.inspectorRole],
        ['Source', display(report.inspectionMetadata.sourceType)],
        ['Location', display(report.inspectionMetadata.location, 'Not recorded')],
      ], 305, metaY, 250);
      doc.y = metaY + Math.max(leftHeight, rightHeight) + 18;

      sectionTitle(doc, 'Product identification');
      const productY = doc.y;
      const productHeight = drawMetaCard(doc, 'Product', [
        ['Product name', display(report.product.productName)],
        ['Brand', display(report.product.brandName)],
        ['Category', display(report.product.category)],
        ['Packaging', display(report.product.packagingType)],
        ['Batch / barcode', `${display(report.product.batchNumber)} / ${display(report.product.barcode)}`],
        ['Declared MRP', report.product.declaredMrp != null ? `Rs. ${report.product.declaredMrp}` : 'Not recorded'],
      ], PAGE.left, productY, PAGE.width);
      doc.y = productY + productHeight + 18;

      sectionTitle(doc, 'Inspector decision');
      const decisionText = display(report.finalDecision?.summaryNotes, isDraft ? 'Decision pending.' : 'No rationale recorded.');
      const decisionHeight = Math.max(58, textHeight(doc, `Decision: ${decisionLabel}\nRationale: ${decisionText}`, PAGE.width - 20, 8.5) + 24);
      ensureSpace(doc, decisionHeight);
      const decisionY = doc.y;
      doc.rect(PAGE.left, decisionY, PAGE.width, decisionHeight).fillAndStroke(COLORS.soft, COLORS.border);
      doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8.5).text('Decision status', PAGE.left + 10, decisionY + 10);
      doc.fillColor(resultColor(decision)).font('Helvetica-Bold').fontSize(10).text(decisionLabel, PAGE.left + 105, decisionY + 9, { width: PAGE.width - 115 });
      doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8.5).text('Rationale', PAGE.left + 10, decisionY + 28);
      doc.fillColor(COLORS.ink).font('Helvetica').fontSize(8.5).text(decisionText, PAGE.left + 105, decisionY + 27, { width: PAGE.width - 115 });
      doc.y = decisionY + decisionHeight + 18;

      if (report.declarations.length > 0) {
        sectionTitle(doc, 'Mandatory declarations');
        drawTable(doc, ['Declaration', 'Observed text', 'Normalized', 'Confidence'], report.declarations.map((d) => [
          display(d.type),
          display(d.rawText),
          display(d.normalizedValue != null ? `${d.normalizedValue}${d.unit ? ` ${d.unit}` : ''}` : undefined),
          `${Math.round((d.confidence ?? 0) * 100)}%`,
        ]), [110, 220, 115, 70]);
        doc.y += 16;
      }

      sectionTitle(doc, 'Statutory compliance assessment');
      if (authoritative.length > 0) {
        drawTable(doc, ['Rule', 'Requirement', 'Result', 'Assessment and source'], authoritative.map((a) => [
          `Rule ${a.ruleNumber}`,
          display(a.ruleTitle),
          resultLabel(a.result),
          `${display(a.explanation)}${a.observedValue != null ? `\nObserved: ${display(a.observedValue)}` : ''}${a.expectedConstraint != null ? `\nExpected: ${display(a.expectedConstraint)}` : ''}\nSource: ${ruleSource(a)}`,
        ]), [60, 145, 90, 220], (row) => resultColor(row[2] || ''));
      } else {
        doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8.5).text('No authoritative compliance assessments recorded.', PAGE.left, doc.y);
      }
      doc.y += 16;

      if (report.corrections.length > 0) {
        sectionTitle(doc, 'Inspector corrections');
        drawTable(doc, ['Field', 'Original observation', 'Inspector correction', 'Reason'], report.corrections.map((c) => [
          display(c.declarationType, 'General observation'),
          display(c.originalValue),
          display(c.correctedValue),
          display(c.reason),
        ]), [95, 135, 135, 150]);
        doc.y += 16;
      }

      if (report.evidence.length > 0) {
        sectionTitle(doc, 'Evidence register');
        drawEvidenceTable(doc, report);
        doc.y += 16;
      }

      sectionTitle(doc, 'Record integrity');
      const integrityText = `Content hash (SHA-256): ${display(report.contentHash)}\nReport hash (SHA-256): ${display(report.reportHash)}`;
      const integrityHeight = textHeight(doc, integrityText, PAGE.width - 20, 7.5, 'Courier') + 22;
      ensureSpace(doc, integrityHeight);
      const integrityY = doc.y;
      doc.rect(PAGE.left, integrityY, PAGE.width, integrityHeight).fillAndStroke(COLORS.soft, COLORS.border);
      doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text('Canonical record verification', PAGE.left + 10, integrityY + 8);
      doc.fillColor(COLORS.ink).font('Courier').fontSize(7.5).text(integrityText, PAGE.left + 10, integrityY + 20, { width: PAGE.width - 20, lineGap: 1 });

      const pageRange = doc.bufferedPageRange();
      for (let page = 0; page < pageRange.count; page += 1) {
        doc.switchToPage(page);
        doc.strokeColor(COLORS.border).lineWidth(0.5).moveTo(PAGE.left, PAGE.footerY).lineTo(PAGE.right, PAGE.footerY).stroke();
        doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.5).text(`LM-Vision | ${report.reportNumber}`, PAGE.left, PAGE.footerY + 5);
        doc.text(`Page ${page + 1} of ${pageRange.count}`, PAGE.left, PAGE.footerY + 5, { width: PAGE.width, align: 'right' });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
