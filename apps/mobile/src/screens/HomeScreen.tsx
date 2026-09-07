import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Screen, Surface } from '../components/Screen';
import { Badge } from '../components/Badge';
import { ProviderBadge } from '../components/ProviderBadge';
import { SyncStatusBanner } from '../components/SyncStatusBanner';
import { ValidationModeBanner } from '../components/ValidationModeBanner';
import { useAuth } from '../auth/AuthProvider';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

export function HomeScreen(): React.JSX.Element {
  const { authUser, isDemoMode } = useAuth();
  const workflow = useInspectionWorkflow();

  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const name = authUser?.user_metadata?.full_name ?? (isDemoMode ? 'Demo Inspector' : 'Inspector');
  const draft = workflow.activeDraft;
  const history = workflow.completedInspections;

  // --------------------------------------------------------------------------
  // Dynamic Dashboard Metrics (Computed from real active application state)
  // --------------------------------------------------------------------------
  const metrics = useMemo(() => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    const activeCount = draft ? 1 : 0;

    const pendingReviews = history.filter(
      (item) => item.status === 'REVIEW_REQUIRED' || item.status === 'ANALYZED'
    ).length + (draft?.status === 'REVIEW_REQUIRED' || draft?.status === 'ANALYZED' ? 1 : 0);

    const finalizedInspections = history.filter(
      (item) => item.status === 'DECIDED' || item.status === 'SYNCED'
    ).length;

    const todayInspections = history.filter((item) => {
      const ts = item.updatedAt || item.createdAt;
      const itemTime = ts ? new Date(ts).getTime() : 0;
      return itemTime >= twentyFourHoursAgo;
    }).length + (draft ? 1 : 0);

    // Aggregate compliance assessments across active draft + completed items
    let failedAssessmentsCount = 0;
    let verifyAssessmentsCount = 0;

    if (draft?.complianceAssessments) {
      failedAssessmentsCount += draft.complianceAssessments.filter((a) => a.result === 'FAIL').length;
      verifyAssessmentsCount += draft.complianceAssessments.filter((a) => a.result === 'REQUIRES_VERIFICATION').length;
    }

    history.forEach((h) => {
      if (h.complianceAssessments) {
        failedAssessmentsCount += h.complianceAssessments.filter((a) => a.result === 'FAIL').length;
        verifyAssessmentsCount += h.complianceAssessments.filter((a) => a.result === 'REQUIRES_VERIFICATION').length;
      }
    });

    const syncPendingCount = history.filter(
      (h) => h.syncStatus === 'PENDING_SYNC' || h.syncStatus === 'LOCAL_ONLY'
    ).length + (draft && draft.syncStatus === 'PENDING_SYNC' ? 1 : 0);

    const hasConflicts = workflow.syncSnapshot.conflicts > 0 || workflow.syncSnapshot.failedOperations > 0 || workflow.syncSnapshot.state === 'CONFLICT';

    return {
      activeCount,
      pendingReviews,
      finalizedInspections,
      todayInspections,
      failedAssessmentsCount,
      verifyAssessmentsCount,
      syncPendingCount,
      hasConflicts,
    };
  }, [draft, history, workflow.syncSnapshot]);

  const recentInspections = useMemo(() => {
    return [...history].slice(0, 4);
  }, [history]);

  const handleContinueDraft = () => {
    if (!draft) return;
    if (draft.images.length === 0) {
      rootNavigation.navigate('CameraCapture');
    } else if (draft.status === 'DRAFT') {
      rootNavigation.navigate('AIProcessing');
    } else {
      rootNavigation.navigate('InspectionResult');
    }
  };

  return (
    <Screen title="Home">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ValidationModeBanner />

        {/* Inspector Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>LEGAL METROLOGY FIELD WORKSPACE</Text>
          <Text style={styles.title}>Good day, {name}</Text>
          <Text style={styles.subtitle}>
            Packaged Commodities Rules (GSR 202(E) 2011) Regulatory Enforcement
          </Text>

          <View style={styles.statusRow}>
            <ProviderBadge mode={workflow.aiMode} />
            <Badge
              label={isDemoMode ? 'DEMO MODE' : 'OFFICIAL WORKSPACE'}
              bg={isDemoMode ? '#fef3c7' : '#ecfdf5'}
              color={isDemoMode ? '#b45309' : '#047857'}
              size="sm"
            />
          </View>
        </View>

        <SyncStatusBanner />

        {/* AI Vision Engine Mode Card */}
        <Surface style={styles.engineCard}>
          <View style={styles.engineCardHeader}>
            <Text style={styles.engineTitle}>AI Vision Engine Mode</Text>
            <Badge
              label={workflow.aiMode === 'REAL' ? 'CLOUD AI' : '100% OFFLINE'}
              bg={workflow.aiMode === 'REAL' ? '#eff6ff' : '#ecfdf5'}
              color={workflow.aiMode === 'REAL' ? '#1d4ed8' : '#047857'}
              size="sm"
            />
          </View>
          <Text style={styles.engineDesc}>
            {workflow.aiMode === 'REAL'
              ? 'Active: Google Gemini 3.5 Flash Multimodal Vision (High Accuracy Cloud Processing)'
              : 'Active: On-Device Perception & GSR 202(E) Rules (Zero Network / Airplane Mode)'}
          </Text>
          <View style={styles.engineBtnRow}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: workflow.aiMode === 'REAL' }}
              onPress={() => workflow.setAiMode('REAL')}
              style={[styles.engineOption, workflow.aiMode === 'REAL' && styles.engineOptionActive]}
            >
              <Text style={[styles.engineOptionTitle, workflow.aiMode === 'REAL' && styles.engineOptionTitleActive]}>
                ⚡ Gemini 3.5 Flash (Cloud)
              </Text>
              <Text style={styles.engineOptionSubtitle}>
                Multimodal declaration extraction
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: workflow.aiMode === 'LOCAL_ONLY' || workflow.aiMode === 'OFFLINE' }}
              onPress={() => workflow.setAiMode('LOCAL_ONLY')}
              style={[
                styles.engineOption,
                (workflow.aiMode === 'LOCAL_ONLY' || workflow.aiMode === 'OFFLINE') && styles.engineOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.engineOptionTitle,
                  (workflow.aiMode === 'LOCAL_ONLY' || workflow.aiMode === 'OFFLINE') && styles.engineOptionTitleActive,
                ]}
              >
                📴 Local Offline Only
              </Text>
              <Text style={styles.engineOptionSubtitle}>
                100% On-device validation
              </Text>
            </Pressable>
          </View>
        </Surface>

        {/* Dynamic Operational Metrics Dashboard */}
        <Surface style={styles.metricsCard}>
          <Text style={styles.sectionHeader}>Operational Dashboard</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{metrics.activeCount}</Text>
              <Text style={styles.metricLabel}>Active Draft</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: metrics.pendingReviews > 0 ? '#b45309' : '#0f172a' }]}>
                {metrics.pendingReviews}
              </Text>
              <Text style={styles.metricLabel}>Pending Review</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{metrics.todayInspections}</Text>
              <Text style={styles.metricLabel}>Today's Cases</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: '#15803d' }]}>{metrics.finalizedInspections}</Text>
              <Text style={styles.metricLabel}>Finalized</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Compliance & Sync Health Indicators */}
          <View style={styles.subMetricsRow}>
            <View style={styles.subMetric}>
              <Text style={styles.subMetricLabel}>Statutory Violations:</Text>
              <Badge
                label={`${metrics.failedAssessmentsCount} flagged`}
                bg={metrics.failedAssessmentsCount > 0 ? '#fee2e2' : '#f0fdf4'}
                color={metrics.failedAssessmentsCount > 0 ? '#991b1b' : '#166534'}
                size="sm"
              />
            </View>
            <View style={styles.subMetric}>
              <Text style={styles.subMetricLabel}>Pending Sync:</Text>
              <Badge
                label={`${metrics.syncPendingCount} items`}
                bg={metrics.syncPendingCount > 0 ? '#eff6ff' : '#f8fafc'}
                color={metrics.syncPendingCount > 0 ? '#1e40af' : '#64748b'}
                size="sm"
              />
            </View>
          </View>
        </Surface>

        {/* Quick Actions Panel */}
        <Surface style={styles.quickActionsCard}>
          <Text style={styles.sectionHeader}>Quick Actions</Text>
          <View style={styles.actionButtonsGrid}>
            <Pressable
              onPress={() => tabNavigation.navigate('NewInspection')}
              style={[styles.quickActionBtn, styles.primaryActionBtn]}
            >
              <Text style={styles.quickActionIcon}>➕</Text>
              <Text style={styles.quickActionTitlePrimary}>New Inspection</Text>
              <Text style={styles.quickActionDescPrimary}>Start physical package verify</Text>
            </Pressable>

            <Pressable
              onPress={() => rootNavigation.navigate('CameraCapture')}
              style={styles.quickActionBtn}
            >
              <Text style={styles.quickActionIcon}>📷</Text>
              <Text style={styles.quickActionTitle}>Scan Package</Text>
              <Text style={styles.quickActionDesc}>Direct camera evidence</Text>
            </Pressable>

            <Pressable
              onPress={() => rootNavigation.navigate('RuleLibrary')}
              style={styles.quickActionBtn}
            >
              <Text style={styles.quickActionIcon}>⚖️</Text>
              <Text style={styles.quickActionTitle}>Rules Library</Text>
              <Text style={styles.quickActionDesc}>GSR 202(E) Statutory corpus</Text>
            </Pressable>

            <Pressable
              onPress={() => tabNavigation.navigate('History')}
              style={styles.quickActionBtn}
            >
              <Text style={styles.quickActionIcon}>📋</Text>
              <Text style={styles.quickActionTitle}>Inspections & Reports</Text>
              <Text style={styles.quickActionDesc}>Case log & PDF preview</Text>
            </Pressable>
          </View>
        </Surface>

        {/* In-Progress Active Draft Card */}
        {draft ? (
          <Surface style={styles.draftCard}>
            <View style={styles.draftHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.draftEyebrow}>CURRENT IN-PROGRESS INSPECTION</Text>
                <Text style={styles.draftTitle}>
                  {draft.productName || 'Inspected Commodity'}
                </Text>
                <Text style={styles.draftSub}>
                  {draft.category || 'Commodity'} · {draft.packageType || 'Standard Package'}
                </Text>
              </View>
              <Badge label={draft.status} bg="#dbeafe" color="#1e40af" size="sm" />
            </View>

            <View style={styles.draftStatsRow}>
              <Text style={styles.draftStat}>📸 {draft.images.length} photos</Text>
              <Text style={styles.draftStat}>🔍 {draft.declarations.length} declarations</Text>
              <Text style={styles.draftStat}>⚠️ {draft.findings.length} findings</Text>
            </View>

            <View style={{ marginTop: 12 }}>
              <Button
                label="Resume Inspection →"
                onPress={handleContinueDraft}
              />
            </View>
          </Surface>
        ) : null}

        {/* Recent Inspections Log */}
        <Surface style={styles.recentCard}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionHeader}>Recent Inspection Cases</Text>
            <Pressable onPress={() => tabNavigation.navigate('History')}>
              <Text style={styles.viewAllLink}>View All →</Text>
            </Pressable>
          </View>

          {recentInspections.length === 0 ? (
            <View style={styles.emptyRecent}>
              <Text style={styles.emptyRecentIcon}>📦</Text>
              <Text style={styles.emptyRecentTitle}>No Prior Completed Cases</Text>
              <Text style={styles.emptyRecentText}>
                Completed inspections will be cryptographically registered and listed here.
              </Text>
            </View>
          ) : (
            recentInspections.map((item) => (
              <Pressable
                key={item.localId}
                accessibilityRole="button"
                onPress={() => rootNavigation.navigate('InspectionDetail', { inspectionId: item.localId })}
                style={styles.recentItem}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentName}>{item.productName || 'Packaged Commodity'}</Text>
                  <Text style={styles.recentMeta}>
                    {new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleDateString()} · {item.findings.length} findings · {item.images.length} photos
                  </Text>
                </View>
                <Badge
                  label={item.inspectorDecision?.decision || item.status}
                  bg={
                    item.inspectorDecision?.decision === 'COMPLIANT'
                      ? '#dcfce7'
                      : item.inspectorDecision?.decision === 'NON_COMPLIANT'
                      ? '#fee2e2'
                      : '#dbeafe'
                  }
                  color={
                    item.inspectorDecision?.decision === 'COMPLIANT'
                      ? '#166534'
                      : item.inspectorDecision?.decision === 'NON_COMPLIANT'
                      ? '#991b1b'
                      : '#1e40af'
                  }
                  size="sm"
                />
              </Pressable>
            ))
          )}
        </Surface>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    marginBottom: 14,
  },
  eyebrow: {
    color: '#4338ca',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  engineCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  engineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  engineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  engineDesc: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
    lineHeight: 16,
  },
  engineBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  engineOption: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  engineOptionActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  engineOptionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  engineOptionTitleActive: {
    color: '#1e40af',
    fontWeight: '800',
  },
  engineOptionSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  metricsCard: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 14,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  subMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  subMetric: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subMetricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  quickActionsCard: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 14,
  },
  actionButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionBtn: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  primaryActionBtn: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  quickActionIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  quickActionTitlePrimary: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  quickActionDesc: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  quickActionDescPrimary: {
    fontSize: 10,
    color: '#3b82f6',
    marginTop: 2,
  },
  draftCard: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 14,
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1.5,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  draftEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  draftTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  draftSub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  draftStatsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
  },
  draftStat: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  recentCard: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 14,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  emptyRecent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyRecentIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyRecentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  emptyRecentText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  recentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  recentMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
