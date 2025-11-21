import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { checkVpnStatus } from '../utils/vpnDetector';

interface VpnDetectionContextType {
    isVpnDetected: boolean;
    isChecking: boolean;
}

const VpnDetectionContext = createContext<VpnDetectionContextType | undefined>(undefined);

export const VpnDetectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isVpnDetected, setIsVpnDetected] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    const checkStatus = useCallback(async () => {
        // Don't set isChecking to true here to avoid showing the spinner on every periodic check,
        // only on the initial load. The user will see the spinner in the popup itself.
        try {
            const vpnResult = await checkVpnStatus();
            setIsVpnDetected(vpnResult);
        } catch (error) {
            console.error("VPN check failed in provider:", error);
            setIsVpnDetected(false); // Fail safe - don't block the user if the check fails.
        } finally {
            if (isChecking) { // Only set checking to false after the very first check.
                setIsChecking(false);
            }
        }
    }, [isChecking]);

    useEffect(() => {
        // Initial check on component mount
        checkStatus();

        // Set up an interval to periodically re-check the connection status.
        // 30 seconds is a reasonable balance between real-time detection and API usage.
        const interval = setInterval(checkStatus, 30000);

        // Clean up the interval when the component unmounts.
        return () => clearInterval(interval);
    }, [checkStatus]);

    return (
        <VpnDetectionContext.Provider value={{ isVpnDetected, isChecking }}>
            {children}
        </VpnDetectionContext.Provider>
    );
};

export const useVpnDetection = () => {
    const context = useContext(VpnDetectionContext);
    if (!context) {
        throw new Error("useVpnDetection must be used within a VpnDetectionProvider");
    }
    return context;
};
