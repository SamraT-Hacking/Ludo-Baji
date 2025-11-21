
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const PrivacyPolicy: React.FC = () => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchContent = async () => {
            if (!supabase) return;
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'content_privacy_policy').single();
            if (data && data.value && (data.value as any).text) {
                setContent((data.value as any).text);
            } else {
                 // Fallback text
                setContent("Welcome to Dream Ludo. We are committed to protecting your personal information and your right to privacy.\n\n1. Information We Collect\nWe collect personal information that you voluntarily provide to us when you register on the app, express an interest in obtaining information about us or our products and services, when you participate in activities on the app or otherwise when you contact us.\n\n2. How We Use Your Information\nWe use personal information collected via our app for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.");
            }
            setLoading(false);
        };
        fetchContent();
    }, []);

    const pageStyle: React.CSSProperties = { lineHeight: 1.6 };
    const headerStyle: React.CSSProperties = { fontSize: '2rem', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' };
    
    return (
        <div style={pageStyle}>
            <h1 style={headerStyle}>Privacy Policy</h1>
            {loading ? <p>Loading...</p> : (
                <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
            )}
        </div>
    );
};

export default PrivacyPolicy;
