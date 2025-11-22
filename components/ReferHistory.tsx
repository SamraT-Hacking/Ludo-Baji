
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../utils/supabase';
import { AppConfigContext } from '../App';

interface ReferHistoryProps {}

interface Referral {
    id: string;
    username: string;
    joinDate: string;
    earnings: number;
}

const ReferHistory: React.FC<ReferHistoryProps> = () => {
    const { currencySymbol } = useContext(AppConfigContext);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReferralHistory = useCallback(async () => {
        if (!supabase) return;

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await (supabase.auth as any).getUser();
            if (!user) throw new Error("User not found");

            // Fetch users referred by the current user
            const { data: referredUsers, error: usersError } = await supabase
                .from('profiles')
                .select('id, username, created_at')
                .eq('referred_by', user.id);
            if (usersError) throw usersError;

            if (!referredUsers || referredUsers.length === 0) {
                setReferrals([]);
                setLoading(false);
                return;
            }

            // Fetch referral bonus transactions for the current user
            const { data: bonusTransactions, error: bonusError } = await supabase
                .from('transactions')
                .select('amount, source_user_id')
                .eq('user_id', user.id)
                .eq('type', 'REFERRAL_BONUS');
            if (bonusError) throw bonusError;
            
            // Map earnings to each source user
            const earningsMap = new Map<string, number>();
            bonusTransactions.forEach(t => {
                if (t.source_user_id) {
                    const currentEarnings = earningsMap.get(t.source_user_id) || 0;
                    earningsMap.set(t.source_user_id, currentEarnings + Number(t.amount));
                }
            });

            const referralData = referredUsers.map(ref => ({
                id: ref.id,
                username: ref.username || "Unknown User",
                joinDate: ref.created_at || new Date().toISOString(),
                earnings: earningsMap.get(ref.id) || 0,
            })).sort((a,b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime());

            setReferrals(referralData);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReferralHistory();
    }, [fetchReferralHistory]);
    
    useEffect(() => {
        if (!supabase) return;
        const channel = supabase.channel('refer-history-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, fetchReferralHistory) // New referrals
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, fetchReferralHistory) // New bonuses
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchReferralHistory]);

    return (
        <div>
            <header className="contest-header" style={{top: 'var(--header-height)'}}>
                <button className="back-button" onClick={() => window.history.back()}>&larr;</button>
                <h1>Refer History</h1>
            </header>

            <div className="refer-history-list" style={{ marginTop: '1rem', padding: '1rem' }}>
                {loading && <div style={{textAlign: 'center', padding: '2rem'}}>Loading history...</div>}
                {error && <p style={{ color: 'red', textAlign: 'center', padding: '1rem' }}>Error: {error}</p>}

                {!loading && (
                    referrals.length > 0 ? referrals.map((ref, index) => (
                        <div key={ref.id} className="refer-history-item">
                            <div className="serial">
                                #{String(index + 1).padStart(2, '0')}
                            </div>
                            <div className="user-info">
                                <div className="name">{ref.username}</div>
                                <div className="date">
                                    Referred: {new Date(ref.joinDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="earnings">
                                {currencySymbol}{ref.earnings.toFixed(2)}
                            </div>
                        </div>
                    )) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#666', backgroundColor: 'var(--white)', borderRadius: '12px' }}>
                            You haven't referred anyone yet.
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default ReferHistory;
