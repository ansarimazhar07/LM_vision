import React, { useMemo, useState } from 'react';
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
import type { RootStackParamList } from '../navigation/types';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import { Screen } from '../components/Screen';
import { Surface } from '../components/Surface';
import { Button } from '../components/Button';
import { WorkflowProgress } from '../components/WorkflowProgress';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewSummary'>;

interface DecisionOption {
  type: InspectorDecisionType;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

const CANONICAL_DECISION_OPTIONS: DecisionOption[] = [
  {
    type: 'COMPLIANT',
    label: 'COMPLIANT',
    description: 'All statutory declarations meet GSR 202(E) standards.',
    color: '#047857',
    bgColor: '#ecfdf5',
  },
  {
    type: 'NON_COMPLIANT',
    label: 'NON-COMPLIANT',
    description: 'Statutory violations detected requiring regulatory follow-up.',
    color: '#b91c1c',
    bgColor: '#fef2f2',
  },
  {
    type: 'NOTICE_ISSUED',
    label: 'NOTICE ISSUED',
    description: 'Formal regulatory notice issued to manufacturer/packer.',
    color: '#b45309',
    bgColor: '#fffbeb',
  },
  {
    type: 'SEIZED',
    label: 'SEIZED',
    description: 'Physical commodities seized under Section 15 powers.',
    color: '#7f1d1d',
    bgColor: '#fef2f2',
  },
  {
    type: 'ESCALATED',
    label: 'ESCALATED',
    description: 'Escalated to Controller / Assistant Controller for review.',
    color: '#6d28d9',
    bgColor: '#f5f3ff',
  },
  {
    type: 'DISMISSED',
    label: 'DISMISSED',
    description: 'Inspection dismissed (exempt commodity / no action warranted).',
    color: '#4b5563',
    bgColor: '#f3f4f6',
  },
];

export function ReviewSummaryScreen({ navigation }: Props): React.JSX.Element {
  const workflow = useInspectionWorkflow();
  const draft = workflow.activeDraft;

  const assessments = draft?.complianceAssessments || [];
  const reviews = draft?.reviews || [];
  const corrections = draft?.corrections || [];

  const [selectedDecision, setSelectedDecision] = useState<InspectorDecisionType>('NON_COMPLIANT');
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [conflictsAcknowledged, setConflictsAcknowledged] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Dynamic counts computed from actual state
  const counts = useMemo(() => {
    let pass = 0;
    let fail = 0;
    let requiresVerification = 0;
    let insufficientEvidence = 0;
    let notApplicable = 0;

    assessments.forEach((a) => {
      switch (a.result) {
        case 'PASS':
          pass++;
          break;
        case 'FAIL':
          fail++;
          break;
        case 'REQUIRES_VERIFICATION':
          requiresVerification++;
          break;
        case 'INSUFFICIENT_EVIDENCE':
          insufficientEvidence++;
          break;
        case 'NOT_APPLICABLE':
          notApplicable++;
          break;
      }
    });

    return {
      total: assessments.length,
      pass,
      fail,
      requiresVerification,
      insufficientEvidence,
      notApplicable,
    };
  }, [assessments]);

  // Outstanding issues
  const unreviewedAssessments = useMemo(() => {
    return assessments.filter((a) => {
      const rev = reviews.find((r) => r.assessmentId === a.id);
      return !rev || rev.status === 'UNREVIEWED';
    });
  }, [assessments, reviews]);

  const conflictingAssessments = useMemo(() => {
    return assessments.filter((a) => a.evidenceSufficiency === 'CONFLICTING');
  }, [assessments]);

  const hasConflicts = conflictingAssessments.length > 0;
  const canFinalize = unreviewedAssessments.length === 0 && (!hasConflicts || conflictsAcknowledged);

  const handleFinalizePress = () => {
    if (!inspectorNotes.trim()) {
      Alert.alert('Notes Required', 'Please enter your inspector summary findings and statutory notes.');
      return;
    }
    if (unreviewedAssessments.length > 0) {
      Alert.alert(
        'Incomplete Review',
        `Please review all ${unreviewedAssessments.length} remaining assessments before finalizing.`
      );
      return;
    }
    if (hasConflicts && !conflictsAcknowledged) {
      Alert.alert(
        'Conflicting Evidence',
        'Conflicting evidence must be acknowledged before final statutory decision.'
      );
      return;
    }
    setConfirmModalVisible(true);
  };

  const handleConfirmFinalize = async () => {
    setIsFinalizing(true);
    setConfirmModalVisible(false);

    try {
      const result = await workflow.finalizeInspection({
        decision: selectedDecision,
        notes: inspectorNotes.trim(),
        conflictsAcknowledged,
      });

      if (result.success) {
        Alert.alert(
          'Inspection Finalized & Locked',
          'The inspection record is now sealed with tamper-evident audit provenance. Subsequent modifications require an official amendment.',
          [
            {
              text: 'View Inspection',
              onPress: () => {
                navigation.navigate('InspectionDetail', {
                  inspectionId: draft?.localId || '',
                });
              },
            },
          ]
        );
      } else {
        Alert.alert('Finalization Failed', result.error || 'Failed to finalize inspection.');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <Screen title="Review Summary & Finalize">
      <View style={styles.container}>
        <WorkflowProgress current="review" />
        {/* Summary Card */}
        <Surface style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>INSPECTION REVIEW SUMMARY</Text>
          <Text style={styles.summarySub}>
            Product: {draft?.productName || 'Pre-Packaged Commodity'} ({draft?.category || 'General'})
          </Text>

          {/* Counts Matrix */}
          <View style={styles.countsGrid}>
            <View style={styles.countItem}>
              <Text style={styles.countNumber}>{counts.total}</Text>
              <Text style={styles.countLabel}>Rules Evaluated</Text>
            </View>
            <View style={[styles.countItem, { backgroundColor: '#ecfdf5' }]}>
              <Text style={[styles.countNumber, { color: '#047857' }]}>{counts.pass}</Text>
              <Text style={[styles.countLabel, { color: '#065f46' }]}>PASS</Text>
            </View>
            <View style={[styles.countItem, { backgroundColor: '#fef2f2' }]}>
              <Text style={[styles.countNumber, { color: '#b91c1c' }]}>{counts.fail}</Text>
              <Text style={[styles.countLabel, { color: '#991b1b' }]}>FAIL</Text>
            </View>
            <View style={[styles.countItem, { backgroundColor: '#fffbeb' }]}>
              <Text style={[styles.countNumber, { color: '#b45309' }]}>{counts.requiresVerification}</Text>
              <Text style={[styles.countLabel, { color: '#92400e' }]}>VERIFICATION</Text>
            </View>
            <View style={[styles.countItem, { backgroundColor: '#f5f3ff' }]}>
              <Text style={[styles.countNumber, { color: '#6d28d9' }]}>{counts.insufficientEvidence}</Text>
              <Text style={[styles.countLabel, { color: '#5b21b6' }]}>INSUFFICIENT</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>AI Observations Corrected:</Text>
            <Text style={styles.metricValue}>{corrections.length}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Physical Evidence Reviewed:</Text>
            <Text style={styles.metricValue}>{draft?.images.length || 0} photo(s)</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Inspector Authority:</Text>
            <Text style={styles.metricValue}>Inspector User (Authenticated)</Text>
          </View>
        </Surface>

        {/* Outstanding Issues & Conflict Gate */}
        <Surface style={styles.issuesCard}>
          <Text style={styles.issuesTitle}>Outstanding Matters & Gates</Text>

          {unreviewedAssessments.length > 0 ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>⚠️ Unreviewed Assessments</Text>
              <Text style={styles.warningText}>
                {unreviewedAssessments.length} assessment(s) require human review before finalization:
              </Text>
              {unreviewedAssessments.map((a) => (
                <Text key={a.id} style={styles.warningItem}>
                  • Rule {a.ruleNumber}: {a.ruleTitle}
                </Text>
              ))}
              <Button
                label="Return to Review Screen"
                variant="secondary"
                onPress={() => navigation.navigate('InspectorReview')}
              />
            </View>
          ) : (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✓ All mandatory assessments reviewed.</Text>
            </View>
          )}

          {hasConflicts ? (
            <View style={styles.conflictBox}>
              <Text style={styles.conflictTitle}>⚠️ Conflicting Evidence Detected</Text>
              <Text style={styles.conflictText}>
                Discrepancies found across packaging surfaces (e.g. conflicting MRP declarations).
              </Text>
              <Pressable
                style={styles.conflictCheckboxRow}
                onPress={() => setConflictsAcknowledged(!conflictsAcknowledged)}
              >
                <View style={[styles.checkbox, conflictsAcknowledged && styles.checkboxChecked]}>
                  {conflictsAcknowledged && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.conflictCheckboxText}>
                  I confirm conflicting evidence has been reviewed and resolved.
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Surface>

        {/* Final Decision Selector */}
        <Surface style={styles.decisionCard}>
          <Text style={styles.decisionHeading}>Select Statutory Inspector Decision</Text>
          <Text style={styles.decisionSub}>
            The authenticated inspector is the final operational and statutory authority.
          </Text>

          <View style={styles.optionsList}>
            {CANONICAL_DECISION_OPTIONS.map((opt) => {
              const isSelected = selectedDecision === opt.type;
              return (
                <Pressable
                  key={opt.type}
                  onPress={() => setSelectedDecision(opt.type)}
                  style={[
                    styles.optionItem,
                    isSelected && { borderColor: opt.color, backgroundColor: opt.bgColor },
                  ]}
                >
                  <View style={styles.optionHeader}>
                    <View style={styles.radioOuter}>
                      {isSelected && <View style={[styles.radioInner, { backgroundColor: opt.color }]} />}
                    </View>
                    <Text style={[styles.optionLabel, isSelected && { color: opt.color }]}>
                      {opt.label}
                    </Text>
                  </View>
                  <Text style={styles.optionDesc}>{opt.description}</Text>
                </Pressable>
              );
            })}
          </View>
        </Surface>

        {/* Inspector Summary Notes */}
        <Surface style={styles.notesCard}>
          <Text style={styles.notesTitle}>Inspector Summary & Rationale *</Text>
          <TextInput
            style={styles.notesInput}
            value={inspectorNotes}
            onChangeText={setInspectorNotes}
            placeholder="Document overall legal findings, manufacturer notices issued, or statutory directions..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
          />
        </Surface>

        {/* Finalize Action */}
        <View style={styles.finalizeWrap}>
          <Button
            label={isFinalizing ? "Finalizing..." : "🔒 Finalize & Seal Inspection"}
            variant="primary"
            disabled={!canFinalize || isFinalizing}
            onPress={handleFinalizePress}
          />
          {!canFinalize && (
            <Text style={styles.gateDisabledNotice}>
              Complete all required assessment reviews and acknowledge conflicts to enable finalization.
            </Text>
          )}
        </View>
      </View>

      {/* Finalization Confirmation Modal */}
      <Modal visible={confirmModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalSurface}>
            <Text style={styles.modalLockIcon}>🔒</Text>
            <Text style={styles.modalTitle}>Confirm Finalization Lock</Text>
            <Text style={styles.modalBody}>
              Once finalized with decision <Text style={{ fontWeight: '800' }}>{selectedDecision}</Text>, this inspection becomes immutable:
            </Text>
            <View style={styles.modalBulletList}>
              <Text style={styles.modalBullet}>• Rule assessments and original AI observations are sealed.</Text>
              <Text style={styles.modalBullet}>• Captured evidence cannot be altered or removed.</Text>
              <Text style={styles.modalBullet}>• Any subsequent change requires an official statutory Amendment.</Text>
            </View>
            <View style={styles.modalActions}>
              <Button label="Cancel" variant="secondary" onPress={() => setConfirmModalVisible(false)} />
              <Button label="Confirm & Seal" variant="primary" onPress={handleConfirmFinalize} />
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
  summaryCard: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e3a8a',
    letterSpacing: 0.5,
  },
  summarySub: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '600',
  },
  countsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  countItem: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  countNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  countLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  issuesCard: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  issuesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    gap: 6,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b45309',
  },
  warningText: {
    fontSize: 12,
    color: '#92400e',
  },
  warningItem: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78350f',
    marginLeft: 4,
  },
  successBox: {
    backgroundColor: '#ecfdf5',
    padding: 10,
    borderRadius: 8,
  },
  successText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
  },
  conflictBox: {
    backgroundColor: '#fff7ed',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ea580c',
    gap: 8,
  },
  conflictTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#c2410c',
  },
  conflictText: {
    fontSize: 12,
    color: '#9a3412',
  },
  conflictCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  conflictCheckboxText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7c2d12',
    flex: 1,
  },
  decisionCard: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  decisionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  decisionSub: {
    fontSize: 12,
    color: '#6b7280',
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    gap: 4,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  optionDesc: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 28,
  },
  notesCard: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#f9fafb',
    height: 100,
    textAlignVertical: 'top',
  },
  finalizeWrap: {
    gap: 8,
    marginTop: 8,
  },
  gateDisabledNotice: {
    fontSize: 12,
    color: '#b45309',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalSurface: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  modalLockIcon: {
    fontSize: 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalBulletList: {
    alignSelf: 'stretch',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  modalBullet: {
    fontSize: 12,
    color: '#334155',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
  },
});
