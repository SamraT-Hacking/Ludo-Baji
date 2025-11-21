
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const TermsAndConditions: React.FC = () => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchContent = async () => {
            if (!supabase) return;
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'content_terms').single();
            if (data && data.value && (data.value as any).text) {
                setContent((data.value as any).text);
            } else {
                // Fallback text
                setContent("Please read these terms and conditions carefully before using Our Service.\n\n1. Accounts\nWhen you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.\n\n2. Termination\nWe may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.");
            }
            setLoading(false);
        };
        fetchContent();
    }, []);

    const pageStyle: React.CSSProperties = { lineHeight: 1.6 };
    const headerStyle: React.CSSProperties = { fontSize: '2rem', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' };
    
    return (
        <div style={pageStyle}>
            <h1 style={headerStyle}>Terms & Conditions</h1>
            {loading ? <p>Loading...</p> : (
                 <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
            )}
        </div>
    );
};

export default TermsAndConditions;
