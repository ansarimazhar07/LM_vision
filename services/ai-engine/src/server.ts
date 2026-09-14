import http from 'node:http';
import {
  AppError,
  PackageAnalysisInputSchema,
  FindingExplanationInputSchema,
  InspectionReportSchema,
  type PackageAnalysisInput,
  type FindingExplanationInput,
  type InspectionReport,
} from '@lm-vision/shared-types';
import {
  assembleInspectionReport,
  renderReportToHtml,
  renderReportToJson,
  verifyReportIntegrity,
  type AssembleReportInput,
  AUTHORITATIVE_GSR202E_RULES,
} from '@lm-vision/rules';
import { AIEngineGateway, createProductionGateway } from './gateway.js';
import { generateReportPdf } from './reporting/pdfGenerator.js';
import { inspectionStore } from './storage/inspectionStore.js';

const MAX_BODY_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB payload limit for base64 inspection images

interface CachedReportPdf {
  pdfBuffer: Buffer;
  reportNumber: string;
  reportHash: string;
  contentHash: string;
  createdAt: number;
}

const reportPdfCache = new Map<string, CachedReportPdf>();

export interface ServerOptions {
  gateway?: AIEngineGateway;
  port?: number;
}

/**
 * Creates the HTTP Request Handler for the AI Engine Backend Service
 */
export function createAiEngineServer(gateway?: AIEngineGateway): http.Server {
  const aiGateway = gateway ?? createProductionGateway();

  const server = http.createServer(async (req, res) => {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    try {
      // 2. Route: Health Check
      if (req.method === 'GET' && (pathname === '/health' || pathname === '/api/v1/ai/health')) {
        const preferred = (url.searchParams.get('provider')?.toUpperCase() as any) || undefined;
        const health = await aiGateway.healthCheck(preferred);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            data: health,
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      // 2b. Route: Provider Router Operational Health (No credentials)
      if (
        req.method === 'GET' &&
        (pathname === '/health/ai' || pathname === '/api/v1/ai/health/ai' || pathname === '/api/v1/health/ai')
      ) {
        const healthSummary = aiGateway.getRouter().getHealthTracker().getOperationalHealthSummary();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            data: healthSummary,
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      // 3. Route: Package Analysis (with Gemini -> xAI Grok -> Cloud Unavailable failover)
      if (req.method === 'POST' && pathname === '/api/v1/ai/package-analysis') {
        console.log(`[LM-Vision AI Engine] Received POST /api/v1/ai/package-analysis from ${req.socket.remoteAddress}`);
        const rawBody = await readRequestBody(req, MAX_BODY_SIZE_BYTES);
        let parsedJson: unknown;

        try {
          parsedJson = JSON.parse(rawBody);
        } catch {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: 'Invalid JSON body in package analysis request.',
            statusCode: 400,
          });
        }

        // Validate client input strictly against canonical PackageAnalysisInputSchema
        const inputValidation = PackageAnalysisInputSchema.safeParse(parsedJson);
        if (!inputValidation.success) {
          const issueList = inputValidation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: `Invalid package analysis input payload: ${issueList}`,
            statusCode: 400,
          });
        }

        const inputPayload: PackageAnalysisInput = inputValidation.data;

        // Server-Controlled Provider Determination:
        // Dispatches through ProviderRouter (Gemini -> xAI Grok -> Cloud Unavailable).
        const requestedProvider = (url.searchParams.get('provider')?.toUpperCase() as any) || undefined;
        const routerResult = await aiGateway.routePackageAnalysis(inputPayload, requestedProvider);

        if (routerResult.status === 'CLOUD_AI_UNAVAILABLE') {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              code: 'CLOUD_AI_UNAVAILABLE',
              message: 'Cloud AI providers (Gemini & Grok) unavailable. Continue with offline local analysis.',
              metadata: {
                status: 'CLOUD_AI_UNAVAILABLE',
                cloudProvidersAttempted: routerResult.cloudProvidersAttempted,
                fallbackFrom: routerResult.fallbackFrom,
                latencyMs: routerResult.latencyMs,
              },
              timestamp: new Date().toISOString(),
            })
          );
          return;
        }

        const analysis = routerResult.packageAnalysis!;

        // Record inspection in persistent store for real-time dashboard sync
        try {
          inspectionStore.saveAnalysis(inputPayload, analysis);
        } catch (storeErr) {
          console.warn('[LM-Vision AI Engine] Error storing inspection in LocalInspectionStore:', storeErr);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            data: analysis,
            metadata: {
              status: routerResult.status,
              provider: routerResult.provider,
              model: routerResult.model,
              fallbackFrom: routerResult.fallbackFrom,
              cloudProvidersAttempted: routerResult.cloudProvidersAttempted,
              latencyMs: routerResult.latencyMs,
            },
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      // 4. Route: Explain Finding
      if (req.method === 'POST' && pathname === '/api/v1/ai/explain-finding') {
        const rawBody = await readRequestBody(req, 1024 * 1024); // 1 MB
        let parsedJson: unknown;

        try {
          parsedJson = JSON.parse(rawBody);
        } catch {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: 'Invalid JSON body in explain finding request.',
            statusCode: 400,
          });
        }

        const inputValidation = FindingExplanationInputSchema.safeParse(parsedJson);
        if (!inputValidation.success) {
          const issueList = inputValidation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: `Invalid explain finding input: ${issueList}`,
            statusCode: 400,
          });
        }

        const inputPayload: FindingExplanationInput = inputValidation.data;
        const requestedProvider = (url.searchParams.get('provider')?.toUpperCase() as any) || undefined;
        const explanation = await aiGateway.explainFinding(inputPayload, requestedProvider);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            data: explanation,
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      // 5. Route: Generate Report (HTML + Canonical JSON + Hashes)
      if (req.method === 'POST' && pathname === '/api/v1/reports/generate') {
        const rawBody = await readRequestBody(req, 10 * 1024 * 1024); // 10 MB
        let parsedJson: any;

        try {
          parsedJson = JSON.parse(rawBody);
        } catch {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: 'Invalid JSON body in report generation request.',
            statusCode: 400,
          });
        }

        // Security check: Reject final report generation if inspection is not DECIDED
        if (parsedJson.isDraftPreview === false && parsedJson.inspectionStatus !== 'DECIDED') {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: `Cannot generate finalized inspection report: inspection status is '${parsedJson.inspectionStatus}', but must be 'DECIDED'.`,
            statusCode: 400,
          });
        }

        const report = assembleInspectionReport(parsedJson as AssembleReportInput);
        const html = renderReportToHtml(report);
        const json = renderReportToJson(report);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            data: {
              report,
              html,
              json,
              reportHash: report.reportHash,
              contentHash: report.contentHash,
            },
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      // 6. Route: Stream Binary PDF Report
      if (req.method === 'POST' && pathname === '/api/v1/reports/pdf') {
        const rawBody = await readRequestBody(req, 10 * 1024 * 1024); // 10 MB
        let parsedJson: any;

        try {
          parsedJson = JSON.parse(rawBody);
        } catch {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: 'Invalid JSON body in PDF generation request.',
            statusCode: 400,
          });
        }

        let report: InspectionReport;
        if (parsedJson.contentHash && parsedJson.reportHash) {
          const reportValidation = InspectionReportSchema.safeParse(parsedJson);
          if (!reportValidation.success) {
            const issueList = reportValidation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
            throw new AppError({
              code: 'VALIDATION_ERROR',
              message: `Invalid report payload for PDF generation: ${issueList}`,
              statusCode: 400,
            });
          }
          report = reportValidation.data;
        } else {
          report = assembleInspectionReport(parsedJson as AssembleReportInput);
        }

        if (report.isDraftPreview === false && report.inspectionStatus !== 'DECIDED') {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: `Cannot generate finalized inspection report: inspection status is '${report.inspectionStatus}', but must be 'DECIDED'.`,
            statusCode: 400,
          });
        }

        const pdfBuffer = await generateReportPdf(report);

        // Cache generated PDF for direct GET / browser download by reportNumber and inspectionId
        const cacheEntry = {
          pdfBuffer,
          reportNumber: report.reportNumber,
          reportHash: report.reportHash,
          contentHash: report.contentHash,
          createdAt: Date.now(),
        };
        reportPdfCache.set(report.reportNumber, cacheEntry);
        if (report.inspectionId) {
          reportPdfCache.set(report.inspectionId, cacheEntry);
        }

        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${report.reportNumber}.pdf"`,
          'Content-Length': pdfBuffer.length,
          'X-Report-Hash': report.reportHash,
          'X-Content-Hash': report.contentHash,
          'X-Download-Url': `/api/v1/reports/${encodeURIComponent(report.reportNumber)}/pdf`,
        });
        res.end(pdfBuffer);
        return;
      }

      // 6b. Route: Download / Stream PDF Report via GET
      const reportPdfMatch = pathname.match(/^\/api\/v1\/reports\/([^/]+)\/pdf$/);
      if (req.method === 'GET' && reportPdfMatch && reportPdfMatch[1]) {
        const reportId = decodeURIComponent(reportPdfMatch[1]);
        const cached = reportPdfCache.get(reportId);
        if (!cached) {
          throw new AppError({
            code: 'NOT_FOUND',
            message: `Report PDF '${reportId}' not found in cache. Generate it first via POST /api/v1/reports/pdf.`,
            statusCode: 404,
          });
        }

        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${cached.reportNumber}.pdf"`,
          'Content-Length': cached.pdfBuffer.length,
          'X-Report-Hash': cached.reportHash,
          'X-Content-Hash': cached.contentHash,
        });
        res.end(cached.pdfBuffer);
        return;
      }

      // 7. Route: Verify Report Integrity
      if (req.method === 'POST' && pathname === '/api/v1/reports/verify') {
        const rawBody = await readRequestBody(req, 10 * 1024 * 1024);
        let parsedJson: any;

        try {
          parsedJson = JSON.parse(rawBody);
        } catch {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: 'Invalid JSON body in verify request.',
            statusCode: 400,
          });
        }

        const reportData = parsedJson.report || parsedJson;
        const expectedHash = parsedJson.expectedReportHash;

        const reportValidation = InspectionReportSchema.safeParse(reportData);
        if (!reportValidation.success) {
          const issueList = reportValidation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: `Invalid report payload for integrity verification: ${issueList}`,
            statusCode: 400,
          });
        }

        const verification = verifyReportIntegrity(reportValidation.data, expectedHash);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            data: verification,
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      // 8. Route: Dashboard Operations Overview
      if (req.method === 'GET' && (pathname === '/api/v1/dashboard/overview' || pathname === '/api/v1/dashboard')) {
        const overview = inspectionStore.getOverview();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: overview, timestamp: new Date().toISOString() }));
        return;
      }

      // 9. Route: List Inspections with Filters and Pagination
      if (req.method === 'GET' && pathname === '/api/v1/inspections') {
        const search = url.searchParams.get('search') || undefined;
        const status = url.searchParams.get('status') || undefined;
        const resultParam = url.searchParams.get('result') || undefined;
        const category = url.searchParams.get('category') || undefined;
        const page = Number(url.searchParams.get('page') || 1);
        const pageSize = Number(url.searchParams.get('pageSize') || 25);
        const result = inspectionStore.listInspections({ search, status, result: resultParam, category, page, pageSize });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: result, timestamp: new Date().toISOString() }));
        return;
      }

      // 10. Route: Inspection Details by ID
      const inspectionDetailMatch = pathname.match(/^\/api\/v1\/inspections\/([^/]+)$/);
      if (req.method === 'GET' && inspectionDetailMatch && inspectionDetailMatch[1]) {
        const inspectionId = decodeURIComponent(inspectionDetailMatch[1]);
        const item = inspectionStore.getInspection(inspectionId);
        if (!item) {
          throw new AppError({ code: 'NOT_FOUND', message: `Inspection '${inspectionId}' not found.`, statusCode: 404 });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: item, timestamp: new Date().toISOString() }));
        return;
      }

      // 11. Route: Sync Draft from Mobile Client
      if (req.method === 'POST' && (pathname === '/api/v1/inspections/sync' || pathname === '/api/v1/sync/draft' || pathname === '/api/v1/dashboard/sync')) {
        const rawBody = await readRequestBody(req, 10 * 1024 * 1024);
        let parsedJson: any;
        try {
          parsedJson = JSON.parse(rawBody);
        } catch {
          throw new AppError({ code: 'VALIDATION_ERROR', message: 'Invalid JSON body in sync request.', statusCode: 400 });
        }
        const draftData = parsedJson?.draft || parsedJson;
        const synced = inspectionStore.saveDraft(draftData);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: synced, savedCount: 1, timestamp: new Date().toISOString() }));
        return;
      }

      // 12. Route: Sync Status
      if (req.method === 'GET' && pathname === '/api/v1/sync/status') {
        const status = inspectionStore.getSyncStatus();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: status, timestamp: new Date().toISOString() }));
        return;
      }

      // 12b. Route: Authoritative Statutory Rules
      if (req.method === 'GET' && pathname === '/api/v1/rules') {
        const rules = AUTHORITATIVE_GSR202E_RULES.map((r) => ({
          ...r,
          rule_number: r.ruleNumber,
          rule_title: r.title,
          id: r.ruleId,
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: rules, timestamp: new Date().toISOString() }));
        return;
      }

      // 12c. Route: Reports List
      if (req.method === 'GET' && pathname === '/api/v1/reports') {
        const reports = inspectionStore.getAllReports();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: reports, timestamp: new Date().toISOString() }));
        return;
      }

      // 12d. Route: Evidence List
      if (req.method === 'GET' && pathname === '/api/v1/evidence') {
        const evidence = inspectionStore.getAllEvidence();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: evidence, timestamp: new Date().toISOString() }));
        return;
      }

      // 12e. Route: Audit Logs
      if (req.method === 'GET' && pathname === '/api/v1/audit') {
        const audits = inspectionStore.getAllAudits();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: audits, timestamp: new Date().toISOString() }));
        return;
      }

      // 12f. Route: Inspectors Directory
      if (req.method === 'GET' && pathname === '/api/v1/inspectors') {
        const inspectors = inspectionStore.getAllInspectors();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: inspectors, timestamp: new Date().toISOString() }));
        return;
      }

      // 13. 404 Not Found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Endpoint ${req.method} ${pathname} not found.`,
            statusCode: 404,
          },
          timestamp: new Date().toISOString(),
        })
      );
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : 500;
      const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
      const message = err?.message
        ? err.message
            .replace(/key=[^&\s]+/gi, 'key=***')
            .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***')
        : 'Internal server error';

      console.error(`[LM-Vision AI Engine] Request Error (${statusCode} ${code}):`, message);

      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          error: {
            code,
            message,
            statusCode,
          },
          timestamp: new Date().toISOString(),
        })
      );
    }
  });

  return server;
}

/**
 * Starts the AI Engine Server on configured port
 */
export async function startAiEngineServer(options?: ServerOptions): Promise<{ server: http.Server; port: number }> {
  const server = createAiEngineServer(options?.gateway);
  const port =
    options?.port ??
    (typeof process !== 'undefined'
      ? Number(process.env['AI_ENGINE_PORT'] || process.env['PORT'] || 3001)
      : 3001);

  return new Promise((resolve) => {
    server.listen(port, '0.0.0.0', () => {
      resolve({ server, port });
    });
  });
}

/**
 * Helper to buffer stream request body with byte size limit
 */
function readRequestBody(req: http.IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytesRead = 0;

    req.on('data', (chunk: Buffer) => {
      bytesRead += chunk.length;
      if (bytesRead > maxBytes) {
        req.destroy();
        reject(
          new AppError({
            code: 'VALIDATION_ERROR',
            message: `Request body exceeded maximum permitted size of ${(maxBytes / (1024 * 1024)).toFixed(0)}MB.`,
            statusCode: 413,
          })
        );
        return;
      }
      body += chunk.toString('utf8');
    });

    req.on('end', () => {
      resolve(body);
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}
