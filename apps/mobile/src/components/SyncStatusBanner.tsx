import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLOR_TOKENS } from '@lm-vision/ui';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';

const COPY = {
  ONLINE: ['Online', 'Cloud services reachable.'],
  OFFLINE: ['Offline', 'Core inspection work remains available locally.'],
  SYNCING: ['Syncing', 'Queued inspection changes are being sent securely.'],
  SYNCED: ['Synced', 'Local changes are confirmed by the server.'],
  SYNC_FAILED: ['Sync failed', 'Your local records are retained; retry when ready.'],
  CONFLICT: ['Sync conflict', 'Review the local and server versions before resolving.'],
} as const;

export function SyncStatusBanner(): React.JSX.Element {
  const { syncSnapshot, syncNow } = useInspectionWorkflow();
  const [title, description] = COPY[syncSnapshot.state];
  const actionable = syncSnapshot.state === 'OFFLINE' || syncSnapshot.state === 'SYNC_FAILED' || syncSnapshot.state === 'CONFLICT' || syncSnapshot.pendingOperations > 0;
  const color = syncSnapshot.state === 'SYNCED' ? '#047857' : syncSnapshot.state === 'CONFLICT' ? '#b91c1c' : syncSnapshot.state === 'SYNC_FAILED' ? '#b45309' : COLOR_TOKENS.primary[700];
  return (
    <View style={[styles.container, { borderColor: `${color}33`, backgroundColor: `${color}0d` }]}>
      <View style={styles.copy}>
        <Text style={[styles.title, { color }]}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {syncSnapshot.pendingOperations > 0 ? <Text style={styles.meta}>{syncSnapshot.pendingOperations} pending operation(s)</Text> : null}
        {syncSnapshot.failedOperations > 0 ? <Text style={styles.meta}>{syncSnapshot.failedOperations} failed operation(s)</Text> : null}
        {syncSnapshot.conflicts > 0 ? <Text style={styles.meta}>{syncSnapshot.conflicts} conflict(s) need review</Text> : null}
      </View>
      {actionable ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Sync now" onPress={() => void syncNow()} style={styles.action}>
          <Text style={[styles.actionText, { color }]}>Sync now</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderRadius: 10 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 12, fontWeight: '800' },
  description: { color: '#475569', fontSize: 11, lineHeight: 15 },
  meta: { color: '#64748b', fontSize: 10, lineHeight: 14 },
  action: { paddingHorizontal: 8, paddingVertical: 6 },
  actionText: { fontSize: 11, fontWeight: '800' },
});
