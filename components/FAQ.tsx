
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const FAQ: React.FC = () => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            if (!supabase) return;
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'content_faq').single();
            if (data && data.value && (data.value as any).text) {
                setContent((data.value as any).text);
            } else {
                 // Fallback text
                setContent(`
                    <h3>Q: How do I join a tournament?</h3>
                    <p>Navigate to the "Game" tab from the main menu. You will see a list of upcoming tournaments. Simply click the "JOIN" button on a tournament you wish to enter. Make sure you have enough balance in your wallet for the entry fee.</p>
                    <h3>Q: What happens if there is a dispute?</h3>
                    <p>After a match, both players are required to submit the result. If the results conflict, the match status will change to "UNDER REVIEW". An admin will then look at the evidence provided (like screenshots) and declare a winner.</p>
                    <h3>Q: How can I withdraw my winnings?</h3>
                    <p>You can request a withdrawal from the "My Wallet" page, accessible from the "More" menu. Please note that all withdrawal requests are processed manually and may take some time to complete.</p>
                `);
            }
            setLoading(false);
        };
        fetchContent();
    }, []);

    const pageStyle: React.CSSProperties = { lineHeight: 1.6 };
    const headerStyle: React.CSSProperties = { fontSize: '2rem', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' };

    return (
        <div style={pageStyle}>
            <h1 style={headerStyle}>Frequently Asked Questions</h1>
            {loading ? <p>Loading...</p> : (
                <div dangerouslySetInnerHTML={{ __html: content }} />
            )}
        </div>
    );
};

export default FAQ;
