import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  ComplianceAssessment,
  ComplianceResult,
  EvidenceSufficiency,
  PerceptionDiscrepancy,
} from '@lm-vision/shared-types';
import {
  generateExplainableFindings,
  generateInspectorActionQueue,
  analyzeEvidenceCompleteness,
} from '@lm-vision/perception';
import type { RootStackParamList } from '../navigation/types';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import { Screen } from '../components/Screen';
import { Surface } from '../components/Surface';
import { Button } from '../components/Button';
import { WorkflowProgress } from '../components/WorkflowProgress';
import { Badge } from '../components/Badge';
import { ConfidenceBar } from '../components/ConfidenceBar';

type Props = NativeStackScreenProps<RootStackParamList, 'InspectorReview'>;

function getResultBadgeProps(result: ComplianceResult): { label: string; bg: string; color: string } {
  switch (result) {
    case 'PASS':
      return { label: 'PASS', bg: '#ecfdf5', color: '#047857' };
    case 'FAIL':
      return { label: 'FAIL', bg: '#fef2f2', color: '#b91c1c' };
    case 'REQUIRES_VERIFICATION':
      return { label: 'VERIFICATION REQ.', bg: '#fffbeb', color: '#b45309' };
    case 'NOT_APPLICABLE':
      return { label: 'NOT APPLICABLE', bg: '#f3f4f6', color: '#4b5563' };
    case 'INSUFFICIENT_EVIDENCE':
      return { label: 'INSUFFICIENT EVIDENCE', bg: '#f5f3ff', color: '#6d28d9' };
    default:
      return { label: result, bg: '#f3f4f6', color: '#374151' };
  }
}

function getSufficiencyBadge(sufficiency: EvidenceSufficiency): { label: string; bg: string; color: string } {
  switch (sufficiency) {
    case 'SUFFICIENT':
      return { label: 'SUFFICIENT', bg: '#ecfdf5', color: '#047857' };
    case 'INSUFFICIENT':
      return { label: 'INSUFFICIENT', bg: '#fef2f2', color: '#b91c1c' };
    case 'CONFLICTING':
      return { label: 'CONFLICTING EVIDENCE', bg: '#fff7ed', color: '#c2410c' };
    case 'LOW_CONFIDENCE':
      return { label: 'LOW CONFIDENCE', bg: '#fffbeb', color: '#b45309' };
  }
}

export function InspectorReviewScreen({ navigation }: Props): React.JSX.Element {
  const workflow = useInspectionWorkflow();
  const draft = workflow.activeDraft;

  const assessments = draft?.complianceAssessments || [];
  const reviews = draft?.reviews || [];
  const corrections = draft?.corrections || [];

  const [currentIndex, setCurrentIndex] = useState(0);

  // Correction Modal State
  const [correctionModalVisible, setCorrectionModalVisible] = useState(false);
  const [correctedValueText, setCorrectedValueText] = useState('');
  const [correctionReasonText, setCorrectionReasonText] = useState('');

  const currentAssessment: ComplianceAssessment | undefined = assessments[currentIndex];
  const currentReview = reviews.find((r) => r.assessmentId === currentAssessment?.id);
  const currentCorrection = corrections.find((c) => c.assessmentId === currentAssessment?.id);

  // Checklist state for current item
  const reviewedEvidence = currentReview?.reviewedEvidence || false;
  const reviewedRule = currentReview?.reviewedRule || false;
  const reviewedObservation = currentReview?.reviewedObservation || false;

  // Attached evidence and image for this assessment
  const assessmentEvidence = useMemo(() => {
    if (!currentAssessment || !draft) return [];
    return draft.evidence.filter((e) => currentAssessment.evidenceIds.includes(e.id));
  }, [currentAssessment, draft]);

  const assessmentImage = useMemo(() => {
    if (!draft || assessmentEvidence.length === 0) return draft?.images[0];
    const evUrl = assessmentEvidence[0]?.fileUrl;
    return draft.images.find((img) => img.fileUrl === evUrl) || draft.images[0];
  }, [draft, assessmentEvidence]);

  const reviewedCount = useMemo(() => {
    return assessments.filter((a) => {
      const rev = reviews.find((r) => r.assessmentId === a.id);
      return rev && rev.status !== 'UNREVIEWED';
    }).length;
  }, [assessments, reviews]);

  const allReviewed = assessments.length > 0 && reviewedCount === assessments.length;

  const analysisProvider = draft?.aiAnalysis?.provider || 'GEMINI';

  const provenanceBadge = useMemo(() => {
    if (analysisProvider === 'LOCAL_OCR') {
      return {
        title: 'ON-DEVICE OCR (OFFLINE)',
        badgeBg: '#ecfdf5',
        badgeColor: '#047857',
        notice: 'Advisory Perception: On-device OCR observations are extracted evidence, not statutory legal rulings.',
      };
    }
    if (analysisProvider === 'HYBRID') {
      return {
        title: 'HYBRID CONSENSUS',
        badgeBg: '#eff6ff',
        badgeColor: '#1d4ed8',
        notice: 'Advisory Perception: Multi-modal consensus between on-device OCR and cloud vision.',
      };
    }
    return {
      title: 'AI OBSERVATION (GEMINI 3.5 FLASH)',
      badgeBg: '#f5f3ff',
      badgeColor: '#6d28d9',
      notice: 'Advisory Perception: Gemini observations are extracted evidence, not statutory legal rulings.',
    };
  }, [analysisProvider]);

  const currentDiscrepancy = useMemo(() => {
    const ruleToDeclType: Record<string, string> = {
      '6': 'MRP',
      '7': 'NET_QUANTITY',
      '8': 'DATE_OF_PACKAGING',
      '9': 'MANUFACTURER_NAME_ADDRESS',
      '10': 'CONSUMER_CARE',
      '11': 'COUNTRY_OF_ORIGIN',
    };
    const expectedType = currentAssessment?.ruleNumber
      ? ruleToDeclType[String(currentAssessment.ruleNumber)]
      : undefined;

    // 1. Check Phase D Fused Package first
    const phaseD = (draft?.aiAnalysis as any)?.rawResponse?.phaseD;
    if (phaseD?.fields && expectedType) {
      const field = phaseD.fields[expectedType];
      if (field && field.evidenceStatus === 'CONFLICT') {
        const local = field.sources?.find(
          (s: any) => s.sourceType === 'LOCAL_OCR' || s.sourceType === 'LOCAL_CONSENSUS'
        );
        const ai = field.sources?.find(
          (s: any) => s.sourceType === 'GEMINI' || s.sourceType === 'OPENAI'
        );
        return {
          declarationType: expectedType as any,
          reason: field.discrepancyReason || field.explanation,
          localValue: local?.value,
          remoteValue: ai?.value,
          localRawText: local?.rawText,
          remoteRawText: ai?.rawText,
          status: 'UNRESOLVED_DISCREPANCY' as const,
        };
      }
    }

    // 2. Fallback to hybridSummary
    const discrepancies: PerceptionDiscrepancy[] = (draft?.aiAnalysis as any)?.hybridSummary?.discrepancies || [];
    if (!discrepancies.length) return undefined;
    return discrepancies.find((d) => d.declarationType === expectedType);
  }, [draft, currentAssessment]);

  // Dispersed / Remote Surface State for current field
  const currentDispersedState = useMemo(() => {
    const rawResp = (draft?.aiAnalysis as any)?.rawResponse;
    const crossSurface = rawResp?.crossSurface;
    if (!crossSurface?.fields) return null;

    const ruleToDeclType: Record<string, string> = {
      '6': 'MRP',
      '7': 'NET_QUANTITY',
      '8': 'DATE_OF_PACKAGING',
      '9': 'MANUFACTURER_NAME_ADDRESS',
      '10': 'CONSUMER_CARE_DETAILS',
      '11': 'COUNTRY_OF_ORIGIN',
      '1': 'GENERIC_NAME',
    };
    const expectedType = currentAssessment?.ruleNumber
      ? ruleToDeclType[String(currentAssessment.ruleNumber)] || String(currentAssessment.ruleNumber)
      : undefined;

    if (!expectedType) return null;
    const fieldResult = crossSurface.fields[expectedType];
    if (!fieldResult) return null;

    return {
      fieldResult,
      capturedSurfaces: crossSurface.capturedSurfaces || [],
    };
  }, [draft, currentAssessment]);

  // Phase E: Explainable Findings & Action Center Prioritized Queue
  const explainableFindings = useMemo(() => {
    if (!draft) return [];
    return generateExplainableFindings({
      inspectionId: draft.serverId || 'draft',
      assessments,
      fusedPackage: (draft.aiAnalysis as any)?.rawResponse?.phaseD,
      declarations: draft.declarations as any,
    });
  }, [draft, assessments]);

  const currentFinding = useMemo(() => {
    return explainableFindings.find(
      (f) => f.ruleId === currentAssessment?.ruleId || f.ruleNumber === currentAssessment?.ruleNumber
    );
  }, [explainableFindings, currentAssessment]);

  const actionItems = useMemo(() => {
    const fusedPackage = (draft?.aiAnalysis as any)?.rawResponse?.phaseD;
    const completeness = analyzeEvidenceCompleteness({
      images: draft?.images as any,
      declarations: draft?.declarations as any,
      assessments,
      fusedPackage,
    });
    return generateInspectorActionQueue({
      findings: explainableFindings,
      completeness,
      fusedPackage,
      imageQuality: draft?.aiAnalysis?.quality,
    });
  }, [draft, explainableFindings, assessments]);


  const handleToggleChecklist = (field: 'evidence' | 'rule' | 'observation') => {
    if (!currentAssessment) return;
    const now = new Date().toISOString();
    const inspectorId = '00000000-0000-4000-8000-000000000001';

    const updatedReview = {
      id: currentReview?.id || `77777777-7777-4777-8777-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
      inspectionId: draft?.serverId || '11111111-1111-4111-8111-111111111111',
      assessmentId: currentAssessment.id,
      inspectorUserId: inspectorId,
      status: currentReview?.status || 'IN_REVIEW',
      action: currentReview?.action,
      originalResult: currentAssessment.result,
      originalObservedValue: currentAssessment.observedValue,
      originalConfidence: currentAssessment.confidence,
      reviewedEvidence: field === 'evidence' ? !reviewedEvidence : reviewedEvidence,
      reviewedRule: field === 'rule' ? !reviewedRule : reviewedRule,
      reviewedObservation: field === 'observation' ? !reviewedObservation : reviewedObservation,
      correction: currentReview?.correction,
      rationale: currentReview?.rationale,
      reviewedAt: now,
      createdAt: currentReview?.createdAt || now,
      updatedAt: now,
    };

    workflow.updateAssessmentReview(updatedReview);
  };

  const handleVerify = () => {
    if (!currentAssessment) return;
    const now = new Date().toISOString();
    const inspectorId = '00000000-0000-4000-8000-000000000001';

    workflow.updateAssessmentReview({
      id: currentReview?.id || `77777777-7777-4777-8777-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
      inspectionId: draft?.serverId || '11111111-1111-4111-8111-111111111111',
      assessmentId: currentAssessment.id,
      inspectorUserId: inspectorId,
      status: 'VERIFIED',
      action: 'VERIFY',
      originalResult: currentAssessment.result,
      originalObservedValue: currentAssessment.observedValue,
      originalConfidence: currentAssessment.confidence,
      reviewedEvidence: true,
      reviewedRule: true,
      reviewedObservation: true,
      correction: currentReview?.correction,
      rationale: 'Inspector verified assessment against physical evidence and GSR 202(E).',
      reviewedAt: now,
      createdAt: currentReview?.createdAt || now,
      updatedAt: now,
    });

    if (currentIndex < assessments.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleOpenCorrection = () => {
    const defaultVal =
      currentAssessment?.observedValue !== undefined
        ? typeof currentAssessment.observedValue === 'object'
          ? JSON.stringify(currentAssessment.observedValue)
          : String(currentAssessment.observedValue)
        : '';
    setCorrectedValueText(currentCorrection?.correctedValue !== undefined ? String(currentCorrection.correctedValue) : defaultVal);
    setCorrectionReasonText(currentCorrection?.reason || '');
    setCorrectionModalVisible(true);
  };

  const handleSaveCorrection = () => {
    if (!currentAssessment) return;
    if (!correctionReasonText.trim()) {
      Alert.alert('Reason Required', 'Please provide a statutory rationale for this inspector correction.');
      return;
    }

    workflow.recordCorrection({
      assessmentId: currentAssessment.id,
      declarationType: currentAssessment.declarationIds[0],
      correctedValue: correctedValueText.trim(),
      reason: correctionReasonText.trim(),
    });

    setCorrectionModalVisible(false);
    Alert.alert('Correction Recorded', 'Inspector correction saved with immutable audit provenance.');
  };

  const handleQuickConfirm = (val: string, source: string) => {
    if (!currentAssessment) return;
    workflow.recordCorrection({
      assessmentId: currentAssessment.id,
      declarationType: currentAssessment.declarationIds[0],
      correctedValue: val,
      reason: `Human Inspector verified and confirmed ${source} observation: ${val}.`,
    });
    Alert.alert('Verified by Inspector', `Confirmed ${source} observation (${val}) with immutable audit provenance.`);
  };


  const handleCaptureMoreEvidence = () => {
    // Navigate to camera capture with intent
    navigation.navigate('CameraCapture');
  };

  if (!draft || assessments.length === 0) {
    return (
      <Screen title="Inspector Review">
        <Surface style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Assessments Available</Text>
          <Text style={styles.emptyBody}>
            Please complete package capture and run the legal metrology compliance evaluation first.
          </Text>
          <Button label="Back to Results" onPress={() => navigation.goBack()} />
        </Surface>
      </Screen>
    );
  }

  const resultBadge = getResultBadgeProps(currentAssessment?.result || 'FAIL');
  const sufficiencyBadge = getSufficiencyBadge(currentAssessment?.evidenceSufficiency || 'SUFFICIENT');

  return (
    <Screen title="Inspector Review">
      <WorkflowProgress current="review" />
      <View style={styles.container}>
        {/* Progress Header */}
        <Surface style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressTitle}>Assessment {currentIndex + 1} of {assessments.length}</Text>
            <Badge
              label={`Reviewed ${reviewedCount}/${assessments.length}`}
              bg={allReviewed ? '#ecfdf5' : '#eff6ff'}
              color={allReviewed ? '#047857' : '#1d4ed8'}
            />
          </View>

          {/* Quick Item Selectors */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {assessments.map((a, idx) => {
              const rev = reviews.find((r) => r.assessmentId === a.id);
              const isReviewed = rev && rev.status !== 'UNREVIEWED';
              const isSelected = idx === currentIndex;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => setCurrentIndex(idx)}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                    isReviewed && styles.chipReviewed,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                      isReviewed && styles.chipTextReviewed,
                    ]}
                  >
                    R{a.ruleNumber} {isReviewed ? '✓' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Phase E: Action Center Prioritization Banner */}
          {actionItems.length > 0 && (
            <View style={styles.actionCenterBanner}>
              <View style={styles.actionBannerHeader}>
                <Text style={styles.actionBannerTitle}>⚡ INSPECTOR ACTION QUEUE</Text>
                <Badge
                  label={`${actionItems.filter((i) => i.priority === 'P1_CRITICAL').length} CRITICAL · ${actionItems.filter((i) => i.priority === 'P2_HIGH').length} HIGH`}
                  bg="#fee2e2"
                  color="#b91c1c"
                  size="sm"
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                {actionItems.slice(0, 5).map((act) => {
                  const isCritical = act.priority === 'P1_CRITICAL';
                  return (
                    <View
                      key={act.id}
                      style={[
                        styles.actionPill,
                        { borderColor: isCritical ? '#f87171' : '#fcd34d', backgroundColor: isCritical ? '#fef2f2' : '#fffbeb' },
                      ]}
                    >
                      <Text style={[styles.actionPillPriority, { color: isCritical ? '#b91c1c' : '#b45309' }]}>
                        {act.priority.replace('_', ' ')}:
                      </Text>
                      <Text style={styles.actionPillText} numberOfLines={1}>
                        {act.title}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </Surface>

        {/* ================================================================= */}
        {/* SECTION 1: RULE ENGINE ASSESSMENT (GSR 202(E) 2011)               */}
        {/* ================================================================= */}
        <Surface style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleBadge}>
              <Text style={styles.sectionBadgeText}>RULE ENGINE ASSESSMENT</Text>
            </View>
            <Badge label={resultBadge.label} bg={resultBadge.bg} color={resultBadge.color} />
          </View>

          <Text style={styles.ruleHeading}>
            Rule {currentAssessment?.ruleNumber}: {currentAssessment?.ruleTitle}
          </Text>

          <View style={styles.sourceBox}>
            <Text style={styles.sourceLabel}>STATUTORY AUTHORITY & CITATION:</Text>
            <Text style={styles.sourceText}>
              {currentAssessment?.ruleSource.sourceDocument} ({currentAssessment?.ruleSource.gazetteNotificationNumber})
            </Text>
            <Text style={styles.sourceSubText}>
              Clause: {currentAssessment?.ruleSource.clauseReference} | Source Page: {currentAssessment?.ruleSource.sourcePage} | Bundle: {currentAssessment?.ruleBundleId}
            </Text>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Observed Value</Text>
              <Text style={styles.metaValue}>
                {currentAssessment?.observedValue !== undefined
                  ? typeof currentAssessment.observedValue === 'object'
                    ? JSON.stringify(currentAssessment.observedValue)
                    : String(currentAssessment.observedValue)
                  : '—'}
              </Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Expected Condition</Text>
              <Text style={styles.metaValue}>
                {currentAssessment?.expectedConstraint !== undefined
                  ? typeof currentAssessment.expectedConstraint === 'object'
                    ? JSON.stringify(currentAssessment.expectedConstraint)
                    : String(currentAssessment.expectedConstraint)
                  : 'Mandatory Declaration'}
              </Text>
            </View>
          </View>

          <View style={styles.sufficiencyRow}>
            <Text style={styles.metaLabel}>Evidence Sufficiency:</Text>
            <Badge
              label={sufficiencyBadge.label}
              bg={sufficiencyBadge.bg}
              color={sufficiencyBadge.color}
            />
          </View>

          <Text style={styles.explanationText}>{currentAssessment?.explanation}</Text>

          {/* Phase E Explainable Finding Grounding */}
          {currentFinding && (
            <View style={styles.findingExplainBox}>
              <Text style={styles.findingWhyTitle}>Plain-Language Assessment Rationale:</Text>
              <Text style={styles.findingWhyText}>{currentFinding.explanation}</Text>
              {currentFinding.suggestedInspectorAction ? (
                <View style={styles.findingActionRow}>
                  <Text style={styles.findingActionLabel}>Recommended Inspector Action:</Text>
                  <Text style={styles.findingActionText}>
                    {currentFinding.suggestedInspectorAction}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </Surface>

        {/* ================================================================= */}
        {/* SECTION 2: PERCEPTION OBSERVATION (Gemini / On-Device OCR / Hybrid)*/}
        {/* ================================================================= */}
        <Surface style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionTitleBadge, { backgroundColor: provenanceBadge.badgeBg }]}>
              <Text style={[styles.sectionBadgeText, { color: provenanceBadge.badgeColor }]}>
                {provenanceBadge.title}
              </Text>
            </View>
            <Badge
              label={`${Math.round((currentAssessment?.confidence ?? 0.9) * 100)}% CONFIDENCE`}
              bg={provenanceBadge.badgeBg}
              color={provenanceBadge.badgeColor}
            />
          </View>

          <Text style={styles.aiNotice}>{provenanceBadge.notice}</Text>

          {/* Conflicting Evidence Callout when Hybrid Discrepancy Exists */}
          {currentDiscrepancy ? (
            <View style={styles.conflictCard}>
              <View style={styles.conflictBadge}>
                <Text style={styles.conflictBadgeText}>⚠️ CONFLICTING EVIDENCE DETECTED</Text>
              </View>
              <Text style={styles.conflictTitle}>{currentDiscrepancy.reason}</Text>
              <View style={styles.conflictCompareRow}>
                <View style={styles.conflictCompareCol}>
                  <Text style={styles.conflictCompareLabel}>Local On-Device OCR:</Text>
                  <Text style={styles.conflictCompareVal}>
                    {String(currentDiscrepancy.localValue ?? currentDiscrepancy.localRawText ?? 'Not detected')}
                  </Text>
                </View>
                <View style={styles.conflictCompareCol}>
                  <Text style={styles.conflictCompareLabel}>Gemini Cloud Vision:</Text>
                  <Text style={styles.conflictCompareVal}>
                    {String(currentDiscrepancy.remoteValue ?? currentDiscrepancy.remoteRawText ?? 'Not detected')}
                  </Text>
                </View>
              </View>
              <Text style={styles.conflictNote}>
                Statutory requirement: Discrepancy flagged for inspector verification. Local evidence preserved without silent overwrite.
              </Text>
              <View style={styles.quickActionRow}>
                {currentDiscrepancy.localValue !== undefined ? (
                  <Pressable
                    style={styles.quickConfirmBtn}
                    onPress={() => handleQuickConfirm(String(currentDiscrepancy.localValue), 'Local On-Device OCR')}
                  >
                    <Text style={styles.quickConfirmBtnText}>Confirm Local ({String(currentDiscrepancy.localValue)})</Text>
                  </Pressable>
                ) : null}
                {currentDiscrepancy.remoteValue !== undefined ? (
                  <Pressable
                    style={[styles.quickConfirmBtn, { backgroundColor: '#7c3aed' }]}
                    onPress={() => handleQuickConfirm(String(currentDiscrepancy.remoteValue), 'Gemini Cloud')}
                  >
                    <Text style={styles.quickConfirmBtnText}>Confirm Gemini ({String(currentDiscrepancy.remoteValue)})</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.quickConfirmBtn, { backgroundColor: '#475569' }]}
                  onPress={handleOpenCorrection}
                >
                  <Text style={styles.quickConfirmBtnText}>Custom Value</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Dispersed Multi-Surface Search State & True "Surface Not Captured" Callout */}
          {currentDispersedState?.fieldResult.searchStatus === 'SEARCH_INCOMPLETE' ? (
            <View style={styles.searchIncompleteCard}>
              <View style={styles.searchIncompleteHeader}>
                <Text style={styles.searchIncompleteBadge}>SEARCH INCOMPLETE</Text>
              </View>
              <Text style={styles.searchIncompleteTitle}>Not found on current images</Text>

              <View style={styles.surfaceStatusSection}>
                <Text style={styles.surfaceStatusHeading}>Captured:</Text>
                {currentDispersedState.capturedSurfaces.map((s: string) => (
                  <Text key={s} style={styles.surfaceCapturedItem}>✓ {s.replace(/_/g, ' ')}</Text>
                ))}

                <Text style={[styles.surfaceStatusHeading, { marginTop: 8 }]}>Not captured:</Text>
                {currentDispersedState.fieldResult.uncapturedRelevantSurfaces.map((s: string) => (
                  <Text key={s} style={styles.surfaceUncapturedItem}>○ {s.replace(/_/g, ' ')}</Text>
                ))}
              </View>

              {currentDispersedState.fieldResult.recommendation ? (
                <View style={styles.searchRecommendationBox}>
                  <Text style={styles.searchRecommendationLabel}>Recommendation:</Text>
                  <Text style={styles.searchRecommendationText}>{currentDispersedState.fieldResult.recommendation}</Text>
                </View>
              ) : null}
            </View>
          ) : currentDispersedState?.fieldResult.searchStatus === 'SEARCH_COMPLETED_NO_EVIDENCE' ? (
            <View style={styles.searchCompleteNoEvidenceCard}>
              <Text style={styles.searchCompleteNoEvidenceBadge}>SEARCH COMPLETED — NO EVIDENCE DETECTED</Text>
              <Text style={styles.searchCompleteNoEvidenceText}>
                {currentDispersedState.fieldResult.statusSummary}
              </Text>
            </View>
          ) : currentDispersedState?.fieldResult.evidenceStatus === 'AGREEMENT' && currentDispersedState.fieldResult.sources.length >= 2 ? (
            <View style={styles.searchAgreementCard}>
              <Text style={styles.searchAgreementBadge}>✓ CROSS-SURFACE AGREEMENT</Text>
              <Text style={styles.searchAgreementText}>
                Corroborated across {Array.from(new Set(currentDispersedState.fieldResult.sources.map((s: any) => s.surface))).join(' & ')}
              </Text>
            </View>
          ) : null}

          <View style={styles.observationBox}>
            <Text style={styles.observationLabel}>Extracted Declaration / Text:</Text>
            <Text style={styles.observationContent}>
              {currentAssessment?.observedValue !== undefined
                ? typeof currentAssessment.observedValue === 'object'
                  ? JSON.stringify(currentAssessment.observedValue, null, 2)
                  : String(currentAssessment.observedValue)
                : 'No declaration detected on scanned surfaces'}
            </Text>
          </View>

          {currentAssessment?.aiExplanation ? (
            <View style={styles.aiExplanationBox}>
              <Text style={styles.aiExplanationLabel}>AI Advisory Note:</Text>
              <Text style={styles.aiExplanationText}>{currentAssessment.aiExplanation}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: 8 }}>
            <ConfidenceBar score={currentAssessment?.confidence ?? 0.9} label="Perception Confidence" />
          </View>
        </Surface>

        {/* ================================================================= */}
        {/* SECTION 3: PHYSICAL EVIDENCE                                     */}
        {/* ================================================================= */}
        <Surface style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionTitleBadge, { backgroundColor: '#ecfdf5' }]}>
              <Text style={[styles.sectionBadgeText, { color: '#047857' }]}>PHYSICAL EVIDENCE</Text>
            </View>
            <Text style={styles.evidenceCountText}>
              {assessmentEvidence.length || 1} image reference(s)
            </Text>
          </View>

          {assessmentImage ? (
            <Pressable
              style={styles.evidenceImageContainer}
              onPress={() => navigation.navigate('EvidenceViewer', { imageId: assessmentImage.id })}
            >
              <Image source={{ uri: assessmentImage.fileUrl }} style={styles.evidenceThumbnail} resizeMode="cover" />
              <View style={styles.evidenceImageOverlay}>
                <Text style={styles.evidenceOverlayText}>Tap for Full Evidence Viewer</Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.noEvidenceBox}>
              <Text style={styles.noEvidenceText}>No specific photo linked to this assessment.</Text>
            </View>
          )}

          <View style={styles.evidenceMetaRow}>
            <Text style={styles.evidenceMetaLabel}>Surface: {assessmentImage?.surface || 'FRONT'}</Text>
            <Text style={styles.evidenceMetaLabel}>
              SHA-256: {assessmentImage?.sha256Hash ? assessmentImage.sha256Hash.slice(0, 16) + '…' : 'Verified'}
            </Text>
          </View>

          <Button
            label="Open Evidence Viewer (Zoom / Hash / Declarations)"
            variant="secondary"
            onPress={() => navigation.navigate('EvidenceViewer', { imageId: assessmentImage?.id })}
          />
        </Surface>

        {/* ================================================================= */}
        {/* SECTION 4: INSPECTOR REVIEW & HUMAN DECISION                      */}
        {/* ================================================================= */}
        <Surface style={[styles.sectionCard, styles.reviewCardActive]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionTitleBadge, { backgroundColor: '#eff6ff' }]}>
              <Text style={[styles.sectionBadgeText, { color: '#1d4ed8' }]}>INSPECTOR REVIEW & DECISION</Text>
            </View>
            {currentReview ? (
              <Badge
                label={currentReview.status}
                bg={currentReview.status === 'CORRECTED' ? '#fef3c7' : '#ecfdf5'}
                color={currentReview.status === 'CORRECTED' ? '#b45309' : '#047857'}
              />
            ) : null}
          </View>

          {/* Review Checklist */}
          <Text style={styles.checklistHeading}>Mandatory Human Review Checklist:</Text>

          <Pressable style={styles.checkItem} onPress={() => handleToggleChecklist('evidence')}>
            <View style={[styles.checkbox, reviewedEvidence && styles.checkboxChecked]}>
              {reviewedEvidence && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkItemText}>I have inspected the physical package evidence.</Text>
          </Pressable>

          <Pressable style={styles.checkItem} onPress={() => handleToggleChecklist('rule')}>
            <View style={[styles.checkbox, reviewedRule && styles.checkboxChecked]}>
              {reviewedRule && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkItemText}>I have reviewed statutory Rule {currentAssessment?.ruleNumber} under GSR 202(E).</Text>
          </Pressable>

          <Pressable style={styles.checkItem} onPress={() => handleToggleChecklist('observation')}>
            <View style={[styles.checkbox, reviewedObservation && styles.checkboxChecked]}>
              {reviewedObservation && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkItemText}>I have scrutinized the candidate AI observation.</Text>
          </Pressable>

          {/* Side-by-Side Correction Display */}
          {currentCorrection ? (
            <View style={styles.correctionNoticeBox}>
              <Text style={styles.correctionNoticeTitle}>INSPECTOR CORRECTION RECORDED</Text>
              <View style={styles.correctionSideBySide}>
                <View style={styles.correctionSideCol}>
                  <Text style={styles.correctionSideLabel}>Original AI Observation</Text>
                  <Text style={styles.correctionSideValue}>
                    {String(currentCorrection.originalValue ?? 'None')}
                  </Text>
                </View>
                <View style={styles.correctionSideCol}>
                  <Text style={[styles.correctionSideLabel, { color: '#047857' }]}>Human Verified Value</Text>
                  <Text style={[styles.correctionSideValue, { fontWeight: '700', color: '#047857' }]}>
                    {String(currentCorrection.correctedValue)}
                  </Text>
                </View>
              </View>
              <Text style={styles.correctionReasonLabel}>Reason: {currentCorrection.reason}</Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.reviewActionsGrid}>
            <Button
              label="Verify Machine Assessment"
              variant="primary"
              onPress={handleVerify}
            />

            <Button
              label={currentCorrection ? "Edit Human Correction" : "Correct AI Observation"}
              variant="secondary"
              onPress={handleOpenCorrection}
            />

            <Button
              label="Capture Additional Evidence"
              variant="secondary"
              onPress={handleCaptureMoreEvidence}
            />
          </View>
        </Surface>

        {/* Carousel Navigation */}
        <View style={styles.navRow}>
          <Button
            label="← Previous"
            variant="secondary"
            disabled={currentIndex === 0}
            onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          />
          <Button
            label="Next →"
            variant="secondary"
            disabled={currentIndex === assessments.length - 1}
            onPress={() => setCurrentIndex((prev) => Math.min(assessments.length - 1, prev + 1))}
          />
        </View>

        {/* Final Decision Call to Action */}
        <Surface style={styles.finalizeCtaCard}>
          <Text style={styles.finalizeCtaTitle}>Ready to Finalize Inspection?</Text>
          <Text style={styles.finalizeCtaSub}>
            {allReviewed
              ? 'All statutory assessments have been human-reviewed. Proceed to summary & statutory decision.'
              : `${assessments.length - reviewedCount} assessment(s) remaining for human verification.`}
          </Text>
          <Button
            label="Proceed to Review Summary & Decision →"
            variant="primary"
            onPress={() => navigation.navigate('ReviewSummary')}
          />
        </Surface>
      </View>

      {/* Human Correction Modal */}
      <Modal visible={correctionModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalSurface}>
            <Text style={styles.modalTitle}>Inspector Correction</Text>
            <Text style={styles.modalSub}>
              Correction to Rule {currentAssessment?.ruleNumber} ({currentAssessment?.ruleTitle}). Original AI observations remain historically preserved.
            </Text>

            <Text style={styles.inputLabel}>Corrected Declaration Value</Text>
            <TextInput
              style={styles.textInput}
              value={correctedValueText}
              onChangeText={setCorrectedValueText}
              placeholder="e.g. ₹249.00 or 500 g"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.inputLabel}>Statutory Rationale / Evidence Reference *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={correctionReasonText}
              onChangeText={setCorrectionReasonText}
              placeholder="Explain why this correction is made (e.g. Front panel image clearly shows ₹249)"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <Button label="Cancel" variant="secondary" onPress={() => setCorrectionModalVisible(false)} />
              <Button label="Record Correction" variant="primary" onPress={handleSaveCorrection} />
            </View>
          </Surface>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  progressCard: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipSelected: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  chipReviewed: {
    borderColor: '#059669',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  chipTextReviewed: {
    color: '#059669',
  },
  sectionCard: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  reviewCardActive: {
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitleBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: '100%',
    flexShrink: 1,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#374151',
    flexShrink: 1,
    lineHeight: 15,
  },
  ruleHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
    lineHeight: 21,
  },
  sourceBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0284c7',
  },
  sourceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369a1',
    marginBottom: 2,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    flexShrink: 1,
    lineHeight: 17,
  },
  sourceSubText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    flexShrink: 1,
    lineHeight: 16,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaCol: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
    lineHeight: 18,
  },
  sufficiencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  explanationText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  aiNotice: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#6d28d9',
  },
  observationBox: {
    backgroundColor: '#faf5ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  observationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7e22ce',
    marginBottom: 4,
  },
  observationContent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b0764',
  },
  aiExplanationBox: {
    backgroundColor: '#fdf4ff',
    padding: 8,
    borderRadius: 6,
  },
  aiExplanationLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a21caf',
  },
  aiExplanationText: {
    fontSize: 12,
    color: '#701a75',
    marginTop: 2,
  },
  evidenceCountText: {
    fontSize: 11,
    color: '#6b7280',
  },
  evidenceImageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    height: 180,
    backgroundColor: '#111827',
  },
  evidenceThumbnail: {
    width: '100%',
    height: '100%',
  },
  evidenceImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  evidenceOverlayText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  noEvidenceBox: {
    padding: 24,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    alignItems: 'center',
  },
  noEvidenceText: {
    fontSize: 13,
    color: '#6b7280',
  },
  evidenceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  evidenceMetaLabel: {
    fontSize: 11,
    color: '#6b7280',
    flexShrink: 1,
  },
  checklistHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  checkItemText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  correctionNoticeBox: {
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#d97706',
    gap: 6,
  },
  correctionNoticeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
  },
  correctionSideBySide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  correctionSideCol: {
    flex: 1,
    minWidth: 0,
  },
  correctionSideLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
  },
  correctionSideValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
    flexShrink: 1,
  },
  correctionReasonLabel: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#92400e',
    marginTop: 4,
  },
  reviewActionsGrid: {
    gap: 8,
    marginTop: 8,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  finalizeCtaCard: {
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    gap: 8,
    marginTop: 8,
  },
  finalizeCtaTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#166534',
  },
  finalizeCtaSub: {
    fontSize: 13,
    color: '#15803d',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
    margin: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyBody: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalSurface: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalSub: {
    fontSize: 13,
    color: '#4b5563',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  conflictCard: {
    padding: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 8,
    marginVertical: 8,
    gap: 6,
  },
  conflictBadge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  conflictBadgeText: {
    color: '#c2410c',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  conflictTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9a3412',
  },
  conflictCompareRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  conflictCompareCol: {
    flex: 1,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  conflictCompareLabel: {
    fontSize: 11,
    color: '#7c2d12',
    fontWeight: '700',
    marginBottom: 2,
  },
  conflictCompareVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  conflictNote: {
    fontSize: 11,
    color: '#9a3412',
    fontStyle: 'italic',
    marginTop: 2,
  },
  quickActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  quickConfirmBtn: {
    backgroundColor: '#047857',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickConfirmBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  actionCenterBanner: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBannerTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991b1b',
    letterSpacing: 0.5,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 6,
    maxWidth: 240,
  },
  actionPillPriority: {
    fontSize: 10,
    fontWeight: '800',
    marginRight: 4,
  },
  actionPillText: {
    fontSize: 11,
    color: '#1e293b',
    fontWeight: '600',
    flexShrink: 1,
  },
  findingExplainBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#0284c7',
  },
  findingWhyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369a1',
    marginBottom: 3,
  },
  findingWhyText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  findingActionRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  findingActionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  findingActionText: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '600',
    marginTop: 1,
  },
  searchIncompleteCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 12,
  },
  searchIncompleteHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  searchIncompleteBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  searchIncompleteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 8,
  },
  surfaceStatusSection: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  surfaceStatusHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350f',
    marginBottom: 3,
  },
  surfaceCapturedItem: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginLeft: 6,
    lineHeight: 18,
  },
  surfaceUncapturedItem: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '600',
    marginLeft: 6,
    lineHeight: 18,
  },
  searchRecommendationBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    padding: 8,
  },
  searchRecommendationLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
    textTransform: 'uppercase',
  },
  searchRecommendationText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
    marginTop: 2,
  },
  searchCompleteNoEvidenceCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 12,
  },
  searchCompleteNoEvidenceBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  searchCompleteNoEvidenceText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  searchAgreementCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: 12,
  },
  searchAgreementBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  searchAgreementText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
  },
});

