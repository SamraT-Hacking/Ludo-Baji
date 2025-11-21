
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { SupportChatMessage } from '../types';
import { SupportChatIconSVG } from '../assets/icons';
import { GAME_SERVER_URL } from '../config';
import { playMessageSound } from '../utils/sound';

const SupportChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<SupportChatMessage[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [currentUser, setCurrentUser] = useState<{ id: string, name: string } | null>(null);
    
    const wsRef = useRef<WebSocket | null>(null);

    // New Features State
    const [isAdminTyping, setIsAdminTyping] = useState(false);
    const [adminStatus, setAdminStatus] = useState<'online' | 'offline'>('offline');

    // Dragging state
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const startPosRef = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false); 

    const isOpenRef = useRef(isOpen);
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    // Fetch Admin Status & Subscribe to Changes
    useEffect(() => {
        if (!supabase) return;
        
        const fetchAdminStatus = async () => {
            const { data } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'admin_status')
                .single();
            if (data && data.value) {
                setAdminStatus((data.value as any).status);
            }
        };
        fetchAdminStatus();

        const channel = supabase.channel('support-chat-admin-status')
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'app_settings', 
                filter: "key=eq.admin_status"
            }, (payload) => {
                 const newVal = payload.new as any;
                 if (newVal && newVal.value) {
                     setAdminStatus(newVal.value.status);
                 }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        const getUser = async () => {
            if (!supabase) return;
            const { data: { user } } = await (supabase.auth as any).getUser();
            if (user) {
                const { data: { session } } = await (supabase.auth as any).getSession();
                setCurrentUser({ id: user.id, name: user.user_metadata?.full_name || 'You' });
                
                if (session?.access_token) {
                    const wsUrl = `${GAME_SERVER_URL}/support`;
                    const ws = new WebSocket(wsUrl);
                    
                    ws.onopen = () => {
                        // console.log('Support Chat connected via WebSocket');
                        ws.send(JSON.stringify({ type: 'AUTH', payload: { token: session.access_token } }));
                    };

                    ws.onmessage = (event) => {
                        try {
                            const { type, payload } = JSON.parse(event.data);
                            
                            if (type === 'NEW_MESSAGE') {
                                const message: SupportChatMessage = payload;
                                setMessages(prev => {
                                    if (prev.find(m => m.id === message.id)) return prev;
                                    return [...prev, message];
                                });
                                
                                if (message.sent_by_admin) {
                                    setIsAdminTyping(false); // Stop typing when message arrives
                                    playMessageSound();
                                    if (!isOpenRef.current) {
                                        setUnreadCount(prev => prev + 1);
                                    }
                                }
                            }
                            else if (type === 'TYPING_STATUS') {
                                setIsAdminTyping(payload.isTyping);
                            }
                        } catch (e) {
                            console.error("Failed to parse WS message", e);
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
        if (!supabase || !currentUser) return;

        setLoading(true);
        const { data, error } = await supabase
            .from('support_chats')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setMessages(data);
            const unread = data.filter(m => m.sent_by_admin && !m.is_read).length;
            setUnreadCount(unread);
        }
        setLoading(false);
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            fetchMessages();
        }
    }, [currentUser, fetchMessages]);
    
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isAdminTyping]);
    
    const markMessagesAsRead = async () => {
        if (!supabase || !currentUser || unreadCount === 0) return;
        
        setUnreadCount(0);
        
        const { error } = await supabase
            .from('support_chats')
            .update({ is_read: true })
            .eq('user_id', currentUser.id)
            .eq('sent_by_admin', true)
            .eq('is_read', false);
        
        if (!error) {
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.sent_by_admin && !msg.is_read ? { ...msg, is_read: true } : msg
                )
            );
        }
    };

    const toggleChat = () => {
        if (isOpen) {
            setIsOpen(false);
        } else {
            setIsOpen(true);
            markMessagesAsRead();
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !newMessage.trim() || !currentUser) return;

        setSending(true);
        const text = newMessage.trim();
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
                className="support-chat-fab" 
                onPointerDown={handlePointerDown}
                style={{ 
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    touchAction: 'none', 
                    cursor: 'grab',
                    transition: isDragging ? 'none' : 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                aria-label={isOpen ? "Close support chat" : "Open support chat"}
            >
                <div dangerouslySetInnerHTML={{ __html: SupportChatIconSVG() }} />
                {unreadCount > 0 && <span className="fab-badge">{unreadCount}</span>}
            </button>

            <style>{`
                /* Overriding or adding styles specifically for left positioning */
                .support-chat-fab {
                    left: 20px; /* Moved to left */
                    right: auto;
                    bottom: calc(var(--footer-height) + 2rem);
                }
                .chat-widget-container {
                    left: 20px; /* Moved to left */
                    right: auto;
                    bottom: calc(var(--footer-height) + 2rem + 70px);
                    transform-origin: bottom left; /* Open from left */
                }
            `}</style>

            <div 
                className="chat-widget-container"
                style={{
                    transform: `scale(${isOpen ? 1 : 0})`,
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none',
                    transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease'
                }}
            >
                <div className="chat-widget-header">
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <h3>Admin Support </h3>
                        <span className={`online-dot ${adminStatus}`} title={`Admin is ${adminStatus}`}></span>
                    </div>
                    <button className="chat-widget-close-btn" onClick={() => setIsOpen(false)}>&times;</button>
                </div>
                <div className="chat-messages-area">
                    {loading ? <p>Loading chat...</p> : messages.map(msg => {
                        const sentOrReceived = msg.sent_by_admin ? 'received' : 'sent';
                        return (
                             <div key={msg.id} className={`message-group ${sentOrReceived}`}>
                                <div className={`message-bubble ${sentOrReceived}`}>
                                    {msg.message_text}
                                </div>
                                <div className="message-timestamp">{getTime(msg.created_at)}</div>
                            </div>
                        )
                    })}
                    {isAdminTyping && (
                         <div className="message-group received">
                             <div className="message-bubble received typing-indicator">
                                 <span></span><span></span><span></span>
                             </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form className="chat-input-form" onSubmit={handleSendMessage}>
                    <input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        disabled={sending}
                    />
                    <button type="submit" disabled={sending}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </form>
            </div>
        </>
    );
};

export default SupportChatWidget;
