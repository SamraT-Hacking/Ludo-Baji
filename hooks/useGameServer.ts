
import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState } from '../types';
import { GAME_SERVER_URL } from '../config';
import { playDiceRollSound, playWinSound, playMoveSound, playCaptureSound, playStartSound, playFinishPieceSound } from '../utils/sound';

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
const MAX_RETRIES = 5;

export const useGameServer = (gameCode: string | null, token: string | null) => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [error, setError] = useState<string | null>(null);
    
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retryCount = useRef(0);

    const lastMessageRef = useRef<string | null>(null);
    useEffect(() => {
        if (gameState?.message && gameState.message !== lastMessageRef.current) {
            const lowerCaseMessage = gameState.message.toLowerCase();
            if (lowerCaseMessage.includes('rolled')) playDiceRollSound();
            else if (lowerCaseMessage.includes('wins')) playWinSound();
            else if (lowerCaseMessage.includes('started')) playStartSound();
            else if (lowerCaseMessage.includes('piece home')) playCaptureSound();
            else if (lowerCaseMessage.includes('reached home')) playFinishPieceSound();
            else playMoveSound();
            lastMessageRef.current = gameState.message;
        }
    }, [gameState?.message]);

    const connect = useCallback(() => {
        if (!gameCode || !token || (ws.current && ws.current.readyState < 2)) {
            return;
        }

        if (reconnectTimer.current) {
            clearTimeout(reconnectTimer.current);
            reconnectTimer.current = null;
        }

        const isReconnecting = retryCount.current > 0;
        setConnectionStatus(isReconnecting ? 'reconnecting' : 'connecting');
        setError(null);

        const serverUrl = `${GAME_SERVER_URL}/${gameCode}`;
        ws.current = new WebSocket(serverUrl);

        ws.current.onopen = () => {
            console.log('WebSocket connected');
            ws.current?.send(JSON.stringify({ action: 'AUTH', payload: { token } }));
        };

        ws.current.onmessage = (event) => {
            const message = JSON.parse(event.data);
            switch (message.type) {
                case 'AUTH_SUCCESS':
                    setConnectionStatus('connected');
                    retryCount.current = 0;
                    console.log('Authenticated with game server.');
                    break;
                case 'AUTH_FAILURE':
                    setError(message.payload.message || 'Authentication failed.');
                    setConnectionStatus('disconnected');
                    ws.current?.close(4001, 'Auth Failed');
                    break;
                case 'GAME_STATE_UPDATE':
                    setGameState(message.payload);
                    break;
                case 'GAME_ARCHIVED':
                    setGameState(message.payload);
                    setConnectionStatus('disconnected'); // Not a live game
                    break;
                case 'ERROR': {
                    const errorPayload = message.payload.message;
                    // Ensure error is a string to prevent '[object Object]' display issues.
                    const errorMessage = typeof errorPayload === 'string' 
                        ? errorPayload 
                        : 'An unknown error occurred from the server.';
                    setError(errorMessage);
                    console.error("Server Error:", errorPayload); // Log the original for debugging
                    break;
                }
                default:
                    console.warn('Unknown message type from server:', message.type);
            }
        };

        ws.current.onerror = (err) => {
            console.error('WebSocket error:', err);
            // 'onclose' will be called next, which will handle the state change.
        };

        ws.current.onclose = (event) => {
            console.log(`WebSocket disconnected - Code: ${event.code}, Reason: "${event.reason}"`);
            
            // Don't attempt to reconnect for auth failures or clean closures
            if (event.code === 4001 || event.wasClean) {
                setConnectionStatus('disconnected');
                return;
            }

            if (retryCount.current < MAX_RETRIES) {
                retryCount.current++;
                const delay = Math.pow(2, retryCount.current) * 1000; // Exponential backoff
                console.log(`Attempting to reconnect in ${delay / 1000}s... (Attempt ${retryCount.current})`);
                setConnectionStatus('reconnecting');
                reconnectTimer.current = setTimeout(connect, delay);
            } else {
                console.error('Max reconnection attempts reached.');
                setConnectionStatus('disconnected');
                
                let detailedError = `Could not connect to the game server.\n\nTroubleshooting steps:\n1. Verify the game server is running.\n2. Check the server URL in config.ts is correct.`;
                
                if (event.code === 1006) { // Abnormal Closure
                    detailedError += `\n\n(Error 1006): This is a common connection error. For deployed apps, ensure your URL starts with "wss://". For local development, use "ws://".`;
                } else if (event.reason) {
                    detailedError += `\n\nServer reason: ${event.reason}`;
                }
                
                detailedError += `\n\nCheck the browser's developer console for more specific network errors.`;
                setError(detailedError);
            }
        };
    }, [gameCode, token]);

    // Effect to manage the connection lifecycle
    useEffect(() => {
        if (gameCode && token) {
            connect();
        } else {
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current);
            }
            setGameState(null);
            setConnectionStatus('disconnected');
            retryCount.current = 0;
        }

        return () => {
            if (ws.current) {
                ws.current.close(1000, 'Component unmounting');
                ws.current = null;
            }
            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current);
            }
        };
    }, [gameCode, token, connect]);

    const sendAction = useCallback((action: string, payload?: any) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ action, payload }));
        } else {
            console.error('Cannot send action, WebSocket is not connected.');
            setError('You are not connected to the game server.');
            setConnectionStatus('reconnecting'); // Trigger reconnect attempt
            connect();
        }
    }, [connect]);

    // --- Game Actions ---
    const startGame = useCallback(() => sendAction('START_GAME'), [sendAction]);
    const rollDice = useCallback(() => sendAction('ROLL_DICE'), [sendAction]);
    const movePiece = useCallback((pieceId: number) => sendAction('MOVE_PIECE', { pieceId }), [sendAction]);
    const leaveGame = useCallback(() => {
        sendAction('LEAVE_GAME');
        if (ws.current) {
            ws.current.close(1000, 'User left game'); // Clean closure
        }
    }, [sendAction]);
    const sendChatMessage = useCallback((text: string) => sendAction('SEND_CHAT_MESSAGE', { text }), [sendAction]);

    return { gameState, connectionStatus, error, startGame, rollDice, movePiece, leaveGame, sendChatMessage };
};
