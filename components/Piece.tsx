import React from 'react';
import { type Piece as PieceType } from '../types';

interface PieceProps {
  piece: PieceType & { captured?: boolean };
  onClick: (id: number) => void;
  isMovable: boolean;
  coords: [number, number];
  size: number;
}

const Piece: React.FC<PieceProps> = ({ piece, onClick, isMovable, coords, size }) => {
  const [x, y] = coords;
  const colorVar = `var(--piece-color-${piece.color.toLowerCase()})`;
  const borderWidth = Math.max(1.5, size * 0.075); // Responsive border

  const pulseAnimation = `
    @keyframes pulse-animation {
      0% {
        transform: translate(-50%, -50%) scale(1);
        box-shadow: 0 0 10px 4px gold;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.08);
        box-shadow: 0 0 15px 7px gold;
      }
      100% {
        transform: translate(-50%, -50%) scale(1);
        box-shadow: 0 0 10px 4px gold;
      }
    }
  `;

  const pieceStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${(x / 15) * 100}%`,
    top: `${(y / 15) * 100}%`,
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: colorVar,
    borderRadius: '50%',
    border: `${borderWidth}px solid ${isMovable ? 'gold' : 'rgba(0,0,0,0.7)'}`,
    boxSizing: 'border-box',
    cursor: isMovable ? 'pointer' : 'default',
    transform: 'translate(-50%, -50%)',
    transition: 'left 0.15s ease-in-out, top 0.15s ease-in-out, width 0.3s ease, height 0.3s ease, transform 0.3s ease-in, opacity 0.3s ease-in',
    boxShadow: isMovable ? '0 0 10px 4px gold' : '2px 2px 4px rgba(0,0,0,0.5)',
    zIndex: 10,
    animation: isMovable ? 'pulse-animation 1.5s infinite ease-in-out' : 'none',
    opacity: 1,
  };

  if (piece.captured) {
    pieceStyle.transform = 'translate(-50%, -50%) scale(0)';
    pieceStyle.opacity = 0;
    pieceStyle.zIndex = 5; // Animate behind other pieces
  }

  return (
    <>
      {isMovable && <style>{pulseAnimation}</style>}
      <div
        style={pieceStyle}
        onClick={() => isMovable && onClick(piece.id)}
        aria-label={`Piece for ${piece.color}, ${isMovable ? 'movable' : ''}`}
        role="button"
        tabIndex={isMovable ? 0 : -1}
      />
    </>
  );
};

export default Piece;