import React from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps } from 'react-native';

export function Field({ label, ...props }: TextInputProps & { label: string }): React.JSX.Element {
  return (
    <React.Fragment>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} style={[styles.input, props.style]} placeholderTextColor="#64748b" />
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  label: { color: '#334155', fontSize: 14, fontWeight: '700', marginBottom: -8 },
  input: { minHeight: 52, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 14, color: '#0f172a', backgroundColor: '#ffffff', fontSize: 16 },
});
