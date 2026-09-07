import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLOR_TOKENS } from '@lm-vision/ui';
import type { RootStackParamList } from '../navigation/types';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import { Screen } from '../components/Screen';
import { Surface } from '../components/Surface';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ProviderBadge } from '../components/ProviderBadge';
import { WorkflowProgress } from '../components/WorkflowProgress';

type Props = NativeStackScreenProps<RootStackParamList, 'Findings'>;

export function FindingsScreen({ navigation }: Props): React.JSX.Element {
  const workflow = useInspectionWorkflow();
  const findings = workflow.activeDraft?.findings || [];

  return (
    <Screen title="Demo / Test Findings">
      <View style={styles.scrollContent}>
        <WorkflowProgress current="assess" />
        <Surface style={styles.headerCard}>
          <View style={styles.demoTag}>
            <ProviderBadge mode={workflow.aiMode} />
          </View>
          <Text style={styles.headerTitle}>Rule engine assessments</Text>
          <Text style={styles.headerDesc}>
            Deterministic assessments linked to captured evidence. Inspector review and manual verification are required before a decision.
          </Text>
        </Surface>

        {findings.length === 0 ? (
          <Surface style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Findings Detected</Text>
            <Text style={styles.emptyDesc}>All evaluated declarations appear compliant.</Text>
          </Surface>
        ) : (
          findings.map((finding) => (
            <Surface key={finding.id} style={styles.findingCard}>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('FindingDetail', { findingId: finding.id })}
                style={styles.pressable}
              >
                <View style={styles.badgeRow}>
                  <Badge severity={finding.severity} size="sm" />
                  <Badge status={finding.status} size="sm" />
                </View>

                <Text style={styles.findingTitle}>{finding.title}</Text>
                <Text style={styles.citationText}>{finding.ruleCitation}</Text>

                <Text style={styles.snippetText}>
                  {finding.description}
                </Text>

                <View style={styles.footerRow}>
                  <Text style={styles.confidenceText}>
                    Confidence: {Math.round(finding.confidence * 100)}%
                  </Text>
                  <Text style={styles.detailLink}>Inspect Details →</Text>
                </View>
              </Pressable>
            </Surface>
          ))
        )}

        <View style={styles.ctaContainer}>
          <Button
            label="Proceed to Decision"
            onPress={() => navigation.navigate('InspectorDecision')}
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
  headerCard: {
    padding: 16,
  },
  demoTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  demoTagText: {
    color: '#92400e',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerDesc: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  findingCard: {
    padding: 0,
    overflow: 'hidden',
  },
  pressable: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  findingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    flexShrink: 1,
  },
  citationText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  snippetText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  confidenceText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  detailLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLOR_TOKENS.primary[700],
    marginLeft: 'auto',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  ctaContainer: {
    marginTop: 8,
  },
});
