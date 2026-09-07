import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import { Screen } from '../components/Screen';
import { Surface } from '../components/Surface';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'Evidence'>;

export function EvidenceScreen({ navigation }: Props): React.JSX.Element {
  const workflow = useInspectionWorkflow();
  const draft = workflow.activeDraft;
  const evidenceList = draft?.evidence || [];
  const images = draft?.images || [];

  return (
    <Screen title="Attached Evidence">
      <View style={styles.scrollContent}>
        <Surface style={styles.headerCard}>
          <Text style={styles.headerTitle}>Chain of Custody Evidence</Text>
          <Text style={styles.headerDesc}>
            Forensically tracked packaging photos and evidentiary records associated with this inspection.
          </Text>
          <View style={styles.statRow}>
            <Text style={styles.statText}>
              Evidence Items: <Text style={styles.bold}>{evidenceList.length}</Text>
            </Text>
            <Text style={styles.statText}>
              Surface Images: <Text style={styles.bold}>{images.length}</Text>
            </Text>
          </View>
          <View style={{ marginTop: 12 }}>
            <Button
              label="🔍 Open Visual Evidence Heatmap"
              onPress={() => navigation.navigate('EvidenceViewer')}
            />
          </View>
        </Surface>

        {evidenceList.length === 0 ? (
          <Surface style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Findings Evidence Attached Yet</Text>
            <Text style={styles.emptyDesc}>
              You can attach packaging surface photos directly to specific regulatory findings from the Finding Detail screen.
            </Text>
            <Button
              label="Review Findings"
              onPress={() => navigation.navigate('Findings')}
            />
          </Surface>
        ) : (
          evidenceList.map((ev, index) => {
            const linkedFinding = draft?.findings.find((f) => f.id === ev.findingId);
            return (
              <Surface key={ev.id} style={styles.evidenceCard}>
                <View style={styles.cardTop}>
                  <Text style={styles.evidenceIndex}>Item #{index + 1}</Text>
                  <Badge label={ev.status} bg="#d1fae5" color="#065f46" size="sm" />
                </View>

                {ev.fileUrl ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => navigation.navigate('EvidenceViewer', { imageId: ev.id })}
                    style={styles.imagePressable}
                  >
                    <Image source={{ uri: ev.fileUrl }} style={styles.imagePreview} resizeMode="cover" />
                    <View style={styles.imageOverlayBadge}>
                      <Text style={styles.imageOverlayText}>🔍 Tap to View Heatmap</Text>
                    </View>
                  </Pressable>
                ) : null}

                <Text style={styles.evidenceTitle}>{ev.title}</Text>

                {linkedFinding && (
                  <View style={styles.linkedBox}>
                    <Text style={styles.linkedLabel}>Linked Regulatory Finding:</Text>
                    <Text style={styles.linkedFindingTitle}>{linkedFinding.title}</Text>
                  </View>
                )}

                <View style={styles.metaBox}>
                  <Text style={styles.hashText}>SHA-256: {ev.sha256Hash.slice(0, 16)}...</Text>
                  <Text style={styles.timeText}>
                    Captured: {new Date(ev.capturedAt).toLocaleString()}
                  </Text>
                </View>

                <View style={{ marginTop: 10 }}>
                  <Button
                    label="🔍 View in Evidence Heatmap"
                    variant="secondary"
                    onPress={() => navigation.navigate('EvidenceViewer', { imageId: ev.id })}
                  />
                </View>
              </Surface>
            );
          })
        )}

        <View style={styles.actions}>
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
    marginBottom: 10,
  },
  statRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statText: {
    fontSize: 13,
    color: '#374151',
  },
  bold: {
    fontWeight: '700',
  },
  evidenceCard: {
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  evidenceIndex: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
  },
  imagePressable: {
    position: 'relative',
    width: '100%',
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
    marginBottom: 10,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  imageOverlayText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  evidenceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  linkedBox: {
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  linkedLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  linkedFindingTitle: {
    fontSize: 13,
    color: '#1e3a8a',
    fontWeight: '700',
    marginTop: 2,
  },
  metaBox: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  hashText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#9ca3af',
  },
  timeText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyCard: {
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  actions: {
    marginTop: 8,
  },
});
