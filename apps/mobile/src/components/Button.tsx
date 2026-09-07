import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type GestureResponderEvent } from 'react-native';
import { COLOR_TOKENS, RADII } from '@lm-vision/ui';

export function Button({ label, onPress, disabled = false, loading = false, variant = 'primary' }: {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'quiet';
}): React.JSX.Element {
  const secondary = variant === 'secondary';
  const quiet = variant === 'quiet';
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || loading }} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [
      styles.button,
      secondary && styles.secondary,
      quiet && styles.quiet,
      (disabled || loading) && styles.disabled,
      pressed && styles.pressed,
    ]}>
      {loading ? <ActivityIndicator color={secondary || quiet ? COLOR_TOKENS.primary[700] : '#ffffff'} /> : <Text numberOfLines={2} style={[styles.label, (secondary || quiet) && styles.secondaryLabel]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 52, borderRadius: RADII.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, backgroundColor: COLOR_TOKENS.primary[700] },
  secondary: { backgroundColor: COLOR_TOKENS.primary[50], borderWidth: 1, borderColor: COLOR_TOKENS.primary[100] },
  quiet: { backgroundColor: 'transparent' },
  label: { color: '#ffffff', fontSize: 16, lineHeight: 21, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  secondaryLabel: { color: COLOR_TOKENS.primary[700] },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.82 },
});
