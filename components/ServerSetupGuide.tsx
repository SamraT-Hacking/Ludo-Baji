
import React, { useState } from 'react';
import { CopyIconSVG } from '../assets/icons';

interface ServerSetupGuideProps {
    error: string | null;
    onDismiss: () => void;
}

const ServerSetupGuide: React.FC<ServerSetupGuideProps> = ({ error, onDismiss }) => {
    const [copied, setCopied] = useState(false);

    // Styles
    const pageStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: '1.5rem',
        backgroundColor: '#fff',
        color: '#333',
        overflowY: 'auto',
        zIndex: 2000,
    };
    const headerStyle: React.CSSProperties = { fontSize: '1.8rem', color: '#e71e54', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem', marginBottom: '1rem' };
    const subHeaderStyle: React.CSSProperties = { fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' };
    const codeBlockStyle: React.CSSProperties = { backgroundColor: '#f4f4f4', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem', border: '1px solid #ddd', maxHeight: '400px', overflowY: 'auto', position: 'relative' };
    const buttonStyle: React.CSSProperties = { padding: '0.8rem 1.5rem', cursor: 'pointer', backgroundColor: '#e71e54', color: 'white', border: 'none', borderRadius: '4px', marginTop: '1rem', fontSize: '1rem' };
    const errorBoxStyle: React.CSSProperties = { backgroundColor: '#ffebee', border: '1px solid #e57373', color: '#c62828', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' };
    const copyBtnStyle: React.CSSProperties = { position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer' };

    const serverInstructions = `
/* SERVER SETUP INSTRUCTIONS */

// 1. Ensure you have the server code (server.js and game.js) in a 'dream-ludo-server' directory.
// 2. Create a .env file in that directory with:
//    PORT=8080
//    SUPABASE_URL=your_supabase_url
//    SUPABASE_ANON_KEY=your_supabase_anon_key
//    SUPABASE_SERVICE_KEY=your_supabase_service_role_key
// 3. Install dependencies:
//    npm install express ws dotenv @supabase/supabase-js uuid crypto
// 4. Ensure payment utilities (paytmChecksum.js, razorpayUtils.js) are present.
// 5. Run the server:
//    node server.js

// If hosting on Render.com or similar, ensure the Build Command is 'npm install' and Start Command is 'node server.js'.
`;

    const handleCopy = () => {
        navigator.clipboard.writeText(serverInstructions);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={pageStyle}>
            <h1 style={headerStyle}>Server Connection Guide</h1>
            
            {error && (
                <div style={errorBoxStyle}>
                    <strong>Connection Error:</strong>
                    <div style={{marginTop: '0.5rem', whiteSpace: 'pre-wrap'}}>{error}</div>
                </div>
            )}

            <div style={{marginBottom: '2rem'}}>
                <h2 style={subHeaderStyle}>Troubleshooting</h2>
                <ul style={{lineHeight: '1.6', paddingLeft: '1.5rem'}}>
                    <li><strong>Server Status:</strong> Is the game server running?</li>
                    <li><strong>Configuration:</strong> Check <code>config.ts</code>. Does <code>GAME_SERVER_URL</code> match your server URL?</li>
                    <li><strong>Network:</strong> Are you connected to the internet? (Check console for WebSocket errors).</li>
                </ul>
            </div>

            <div>
                <h2 style={subHeaderStyle}>Setup Instructions</h2>
                <p>If you need to set up the server backend, refer to these instructions:</p>
                <div style={codeBlockStyle}>
                    {serverInstructions.trim()}
                    <button onClick={handleCopy} style={copyBtnStyle} title="Copy Instructions">
                        <div dangerouslySetInnerHTML={{ __html: CopyIconSVG(copied) }} />
                    </button>
                </div>
            </div>

            <button onClick={onDismiss} style={buttonStyle}>
                Close
            </button>
        </div>
    );
};

export default ServerSetupGuide;
