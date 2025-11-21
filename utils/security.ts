import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Get unique device fingerprint
export const getDeviceFingerprint = async (): Promise<string> => {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
};

// Detect incognito mode using the filesystem API heuristic
export const isIncognito = async (): Promise<boolean> => {
    return new Promise((resolve) => {
        try {
            const fs = (window as any).RequestFileSystem || (window as any).webkitRequestFileSystem;
            if (!fs) {
                // Fallback for browsers without the API (e.g., Firefox, modern Safari)
                if (navigator.storage && navigator.storage.estimate) {
                    navigator.storage.estimate().then(({ quota }) => {
                        // Incognito mode often has a much smaller quota. 120MB is a common threshold.
                        resolve(quota ? quota < 120000000 : false);
                    }).catch(() => resolve(false));
                } else {
                    resolve(false); // Fail open if no reliable method found.
                }
                return;
            }
            // FIX: 'TEMPORARY' is a non-standard property on the window object for the deprecated FileSystem API. Cast to 'any' to resolve the TypeScript error.
            fs((window as any).TEMPORARY, 100, () => resolve(false), () => resolve(true));
        } catch (e) {
            resolve(true); // If the API call throws, it's a strong indicator of private mode.
        }
    });
};


// Check for VPN/Proxy using ipinfo.io
export const isVpnOrProxy = async (apiKey: string): Promise<{ isVpn: boolean; error?: string }> => {
    if (!apiKey) {
        return { isVpn: false, error: 'API key is missing.' };
    }
    try {
        const response = await fetch(`https://ipinfo.io/json?token=${apiKey}`);
        if (!response.ok) {
            console.warn('VPN check failed: Could not contact IP info service.');
            return { isVpn: false }; // Fail open (allow signup) if the service is down
        }
        const data = await response.json();
        if (data.privacy) {
            const isVpn = data.privacy.vpn || data.privacy.proxy || data.privacy.hosting;
            return { isVpn };
        }
        return { isVpn: false };
    } catch (error) {
        console.warn('VPN check failed with an error:', error);
        return { isVpn: false }; // Fail open
    }
};