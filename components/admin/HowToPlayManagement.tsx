import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { HowToPlayVideo } from '../../types';

const ITEMS_PER_PAGE = 20;

const HowToPlayManagement: React.FC = () => {
    const [videos, setVideos] = useState<HowToPlayVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVideo, setEditingVideo] = useState<HowToPlayVideo | null>(null);
    const [formState, setFormState] = useState({ title: '', youtube_url: '' });

    const fetchVideos = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const { data, error, count } = await supabase
                .from('how_to_play_videos')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            setVideos(data || []);
            setHasMore((count || 0) > to + 1);
        } catch (e: any) {
            setError("Failed to load videos.");
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchVideos();
    }, [fetchVideos]);

    const openModal = (video: HowToPlayVideo | null = null) => {
        setEditingVideo(video);
        if (video) {
            setFormState({ title: video.title, youtube_url: video.youtube_url });
        } else {
            setFormState({ title: '', youtube_url: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        try {
            if (editingVideo) {
                const { error } = await supabase.from('how_to_play_videos').update(formState).eq('id', editingVideo.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('how_to_play_videos').insert([formState]);
                if (error) throw error;
            }
            fetchVideos();
            closeModal();
        } catch (e: any) {
            alert(`Error saving video: ${e.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!supabase) return;
        if (window.confirm("Are you sure you want to delete this video?")) {
            const { error } = await supabase.from('how_to_play_videos').delete().eq('id', id);
            if (error) alert(`Error deleting video: ${error.message}`);
            else fetchVideos();
        }
    };

    // Reusable styles from other admin panels
    const headerStyle: React.CSSProperties = { fontSize: '2rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' };
    const tableContainerStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' };
    const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' };
    const thStyle: React.CSSProperties = { padding: '1rem', textAlign: 'left', backgroundColor: '#f7fafc', borderBottom: '2px solid #edf2f7', color: '#4a5568' };
    const tdStyle: React.CSSProperties = { padding: '1rem', borderBottom: '1px solid #edf2f7', whiteSpace: 'normal', wordBreak: 'break-all' };
    const buttonStyle: React.CSSProperties = { padding: '0.5rem 1rem', borderRadius: '5px', border: 'none', cursor: 'pointer', color: 'white' };
    const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 };
    const modalContentStyle: React.CSSProperties = { backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '500px' };
    const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { fontWeight: 'bold', marginBottom: '0.25rem', display: 'block' };
    const paginationContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #edf2f7' };
    const pageBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.9rem' };
    
    return (
        <div>
            <div style={headerStyle} className="admin-header-controls">
                <h1 className="admin-page-header" style={{ marginBottom: 0 }}>How to Play Videos</h1>
                <button onClick={() => openModal()} style={{ ...buttonStyle, backgroundColor: '#48bb78' }}>Add Video</button>
            </div>

            <div style={tableContainerStyle} className="table-container">
                {loading && <p style={{ padding: '1rem' }}>Loading videos...</p>}
                {error && <p style={{ padding: '1rem', color: 'red' }}>{error}</p>}
                {!loading && (
                    <table style={tableStyle} className="responsive-admin-table">
                        <thead>
                            <tr>
                                <th style={thStyle}>Title</th>
                                <th style={thStyle}>YouTube URL</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {videos.map(v => (
                                <tr key={v.id}>
                                    <td data-label="Title" style={{ ...tdStyle, fontWeight: 'bold' }}>{v.title}</td>
                                    <td data-label="YouTube URL" style={tdStyle}>{v.youtube_url}</td>
                                    <td data-label="Actions" style={{ ...tdStyle, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <button onClick={() => openModal(v)} style={{ ...buttonStyle, backgroundColor: '#4299e1' }}>Edit</button>
                                        <button onClick={() => handleDelete(v.id)} style={{ ...buttonStyle, backgroundColor: '#f56565' }}>Delete</button>
                                    </td>
                                </tr>
                            ))}
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
                        <h2>{editingVideo ? 'Edit Video' : 'Add Video'}</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle} htmlFor="title">Title</label>
                                <input id="title" style={inputStyle} type="text" value={formState.title} onChange={e => setFormState({ ...formState, title: e.target.value })} required />
                            </div>
                            <div>
                                <label style={labelStyle} htmlFor="youtube_url">YouTube URL</label>
                                <input id="youtube_url" style={inputStyle} type="url" value={formState.youtube_url} onChange={e => setFormState({ ...formState, youtube_url: e.target.value })} required placeholder="e.g., https://www.youtube.com/watch?v=..." />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                                <button type="button" onClick={closeModal} style={{ ...buttonStyle, backgroundColor: '#718096' }}>Cancel</button>
                                <button type="submit" style={{ ...buttonStyle, backgroundColor: '#48bb78' }}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HowToPlayManagement;