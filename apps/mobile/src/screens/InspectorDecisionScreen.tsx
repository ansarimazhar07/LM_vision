import React, { useState } from 'react';
import {
  Alert,
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

  const [selectedDecision, setSelectedDecision] = useState<InspectorDecisionType>('NOTICE_ISSUED');
  const [notes, setNotes] = useState(
    'Packaging exhibits missing consumer care telephone contact and MRP mismatch between physical label and e-commerce listing. Notice to show cause under Rule 6 and Section 36 issued.'
  );
  const [confirmedDeclaration, setConfirmedDeclaration] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);

  const findings = draft?.findings || [];
  const evidence = draft?.evidence || [];

  const handleSaveDecision = async () => {
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
      const result = await workflow.recordDecision(selectedDecision, notes.trim());
      if (result.success) {
        const modeLabel = result.savedRemotely
          ? 'Saved to Cloud Database (Real Mode)'
          : 'Saved to Local Persistent Storage (Demo Mode)';

        setSubmissionFeedback(modeLabel);

        setTimeout(() => {
          navigation.replace('InspectionDetail', { inspectionId: result.localId });
        }, 1000);
      } else {
        Alert.alert('Save Failed', result.error || 'Unable to record inspector decision.');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen title="Inspector Decision">
      <View style={styles.scrollContent}>
        <WorkflowProgress current="decision" />
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
        <Text style={styles.sectionHeading}>Select Official Determination</Text>

        {DECISION_OPTIONS.map((opt) => {
          const isSelected = selectedDecision === opt.type;
          return (
            <Surface key={opt.type} style={[styles.optionCard, isSelected && styles.optionCardSelected]}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
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
            value={notes}
            onChangeText={setNotes}
            placeholder="Record statutory basis, rule references, or directives for manufacturer..."
            placeholderTextColor="#9ca3af"
          />
        </Surface>

        {/* Mandatory Human Confirmation Gate */}
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

        {/* Submission Feedback Banner */}
        {submissionFeedback && (
          <Surface style={styles.feedbackCard}>
            <Text style={styles.feedbackText}>✓ {submissionFeedback}</Text>
          </Surface>
        )}

        {/* Save CTA */}
        <View style={styles.ctaWrapper}>
          <Button
            label={isSubmitting ? 'Recording Official Decision...' : 'Confirm & Save Inspection'}
            loading={isSubmitting}
            disabled={!confirmedDeclaration || isSubmitting}
            onPress={handleSaveDecision}
          />
        </View>
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
});
