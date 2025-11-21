import FingerprintJS from '@fingerprintjs/fingerprintjs-pro';

// IMPORTANT: Replace with your actual public API key from your FingerprintJS dashboard.
const FPJS_PUBLIC_API_KEY = 'FHm7nbgbid0FrT8lrkxG';

// Cache the FingerprintJS promise to avoid re-initializing on every call.
// This is more efficient than using localStorage and ensures the library is loaded only once.
let fpPromise: Promise<any> | null = null;

const loadFingerprint = () => {
  if (!fpPromise) {
    // Load the FingerprintJS agent
    fpPromise = FingerprintJS.load({ apiKey: FPJS_PUBLIC_API_KEY });
  }
  return fpPromise;
};

/**
 * Retrieves a unique device identifier using the FingerprintJS Pro service.
 * It caches the agent loading promise to ensure high performance on subsequent calls.
 * 
 * @returns {Promise<string>} A promise that resolves with the unique device ID (visitorId).
 */
export const getVisitorId = async (): Promise<string> => {
  if (typeof window === 'undefined') {
    return 'unsupported-env';
  }

  try {
    // Get the FingerprintJS agent instance.
    const fp = await loadFingerprint();

    // Get the visitor identifier.
    const result = await fp.get();
    
    return result.visitorId;
  } catch (error) {
    console.error('FingerprintJS error:', error);
    
    // In case of an error (e.g., ad-blocker, network issue), provide a temporary,
    // non-persistent identifier as a fallback. This ensures the signup flow
    // can still proceed, though with weaker device identification for this session.
    return 'fp-error-' + Date.now() + Math.random().toString(36).substring(2);
  }
};
