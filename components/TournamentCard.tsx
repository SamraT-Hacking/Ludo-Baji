import React, { useContext } from 'react';
import { Tournament } from '../types';
import { AppConfigContext } from '../App';
import { useLanguage } from '../contexts/LanguageContext';

interface TournamentCardProps {
    tournament: Tournament;
    onJoinTournament: (tournament: Tournament) => void;
    userId: string;
    joining: boolean;
    onViewContest: (tournament: Tournament) => void;
    adminCommission: number;
}

const TournamentCard: React.FC<TournamentCardProps> = ({ tournament, onJoinTournament, userId, joining, onViewContest, adminCommission }) => {
    const { currencySymbol } = useContext(AppConfigContext);
    const { t } = useLanguage();

    const {
        title,
        prize_pool,
        entry_fee,
        players_joined,
        max_players,
        status,
        game_code
    } = tournament;

    const progress = (players_joined.length / max_players) * 100;
    const isJoined = players_joined.some(p => p.id === userId);
    const isFull = players_joined.length >= max_players;

    const playerDisplay =
        players_joined.length > 0
            ? players_joined.length === 1
                ? t('card_vs_waiting', '{player} VS Waiting...')
                    .replace('{player}', players_joined[0].name)
                : t('card_vs', '{p1} VS {p2}')
                    .replace('{p1}', players_joined[0].name)
                    .replace('{p2}', players_joined[1].name)
            : null;

    const prizeAfterCommission = prize_pool * (1 - adminCommission / 100);

    const renderButton = () => {
        if (status === 'UPCOMING') {
            return (
                <button
                    className="join-button"
                    onClick={() => onJoinTournament(tournament)}
                    disabled={isJoined || isFull || joining}
                >
                    {joining
                        ? t('card_joining', 'JOINING...')
                        : isJoined
                            ? t('card_joined', 'JOINED')
                            : `${t('card_join', 'JOIN')} - ${currencySymbol}${entry_fee.toFixed(2)}`}
                </button>
            );
        }

        if (status === 'ACTIVE' && isJoined && game_code) {
            return (
                <button
                    className="join-button"
                    onClick={() => onViewContest(tournament)}
                    style={{ backgroundColor: 'var(--primary-red)', color: 'white' }}
                >
                    {t('card_play', 'PLAY')}
                </button>
            );
        }

        return null;
    };

    const getTag = () => {
        if (status === 'UPCOMING') {
            return <div className="card-tag">{t('card_tag_single', 'SINGLE')}</div>;
        }
        if (status === 'ACTIVE') {
            return <div className="card-tag" style={{ backgroundColor: '#4ECCA3' }}>{t('card_tag_live', 'LIVE')}</div>;
        }
        if (status === 'CANCELLED') {
            return <div className="card-tag" style={{ backgroundColor: '#a0aec0' }}>{t('card_tag_canceled', 'Canceled')}</div>;
        }
        return null;
    };

    return (
        <div className="tournament-card">
            <div className="card-content">
                <div className="card-header-container">
                    <p className="card-header">{title}</p>
                    {playerDisplay && <p className="card-players">{playerDisplay}</p>}
                </div>

                <div className="card-details">
                    <span className="prize-info">
                        🏆 {t('card_win_prize', 'Win Prize')}: {currencySymbol}{prizeAfterCommission.toFixed(2)}
                    </span>
                </div>

                <div className="card-footer">
                    <div className="progress-container">
                        <div className="progress-bar">
                            <div className="progress-bar-inner" style={{ width: `${progress}%` }}></div>
                        </div>
                        <span className="progress-text">
                            {t('card_joined_count', '{current}/{max} joined')
                                .replace('{current}', players_joined.length.toString())
                                .replace('{max}', max_players.toString())}
                        </span>
                    </div>

                    {renderButton()}
                </div>
            </div>

            {getTag()}
        </div>
    );
};

export default TournamentCard;
