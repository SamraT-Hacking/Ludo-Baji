import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { Tournament, TournamentStatus, TournamentPlayer } from '../../types';

const TournamentManagement: React.FC = () => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<TournamentStatus | 'ALL'>('UPCOMING');
    
    // Modal state for Create/Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
    const [formState, setFormState] = useState({
        entry_fee: 0,
        prize_pool: 0,
        max_players: 2,
        status: 'UPCOMING' as TournamentStatus,
    });
    
    // Modal state for Dispute Resolution
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
    const [resolvingTournament, setResolvingTournament] = useState<Tournament | null>(null);
    const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);


    const fetchTournaments = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            let query = supabase
                .from('tournaments')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (statusFilter !== 'ALL') {
                query = query.eq('status', statusFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setTournaments(data || []);
        } catch (e: any) {
            setError("Failed to load tournaments.");
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchTournaments();
    }, [fetchTournaments]);

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
                 const { error } = await supabase.from('tournaments').insert([{
                    game_number: 1,
                    title: `Match #1`,
                    entry_fee: formState.entry_fee,
                    prize_pool: formState.prize_pool,
                    max_players: formState.max_players,
                    status: 'UPCOMING',
                }]);
                if (error) throw error;
            }
            fetchTournaments();
            closeModal();
        } catch (e: any) {
            alert(`Error saving tournament: ${e.message}`);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (!supabase) return;
        if (window.confirm("Are you sure you want to delete this tournament? This cannot be undone.")) {
            try {
                const { error } = await supabase.from('tournaments').delete().eq('id', id);
                if (error) throw error;
                fetchTournaments();
            } catch (e: any) {
                alert(`Error deleting tournament: ${e.message}`);
            }
        }
    };
    
    const openResolveModal = (tournament: Tournament) => {
        setResolvingTournament(tournament);
        setIsResolveModalOpen(true);
    };

    const closeResolveModal = () => {
        setIsResolveModalOpen(false);
        setResolvingTournament(null);
        setSelectedWinnerId(null);
    };

    const handleResolveDispute = async () => {
        if (!supabase || !resolvingTournament || !selectedWinnerId) {
            alert('Please select a winner.');
            return;
        }

        try {
            const { data, error } = await supabase.rpc('admin_resolve_dispute', {
                p_tournament_id: resolvingTournament.id,
                p_winner_id: selectedWinnerId
            });

            if (error) throw error;
            
            if (typeof data === 'string' && data.startsWith('Error:')) {
                throw new Error(data);
            }

            alert('Dispute resolved successfully!');
            fetchTournaments();
            closeResolveModal();

        } catch (e: any) {
            alert(`Error resolving dispute: ${e.message}`);
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
        } else { // UNDER_REVIEW
            style.backgroundColor = '#feebc8'; style.color = '#9c4221';
        }
        return <span style={style}>{status === 'UNDER_REVIEW' ? 'REVIEW' : status}</span>;
    };
    
    const filters: (TournamentStatus | 'ALL')[] = ['ALL', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'UNDER_REVIEW', 'CANCELLED'];
    const filterLabels: Record<TournamentStatus | 'ALL', string> = {
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
                <h1 className="admin-page-header" style={{ marginBottom: 0 }}>Tournament Templates</h1>
                <button onClick={() => openModal()} style={{...buttonStyle, backgroundColor: '#48bb78'}}>Add Template</button>
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
                {loading && <p style={{padding: '1rem'}}>Loading tournaments...</p>}
                {error && <p style={{padding: '1rem', color: 'red'}}>{error}</p>}
                {!loading && (
                <table style={tableStyle} className="responsive-admin-table">
                    <thead>
                        <tr>
                            <th style={thStyle}>Base Title / Match</th>
                            <th style={thStyle}>Entry Fee</th>
                            <th style={thStyle}>Prize</th>
                            <th style={thStyle}>Players</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tournaments.map(t => (
                            <tr key={t.id}>
                                {/* FIX: Removed usage of `base_title` which no longer exists on the Tournament type. */}
                                <td data-label="Title" style={{...tdStyle, fontWeight: 'bold'}}>
                                    {t.title}
                                </td>
                                <td data-label="Entry Fee" style={tdStyle}>৳{t.entry_fee.toFixed(2)}</td>
                                <td data-label="Prize" style={tdStyle}>৳{t.prize_pool.toFixed(2)}</td>
                                <td data-label="Players" style={tdStyle}>{t.players_joined.length} / {t.max_players}</td>
                                <td data-label="Status" style={tdStyle}><StatusBadge status={t.status} /></td>
                                <td data-label="Actions" style={tdStyle}>
                                    {t.status === 'UNDER_REVIEW' ? (
                                        <button onClick={() => openResolveModal(t)} style={{...buttonStyle, backgroundColor: '#ed8936'}}>Resolve</button>
                                    ) : (
                                        <>
                                            <button onClick={() => openModal(t)} style={{...buttonStyle, backgroundColor: '#4299e1', marginRight: '0.5rem'}}>Edit</button>
                                            <button onClick={() => handleDelete(t.id)} style={{...buttonStyle, backgroundColor: '#f56565'}}>Delete</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                )}
            </div>

            {isModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle} className="admin-modal-content">
                        <h2>{editingTournament ? 'Edit Template' : 'Create Template'}</h2>
                        <form onSubmit={handleSubmit} style={{display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr'}}>
                            <div><label style={labelStyle} htmlFor="entry_fee">Entry Fee</label><input style={inputStyle} type="number" name="entry_fee" id="entry_fee" value={formState.entry_fee} onChange={handleFormChange} required min="0" step="0.01" /></div>
                            <div><label style={labelStyle} htmlFor="prize_pool">Prize Pool</label><input style={inputStyle} type="number" name="prize_pool" id="prize_pool" value={formState.prize_pool} onChange={handleFormChange} required min="0" step="0.01" /></div>
                            <div><label style={labelStyle} htmlFor="max_players">Max Players</label><input style={inputStyle} type="number" name="max_players" id="max_players" value={formState.max_players} onChange={handleFormChange} required min="2" /></div>
                            {editingTournament && (
                                <div>
                                    <label style={labelStyle} htmlFor="status">Status</label>
                                    <select style={inputStyle} name="status" id="status" value={formState.status} onChange={handleFormChange}>
                                        <option value="UPCOMING">Upcoming</option>
                                        <option value="ACTIVE">Active</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>
                            )}
                            <div style={{gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem'}}>
                                <button type="button" onClick={closeModal} style={{...buttonStyle, backgroundColor: '#718096'}}>Cancel</button>
                                <button type="submit" style={{...buttonStyle, backgroundColor: '#48bb78'}}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {isResolveModalOpen && resolvingTournament && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle} className="admin-modal-content">
                        <h2>Resolve Dispute: {resolvingTournament.title}</h2>
                        <p>Please select the winner of the match.</p>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1.5rem 0'}}>
                            {resolvingTournament.players_joined.map((player: TournamentPlayer) => (
                                <label key={player.id} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer'}}>
                                    <input
                                        type="radio"
                                        name="winner"
                                        value={player.id}
                                        checked={selectedWinnerId === player.id}
                                        onChange={() => setSelectedWinnerId(player.id)}
                                    />
                                    {player.name}
                                </label>
                            ))}
                        </div>
                        <div style={{gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem'}}>
                            <button type="button" onClick={closeResolveModal} style={{...buttonStyle, backgroundColor: '#718096'}}>Cancel</button>
                            <button type="button" onClick={handleResolveDispute} disabled={!selectedWinnerId} style={{...buttonStyle, backgroundColor: '#48bb78'}}>Confirm Winner</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TournamentManagement;