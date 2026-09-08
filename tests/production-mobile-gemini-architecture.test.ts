import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeBackendUrl } from '../apps/mobile/src/services/ai/backendUrl';

const mobileRoot = join(process.cwd(), 'apps', 'mobile');

function mobileSource(): string {
  const read = (directory: string): string[] => readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? read(path)
      : /\.(ts|tsx|js)$/.test(entry) ? [readFileSync(path, 'utf8')] : [];
  });
  return read(join(mobileRoot, 'src')).join('\n');
}

describe('Production APK Gemini architecture', () => {
  it('routes mobile AI only to the configured backend and contains no direct Gemini client', () => {
    const source = mobileSource();
    expect(source).not.toContain('generativelanguage.googleapis.com');
    expect(source).not.toContain('callGeminiDirect');
    expect(source).not.toContain('DIRECT_GEMINI');
    expect(existsSync(join(mobileRoot, 'src/services/ai/directGeminiClient.ts'))).toBe(false);
  });

  it('contains no Gemini credential configuration or mobile key storage', () => {
    const source = mobileSource();
    const mobileEnv = readFileSync(join(mobileRoot, '.env'), 'utf8');
    const mobilePackage = readFileSync(join(mobileRoot, 'package.json'), 'utf8');
    expect(source).not.toMatch(/(?<!EXPO_PUBLIC_)GEMINI_API_KEY/);
    expect(source).not.toContain('EXPO_PUBLIC_GEMINI_API_KEY');
    expect(mobileEnv).not.toContain('GEMINI_API_KEY');
    expect(mobilePackage).not.toContain('expo-secure-store');
  });

  it('accepts only an HTTPS hosted backend URL for a production APK', () => {
    expect(normalizeBackendUrl('https://api.lmvision.example/api/v1', false)).toBe('https://api.lmvision.example');
    expect(normalizeBackendUrl('http://10.0.0.25:3001', false)).toBeNull();
    expect(normalizeBackendUrl('http://localhost:3001', false)).toBeNull();
  });

  it('uses SafeAreaView from react-native-safe-area-context', () => {
    const screen = readFileSync(join(mobileRoot, 'src/components/Screen.tsx'), 'utf8');
    expect(screen).toContain("from 'react-native-safe-area-context'");
    expect(screen).not.toMatch(/import\s*\{[^}]*SafeAreaView[^}]*\}\s*from\s*['"]react-native['"]/);
  });
});
