import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { View } from '../App';
import { TrophyIconSVG } from '../assets/icons';

interface ReferLeaderboardProps {}

interface LeaderboardEntry {
    id: string;
    username: string;
    total_refers: number;
}

type LeaderboardPeriod = 'all_time' | 'monthly' | 'weekly';

const ReferLeaderboard: React.FC<ReferLeaderboardProps> = () => {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<LeaderboardPeriod>('all_time');

    const fetchLeaderboard = useCallback(async (period: LeaderboardPeriod) => {
        if (!supabase) return;
        setLoading(true);
        setError(null);

        try {
            const { data, error: rpcError } = await supabase.rpc('get_referral_leaderboard', { period });

            if (rpcError) throw rpcError;

            setLeaderboard(data || []);
        } catch (err: any) {
            setError(err.message);
            console.error("Error fetching referral leaderboard:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaderboard(activeFilter);
    }, [activeFilter, fetchLeaderboard]);

    const filters: { id: LeaderboardPeriod; label: string }[] = [
        { id: 'all_time', label: 'All Time' },
        { id: 'monthly', label: 'Monthly' },
        { id: 'weekly', label: 'Weekly' },
    ];

    const getRankClass = (index: number) => {
        if (index === 0) return 'rank-1';
        if (index === 1) return 'rank-2';
        if (index === 2) return 'rank-3';
        return '';
    };

    return (
        <div className="refer-leaderboard-page">
            <header className="contest-header" style={{ top: 'var(--header-height)' }}>
                <button className="back-button" onClick={() => window.history.back()}>&larr;</button>
                <h1>Refer Leaderboard</h1>
            </header>

            <div className="page-content">
                <div className="refer-leaderboard-filters">
                    {filters.map(filter => (
                        <button
                            key={filter.id}
                            className={`filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
                            onClick={() => setActiveFilter(filter.id)}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {loading && <div style={{ textAlign: 'center', padding: '2rem' }}>Loading leaderboard...</div>}
                {error && <p style={{ color: 'red', textAlign: 'center', padding: '1rem' }}>Error: {error}</p>}

                {!loading && (
                    <div className="refer-leaderboard-list-card">
                        {leaderboard.length > 0 ? (
                            <ul className="refer-leaderboard-list">
                                {leaderboard.map((player, index) => (
                                    <li key={player.id} className={`refer-leaderboard-item ${getRankClass(index)}`}>
                                        <div className="rank-cell">
                                            {index < 3 ? <span dangerouslySetInnerHTML={{ __html: TrophyIconSVG() }} /> : `#${index + 1}`}
                                        </div>
                                        <div className="user-cell">{player.username}</div>
                                        <div className="refers-cell">
                                            <span>Total Refers:</span> <strong>{player.total_refers}</strong>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                                No referral data found for this period.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReferLeaderboard;