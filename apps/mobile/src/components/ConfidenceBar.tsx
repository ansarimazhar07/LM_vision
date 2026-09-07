import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ConfidenceBarProps {
  score: number; // 0.0 to 1.0
  label?: string;
  showPercent?: boolean;
}

export function ConfidenceBar({
  score,
  label = 'AI Confidence',
  showPercent = true,
}: ConfidenceBarProps): React.JSX.Element {
  const clamped = Math.max(0, Math.min(1, score));
  const percent = Math.round(clamped * 100);

  let barColor = '#ef4444'; // Red < 70%
  if (percent >= 90) {
    barColor = '#10b981'; // Green >= 90%
  } else if (percent >= 70) {
    barColor = '#f59e0b'; // Amber >= 70%
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {showPercent && <Text style={[styles.percent, { color: barColor }]}>{percent}%</Text>}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  percent: {
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
