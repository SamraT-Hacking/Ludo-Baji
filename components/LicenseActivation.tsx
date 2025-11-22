
import React, { useState } from 'react';
import { LudoLogoSVG } from '../assets/icons';

interface LicenseActivationProps {
    onActivationSuccess: () => void;
    initialError: string | null;
    serverUrl: string;
}

const LicenseActivation: React.FC<LicenseActivationProps> = ({ onActivationSuccess, initialError, serverUrl }) => {
    const [purchaseCode, setPurchaseCode] = useState('');
    // Domain is auto-detected and should ideally be read-only to ensure validity
    const [domain, setDomain] = useState(window.location.hostname || 'localhost'); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(initialError);

    // We allow editing domain only if it's empty (rare) or localhost, otherwise it's safer to lock it
    // But for flexibility in setup, we allow editing but default to hostname
    const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDomain(e.target.value);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        if (!purchaseCode.trim()) {
            setError('Please enter your purchase code.');
            setLoading(false);
            return;
        }

        if (!domain.trim()) {
            setError('Domain is required.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${serverUrl}/api/activate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    purchase_code: purchaseCode.trim(),
                    domain: domain.trim()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Activation failed.');
            }

            // On success, we simply notify the parent App.
            // The App will re-check domain status and unlock.
            // No local token storage needed.
            if (data.active) {
                onActivationSuccess();
            } else {
                throw new Error('Server returned inactive status.');
            }

        } catch (err: any) {
            console.error("Activation Error:", err);
            if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
                setError(`Cannot connect to Licensing Server at ${serverUrl}.`);
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const IconKey = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
        </svg>
    );

    const IconGlobe = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
    );

    return (
        <div className="license-wrapper">
            <div className="auth-container license-container">
                <div className="auth-header">
                    <div className="auth-logo" dangerouslySetInnerHTML={{ __html: LudoLogoSVG(48) }} />
                    <h1>Activate Your Product</h1>
                    <p>One-time activation for <strong>{domain}</strong>. Once active, all users can access the site.</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && (
                        <div className="auth-message error">
                            {error}
                        </div>
                    )}
                    
                    <div className="input-group">
                        <span className="input-icon"><IconKey /></span>
                        <input
                            type="text"
                            placeholder="Your CodeCanyon Purchase Code"
                            value={purchaseCode}
                            onChange={e => setPurchaseCode(e.target.value)}
                            required
                            className="auth-input"
                        />
                    </div>

                    <div className="input-group">
                        <span className="input-icon"><IconGlobe /></span>
                        <input
                            type="text"
                            value={domain}
                            readOnly
                            title="This is auto-detected. Install on the correct domain to proceed."
                            className="auth-input"
                            style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                        />
                    </div>

                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? 'Activating...' : 'Activate License'}
                    </button>
                </form>

                 <div style={{textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem'}}>
                    <p>You can find your purchase code in your CodeCanyon "Downloads" page.</p>
                    <a href="https://codecanyon.net/downloads" target="_blank" rel="noopener noreferrer" style={{color: 'var(--primary-red)'}}>
                        Find My Purchase Code
                    </a>
                </div>
            </div>
        </div>
    );
};

export default LicenseActivation;
