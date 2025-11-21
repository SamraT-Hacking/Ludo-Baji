
import React from 'react';
import Board from './Board';
import Timer from './Timer';
import Chat from './Chat';
import { type GameState, GameStatus, Player } from '../types';
import { TURN_TIME_LIMIT } from '../constants';
import GameOverModal from './GameOverModal';

interface GameProps {
  state: GameState;
  rollDice: () => void;
  movePiece: (pieceId: number) => void;
  setAnimating: (status: boolean) => void;
  resetGame: () => void;
  playerId: string | null;
  forceSync?: () => void;
  sendChatMessage: (text: string) => void;
}

const Game: React.FC<GameProps> = ({ state, rollDice, movePiece, setAnimating, resetGame, playerId, forceSync, sendChatMessage }) => {
  if (state.gameStatus === GameStatus.Setup) return null;

  const currentPlayer = state.players[state.currentPlayerIndex];
  const isMyTurn = currentPlayer?.playerId === playerId;
  const isHost = state.hostId === playerId;

  const canRoll = state.gameStatus === GameStatus.Playing && 
                  state.diceValue === null && 
                  isMyTurn && 
                  !state.isAnimating && 
                  !state.isRolling;

  const showTimer = state.gameStatus === GameStatus.Playing && isMyTurn;

  const handleLeaveGame = () => {
    if (window.confirm('Are you sure you want to leave the game? This will count as a loss.')) {
      resetGame();
    }
  };
  
  const topInfoStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: '0.5rem',
      minHeight: '60px',
      padding: '0 10px',
  };

  const controlButtonStyle: React.CSSProperties = {
      padding: '0.5rem 1rem',
      fontSize: '0.9rem',
      backgroundColor: 'rgba(231, 30, 84, 0.8)',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      fontWeight: 'bold'
  };

  return (
    <div className="game-layout">

      <div className="board-wrapper">
        <div style={topInfoStyle}>
            <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{
                  fontSize: 'clamp(1.1rem, 4vw, 1.3rem)',
                  fontWeight: 'bold',
                  minHeight: '1.5em',
                  color: 'var(--white)',
                  margin: 0,
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                }}>{state.gameStatus === GameStatus.Playing ? state.message : ' '}</p>
            </div>
            {showTimer && <Timer timeLeft={state.turnTimeLeft} timeLimit={TURN_TIME_LIMIT} />}
        </div>
        <Board
          players={state.players}
          movablePieces={isMyTurn ? (state.movablePieces || []) : []}
          onPieceClick={movePiece}
          diceValue={state.diceValue}
          onRollDice={rollDice}
          canRoll={canRoll}
          setAnimating={setAnimating}
          isAnimating={state.isAnimating}
          isRolling={state.isRolling}
          currentPlayerIndex={state.currentPlayerIndex}
        />
        
        <div style={{
            width: '100%', 
            marginTop: '10px', 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '10px', 
            flexWrap: 'wrap',
            padding: '0 10px 10px 10px'
        }}>
            {state.gameStatus === GameStatus.Playing && (
                <button onClick={handleLeaveGame} style={controlButtonStyle}>
                    Leave Game
                </button>
            )}
            
            {isHost && forceSync && (
                <button onClick={forceSync} style={{...controlButtonStyle, backgroundColor: '#ff9800'}} title="Click if game gets stuck">
                    Host: Force Unstick
                </button>
            )}
        </div>

      </div>
      
      <div className="chat-wrapper">
          <Chat
            messages={state.chatMessages || []}
            onSendMessage={sendChatMessage}
            players={state.players}
            currentPlayerId={playerId}
          />
      </div>

      {state.gameStatus === GameStatus.Finished && (
        <GameOverModal
          winner={state.winner}
          players={state.players}
          onReset={resetGame}
          gameId={state.gameId}
        />
      )}
    </div>
  );
};

export default Game;