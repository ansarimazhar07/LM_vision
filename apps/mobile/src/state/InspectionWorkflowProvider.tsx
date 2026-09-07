import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import type { ReactNode } from 'react';
import type { Declaration, Evidence, InspectorDecision, InspectorDecisionType, PackageAnalysis } from '@lm-vision/shared-types';
import { evaluateCompliance } from '@lm-vision/rules';
import {
  createLocalInspectionDraft,
  type CreateInspectionDraftInput,
  type LocalInspectionDraft,
  type LocalInspectionImage,
  type AssessmentReview,
  type InspectorCorrection,
  type InspectionAmendment,
  type AuditLog,
} from './draft';
import type { DeclarationType } from '@lm-vision/shared-types';
import { DEMO_PRODUCT } from '../fixtures/demoFixture';
import { inspectionStorage, type SaveResult } from '../services/inspectionStorage';
import { getMobileSupabaseClient } from '../services/supabase';
import { syncManager, type SyncRunResult, type SyncSnapshot } from '../services/syncManager';
import { isLocalOnlyMode } from '../config';
import { normalizeInspectionImages } from '../services/ai/normalization';
import { buildStatutoryFindingsAndEvidence } from '../services/ai/statutoryFindings';

import {
  mobileAIAdapter,
  type PipelineExecutionResult,
  type PipelineOptions,
  type AIExecutionMode,
} from '../services/ai';

export interface InspectionWorkflowContextValue {
  activeDraft: LocalInspectionDraft | null;
  completedInspections: LocalInspectionDraft[];
  isLoadingHistory: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSaveResult: SaveResult | null;
  aiMode: AIExecutionMode;
  setAiMode: (mode: AIExecutionMode) => void;

  startInspection: (input: CreateInspectionDraftInput) => LocalInspectionDraft;
  updateDraft: (patch: Partial<LocalInspectionDraft>) => void;
  addImage: (image: LocalInspectionImage) => void;
  removeImage: (imageId: string) => void;
  executeAnalysis: (mode?: AIExecutionMode, options?: PipelineOptions) => Promise<PipelineExecutionResult>;
  executeDemoAnalysis: (options?: PipelineOptions) => Promise<PipelineExecutionResult>;
  updatePhysicalDeclarations: (declarations: Declaration[]) => void;
  attachEvidence: (findingId: string, imageId: string, title: string) => void;
  recordDecision: (decision: InspectorDecisionType, notes: string) => Promise<SaveResult>;
  saveActiveInspection: () => Promise<SaveResult>;
  getInspectionById: (id: string) => Promise<LocalInspectionDraft | null>;
  reloadHistory: () => Promise<void>;
  clearActiveDraft: () => void;
  setActiveDraft: (draft: LocalInspectionDraft | null) => void;
  syncSnapshot: SyncSnapshot;
  syncNow: () => Promise<SyncRunResult>;

  // Phase 8: Inspector Review & Finalization Workflow
  updateAssessmentReview: (review: AssessmentReview) => void;
  recordCorrection: (input: {
    assessmentId: string;
    declarationType?: string;
    correctedValue: unknown;
    reason: string;
  }) => void;
  captureAdditionalEvidence: (assessmentId: string, image: LocalInspectionImage) => void;
  finalizeInspection: (input: {
    decision: InspectorDecisionType;
    notes: string;
    conflictsAcknowledged?: boolean;
  }) => Promise<SaveResult>;
  recordAmendment: (input: {
    newDecision: InspectorDecisionType;
    reason: string;
  }) => Promise<SaveResult>;
  getProvenanceChain: (assessmentId: string) => {
    assessment: LocalInspectionDraft['complianceAssessments'][number] | undefined;
    review: AssessmentReview | undefined;
    correction: InspectorCorrection | undefined;
    declarations: LocalInspectionDraft['declarations'];
    evidence: Evidence[];
    images: LocalInspectionImage[];
  } | null;
}

const InspectionWorkflowContext = createContext<InspectionWorkflowContextValue | undefined>(undefined);

export function InspectionWorkflowProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [activeDraft, setActiveDraft] = useState<LocalInspectionDraft | null>(null);
  const [completedInspections, setCompletedInspections] = useState<LocalInspectionDraft[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaveResult, setLastSaveResult] = useState<SaveResult | null>(null);
  const [aiMode, setAiMode] = useState<AIExecutionMode>(isLocalOnlyMode() ? 'LOCAL_ONLY' : 'REAL');
  const [syncSnapshot, setSyncSnapshot] = useState<SyncSnapshot>(syncManager.getSnapshot());

  const supabase = getMobileSupabaseClient();

  // Load inspections from durable storage on app launch
  const reloadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const items = isLocalOnlyMode()
        ? await inspectionStorage.loadFromLocalStorage()
        : await inspectionStorage.loadInspections(supabase);
      setCompletedInspections(items);
    } catch {
      // Keep existing list on failure
    } finally {
      setIsLoadingHistory(false);
    }
  }, [supabase]);

  useEffect(() => {
    void reloadHistory();
  }, [reloadHistory]);

  const persistSyncPatch = useCallback(async ({ localId, patch }: { localId: string; patch: Partial<LocalInspectionDraft> }) => {
    await inspectionStorage.updateSyncMetadata(localId, patch);
    setActiveDraft((current) => current && current.localId === localId ? { ...current, ...patch } : current);
    setCompletedInspections((current) => current.map((item) => item.localId === localId ? { ...item, ...patch } : item));
  }, []);

  const syncNow = useCallback(async (): Promise<SyncRunResult> => {
    try {
      const result = await syncManager.sync(supabase, persistSyncPatch);
      setSyncSnapshot(syncManager.getSnapshot());
      if (result.completed > 0 || result.state === 'SYNCED') {
        await reloadHistory();
      }
      return result;
    } catch (error) {
      console.warn('[SyncWorkflow] Uncaught error during syncNow:', error);
      const fallbackSnapshot: SyncSnapshot = {
        state: 'SYNC_FAILED',
        pendingOperations: 0,
        failedOperations: 1,
        conflicts: 0,
        lastError: error instanceof Error ? error.message : String(error),
      };
      setSyncSnapshot(fallbackSnapshot);
      return {
        state: 'SYNC_FAILED',
        completed: 0,
        failed: 1,
        conflicts: 0,
        skipped: 0,
      };
    }
  }, [persistSyncPatch, reloadHistory, supabase]);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe(setSyncSnapshot);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });
    void syncNow();
    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, [syncNow]);

  const startInspection = useCallback((input: CreateInspectionDraftInput): LocalInspectionDraft => {
    const nextDraft = createLocalInspectionDraft(input);
    setActiveDraft(nextDraft);
    return nextDraft;
  }, []);

  const updateDraft = useCallback((patch: Partial<LocalInspectionDraft>) => {
    setActiveDraft((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const addImage = useCallback((image: LocalInspectionImage) => {
    setActiveDraft((prev) => {
      if (!prev) return null;
      const images = [...prev.images, image];
      return {
        ...prev,
        images,
        status: prev.status === 'DRAFT' ? 'CAPTURED' : prev.status,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const removeImage = useCallback((imageId: string) => {
    setActiveDraft((prev) => {
      if (!prev) return null;
      const images = prev.images.filter((img) => img.id !== imageId);
      return {
        ...prev,
        images,
        status: images.length === 0 ? 'DRAFT' : prev.status,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const executeAnalysis = useCallback(
    async (modeOverride?: AIExecutionMode, options?: PipelineOptions): Promise<PipelineExecutionResult> => {
      if (!activeDraft) {
        return {
          success: false,
          declarations: [],
          findings: [],
          evidence: [],
          error: 'No active inspection draft found.',
          errorCode: 'PIPELINE_ERROR',
        };
      }

      const requestedMode = isLocalOnlyMode() ? 'LOCAL_ONLY' : (modeOverride || aiMode);
      const targetMode = isLocalOnlyMode() ? 'LOCAL_ONLY' : requestedMode;
      mobileAIAdapter.setMode(targetMode);

      const result = await mobileAIAdapter.executePipeline(
        activeDraft.images,
        activeDraft.localId,
        options
      );

      if (result.success && result.analysis) {
        const detectedName = result.analysis.declarations.find((d) => d.type === 'GENERIC_NAME')?.rawText;
        const isDemo = targetMode === 'DEMO';
        setActiveDraft((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: 'REVIEW_REQUIRED',
            productName: prev.productName || detectedName || (isDemo ? DEMO_PRODUCT.name : 'Physical Package Sample'),
            brandName: prev.brandName || (isDemo ? DEMO_PRODUCT.brand : undefined),
            batchNumber: prev.batchNumber || (isDemo ? DEMO_PRODUCT.batchNumber : undefined),
            aiAnalysis: result.analysis,
            declarations: result.declarations,
            findings: result.findings,
            complianceAssessments: result.complianceAssessments || [],
            complianceSummary: result.complianceSummary,
            evidence: [...prev.evidence, ...result.evidence],
            capturedEvidenceRefs: [
              ...prev.capturedEvidenceRefs,
              ...result.evidence.map((e) => e.id),
            ],
            updatedAt: new Date().toISOString(),
          };
        });
      }

      return result;
    },
    [activeDraft, aiMode, syncSnapshot.state]
  );

  const executeDemoAnalysis = useCallback(
    async (options?: PipelineOptions): Promise<PipelineExecutionResult> => {
      return executeAnalysis('DEMO', options);
    },
    [executeAnalysis]
  );

  const updatePhysicalDeclarations = useCallback(
    (newDeclarations: Declaration[]) => {
      setActiveDraft((prev) => {
        if (!prev) return null;
        const now = new Date().toISOString();

        const updatedAnalysis: PackageAnalysis = prev.aiAnalysis
          ? {
              ...prev.aiAnalysis,
              declarations: newDeclarations,
              timestamp: now,
            }
          : {
              provider: 'LOCAL_OCR',
              modelName: 'ondevice-ocr-cv-v1',
              quality: {
                overallScore: 0.9,
                isAcceptable: true,
                sharpness: 85,
                brightness: 85,
                glareDetected: false,
                blurDetected: false,
                shadowDetected: false,
                warnings: [],
              },
              declarations: newDeclarations,
              textRegions: newDeclarations.map((d) => d.region).filter(Boolean) as any,
              visualMeasurements: [],
              latencyMs: 15,
              timestamp: now,
            };

        const complianceSummary = evaluateCompliance({
          inspectionId: prev.localId,
          packageAnalysis: updatedAnalysis,
        });

        const { findings, evidence } = buildStatutoryFindingsAndEvidence(
          prev.localId,
          complianceSummary.assessments,
          normalizeInspectionImages(prev.images)
        );

        const detectedName = newDeclarations.find((d) => d.type === 'GENERIC_NAME')?.rawText;

        return {
          ...prev,
          productName: prev.productName || detectedName,
          declarations: newDeclarations,
          aiAnalysis: updatedAnalysis,
          complianceAssessments: complianceSummary.assessments,
          complianceSummary,
          findings,
          evidence: evidence.length > 0 ? evidence : prev.evidence,
          updatedAt: now,
        };
      });
    },
    []
  );

  const attachEvidence = useCallback((findingId: string, imageId: string, title: string) => {
    setActiveDraft((prev) => {
      if (!prev) return null;
      const now = new Date().toISOString();
      const image = prev.images.find((img) => img.id === imageId);
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const targetInspectionId = (prev.serverId && UUID_REGEX.test(prev.serverId))
        ? prev.serverId
        : '11111111-1111-4111-8111-111111111111';
      const evidenceId = `33333333-3333-4333-8333-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`;

      const newEvidence: Evidence = {
        id: evidenceId,
        inspectionId: targetInspectionId,
        findingId,
        type: 'PACKAGE_IMAGE',
        status: 'ATTACHED',
        title: title || 'Image Evidence',
        fileUrl: image?.fileUrl || '',
        mimeType: image?.mimeType || 'image/jpeg',
        fileSizeBytes: image?.fileSizeBytes || 1024,
        sha256Hash: image?.sha256Hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        capturedAt: image?.capturedAt || now,
        capturedByUserId: '00000000-0000-4000-8000-000000000001',
        chainOfCustody: [],
        createdAt: now,
        updatedAt: now,
      };

      const updatedFindings = prev.findings.map((f) => {
        if (f.id === findingId) {
          return {
            ...f,
            evidenceIds: [...f.evidenceIds, evidenceId],
          };
        }
        return f;
      });

      return {
        ...prev,
        evidence: [...prev.evidence, newEvidence],
        findings: updatedFindings,
        capturedEvidenceRefs: [...prev.capturedEvidenceRefs, evidenceId],
        updatedAt: now,
      };
    });
  }, []);

  const saveActiveInspection = useCallback(async (): Promise<SaveResult> => {
    if (!activeDraft) {
      return { success: false, savedRemotely: false, localId: '', error: 'No active inspection to save' };
    }

    setSaveStatus('saving');
      const result = await inspectionStorage.saveInspection(activeDraft, supabase);
    setLastSaveResult(result);

    if (result.success) {
      setSaveStatus('saved');
      // Update in completed list
      setCompletedInspections((prev) => {
        const index = prev.findIndex((i) => i.localId === activeDraft.localId);
        if (index >= 0) {
          const next = [...prev];
          next[index] = activeDraft;
          return next;
        }
        return [activeDraft, ...prev];
      });
      } else {
        setSaveStatus('error');
      }

      void syncNow();

      return result;
  }, [activeDraft, supabase, syncNow]);

  const recordDecision = useCallback(
    async (decision: InspectorDecisionType, notes: string): Promise<SaveResult> => {
      if (!activeDraft) {
        return { success: false, savedRemotely: false, localId: '', error: 'No active draft' };
      }

      const now = new Date().toISOString();
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const targetInspectionId = (activeDraft.serverId && UUID_REGEX.test(activeDraft.serverId))
        ? activeDraft.serverId
        : '11111111-1111-4111-8111-111111111111';

      const decisionEntity: InspectorDecision = {
        id: `44444444-4444-4444-8444-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
        inspectionId: targetInspectionId,
        inspectorUserId: '00000000-0000-4000-8000-000000000001',
        decision,
        summaryNotes: notes,
        violationsFound: decision !== 'COMPLIANT' && decision !== 'DISMISSED',
        verifiedFindingIds: activeDraft.findings.map((f) => f.id),
        dismissedFindingIds: [],
        supervisorReviewRequired: decision === 'SEIZED' || decision === 'ESCALATED',
        decidedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      const updatedDraft: LocalInspectionDraft = {
        ...activeDraft,
        status: 'DECIDED',
        inspectorDecision: decisionEntity,
        notes: notes,
        updatedAt: now,
      };

      setActiveDraft(updatedDraft);

      // Persist immediately
      setSaveStatus('saving');
      const result = await inspectionStorage.saveInspection(updatedDraft, supabase);
      setLastSaveResult(result);

      if (result.success) {
        setSaveStatus('saved');
        setCompletedInspections((prev) => {
          const index = prev.findIndex((i) => i.localId === updatedDraft.localId);
          if (index >= 0) {
            const next = [...prev];
            next[index] = updatedDraft;
            return next;
          }
          return [updatedDraft, ...prev];
        });
      } else {
        setSaveStatus('error');
      }

      void syncNow();

      return result;
    },
    [activeDraft, supabase, syncNow]
  );

  const getInspectionById = useCallback(
    async (id: string): Promise<LocalInspectionDraft | null> => {
      if (activeDraft && (activeDraft.localId === id || activeDraft.serverId === id)) {
        return activeDraft;
      }
      return inspectionStorage.getInspectionById(id);
    },
    [activeDraft]
  );

  const clearActiveDraft = useCallback(() => {
    setActiveDraft(null);
    setSaveStatus('idle');
    setLastSaveResult(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Phase 8: Inspector Review, Verification, Corrections & Finalization
  // ---------------------------------------------------------------------------

  const updateAssessmentReview = useCallback((review: AssessmentReview) => {
    setActiveDraft((prev) => {
      if (!prev) return null;
      const now = new Date().toISOString();
      const existingReviews = prev.reviews || [];
      const reviewIndex = existingReviews.findIndex((r) => r.assessmentId === review.assessmentId);
      let nextReviews: AssessmentReview[];
      if (reviewIndex >= 0) {
        nextReviews = [...existingReviews];
        nextReviews[reviewIndex] = { ...review, updatedAt: now };
      } else {
        nextReviews = [...existingReviews, { ...review, createdAt: now, updatedAt: now }];
      }

      const auditEvent: AuditLog = {
        id: `66666666-6666-4666-8666-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
        action: review.status === 'VERIFIED' ? 'FINDING_VERIFIED' : 'INSPECTOR_REVIEW_STARTED',
        targetType: 'INSPECTOR_REVIEW',
        targetId: review.id,
        actorUserId: review.inspectorUserId,
        actorRole: 'INSPECTOR',
        changeSummary: `Inspector review updated: assessment ${review.assessmentId} -> ${review.status}`,
        timestamp: now,
      };

      return {
        ...prev,
        reviews: nextReviews,
        status: prev.status === 'DECIDED' ? 'DECIDED' : 'REVIEW_REQUIRED',
        auditTrail: [...(prev.auditTrail || []), auditEvent],
        updatedAt: now,
      };
    });
  }, []);

  const recordCorrection = useCallback(
    (input: {
      assessmentId: string;
      declarationType?: string;
      correctedValue: unknown;
      reason: string;
    }) => {
      setActiveDraft((prev) => {
        if (!prev) return null;
        const now = new Date().toISOString();
        const assessment = prev.complianceAssessments.find((a) => a.id === input.assessmentId);
        const correctionId = `55555555-5555-4555-8555-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`;
        const inspectorId = '00000000-0000-4000-8000-000000000001';

        const correction: InspectorCorrection = {
          id: correctionId,
          assessmentId: input.assessmentId,
          declarationType: input.declarationType as DeclarationType | undefined,
          originalValue: assessment?.observedValue,
          correctedValue: input.correctedValue,
          originalConfidence: assessment?.confidence ?? 1.0,
          correctedConfidence: 1.0,
          reason: input.reason,
          inspectorUserId: inspectorId,
          evidenceIds: assessment?.evidenceIds || [],
          correctedAt: now,
        };

        const existingReviews = prev.reviews || [];
        const reviewIndex = existingReviews.findIndex((r) => r.assessmentId === input.assessmentId);
        const existingReview = reviewIndex >= 0 ? existingReviews[reviewIndex] : undefined;
        const reviewId =
          existingReview
            ? existingReview.id
            : `77777777-7777-4777-8777-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`;

        const updatedReview: AssessmentReview = {
          id: reviewId,
          inspectionId: prev.serverId || '11111111-1111-4111-8111-111111111111',
          assessmentId: input.assessmentId,
          inspectorUserId: inspectorId,
          status: 'CORRECTED',
          action: 'CORRECT',
          originalResult: assessment?.result || 'FAIL',
          originalObservedValue: assessment?.observedValue,
          originalConfidence: assessment?.confidence || 1.0,
          reviewedEvidence: true,
          reviewedRule: true,
          reviewedObservation: true,
          correction,
          rationale: input.reason,
          reviewedAt: now,
          createdAt: existingReview ? existingReview.createdAt : now,
          updatedAt: now,
        };

        let nextReviews: AssessmentReview[];
        if (reviewIndex >= 0) {
          nextReviews = [...existingReviews];
          nextReviews[reviewIndex] = updatedReview;
        } else {
          nextReviews = [...existingReviews, updatedReview];
        }

        const auditEvent: AuditLog = {
          id: `66666666-6666-4666-8666-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
          action: 'INSPECTOR_CORRECTION',
          targetType: 'COMPLIANCE_ASSESSMENT',
          targetId: input.assessmentId,
          actorUserId: inspectorId,
          actorRole: 'INSPECTOR',
          previousState: { observedValue: assessment?.observedValue },
          newState: { correctedValue: input.correctedValue, reason: input.reason },
          changeSummary: `Inspector corrected assessment ${assessment?.ruleNumber || input.assessmentId}: "${input.reason}"`,
          timestamp: now,
        };

        return {
          ...prev,
          corrections: [...(prev.corrections || []), correction],
          reviews: nextReviews,
          auditTrail: [...(prev.auditTrail || []), auditEvent],
          updatedAt: now,
        };
      });
    },
    []
  );

  const captureAdditionalEvidence = useCallback(
    (assessmentId: string, image: LocalInspectionImage) => {
      setActiveDraft((prev) => {
        if (!prev) return null;
        const now = new Date().toISOString();
        const evidenceId = `33333333-3333-4333-8333-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`;
        const targetInspectionId = prev.serverId || '11111111-1111-4111-8111-111111111111';

        const newEvidence: Evidence = {
          id: evidenceId,
          inspectionId: targetInspectionId,
          type: 'PACKAGE_IMAGE',
          status: 'ATTACHED',
          title: `Additional Evidence for Assessment`,
          fileUrl: image.fileUrl,
          mimeType: image.mimeType || 'image/jpeg',
          fileSizeBytes: image.fileSizeBytes || 1024,
          sha256Hash: image.sha256Hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          capturedAt: image.capturedAt || now,
          capturedByUserId: '00000000-0000-4000-8000-000000000001',
          chainOfCustody: [],
          createdAt: now,
          updatedAt: now,
        };

        const updatedAssessments = prev.complianceAssessments.map((a) => {
          if (a.id === assessmentId) {
            return {
              ...a,
              evidenceIds: [...(a.evidenceIds || []), evidenceId],
            };
          }
          return a;
        });

        const auditEvent: AuditLog = {
          id: `66666666-6666-4666-8666-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
          action: 'EVIDENCE_ATTACHED',
          targetType: 'EVIDENCE',
          targetId: evidenceId,
          actorUserId: '00000000-0000-4000-8000-000000000001',
          actorRole: 'INSPECTOR',
          changeSummary: `Additional photo evidence attached to assessment ${assessmentId}`,
          timestamp: now,
        };

        return {
          ...prev,
          images: [...prev.images, image],
          evidence: [...prev.evidence, newEvidence],
          complianceAssessments: updatedAssessments,
          capturedEvidenceRefs: [...prev.capturedEvidenceRefs, evidenceId],
          auditTrail: [...(prev.auditTrail || []), auditEvent],
          updatedAt: now,
        };
      });
    },
    []
  );

  const finalizeInspection = useCallback(
    async (input: {
      decision: InspectorDecisionType;
      notes: string;
      conflictsAcknowledged?: boolean;
    }): Promise<SaveResult> => {
      if (!activeDraft) {
        return { success: false, savedRemotely: false, localId: '', error: 'No active inspection draft' };
      }

      // Pre-flight check: ensure assessments have been reviewed
      const unreviewedAssessments = activeDraft.complianceAssessments.filter((a) => {
        const review = activeDraft.reviews?.find((r) => r.assessmentId === a.id);
        return !review || review.status === 'UNREVIEWED';
      });

      if (unreviewedAssessments.length > 0) {
        return {
          success: false,
          savedRemotely: false,
          localId: activeDraft.localId,
          error: `Cannot finalize: ${unreviewedAssessments.length} assessment(s) require review.`,
        };
      }

      // Pre-flight check: conflicting evidence acknowledgement
      const hasConflicts = activeDraft.complianceAssessments.some(
        (a) => a.evidenceSufficiency === 'CONFLICTING'
      );
      if (hasConflicts && !input.conflictsAcknowledged) {
        return {
          success: false,
          savedRemotely: false,
          localId: activeDraft.localId,
          error: 'Cannot finalize: Conflicting evidence exists and must be explicitly acknowledged.',
        };
      }

      const now = new Date().toISOString();
      const targetInspectionId = activeDraft.serverId || '11111111-1111-4111-8111-111111111111';
      const inspectorId = '00000000-0000-4000-8000-000000000001';

      const decisionEntity: InspectorDecision = {
        id: `44444444-4444-4444-8444-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
        inspectionId: targetInspectionId,
        inspectorUserId: inspectorId,
        decision: input.decision,
        summaryNotes: input.notes,
        violationsFound: input.decision !== 'COMPLIANT' && input.decision !== 'DISMISSED',
        verifiedFindingIds: activeDraft.findings.map((f) => f.id),
        dismissedFindingIds: [],
        supervisorReviewRequired: input.decision === 'SEIZED' || input.decision === 'ESCALATED',
        decidedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      const auditEvent: AuditLog = {
        id: `66666666-6666-4666-8666-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
        action: 'INSPECTION_FINALIZED',
        targetType: 'INSPECTION',
        targetId: targetInspectionId,
        actorUserId: inspectorId,
        actorRole: 'INSPECTOR',
        newState: { decision: input.decision, notes: input.notes },
        changeSummary: `Inspection finalized with decision ${input.decision}. Inspection locked from ordinary editing.`,
        timestamp: now,
      };

      const updatedDraft: LocalInspectionDraft = {
        ...activeDraft,
        status: 'DECIDED',
        isFinalized: true,
        finalizedAt: now,
        inspectorDecision: decisionEntity,
        notes: input.notes,
        auditTrail: [...(activeDraft.auditTrail || []), auditEvent],
        updatedAt: now,
      };

      setActiveDraft(updatedDraft);

      // Persist immediately (AsyncStorage + Supabase)
      setSaveStatus('saving');
      const result = await inspectionStorage.saveInspection(updatedDraft, supabase);
      setLastSaveResult(result);

      if (result.success) {
        setSaveStatus('saved');
        setCompletedInspections((prev) => {
          const index = prev.findIndex((i) => i.localId === updatedDraft.localId);
          if (index >= 0) {
            const next = [...prev];
            next[index] = updatedDraft;
            return next;
          }
          return [updatedDraft, ...prev];
        });
      } else {
        setSaveStatus('error');
      }

      void syncNow();

      return result;
    },
    [activeDraft, supabase, syncNow]
  );

  const recordAmendment = useCallback(
    async (input: {
      newDecision: InspectorDecisionType;
      reason: string;
    }): Promise<SaveResult> => {
      if (!activeDraft) {
        return { success: false, savedRemotely: false, localId: '', error: 'No active inspection' };
      }
      if (!activeDraft.isFinalized) {
        return {
          success: false,
          savedRemotely: false,
          localId: activeDraft.localId,
          error: 'Cannot amend an unfinalized inspection.',
        };
      }

      const now = new Date().toISOString();
      const targetInspectionId = activeDraft.serverId || '11111111-1111-4111-8111-111111111111';
      const inspectorId = '00000000-0000-4000-8000-000000000001';
      const prevDecision = activeDraft.inspectorDecision?.decision || 'COMPLIANT';

      const amendment: InspectionAmendment = {
        id: `88888888-8888-4888-8888-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
        inspectionId: targetInspectionId,
        amendedByUserId: inspectorId,
        amendmentReason: input.reason,
        previousDecision: prevDecision,
        newDecision: input.newDecision,
        previousState: { decision: prevDecision },
        newState: { decision: input.newDecision, reason: input.reason },
        amendedAt: now,
      };

      const auditEvent: AuditLog = {
        id: `66666666-6666-4666-8666-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
        action: 'INSPECTION_AMENDED',
        targetType: 'INSPECTION',
        targetId: targetInspectionId,
        actorUserId: inspectorId,
        actorRole: 'INSPECTOR',
        previousState: { decision: prevDecision },
        newState: { decision: input.newDecision, reason: input.reason },
        changeSummary: `Official Amendment recorded: ${prevDecision} -> ${input.newDecision}. Reason: "${input.reason}"`,
        timestamp: now,
      };

      const updatedDraft: LocalInspectionDraft = {
        ...activeDraft,
        amendments: [...(activeDraft.amendments || []), amendment],
        inspectorDecision: activeDraft.inspectorDecision
          ? {
              ...activeDraft.inspectorDecision,
              decision: input.newDecision,
              summaryNotes: `${activeDraft.inspectorDecision.summaryNotes || ''}\n[AMENDMENT]: ${input.reason}`,
              updatedAt: now,
            }
          : undefined,
        auditTrail: [...(activeDraft.auditTrail || []), auditEvent],
        updatedAt: now,
      };

      setActiveDraft(updatedDraft);

      setSaveStatus('saving');
      const result = await inspectionStorage.saveInspection(updatedDraft, supabase);
      setLastSaveResult(result);

      if (result.success) {
        setSaveStatus('saved');
        setCompletedInspections((prev) => {
          const index = prev.findIndex((i) => i.localId === updatedDraft.localId);
          if (index >= 0) {
            const next = [...prev];
            next[index] = updatedDraft;
            return next;
          }
          return [updatedDraft, ...prev];
        });
      } else {
        setSaveStatus('error');
      }

      void syncNow();

      return result;
    },
    [activeDraft, supabase, syncNow]
  );

  const getProvenanceChain = useCallback(
    (assessmentId: string) => {
      if (!activeDraft) return null;
      const assessment = activeDraft.complianceAssessments.find((a) => a.id === assessmentId);
      const review = activeDraft.reviews?.find((r) => r.assessmentId === assessmentId);
      const correction = activeDraft.corrections?.find((c) => c.assessmentId === assessmentId);
      const declarations = activeDraft.declarations.filter(
        (d) =>
          assessment?.declarationIds.includes(d.type) ||
          assessment?.declarationIds.includes((d as unknown as { id: string }).id)
      );
      const evidence = activeDraft.evidence.filter((e) =>
        assessment?.evidenceIds.includes(e.id)
      );
      const images = activeDraft.images;

      return {
        assessment,
        review,
        correction,
        declarations,
        evidence,
        images,
      };
    },
    [activeDraft]
  );

  const value = useMemo<InspectionWorkflowContextValue>(
    () => ({
      activeDraft,
      completedInspections,
      isLoadingHistory,
      saveStatus,
      lastSaveResult,
      aiMode,
      setAiMode,
      startInspection,
      updateDraft,
      addImage,
      removeImage,
      executeAnalysis,
      executeDemoAnalysis,
      updatePhysicalDeclarations,
      attachEvidence,
      recordDecision,
      saveActiveInspection,
      getInspectionById,
      reloadHistory,
      clearActiveDraft,
      setActiveDraft,
      syncSnapshot,
      syncNow,
      updateAssessmentReview,
      recordCorrection,
      captureAdditionalEvidence,
      finalizeInspection,
      recordAmendment,
      getProvenanceChain,
    }),
    [
      activeDraft,
      completedInspections,
      isLoadingHistory,
      saveStatus,
      lastSaveResult,
      aiMode,
      startInspection,
      updateDraft,
      addImage,
      removeImage,
      executeAnalysis,
      executeDemoAnalysis,
      updatePhysicalDeclarations,
      attachEvidence,
      recordDecision,
      saveActiveInspection,
      getInspectionById,
      reloadHistory,
      clearActiveDraft,
      updateAssessmentReview,
      recordCorrection,
      captureAdditionalEvidence,
      finalizeInspection,
      recordAmendment,
      getProvenanceChain,
      syncSnapshot,
      syncNow,
    ]
  );

  return (
    <InspectionWorkflowContext.Provider value={value}>
      {children}
    </InspectionWorkflowContext.Provider>
  );
}

export function useInspectionWorkflow(): InspectionWorkflowContextValue {
  const context = useContext(InspectionWorkflowContext);
  if (!context) {
    throw new Error('useInspectionWorkflow must be used inside InspectionWorkflowProvider');
  }
  return context;
}
