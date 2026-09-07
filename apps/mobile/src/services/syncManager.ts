import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type ConnectionState,
  type SyncConflict,
  type SyncOperation,
  type SyncErrorCategory,
  type SyncStatus,
  SyncConflictSchema,
} from '@lm-vision/shared-types';
import type { LocalInspectionDraft } from '../state/draft';
import { isLocalOnlyMode } from '../config';
import { DurableSyncQueue, durableSyncQueue, getRetryDelayMs } from './syncQueue';

export interface SyncSnapshot {
  state: ConnectionState;
  pendingOperations: number;
  failedOperations: number;
  conflicts: number;
  lastSuccessfulSync?: string;
  lastError?: string;
}

export interface SyncPersistPatch {
  localId: string;
  patch: Partial<LocalInspectionDraft>;
}

export interface SyncRunResult {
  state: ConnectionState;
  completed: number;
  failed: number;
  conflicts: number;
  skipped: number;
}

type PersistDraft = (patch: SyncPersistPatch) => Promise<void>;

const TRANSIENT_ERROR_PATTERNS = [/network/i, /timeout/i, /timed out/i, /fetch/i, /5\d\d/, /connection reset/i, /temporar/i, /storage/i];
const FINALIZED_STATUSES = new Set(['DECIDED', 'REPORT_GENERATED', 'ARCHIVED']);

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return 'Synchronization failed.';
}

function classifyError(error: unknown): { category: SyncErrorCategory; retryable: boolean; message: string } {
  const message = errorMessage(error);
  const code = error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : '';
  if (/23514|INSPECTION_LOCKED|finalized/i.test(message)) return { category: 'FINALIZATION_PROTECTION', retryable: false, message };
  if (/401|jwt|auth|session expired|token/i.test(`${code} ${message}`)) return { category: 'AUTHENTICATION', retryable: false, message };
  if (/403|permission|not authorized|row-level security/i.test(`${code} ${message}`)) return { category: 'AUTHORIZATION', retryable: false, message };
  if (/409|conflict|duplicate/i.test(`${code} ${message}`)) return { category: 'CONFLICT', retryable: false, message };
  if (/400|422|invalid|constraint|schema/i.test(`${code} ${message}`)) return { category: 'VALIDATION', retryable: false, message };
  if (TRANSIENT_ERROR_PATTERNS.some((pattern) => pattern.test(message)) || /^5\d\d$/.test(code)) {
    return { category: /storage/i.test(message) ? 'STORAGE' : /5\d\d/.test(code) ? 'SERVER' : 'NETWORK', retryable: true, message };
  }
  return { category: 'UNKNOWN', retryable: false, message };
}

function uuidOrStable(value: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return value;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619) >>> 0;
  const hex = `${hash.toString(16).padStart(8, '0')}${Array.from(value).reduce((seed, char, index) => `${seed}${((char.charCodeAt(0) * (index + 17) * 2654435761) >>> 0).toString(16).padStart(8, '0')}`, '')}`.slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${hex.slice(18, 22)}-${hex.slice(22, 34).padEnd(12, '0')}`;
}

function asJson(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return { value };
}

function fileExtension(mimeType: string): string {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('heic')) return 'heic';
  return 'jpg';
}

function imageStoragePath(inspectionId: string, imageId: string, mimeType: string): string {
  return `${inspectionId}/${imageId}.${fileExtension(mimeType)}`;
}

export class SyncManager {
  private readonly queue: DurableSyncQueue;
  private running = false;
  private snapshot: SyncSnapshot = {
    state: 'OFFLINE',
    pendingOperations: 0,
    failedOperations: 0,
    conflicts: 0,
  };
  private listeners = new Set<(snapshot: SyncSnapshot) => void>();

  constructor(queue: DurableSyncQueue = durableSyncQueue) {
    this.queue = queue;
  }

  subscribe(listener: (snapshot: SyncSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): SyncSnapshot {
    return this.snapshot;
  }

  async refreshSnapshot(): Promise<SyncSnapshot> {
    try {
      const operations = await this.queue.list();
      this.setSnapshot({
        pendingOperations: operations.filter((operation) => operation.status === 'QUEUED' || operation.status === 'IN_PROGRESS').length,
        failedOperations: operations.filter((operation) => operation.status === 'FAILED').length,
        conflicts: operations.filter((operation) => operation.status === 'CONFLICT').length,
      });
    } catch (error) {
      console.warn('[SyncManager] Failed to refresh snapshot:', error);
    }
    return this.snapshot;
  }

  async enqueueDraft(draft: LocalInspectionDraft): Promise<SyncOperation[]> {
    const inspectionId = draft.serverId || draft.localId;
    const operations: SyncOperation[] = [];
    const enqueue = async (input: Parameters<DurableSyncQueue['enqueue']>[0]): Promise<SyncOperation> => {
      const operation = await this.queue.enqueue(input);
      operations.push(operation);
      return operation;
    };

    const inspection = await enqueue({
      inspectionId: draft.localId,
      entityType: 'INSPECTION',
      entityId: inspectionId,
      operationType: 'UPSERT_INSPECTION',
      entityVersion: draft.version,
      payload: {
        id: inspectionId,
        source_type: draft.sourceType,
        status: draft.isFinalized ? 'READY_FOR_DECISION' : draft.status,
        location_metadata: {
          category: draft.category,
          packageType: draft.packageType,
          productName: draft.productName,
          brandName: draft.brandName,
          batchNumber: draft.batchNumber,
          notes: draft.notes,
        },
        rule_version_context: {
          ruleBundleId: draft.complianceSummary?.ruleBundleId,
          engineVersion: draft.complianceSummary?.engineVersion,
        },
        started_at: draft.createdAt,
        created_at: draft.createdAt,
        local_updated_at: draft.updatedAt,
        known_remote_updated_at: draft.remoteUpdatedAt,
      },
    });

    const imageOperations = new Map<string, SyncOperation>();
    for (const image of draft.images) {
      const upload = await enqueue({
        inspectionId: draft.localId,
        entityType: 'INSPECTION_IMAGE',
        entityId: image.id,
        operationType: 'UPLOAD_IMAGE',
        entityVersion: draft.version,
        payload: {
          inspectionId,
          imageId: image.id,
          localFileUri: image.fileUrl,
          // CRITICAL: Do NOT store image.base64Data here.
          // Multi-megabyte base64 strings cause SQLite CursorWindow 2MB overflow on Android.
          mimeType: image.mimeType,
          sha256Hash: image.sha256Hash,
        },
        dependsOn: [inspection.operationId],
      });
      imageOperations.set(image.id, upload);
      await enqueue({
        inspectionId: draft.localId,
        entityType: 'INSPECTION_IMAGE',
        entityId: image.id,
        operationType: 'UPSERT_INSPECTION_IMAGE',
        entityVersion: draft.version,
        payload: {
          id: uuidOrStable(image.id),
          inspection_id: inspectionId,
          storage_path: imageStoragePath(inspectionId, image.id, image.mimeType),
          sha256: image.sha256Hash,
          mime_type: image.mimeType,
          surface: image.surface,
          capture_metadata: { localFileUri: image.fileUrl },
          quality_score: image.quality?.overallScore,
          created_at: image.createdAt,
        },
        dependsOn: [upload.operationId],
      });
    }

    const analysisId = draft.aiAnalysis ? uuidOrStable(`${draft.localId}:analysis`) : undefined;
    if (draft.aiAnalysis && analysisId) {
      await enqueue({
        inspectionId: draft.localId,
        entityType: 'AI_ANALYSIS',
        entityId: analysisId,
        operationType: 'UPSERT_AI_ANALYSIS',
        entityVersion: draft.version,
        payload: {
          id: analysisId,
          inspection_id: inspectionId,
          provider: draft.aiAnalysis.provider,
          model: draft.aiAnalysis.modelName,
          schema_version: '1.0',
          status: 'COMPLETED',
          confidence: draft.aiAnalysis.quality.overallScore,
          payload: draft.aiAnalysis,
          created_at: draft.aiAnalysis.timestamp,
        },
        dependsOn: [inspection.operationId],
      });
    }

    for (const declaration of draft.declarations) {
      const declarationId = uuidOrStable(`${draft.localId}:${declaration.type}`);
      await enqueue({
        inspectionId: draft.localId,
        entityType: 'DECLARATION',
        entityId: declarationId,
        operationType: 'UPSERT_DECLARATION',
        entityVersion: draft.version,
        payload: {
          id: declarationId,
          inspection_id: inspectionId,
          ai_analysis_id: analysisId || uuidOrStable(`${draft.localId}:analysis`),
          field_name: declaration.type,
          raw_value: declaration.rawText,
          normalized_value: { value: declaration.normalizedValue ?? null, unit: declaration.unit ?? null },
          confidence: declaration.confidence,
          verification_status: 'UNVERIFIED',
          evidence_refs: [],
        },
        dependsOn: [inspection.operationId, ...(analysisId ? operations.filter((operation) => operation.entityId === analysisId).map((operation) => operation.operationId) : [])],
      });
    }

    for (const finding of draft.findings) {
      const findingType = finding.ruleId && /^[0-9a-f-]{36}$/i.test(finding.ruleId) ? 'RULE_BASED' : 'AI_OBSERVATION';
      await enqueue({
        inspectionId: draft.localId,
        entityType: 'FINDING',
        entityId: finding.id,
        operationType: 'UPSERT_FINDING',
        entityVersion: draft.version,
        payload: {
          id: finding.id,
          inspection_id: inspectionId,
          rule_version_id: findingType === 'RULE_BASED' ? finding.ruleId : null,
          finding_type: findingType,
          status: finding.status,
          title: finding.title,
          explanation: finding.description,
          confidence: finding.confidence,
          human_review_required: finding.status === 'MANUAL_REVIEW',
        },
        dependsOn: [inspection.operationId],
      });
    }

    for (const assessment of draft.complianceAssessments) {
      await enqueue({
        inspectionId: draft.localId,
        entityType: 'COMPLIANCE_ASSESSMENT',
        entityId: assessment.id,
        operationType: 'UPSERT_COMPLIANCE_ASSESSMENT',
        entityVersion: draft.version,
        payload: {
          id: assessment.id,
          inspection_id: inspectionId,
          rule_id: assessment.ruleId,
          rule_version_id: assessment.ruleVersionId,
          rule_number: assessment.ruleNumber,
          sub_rule: assessment.subRule,
          rule_title: assessment.ruleTitle,
          rule_kind: assessment.ruleKind,
          source_document: assessment.ruleSource.sourceDocument,
          source_page: assessment.ruleSource.sourcePage,
          gazette_notification_number: assessment.ruleSource.gazetteNotificationNumber,
          clause_reference: assessment.ruleSource.clauseReference,
          result: assessment.result,
          evidence_sufficiency: assessment.evidenceSufficiency,
          severity: assessment.severity,
          explanation: assessment.explanation,
          observed_value: asJson(assessment.observedValue),
          expected_constraint: asJson(assessment.expectedConstraint),
          deviation: assessment.deviation,
          declaration_ids: assessment.declarationIds,
          evidence_ids: assessment.evidenceIds,
          confidence: assessment.confidence,
          ai_explanation: assessment.aiExplanation,
          engine_version: assessment.engineVersion,
          rule_bundle_id: assessment.ruleBundleId,
          evaluated_at: assessment.evaluatedAt,
          created_at: assessment.createdAt,
        },
        dependsOn: [inspection.operationId],
      });
    }

    for (const review of draft.reviews) {
      await enqueue({
        inspectionId: draft.localId,
        entityType: 'INSPECTOR_REVIEW',
        entityId: review.id,
        operationType: 'UPSERT_INSPECTOR_REVIEW',
        entityVersion: draft.version,
        payload: {
          id: review.id,
          inspection_id: inspectionId,
          assessment_id: review.assessmentId,
          inspector_id: review.inspectorUserId,
          status: review.status,
          action: review.action,
          original_result: review.originalResult,
          original_observed_value: asJson(review.originalObservedValue),
          original_confidence: review.originalConfidence,
          reviewed_evidence: review.reviewedEvidence,
          reviewed_rule: review.reviewedRule,
          reviewed_observation: review.reviewedObservation,
          correction: review.correction,
          rationale: review.rationale,
          reviewed_at: review.reviewedAt,
          created_at: review.createdAt,
          updated_at: review.updatedAt,
        },
        dependsOn: [inspection.operationId],
      });
    }

    for (const evidence of draft.evidence) {
      const image = draft.images.find((candidate) => candidate.id === evidence.fileUrl || candidate.sha256Hash === evidence.sha256Hash);
      const imageDependency = image ? imageOperations.get(image.id)?.operationId : undefined;
      await enqueue({
        inspectionId: draft.localId,
        entityType: 'EVIDENCE',
        entityId: evidence.id,
        operationType: 'UPSERT_EVIDENCE',
        entityVersion: draft.version,
        payload: {
          id: evidence.id,
          inspection_id: inspectionId,
          finding_id: evidence.findingId,
          evidence_type: evidence.type === 'PACKAGE_IMAGE' ? 'IMAGE' : 'OTHER',
          storage_path: image ? imageStoragePath(inspectionId, image.id, image.mimeType) : null,
          sha256: evidence.sha256Hash,
          source_reference: { title: evidence.title, localFileUri: evidence.fileUrl },
          captured_at: evidence.capturedAt,
          captured_by: evidence.capturedByUserId,
          status: evidence.status,
          created_at: evidence.createdAt,
        },
        dependsOn: [inspection.operationId, ...(imageDependency ? [imageDependency] : [])],
      });
    }

    let decisionOperation: SyncOperation | undefined;
    if (draft.inspectorDecision) {
      decisionOperation = await enqueue({
        inspectionId: draft.localId,
        entityType: 'DECISION',
        entityId: draft.inspectorDecision.id,
        operationType: 'INSERT_DECISION',
        entityVersion: draft.version,
        payload: {
          id: draft.inspectorDecision.id,
          inspection_id: inspectionId,
          inspector_id: draft.inspectorDecision.inspectorUserId,
          decision: draft.inspectorDecision.decision,
          comments: draft.inspectorDecision.summaryNotes,
          decided_at: draft.inspectorDecision.decidedAt,
        },
        dependsOn: [inspection.operationId, ...operations.filter((operation) => operation.entityType === 'COMPLIANCE_ASSESSMENT' || operation.entityType === 'INSPECTOR_REVIEW').map((operation) => operation.operationId)],
      });
    }

    const auditOperations: SyncOperation[] = [];
    for (const audit of draft.auditTrail) {
      const auditOperation = await enqueue({
        inspectionId: draft.localId,
        entityType: 'AUDIT_EVENT',
        entityId: audit.id,
        operationType: 'INSERT_AUDIT_EVENT',
        entityVersion: draft.version,
        payload: {
          id: audit.id,
          inspection_id: inspectionId,
          actor_user_id: audit.actorUserId,
          action: audit.action,
          entity_type: audit.targetType,
          entity_id: audit.targetId,
          before_data: audit.previousState,
          after_data: audit.newState,
          metadata: { actorRole: audit.actorRole, changeSummary: audit.changeSummary },
          created_at: audit.timestamp,
        },
        dependsOn: [inspection.operationId],
      });
      auditOperations.push(auditOperation);
    }

    let finalizationOperation: SyncOperation | undefined;
    if (draft.isFinalized) {
      finalizationOperation = await enqueue({
        inspectionId: draft.localId,
        entityType: 'INSPECTION',
        entityId: inspectionId,
        operationType: 'FINALIZE_INSPECTION',
        entityVersion: draft.version,
        payload: { status: 'DECIDED', completed_at: draft.finalizedAt, updated_at: draft.updatedAt },
        dependsOn: [inspection.operationId, ...(decisionOperation ? [decisionOperation.operationId] : []), ...auditOperations.map((operation) => operation.operationId)],
      });
    }

    for (const amendment of draft.amendments) {
      await enqueue({
        inspectionId: draft.localId,
        entityType: 'AMENDMENT',
        entityId: amendment.id,
        operationType: 'INSERT_AMENDMENT',
        entityVersion: draft.version,
        payload: {
          id: amendment.id,
          inspection_id: inspectionId,
          amended_by_user_id: amendment.amendedByUserId,
          amendment_reason: amendment.amendmentReason,
          previous_decision: amendment.previousDecision,
          new_decision: amendment.newDecision,
          previous_state: amendment.previousState,
          new_state: amendment.newState,
          amended_at: amendment.amendedAt,
        },
        dependsOn: finalizationOperation ? [finalizationOperation.operationId] : [inspection.operationId],
      });
    }
    await this.refreshSnapshot();
    return operations;
  }

  async sync(supabase: SupabaseClient | null | undefined, persistDraft: PersistDraft): Promise<SyncRunResult> {
    if (this.running) return { state: this.snapshot.state, completed: 0, failed: 0, conflicts: 0, skipped: 0 };
    this.running = true;
    let completed = 0;
    let failed = 0;
    let conflicts = 0;
    let skipped = 0;
    try {
      if (isLocalOnlyMode()) {
        const operations = await this.queue.pending();
        this.setSnapshot({ state: 'OFFLINE' });
        return { state: 'OFFLINE', completed, failed, conflicts, skipped: operations.length };
      }
      if (!supabase) {
        this.setSnapshot({ state: 'OFFLINE' });
        return { state: 'OFFLINE', completed, failed, conflicts, skipped };
      }
      const session = await supabase.auth.getSession();
      if (session.error || !session.data.session?.user) {
        this.setSnapshot({ state: 'OFFLINE', lastError: session.error?.message });
        return { state: 'OFFLINE', completed, failed, conflicts, skipped };
      }
      const userId = session.data.session.user.id;
      const operations = await this.queue.pending();
      if (operations.length === 0) {
        this.setSnapshot({ state: 'SYNCED', pendingOperations: 0 });
        return { state: 'SYNCED', completed, failed, conflicts, skipped };
      }
      this.setSnapshot({ state: 'SYNCING' });

      for (const operation of operations) {
        const latest = (await this.queue.list()).find((candidate) => candidate.operationId === operation.operationId);
        if (!latest || latest.status === 'COMPLETED' || latest.status === 'CONFLICT') { skipped += 1; continue; }
        const dependencies = await this.queue.list();
        const blockedBy = latest.dependsOn.some((dependencyId) => dependencies.find((candidate) => candidate.operationId === dependencyId)?.status !== 'COMPLETED');
        if (blockedBy) { skipped += 1; continue; }
        if (latest.lastAttemptAt && Date.now() - new Date(latest.lastAttemptAt).getTime() < getRetryDelayMs(latest.attemptCount)) { skipped += 1; continue; }

        await this.queue.updateStatus(latest.operationId, 'IN_PROGRESS', {
          attemptCount: latest.attemptCount + 1,
          lastAttemptAt: new Date().toISOString(),
        });
        try {
          await this.executeOperation(supabase, userId, latest, persistDraft);
          await this.queue.updateStatus(latest.operationId, 'COMPLETED', { lastError: undefined, errorCategory: undefined });
          completed += 1;
        } catch (error) {
          const classified = classifyError(error);
          if (classified.category === 'AUTHENTICATION') {
            const refreshed = await supabase.auth.refreshSession();
            if (!refreshed.error && refreshed.data.session) {
              await this.queue.updateStatus(latest.operationId, 'QUEUED', { errorCategory: undefined, lastError: undefined });
              skipped += 1;
              continue;
            }
          }
          const retryable = classified.retryable && latest.attemptCount < 5;
          if (classified.category === 'CONFLICT' || classified.category === 'FINALIZATION_PROTECTION') {
            await this.queue.updateStatus(latest.operationId, 'CONFLICT', { errorCategory: classified.category, lastError: classified.message, retryable: false });
            const conflict = this.makeConflict(latest, classified.message, classified.category === 'FINALIZATION_PROTECTION' ? 'FINALIZATION_CONFLICT' : 'CONTENT_CONFLICT');
            await persistDraft({ localId: latest.inspectionId, patch: { syncStatus: 'SYNC_CONFLICT', conflictState: conflict, syncError: classified.message } });
            conflicts += 1;
          } else if (retryable) {
            await this.queue.updateStatus(latest.operationId, 'QUEUED', { errorCategory: classified.category, lastError: classified.message, retryable: true });
            skipped += 1;
          } else {
            await this.queue.updateStatus(latest.operationId, 'FAILED', { errorCategory: classified.category, lastError: classified.message, retryable: false });
            await persistDraft({ localId: latest.inspectionId, patch: { syncStatus: 'SYNC_FAILED', syncError: classified.message } });
            failed += 1;
          }
        }
      }
      const remaining = await this.queue.pending();
      const hasConflict = remaining.some((operation) => operation.status === 'CONFLICT');
      const hasFailed = remaining.some((operation) => operation.status === 'FAILED');
      const finalState: ConnectionState = hasConflict ? 'CONFLICT' : hasFailed ? 'SYNC_FAILED' : remaining.length === 0 ? 'SYNCED' : 'ONLINE';
      this.setSnapshot({ state: finalState, lastSuccessfulSync: finalState === 'SYNCED' ? new Date().toISOString() : this.snapshot.lastSuccessfulSync, lastError: hasFailed ? remaining.find((operation) => operation.status === 'FAILED')?.lastError : undefined });
      return { state: finalState, completed, failed, conflicts, skipped };
    } finally {
      this.running = false;
      await this.refreshSnapshot();
    }
  }

  private async executeOperation(supabase: SupabaseClient, userId: string, operation: SyncOperation, persistDraft: PersistDraft): Promise<void> {
    if (await this.hasReceipt(supabase, operation)) return;
    await this.performOperation(supabase, userId, operation, persistDraft);
    await this.recordReceipt(supabase, userId, operation);
  }

  private async performOperation(supabase: SupabaseClient, userId: string, operation: SyncOperation, persistDraft: PersistDraft): Promise<void> {
    if (isLocalOnlyMode()) {
      throw new Error(`LOCAL_ONLY_NETWORK_VIOLATION: Remote sync operation attempted in LOCAL_ONLY validation mode (${operation.operationType}).`);
    }
    const payload = { ...(operation.payload || {}) } as Record<string, unknown>;
    if (operation.operationType === 'UPLOAD_IMAGE') {
      const inspectionId = String(payload.inspectionId);
      const imageId = String(payload.imageId);
      const mimeType = String(payload.mimeType || 'image/jpeg');
      const localFileUri = String(payload.localFileUri || '');
      const base64Data = payload.base64Data ? String(payload.base64Data) : '';
      const uri = localFileUri || (base64Data ? `data:${mimeType};base64,${base64Data}` : '');
      if (!uri) throw new Error('Image has no local file reference.');
      const response = await fetch(uri);
      if (!response.ok && !uri.startsWith('data:')) throw new Error(`Image read failed with HTTP ${response.status}.`);
      const body = await response.blob();
      const path = imageStoragePath(inspectionId, imageId, mimeType);
      const { error } = await supabase.storage.from('inspection-images').upload(path, body, { contentType: mimeType, upsert: true });
      if (error) throw error;
      return;
    }

    if (operation.operationType === 'FINALIZE_INSPECTION') {
      const { data: remote, error: remoteError } = await supabase.from('inspections').select('id,status,updated_at').eq('id', operation.entityId).maybeSingle();
      if (remoteError) throw remoteError;
      if (remote && FINALIZED_STATUSES.has(String(remote.status)) && remote.status !== 'DECIDED') throw new Error('INSPECTION_LOCKED: Remote inspection is already finalized.');
      const { error } = await supabase.from('inspections').update({ status: 'DECIDED', completed_at: payload.completed_at || new Date().toISOString(), updated_at: payload.updated_at || new Date().toISOString() }).eq('id', operation.entityId);
      if (error) throw error;
      await persistDraft({ localId: operation.inspectionId, patch: { syncStatus: 'SYNCED', lastSyncedAt: new Date().toISOString(), serverId: operation.entityId, syncError: undefined } });
      return;
    }

    if (operation.operationType === 'UPSERT_INSPECTION') {
      const { data: remote, error: remoteError } = await supabase.from('inspections').select('*').eq('id', operation.entityId).maybeSingle();
      if (remoteError) throw remoteError;
      const localUpdatedAt = String(payload.local_updated_at || operation.createdAt);
      const knownRemoteUpdatedAt = payload.known_remote_updated_at ? String(payload.known_remote_updated_at) : undefined;
      const localChangedAfterKnownRemote = Boolean(
        knownRemoteUpdatedAt && new Date(localUpdatedAt).getTime() > new Date(knownRemoteUpdatedAt).getTime()
      );
      const remoteChangedAfterKnownRemote = Boolean(
        knownRemoteUpdatedAt && remote?.updated_at && new Date(String(remote.updated_at)).getTime() > new Date(knownRemoteUpdatedAt).getTime()
      );
      if (remote && localChangedAfterKnownRemote && remoteChangedAfterKnownRemote) {
        throw new Error(`CONFLICT: Remote inspection ${operation.entityId} is newer than the local version.`);
      }
      const { error } = await supabase.from('inspections').upsert({
        ...payload,
        id: operation.entityId,
        inspector_id: userId,
        product_id: null,
      }, { onConflict: 'id' });
      if (error) throw error;
      await persistDraft({ localId: operation.inspectionId, patch: { serverId: operation.entityId, remoteUpdatedAt: new Date().toISOString(), syncStatus: 'PENDING_SYNC', syncError: undefined } });
      return;
    }

    const tableByOperation: Record<string, string> = {
      UPSERT_INSPECTION_IMAGE: 'inspection_images',
      UPSERT_AI_ANALYSIS: 'ai_analyses',
      UPSERT_DECLARATION: 'declarations',
      UPSERT_FINDING: 'findings',
      UPSERT_COMPLIANCE_ASSESSMENT: 'compliance_assessments',
      UPSERT_INSPECTOR_REVIEW: 'inspector_reviews',
      UPSERT_EVIDENCE: 'evidence',
      INSERT_DECISION: 'inspector_decisions',
      INSERT_AMENDMENT: 'inspection_amendments',
      INSERT_AUDIT_EVENT: 'audit_logs',
      UPSERT_REPORT: 'reports',
    };
    const table = tableByOperation[operation.operationType];
    if (!table) throw new Error(`Unsupported sync operation ${operation.operationType}.`);
    const entityPayload = { ...payload };
    if (table === 'audit_logs' && !entityPayload.actor_user_id) entityPayload.actor_user_id = userId;
    const { error } = await supabase.from(table).upsert(entityPayload, { onConflict: 'id' });
    if (error) throw error;
    if (operation.entityType === 'INSPECTION_IMAGE') {
      await persistDraft({ localId: operation.inspectionId, patch: { syncStatus: 'PENDING_SYNC' } });
    }
  }

  private receiptInspectionId(operation: SyncOperation): string | undefined {
    const payload = operation.payload || {};
    const candidate = payload.inspection_id || payload.inspectionId || (operation.operationType === 'UPSERT_INSPECTION' || operation.operationType === 'FINALIZE_INSPECTION' ? payload.id || operation.entityId : undefined);
    return typeof candidate === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate) ? candidate : undefined;
  }

  private async hasReceipt(supabase: SupabaseClient, operation: SyncOperation): Promise<boolean> {
    const inspectionId = this.receiptInspectionId(operation);
    if (!inspectionId) return false;
    const { data, error } = await supabase
      .from('sync_operation_receipts')
      .select('idempotency_key')
      .eq('idempotency_key', operation.idempotencyKey)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  private async recordReceipt(supabase: SupabaseClient, userId: string, operation: SyncOperation): Promise<void> {
    const inspectionId = this.receiptInspectionId(operation);
    if (!inspectionId) return;
    const { error } = await supabase.from('sync_operation_receipts').upsert({
      idempotency_key: operation.idempotencyKey,
      operation_id: operation.operationId,
      inspection_id: inspectionId,
      entity_type: operation.entityType,
      entity_id: operation.entityId,
      operation_type: operation.operationType,
      actor_user_id: userId,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'idempotency_key' });
    if (error) throw error;
  }

  private makeConflict(operation: SyncOperation, message: string, conflictType: SyncConflict['conflictType']): SyncConflict {
    return SyncConflictSchema.parse({
      conflictId: `conflict-${operation.operationId}`,
      inspectionId: operation.inspectionId,
      conflictType,
      localVersion: operation.payload && typeof operation.payload.version === 'number' ? operation.payload.version : undefined,
      remoteVersion: undefined,
      localUpdatedAt: operation.createdAt,
      message,
      detectedAt: new Date().toISOString(),
      resolutionState: 'OPEN',
    });
  }

  private setSnapshot(patch: Partial<SyncSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}

export const syncManager = new SyncManager();

export function syncStatusLabel(status: SyncStatus): string {
  return status.replace('SYNC_', '').replace('_', ' ');
}

export function syncStateForDraft(draft: LocalInspectionDraft): SyncStatus {
  return draft.syncStatus || (draft.serverId ? 'SYNCED' : draft.pendingOperations.length > 0 ? 'PENDING_SYNC' : 'LOCAL_ONLY');
}
