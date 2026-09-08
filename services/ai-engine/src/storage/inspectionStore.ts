// ============================================================================
// LM-Vision AI Engine — Persistent Local Inspection Store
// services/ai-engine/src/storage/inspectionStore.ts
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  PackageAnalysisInput,
  PackageAnalysis,
  InspectionReport,
  Declaration,
  ComplianceAssessment,
  ComplianceEvaluationSummary,
} from '@lm-vision/shared-types';
import { evaluateCompliance } from '@lm-vision/rules';

export interface StoredInspectionImage {
  id: string;
  surface: string;
  mimeType: string;
  base64Thumbnail?: string;
  fileUrl?: string;
  qualityScore?: number;
}

export interface StoredInspection {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'DRAFT' | 'ANALYZED' | 'REVIEW_REQUIRED' | 'DECIDED' | 'REPORT_GENERATED';
  complianceResult: 'PASS' | 'FAIL' | 'REQUIRES_VERIFICATION';
  complianceScore: number;
  productName: string;
  brandName?: string;
  category: string;
  packageType: string;
  batchNumber?: string;
  notes?: string;
  images: StoredInspectionImage[];
  declarations: Declaration[];
  complianceAssessments: ComplianceAssessment[];
  complianceSummary?: ComplianceEvaluationSummary;
  findings: Array<{
    id: string;
    ruleId?: string;
    title: string;
    description: string;
    status: string;
    severity?: string;
  }>;
  report?: {
    reportNumber: string;
    contentHash: string;
    reportHash: string;
    hasPdf: boolean;
    generatedAt: string;
    isDraftPreview?: boolean;
  };
  decision?: {
    decision: string;
    comments?: string;
    decidedAt?: string;
  };
}

export interface DashboardOverview {
  totalInspections: number;
  todayInspections: number;
  passCount: number;
  failCount: number;
  verificationCount: number;
  passRate: number;
  categories: Record<string, number>;
  topFailingRules: Array<{ ruleNumber: string; ruleTitle: string; count: number }>;
  recentInspections: StoredInspection[];
}

type EventListener = (event: { type: string; data: unknown }) => void;

class LocalInspectionStore {
  private readonly dataDir: string;
  private readonly dataFilePath: string;
  private inspections: Map<string, StoredInspection> = new Map();
  private listeners: Set<EventListener> = new Set();
  private initialized = false;

  constructor() {
    let baseDir = process.cwd();
    try {
      if (typeof import.meta !== 'undefined' && import.meta.url) {
        baseDir = path.dirname(fileURLToPath(import.meta.url));
      }
    } catch {
      baseDir = process.cwd();
    }
    // Anchor data directory inside services/ai-engine/data
    this.dataDir = path.resolve(baseDir, '../../data');
    this.dataFilePath = path.join(this.dataDir, 'inspections.json');
    this.loadFromDisk();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
      } catch (err) {
        console.warn('[InspectionStore] Failed to create data dir:', err);
      }
    }
  }

  private loadFromDisk(): void {
    if (this.initialized) return;
    this.ensureDir();
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const list = JSON.parse(raw) as StoredInspection[];
        for (const item of list) {
          if (item && item.id) {
            this.inspections.set(item.id, item);
          }
        }
        console.log(`[InspectionStore] Loaded ${this.inspections.size} inspections from disk.`);
      }
    } catch (err) {
      console.warn('[InspectionStore] Error reading inspections.json:', err);
    }
    this.initialized = true;
  }

  private saveToDisk(): void {
    this.ensureDir();
    try {
      const list = Array.from(this.inspections.values());
      fs.writeFileSync(this.dataFilePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[InspectionStore] Error writing to inspections.json:', err);
    }
  }

  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private broadcast(type: string, data: unknown): void {
    for (const listener of this.listeners) {
      try {
        listener({ type, data });
      } catch (err) {
        console.warn('[InspectionStore] Error in event listener:', err);
      }
    }
  }

  /**
   * Records a complete inspection analysis when mobile runs package-analysis
   */
  public saveAnalysis(input: PackageAnalysisInput, analysis: PackageAnalysis): StoredInspection {
    this.loadFromDisk();

    const inspectionId = input.inspectionId;
    const now = new Date().toISOString();

    const rawInput = input as Record<string, any>;
    const category = (input.productCategoryHint || rawInput['category'] || 'COMMODITY') as string;
    const packageType = (input.packagingTypeHint || rawInput['packageType'] || 'PACKAGE') as string;
    const metadata = (rawInput['metadata'] ?? {}) as Record<string, unknown>;

    // 1. Evaluate deterministic compliance rules
    let complianceSummary: ComplianceEvaluationSummary | undefined;
    let complianceAssessments: ComplianceAssessment[] = [];
    try {
      complianceSummary = evaluateCompliance({
        inspectionId,
        packageAnalysis: analysis,
        commodityCategory: category,
      });
      complianceAssessments = complianceSummary.assessments;
    } catch (evalErr) {
      console.warn('[InspectionStore] Rule evaluation warning:', evalErr);
    }

    // 2. Determine compliance result and score
    let complianceResult: 'PASS' | 'FAIL' | 'REQUIRES_VERIFICATION' = 'PASS';
    if (complianceAssessments.some((a) => a.result === 'FAIL')) {
      complianceResult = 'FAIL';
    } else if (complianceAssessments.some((a) => a.result === 'REQUIRES_VERIFICATION')) {
      complianceResult = 'REQUIRES_VERIFICATION';
    }

    const totalAssessed = complianceAssessments.length;
    const passedCount = complianceAssessments.filter((a) => a.result === 'PASS').length;
    const complianceScore = totalAssessed > 0 ? Math.round((passedCount / totalAssessed) * 100) : 100;

    // 3. Extract product information
    const detectedName = analysis.declarations.find((d) => d.type === 'GENERIC_NAME')?.rawText;
    const detectedBrand = analysis.declarations.find((d) => d.type === 'MANUFACTURER_NAME_ADDRESS')?.rawText;
    const detectedBatch = analysis.declarations.find((d) => d.type === 'DATE_OF_MANUFACTURE')?.rawText;

    const productName = String(metadata['productName'] || detectedName || 'Packaged Commodity');
    const brandName = String(metadata['brandName'] || detectedBrand || '');
    const batchNumber = String(metadata['batchNumber'] || detectedBatch || '');

    // 4. Store images (save base64 data for first image as preview thumbnail)
    const images: StoredInspectionImage[] = input.images.map((img) => ({
      id: img.imageId,
      surface: img.surface || 'FRONT',
      mimeType: img.mimeType || 'image/jpeg',
      base64Thumbnail: img.base64Data ? img.base64Data : undefined,
      fileUrl: img.fileUrl,
    }));

    // 5. Synthesize statutory findings
    const findings = complianceAssessments
      .filter((a) => a.result === 'FAIL' || a.result === 'REQUIRES_VERIFICATION')
      .map((a) => ({
        id: a.id,
        ruleId: a.ruleId,
        title: `${a.ruleNumber}${a.subRule ? `(${a.subRule})` : ''} - ${a.ruleTitle}`,
        description: a.explanation,
        status: a.result === 'FAIL' ? 'VIOLATION' : 'MANUAL_REVIEW',
        severity: a.severity || 'MAJOR',
      }));

    const existing = this.inspections.get(inspectionId);
    const stored: StoredInspection = {
      id: inspectionId,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      status: existing?.status === 'DECIDED' ? 'DECIDED' : 'ANALYZED',
      complianceResult,
      complianceScore,
      productName,
      brandName: brandName || undefined,
      category,
      packageType,
      batchNumber: batchNumber || undefined,
      notes: typeof metadata['notes'] === 'string' ? metadata['notes'] : undefined,
      images: images.length > 0 ? images : existing?.images || [],
      declarations: analysis.declarations,
      complianceAssessments,
      complianceSummary,
      findings,
      report: existing?.report,
      decision: existing?.decision,
    };

    this.inspections.set(inspectionId, stored);
    this.saveToDisk();

    console.log(`[InspectionStore] Recorded inspection ${inspectionId} (${productName}): ${complianceResult} [Score: ${complianceScore}%]`);
    this.broadcast('INSPECTION_UPSERTED', stored);
    return stored;
  }

  /**
   * Updates an inspection with report data and finalization
   */
  public updateReport(report: InspectionReport, hasPdf = false): StoredInspection | undefined {
    this.loadFromDisk();

    const inspectionId = String(report.inspectionId);
    let stored = this.inspections.get(inspectionId);

    const findings = (report.complianceAssessments || [])
      .filter((a) => a.result === 'FAIL' || a.result === 'REQUIRES_VERIFICATION')
      .map((a) => ({
        id: a.id,
        ruleId: a.ruleId,
        title: `${a.ruleNumber}${a.subRule ? `(${a.subRule})` : ''} - ${a.ruleTitle}`,
        description: a.explanation,
        status: a.result === 'FAIL' ? 'VIOLATION' : 'MANUAL_REVIEW',
      }));

    if (!stored) {
      const now = new Date().toISOString();
      stored = {
        id: inspectionId,
        createdAt: now,
        updatedAt: now,
        status: report.inspectionStatus === 'DECIDED' ? 'DECIDED' : 'REPORT_GENERATED',
        complianceResult: report.totalViolationsFound > 0 ? 'FAIL' : 'PASS',
        complianceScore: report.totalViolationsFound > 0 ? 50 : 100,
        productName: report.product?.productName || 'Inspected Package',
        brandName: report.product?.brandName,
        category: report.product?.category || 'COMMODITY',
        packageType: report.product?.packagingType || 'PACKAGE',
        batchNumber: report.product?.batchNumber,
        images: [],
        declarations: report.declarations || [],
        complianceAssessments: report.complianceAssessments || [],
        findings,
      };
    }

    stored.updatedAt = new Date().toISOString();
    stored.status = report.isDraftPreview ? stored.status : 'DECIDED';
    stored.report = {
      reportNumber: report.reportNumber,
      contentHash: report.contentHash,
      reportHash: report.reportHash,
      hasPdf,
      generatedAt: report.generatedAt,
      isDraftPreview: report.isDraftPreview,
    };

    if (report.finalDecision) {
      stored.decision = {
        decision: report.finalDecision.decision,
        comments: report.finalDecision.summaryNotes,
        decidedAt: report.finalDecision.decidedAt,
      };
    }

    this.inspections.set(inspectionId, stored);
    this.saveToDisk();

    console.log(`[InspectionStore] Updated report for inspection ${inspectionId}: ${report.reportNumber}`);
    this.broadcast('INSPECTION_REPORT_UPDATED', stored);
    return stored;
  }

  public getInspection(id: string): StoredInspection | undefined {
    this.loadFromDisk();
    return this.inspections.get(id);
  }

  public listInspections(query?: {
    search?: string;
    status?: string;
    result?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  }): { rows: StoredInspection[]; total: number; page: number; pageSize: number } {
    this.loadFromDisk();

    let items = Array.from(this.inspections.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    const search = query?.search?.toLowerCase().trim();
    if (search) {
      items = items.filter((item) =>
        item.id.toLowerCase().includes(search) ||
        item.productName.toLowerCase().includes(search) ||
        (item.brandName && item.brandName.toLowerCase().includes(search)) ||
        item.category.toLowerCase().includes(search)
      );
    }

    if (query?.status) {
      items = items.filter((item) => item.status === query.status);
    }

    if (query?.result) {
      items = items.filter((item) => item.complianceResult === query.result);
    }

    if (query?.category) {
      items = items.filter((item) => item.category === query.category);
    }

    const total = items.length;
    const page = Math.max(1, query?.page || 1);
    const pageSize = Math.max(1, Math.min(100, query?.pageSize || 25));
    const offset = (page - 1) * pageSize;
    const rows = items.slice(offset, offset + pageSize);

    return { rows, total, page, pageSize };
  }

  public getOverview(): DashboardOverview {
    this.loadFromDisk();

    const all = Array.from(this.inspections.values());
    const totalInspections = all.length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayInspections = all.filter((i) => new Date(i.createdAt).getTime() >= todayStart.getTime()).length;

    const passCount = all.filter((i) => i.complianceResult === 'PASS').length;
    const failCount = all.filter((i) => i.complianceResult === 'FAIL').length;
    const verificationCount = all.filter((i) => i.complianceResult === 'REQUIRES_VERIFICATION').length;

    const evaluatedTotal = passCount + failCount;
    const passRate = evaluatedTotal > 0 ? Math.round((passCount / evaluatedTotal) * 100) : 100;

    const categories: Record<string, number> = {};
    const ruleFails: Record<string, { ruleNumber: string; ruleTitle: string; count: number }> = {};

    for (const item of all) {
      categories[item.category] = (categories[item.category] || 0) + 1;
      for (const assessment of item.complianceAssessments || []) {
        if (assessment.result === 'FAIL') {
          const key = assessment.ruleNumber;
          if (!ruleFails[key]) {
            ruleFails[key] = {
              ruleNumber: assessment.ruleNumber,
              ruleTitle: assessment.ruleTitle,
              count: 0,
            };
          }
          ruleFails[key].count += 1;
        }
      }
    }

    const topFailingRules = Object.values(ruleFails)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const recentInspections = all
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);

    return {
      totalInspections,
      todayInspections,
      passCount,
      failCount,
      verificationCount,
      passRate,
      categories,
      topFailingRules,
      recentInspections,
    };
  }

  /**
   * Saves or updates an inspection draft received from mobile sync
   */
  public saveDraft(draft: any): StoredInspection {
    this.loadFromDisk();

    const inspectionId = String(draft.localId || draft.id || draft.inspectionId || '');
    if (!inspectionId) {
      throw new Error('Inspection draft must have localId or id');
    }

    const now = new Date().toISOString();
    const existing = this.inspections.get(inspectionId);

    const productName = draft.productName || existing?.productName || 'Inspected Package';
    const brandName = draft.brandName || existing?.brandName;
    const category = draft.category || existing?.category || 'COMMODITY';
    const packageType = draft.packageType || existing?.packageType || 'PACKAGE';
    const batchNumber = draft.batchNumber || existing?.batchNumber;
    const notes = draft.notes || existing?.notes;

    // Convert images
    const rawImages = draft.images || existing?.images || [];
    const images: StoredInspectionImage[] = rawImages.map((img: any) => ({
      id: img.id || `${inspectionId}-${img.surface || 'FRONT'}`,
      surface: img.surface || 'FRONT',
      fileUrl: img.fileUrl || img.storage_path || '',
      mimeType: img.mimeType || 'image/jpeg',
      base64Thumbnail: img.base64Data || img.base64Thumbnail,
      qualityScore: img.quality?.overallScore || img.qualityScore,
    }));

    // Declarations
    const declarations: Declaration[] = draft.declarations || existing?.declarations || [];

    // Compliance assessments
    let complianceAssessments: ComplianceAssessment[] = draft.complianceAssessments || existing?.complianceAssessments || [];
    let complianceSummary: ComplianceEvaluationSummary | undefined = draft.complianceSummary || existing?.complianceSummary;

    // If no assessments but declarations or aiAnalysis present, evaluate compliance
    if ((!complianceAssessments || complianceAssessments.length === 0) && (draft.aiAnalysis || declarations.length > 0)) {
      try {
        const dummyAnalysis: any = draft.aiAnalysis || {
          declarations,
          findings: draft.findings || [],
          quality: { overallScore: 0.9, blurScore: 0.1, glareScore: 0.1, resolutionScore: 0.9, contrastScore: 0.9, issues: [] },
          rawOcrText: '',
          provider: 'MOBILE_SYNC',
          modelName: 'sync-v1',
          timestamp: now,
        };
        complianceSummary = evaluateCompliance({
          inspectionId,
          packageAnalysis: dummyAnalysis,
          commodityCategory: category,
        });
        complianceAssessments = complianceSummary.assessments;
      } catch (err) {
        console.warn('[InspectionStore] Compliance evaluation during draft sync:', err);
      }
    }

    let passCount = 0;
    let failCount = 0;
    let verificationCount = 0;
    for (const a of complianceAssessments) {
      if (a.result === 'PASS') passCount++;
      else if (a.result === 'FAIL') failCount++;
      else if (a.result === 'REQUIRES_VERIFICATION') verificationCount++;
    }
    const totalRules = passCount + failCount + verificationCount;
    const complianceScore = totalRules > 0 ? Math.round((passCount / totalRules) * 100) : 100;
    const complianceResult: 'PASS' | 'FAIL' | 'REQUIRES_VERIFICATION' =
      failCount > 0 ? 'FAIL' : verificationCount > 0 ? 'REQUIRES_VERIFICATION' : 'PASS';

    const findings = (complianceAssessments || [])
      .filter((a) => a.result === 'FAIL' || a.result === 'REQUIRES_VERIFICATION')
      .map((a) => ({
        id: a.id,
        ruleId: a.ruleId,
        title: `${a.ruleNumber}${a.subRule ? `(${a.subRule})` : ''} - ${a.ruleTitle}`,
        description: a.explanation,
        status: a.result === 'FAIL' ? 'VIOLATION' : 'MANUAL_REVIEW',
        severity: a.severity,
      }));

    // Status
    const status = draft.status || (draft.inspectorDecision ? 'DECIDED' : existing?.status || 'ANALYZED');

    // Decision
    const decision = draft.inspectorDecision
      ? {
          decision: draft.inspectorDecision.decision || draft.inspectorDecision.action || 'COMPLIANT',
          comments: draft.inspectorDecision.comments || draft.inspectorDecision.summaryNotes,
          decidedAt: draft.inspectorDecision.decidedAt || now,
        }
      : existing?.decision;

    // Report
    const report = draft.report || existing?.report;

    const stored: StoredInspection = {
      id: inspectionId,
      createdAt: existing?.createdAt || draft.createdAt || now,
      updatedAt: now,
      status,
      complianceResult: existing?.complianceResult || complianceResult,
      complianceScore: existing?.complianceScore ?? complianceScore,
      productName,
      brandName,
      category,
      packageType,
      batchNumber,
      notes,
      images,
      declarations,
      complianceAssessments,
      complianceSummary,
      findings: findings.length > 0 ? findings : (draft.findings || existing?.findings || []),
      decision,
      report,
    };

    this.inspections.set(inspectionId, stored);
    this.saveToDisk();

    console.log(`[InspectionStore] Synchronized draft ${inspectionId} (${productName}): ${stored.complianceResult} [Status: ${stored.status}]`);
    this.broadcast('INSPECTION_UPSERTED', stored);
    return stored;
  }

  public getAllReports(): any[] {
    this.loadFromDisk();
    const reports: any[] = [];
    for (const inspection of this.inspections.values()) {
      if (inspection.report) {
        reports.push({
          id: inspection.report.reportNumber,
          report_number: inspection.report.reportNumber,
          inspection_id: inspection.id,
          report_version: '1.0',
          generated_at: inspection.report.generatedAt,
          content_hash: inspection.report.contentHash,
          report_hash: inspection.report.reportHash,
          sha256: inspection.report.reportHash || inspection.report.contentHash,
          storage_path: `/api/v1/reports/${inspection.id}/pdf`,
          is_draft_preview: inspection.report.isDraftPreview ?? false,
          product_name: inspection.productName,
          status: inspection.status,
        });
      }
    }
    return reports.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
  }

  public getAllEvidence(): any[] {
    this.loadFromDisk();
    const evidence: any[] = [];
    for (const inspection of this.inspections.values()) {
      for (const img of inspection.images) {
        evidence.push({
          id: img.id,
          inspection_id: inspection.id,
          surface: img.surface,
          evidence_type: img.surface,
          mime_type: img.mimeType,
          storage_path: img.base64Thumbnail ? `data:${img.mimeType};base64,${img.base64Thumbnail}` : img.fileUrl,
          captured_at: inspection.createdAt,
          created_at: inspection.createdAt,
          sha256: img.id,
          quality_score: img.qualityScore,
        });
      }
    }
    return evidence;
  }

  public getAllAudits(): any[] {
    this.loadFromDisk();
    const audits: any[] = [];
    for (const inspection of this.inspections.values()) {
      audits.push({
        id: `audit-${inspection.id}-create`,
        created_at: inspection.createdAt,
        timestamp: inspection.createdAt,
        action: 'INSPECTION_CREATED',
        entity_type: 'INSPECTION',
        entity_id: inspection.id,
        actorRole: 'FIELD_INSPECTOR',
        metadata: { productName: inspection.productName, category: inspection.category },
      });
      if (inspection.complianceAssessments?.length > 0) {
        audits.push({
          id: `audit-${inspection.id}-eval`,
          created_at: inspection.updatedAt,
          timestamp: inspection.updatedAt,
          action: 'STATUTORY_RULES_EVALUATED',
          entity_type: 'RULE_ENGINE',
          entity_id: inspection.id,
          actorRole: 'SYSTEM_DETERMINISTIC',
          metadata: { ruleCount: inspection.complianceAssessments.length, result: inspection.complianceResult, score: inspection.complianceScore },
        });
      }
      if (inspection.decision) {
        audits.push({
          id: `audit-${inspection.id}-decide`,
          created_at: inspection.decision.decidedAt || inspection.updatedAt,
          timestamp: inspection.decision.decidedAt || inspection.updatedAt,
          action: 'DECISION_SEALED',
          entity_type: 'INSPECTOR_DECISION',
          entity_id: inspection.id,
          actorRole: 'FIELD_INSPECTOR',
          metadata: { decision: inspection.decision.decision, notes: inspection.decision.comments },
        });
      }
      if (inspection.report) {
        audits.push({
          id: `audit-${inspection.id}-report`,
          created_at: inspection.report.generatedAt,
          timestamp: inspection.report.generatedAt,
          action: 'REPORT_GENERATED',
          entity_type: 'REPORT',
          entity_id: inspection.id,
          actorRole: 'SYSTEM_REPORTING',
          metadata: { reportNumber: inspection.report.reportNumber, hash: inspection.report.reportHash },
        });
      }
    }
    return audits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getAllInspectors(): any[] {
    return [
      {
        id: '00000000-0000-4000-8000-000000000001',
        full_name: 'Field Inspector (Mobile Sync)',
        role: 'INSPECTOR',
        designation: 'Legal Metrology Inspector',
        employee_code: 'LMI-DL-2026',
        is_active: true,
        last_login_at: new Date().toISOString(),
      },
      {
        id: '00000000-0000-4000-8000-000000000002',
        full_name: 'Field Supervisor (Command Center)',
        role: 'SUPERVISOR',
        designation: 'Senior Legal Metrology Officer',
        employee_code: 'SLMO-HQ-001',
        is_active: true,
        last_login_at: new Date().toISOString(),
      },
    ];
  }

  public getSyncStatus(): any {
    this.loadFromDisk();
    const count = this.inspections.size;
    const recent = Array.from(this.inspections.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return {
      status: 'ONLINE',
      activeSubscribers: this.listeners.size,
      totalInspections: count,
      lastSyncAt: recent[0]?.updatedAt || new Date().toISOString(),
      lanEndpoint: 'http://10.60.111.108:3001',
      localEndpoint: 'http://localhost:3001',
      protocol: 'SSE + HTTP REST',
    };
  }
}

export const inspectionStore = new LocalInspectionStore();
