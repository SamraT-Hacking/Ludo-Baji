import React from 'react';
import { useVpnDetection } from '../contexts/VpnDetectionContext';
import { ShieldWarningIconSVG } from '../assets/icons';

const VpnPopup: React.FC = () => {
    const { isVpnDetected } = useVpnDetection();

    if (!isVpnDetected) {
        return null;
    }

    return (
        <div className="vpn-popup-overlay">
            <div className="vpn-popup-content">
                <div className="vpn-popup-icon" dangerouslySetInnerHTML={{ __html: ShieldWarningIconSVG() }} />
                <h1>VPN or Proxy Detected</h1>
                <p>
                    For security reasons and to ensure fair play, using a VPN or proxy service is not permitted.
                    Please disable your VPN and wait for the system to re-verify your connection.
                </p>
                <div className="vpn-rechecking-status">
                    <div className="spinner"></div>
                    <span>Re-checking connection...</span>
                </div>
            </div>
        </div>
    );
};

export default VpnPopup;
