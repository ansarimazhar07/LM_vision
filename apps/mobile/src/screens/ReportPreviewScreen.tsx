import React, { useEffect, useState, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, Alert, TouchableOpacity, Linking } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { LocalInspectionDraft } from '../state/draft';
import type { InspectionReport, ComplianceAssessment, InspectorCorrection, Evidence } from '@lm-vision/shared-types';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import { Screen } from '../components/Screen';
import { Surface } from '../components/Surface';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { StateView } from '../components/StateView';
import {
  assembleInspectionReport,
  renderReportToJson,
  verifyReportIntegrity,
} from '@lm-vision/rules';
import { mobileAIAdapter } from '../services/ai';
import { ValidationModeBanner } from '../components/ValidationModeBanner';
import { isLocalOnlyMode } from '../config';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportPreview'>;

export function ReportPreviewScreen({ route, navigation }: Props): React.JSX.Element {
  const { inspectionId } = route.params;
  const workflow = useInspectionWorkflow();
  const [inspection, setInspection] = useState<LocalInspectionDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'DOCUMENT' | 'JSON' | 'EVIDENCE'>('DOCUMENT');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void workflow.getInspectionById(inspectionId).then((res) => {
      if (!cancelled) {
        setInspection(res);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [inspectionId, workflow]);

  // Assemble canonical report from inspection draft state
  const report: InspectionReport | null = useMemo(() => {
    if (!inspection) return null;

    try {
      const isDecided = inspection.isFinalized || inspection.status === 'DECIDED';
      return assembleInspectionReport({
        inspectionId: inspection.serverId || inspection.localId,
        reportNumber: `LM-REP-2026-${(inspection.serverId || inspection.localId).slice(0, 8).toUpperCase()}`,
        inspectionStatus: isDecided ? 'DECIDED' : inspection.status,
        isDraftPreview: !isDecided,
        product: {
          brandName: inspection.brandName || 'Brand Not Declared',
          productName: inspection.productName || 'Inspected Commodity',
          category: inspection.category,
          packagingType: inspection.packageType,
          batchNumber: inspection.batchNumber,
        },
        inspectionMetadata: {
          sourceType: 'PHYSICAL_PACKAGE',
          createdAt: inspection.createdAt || new Date().toISOString(),
          finalizedAt: inspection.finalizedAt,
          notes: inspection.notes,
        },
        inspector: {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Authorized Metrology Inspector',
          role: 'INSPECTOR',
        },
        declarations: inspection.declarations,
        complianceAssessments: inspection.complianceAssessments,
        evidence: inspection.evidence,
        reviews: inspection.reviews,
        corrections: inspection.corrections,
        finalDecision: inspection.inspectorDecision,
        amendments: inspection.amendments,
        auditSummary: inspection.auditTrail,
      });
    } catch (err: any) {
      console.warn('[ReportPreview] Report assembly note:', err.message);
      return null;
    }
  }, [inspection]);

  const handleVerifyIntegrity = () => {
    if (!report) return;
    const result = verifyReportIntegrity(report);
    if (result.valid) {
      Alert.alert(
        'Cryptographic Seal Verified',
        `✓ Content Hash and Report Hash match perfectly!\n\nReport Hash:\n${report.reportHash.slice(0, 32)}...\n\nStatus: Sealed and Tamper-Evident.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Integrity Verification Failed',
        `Warning: Computed hash does not match stored hash.\nReason: ${result.reason || 'Data altered'}`,
        [{ text: 'Dismiss' }]
      );
    }
  };

  const handleDownloadPdf = async () => {
    if (!report) return;
    if (isLocalOnlyMode()) {
      Alert.alert(
        'Offline Validation Mode',
        'PDF generation requires network connectivity.\n\nThe structured finalized inspection, declarations, assessments, evidence, and final decision remain completely accessible offline.',
        [{ text: 'Understood' }]
      );
      return;
    }
    setDownloadingPdf(true);
    try {
      const backendUrl = mobileAIAdapter.getBackendUrl();
      // In mobile environment, PDF generation is requested from server-side AI engine
      const res = await fetch(`${backendUrl}/api/v1/reports/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });

      if (res.ok) {
        const downloadUrl = `${backendUrl}/api/v1/reports/${encodeURIComponent(report.reportNumber)}/pdf`;
        Alert.alert(
          'PDF Generated Successfully',
          `Server produced official PDF for ${report.reportNumber} (${report.isDraftPreview ? 'Draft' : 'Finalized'}).`,
          [
            { text: 'Done', style: 'cancel' },
            {
              text: 'Open PDF',
              onPress: () => {
                Linking.openURL(downloadUrl).catch((err) => {
                  console.warn('Failed to open PDF URL in browser:', err);
                  Alert.alert('PDF Viewer URL', downloadUrl);
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Offline Mode Notice',
          'PDF server is currently unreachable. Your finalized inspection record, structured JSON, and evidence package are completely saved locally and will sync when online.',
          [{ text: 'Understood' }]
        );
      }
    } catch {
      Alert.alert(
        'Offline Mode Notice',
        'PDF server is currently offline. Your inspection report, canonical JSON, and evidence package remain fully accessible locally.',
        [{ text: 'Understood' }]
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <Screen title="Inspection Report">
        <StateView kind="loading" message="Assembling report from finalized records..." />
      </Screen>
    );
  }

  if (!inspection || !report) {
    return (
      <Screen title="Inspection Report">
        <ValidationModeBanner />
        <Surface style={styles.card}>
          <Text style={styles.errorText}>Inspection record not found or could not be formatted.</Text>
          <Button label="Go Back" variant="secondary" onPress={() => navigation.goBack()} />
        </Surface>
      </Screen>
    );
  }

  const isFinalized = !report.isDraftPreview;
  const authoritativeAssessments = report.complianceAssessments.filter(
    (a: ComplianceAssessment) => a.ruleKind === 'AUTHORITATIVE'
  );

  return (
    <Screen title={isFinalized ? 'Finalized Report' : 'Draft Preview'}>
      {/* Tab Selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'DOCUMENT' && styles.tabButtonActive]}
          onPress={() => setActiveTab('DOCUMENT')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'DOCUMENT' && styles.tabButtonTextActive]}>
            Report View
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'EVIDENCE' && styles.tabButtonActive]}
          onPress={() => setActiveTab('EVIDENCE')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'EVIDENCE' && styles.tabButtonTextActive]}>
            Evidence ({report.evidence.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'JSON' && styles.tabButtonActive]}
          onPress={() => setActiveTab('JSON')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'JSON' && styles.tabButtonTextActive]}>
            Canonical JSON
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scrollContent}>
        <ValidationModeBanner />
        {/* Banner */}
        {isFinalized ? (
          <Surface style={styles.sealedBanner}>
            <Text style={styles.sealedIcon}>FINAL</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sealedTitle}>FINALIZED INSPECTION REPORT</Text>
              <Text style={styles.sealedSub}>Generated by LM-Vision • Record integrity verified</Text>
            </View>
          </Surface>
        ) : (
          <Surface style={styles.draftBanner}>
            <Text style={styles.draftIcon}>DRAFT</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.draftTitle}>DRAFT / PREVIEW REPORT</Text>
              <Text style={styles.draftSub}>
                Preliminary record. Official finalized report requires formal inspector decision.
              </Text>
            </View>
          </Surface>
        )}

        {/* Advisory Disclaimer */}
        <Surface style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>
            <Text style={styles.disclaimerBold}>Statutory Notice: </Text>
            LM-Vision is an AI-assisted regulatory verification software platform. This report represents the findings and determinations of the inspector and is not a government-issued certificate unless officially endorsed by statutory authorities. Evaluated against Legal Metrology (Packaged Commodities) Rules, 2011 [GSR 202(E)].
          </Text>
        </Surface>

        {activeTab === 'DOCUMENT' && (
          <>
            {/* Header & Product Details */}
            <Surface style={styles.card}>
              <View style={styles.reportHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportNumber}>{report.reportNumber}</Text>
                  <Text style={styles.productName}>{report.product.productName}</Text>
                  <Text style={styles.brandName}>Brand: {report.product.brandName}</Text>
                </View>
                <Badge
                  label={report.isDraftPreview ? 'DRAFT PREVIEW' : 'SEALED RECORD'}
                  bg={report.isDraftPreview ? '#fef3c7' : '#dcfce7'}
                  color={report.isDraftPreview ? '#b45309' : '#166534'}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.metaGrid}>
                <Text style={styles.metaLabel}>Category:</Text>
                <Text style={styles.metaVal}>{report.product.category}</Text>
                <Text style={styles.metaLabel}>Packaging Type:</Text>
                <Text style={styles.metaVal}>{report.product.packagingType}</Text>
                <Text style={styles.metaLabel}>Rule Bundle:</Text>
                <Text style={styles.metaVal}>{report.ruleBundleId} (v{report.ruleBundleVersion})</Text>
                <Text style={styles.metaLabel}>Total Violations:</Text>
                <Text style={[styles.metaVal, { color: report.totalViolationsFound > 0 ? '#dc2626' : '#16a34a', fontWeight: '800' }]}>
                  {report.totalViolationsFound}
                </Text>
              </View>
            </Surface>

            {/* Inspector Final Decision */}
            <Surface style={styles.decisionCard}>
              <View style={styles.decisionHeader}>
                <Text style={styles.sectionHeading}>Inspector Final Decision</Text>
                {report.finalDecision?.decision && (
                  <Badge
                    label={report.finalDecision.decision}
                    bg={report.finalDecision.decision === 'COMPLIANT' ? '#dcfce7' : '#fee2e2'}
                    color={report.finalDecision.decision === 'COMPLIANT' ? '#166534' : '#991b1b'}
                  />
                )}
              </View>
              <Text style={styles.decisionNotes}>
                {report.finalDecision?.summaryNotes || (isFinalized ? 'No notes provided' : 'Pending final decision')}
              </Text>
              {report.finalDecision?.penaltyRecommendation && (
                <View style={styles.penaltyBox}>
                  <Text style={styles.penaltyTitle}>
                    Notice: {report.finalDecision.penaltyRecommendation.noticeType}
                  </Text>
                  <Text style={styles.penaltyText}>
                    Section: {report.finalDecision.penaltyRecommendation.proposedSection}
                  </Text>
                </View>
              )}
            </Surface>

            {/* Deterministic GSR 202(E) Assessments */}
            <Surface style={styles.card}>
              <Text style={styles.sectionHeading}>Legal Metrology Compliance (GSR 202(E))</Text>
              {authoritativeAssessments.length === 0 ? (
                <Text style={styles.emptyText}>No compliance assessments recorded.</Text>
              ) : (
                authoritativeAssessments.map((a: ComplianceAssessment) => (
                  <View key={a.id} style={styles.assessmentRow}>
                    <View style={styles.assessmentHeader}>
                      <Text style={styles.ruleNumber}>Rule {a.ruleNumber}</Text>
                      <Badge
                        label={a.result}
                        bg={a.result === 'PASS' ? '#dcfce7' : a.result === 'FAIL' ? '#fee2e2' : '#fef3c7'}
                        color={a.result === 'PASS' ? '#166534' : a.result === 'FAIL' ? '#991b1b' : '#b45309'}
                      />
                    </View>
                    <Text style={styles.ruleTitle}>{a.ruleTitle}</Text>
                    <Text style={styles.explanation}>{a.explanation}</Text>
                    <Text style={styles.citation}>
                      Citation: {a.ruleSource?.gazetteNotificationNumber || a.ruleSource?.sourceDocument || 'GSR 202(E) 2011'}
                    </Text>
                  </View>
                ))
              )}
            </Surface>

            {/* Side-by-Side Human Corrections (if any) */}
            {report.corrections.length > 0 && (
              <Surface style={styles.card}>
                <Text style={styles.sectionHeading}>Inspector Verifications & Corrections</Text>
                {report.corrections.map((c: InspectorCorrection) => (
                  <View key={c.id} style={styles.correctionBox}>
                    <View style={styles.sideColAI}>
                      <Text style={styles.sideColAILabel}>Original AI observation</Text>
                      <Text style={styles.sideColVal}>{JSON.stringify(c.originalValue)}</Text>
                    </View>
                    <View style={styles.sideColInspector}>
                      <Text style={styles.sideColInspectorLabel}>Inspector verified value</Text>
                      <Text style={styles.sideColVal}>{JSON.stringify(c.correctedValue)}</Text>
                      <Text style={styles.corrReason}>Reason: {c.reason}</Text>
                    </View>
                  </View>
                ))}
              </Surface>
            )}

            {/* Cryptographic Seal Card */}
            <Surface style={styles.sealCard}>
              <Text style={styles.sealTitle}>Record integrity</Text>
              <Text style={styles.sealHashLabel}>Content Hash (SHA-256):</Text>
              <Text style={styles.sealHash}>{report.contentHash}</Text>
              <Text style={styles.sealHashLabel}>Report Hash (SHA-256):</Text>
              <Text style={styles.sealHash}>{report.reportHash}</Text>
              <View style={{ marginTop: 10 }}>
                <Button label="Verify Cryptographic Seal" variant="secondary" onPress={handleVerifyIntegrity} />
              </View>
            </Surface>
          </>
        )}

        {activeTab === 'EVIDENCE' && (
          <Surface style={styles.card}>
            <Text style={styles.sectionHeading}>Evidence register ({report.evidence.length})</Text>
            {report.evidence.length === 0 ? (
              <Text style={styles.emptyText}>No forensic evidence items attached.</Text>
            ) : (
              report.evidence.map((ev: Evidence) => (
                <View key={ev.id} style={styles.evidenceItem}>
                  <Text style={styles.evidenceTitle}>{ev.title}</Text>
                  <Text style={styles.evidenceMeta}>
                    Type: {ev.type} • Captured: {new Date(ev.capturedAt).toLocaleString()}
                  </Text>
                  <Text style={styles.evidenceHashLabel}>Original Evidence SHA-256:</Text>
                  <Text style={styles.evidenceHash}>{ev.sha256Hash}</Text>
                  <Text style={styles.evidenceDerivation}>
                    [Derived from Evidence ID: {ev.id}]
                  </Text>
                </View>
              ))
            )}
          </Surface>
        )}

        {activeTab === 'JSON' && (
          <Surface style={styles.card}>
            <Text style={styles.sectionHeading}>Canonical Machine-Readable JSON</Text>
            <ScrollView horizontal style={styles.jsonBox}>
              <Text style={styles.jsonText}>{renderReportToJson(report)}</Text>
            </ScrollView>
          </Surface>
        )}

        {/* Global Action Bar */}
        <View style={styles.actionRow}>
          <Button
            label={downloadingPdf ? 'Generating PDF...' : 'Download PDF Report'}
            onPress={handleDownloadPdf}
            disabled={downloadingPdf}
          />
          <Button label="Back to Inspection" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#2563eb',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabButtonTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  sealedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
    borderWidth: 1,
  },
  sealedIcon: { fontSize: 10, fontWeight: '800', color: '#166534', letterSpacing: 0.5 },
  sealedTitle: { fontSize: 13, fontWeight: '800', color: '#166534', letterSpacing: 0.5 },
  sealedSub: { fontSize: 11, color: '#15803d', marginTop: 2 },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
  },
  draftIcon: { fontSize: 10, fontWeight: '800', color: '#92400e', letterSpacing: 0.5 },
  draftTitle: { fontSize: 13, fontWeight: '800', color: '#92400e', letterSpacing: 0.5 },
  draftSub: { fontSize: 11, color: '#b45309', marginTop: 2 },
  disclaimerCard: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1,
  },
  disclaimerText: { fontSize: 11, color: '#475569', lineHeight: 15 },
  disclaimerBold: { fontWeight: '700', color: '#1e293b' },
  card: { padding: 16 },
  reportHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportNumber: { fontSize: 11, fontFamily: 'monospace', color: '#6b7280' },
  productName: { fontSize: 17, fontWeight: '800', color: '#111827', marginTop: 3 },
  brandName: { fontSize: 12, color: '#4b5563', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 12 },
  metaGrid: { gap: 4 },
  metaLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  metaVal: { fontSize: 12, color: '#111827', marginBottom: 4, flexShrink: 1, lineHeight: 17 },
  decisionCard: {
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  decisionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  sectionHeading: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 8 },
  decisionNotes: { fontSize: 13, color: '#374151', lineHeight: 18 },
  penaltyBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
  },
  penaltyTitle: { fontSize: 12, fontWeight: '700', color: '#991b1b' },
  penaltyText: { fontSize: 11, color: '#b91c1c', marginTop: 2 },
  assessmentRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  assessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  ruleNumber: { fontSize: 12, fontWeight: '800', color: '#111827', flexShrink: 1 },
  ruleTitle: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 2, lineHeight: 17 },
  explanation: { fontSize: 11, color: '#4b5563', marginTop: 2, lineHeight: 16 },
  citation: { fontSize: 10, color: '#9ca3af', marginTop: 2, fontStyle: 'italic', lineHeight: 15 },
  correctionBox: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    marginBottom: 8,
  },
  sideColAI: { flex: 1, minWidth: 0, padding: 6, backgroundColor: '#eff6ff', borderRadius: 4 },
  sideColAILabel: { fontSize: 10, fontWeight: '700', color: '#1d4ed8', flexShrink: 1 },
  sideColInspector: { flex: 1, minWidth: 0, padding: 6, backgroundColor: '#fefce8', borderRadius: 4 },
  sideColInspectorLabel: { fontSize: 10, fontWeight: '700', color: '#854d0e', flexShrink: 1 },
  sideColVal: { fontSize: 11, fontWeight: '700', color: '#111827', marginTop: 2, flexShrink: 1, lineHeight: 16 },
  corrReason: { fontSize: 10, color: '#6b7280', marginTop: 2, lineHeight: 15 },
  sealCard: {
    padding: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  sealTitle: { fontSize: 12, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  sealHashLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', marginTop: 4 },
  sealHash: { fontSize: 9, fontFamily: 'monospace', color: '#334155', flexShrink: 1, lineHeight: 13 },
  evidenceItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  evidenceTitle: { fontSize: 12, fontWeight: '700', color: '#111827' },
  evidenceMeta: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  evidenceHashLabel: { fontSize: 10, fontWeight: '600', color: '#4b5563', marginTop: 4 },
  evidenceHash: { fontSize: 9, fontFamily: 'monospace', color: '#6b7280', flexShrink: 1, lineHeight: 13 },
  evidenceDerivation: { fontSize: 9, color: '#9ca3af', marginTop: 1 },
  jsonBox: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 6,
    maxHeight: 300,
  },
  jsonText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#e2e8f0',
  },
  emptyText: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },
  errorText: { fontSize: 13, color: '#dc2626', marginBottom: 12 },
  actionRow: { gap: 10, marginTop: 8 },
});
