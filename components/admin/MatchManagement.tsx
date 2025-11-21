import React, { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../../utils/supabase';
import { Tournament, TournamentStatus, TournamentPlayer } from '../../types';
import { AppConfigContext } from '../../App';

interface MatchManagementProps {
    onViewDetails: (tournament: Tournament) => void;
}

const ITEMS_PER_PAGE = 20;

const MatchManagement: React.FC<MatchManagementProps> = ({ onViewDetails }) => {
    const { currencySymbol } = useContext(AppConfigContext);
    const [matches, setMatches] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<TournamentStatus | 'ALL'>('ALL');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    // Modal state for Create/Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
    const [formState, setFormState] = useState({
        entry_fee: 0,
        prize_pool: 0,
        max_players: 2,
        status: 'UPCOMING' as TournamentStatus,
    });


    const fetchMatches = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let query = supabase
                .from('tournaments')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });
            
            if (statusFilter !== 'ALL') {
                query = query.eq('status', statusFilter);
            }

            const { data, error, count } = await query.range(from, to);
            
            if (error) throw error;
            setMatches(data || []);
            setHasMore((count || 0) > to + 1);
        } catch (e: any) {
            setError("Failed to load matches.");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, page]);

    useEffect(() => {
        // Reset page when filter changes
        setPage(1);
    }, [statusFilter]);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);
    
     // Realtime subscription for matches
    useEffect(() => {
        if (!supabase) return;
        const channel = supabase.channel('public:tournaments:matches')
          .on('postgres_changes', { 
              event: '*', 
              schema: 'public', 
              table: 'tournaments',
            }, 
            payload => {
                fetchMatches();
          })
          .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, fetchMatches]);

    const openModal = (tournament: Tournament | null = null) => {
        setEditingTournament(tournament);
        if (tournament) {
            setFormState({
                entry_fee: tournament.entry_fee,
                prize_pool: tournament.prize_pool,
                max_players: tournament.max_players,
                status: tournament.status,
            });
        } else {
            setFormState({
                entry_fee: 0,
                prize_pool: 0,
                max_players: 2,
                status: 'UPCOMING',
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTournament(null);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormState(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        try {
            if (editingTournament) {
                const { error } = await supabase.from('tournaments').update({
                    entry_fee: formState.entry_fee,
                    prize_pool: formState.prize_pool,
                    max_players: formState.max_players,
                    status: formState.status,
                }).eq('id', editingTournament.id);
                if (error) throw error;
            } else {
                 // Fetch the current max game number to determine the next one.
                const { data: maxNumData, error: maxNumError } = await supabase
                    .from('tournaments')
                    .select('game_number')
                    .order('game_number', { ascending: false })
                    .limit(1)
                    .single();

                if (maxNumError && maxNumError.code !== 'PGRST116') { // PGRST116 = no rows found
                    throw maxNumError;
                }

                const nextGameNumber = maxNumData ? maxNumData.game_number + 1 : 1;
                const newTitle = `Match #${nextGameNumber}`;

                 const { error } = await supabase.from('tournaments').insert([{
                    game_number: nextGameNumber,
                    title: newTitle,
                    entry_fee: formState.entry_fee,
                    prize_pool: formState.prize_pool,
                    max_players: formState.max_players,
                    status: 'UPCOMING',
                }]);
                if (error) throw error;
            }
            fetchMatches();
            closeModal();
        } catch (e: any) {
            alert(`Error saving match: ${e.message}`);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (!supabase) return;
        if (window.confirm("Are you sure you want to delete this match? This cannot be undone.")) {
            try {
                const { error } = await supabase.from('tournaments').delete().eq('id', id);
                if (error) throw error;
                fetchMatches();
            } catch (e: any) {
                alert(`Error deleting match: ${e.message}`);
            }
        }
    };

    // Styles
    const headerStyle: React.CSSProperties = { fontSize: '2rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' };
    const tableContainerStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' };
    const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' };
    const thStyle: React.CSSProperties = { padding: '1rem', textAlign: 'left', backgroundColor: '#f7fafc', borderBottom: '2px solid #edf2f7', color: '#4a5568' };
    const tdStyle: React.CSSProperties = { padding: '1rem', borderBottom: '1px solid #edf2f7' };
    const buttonStyle: React.CSSProperties = { padding: '0.5rem 1rem', borderRadius: '5px', border: 'none', cursor: 'pointer', color: 'white' };
    const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 };
    const modalContentStyle: React.CSSProperties = { backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '500px' };
    const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { fontWeight: 'bold', marginBottom: '0.25rem', display: 'block' };
    const filterContainerStyle: React.CSSProperties = { marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' };
    const filterButtonStyle: React.CSSProperties = { padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer' };
    const paginationContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #edf2f7' };
    const pageBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.9rem' };

    const StatusBadge = ({ status }: { status: TournamentStatus }) => {
        const style: React.CSSProperties = {
            padding: '0.2rem 0.6rem',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            textTransform: 'uppercase'
        };
        if (status === 'UPCOMING') {
            style.backgroundColor = '#c6f6d5'; style.color = '#2f855a';
        } else if (status === 'ACTIVE') {
            style.backgroundColor = '#bee3f8'; style.color = '#2c5282';
        } else if (status === 'COMPLETED') { 
            style.backgroundColor = '#fed7d7'; style.color = '#c53030';
        } else if (status === 'CANCELLED') {
             style.backgroundColor = '#e2e8f0'; style.color = '#4a5568';
        } else { // UNDER_REVIEW
            style.backgroundColor = '#feebc8'; style.color = '#9c4221';
        }
        return <span style={style}>{status === 'UNDER_REVIEW' ? 'REVIEW' : status}</span>;
    };
    
    const filters: (TournamentStatus | 'ALL')[] = ['ALL', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'UNDER_REVIEW', 'CANCELLED'];
    const filterLabels: Record<string, string> = {
        ALL: 'ALL',
        UPCOMING: 'UPCOMING',
        ACTIVE: 'ACTIVE',
        COMPLETED: 'COMPLETED',
        UNDER_REVIEW: 'REVIEW',
        CANCELLED: 'CANCELLED'
    };

    return (
        <div>
            <div style={headerStyle} className="admin-header-controls">
                <h1 className="admin-page-header" style={{ marginBottom: 0 }}>Match Management</h1>
                <button onClick={() => openModal()} style={{...buttonStyle, backgroundColor: '#48bb78'}}>Create Match</button>
            </div>
            
            <div style={filterContainerStyle}>
                {filters.map(f => (
                    <button 
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        style={{ ...filterButtonStyle, backgroundColor: statusFilter === f ? '#e2e8f0' : 'white' }}
                    >{filterLabels[f]}</button>
                ))}
            </div>

            <div style={tableContainerStyle} className="table-container">
                {loading && <p style={{padding: '1rem'}}>Loading matches...</p>}
                {error && <p style={{padding: '1rem', color: 'red'}}>{error}</p>}
                {!loading && (
                <table style={tableStyle} className="responsive-admin-table">
                    <thead>
                        <tr>
                            <th style={thStyle}>Title</th>
                            <th style={thStyle}>Entry Fee</th>
                            <th style={thStyle}>Prize</th>
                            <th style={thStyle}>Players</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {matches.map(t => (
                            <tr key={t.id}>
                                <td data-label="Title" style={{...tdStyle, fontWeight: 'bold'}}>{t.title}</td>
                                <td data-label="Entry Fee" style={tdStyle}>{currencySymbol}{t.entry_fee.toFixed(2)}</td>
                                <td data-label="Prize" style={tdStyle}>{currencySymbol}{t.prize_pool.toFixed(2)}</td>
                                <td data-label="Players" style={tdStyle}>{t.players_joined.length} / {t.max_players}</td>
                                <td data-label="Status" style={tdStyle}><StatusBadge status={t.status} /></td>
                                <td data-label="Actions" style={tdStyle}>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        <button onClick={() => onViewDetails(t)} style={{...buttonStyle, backgroundColor: '#3182ce'}}>Details</button>
                                        <button onClick={() => openModal(t)} style={{...buttonStyle, backgroundColor: '#4299e1'}}>Edit</button>
                                        <button onClick={() => handleDelete(t.id)} style={{...buttonStyle, backgroundColor: '#f56565'}}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {matches.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{textAlign: 'center', padding: '2rem', color: '#666'}}>No matches found.</td>
                            </tr>
                        )}
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
                        <h2>{editingTournament ? 'Edit Match' : 'Create Match'}</h2>
                        <form onSubmit={handleSubmit} style={{display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr'}}>
                            <div><label style={labelStyle} htmlFor="entry_fee">Entry Fee</label><input style={inputStyle} type="number" name="entry_fee" id="entry_fee" value={formState.entry_fee} onChange={handleFormChange} required min="0" step="0.01" /></div>
                            <div><label style={labelStyle} htmlFor="prize_pool">Prize Pool</label><input style={inputStyle} type="number" name="prize_pool" id="prize_pool" value={formState.prize_pool} onChange={handleFormChange} required min="0" step="0.01" /></div>
                            <div><label style={labelStyle} htmlFor="max_players">Max Players</label><input style={inputStyle} type="number" name="max_players" id="max_players" value={formState.max_players} onChange={handleFormChange} required min="2" /></div>
                            <div>
                                <label style={labelStyle} htmlFor="status">Status</label>
                                <select style={inputStyle} name="status" id="status" value={formState.status} onChange={handleFormChange}>
                                    <option value="UPCOMING">Upcoming</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="UNDER_REVIEW">Under Review</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>
                            <div style={{gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem'}}>
                                <button type="button" onClick={closeModal} style={{...buttonStyle, backgroundColor: '#718096'}}>Cancel</button>
                                <button type="submit" style={{...buttonStyle, backgroundColor: '#48bb78'}}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MatchManagement;