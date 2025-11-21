import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { Tournament, TournamentResult, ArchivedChatMessage, GameTurnActivity, TournamentPlayer } from '../../types';

interface MatchDetailsProps {
    match: Tournament;
    onBack: () => void;
}

const MatchDetails: React.FC<MatchDetailsProps> = ({ match, onBack }) => {
    const [results, setResults] = useState<TournamentResult[]>([]);
    const [chat, setChat] = useState<ArchivedChatMessage[]>([]);
    const [turns, setTurns] = useState<GameTurnActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    
    // State for new actions
    const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);

    const fetchChat = useCallback(async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('tournament_id', match.id)
                .order('created_at', { ascending: true });
            if (error) throw error;
            setChat(data || []);
        } catch (err) {
            console.error("Failed to fetch chat in real-time:", err);
        }
    }, [match.id]);

    const fetchTurns = useCallback(async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('game_turn_history')
                .select('*')
                .eq('tournament_id', match.id)
                .order('created_at', { ascending: true });
            if (error) throw error;
            setTurns(data || []);
        } catch (err) {
            console.error("Failed to fetch turns in real-time:", err);
        }
    }, [match.id]);

    useEffect(() => {
        if (!supabase) return;

        const fetchResults = async () => {
            const { data, error } = await supabase
                .from('tournament_results')
                .select('*, profiles(username)')
                .eq('tournament_id', match.id);
            if (error) throw error;
            setResults(data as any[] || []);
        };
        
        const fetchAllInitialData = async () => {
            setLoading(true);
            try {
                await Promise.all([fetchResults(), fetchChat(), fetchTurns()]);
            } catch (error: any) {
                console.error("Error fetching match details:", error);
                setMessage(`Error: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchAllInitialData();

        const channel = supabase.channel(`match-details-${match.id}`)
          .on('postgres_changes', { 
              event: '*', schema: 'public', table: 'chat_messages', filter: `tournament_id=eq.${match.id}`
            }, () => fetchChat())
          .on('postgres_changes', { 
              event: '*', schema: 'public', table: 'game_turn_history', filter: `tournament_id=eq.${match.id}`
            }, () => fetchTurns())
           // Listen for tournament status changes to update UI after an action
          .on('postgres_changes', { 
              event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${match.id}`
            }, (payload) => onBack()) // Go back to refresh the list and see status change
          .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [match.id, fetchChat, fetchTurns, onBack]);

    const handleCancelMatch = async () => {
        if (!supabase || !window.confirm("Are you sure you want to cancel this match and refund all players? This action cannot be undone.")) {
            return;
        }
        setCancelling(true);
        setMessage(null);
        try {
            const { data, error } = await supabase.rpc('admin_cancel_match', { p_tournament_id: match.id });
            if (error) throw error;
            if (typeof data === 'string' && data.startsWith('Error:')) throw new Error(data);
            setMessage(data);
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        } finally {
            setCancelling(false);
        }
    };
    
    const handleResolveDispute = async () => {
        if (!supabase || !selectedWinnerId) {
            alert('Please select a winner to resolve the match.');
            return;
        }
        setIsSubmittingAction(true);
        setMessage(null);
        try {
            const { data, error } = await supabase.rpc('admin_resolve_dispute', {
                p_tournament_id: match.id,
                p_winner_id: selectedWinnerId
            });
            if (error) throw error;
            if (typeof data === 'string' && data.startsWith('Error:')) throw new Error(data);
            setMessage(data || 'Match resolved successfully!');
        } catch (error: any) {
            setMessage(`Error resolving match: ${error.message}`);
        } finally {
            setIsSubmittingAction(false);
        }
    };

    const handleClawbackWinnings = async () => {
        if (!supabase || !window.confirm(
            "ARE YOU SURE?\n\nThis will reverse the payout, take the winnings back from the winner's wallet, and set the match status back to 'UNDER_REVIEW'.\n\nThis action cannot be easily undone."
        )) {
            return;
        }
        setIsSubmittingAction(true);
        setMessage(null);
        try {
            const { data, error } = await supabase.rpc('admin_clawback_winnings', { p_tournament_id: match.id });
            if (error) throw error;
            if (typeof data === 'string' && data.startsWith('Error:')) throw new Error(data);
            setMessage(data || 'Winnings clawed back successfully.');
        } catch (error: any) {
            setMessage(`Error during clawback: ${error.message}`);
        } finally {
            setIsSubmittingAction(false);
        }
    };

    const isCancellable = match.status === 'ACTIVE' || match.status === 'UPCOMING' || match.status === 'UNDER_REVIEW';
    const canBeResolved = match.status === 'UNDER_REVIEW' || match.status === 'COMPLETED';
    const canBeClawedBack = match.status === 'COMPLETED';

    return (
        <div>
            <div className="match-details-header">
                <button className="match-details-back-btn" onClick={onBack} aria-label="Back to match list">&larr;</button>
                <h1 className="match-details-title">{match.title}</h1>
            </div>

            {message && <p style={{ padding: '1rem', borderRadius: '8px', backgroundColor: message.startsWith('Error') ? '#fed7d7' : '#c6f6d5', color: message.startsWith('Error') ? '#c53030' : '#2f855a' }}>{message}</p>}

            {match.game_code && (
                <div style={{ 
                    textAlign: 'center', 
                    margin: '0 auto 1.5rem auto', 
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e0',
                    maxWidth: 'fit-content'
                }}>
                    <span style={{ color: '#4a5568', fontWeight: '500', marginRight: '0.5rem' }}>Game Code:</span>
                    <strong style={{
                        fontSize: '1.2rem',
                        color: '#2d3748',
                        fontFamily: 'monospace',
                        letterSpacing: '2px'
                    }}>{match.game_code}</strong>
                </div>
            )}

            {loading ? <p>Loading match details...</p> : (
            <>
                {(canBeResolved || canBeClawedBack) && (
                    <div className="admin-action-card">
                       {canBeResolved && (
                           <div className="action-section">
                               <h3>Resolve Match</h3>
                               <p style={{marginTop: 0, color: '#666'}}>Select the winner to finalize the match, distribute the prize, and update player stats. If the match is already paid, this will have no effect.</p>
                               <div className="resolve-options-container">
                                   {match.players_joined.map((player: TournamentPlayer) => (
                                       <label key={player.id} className="resolve-option-label">
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
                               <button 
                                   onClick={handleResolveDispute} 
                                   disabled={!selectedWinnerId || isSubmittingAction}
                                   className="admin-action-btn resolve"
                               >
                                   {isSubmittingAction ? 'Processing...' : 'Confirm Winner & Pay Prize'}
                               </button>
                           </div>
                       )}
                       {canBeClawedBack && (
                           <div className="action-section">
                               <h3>Reverse Payout (Clawback)</h3>
                               <div className="clawback-warning">
                                    <p><strong>Warning:</strong> This is a destructive action. Use this if a payout was made by mistake. It will remove the winnings from the paid player's wallet and reset the match to "Under Review".</p>
                               </div>
                               <button 
                                   onClick={handleClawbackWinnings}
                                   disabled={isSubmittingAction}
                                   className="admin-action-btn clawback"
                               >
                                   {isSubmittingAction ? 'Reversing...' : 'Reverse Winning Payout'}
                               </button>
                           </div>
                       )}
                    </div>
                )}

                <div className="admin-details-grid">
                    <div className="admin-details-left-col">
                        <div className="admin-matchup-card">
                             <h3>Match Info & Actions</h3>
                            {match.players_joined.map((player, index) => (
                                <div key={player.id} className="log-item">
                                    <strong>Player {index + 1}:</strong> {player.name} <br/>
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                        Joined at: {new Date(player.joined_at).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                             {isCancellable && (
                                 <button 
                                    onClick={handleCancelMatch} 
                                    disabled={cancelling}
                                    style={{
                                        width: '100%', padding: '0.75rem', marginTop: '1rem',
                                        backgroundColor: '#f56565', color: 'white',
                                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem'
                                    }}
                                 >
                                    {cancelling ? 'Cancelling...' : 'Cancel Match & Refund Players'}
                                </button>
                            )}
                        </div>
                        <div className="admin-matchup-card">
                            <h3>Submitted Results</h3>
                            <div className="log-container">
                            {results.length > 0 ? results.map(r => (
                                <div key={r.id} className="log-item">
                                    <strong>{r.profiles.username}:</strong> {r.result}
                                    {r.reason && <p style={{margin: '0.25rem 0', color: '#555'}}><em>Reason: {r.reason}</em></p>}
                                    {r.screenshot_url && <a href={r.screenshot_url} target="_blank" rel="noopener noreferrer" className="screenshot-link">View Screenshot</a>}
                                </div>
                            )) : <div className="log-item">No results submitted yet.</div>}
                            </div>
                        </div>
                    </div>

                    <div className="admin-details-right-col">
                        <div className="admin-logs-card">
                            <div className="log-tabs">
                                <button className="log-tab-btn active">Turn-by-Turn</button>
                            </div>
                            <div className="log-container">
                            {turns.length > 0 ? turns.map(t => (
                                <div key={t.id} className="log-item">
                                    <span className="timestamp">{new Date(t.created_at).toLocaleTimeString()}:</span>
                                    <strong>{t.username || 'System'}:</strong> {t.description}
                                </div>
                            )) : <div className="log-item">No turn activity logged.</div>}
                            </div>
                        </div>
                        <div className="admin-logs-card">
                           <div className="log-tabs">
                                <button className="log-tab-btn active">Chat History</button>
                            </div>
                            <div className="log-container">
                            {chat.length > 0 ? chat.map(c => (
                                <div key={c.id} className="log-item">
                                    <span className="timestamp">{new Date(c.created_at).toLocaleTimeString()}:</span>
                                    <strong>{c.username}:</strong> {c.message_text}
                                </div>
                            )) : <div className="log-item">No chat messages in this game.</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </>
            )}
        </div>
    );
};

export default MatchDetails;