
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../utils/supabase';
import { AppConfigContext } from '../App';

// Define the structure for a player in the leaderboard
interface LeaderboardPlayer {
  id: string;
  username: string;
  totalWinnings: number;
}

type LeaderboardPeriod = 'weekly' | 'monthly' | 'all_time';

const Leaderboard: React.FC = () => {
    const { currencySymbol } = useContext(AppConfigContext);
    const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<LeaderboardPeriod>('all_time');

    const fetchLeaderboard = useCallback(async () => {
        if (!supabase) {
            setError("Supabase client is not available.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Step 1: Fetch all user profiles
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, username');
            
            if (profilesError) throw profilesError;

            // Step 2: Fetch winning transactions for the selected period
            let transactionsQuery = supabase
                .from('transactions')
                .select('user_id, amount')
                .eq('type', 'WINNINGS')
                .eq('status', 'COMPLETED');

            if (activeTab !== 'all_time') {
                const date = new Date();
                if (activeTab === 'weekly') {
                    date.setDate(date.getDate() - 7);
                } else if (activeTab === 'monthly') {
                    date.setMonth(date.getMonth() - 1);
                }
                transactionsQuery = transactionsQuery.gte('created_at', date.toISOString());
            }

            const { data: transactionsData, error: transactionsError } = await transactionsQuery;
            if (transactionsError) throw transactionsError;

            // Step 3: Map winnings to user IDs
            const playerWinnings = new Map<string, number>();
            if (transactionsData) {
                transactionsData.forEach(transaction => {
                    if (!transaction.user_id) return;
                    const currentWinnings = playerWinnings.get(transaction.user_id) || 0;
                    playerWinnings.set(transaction.user_id, currentWinnings + Number(transaction.amount));
                });
            }
            
            // Step 4: Combine profiles with their winnings
            const leaderboardData = profilesData.map(profile => ({
                id: profile.id,
                username: profile.username || 'Anonymous',
                totalWinnings: playerWinnings.get(profile.id) || 0,
            }));

            // Step 5: Sort by winnings
            leaderboardData.sort((a, b) => b.totalWinnings - a.totalWinnings);
                
            setLeaderboard(leaderboardData);

        } catch (e: any) {
            setError("Failed to load leaderboard data.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);
    
    // Realtime Subscription
    useEffect(() => {
        if (!supabase) return;
        
        const channel = supabase.channel('leaderboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchLeaderboard())
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => fetchLeaderboard())
            .subscribe();
            
        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchLeaderboard]);
    
    const tabs: { id: LeaderboardPeriod; label: string }[] = [
        { id: 'weekly', label: 'Weekly' },
        { id: 'monthly', label: 'Monthly' },
        { id: 'all_time', label: 'All Time' },
    ];

    return (
        <div>
            <h1 style={{ padding: '0 1rem', marginBottom: 0 }}>Leaderboard</h1>
            <div className="tabs-container" style={{top: 'var(--header-height)'}}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="leaderboard-page page-content">
                {loading && <div style={{textAlign: 'center', padding: '2rem'}}>Loading leaderboard...</div>}
                {error && <div style={{color: 'red', textAlign: 'center', padding: '2rem'}}>{error}</div>}
                
                {!loading && leaderboard.length === 0 && (
                     <div style={{textAlign: 'center', padding: '2rem', color: '#666'}}>No data available for this period.</div>
                )}

                {!loading && leaderboard.length > 0 && (
                    <div className="leaderboard-card">
                        <ul className="leaderboard-list">
                            {leaderboard.map((player, index) => {
                                const rankClass = index < 3 ? `top-rank-${index + 1}` : '';
                                return (
                                    <li key={player.id} className={`leaderboard-list-item ${rankClass}`}>
                                        <div className="rank">{index + 1}</div>
                                        <div className="name">{player.username}</div>
                                        <div className="winnings">{currencySymbol}{player.totalWinnings.toFixed(2)}</div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;
