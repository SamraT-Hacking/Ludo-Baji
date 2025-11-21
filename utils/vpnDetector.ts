/**
 * Checks if the user is using a VPN or proxy by querying an external IP intelligence service.
 * This is a client-side check and may not be 100% accurate.
 * 
 * @returns {Promise<boolean>} A promise that resolves to true if a VPN/proxy is detected, false otherwise.
 */
export const checkVpnStatus = async (): Promise<boolean> => {
    try {
        // Using ipwhois.io as an alternative to ip-api.com to resolve potential fetch/CORS issues.
        // This is a free, keyless service that provides security information.
        const response = await fetch('https://ipwhois.io/json/');
        
        if (!response.ok) {
            console.error(`VPN Check API request failed with status: ${response.status}`);
            return false; // Fail safe: if the API fails, don't block the user.
        }

        const data = await response.json();

        if (!data.success) {
            console.error(`VPN Check API returned an error: ${data.message}`);
            return false; // Fail safe
        }

        // The 'security' object contains flags for VPN, proxy, and TOR.
        const security = data.security;
        if (!security) {
            console.warn("VPN Check API response did not include security details.");
            return false;
        }

        const isVpn = security.is_vpn === true || security.is_proxy === true || security.is_tor === true;
        console.log(`VPN Check Result (ipwhois.io): VPN=${security.is_vpn}, Proxy=${security.is_proxy}, Tor=${security.is_tor} -> Detected=${isVpn}`);
        return isVpn;

    } catch (error) {
        console.error("An error occurred during the individual VPN check:", error);
        return false; // Fail safe on any exception (e.g., network error, ad-blocker).
    }
};
