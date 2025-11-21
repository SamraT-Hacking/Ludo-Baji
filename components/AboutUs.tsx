
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const AboutUs: React.FC = () => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchContent = async () => {
            if (!supabase) return;
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'content_about_us').single();
            if (data && data.value && (data.value as any).text) {
                setContent((data.value as any).text);
            } else {
                // Fallback text
                setContent("Dream Ludo was created by a team of passionate developers and Ludo enthusiasts who wanted to bring a modern, competitive, and fair gaming experience to players everywhere.\n\nOur mission is to provide a reliable platform for skill-based gaming where players can test their strategies, compete for real prizes, and be part of a vibrant community. We believe in fair play, transparency, and providing excellent support to our users.");
            }
            setLoading(false);
        };
        fetchContent();
    }, []);

    const pageStyle: React.CSSProperties = { lineHeight: 1.6 };
    const headerStyle: React.CSSProperties = { fontSize: '2rem', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' };
    
    return (
        <div style={pageStyle}>
            <h1 style={headerStyle}>About Us</h1>
            {loading ? <p>Loading...</p> : (
                <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
            )}
        </div>
    );
};

export default AboutUs;
