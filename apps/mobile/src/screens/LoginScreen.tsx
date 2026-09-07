import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Screen, Surface } from '../components/Screen';
import { StateView } from '../components/StateView';
import { useAuth } from '../auth/AuthProvider';
import { getMobileConfig } from '../config';

type AuthViewMode = 'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD';

export function LoginScreen(): React.JSX.Element {
  const { signIn, signUp, signInDemo, resetPassword, status, error, retry, sessionExpired } = useAuth();
  const [mode, setMode] = useState<AuthViewMode>('SIGN_IN');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Local state
  const [localError, setLocalError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const appEnv = getMobileConfig().NEXT_PUBLIC_APP_ENV;

  const handleSignIn = async (): Promise<void> => {
    setLocalError(null);
    setInfoMessage(null);
    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }
    const success = await signIn(email.trim(), password);
    if (!success && !error) {
      setLocalError('Check your credentials and try again.');
    }
  };

  const handleSignUp = async (): Promise<void> => {
    setLocalError(null);
    setInfoMessage(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setLocalError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please re-enter.');
      return;
    }

    const result = await signUp(email.trim(), password, fullName.trim());
    if (result.success) {
      setInfoMessage('Account created! Please check your email to confirm registration or sign in.');
      setMode('SIGN_IN');
      setPassword('');
      setConfirmPassword('');
    } else if (result.error) {
      setLocalError(result.error);
    }
  };

  const handleForgotPassword = async (): Promise<void> => {
    setLocalError(null);
    setInfoMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter your registered email address.');
      return;
    }

    const result = await resetPassword(email.trim());
    if (result.success) {
      setInfoMessage('Password reset instructions have been sent to your email.');
      setMode('SIGN_IN');
    } else if (result.error) {
      setLocalError(result.error);
    }
  };

  const handleDemoSignIn = (): void => {
    setLocalError(null);
    setInfoMessage(null);
    void signInDemo();
  };

  if (status === 'error') {
    return (
      <Screen>
        <StateView kind="error" message="We could not restore your session." actionLabel="Try again" onAction={retry} />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Brand Header */}
        <View style={styles.brand}>
          <Text style={styles.logo}>LM</Text>
          <Text style={styles.title}>LM-Vision Inspector</Text>
          <Text style={styles.subtitle}>Legal Metrology Regulatory Inspection System</Text>
        </View>

        <Surface style={styles.card}>
          {sessionExpired ? (
            <View style={styles.noticeBox}>
              <Text style={styles.notice}>Your session ended. Please sign in again to continue.</Text>
            </View>
          ) : null}

          {/* Mode Switcher Tabs */}
          <View style={styles.tabRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'SIGN_IN' }}
              onPress={() => {
                setMode('SIGN_IN');
                setLocalError(null);
              }}
              style={[styles.tabBtn, mode === 'SIGN_IN' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, mode === 'SIGN_IN' && styles.tabTextActive]}>Sign In</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'SIGN_UP' }}
              onPress={() => {
                setMode('SIGN_UP');
                setLocalError(null);
              }}
              style={[styles.tabBtn, mode === 'SIGN_UP' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, mode === 'SIGN_UP' && styles.tabTextActive]}>Sign Up</Text>
            </Pressable>
          </View>

          {infoMessage ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>✓ {infoMessage}</Text>
            </View>
          ) : null}

          {/* Form Content */}
          {mode === 'SIGN_IN' && (
            <View style={styles.form}>
              <Text style={styles.heading}>Inspector Sign In</Text>
              <Text style={styles.help}>Use your official government / inspector credentials.</Text>

              <Field
                label="Official Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
              />

              <Pressable
                onPress={() => {
                  setMode('FORGOT_PASSWORD');
                  setLocalError(null);
                  setInfoMessage(null);
                }}
                style={styles.forgotLink}
              >
                <Text style={styles.forgotLinkText}>Forgot Password?</Text>
              </Pressable>

              {localError || error ? (
                <Text accessibilityRole="alert" style={styles.error}>{localError ?? error}</Text>
              ) : null}

              <Button label="Sign In" onPress={handleSignIn} loading={status === 'loading'} />
            </View>
          )}

          {mode === 'SIGN_UP' && (
            <View style={styles.form}>
              <Text style={styles.heading}>Register Inspector Account</Text>
              <Text style={styles.help}>Create your field inspector account on the Legal Metrology network.</Text>

              <Field
                label="Full Name & Designation"
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g., Rajesh Kumar (Inspector)"
                autoCapitalize="words"
                autoComplete="name"
              />
              <Field
                label="Official Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <Field
                label="Password (min 8 characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <Field
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />

              {localError || error ? (
                <Text accessibilityRole="alert" style={styles.error}>{localError ?? error}</Text>
              ) : null}

              <Button label="Create Account" onPress={handleSignUp} loading={status === 'loading'} />
            </View>
          )}

          {mode === 'FORGOT_PASSWORD' && (
            <View style={styles.form}>
              <Text style={styles.heading}>Reset Password</Text>
              <Text style={styles.help}>
                Enter your official email address. We will send a secure link to reset your account password.
              </Text>

              <Field
                label="Official Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
              />

              {localError || error ? (
                <Text accessibilityRole="alert" style={styles.error}>{localError ?? error}</Text>
              ) : null}

              <Button label="Send Reset Link" onPress={handleForgotPassword} loading={status === 'loading'} />

              <Pressable
                onPress={() => {
                  setMode('SIGN_IN');
                  setLocalError(null);
                }}
                style={styles.cancelLink}
              >
                <Text style={styles.cancelLinkText}>Back to Sign In</Text>
              </Pressable>
            </View>
          )}

          {/* Demo Mode Card */}
          <View style={styles.demoBox}>
            <View style={styles.demoBadgeRow}>
              <Text style={styles.demoBadge}>DEMO MODE</Text>
              <Text style={styles.demoTitle}>Field Evaluation Access</Text>
            </View>
            <Text style={styles.demoCredential}>
              Launch inspection workspace in simulated local inspector profile without credentials.
            </Text>
            <View style={styles.demoAction}>
              <Button
                label="Continue as Demo Inspector →"
                variant="secondary"
                onPress={handleDemoSignIn}
                loading={status === 'loading'}
              />
            </View>
          </View>
        </Surface>

        <Text style={styles.environment}>
          LM-Vision Field Environment: {appEnv} · 100% Offline Ready
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    paddingVertical: 20,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    color: '#ffffff',
    backgroundColor: '#0f172a',
    overflow: 'hidden',
    borderRadius: 18,
    padding: 18,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    padding: 20,
    borderRadius: 12,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  heading: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  help: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  form: {
    gap: 14,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
  },
  forgotLinkText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelLink: {
    alignSelf: 'center',
    paddingVertical: 6,
    marginTop: 4,
  },
  cancelLinkText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 6,
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  infoText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
  },
  noticeBox: {
    marginBottom: 14,
  },
  notice: {
    color: '#1e40af',
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  environment: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 18,
    fontSize: 12,
  },
  demoBox: {
    marginTop: 20,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  demoBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  demoBadge: {
    backgroundColor: '#047857',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  demoTitle: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13,
  },
  demoCredential: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  demoAction: {
    marginTop: 10,
  },
});
