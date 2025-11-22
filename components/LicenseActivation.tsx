import React, { useState } from 'react';
import { LudoLogoSVG } from '../assets/icons';

interface LicenseActivationProps {
    onActivationSuccess: () => void;
    initialError: string | null;
    serverUrl: string;
}

const LicenseActivation: React.FC<LicenseActivationProps> = ({ onActivationSuccess, initialError, serverUrl }) => {
    const [purchaseCode, setPurchaseCode] = useState('');
    // Default to current hostname, but allow user to edit it
    const [domain, setDomain] = useState(window.location.hostname || ''); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(initialError);

    const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Sanitize domain input to prevent common user errors
        const sanitized = e.target.value
            .toLowerCase()
            .replace(/^https?:\/\//, '') // Remove http/https
            .replace(/\/$/, ''); // Remove trailing slash
        setDomain(sanitized);
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
            setError('Please enter the domain where this product is installed.');
            setLoading(false);
            return;
        }

        try {
            // Attempt to connect to the server
            const response = await fetch(`${serverUrl}/api/activate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    purchase_code: purchaseCode,
                    domain: domain.trim() // Send the sanitized domain
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'An unknown error occurred.');
            }

            // The server now ALWAYS returns a valid token on success (new or re-issued).
            if (data.license_token) {
                localStorage.setItem('license_token', data.license_token);
                onActivationSuccess();
            } else {
                throw new Error('Server did not return a valid license token.');
            }

        } catch (err: any) {
            console.error("License Activation Error:", err);
            
            // Provide specific help for "Failed to fetch" (Network Error)
            if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
                setError(`Cannot connect to Licensing Server at ${serverUrl}. Please ensure the server is running and accessible.`);
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
                    <p>Please enter your CodeCanyon purchase code and domain to activate.</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && (
                        <div className="auth-message error">
                            {error}
                            {error.includes('Cannot connect') && (
                                <div style={{fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'left'}}>
                                    <strong>Troubleshooting:</strong><br/>
                                    1. Open <code>licensing_server</code> folder terminal.<br/>
                                    2. Run <code>npm start</code>.<br/>
                                    3. Check if <code>LICENSE_SERVER_URL</code> in <code>App.tsx</code> matches the server URL.
                                </div>
                            )}
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
                            placeholder="Domain (e.g. yoursite.com)"
                            value={domain}
                            onChange={handleDomainChange}
                            required
                            className="auth-input"
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