import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LocalInspectionDraft } from '../state/draft';
import type { RootStackParamList } from '../navigation/types';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import { Screen } from '../components/Screen';
import { Surface } from '../components/Surface';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { StateView } from '../components/StateView';

type Props = NativeStackScreenProps<RootStackParamList, 'InspectionDetail'>;

export function InspectionDetailScreen({ route, navigation }: Props): React.JSX.Element {
  const { inspectionId } = route.params;
  const workflow = useInspectionWorkflow();
  const [inspection, setInspection] = useState<LocalInspectionDraft | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void workflow.getInspectionById(inspectionId).then((result) => {
      if (!cancelled) {
        setInspection(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [inspectionId, workflow]);

  if (loading) {
    return (
      <Screen title="Inspection Details">
        <StateView kind="loading" message="Loading inspection record from storage..." />
      </Screen>
    );
  }

  if (!inspection) {
    return (
      <Screen title="Inspection Details">
        <Surface style={styles.errorCard}>
          <Text style={styles.errorTitle}>Record Not Found</Text>
          <Text style={styles.errorDesc}>
            Could not find inspection with ID: {inspectionId}
          </Text>
          <Button label="Back to History" onPress={() => navigation.goBack()} />
        </Surface>
      </Screen>
    );
  }

  const decision = inspection.inspectorDecision;
  const images = inspection.images || [];
  const declarations = inspection.declarations || [];
  const findings = inspection.findings || [];
  const evidence = inspection.evidence || [];

  return (
    <Screen title="Inspection Details">
      <View style={styles.scrollContent}>
        {/* Header Metadata */}
        <Surface style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productTitle}>
                {inspection.productName || 'Inspected Commodity'}
              </Text>
              <Text style={styles.metaText}>
                ID: {inspection.localId} {inspection.serverId ? `· Cloud: ${inspection.serverId.slice(0, 8)}` : '· (Local Demo Mode)'}
              </Text>
              <Text style={styles.metaSub}>
                Category: {inspection.category} · Package: {inspection.packageType}
              </Text>
            </View>
            <Badge label={inspection.status} bg="#dbeafe" color="#1e40af" />
          </View>
        </Surface>

        {inspection.conflictState ? (
          <Surface style={styles.conflictCard}>
            <View style={styles.conflictHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.conflictTitle}>SYNC CONFLICT — REVIEW REQUIRED</Text>
                <Text style={styles.conflictSubtitle}>No local data was overwritten automatically.</Text>
              </View>
              <Badge label={inspection.conflictState.conflictType.replaceAll('_', ' ')} bg="#fee2e2" color="#991b1b" size="sm" />
            </View>
            <Text style={styles.conflictMessage}>{inspection.conflictState.message}</Text>
            <Text style={styles.conflictMeta}>Local version {inspection.conflictState.localVersion ?? '—'} · Remote version {inspection.conflictState.remoteVersion ?? '—'}</Text>
            <Text style={styles.conflictHint}>Review this local record and the server record before making a correction. Retrying will not silently merge or discard either version.</Text>
            <Button label="Retry sync" variant="secondary" onPress={() => void workflow.syncNow()} />
          </Surface>
        ) : null}

        {/* Finalization Lock Banner */}
        {(inspection.isFinalized || inspection.status === 'DECIDED') && (
          <Surface style={styles.lockBanner}>
            <Text style={styles.lockIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.lockTitle}>FINALIZED & SEALED</Text>
              <Text style={styles.lockSubtitle}>
                This statutory record is sealed against direct editing. Machine observations and rule assessments are immutably archived.
              </Text>
            </View>
          </Surface>
        )}

        {/* Official Inspector Decision */}
        {decision && (
          <Surface style={styles.decisionCard}>
            <View style={styles.decisionHeader}>
              <Text style={styles.decisionTitle}>Official Inspector Decision</Text>
              <Badge label={decision.decision} bg="#fee2e2" color="#991b1b" />
            </View>
            <Text style={styles.decisionDate}>
              Decided At: {new Date(decision.decidedAt).toLocaleString()}
            </Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Inspector Summary Notes:</Text>
              <Text style={styles.notesText}>{decision.summaryNotes}</Text>
            </View>
          </Surface>
        )}

        {/* Human Corrections (Side-by-Side with AI Observations) */}
        {inspection.corrections && inspection.corrections.length > 0 && (
          <Surface style={styles.card}>
            <Text style={styles.sectionHeading}>Inspector Corrections ({inspection.corrections.length})</Text>
            <Text style={styles.subHeadingNotice}>
              Original AI observations remain historically preserved alongside inspector determinations.
            </Text>
            {inspection.corrections.map((corr) => (
              <View key={corr.id} style={styles.correctionItem}>
                <View style={styles.correctionRow}>
                  <View style={styles.correctionCol}>
                    <Text style={styles.correctionColLabel}>AI Observation (Gemini):</Text>
                    <Text style={styles.correctionColVal}>{String(corr.originalValue ?? 'None')}</Text>
                  </View>
                  <View style={styles.correctionCol}>
                    <Text style={[styles.correctionColLabel, { color: '#047857' }]}>Inspector Correction:</Text>
                    <Text style={[styles.correctionColVal, { fontWeight: '700', color: '#047857' }]}>
                      {String(corr.correctedValue)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.correctionReasonText}>Rationale: {corr.reason}</Text>
                <Text style={styles.correctionDateText}>
                  Recorded: {new Date(corr.correctedAt).toLocaleString()}
                </Text>
              </View>
            ))}
          </Surface>
        )}

        {/* Official Amendments History */}
        {inspection.amendments && inspection.amendments.length > 0 && (
          <Surface style={styles.card}>
            <Text style={styles.sectionHeading}>Official Amendments ({inspection.amendments.length})</Text>
            {inspection.amendments.map((amend) => (
              <View key={amend.id} style={styles.amendmentItem}>
                <Text style={styles.amendmentTransition}>
                  Decision Changed: {amend.previousDecision} → {amend.newDecision}
                </Text>
                <Text style={styles.amendmentReason}>Reason: {amend.amendmentReason}</Text>
                <Text style={styles.amendmentDate}>
                  Amended: {new Date(amend.amendedAt).toLocaleString()}
                </Text>
              </View>
            ))}
          </Surface>
        )}

        {/* Captured Surfaces Carousel/Row */}
        <Surface style={styles.card}>
          <Text style={styles.sectionHeading}>Packaging Surface Images ({images.length})</Text>
          {images.length === 0 ? (
            <Text style={styles.emptySubText}>No images recorded.</Text>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageStrip}>
                {images.map((img) => (
                  <Pressable
                    key={img.id}
                    accessibilityRole="button"
                    onPress={() =>
                      navigation.navigate('EvidenceViewer', {
                        imageId: img.id,
                        inspectionId: inspection.localId,
                      })
                    }
                    style={styles.thumbWrapper}
                  >
                    <Image source={{ uri: img.fileUrl }} style={styles.thumbImage} resizeMode="cover" />
                    <Text style={styles.thumbBadge}>{img.surface}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={{ marginTop: 12 }}>
                <Button
                  label="🔍 Open Visual Evidence Heatmap"
                  variant="secondary"
                  onPress={() =>
                    navigation.navigate('EvidenceViewer', {
                      inspectionId: inspection.localId,
                      imageId: images[0]?.id,
                    })
                  }
                />
              </View>
            </>
          )}
        </Surface>

        {/* Findings Summary */}
        <Surface style={styles.card}>
          <Text style={styles.sectionHeading}>Findings ({findings.length})</Text>
          {findings.length === 0 ? (
            <Text style={styles.emptySubText}>No violations or warnings recorded.</Text>
          ) : (
            findings.map((f) => (
              <View key={f.id} style={styles.findingRow}>
                <View style={styles.findingTop}>
                  <Text style={styles.findingTitle}>{f.title}</Text>
                  <Badge severity={f.severity} size="sm" />
                </View>
                <Text style={styles.findingCitation}>{f.ruleCitation}</Text>
                <Text style={styles.findingDesc}>{f.description}</Text>
              </View>
            ))
          )}
        </Surface>

        {/* Extracted Declarations */}
        <Surface style={styles.card}>
          <Text style={styles.sectionHeading}>Extracted Declarations ({declarations.length})</Text>
          {declarations.map((d, idx) => (
            <View key={idx} style={styles.declRow}>
              <Text style={styles.declType}>{d.type}:</Text>
              <Text style={styles.declVal}>"{d.rawText}"</Text>
            </View>
          ))}
        </Surface>

        {/* Evidence Chain */}
        <Surface style={styles.card}>
          <Text style={styles.sectionHeading}>Forensic Evidence ({evidence.length})</Text>
          {evidence.map((ev) => (
            <View key={ev.id} style={styles.evidenceRow}>
              <Text style={styles.evTitle}>{ev.title}</Text>
              <Text style={styles.evHash}>SHA-256: {ev.sha256Hash.slice(0, 20)}...</Text>
            </View>
          ))}
        </Surface>

        {/* Report Preview CTA */}
        <View style={styles.actionContainer}>
          <Button
            label={
              inspection.isFinalized || inspection.status === 'DECIDED'
                ? 'View Finalized Inspection Report'
                : 'Preview Draft Inspection Report'
            }
            onPress={() => navigation.navigate('ReportPreview', { inspectionId: inspection.localId })}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  metaSub: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 4,
    fontWeight: '600',
  },
  decisionCard: {
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  conflictCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff7f7',
  },
  conflictHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  conflictTitle: { color: '#991b1b', fontWeight: '900', fontSize: 13, letterSpacing: 0.3 },
  conflictSubtitle: { color: '#7f1d1d', fontSize: 12, marginTop: 4 },
  conflictMessage: { color: '#450a0a', fontSize: 13, lineHeight: 19, marginTop: 12 },
  conflictMeta: { color: '#7f1d1d', fontSize: 11, marginTop: 8 },
  conflictHint: { color: '#7f1d1d', fontSize: 12, lineHeight: 17, marginTop: 10, marginBottom: 12 },
  decisionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  decisionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  decisionDate: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 8,
  },
  notesBox: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 6,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4b5563',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 13,
    color: '#1f2937',
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  imageStrip: {
    gap: 10,
  },
  thumbWrapper: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1f2937',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 1,
  },
  findingRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  findingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  findingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  findingCitation: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  findingDesc: {
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 16,
  },
  declRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  declType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  declVal: {
    fontSize: 12,
    color: '#111827',
    fontStyle: 'italic',
    marginTop: 1,
  },
  evidenceRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  evTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  evHash: {
    fontSize: 10,
    color: '#9ca3af',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  actionContainer: {
    marginTop: 8,
  },
  errorCard: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
  },
  errorDesc: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  lockBanner: {
    padding: 14,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lockIcon: {
    fontSize: 28,
  },
  lockTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1d4ed8',
    letterSpacing: 0.5,
  },
  lockSubtitle: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 2,
    lineHeight: 16,
  },
  subHeadingNotice: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  correctionItem: {
    backgroundColor: '#fffbeb',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#d97706',
    gap: 4,
    marginBottom: 8,
  },
  correctionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  correctionCol: {
    flex: 1,
  },
  correctionColLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400e',
  },
  correctionColVal: {
    fontSize: 12,
    color: '#111827',
    marginTop: 2,
  },
  correctionReasonText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#78350f',
    marginTop: 2,
  },
  correctionDateText: {
    fontSize: 10,
    color: '#b45309',
  },
  amendmentItem: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#64748b',
    gap: 4,
    marginBottom: 8,
  },
  amendmentTransition: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  amendmentReason: {
    fontSize: 11,
    color: '#334155',
  },
  amendmentDate: {
    fontSize: 10,
    color: '#94a3b8',
  },
});
