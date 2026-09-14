import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { InspectorDecisionType } from '@lm-vision/shared-types';
import { COLOR_TOKENS } from '@lm-vision/ui';
import type { RootStackParamList } from '../navigation/types';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import { Screen } from '../components/Screen';
import { Surface } from '../components/Surface';
import { Button } from '../components/Button';
import { WorkflowProgress } from '../components/WorkflowProgress';

type Props = NativeStackScreenProps<RootStackParamList, 'InspectorDecision'>;

const DECISION_OPTIONS: { type: InspectorDecisionType; label: string; desc: string }[] = [
  {
    type: 'NOTICE_ISSUED',
    label: 'Issue Statutory Notice',
    desc: 'Notice to packer/manufacturer to show cause or remedy non-compliance within statutory timeframe.',
  },
  {
    type: 'NON_COMPLIANT',
    label: 'Record Non-Compliance',
    desc: 'Formal violation recorded on official inspection ledger without immediate seizure.',
  },
  {
    type: 'SEIZED',
    label: 'Seizure Order',
    desc: 'Packaging seized under Legal Metrology Act for grave non-compliance or deceptive practice.',
  },
  {
    type: 'COMPLIANT',
    label: 'Approved / Compliant',
    desc: 'All packaging declarations and pricing concordance verified satisfactory.',
  },
  {
    type: 'ESCALATED',
    label: 'Escalate to Controller',
    desc: 'Refer complex multi-state packaging discrepancy for higher statutory guidance.',
  },
  {
    type: 'DISMISSED',
    label: 'Dismiss Inquiry',
    desc: 'Investigation closed; suspected discrepancies substantiated as conforming.',
  },
];

export function InspectorDecisionScreen({ navigation }: Props): React.JSX.Element {
  const workflow = useInspectionWorkflow();
  const draft = workflow.activeDraft;

  const isFinalized = Boolean(draft?.isFinalized || draft?.status === 'FINALIZED' || draft?.status === 'DECIDED');

  const [selectedDecision, setSelectedDecision] = useState<InspectorDecisionType>(
    draft?.inspectorDecision?.decision || 'NOTICE_ISSUED'
  );
  const [notes, setNotes] = useState(
    draft?.inspectorDecision?.summaryNotes ||
      'Packaging exhibits missing consumer care telephone contact and MRP mismatch between physical label and e-commerce listing. Notice to show cause under Rule 6 and Section 36 issued.'
  );
  const [confirmedDeclaration, setConfirmedDeclaration] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);

  // Controlled Reopen state
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  const findings = draft?.findings || [];
  const evidence = draft?.evidence || [];
  const assessments = draft?.complianceAssessments || [];

  // Calculate System Assessment outcome
  let sysPassCount = 0;
  let sysFailCount = 0;
  let sysVerificationCount = 0;
  assessments.forEach((a) => {
    if (a.result === 'PASS') sysPassCount++;
    else if (a.result === 'FAIL') sysFailCount++;
    else if (a.result === 'REQUIRES_VERIFICATION') sysVerificationCount++;
  });
  const systemAssessmentResult =
    sysFailCount > 0 ? 'FAIL' : sysVerificationCount > 0 ? 'REQUIRES_VERIFICATION' : 'PASS';

  // Check conflicting assessments
  const hasConflicts = assessments.some((a) => a.evidenceSufficiency === 'CONFLICTING');

  const handleFinalizeDecision = async () => {
    if (!confirmedDeclaration) {
      Alert.alert(
        'Statutory Verification Required',
        'You must confirm that you have personally reviewed the physical evidence before issuing an official decision.'
      );
      return;
    }

    if (!notes.trim()) {
      Alert.alert('Notes Required', 'Please provide inspector summary notes for the official ledger.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await workflow.finalizeInspection({
        decision: selectedDecision,
        notes: notes.trim(),
        conflictsAcknowledged: confirmedDeclaration,
      });
      if (result.success) {
        const modeLabel = result.savedRemotely
          ? 'Inspection Finalized & Locked (Cloud Synced)'
          : 'Inspection Finalized & Locked (Local Ledger)';

        setSubmissionFeedback(modeLabel);

        setTimeout(() => {
          navigation.replace('InspectionDetail', { inspectionId: result.localId });
        }, 1000);
      } else {
        Alert.alert('Finalization Blocked', result.error || 'Unable to record inspector decision.');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopenInspection = async () => {
    if (!reopenReason.trim() || reopenReason.trim().length < 5) {
      Alert.alert('Substantive Reason Required', 'Please provide an official justification (min 5 characters) to reopen this finalized inspection.');
      return;
    }

    setIsReopening(true);
    try {
      const result = await workflow.reopenInspection(reopenReason.trim());
      if (result.success) {
        setShowReopenModal(false);
        setReopenReason('');
        Alert.alert('Inspection Reopened', 'Inspection has been reopened for authorized review. Historical final decision is preserved in audit ledger.');
      } else {
        Alert.alert('Reopen Failed', result.error || 'Unable to reopen inspection.');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred while reopening inspection.');
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <Screen title={isFinalized ? 'Finalized Inspection' : 'Inspector Decision'}>
      <View style={styles.scrollContent}>
        <WorkflowProgress current="decision" />

        {/* Finalized Lock Banner */}
        {isFinalized && (
          <Surface style={styles.lockedCard}>
            <View style={styles.lockedHeader}>
              <Text style={styles.lockedBadge}>FINALIZED & SEALED</Text>
              <Text style={styles.lockedTimestamp}>
                Sealed: {draft?.finalizedAt ? new Date(draft.finalizedAt).toLocaleString() : 'Recorded'}
              </Text>
            </View>
            <Text style={styles.lockedText}>
              This inspection is finalized and locked from ordinary editing. State is tamper-evident. Any subsequent revisions require a controlled reopening.
            </Text>
            {draft?.reopenReason && (
              <View style={styles.reopenInfoBox}>
                <Text style={styles.reopenInfoTitle}>Previous Reopening Notice:</Text>
                <Text style={styles.reopenInfoText}>"{draft.reopenReason}"</Text>
              </View>
            )}
            <View style={{ marginTop: 12 }}>
              <Button
                label="Reopen Inspection for Authorized Revision"
                variant="secondary"
                onPress={() => setShowReopenModal(true)}
              />
            </View>
          </Surface>
        )}

        {/* SYSTEM ASSESSMENT CARD (Separation of Automated Engine from Inspector Authority) */}
        <Surface style={styles.systemAssessmentCard}>
          <View style={styles.systemAssessmentHeader}>
            <View>
              <Text style={styles.systemAssessmentEyebrow}>SYSTEM ASSESSMENT (NON-AUTHORITATIVE)</Text>
              <Text style={styles.systemAssessmentTitle}>Deterministic Rule Engine Evaluation</Text>
            </View>
            <View style={[styles.statusPill, systemAssessmentResult === 'PASS' ? styles.pillPass : systemAssessmentResult === 'FAIL' ? styles.pillFail : styles.pillWarn]}>
              <Text style={styles.statusPillText}>{systemAssessmentResult}</Text>
            </View>
          </View>
          <Text style={styles.systemAssessmentDisclaimer}>
            AI observes. Rules evaluate. The certified Legal Metrology inspector holds sole final statutory authority.
          </Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, { color: '#047857' }]}>{sysPassCount}</Text>
              <Text style={styles.summaryLabel}>Rules Passed</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, { color: '#b91c1c' }]}>{sysFailCount}</Text>
              <Text style={styles.summaryLabel}>Violations</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, { color: '#b45309' }]}>{sysVerificationCount}</Text>
              <Text style={styles.summaryLabel}>Verification Req.</Text>
            </View>
          </View>
        </Surface>

        {/* Conflict Warning Banner if conflicts exist */}
        {hasConflicts && !isFinalized && (
          <Surface style={styles.conflictBanner}>
            <Text style={styles.conflictBannerTitle}>Cross-Surface Discrepancy Acknowledged</Text>
            <Text style={styles.conflictBannerText}>
              Conflicting evidence detected across packaging surfaces (e.g. MRP or Date markings). Your official determination will govern the legal ledger.
            </Text>
          </Surface>
        )}

        {/* Inspection Context Card */}
        <Surface style={styles.card}>
          <Text style={styles.commodityTitle}>
            {draft?.productName || 'Inspected Commodity'}
          </Text>
          <Text style={styles.commodityMeta}>
            ID: {draft?.localId} · {draft?.category}
          </Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryCount}>{findings.length}</Text>
              <Text style={styles.summaryLabel}>Total Findings</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryCount}>{evidence.length}</Text>
              <Text style={styles.summaryLabel}>Evidence Photos</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, { color: '#dc2626' }]}>
                {findings.filter((f) => f.severity === 'CRITICAL').length}
              </Text>
              <Text style={styles.summaryLabel}>Critical Issues</Text>
            </View>
          </View>
        </Surface>

        {/* Decision Option Radio Cards */}
        <Text style={styles.sectionHeading}>Official Inspector Determination</Text>

        {DECISION_OPTIONS.map((opt) => {
          const isSelected = selectedDecision === opt.type;
          return (
            <Surface key={opt.type} style={[styles.optionCard, isSelected && styles.optionCardSelected]}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                disabled={isFinalized}
                onPress={() => setSelectedDecision(opt.type)}
                style={styles.optionPressable}
              >
                <View style={styles.radioRow}>
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.optionTitle, isSelected && styles.optionTitleActive]}>
                    {opt.label}
                  </Text>
                </View>
                <Text style={styles.optionDesc}>{opt.desc}</Text>
              </Pressable>
            </Surface>
          );
        })}

        {/* Summary Notes Input */}
        <Surface style={styles.card}>
          <Text style={styles.fieldLabel}>Official Inspector Notes & Justification *</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            editable={!isFinalized}
            value={notes}
            onChangeText={setNotes}
            placeholder="Record statutory basis, rule references, or directives for manufacturer..."
            placeholderTextColor="#9ca3af"
          />
        </Surface>

        {/* Mandatory Human Confirmation Gate */}
        {!isFinalized && (
          <Surface style={styles.declarationCard}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: confirmedDeclaration }}
              onPress={() => setConfirmedDeclaration(!confirmedDeclaration)}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkbox, confirmedDeclaration && styles.checkboxChecked]}>
                {confirmedDeclaration && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.declarationText}>
                  I confirm that I am an authorized Legal Metrology officer, have independently reviewed all evidence and declarations, and this is my official inspector determination.
                </Text>
              </View>
            </Pressable>
          </Surface>
        )}

        {/* Submission Feedback Banner */}
        {submissionFeedback && (
          <Surface style={styles.feedbackCard}>
            <Text style={styles.feedbackText}>✓ {submissionFeedback}</Text>
          </Surface>
        )}

        {/* Finalize CTA */}
        {!isFinalized && (
          <View style={styles.ctaWrapper}>
            <Button
              label={isSubmitting ? 'Finalizing & Locking Inspection...' : 'Finalize & Seal Inspection'}
              loading={isSubmitting}
              disabled={!confirmedDeclaration || isSubmitting}
              onPress={handleFinalizeDecision}
            />
          </View>
        )}

        {/* Controlled Reopen Modal */}
        <Modal
          visible={showReopenModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowReopenModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <Surface style={styles.modalCard}>
              <Text style={styles.modalTitle}>Authorized Inspection Reopening</Text>
              <Text style={styles.modalSubtitle}>
                Reopening preserves the previous finalization record in the immutable audit trail. Please provide an official justification for revising this case.
              </Text>
              <TextInput
                style={styles.modalTextArea}
                multiline
                numberOfLines={3}
                value={reopenReason}
                onChangeText={setReopenReason}
                placeholder="State official reason (e.g. Additional photographic evidence submitted by packer)..."
                placeholderTextColor="#9ca3af"
              />
              <View style={styles.modalActionRow}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  disabled={isReopening}
                  onPress={() => setShowReopenModal(false)}
                />
                <Button
                  label={isReopening ? 'Reopening...' : 'Confirm Reopen'}
                  loading={isReopening}
                  disabled={reopenReason.trim().length < 5 || isReopening}
                  onPress={handleReopenInspection}
                />
              </View>
            </Surface>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
  },
  commodityTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  commodityMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  optionCard: {
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: COLOR_TOKENS.primary[600],
    backgroundColor: '#f5f3ff',
  },
  optionPressable: {
    padding: 14,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: COLOR_TOKENS.primary[600],
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLOR_TOKENS.primary[600],
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  optionTitleActive: {
    color: COLOR_TOKENS.primary[700],
  },
  optionDesc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
    marginLeft: 30,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 12,
    fontSize: 13,
    color: '#111827',
    textAlignVertical: 'top',
    backgroundColor: '#ffffff',
  },
  declarationCard: {
    padding: 14,
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
    borderWidth: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  declarationText: {
    fontSize: 13,
    color: '#1e3a8a',
    lineHeight: 18,
    fontWeight: '600',
  },
  feedbackCard: {
    padding: 12,
    backgroundColor: '#d1fae5',
    borderColor: '#6ee7b7',
    borderWidth: 1,
    alignItems: 'center',
  },
  feedbackText: {
    color: '#065f46',
    fontSize: 13,
    fontWeight: '700',
  },
  ctaWrapper: {
    marginTop: 6,
  },
  lockedCard: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1.5,
    borderRadius: 8,
  },
  lockedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockedBadge: {
    backgroundColor: '#334155',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  lockedTimestamp: {
    fontSize: 11,
    color: '#64748b',
  },
  lockedText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  reopenInfoBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 4,
    borderColor: '#fef3c7',
    borderWidth: 1,
  },
  reopenInfoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },
  reopenInfoText: {
    fontSize: 12,
    color: '#78350f',
    fontStyle: 'italic',
  },
  systemAssessmentCard: {
    padding: 14,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
  },
  systemAssessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  systemAssessmentEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  systemAssessmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
  },
  systemAssessmentDisclaimer: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pillPass: {
    backgroundColor: '#ecfdf5',
  },
  pillFail: {
    backgroundColor: '#fef2f2',
  },
  pillWarn: {
    backgroundColor: '#fffbeb',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  conflictBanner: {
    padding: 12,
    backgroundColor: '#fff7ed',
    borderColor: '#ffedd5',
    borderWidth: 1,
    borderRadius: 6,
  },
  conflictBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#c2410c',
    marginBottom: 2,
  },
  conflictBannerText: {
    fontSize: 12,
    color: '#9a3412',
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    padding: 18,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 12,
  },
  modalTextArea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
    textAlignVertical: 'top',
    marginBottom: 14,
    minHeight: 70,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
});
