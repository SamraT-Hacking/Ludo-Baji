
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, AppConfigContext } from '../App';
import { supabase } from '../utils/supabase';
import { Profile } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
    setView: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
    const [stats, setStats] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const { currencySymbol } = useContext(AppConfigContext);
    const { t } = useLanguage();

    const fetchUserStats = useCallback(async () => {
        if (!supabase) return;
        const { data: { user }, error: userError } = await (supabase.auth as any).getUser();

        if (userError) {
            console.error("Could not fetch user:", userError.message);
        } else if (user) {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (error) {
                console.error("Could not fetch user profile:", error.message);
            } else if (data) {
                setStats(data);
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchUserStats();
    }, [fetchUserStats]);

    // Realtime subscription
    useEffect(() => {
        if (!supabase) return;
        // We need the user ID to subscribe specifically to their profile, 
        // but since we fetch it in fetchUserStats, we can wait for stats to be populated or get user again.
        // A generic channel for the user's profile is safer.
        
        const setupSubscription = async () => {
            const { data: { user } } = await (supabase as any).auth.getUser();
            if (!user) return;

            const channel = supabase.channel('dashboard-realtime')
                .on('postgres_changes', { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'profiles', 
                    filter: `id=eq.${user.id}` 
                }, (payload) => {
                    setStats(payload.new as Profile);
                })
                // Subscribe to tournaments to update games played if necessary, though profiles usually hold that stat.
                // Profile stats (wins/losses) are updated when a match ends.
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            }
        };
        
        const unsub = setupSubscription();
        return () => { unsub.then(fn => fn && fn()); };
    }, []);
    
    const headerStyle: React.CSSProperties = {
        fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
        marginBottom: '2rem',
        borderBottom: '1px solid #ddd',
        paddingBottom: '1rem',
    };

    const cardContainerStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
    };

    const cardStyle: React.CSSProperties = {
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        textAlign: 'center',
    };
    
    const ctaButtonStyle: React.CSSProperties = {
        padding: '1rem 2rem',
        fontSize: '1.2rem',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    };
    
    const valueStyle: React.CSSProperties = {
        fontSize: '2rem',
        fontWeight: 'bold',
        margin: '0.5rem 0'
    };

    return (
        <div>
            <h1 style={headerStyle}>{t('nav_dashboard', 'Dashboard')}</h1>
            <div style={cardContainerStyle}>
                <div style={cardStyle}>
                    <h3>{t('dash_wallet_balance', 'Wallet Balance')}</h3>
                    <p style={valueStyle}>{currencySymbol}{loading ? '...' : ((stats?.deposit_balance || 0) + (stats?.winnings_balance || 0)).toFixed(2)}</p>
                    <a href="#" onClick={(e) => { e.preventDefault(); setView('wallet'); }} style={{color: '#008CBA'}}>{t('dash_manage_wallet', 'Manage Wallet')}</a>
                </div>
                 <div style={cardStyle}>
                    <h3>{t('dash_current_rating', 'Current Rating')}</h3>
                    <p style={valueStyle}>{loading ? '...' : (stats?.rating || '1000')}</p>
                     <a href="#" onClick={(e) => { e.preventDefault(); setView('leaderboard'); }} style={{color: '#008CBA'}}>{t('dash_view_leaderboard', 'View Leaderboard')}</a>
                </div>
                 <div style={cardStyle}>
                    <h3>{t('dash_games_played', 'Games Played')}</h3>
                    <p style={valueStyle}>{loading ? '...' : ((stats?.wins || 0) + (stats?.losses || 0))}</p>
                    <p style={{color: '#666'}}>W: {stats?.wins || 0} / L: {stats?.losses || 0}</p>
                </div>
            </div>
            <div style={{textAlign: 'center'}}>
                <button 
                  style={ctaButtonStyle} 
                  onClick={() => setView('tournaments')}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
                >
                    {t('dash_find_match', 'Find a Match')}
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
