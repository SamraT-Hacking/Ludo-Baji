
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { SupportChatMessage } from '../../types';
import { GAME_SERVER_URL } from '../../config';

interface Conversation {
    userId: string;
    username: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
}

const ITEMS_PER_PAGE = 20;

const SupportManagement: React.FC = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [displayedConversations, setDisplayedConversations] = useState<Conversation[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [messages, setMessages] = useState<SupportChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const [page, setPage] = useState(1);
    
    const wsRef = useRef<WebSocket | null>(null);

    const processMessagesIntoConversations = (allMessages: SupportChatMessage[]): Conversation[] => {
        const conversationsMap = new Map<string, Conversation>();
        const sortedMessages = [...allMessages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        for (const msg of sortedMessages) {
            const current = conversationsMap.get(msg.user_id) || {
                userId: msg.user_id,
                username: msg.username || 'Unknown',
                lastMessage: '',
                lastMessageAt: msg.created_at,
                unreadCount: 0,
            };
            current.lastMessage = msg.message_text;
            current.lastMessageAt = msg.created_at;
            if (!msg.sent_by_admin && !msg.is_read) {
                current.unreadCount += 1;
            }
            conversationsMap.set(msg.user_id, current);
        }
        
        const convos = Array.from(conversationsMap.values());
        convos.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        return convos;
    };

    const fetchAllData = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase.from('support_chats').select('*');
        if (!error && data) {
            setConversations(processMessagesIntoConversations(data));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAllData();
        
        // Initialize WebSocket
        const initSocket = async () => {
             const { data: { session } } = await (supabase as any).auth.getSession();
             if (session?.access_token) {
                const wsUrl = `${GAME_SERVER_URL}/support`;
                const ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    console.log('Admin Support connected via WebSocket');
                    ws.send(JSON.stringify({ type: 'AUTH', payload: { token: session.access_token } }));
                };

                ws.onmessage = (event) => {
                    try {
                        const { type, payload } = JSON.parse(event.data);
                        if (type === 'NEW_MESSAGE') {
                            const newMsg: SupportChatMessage = payload;
                            
                            // Update Conversations List
                            setConversations(prevConvos => {
                                const existingConvoIndex = prevConvos.findIndex(c => c.userId === newMsg.user_id);
                                let updatedConvos = [...prevConvos];
                                let unreadIncrement = 0;

                                if (!newMsg.sent_by_admin && newMsg.user_id !== selectedUserId) {
                                    unreadIncrement = 1;
                                }

                                if (existingConvoIndex > -1) {
                                    const existingConvo = updatedConvos.splice(existingConvoIndex, 1)[0];
                                    existingConvo.lastMessage = newMsg.message_text;
                                    existingConvo.lastMessageAt = newMsg.created_at;
                                    existingConvo.unreadCount += unreadIncrement;
                                    updatedConvos.unshift(existingConvo);
                                } else {
                                    updatedConvos.unshift({
                                        userId: newMsg.user_id,
                                        username: newMsg.username || 'Unknown',
                                        lastMessage: newMsg.message_text,
                                        lastMessageAt: newMsg.created_at,
                                        unreadCount: unreadIncrement,
                                    });
                                }
                                return updatedConvos;
                            });

                            // Update Active Chat Window
                            if (selectedUserId && newMsg.user_id === selectedUserId) {
                                setMessages(prev => {
                                    if (prev.find(m => m.id === newMsg.id)) return prev;
                                    return [...prev, newMsg];
                                });
                            }
                        }
                    } catch (e) {
                        console.error("Failed to parse admin WS message", e);
                    }
                };

                wsRef.current = ws;
             }
        };
        
        initSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        }
    }, [selectedUserId]);
    
    // Pagination Effect
    useEffect(() => {
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE;
        setDisplayedConversations(conversations.slice(from, to));
    }, [conversations, page]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSelectConversation = async (userId: string) => {
        if (!supabase) return;
        setSelectedUserId(userId);
        setMessages([]);
        const { data, error } = await supabase.from('support_chats').select('*').eq('user_id', userId).order('created_at', { ascending: true });
        if (data) setMessages(data);

        const { error: updateError } = await supabase.from('support_chats').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
        if (!updateError) {
             setConversations(prev => prev.map(c => c.userId === userId ? { ...c, unreadCount: 0 } : c));
        }
    };

    const handleTyping = (text: string) => {
        setNewMessage(text);
        
        if (!selectedUserId || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        wsRef.current.send(JSON.stringify({
            type: 'TYPING',
            payload: { target_user_id: selectedUserId, isTyping: true }
        }));

        typingTimeoutRef.current = setTimeout(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'TYPING',
                    payload: { target_user_id: selectedUserId, isTyping: false }
                }));
            }
        }, 2000);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !newMessage.trim() || !selectedUserId) return;
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        wsRef.current.send(JSON.stringify({
            type: 'TYPING',
            payload: { target_user_id: selectedUserId, isTyping: false }
        }));

        setSending(true);
        const text = newMessage.trim();
        setNewMessage('');
        
        wsRef.current.send(JSON.stringify({
            type: 'SEND_MESSAGE',
            payload: {
                message_text: text,
                target_user_id: selectedUserId 
            }
        }));
        
        setSending(false);
    };
    
    const getTime = (date: string) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const paginationContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderTop: '1px solid #edf2f7', fontSize: '0.8rem' };
    const pageBtnStyle: React.CSSProperties = { padding: '0.3rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: '4px', background: 'white', cursor: 'pointer' };

    return (
        <div>
            <h1 className="admin-page-header">Support Management</h1>
            <div className="admin-support-layout">
                <div className="conversation-list">
                    {loading && <p style={{ padding: '1rem' }}>Loading...</p>}
                    <div style={{flex: 1, overflowY: 'auto'}}>
                        {displayedConversations.map(convo => (
                            <div key={convo.userId} className={`conversation-item ${selectedUserId === convo.userId ? 'active' : ''}`} onClick={() => handleSelectConversation(convo.userId)}>
                                <div className="username">{convo.username}</div>
                                <div className="last-message">{convo.lastMessage}</div>
                                {convo.unreadCount > 0 && <div className="unread-indicator"></div>}
                            </div>
                        ))}
                    </div>
                    
                    {/* Pagination Controls */}
                    <div style={paginationContainerStyle}>
                        <span>Page {page}</span>
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                style={{...pageBtnStyle, opacity: page === 1 ? 0.5 : 1}}
                            >
                                Prev
                            </button>
                            <button 
                                onClick={() => setPage(p => p + 1)}
                                disabled={page * ITEMS_PER_PAGE >= conversations.length}
                                style={{...pageBtnStyle, opacity: (page * ITEMS_PER_PAGE >= conversations.length) ? 0.5 : 1}}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="chat-window">
                    {selectedUserId ? (
                        <>
                            <div className="chat-messages-area">
                                {messages.map(msg => {
                                    const sentOrReceived = msg.sent_by_admin ? 'sent' : 'received';
                                    return (
                                        <div key={msg.id} className={`message-group ${sentOrReceived}`}>
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
                                    placeholder="Type a reply..." 
                                    value={newMessage} 
                                    onChange={e => handleTyping(e.target.value)} 
                                    disabled={sending} 
                                />
                                <button type="submit" disabled={sending}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="chat-window-placeholder">
                            <p>Select a conversation to start chatting.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupportManagement;
