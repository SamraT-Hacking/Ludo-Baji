
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { GAME_SERVER_URL } from '../../config';

interface GroupChatMessage {
    id: string;
    created_at: string;
    user_id: string;
    username: string;
    message_text: string;
}

const ITEMS_PER_PAGE = 20;

const GlobalChatManagement: React.FC = () => {
    const [messages, setMessages] = useState<GroupChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const fetchMessages = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        const { data, error, count } = await supabase
            .from('group_chat_messages')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (!error && data) {
            // Sort for display (oldest first)
            setMessages(data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
            setHasMore((count || 0) > to + 1);
        }
        setLoading(false);
    }, [page]);

    useEffect(() => {
        fetchMessages();

        const initSocket = async () => {
            if (!supabase) return;
            const { data: { session } } = await (supabase.auth as any).getSession();
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
                            // Only append if on the first page (most recent)
                            if (page === 1) {
                                setMessages(prev => {
                                    if (prev.find(m => m.id === message.id)) return prev;
                                    return [...prev, message];
                                });
                            }
                        }
                    } catch (e) {
                        console.error("Failed to parse WS message", e);
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
        };
    }, [fetchMessages, page]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !newMessage.trim()) return;

        setSending(true);
        const text = newMessage.trim();
        setNewMessage('');

        wsRef.current.send(JSON.stringify({
            type: 'SEND_MESSAGE',
            payload: { message_text: text }
        }));
        
        setSending(false);
    };

    const handleDeleteMessage = async (id: string) => {
        if (!window.confirm("Delete this message?")) return;
        if (!supabase) return;

        const { error } = await supabase.from('group_chat_messages').delete().eq('id', id);
        if (!error) {
            setMessages(prev => prev.filter(m => m.id !== id));
        } else {
            alert("Failed to delete message.");
        }
    };

    const getTime = (date: string) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const paginationContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #edf2f7', backgroundColor: 'white' };
    const pageBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.9rem' };

    return (
        <div style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Global Chat Monitor</h2>
                <span style={{ fontSize: '0.9rem', color: '#718096' }}>Live Stream</span>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#f7fafc' }}>
                {loading && <p>Loading history...</p>}
                {messages.map(msg => (
                    <div key={msg.id} style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignSelf: 'flex-start',
                        maxWidth: '80%',
                        minWidth: '200px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#4a5568' }}>{msg.username}</span>
                            <button 
                                onClick={() => handleDeleteMessage(msg.id)}
                                style={{ border: 'none', background: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.8rem', marginLeft: '10px' }}
                            >
                                Delete
                            </button>
                        </div>
                        <div style={{ 
                            backgroundColor: 'white', 
                            padding: '0.8rem 1rem', 
                            borderRadius: '0 12px 12px 12px', 
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            border: '1px solid #e2e8f0'
                        }}>
                            {msg.message_text}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#a0aec0', marginTop: '2px' }}>{getTime(msg.created_at)}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            
            <div style={paginationContainerStyle}>
                <span style={{color: '#666', fontSize: '0.9rem'}}>Page {page}</span>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={{...pageBtnStyle, opacity: page === 1 ? 0.5 : 1}}
                    >
                        Previous (Newer)
                    </button>
                    <button 
                        onClick={() => setPage(p => p + 1)}
                        disabled={!hasMore}
                        style={{...pageBtnStyle, opacity: !hasMore ? 0.5 : 1}}
                    >
                        Next (Older)
                    </button>
                </div>
            </div>

            <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem', backgroundColor: 'white' }}>
                <input 
                    type="text" 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)} 
                    placeholder="Post a message as Admin..." 
                    style={{ flex: 1, padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e0' }}
                />
                <button 
                    type="submit" 
                    disabled={sending}
                    style={{ padding: '0.8rem 1.5rem', backgroundColor: '#4299e1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Send
                </button>
            </form>
        </div>
    );
};

export default GlobalChatManagement;
