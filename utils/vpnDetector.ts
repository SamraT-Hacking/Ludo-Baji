
/**
 * Attempts to check VPN status using https://ipwhois.io/
 * @returns {Promise<boolean | null>} A promise that resolves to true/false, or null if the check fails.
 */
const checkWithIpWhois = async (): Promise<boolean | null> => {
    try {
        const response = await fetch('https://ipwhois.io/json/');
        if (!response.ok) {
            console.warn(`ipwhois.io request failed with status: ${response.status}`);
            return null;
        }

        const data = await response.json();

        if (!data.success) {
            console.warn(`ipwhois.io returned an error: ${data.message}`);
            return null;
        }

        const security = data.security;
        if (!security) {
            console.warn("ipwhois.io response did not include security details.");
            return null; // Can't determine status without this object
        }

        // Correctly check for vpn, proxy, or tor flags.
        const isVpn = security.vpn === true || security.proxy === true || security.tor === true;
        console.log(`VPN Check Result (ipwhois.io): VPN=${security.vpn}, Proxy=${security.proxy}, Tor=${security.tor} -> Detected=${isVpn}`);
        return isVpn;

    } catch (error) {
        // This catches network errors, CORS issues, ad-blockers, etc.
        console.warn("ipwhois.io check failed:", error);
        return null;
    }
};

/**
 * Attempts to check VPN status using https://ip-api.com/
 * @returns {Promise<boolean | null>} A promise that resolves to true/false, or null if the check fails.
 */
const checkWithIpApi = async (): Promise<boolean | null> => {
    try {
        // Use HTTPS and specify fields to reduce data transfer.
        const response = await fetch('https://ip-api.com/json/?fields=status,message,proxy,hosting');
        if (!response.ok) {
            console.warn(`ip-api.com request failed with status: ${response.status}`);
            return null;
        }
        const data = await response.json();

        if (data.status !== 'success') {
            console.warn(`ip-api.com returned an error: ${data.message}`);
            return null;
        }

        // `proxy` is a strong indicator of VPN/Proxy.
        // `hosting` indicates a datacenter IP, which is also commonly used for VPNs.
        const isVpn = data.proxy === true || data.hosting === true;
        console.log(`VPN Check Result (ip-api.com): Proxy=${data.proxy}, Hosting=${data.hosting} -> Detected=${isVpn}`);
        return isVpn;

    } catch (error) {
        console.warn("ip-api.com check failed:", error);
        return null;
    }
};


/**
 * Checks if the user is using a VPN or proxy by querying external IP intelligence services sequentially.
 * This provides resilience if one service is blocked or unavailable.
 * 
 * @returns {Promise<boolean>} A promise that resolves to true if a VPN/proxy is detected, false otherwise or if all checks fail.
 */
export const checkVpnStatus = async (): Promise<boolean> => {
    
    // --- Attempt 1: ipwhois.io ---
    const ipWhoisResult = await checkWithIpWhois();
    if (ipWhoisResult !== null) {
        // If the check succeeded (and returned true or false), we have our answer.
        return ipWhoisResult;
    }
    
    // --- Attempt 2: ip-api.com (Fallback) ---
    console.warn("Primary VPN check failed, trying fallback service...");
    const ipApiResult = await checkWithIpApi();
    if (ipApiResult !== null) {
        // If the fallback check succeeded, use its result.
        return ipApiResult;
    }

    // --- Final Fallback ---
    console.error("All VPN detection services failed. This may be caused by an ad-blocker or network issue. Failing safe and allowing connection.");
    // Fail safe: if all APIs fail, don't block the user.
    return false;
};
