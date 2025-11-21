
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../utils/supabase';
import { Tournament, TournamentStatus } from '../types';
import TournamentCard from './TournamentCard';
import { View, AppConfigContext } from '../App';
import { useLanguage } from '../contexts/LanguageContext';

interface TournamentsProps {
  userId: string;
  setView: (view: View) => void;
  onViewContest: (tournament: Tournament) => void;
}

const Tournaments: React.FC<TournamentsProps> = ({ userId, setView, onViewContest }) => {
  const { currencySymbol } = useContext(AppConfigContext);
  const { t } = useLanguage();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TournamentStatus>('UPCOMING');
  const [joining, setJoining] = useState<string | null>(null);
  const [adminCommission, setAdminCommission] = useState(0);
  
  const fetchData = useCallback(async (tab: TournamentStatus) => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      let query;
      
      if (tab === 'COMPLETED') {
        query = supabase
          .from('tournaments')
          .select('*')
          .in('status', ['COMPLETED', 'CANCELLED']);
      } else {
        query = supabase
          .from('tournaments')
          .select('*')
          .eq('status', tab);
      }
      
      if (tab === 'ACTIVE' || tab === 'COMPLETED' || tab === 'UNDER_REVIEW') {
          query = query.contains('players_joined', JSON.stringify([{id: userId}]));
      }

      const { data: tournamentData, error: tournamentError } = await query.order('created_at', { ascending: false });

      if (tournamentError) throw tournamentError;
      
      const newTournaments = tournamentData || [];
      
      setTournaments(newTournaments);
      
      const { data: commissionData, error: commissionError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'admin_commission_percent')
        .single();
      
      if (commissionData && commissionData.value && typeof (commissionData.value as any).percentage === 'number') {
        setAdminCommission((commissionData.value as any).percentage);
      }

    } catch (e: any) {
      setError(t('tour_load_error', 'Could not load data.'));
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId, t]); 

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData]);
  
  useEffect(() => {
    if (!supabase) return;
      
    const channel = supabase.channel('public:tournaments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, payload => {
          fetchData(activeTab);
      })
      .subscribe();
      
    return () => {
        supabase.removeChannel(channel);
    }
  }, [supabase, activeTab, fetchData]);


  const handleJoinTournament = async (tournament: Tournament) => {
    if (!supabase || joining) return;

    const confirmMsg = t(
      'tour_confirm_join',
      `Are you sure you want to join "${tournament.title}" for ${currencySymbol}${tournament.entry_fee.toFixed(2)}?`
    )
      .replace('{title}', tournament.title)
      .replace('{currency}', currencySymbol)
      .replace('{amount}', tournament.entry_fee.toFixed(2));

    if (!window.confirm(confirmMsg)) return;
    
    setJoining(tournament.id);

    try {
        const { data, error: rpcError } = await supabase.rpc('join_tournament', { 
            tournament_id_to_join: tournament.id 
        });

        if (rpcError) throw rpcError;

        if (data.error) {
            const errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
            if (data.redirect === 'wallet') {
                alert(errorMessage + " " + t('tour_add_funds', "Please add funds to your wallet."));
                setView('wallet');
            } else {
                alert(t('tour_error_join', "Error joining tournament:") + " " + errorMessage);
            }
        } else if (data.success) {
            alert(t('tour_join_success', "Successfully joined the tournament!"));
        }

    } catch (e: any) {
        const errorMessage = e.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
        alert(t('tour_unexpected_error', "An unexpected error occurred:") + " " + errorMessage);
        console.error(e);
    } finally {
        setJoining(null);
    }
  };

  const tabs: TournamentStatus[] = ['UPCOMING', 'ACTIVE', 'COMPLETED', 'UNDER_REVIEW'];
  const tabLabels: Record<TournamentStatus, string> = {
      UPCOMING: t('tour_tab_upcoming', 'UPCOMING'),
      ACTIVE: t('tour_tab_ongoing', 'ONGOING'),
      COMPLETED: t('tour_tab_completed', 'COMPLETED'),
      UNDER_REVIEW: t('tour_tab_review', 'REVIEW'),
      CANCELLED: t('tour_tab_cancelled', 'CANCELLED')
  };

  return (
    <div>
      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`tab-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div className="tournament-list">
        {loading && <p style={{textAlign: 'center'}}>{t('tour_loading', 'Loading tournaments...')}</p>}
        {error && <p style={{color: 'red', textAlign: 'center'}}>{error}</p>}

        {!loading && tournaments.length === 0 && (
          <p style={{color: '#666', textAlign: 'center', marginTop: '2rem'}}>
            {t('tour_no_data', 'No matches found.')}
          </p>
        )}

        {tournaments.map(t => (
          <TournamentCard 
            key={t.id}
            tournament={t}
            onJoinTournament={handleJoinTournament}
            userId={userId}
            joining={joining === t.id}
            onViewContest={onViewContest}
            adminCommission={adminCommission}
          />
        ))}
      </div>
    </div>
  );
};

export default Tournaments;
