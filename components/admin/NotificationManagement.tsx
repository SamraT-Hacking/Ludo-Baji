
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { Notification, Profile } from '../../types';

const ITEMS_PER_PAGE = 20;

const NotificationManagement: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    // Form state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [target, setTarget] = useState<'all' | 'specific'>('all');
    const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [searchedUsers, setSearchedUsers] = useState<Profile[]>([]);

    const fetchNotifications = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const { data, error, count } = await supabase
                .from('notifications')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            setNotifications(data || []);
            setHasMore((count || 0) > to + 1);
        } catch (e: any) {
            setError('Failed to load notifications.');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);
    
    // Realtime Subscription
    useEffect(() => {
        if (!supabase) return;
        const channel = supabase.channel('admin-notifications-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchNotifications)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchNotifications]);

    useEffect(() => {
        if (!supabase || userSearch.length < 2) {
            setSearchedUsers([]);
            return;
        }
        const search = async () => {
            const { data } = await supabase.from('profiles').select('*').ilike('username', `%${userSearch}%`).limit(10);
            setSearchedUsers(data || []);
        };
        const debounce = setTimeout(search, 300);
        return () => clearTimeout(debounce);
    }, [userSearch]);

    const openModal = () => {
        setTitle('');
        setContent('');
        setTarget('all');
        setSelectedUsers([]);
        setUserSearch('');
        setSearchedUsers([]);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!supabase || !window.confirm('Are you sure you want to delete this notification?')) return;
        const { error } = await supabase.from('notifications').delete().eq('id', id);
        if (error) alert(`Error: ${error.message}`);
        else fetchNotifications();
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        const target_ids = target === 'specific' ? selectedUsers.map(u => u.id) : null;
        if (target === 'specific' && (!target_ids || target_ids.length === 0)) {
            alert('Please select at least one user.');
            return;
        }

        const { error } = await supabase.rpc('send_notification', { title, content, target_ids });
        if (error) {
            alert(`Error: ${error.message}`);
        } else {
            alert('Notification sent successfully!');
            setIsModalOpen(false);
            fetchNotifications(); // Refresh current page
        }
    };

    // Styles
    const headerStyle: React.CSSProperties = { fontSize: '2rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
    const tableContainerStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' };
    const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
    const thStyle: React.CSSProperties = { padding: '1rem', textAlign: 'left', backgroundColor: '#f7fafc', borderBottom: '2px solid #edf2f7', color: '#4a5568' };
    const tdStyle: React.CSSProperties = { padding: '1rem', borderBottom: '1px solid #edf2f7' };
    const buttonStyle: React.CSSProperties = { padding: '0.5rem 1rem', borderRadius: '5px', border: 'none', cursor: 'pointer', color: 'white' };
    const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 };
    const modalContentStyle: React.CSSProperties = { backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '600px' };
    const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { fontWeight: 'bold', marginBottom: '0.25rem', display: 'block' };
    const paginationContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #edf2f7' };
    const pageBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.9rem' };

    return (
        <div>
            <div style={headerStyle} className="admin-header-controls">
                <h1 className="admin-page-header" style={{marginBottom: 0}}>Notification Management</h1>
                <button onClick={openModal} style={{ ...buttonStyle, backgroundColor: '#48bb78' }}>Send Notification</button>
            </div>

            <div style={tableContainerStyle} className="table-container">
                {loading && <p style={{ padding: '1rem' }}>Loading...</p>}
                {error && <p style={{ padding: '1rem', color: 'red' }}>{error}</p>}
                {!loading && (
                    <table style={tableStyle} className="responsive-admin-table">
                        <thead>
                            <tr>
                                <th style={thStyle}>Title</th>
                                <th style={thStyle}>Target</th>
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {notifications.map(n => (
                                <tr key={n.id}>
                                    <td data-label="Title" style={{ ...tdStyle, fontWeight: 'bold' }}>{n.title}</td>
                                    <td data-label="Target" style={tdStyle}>{n.target_user_ids ? `${n.target_user_ids.length} user(s)` : 'All Users'}</td>
                                    <td data-label="Date" style={tdStyle}>{new Date(n.created_at).toLocaleString()}</td>
                                    <td data-label="Actions" style={tdStyle}><button onClick={() => handleDelete(n.id)} style={{ ...buttonStyle, backgroundColor: '#f56565' }}>Delete</button></td>
                                </tr>
                            ))}
                            {notifications.length === 0 && <tr><td colSpan={4} style={{textAlign: 'center', padding: '2rem', color: '#666'}}>No notifications found.</td></tr>}
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

            {isModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle} className="admin-modal-content">
                        <h2>Send Notification</h2>
                        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div><label style={labelStyle}>Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} required /></div>
                            <div><label style={labelStyle}>Content</label><textarea value={content} onChange={e => setContent(e.target.value)} style={{ ...inputStyle, minHeight: '100px' }} required /></div>
                            <div>
                                <label style={labelStyle}>Target Users</label>
                                <select value={target} onChange={e => setTarget(e.target.value as any)} style={inputStyle}>
                                    <option value="all">All Users</option>
                                    <option value="specific">Specific Users</option>
                                </select>
                            </div>
                            {target === 'specific' && (
                                <div>
                                    <label style={labelStyle}>Search & Select Users</label>
                                    <input type="text" placeholder="Search by username..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={inputStyle} />
                                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '4px' }}>
                                        {searchedUsers.filter(su => !selectedUsers.some(u => u.id === su.id)).map(user => (
                                            <div key={user.id} onClick={() => { setSelectedUsers(prev => [...prev, user]); setUserSearch(''); }} style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid #eee' }}>
                                                {user.username}
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {selectedUsers.map(user => (
                                            <span key={user.id} style={{ background: '#e2e8f0', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                                {user.username} <button type="button" onClick={() => setSelectedUsers(prev => prev.filter(u => u.id !== user.id))} style={{ border: 'none', background: 'none', color: 'red', cursor: 'pointer' }}>&times;</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ ...buttonStyle, backgroundColor: '#718096' }}>Cancel</button>
                                <button type="submit" style={{ ...buttonStyle, backgroundColor: '#48bb78' }}>Send</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationManagement;
