import React from 'react';
import { PlayerColor } from '../types';

interface DiceProps {
  value: number | null;
  onRoll: () => void;
  canRoll: boolean;
  boardSize: number;
  isRolling: boolean;
  currentPlayerColor?: PlayerColor;
}

// Function to get the color for the dots based on the dice value
const getDotColor = (diceValue: number | null): string => {
    switch (diceValue) {
      case 1:
        return '#4CAF50'; // Green
      case 2:
      case 3:
      case 4:
        return '#2196F3'; // Blue
      case 5:
      case 6:
        return '#F44336'; // Red
      default:
        return '#333'; // Default black for fallback
    }
  };

const Dice: React.FC<DiceProps> = ({ value, onRoll, canRoll, boardSize, isRolling, currentPlayerColor }) => {

  const handleRoll = () => {
    if (canRoll) {
      onRoll();
    }
  };

  const diceSize = boardSize / 6;
  const dotSize = diceSize * 0.22;
  
  const playerColorVar = currentPlayerColor ? `var(--${currentPlayerColor.toLowerCase()}-base)` : 'gold';

  const keyframes = `
    @keyframes spin {
      0% { transform: rotateY(0deg) rotateX(0deg) scale(1); }
      50% { transform: rotateY(360deg) rotateX(360deg) scale(1.2); }
      100% { transform: rotateY(720deg) rotateX(720deg) scale(1); }
    }
  `;

  const diceFaceStyle: React.CSSProperties = {
    width: `${diceSize}px`,
    height: `${diceSize}px`,
    backgroundColor: '#fdfdfd',
    border: `1px solid ${canRoll ? playerColorVar : '#ccc'}`,
    borderRadius: '15%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: canRoll ? 'pointer' : 'not-allowed',
    opacity: canRoll ? 1 : 0.7,
    position: 'relative',
    boxShadow: `
        0 4px 6px rgba(0,0,0,0.1), 
        0 1px 3px rgba(0,0,0,0.08)
        ${canRoll ? `, 0 0 ${diceSize / 4}px ${playerColorVar}` : ''}`,
    animation: isRolling ? 'spin 1s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
    transformStyle: 'preserve-3d',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease',
  };
  
  const dotPositions: Record<number, number[][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [25, 75], [75, 25], [75, 75]],
    5: [[25, 25], [25, 75], [75, 25], [75, 75], [50, 50]],
    6: [[25, 25], [25, 75], [50, 25], [50, 75], [75, 25], [75, 75]],
  };

  const dotColor = getDotColor(value);

  const dotStyle = (pos: number[]): React.CSSProperties => ({
      position: 'absolute',
      left: `${pos[0]}%`,
      top: `${pos[1]}%`,
      width: `${dotSize}px`,
      height: `${dotSize}px`,
      backgroundColor: dotColor,
      borderRadius: '50%',
      transform: 'translate(-50%, -50%)',
      boxShadow: 'inset 0px 1px 3px rgba(0,0,0,0.4)', // Inset shadow for debossed look
  });

  return (
      <>
        <style>{keyframes}</style>
        <div style={diceFaceStyle} onClick={handleRoll}>
            {isRolling ? (
                <span style={{ fontSize: `${diceSize * 0.5}px` }}>🎲</span>
            ) : value && dotPositions[value] ? dotPositions[value].map((pos, i) => (
                <div key={i} style={dotStyle(pos)}></div>
            )) : (
                <span style={{ fontSize: `${diceSize * 0.15}px`, fontWeight: 'bold', color: '#333', textAlign: 'center' }}>{canRoll ? "Roll Dice" : "Waiting..."}</span>
            )}
        </div>
      </>
  );
};

export default Dice;