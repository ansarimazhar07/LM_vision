/**
 * Normalises the non-secret API base URL used by the Android client.
 * Release builds may communicate only with a public HTTPS backend.
 */
export function normalizeBackendUrl(configuredUrl: string | undefined, isDevelopment: boolean): string | null {
  if (!configuredUrl) return null;

  try {
    const endpoint = new URL(configuredUrl);
    const isPrivateNetwork =
      endpoint.hostname === 'localhost' ||
      endpoint.hostname === '127.0.0.1' ||
      endpoint.hostname.startsWith('10.') ||
      endpoint.hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(endpoint.hostname);

    if (!isDevelopment && (endpoint.protocol !== 'https:' || isPrivateNetwork)) {
      return null;
    }

    if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') return null;

    // In Android development environment (emulator), localhost resolves to the emulator itself.
    // Automatically map localhost/127.0.0.1 to 10.0.2.2 so it can reach the host computer's backend.
    let isAndroid = false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const RN = require('react-native');
      isAndroid = RN?.Platform?.OS === 'android';
    } catch {
      // test or Node environment
    }

    if (isDevelopment && isAndroid && (endpoint.hostname === 'localhost' || endpoint.hostname === '127.0.0.1')) {
      endpoint.hostname = '10.0.2.2';
    }

    // EXPO_PUBLIC_API_URL is the API base, e.g. https://api.example.gov.in/api/v1.
    return endpoint.toString().replace(/\/$/, '').replace(/\/api\/v1$/, '');
  } catch {
    return null;
  }
}
