
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { supabase } from './supabase';
import { SecurityConfig } from '../types';

// Initialize FingerprintJS agent once
const fpPromise = FingerprintJS.load();

export const getDeviceFingerprint = async (): Promise<string> => {
    const fp = await fpPromise;
    const result = await fp.get();
    return result.visitorId;
};

export const checkIncognitoMode = async (): Promise<boolean> => {
    // Heuristic check for Private/Incognito modes
    // Note: This is a cat-and-mouse game. Browsers try to hide this status.
    // Using Storage Quota estimation is a common method.
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        const { quota } = await navigator.storage.estimate();
        if (quota && quota < 120000000) { // < 120MB is suspicious for Chrome/Firefox private
            return true;
        }
    }
    return false;
};

export const checkVPN = async (apiKey?: string): Promise<boolean> => {
    // Without a backend proxy or a paid API key exposed securely, 
    // client-side VPN checks are limited.
    // This implementation uses a placeholder or a provided API key for ipinfo.io if available.
    
    if (!apiKey) return false; // Cannot check without service

    try {
        const response = await fetch(`https://ipinfo.io/json?token=${apiKey}`);
        const data = await response.json();
        
        // Basic check: usually hosting providers or non-residential ISPs are flagged
        // Note: A real VPN detection API (like IPQualityScore) is better but requires payment.
        // This is a basic implementation.
        
        // Example logic if using a service that returns privacy flags
        if (data.privacy?.vpn || data.privacy?.proxy || data.privacy?.tor) {
            return true;
        }
        
        // Fallback check on organization (often VPNs use datacenter orgs)
        const org = (data.org || '').toLowerCase();
        const suspiciousKeywords = ['vpn', 'hosting', 'datacenter', 'cloud', 'digitalocean', 'aws', 'google'];
        if (suspiciousKeywords.some(keyword => org.includes(keyword))) {
            return true;
        }

        return false;
    } catch (e) {
        console.error("VPN check failed", e);
        return false; // Fail open to avoid blocking legitimate users on error
    }
};

export const getSecurityConfig = async (): Promise<SecurityConfig> => {
    if (!supabase) throw new Error("Supabase not initialized");
    
    const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'security_config')
        .single();
        
    const defaultConfig: SecurityConfig = {
        device_fingerprint: true,
        ip_signup_limit: true,
        vpn_detection: false,
        incognito_block: false,
        one_account_per_device: false,
        max_signups_per_ip: 3,
        secure_session_storage: false
    };

    if (data && data.value) {
        return { ...defaultConfig, ...data.value };
    }
    return defaultConfig;
};

export const performSecurityChecks = async (type: 'signup' | 'login' | 'general'): Promise<{ allowed: boolean, reason?: string }> => {
    try {
        const config = await getSecurityConfig();
        
        // 1. Incognito Check
        if (config.incognito_block) {
            const isIncognito = await checkIncognitoMode();
            if (isIncognito) return { allowed: false, reason: "Private/Incognito mode is not allowed." };
        }

        // 2. VPN Check
        if (config.vpn_detection) {
            const isVPN = await checkVPN(config.vpn_api_key);
            if (isVPN) return { allowed: false, reason: "VPN or Proxy connections are not allowed." };
        }

        // 3. Device Fingerprint uniqueness (Logic handled during auth action via RPC usually, but preliminary check here)
        const deviceId = await getDeviceFingerprint();
        if (!deviceId) return { allowed: false, reason: "Could not identify device." };

        return { allowed: true };
    } catch (e) {
        console.error("Security check error:", e);
        // Default to allow if checks fail due to network, to prevent lockout, unless critical
        return { allowed: true }; 
    }
};
