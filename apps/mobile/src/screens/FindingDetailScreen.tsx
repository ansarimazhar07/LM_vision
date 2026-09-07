import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLOR_TOKENS } from '@lm-vision/ui';
import type { RootStackParamList } from '../navigation/types';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import { Screen } from '../components/Screen';
import { Surface } from '../components/Surface';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { ValidationModeBanner } from '../components/ValidationModeBanner';
import { isLocalOnlyMode } from '../config';

type Props = NativeStackScreenProps<RootStackParamList, 'FindingDetail'>;

export function FindingDetailScreen({ route, navigation }: Props): React.JSX.Element {
  const { findingId } = route.params;
  const workflow = useInspectionWorkflow();
  const draft = workflow.activeDraft;

  const finding = draft?.findings.find((f) => f.id === findingId);
  const isMrpCrossSource = Boolean(
    finding?.ruleId &&
      (finding.ruleId.includes('CROSS-SOURCE-MRP-MATCH') ||
        finding.ruleId.includes('CROSS_SOURCE_MRP_MATCH')),
  );
  const attachedEvidence = draft?.evidence.filter((e) => e.findingId === findingId) || [];
  const inspectionImages = draft?.images || [];

  if (!finding) {
    return (
      <Screen title="Finding Detail">
        <Surface style={styles.errorCard}>
          <Text style={styles.errorText}>Finding not found.</Text>
          <Button label="Back to Findings" onPress={() => navigation.goBack()} />
        </Surface>
      </Screen>
    );
  }

  const handleQuickAttach = (imageId: string) => {
    workflow.attachEvidence(finding.id, imageId, `Evidence for ${finding.title}`);
  };

  const isLocalOnly = isLocalOnlyMode() || workflow.aiMode === 'LOCAL_ONLY';

  return (
    <Screen title="Finding Detail">
      <View style={styles.scrollContent}>
        <ValidationModeBanner />
        {/* Header Summary */}
        <Surface style={styles.card}>
          <View style={styles.badgeRow}>
            <Badge severity={finding.severity} />
            <Badge status={finding.status} />
          </View>
          <Text style={styles.title}>{finding.title}</Text>
          <Text style={styles.ruleCitation}>{finding.ruleCitation}</Text>
          <ConfidenceBar score={finding.confidence} label="Detection Confidence" />
        </Surface>

        {/* Special Calibrated Representation for MRP Cross-Source Finding */}
        {isMrpCrossSource ? (
          <Surface style={styles.mrpHighlightCard}>
            <View style={styles.mrpHeader}>
              <Text style={styles.mrpTag}>Demo Cross-Source Fixture</Text>
              <Badge label="Verification: Inspector Review Required" bg="#fee2e2" color="#991b1b" size="sm" />
            </View>

            <View style={styles.comparisonTable}>
              <View style={styles.compCol}>
                <Text style={styles.compLabel}>Physical Package MRP</Text>
                <Text style={styles.compValue}>₹249.00</Text>
                <Text style={styles.compSub}>Printed on back panel</Text>
              </View>
              <View style={styles.compDivider} />
              <View style={styles.compCol}>
                <Text style={styles.compLabel}>Online Listed MRP</Text>
                <Text style={[styles.compValue, { color: '#dc2626' }]}>₹299.00</Text>
                <Text style={styles.compSub}>Demo fixture online record</Text>
              </View>
            </View>

            <View style={styles.deviationBox}>
              <Text style={styles.deviationText}>
                Difference: +₹50.00 (+20.08% online premium)
              </Text>
            </View>

            <Text style={styles.legalNotice}>
              Architectural Invariant: Live e-commerce crawling and automated statutory determination
              are deferred in Phase 4. The inspector retains final decision authority on whether this
              constitutes a violation.
            </Text>
          </Surface>
        ) : (
          <Surface style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Why This Was Flagged</Text>
              <Badge status={finding.status} />
            </View>

            <Text style={styles.descText}>{finding.description}</Text>

            {/* Rule Citation and Direct Rule Library Link */}
            <View style={styles.ruleLinkRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Authoritative Statutory Rule:</Text>
                <Text style={styles.ruleCitationHighlighted}>{finding.ruleCitation}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate('LegalRuleDetail', {
                    ruleId: finding.ruleId || finding.ruleCitation,
                  })
                }
                style={styles.viewRuleBtn}
              >
                <Text style={styles.viewRuleBtnText}>View Rule in Library →</Text>
              </Pressable>
            </View>

            <View style={styles.divider} />

            {finding.actualValue !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Observed Value:</Text>
                <Text style={styles.detailValueBold}>{String(finding.actualValue)}</Text>
              </View>
            )}

            {finding.expectedValue !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Statutory Expectation (GSR 202(E)):</Text>
                <Text style={styles.detailValue}>{String(finding.expectedValue)}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Rule Engine Assessment:</Text>
              <Badge status={finding.status} size="sm" />
            </View>

            {/* AI Advisory Explanation Box (Strictly Advisory) */}
            <View style={styles.advisoryBox}>
              <View style={styles.advisoryHeader}>
                <Text style={styles.advisoryTitle}>
                  {isLocalOnly ? 'DETERMINISTIC STATUTORY EXPLANATION' : 'AI ADVISORY EXPLANATION'}
                </Text>
                <Badge
                  label={isLocalOnly ? 'LOCAL RULE ENGINE' : 'GEMINI 3.5 FLASH'}
                  bg={isLocalOnly ? '#f1f5f9' : '#eff6ff'}
                  color={isLocalOnly ? '#475569' : '#1d4ed8'}
                  size="sm"
                />
              </View>

              <Text style={styles.advisoryBody}>
                {isLocalOnly
                  ? (finding.aiExplanation ||
                    `Observed: ${String(finding.actualValue ?? 'absent')}\nExpected: ${String(finding.expectedValue ?? 'Strict adherence to GSR 202(E) 2011')}\nStatutory Rule Engine: Evaluated deterministically under The Legal Metrology (Packaged Commodities) Rules, 2011.`)
                  : (finding.aiExplanation ||
                    `The declared packaging label value does not satisfy the statutory conditions specified in ${finding.ruleCitation}.`)}
              </Text>

              <Text style={styles.advisoryNotice}>
                Notice: AI explanation is advisory and observational only. It does not modify or override the deterministic rule-engine assessment.
              </Text>

              {isLocalOnly && (
                <Text style={styles.offlineNotice}>
                  • AI cloud explanation unavailable offline. Displaying on-device deterministic explanation.
                </Text>
              )}
            </View>
          </Surface>
        )}

        {/* Evidence Section */}
        <Surface style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Attached Evidence ({attachedEvidence.length})</Text>
            {attachedEvidence.length > 0 && (
              <Badge label="Real Captured Photo Linked ✓" bg="#d1fae5" color="#065f46" size="sm" />
            )}
          </View>

          {attachedEvidence.length === 0 ? (
            <Text style={styles.noEvidenceText}>
              No evidence photos currently linked to this finding.
            </Text>
          ) : (
            attachedEvidence.map((ev) => (
              <View key={ev.id} style={styles.evidenceItem}>
                {ev.fileUrl ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => navigation.navigate('EvidenceViewer', { imageId: ev.id })}
                  >
                    <Image source={{ uri: ev.fileUrl }} style={styles.evidenceThumb} />
                  </Pressable>
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.evidenceTitle}>{ev.title}</Text>
                  <Text style={styles.evidenceMeta}>
                    {new Date(ev.capturedAt).toLocaleTimeString()} · Status: {ev.status}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => navigation.navigate('EvidenceViewer', { imageId: ev.id })}
                    style={{ marginTop: 4 }}
                  >
                    <Text style={{ fontSize: 11, color: '#2563eb', fontWeight: '700' }}>
                      🔍 View in Evidence Heatmap →
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          {/* Quick attach from captured images */}
          {inspectionImages.length > 0 && (
            <View style={styles.attachSection}>
              <Text style={styles.attachHeading}>Quick Link Captured Packaging Photo:</Text>
              <View style={styles.quickAttachRow}>
                {inspectionImages.map((img) => (
                  <Button
                    key={img.id}
                    label={`Link ${img.surface}`}
                    variant="secondary"
                    onPress={() => handleQuickAttach(img.id)}
                  />
                ))}
              </View>
            </View>
          )}
        </Surface>

        {/* Provenance Chain Visualizer */}
        <Surface style={styles.provenanceCard}>
          <Text style={styles.provenanceTitle}>Evidence Provenance Chain</Text>
          <Text style={styles.provenanceDesc}>
            Traceable audit trail connecting this finding to the actual captured physical photograph.
          </Text>
          <View style={styles.provenanceList}>
            <View style={styles.provItem}>
              <Text style={styles.provStepNum}>1</Text>
              <View style={styles.provStepContent}>
                <Text style={styles.provStepTitle}>Simulated Finding</Text>
                <Text style={styles.provStepVal}>{finding.title}</Text>
              </View>
            </View>
            <Text style={styles.provArrow}>↓</Text>
            <View style={styles.provItem}>
              <Text style={styles.provStepNum}>2</Text>
              <View style={styles.provStepContent}>
                <Text style={styles.provStepTitle}>Target Declaration</Text>
                <Text style={styles.provStepVal}>{finding.declarationType || 'MRP'}</Text>
              </View>
            </View>
            <Text style={styles.provArrow}>↓</Text>
            <View style={styles.provItem}>
              <Text style={styles.provStepNum}>3</Text>
              <View style={styles.provStepContent}>
                <Text style={styles.provStepTitle}>Text Region</Text>
                <Text style={styles.provStepVal}>{finding.targetRegionId || 'Detected Region'}</Text>
              </View>
            </View>
            <Text style={styles.provArrow}>↓</Text>
            <View style={styles.provItem}>
              <Text style={styles.provStepNum}>4</Text>
              <View style={styles.provStepContent}>
                <Text style={styles.provStepTitle}>Real Captured Photograph</Text>
                <Text style={styles.provStepVal}>
                  {attachedEvidence[0]?.fileUrl ? attachedEvidence[0].title : 'Awaiting Photo Link'}
                </Text>
              </View>
            </View>
          </View>
        </Surface>

        <View style={styles.bottomActions}>
          <Button
            label="Back to Findings"
            variant="secondary"
            onPress={() => navigation.goBack()}
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
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  ruleCitation: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  descText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
  },
  explanationBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderLeftWidth: 3,
    borderLeftColor: COLOR_TOKENS.primary[500],
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLOR_TOKENS.primary[700],
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  mrpHighlightCard: {
    padding: 16,
    borderColor: '#fca5a5',
    borderWidth: 1.5,
    backgroundColor: '#fffaf0',
  },
  mrpHeader: {
    flexDirection: 'column',
    gap: 6,
    marginBottom: 14,
  },
  mrpTag: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9a3412',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  comparisonTable: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 12,
  },
  compCol: {
    flex: 1,
    alignItems: 'center',
  },
  compDivider: {
    width: 1,
    backgroundColor: '#fed7aa',
    marginHorizontal: 12,
  },
  compLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  compValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  compSub: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
    textAlign: 'center',
  },
  deviationBox: {
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  deviationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991b1b',
  },
  legalNotice: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  noEvidenceText: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  evidenceThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#1f2937',
  },
  evidenceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  evidenceMeta: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  evidenceUri: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  provenanceCard: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  provenanceTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  provenanceDesc: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
    lineHeight: 16,
  },
  provenanceList: {
    gap: 4,
  },
  provItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  provStepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 24,
  },
  provStepContent: {
    flex: 1,
  },
  provStepTitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  provStepVal: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '700',
  },
  provArrow: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '800',
  },
  attachSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  attachHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
    marginBottom: 8,
  },
  quickAttachRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bottomActions: {
    marginTop: 8,
  },
  errorCard: {
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '700',
  },
  ruleLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
    gap: 8,
  },
  ruleCitationHighlighted: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e40af',
    marginTop: 2,
  },
  viewRuleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#2563eb',
    borderRadius: 6,
  },
  viewRuleBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  detailValueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'right',
    flexShrink: 1,
  },
  advisoryBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  advisoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  advisoryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e40af',
    letterSpacing: 0.5,
  },
  advisoryBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
    marginBottom: 8,
  },
  advisoryNotice: {
    fontSize: 10,
    color: '#64748b',
    lineHeight: 14,
    fontStyle: 'italic',
  },
  offlineNotice: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 4,
    fontWeight: '600',
  },
});
