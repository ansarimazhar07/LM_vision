import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AIExecutionMode } from '../services/ai/aiClientAdapter';

const MODE_COPY: Record<AIExecutionMode, { label: string; bg: string; color: string }> = {
  REAL: { label: 'GEMINI ANALYSIS', bg: '#f3e8ff', color: '#6b21a8' },
  HYBRID: { label: 'HYBRID ANALYSIS', bg: '#dbeafe', color: '#1d4ed8' },
  OFFLINE: { label: 'LOCAL OCR / OFFLINE', bg: '#dcfce7', color: '#166534' },
  DEMO: { label: 'DEMO / MOCK', bg: '#fef3c7', color: '#92400e' },
  LOCAL_ONLY: { label: 'LOCAL OCR / OFFLINE', bg: '#dcfce7', color: '#166534' },
};

export function ProviderBadge({ mode }: { mode: AIExecutionMode }): React.JSX.Element {
  const copy = MODE_COPY[mode];
  return <View accessibilityLabel={`Analysis provider: ${copy.label}`} style={[styles.badge, { backgroundColor: copy.bg }]}><Text style={[styles.text, { color: copy.color }]}>{copy.label}</Text></View>;
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5, maxWidth: '100%' },
  text: { fontSize: 11, lineHeight: 15, fontWeight: '800', letterSpacing: 0.4, flexShrink: 1 },
});
