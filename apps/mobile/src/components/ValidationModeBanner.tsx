import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { isLocalOnlyMode } from '../config';

export function ValidationModeBanner(): React.JSX.Element | null {
  if (!isLocalOnlyMode()) {
    return null;
  }

  return (
    <View accessibilityRole="alert" style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.badge}>VALIDATION</Text>
        <Text style={styles.title}>OFFLINE VALIDATION MODE</Text>
      </View>
      <Text style={styles.subtitle}>No Gemini / No Network / Local Processing Only</Text>
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Mode:</Text>
          <Text style={styles.metricValue}>LOCAL-ONLY VALIDATION</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Network:</Text>
          <Text style={styles.metricValue}>OFFLINE</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Gemini:</Text>
          <Text style={[styles.metricValue, styles.disabledText]}>DISABLED FOR VALIDATION</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#042f2e',
    borderColor: '#0d9488',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    backgroundColor: '#0f766e',
    color: '#ccfbf1',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  title: {
    color: '#f0fdfa',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#99f6e4',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  metricsRow: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 6,
    padding: 8,
    gap: 4,
  },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    color: '#5eead4',
    fontSize: 11,
    fontWeight: '700',
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  disabledText: {
    color: '#fca5a5',
  },
});
