
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { UsersIconSVG } from '../assets/icons';
import { GAME_SERVER_URL } from '../config';

interface GroupChatMessage {
    id: string;
    created_at: string;
    user_id: string;
    username: string;
    message_text: string;
}

const GroupChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
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

    // Dragging state
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const startPosRef = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false); 

    // Check status and config setting on mount
    useEffect(() => {
        if (!supabase) return;
        const fetchStatus = async () => {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'group_chat_status').single();
            if (data && data.value) {
                const val = data.value as any;
                setIsEnabled(val.enabled);
                setBlockLinks(val.block_links || false);
                setBannedWords(val.banned_words || []);
            }
        };
        fetchStatus();

        const channel = supabase.channel('group-chat-status-listener')
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
                            console.error("Failed to parse Group Chat WS message", e);
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
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

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
    
    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault(); 
        e.stopPropagation();
        
        isDraggingRef.current = false;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        startPosRef.current = { ...position };

        const handlePointerMove = (ev: PointerEvent) => {
            const dx = ev.clientX - dragStartRef.current.x;
            const dy = ev.clientY - dragStartRef.current.y;

            if (!isDraggingRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                isDraggingRef.current = true;
                setIsDragging(true);
            }

            if (isDraggingRef.current) {
                setPosition({
                    x: startPosRef.current.x + dx,
                    y: startPosRef.current.y + dy
                });
            }
        };

        const handlePointerUp = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);

            if (!isDraggingRef.current) {
                toggleChat();
            }
            
            isDraggingRef.current = false;
            setIsDragging(false);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    const getTime = (date: string) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <>
            <button 
                className="group-chat-fab" 
                onPointerDown={handlePointerDown}
                style={{ 
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    touchAction: 'none', 
                    cursor: 'grab',
                    transition: isDragging ? 'none' : 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                aria-label={isOpen ? "Close group chat" : "Open group chat"}
            >
                <div dangerouslySetInnerHTML={{ __html: UsersIconSVG() }} />
            </button>

            <style>{`
                .group-chat-fab {
                    position: fixed;
                    bottom: calc(var(--footer-height) + 2rem + 70px);
                    left: 20px;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(45deg, #4299e1, #667eea);
                    color: white;
                    border: none;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    cursor: pointer;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 998;
                    animation: fab-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
                .group-chat-fab:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                }
                .group-chat-widget-container {
                    position: fixed;
                    bottom: calc(var(--footer-height) + 2rem + 140px);
                    left: 20px;
                    width: 90%; /* Matched Support Chat Width */
                    max-width: 380px; /* Matched Support Chat Max Width */
                    height: 65vh; /* Matched Support Chat Height */
                    max-height: 550px; /* Matched Support Chat Max Height */
                    background-color: var(--bg-card);
                    border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                    z-index: 999;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transform-origin: bottom left;
                    color: var(--text-main);
                    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
                }
                .gc-header {
                    padding: 1rem;
                    background: linear-gradient(45deg, #4299e1, #667eea);
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                }
                .gc-username {
                    font-weight: bold; 
                    font-size: 0.75rem; 
                    margin-bottom: 4px;
                    color: #718096; /* Default gray for others */
                    display: block;
                }
                .message-group.sent .gc-username {
                    display: none; /* Hide own name */
                }
                
                /* Unavailable Overlay */
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
                    z-index: 1001;
                }
                [data-theme="dark"] .gc-unavailable-overlay {
                    background-color: rgba(30, 41, 59, 0.9);
                }
            `}</style>

            <div 
                className="group-chat-widget-container"
                style={{
                    transform: `scale(${isOpen ? 1 : 0})`,
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none'
                }}
            >
                <div className="gc-header">
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <h3 style={{margin: 0, fontSize: '1.2rem'}}>Global Chat</h3>
                    </div>
                    <button className="chat-widget-close-btn" onClick={() => setIsOpen(false)}>&times;</button>
                </div>
                
                <div className="chat-messages-area" style={{position: 'relative'}}>
                    {!isEnabled && (
                        <div className="gc-unavailable-overlay">
                            <h3 style={{color: '#e53e3e', marginTop: 0}}>Unavailable</h3>
                            <p style={{color: 'var(--text-secondary)'}}>Group Chat is currently disabled. Please check back later.</p>
                        </div>
                    )}

                    {loading ? <p>Loading chat...</p> : messages.map(msg => {
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
                <form className="chat-input-form" onSubmit={handleSendMessage}>
                    <input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        disabled={sending || !isEnabled}
                    />
                    <button type="submit" disabled={sending || !isEnabled} style={{backgroundColor: isEnabled ? '#4299e1' : '#ccc'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </form>
            </div>
        </>
    );
};

export default GroupChatWidget;
