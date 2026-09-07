import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { STATUS_BADGE_MAP, SEVERITY_BADGE_MAP } from '@lm-vision/ui';
import type { FindingStatus, Severity } from '@lm-vision/shared-types';

interface BadgeProps {
  status?: FindingStatus;
  severity?: Severity;
  label?: string;
  color?: string;
  bg?: string;
  size?: 'sm' | 'md';
}

export function Badge({
  status,
  severity,
  label: customLabel,
  color: customColor,
  bg: customBg,
  size = 'md',
}: BadgeProps): React.JSX.Element {
  let label = customLabel || '';
  let color = customColor || '#374151';
  let bg = customBg || '#f3f4f6';

  if (status && STATUS_BADGE_MAP[status]) {
    label = STATUS_BADGE_MAP[status].label;
    color = STATUS_BADGE_MAP[status].color;
    bg = STATUS_BADGE_MAP[status].bg;
  } else if (severity && SEVERITY_BADGE_MAP[severity]) {
    label = SEVERITY_BADGE_MAP[severity].label;
    color = SEVERITY_BADGE_MAP[severity].color;
    bg = SEVERITY_BADGE_MAP[severity].bg;
  }

  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: bg }, isSmall && styles.badgeSm]}>
      <Text style={[styles.text, { color }, isSmall && styles.textSm]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    flexShrink: 1,
    textAlign: 'center',
  },
  textSm: {
    fontSize: 11,
    fontWeight: '600',
  },
});
