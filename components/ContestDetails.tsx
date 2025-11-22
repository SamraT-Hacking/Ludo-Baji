
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Tournament, TournamentResult } from '../types';
import { supabase } from '../utils/supabase';
import { v4 as uuidv4 } from 'uuid';
import { AppConfigContext } from '../App';
import { useLanguage } from '../contexts/LanguageContext';

interface ContestDetailsProps {
  tournament: Tournament;
  onPlayNow: (gameCode: string) => void;
  userId: string;
  adminCommission: number;
}

const ContestDetails: React.FC<ContestDetailsProps> = ({
  tournament,
  onPlayNow,
  userId,
  adminCommission
}) => {

  const { currencySymbol } = useContext(AppConfigContext);
  const { t } = useLanguage();

  const { title, prize_pool, game_code, players_joined } = tournament;

  const [selectedResult, setSelectedResult] = useState<'WIN' | 'LOSE' | 'CANCELLED' | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<TournamentResult | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [rules, setRules] = useState('');

  // Fetch submitted result
  const fetchSubmittedResult = useCallback(async () => {
      if (!supabase) return;

      const { data } = await supabase
        .from('tournament_results')
        .select('*')
        .eq('tournament_id', tournament.id)
        .eq('user_id', userId)
        .single();

      if (data) setSubmittedResult(data);
  }, [tournament.id, userId]);

  // Load initial data and subscribe to updates
  useEffect(() => {
    if (['ACTIVE', 'UNDER_REVIEW', 'COMPLETED'].includes(tournament.status)) {
      fetchSubmittedResult();
    }
    
    if (!supabase) return;
    const channel = supabase.channel(`contest-details-${tournament.id}`)
      .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'tournament_results', 
          filter: `tournament_id=eq.${tournament.id}`
      }, (payload) => {
          // If this user's result changed (e.g. admin edit), refresh
          if ((payload.new as any).user_id === userId) {
              fetchSubmittedResult();
          }
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [tournament.id, tournament.status, userId, fetchSubmittedResult]);

  // Load rules
  useEffect(() => {
    const fetchRules = async () => {
      if (!supabase) return;

      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'rules_and_policy')
        .single();

      if (data && data.value?.text) {
        setRules(data.value.text);
      } else {
        setRules(
          "1. All games must follow fair play rules.\n" +
          "2. Cheating or using third-party tools results in permanent ban.\n" +
          "3. Winnings are added after successful match completion."
        );
      }
    };

    fetchRules();
  }, []);

  const me = players_joined.find(p => p.id === userId);
  const opponent = players_joined.find(p => p.id !== userId);
  const opponentName = opponent ? opponent.name : 'Player 2';

  const prizeAfterCommission = prize_pool * (1 - adminCommission / 100);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setScreenshotFile(e.target.files[0]);
    }
  };

  const handleSubmitResult = async () => {
    if (!selectedResult) {
      alert(t('contest_select_result', 'Please select a result.'));
      return;
    }

    if (selectedResult === 'CANCELLED' && !cancelReason.trim()) {
      alert(t('contest_cancel_reason_required', 'Please provide a reason for cancellation.'));
      return;
    }

    if ((selectedResult === 'WIN' || selectedResult === 'CANCELLED') && !screenshotFile) {
      alert(t('contest_screenshot_required', 'Please upload a screenshot as proof.'));
      return;
    }

    setSubmitting(true);
    setSubmitMessage(null);

    try {
      let screenshotUrl: string | null = null;

      if (screenshotFile) {
        const ext = screenshotFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${ext}`;
        const filePath = `${tournament.id}/${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('result-screenshots')
          .upload(filePath, screenshotFile);

        if (uploadError) throw uploadError;

        const { data: urlData } =
          supabase.storage.from('result-screenshots').getPublicUrl(filePath);

        screenshotUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase.rpc('submit_tournament_result', {
        p_tournament_id: tournament.id,
        p_result: selectedResult,
        p_reason: selectedResult === 'CANCELLED' ? cancelReason.trim() : null,
        p_screenshot_url: screenshotUrl
      });

      if (error) throw error;

      setSubmitMessage(data);

      fetchSubmittedResult(); // Refresh result

    } catch (err: any) {
      setSubmitMessage(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const hasSubmitted = !!submittedResult;

  const isSubmitDisabled =
    submitting ||
    tournament.status !== 'ACTIVE' ||
    !selectedResult ||
    (selectedResult === 'CANCELLED' && !cancelReason.trim()) ||
    ((selectedResult === 'WIN' || selectedResult === 'CANCELLED') && !screenshotFile);

  return (
    <div className="contest-details-page">

      {/* Header */}
      <header className="contest-header">
        <button className="back-button" onClick={() => window.history.back()}>
          &larr;
        </button>
        <h1>{t('contest_title', 'Contest Details')}</h1>
      </header>

      <div className="contest-body">

        {/* Matchup Card */}
        <div className="matchup-card">
          <h2 className="matchup-title">{title}</h2>

          <div className="matchup-players">
            <div className="player-display">
              <div className="player-avatar" style={{ borderColor: '#4ECCA3', color: '#388E3C' }}>
                <span>{(me ? me.name : 'You').charAt(0)}</span>
              </div>
              <span className="player-name">{me ? me.name : 'You'}</span>
            </div>

            <div className="vs-separator">VS</div>

            <div className="player-display">
              <div className="player-avatar" style={{ borderColor: '#FF6B6B', color: '#D32F2F' }}>
                <span>{opponentName.charAt(0)}</span>
              </div>
              <span className="player-name">{opponentName}</span>
            </div>
          </div>

          <div className="prize-highlight">
            <p className="prize-title">{t('contest_win_prize', 'WINNING PRIZE')}</p>
            <p className="prize-amount">
              {currencySymbol}{prizeAfterCommission.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Submit Result Section */}
        {(tournament.status === 'ACTIVE' ||
          tournament.status === 'UNDER_REVIEW' ||
          tournament.status === 'COMPLETED') && (

          <div className="submit-result-card">
            <h2>
              {hasSubmitted
                ? t('contest_your_result', 'Your Result')
                : t('contest_submit_result', 'Submit Result')}
            </h2>

            {hasSubmitted ? (
              <div>
                <p>
                  {t('contest_you_submitted', 'You submitted:')}{' '}
                  <strong>{submittedResult.result}</strong>
                </p>

                {submittedResult.reason && (
                  <p>{t('contest_reason', 'Reason:')} {submittedResult.reason}</p>
                )}

                {submittedResult.screenshot_url && (
                  <a
                    href={submittedResult.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('contest_view_screenshot', 'View Screenshot')}
                  </a>
                )}

                <p className="waiting-text">
                  {t('contest_waiting_review', 'Waiting for opponent or admin review.')}
                </p>
              </div>
            ) : (
              <>
                <div className="result-options">
                  <button
                    className={`result-option-btn ${selectedResult === 'WIN' ? 'active win' : ''}`}
                    onClick={() => setSelectedResult('WIN')}
                  >
                    {t('contest_result_win', 'WIN')}
                  </button>

                  <button
                    className={`result-option-btn ${selectedResult === 'LOSE' ? 'active lose' : ''}`}
                    onClick={() => setSelectedResult('LOSE')}
                  >
                    {t('contest_result_lose', 'LOSE')}
                  </button>

                  <button
                    className={`result-option-btn ${selectedResult === 'CANCELLED' ? 'active cancelled' : ''}`}
                    onClick={() => setSelectedResult('CANCELLED')}
                  >
                    {t('contest_result_cancelled', 'CANCELLED')}
                  </button>
                </div>

                {selectedResult === 'CANCELLED' && (
                  <textarea
                    className="cancellation-reason"
                    placeholder={t(
                      'contest_cancel_reason_placeholder',
                      'Please provide a reason for cancellation...'
                    )}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                )}

                {(selectedResult === 'WIN' || selectedResult === 'CANCELLED') && (
                  <div className="screenshot-upload-area">
                    <label htmlFor="screenshot">
                      {screenshotFile
                        ? t('contest_change_screenshot', 'Change Screenshot')
                        : t('contest_upload_screenshot', 'Upload Screenshot Proof')}
                    </label>
                    <input type="file" id="screenshot" accept="image/*" onChange={handleFileSelect} />

                    {screenshotFile && (
                      <p className="screenshot-preview">{screenshotFile.name}</p>
                    )}
                  </div>
                )}

                {tournament.status !== 'ACTIVE' && (
                  <p className="inactive-msg">
                    {t(
                      'contest_no_longer_active',
                      'This match is no longer active for result submission.'
                    )}
                  </p>
                )}

                <button
                  className="submit-result-btn"
                  onClick={handleSubmitResult}
                  disabled={isSubmitDisabled}
                >
                  {submitting
                    ? t('contest_submitting', 'Submitting...')
                    : t('contest_submit_btn', 'Submit')}
                </button>
              </>
            )}

            {submitMessage && (
              <p
                className="submit-message"
                style={{ color: submitMessage.startsWith('Error') ? 'red' : 'green' }}
              >
                {submitMessage}
              </p>
            )}
          </div>
        )}

        {/* Rules Section */}
        <div className="rules-section">
          <h2>{t('contest_rules_title', 'Rules & Policy')}</h2>

          <ol>
            {rules
              .split('\n')
              .map((rule, i) => rule.trim() && <li key={i}>{rule.replace(/^\d+\.\s*/, '')}</li>)}
          </ol>
        </div>
      </div>

      {/* Footer Play Button */}
      {game_code && tournament.status === 'ACTIVE' && (
        <footer className="contest-footer">
          <button
            className="play-now-button"
            onClick={() => onPlayNow(game_code)}
          >
            {t('contest_play_now', 'PLAY NOW')}
          </button>
        </footer>
      )}
    </div>
  );
};

export default ContestDetails;
