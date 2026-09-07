import React from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLOR_TOKENS } from '@lm-vision/ui';
import type { RootStackParamList } from '../navigation/types';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import { Screen } from '../components/Screen';
import { Surface } from '../components/Surface';
import { Badge } from '../components/Badge';
import { StateView } from '../components/StateView';
import { SyncStatusBanner } from '../components/SyncStatusBanner';

export function HistoryScreen(): React.JSX.Element {
  const workflow = useInspectionWorkflow();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const inspections = workflow.completedInspections;
  const isLoading = workflow.isLoadingHistory;

  return (
    <Screen
      title="Inspection History"
      contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void workflow.reloadHistory()}
            colors={[COLOR_TOKENS.primary[600]]}
          />
        }
    >
        <Surface style={styles.headerCard}>
          <Text style={styles.title}>Inspection Records</Text>
          <Text style={styles.subtitle}>
            Inspections saved to durable local storage and Supabase cloud ledger.
          </Text>
        </Surface>
        <SyncStatusBanner />

        {inspections.length === 0 ? (
          <StateView
            kind="empty"
            message="No inspection cases saved yet. Complete an inspection to view historical records."
          />
        ) : (
          inspections.map((item) => {
            const decision = item.inspectorDecision;
            const criticalCount = item.findings.filter((f) => f.severity === 'CRITICAL').length;
            const syncLabel = item.syncStatus === 'SYNCED'
              ? 'SYNCED'
              : item.syncStatus === 'SYNC_CONFLICT'
                ? 'SYNC CONFLICT'
                : item.syncStatus === 'SYNC_FAILED'
                  ? 'SYNC FAILED'
                  : item.syncStatus === 'SYNCING'
                    ? 'SYNCING'
                    : item.serverId
                      ? 'SYNCED'
                      : 'PENDING SYNC';
            const syncColor = syncLabel === 'SYNCED' ? '#047857' : syncLabel === 'SYNC CONFLICT' ? '#b91c1c' : syncLabel === 'SYNC FAILED' ? '#b45309' : '#1e40af';

            return (
              <Surface key={item.localId} style={styles.itemCard}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    navigation.navigate('InspectionDetail', { inspectionId: item.localId })
                  }
                  style={styles.pressable}
                >
                  <View style={styles.topRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.productName}>
                        {item.productName || 'Inspected Commodity'}
                      </Text>
                      <Text style={styles.idText}>
                        ID: {item.localId.slice(0, 16)}
                        {item.serverId ? ' · Cloud' : ' · Local'}
                      </Text>
                    </View>
                    <Badge
                      label={decision?.decision || item.status.replaceAll('_', ' ')}
                      bg={decision?.decision === 'COMPLIANT' ? '#dcfce7' : decision ? '#fee2e2' : '#dbeafe'}
                      color={decision?.decision === 'COMPLIANT' ? '#166534' : decision ? '#991b1b' : '#1e40af'}
                    />
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.categoryText}>
                      {item.category} · {item.packageType}
                    </Text>
                    <Text style={styles.dateText}>
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.footerRow}>
                    <Text style={styles.statsText}>
                      {item.findings.length} findings
                      {criticalCount > 0 ? ` (${criticalCount} critical)` : ''}
                      {' · '}
                      {item.evidence.length} evidence
                    </Text>
                    <Badge label={syncLabel} bg={syncLabel === 'SYNCED' ? '#ecfdf5' : '#eff6ff'} color={syncColor} size="sm" />
                    <Text style={styles.viewLink}>View Record →</Text>
                  </View>
                </Pressable>
              </Surface>
            );
          })
        )}
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
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  itemCard: {
    padding: 0,
    overflow: 'hidden',
  },
  pressable: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  idText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
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
  statsText: {
    fontSize: 12,
    color: '#6b7280',
  },
  viewLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLOR_TOKENS.primary[700],
    marginLeft: 'auto',
  },
});
