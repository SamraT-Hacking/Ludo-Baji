import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { ChatMessage } from '../../types';

const ITEMS_PER_PAGE = 20;

const ChatManagement: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const fetchMessages = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let query = supabase
                .from('chat_messages')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (searchTerm) {
                query = query.ilike('name', `%${searchTerm}%`);
            }
            
            const { data, error, count } = await query.range(from, to);
            if (error) throw error;
            setMessages(data || []);
            setHasMore((count || 0) > to + 1);
        } catch (e: any) {
            setError("Failed to load chat messages.");
        } finally {
            setLoading(false);
        }
    }, [searchTerm, page]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchMessages();
        }, 300);
        return () => clearTimeout(debounce);
    }, [fetchMessages, searchTerm, page]);

    const handleDelete = async (messageId: string) => {
        if (!supabase) return;
        if (window.confirm("Are you sure you want to delete this message?")) {
            const { error } = await supabase
                .from('chat_messages')
                .delete()
                .eq('id', messageId);

            if (error) {
                alert(`Failed to delete message: ${error.message}`);
            } else {
                fetchMessages(); // Refresh list
            }
        }
    };
    
    const headerStyle: React.CSSProperties = { fontSize: '2rem', marginBottom: '1rem' };
    const searchInputStyle: React.CSSProperties = { width: '100%', maxWidth: '400px', padding: '0.75rem', marginBottom: '1.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '1rem' };
    const containerStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' };
    const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
    const thStyle: React.CSSProperties = { padding: '1rem', textAlign: 'left', backgroundColor: '#f7fafc', borderBottom: '2px solid #edf2f7', color: '#4a5568' };
    const tdStyle: React.CSSProperties = { padding: '1rem', borderBottom: '1px solid #edf2f7' };
    const buttonStyle: React.CSSProperties = { padding: '0.4rem 0.8rem', borderRadius: '5px', border: 'none', cursor: 'pointer', color: 'white' };
    const paginationContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #edf2f7' };
    const pageBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.9rem' };

    return (
        <div>
            <h1 style={headerStyle} className="admin-page-header">Chat Management</h1>
            <input 
                type="text"
                placeholder="Search by player name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={searchInputStyle}
            />

            <div style={containerStyle} className="table-container">
                 {loading && <p style={{padding: '1rem'}}>Loading messages...</p>}
                 {error && <p style={{padding: '1rem', color: 'red'}}>{error}</p>}
                 {!loading && (
                    <table style={tableStyle} className="responsive-admin-table">
                        <thead>
                            <tr>
                                <th style={thStyle}>Player</th>
                                <th style={thStyle}>Message</th>
                                <th style={thStyle}>Timestamp</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {messages.map(msg => (
                                <tr key={msg.id}>
                                    <td data-label="Player" style={{...tdStyle, fontWeight: 'bold', color: `var(--${(msg.color as string).toLowerCase()}-base)`}}>{msg.name}</td>
                                    <td data-label="Message" style={tdStyle}>{msg.text}</td>
                                    <td data-label="Timestamp" style={{...tdStyle, whiteSpace: 'nowrap'}}>{msg.created_at ? new Date(msg.created_at).toLocaleString() : 'N/A'}</td>
                                    <td data-label="Actions" style={tdStyle}>
                                        <button onClick={() => handleDelete(msg.id)} style={{...buttonStyle, backgroundColor: '#f56565'}}>
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {messages.length === 0 && <tr><td colSpan={4} style={{textAlign: 'center', padding: '2rem', color: '#666'}}>No messages found.</td></tr>}
                        </tbody>
                    </table>
                 )}
                 
                 {!loading && (
                    <div style={paginationContainerStyle}>
                        <span style={{color: '#666', fontSize: '0.9rem'}}>Page {page}</span>
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                style={{...pageBtnStyle, opacity: page === 1 ? 0.5 : 1}}
                            >
                                Previous
                            </button>
                            <button 
                                onClick={() => setPage(p => p + 1)}
                                disabled={!hasMore}
                                style={{...pageBtnStyle, opacity: !hasMore ? 0.5 : 1}}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatManagement;