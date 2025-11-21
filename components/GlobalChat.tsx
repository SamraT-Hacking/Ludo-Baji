
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { GAME_SERVER_URL } from '../config';

interface GroupChatMessage {
    id: string;
    created_at: string;
    user_id: string;
    username: string;
    message_text: string;
}

const GlobalChat: React.FC = () => {
    const [messages, setMessages] = useState<GroupChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [isEnabled, setIsEnabled] = useState(true);
    const [blockLinks, setBlockLinks] = useState(false);
    const [bannedWords, setBannedWords] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [currentUser, setCurrentUser] = useState<{ id: string, name: string } | null>(null);
    
    const wsRef = useRef<WebSocket | null>(null);

    // Fetch chat settings (status, blockLinks, bannedWords)
    useEffect(() => {
        if (!supabase) return;
        const fetchSettings = async () => {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'group_chat_status').single();
            if (data && data.value) {
                const val = data.value as any;
                setIsEnabled(val.enabled);
                setBlockLinks(val.block_links || false);
                setBannedWords(val.banned_words || []);
            }
        };
        fetchSettings();

        const channel = supabase.channel('global-chat-status-page')
            .on('postgres_changes', { 
                event: 'UPDATE', schema: 'public', table: 'app_settings', filter: "key=eq.group_chat_status"
            }, (payload) => {
                const val = payload.new as any;
                if (val && val.value) {
                    setIsEnabled(val.value.enabled);
                    setBlockLinks(val.value.block_links || false);
                    setBannedWords(val.value.banned_words || []);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, []);

    useEffect(() => {
        const getUser = async () => {
            if (!supabase) return;
            const { data: { user } } = await (supabase.auth as any).getUser();
            if (user) {
                const { data: { session } } = await (supabase.auth as any).getSession();
                setCurrentUser({ id: user.id, name: user.user_metadata?.full_name || 'You' });
                
                if (session?.access_token) {
                    const wsUrl = `${GAME_SERVER_URL}/group-chat`;
                    const ws = new WebSocket(wsUrl);
                    
                    ws.onopen = () => {
                        ws.send(JSON.stringify({ type: 'AUTH', payload: { token: session.access_token } }));
                    };

                    ws.onmessage = (event) => {
                        try {
                            const { type, payload } = JSON.parse(event.data);
                            if (type === 'NEW_MESSAGE') {
                                const message: GroupChatMessage = payload;
                                setMessages(prev => {
                                    if (prev.find(m => m.id === message.id)) return prev;
                                    return [...prev, message];
                                });
                            }
                        } catch (e) {
                            console.error("Failed to parse Global Chat WS message", e);
                        }
                    };
                    
                    wsRef.current = ws;
                }
            }
        };
        getUser();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []); 

    const fetchMessages = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('group_chat_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            setMessages(data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !newMessage.trim()) return;

        const text = newMessage.trim();

        // 1. Link Filter
        if (blockLinks) {
            const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9]+\.[a-zA-Z]{2,}\/?)/gi;
            if (linkRegex.test(text)) {
                alert("Links are not allowed in global chat.");
                return;
            }
        }

        // 2. Word Filter
        if (bannedWords.length > 0) {
            const lowerText = text.toLowerCase();
            const found = bannedWords.some(word => lowerText.includes(word.toLowerCase()));
            if (found) {
                alert("⚠️ Warning: Don't use this language.");
                return;
            }
        }

        setSending(true);
        setNewMessage('');

        wsRef.current.send(JSON.stringify({
            type: 'SEND_MESSAGE',
            payload: { message_text: text }
        }));
        
        setSending(false);
    };

    const getTime = (date: string) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Styling - Updated to use Fixed positioning to anchor to viewport
    const pageContainerStyle: React.CSSProperties = {
        position: 'fixed',
        top: 'var(--header-height)',
        bottom: 'var(--footer-height)',
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-main)',
        overflow: 'hidden', // Prevent full page scroll
        zIndex: 50, // Ensure it sits above basic page content
    };

    const chatAreaStyle: React.CSSProperties = {
        flexGrow: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        backgroundColor: 'var(--bg-main)',
    };

    return (
        <div style={pageContainerStyle}>
            <style>{`
                .gc-username {
                    font-weight: bold; 
                    font-size: 0.75rem; 
                    margin-bottom: 4px;
                    color: var(--text-secondary);
                    display: block;
                }
                .message-group.sent .gc-username {
                    display: none;
                }
                .gc-unavailable-overlay {
                    position: absolute;
                    inset: 0;
                    background-color: rgba(255,255,255,0.9);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    padding: 2rem;
                    z-index: 10;
                }
                [data-theme="dark"] .gc-unavailable-overlay {
                    background-color: rgba(15, 23, 42, 0.9);
                }
                .gc-gradient-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 0.8rem 1rem;
                    text-align: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.15);
                    position: relative;
                    z-index: 5;
                    flex-shrink: 0; /* Prevent header from shrinking */
                }
                .gc-title {
                    font-size: 1.2rem;
                    font-weight: 700;
                    margin: 0;
                    letter-spacing: 0.5px;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
                }
                .gc-warning {
                    font-size: 0.7rem;
                    background-color: #fff5f5;
                    color: #c53030;
                    padding: 2px 8px;
                    border-radius: 10px;
                    display: inline-block;
                    margin-top: 4px;
                    font-weight: 600;
                    border: 1px solid #fed7d7;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                .gc-input-container {
                    background-color: var(--bg-card);
                    padding: 0.75rem;
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    gap: 0.5rem;
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
                    flex-shrink: 0; /* Prevent input from shrinking */
                }
            `}</style>

            <div className="gc-gradient-header">
                <h2 className="gc-title">Global Chat Room</h2>
                <span className="gc-warning">⚠️ Don't use bad language in this chat</span>
            </div>
            
            <div style={chatAreaStyle}>
                {!isEnabled && (
                    <div className="gc-unavailable-overlay">
                        <h3 style={{color: '#e53e3e', marginTop: 0}}>Unavailable</h3>
                        <p style={{color: 'var(--text-main)'}}>Group Chat is currently disabled. Please check back later.</p>
                    </div>
                )}

                {loading ? <p style={{textAlign: 'center', color: 'var(--text-secondary)'}}>Loading chat...</p> : messages.map(msg => {
                    const isMe = currentUser?.id === msg.user_id;
                    const sentOrReceived = isMe ? 'sent' : 'received';
                    return (
                            <div key={msg.id} className={`message-group ${sentOrReceived}`}>
                            <span className="gc-username">{msg.username}</span>
                            <div className={`message-bubble ${sentOrReceived}`}>
                                {msg.message_text}
                            </div>
                            <div className="message-timestamp">{getTime(msg.created_at)}</div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            <form className="gc-input-container chat-input-form" onSubmit={handleSendMessage}>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    disabled={sending || !isEnabled}
                />
                <button type="submit" disabled={sending || !isEnabled} style={{backgroundColor: isEnabled ? 'url(#nav-icon-gradient)' : '#ccc', backgroundImage: isEnabled ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'none'}}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </form>
        </div>
    );
};

export default GlobalChat;
