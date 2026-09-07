import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';

export type StateKind = 'loading' | 'error' | 'empty' | 'success';
const titles: Record<StateKind, string> = { loading: 'Loading', error: 'Something went wrong', empty: 'Nothing here yet', success: 'Ready' };

export function StateView({ kind, message, actionLabel, onAction }: {
  kind: StateKind;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}): React.JSX.Element {
  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      <Text style={styles.title}>{titles[kind]}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  title: { color: '#0f172a', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  message: { color: '#64748b', fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
