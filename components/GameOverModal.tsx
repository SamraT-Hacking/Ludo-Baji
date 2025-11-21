import React, { useState } from 'react';
import { Player } from '../types';
import { TrophyIconSVG, CopyIconSVG } from '../assets/icons';

interface GameOverModalProps {
  winner: Player | null;
  players: Player[];
  onReset: () => void;
  isArchived?: boolean;
  gameId: string;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ winner, players, onReset, isArchived = false, gameId }) => {
  const [copied, setCopied] = useState(false);

  const getStatus = (player: Player): { text: string; className: string; } => {
    if (winner && player.playerId === winner.playerId) {
      return { text: 'Winner', className: 'winner' };
    }
    if (player.isRemoved) {
      return { text: 'Left', className: 'left' };
    }
    return { text: 'Loser', className: 'loser' };
  };

  const copyGameId = async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available');
      }
      await navigator.clipboard.writeText(gameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy game ID:', err);
      alert('Could not copy code automatically. Please copy it manually.');
    }
  };

  // Sort players to show winner first, then by their original index
  const sortedPlayers = [...players].sort((a, b) => {
    if (winner) {
      if (a.playerId === winner.playerId) return -1;
      if (b.playerId === winner.playerId) return 1;
    }
    const aIndex = players.findIndex(p => p.playerId === a.playerId);
    const bIndex = players.findIndex(p => p.playerId === b.playerId);
    return aIndex - bIndex;
  });

  return (
    <div className="game-over-overlay">
      <div className="game-over-modal">
        <div className="game-over-header">
            {winner ? (
                <div className="winner-highlight">
                    <div className="trophy-icon" dangerouslySetInnerHTML={{ __html: TrophyIconSVG() }} />
                    <h2>{winner.name}</h2>
                    <p>is the winner!</p>
                </div>
            ) : (
                 <div className="no-winner-highlight">
                    <h2>{isArchived ? 'Match Result' : 'Game Over'}</h2>
                </div>
            )}
        </div>

        <div className="game-over-body">
            <h3>Final Standings</h3>
            <ul className="player-results-list">
                {sortedPlayers.map((player) => {
                    const status = getStatus(player);
                    const colorVar = `var(--${player.color.toLowerCase()}-base)`;
                    return (
                        <li key={player.playerId} className="player-result-item">
                            <span className="player-color-dot" style={{ backgroundColor: colorVar }}></span>
                            <span className="player-name">{player.name}</span>
                            <span className={`player-status-badge ${status.className}`}>
                                {status.text}
                            </span>
                        </li>
                    );
                })}
            </ul>

            <div className="game-code-section">
                <span>Game Code</span>
                <strong>{gameId}</strong>
                <button onClick={copyGameId} className="game-code-copy-btn" title="Copy Game Code">
                    <div dangerouslySetInnerHTML={{ __html: CopyIconSVG(copied) }} />
                </button>
            </div>
        </div>
        
        <div className="game-over-footer">
            <button className="game-over-button" onClick={onReset}>
              {isArchived ? 'Close' : 'Back to Lobby'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;