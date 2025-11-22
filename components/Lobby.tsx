
import React, { useState, useEffect } from 'react';
import { GameState, GameStatus } from '../types';
import { playCountdownBipSound } from '../utils/sound';

interface LobbyProps {
  gameId: string;
  gameState: GameState;
  onStartGame: () => void;
  playerId: string | null;
  onLeave: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ gameId, gameState, onStartGame, playerId, onLeave }) => {
  const isHost = gameState.hostId === playerId;
  const isTournament = gameState.type === 'tournament';
  const maxPlayers = gameState.max_players || 2;
  const canStart = isHost && gameState.gameStatus === GameStatus.Setup && gameState.players.length >= 2;

  const [countdown, setCountdown] = useState<number | null>(null);

  // Effect 1: Initialize countdown when lobby fills
  useEffect(() => {
    // Only start countdown if it's a tournament and lobby is full
    const isFull = isTournament && gameState.players.length === maxPlayers;
    if (isFull && countdown === null) {
        setCountdown(9); // Start countdown from 9 as per request (9,8..0)
    } else if (!isFull) {
        setCountdown(null); // Reset if someone leaves
    }
  }, [isTournament, gameState.players.length, maxPlayers, countdown]);

  // Effect 2: Handle tick and auto-start
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
        playCountdownBipSound();
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
    } else if (countdown === 0) {
        // Countdown finished
        playCountdownBipSound(); // Final beep
        if (isHost) {
            onStartGame();
        }
    }
  }, [countdown, isHost, onStartGame]);

  const copyToClipboard = async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available');
      }
      await navigator.clipboard.writeText(gameId);
      alert('Game Code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy game code:', err);
      alert('Could not copy code automatically. Please copy it manually.');
    }
  };

  const PlayerCard: React.FC<{ player: typeof gameState.players[0] }> = ({ player }) => {
    const colorVar = `var(--${player.color.toLowerCase()}-base)`;
    const textColorVar = ['Yellow'].includes(player.color) ? 'var(--text-dark)' : 'var(--text-light)';
    
    return (
        <div className="lobby-player-card">
            <div className="lobby-player-avatar" style={{ backgroundColor: colorVar, color: textColorVar }}>
                {player.name.charAt(0).toUpperCase()}
            </div>
            <div className="lobby-player-name">
                {player.name}
            </div>
            {player.playerId === playerId && <span className="lobby-player-tag">You</span>}
            {player.isHost && <span className="lobby-player-tag">Host</span>}
        </div>
    );
  };


  return (
    <div className="lobby-page-wrapper">
      <div className="lobby-container-modern">
        {countdown !== null && countdown >= 0 && (
          <div className="countdown-overlay">
            <div className="countdown-number" key={countdown}>
              {countdown}
            </div>
          </div>
        )}
        <h1 className="lobby-header">Game Lobby</h1>

        {!isTournament && (
          <div className="lobby-game-code" onClick={copyToClipboard} title="Copy to clipboard">
            <p className="lobby-game-code-label">Game Code</p>
            <p className="lobby-game-code-value">{gameId}</p>
          </div>
        )}

        <h2 className="lobby-players-header">
          Players ({gameState.players.length}/{maxPlayers})
        </h2>

        <div className="lobby-player-list">
          {gameState.players.map(player => (
            <PlayerCard key={player.playerId} player={player} />
          ))}
          {gameState.players.length < maxPlayers && isTournament && (
            <p className="lobby-waiting-message lobby-waiting-highlight">
              Waiting for opponent...
            </p>
          )}
        </div>

        <div className="lobby-button-container">
          <button onClick={onLeave} className="lobby-button leave">
            Leave
          </button>
          {!isTournament && isHost && (
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className="lobby-button start"
            >
              Start Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
