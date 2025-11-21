
/**
 * Configuration for the game server.
 * This URL should point to your deployed WebSocket server.
 * 
 * For local development: 'ws://localhost:8080'
 * For a deployed Render server: 'wss://your-app-name.onrender.com'
 * 
 * IMPORTANT: Use 'wss://' (WebSocket Secure) for deployed services,
 * as Render provides automatic SSL/TLS.
 */
export const GAME_SERVER_URL = 'wss://dream-ludo-server.onrender.com';

// Increment this version to force clients to clear cache and reload
export const APP_VERSION = '1.0.2';

export const getApiBaseUrl = () => {
    return GAME_SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://');
};