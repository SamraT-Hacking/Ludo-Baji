

import FingerprintJS from '@fingerprintjs/fingerprintjs-pro';
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

// Cache for settings to avoid repeated DB calls
let securitySettingsCache: { enabled: boolean; apiKey: string } | null = null;

const getSecuritySettings = async (): Promise<{ enabled: boolean; apiKey: string }> => {
    if (securitySettingsCache) {
        return securitySettingsCache;
    }
    if (!supabase) {
        console.warn("Supabase not available in device.ts, defaulting to disabled FingerprintJS.");
        return { enabled: false, apiKey: '' };
    }
    try {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'fingerprintjs_settings').single();
        const settings = (data?.value as any) || { enabled: false, apiKey: '' };
        securitySettingsCache = settings;
        return settings;
    } catch (error) {
        console.error("Failed to fetch security settings:", error);
        return { enabled: false, apiKey: '' };
    }
};

// Cache the FingerprintJS promise to avoid re-initializing on every call.
let fpPromise: Promise<any> | null = null;
let loadedApiKey: string | null = null;

const loadFingerprint = (apiKey: string) => {
  // If promise doesn't exist or if the API key has changed, re-load.
  if (!fpPromise || loadedApiKey !== apiKey) {
    if (!apiKey) {
      console.warn("FingerprintJS API Key is not set.");
      return Promise.resolve(null);
    }
    loadedApiKey = apiKey;
    fpPromise = FingerprintJS.load({ apiKey });
  }
  return fpPromise;
};

/**
 * Retrieves a unique device identifier.
 * Uses FingerprintJS Pro if enabled in admin settings.
 * Otherwise, falls back to a persistent UUID stored in localStorage.
 * 
 * @returns {Promise<string>} A promise that resolves with the unique device ID.
 * @throws {Error} If FingerprintJS is enabled but fails to get an ID.
 */
export const getVisitorId = async (): Promise<string> => {
  if (typeof window === 'undefined') {
    throw new Error("Device identification is not supported in this environment.");
  }
  
  const settings = await getSecuritySettings();

  if (settings.enabled && settings.apiKey) {
      // Use FingerprintJS if enabled
      try {
        const fp = await loadFingerprint(settings.apiKey);
        if (!fp) {
          throw new Error("FINGERPRINT_FAILED");
        }
        const result = await fp.get();
        return result.visitorId;
      } catch (error) {
        console.error('FingerprintJS error:', error);
        // Throw a specific, catchable error message for the UI.
        throw new Error("FINGERPRINT_FAILED");
      }
  } else {
      // Fallback to localStorage UUID if disabled
      console.log("FingerprintJS is disabled by admin. Using localStorage fallback for device ID.");
      const STORAGE_KEY = 'fallback_device_id';
      let deviceId = localStorage.getItem(STORAGE_KEY);
      if (!deviceId) {
          deviceId = uuidv4();
          localStorage.setItem(STORAGE_KEY, deviceId);
      }
      return deviceId;
  }
};