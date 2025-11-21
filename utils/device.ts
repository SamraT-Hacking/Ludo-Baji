import FingerprintJS from '@fingerprintjs/fingerprintjs-pro';

// IMPORTANT: This is the public API key you provided.
// FIX: Explicitly type as string to prevent TypeScript from inferring a literal type,
// which caused a comparison error on the placeholder check below.
const FPJS_PUBLIC_API_KEY: string = '7O7keYHQxtrFlKHyjPO6';

// Cache the FingerprintJS promise to avoid re-initializing on every call.
// This is more efficient and ensures the library is loaded only once per session.
let fpPromise: Promise<any> | null = null;

const loadFingerprint = () => {
  if (!fpPromise) {
    if (!FPJS_PUBLIC_API_KEY || FPJS_PUBLIC_API_KEY === 'FHm7nbgbid0FrT8lrkxG') {
      console.warn("FingerprintJS API Key is not set or is still the default placeholder. Please update it in utils/device.ts");
      // Return a promise that resolves to null to handle this gracefully
      return Promise.resolve(null);
    }
    // Load the FingerprintJS agent
    fpPromise = FingerprintJS.load({ apiKey: FPJS_PUBLIC_API_KEY });
  }
  return fpPromise;
};

/**
 * Retrieves a unique device identifier using the FingerprintJS Pro service.
 * If it fails, it now throws an error instead of providing a fallback.
 * 
 * @returns {Promise<string>} A promise that resolves with the unique device ID (visitorId).
 * @throws {Error} If device identification fails.
 */
export const getVisitorId = async (): Promise<string> => {
  if (typeof window === 'undefined') {
    // For server-side rendering or non-browser environments, we can't fingerprint.
    // Throwing an error is consistent with the new behavior.
    throw new Error("Device identification is not supported in this environment.");
  }

  try {
    // Get the FingerprintJS agent instance.
    const fp = await loadFingerprint();

    if (!fp) {
      throw new Error("FingerprintJS agent could not be loaded. Please check your API Key configuration.");
    }

    // Get the visitor identifier.
    const result = await fp.get();
    
    return result.visitorId;
  } catch (error) {
    console.error('FingerprintJS error details:', error);
    
    // Throw a user-friendly error that will be caught by the Auth component.
    // This stops the signup process if a unique, persistent device ID cannot be obtained.
    throw new Error("Device identification failed. This may be due to an ad-blocker, network issue, or an invalid API key configuration. Please disable your ad-blocker and try again.");
  }
};
