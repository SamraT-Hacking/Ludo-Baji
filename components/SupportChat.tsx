import React from 'react';

const SupportChat: React.FC = () => {
    const pageStyle: React.CSSProperties = { textAlign: 'center', padding: '2rem' };
    const headerStyle: React.CSSProperties = { fontSize: '2rem', marginBottom: '1rem' };
    const textStyle: React.CSSProperties = { fontSize: '1.2rem', color: '#666' };
    return (
        <div style={pageStyle}>
            <h1 style={headerStyle}>Admin Support </h1>
            <p style={textStyle}>Live support chat is coming soon. For now, please contact us at support@dreamludo.com for any assistance.</p>
        </div>
    );
};

export default SupportChat;