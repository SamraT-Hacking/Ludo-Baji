import React, { useState, useRef, useLayoutEffect } from 'react';
import { type Player, type Piece as PieceType, PieceState, PlayerColor } from '../types';
import { LudoBoardSVG } from '../assets';
import Piece from './Piece';
import Dice from './Dice';
import PlayerInfo from './PlayerInfo';
import { PATH_COORDINATES, HOME_YARD_COORDINATES, FINISH_LANE_COORDINATES, FINISH_POSITION_START, SAFE_SPOTS } from '../constants';
import { getMovementPath } from '../utils/path';
import { playCaptureSound } from '../utils/sound';

interface BoardProps {
  players: Player[];
  movablePieces: number[];
  onPieceClick: (pieceId: number) => void;
  diceValue: number | null;
  onRollDice: () => void;
  canRoll: boolean;
  setAnimating: (status: boolean) => void;
  isAnimating: boolean;
  isRolling: boolean;
  currentPlayerIndex: number;
}

type VisualPiece = PieceType & { captured?: boolean };

const getPieceCoords = (piece: PieceType): [number, number] => {
  if (piece.state === PieceState.Home) {
    const pieceIndex = piece.id % 4;
    const baseCoords = HOME_YARD_COORDINATES[piece.color][pieceIndex];
    return [baseCoords[0], baseCoords[1]];
  }
  if (piece.state === PieceState.Finished) {
    const coords = FINISH_LANE_COORDINATES[piece.color][FINISH_POSITION_START + 5];
    return [coords[0] + 0.5, coords[1] + 0.5];
  }
  if (piece.position >= FINISH_POSITION_START) {
    const coords = FINISH_LANE_COORDINATES[piece.color][piece.position];
    return [coords[0] + 0.5, coords[1] + 0.5];
  }
  
  const coords = PATH_COORDINATES[piece.position];
  return coords ? [coords[0] + 0.5, coords[1] + 0.5] : [0, 0];
};


const Board: React.FC<BoardProps> = ({ players, movablePieces, onPieceClick, diceValue, onRollDice, canRoll, setAnimating, isAnimating, isRolling, currentPlayerIndex }) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(600);
  const [visualPieces, setVisualPieces] = useState<VisualPiece[]>([]);
  const [localIsAnimating, setLocalIsAnimating] = useState(false);
  
  useLayoutEffect(() => {
    if (!isAnimating && !localIsAnimating) {
        setVisualPieces(players.flatMap(p => p.pieces));
    }
  }, [players, isAnimating, localIsAnimating]);

  useLayoutEffect(() => {
    const boardElement = boardRef.current;
    if (!boardElement) return;

    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            setBoardSize(entry.contentRect.width);
        }
    });

    resizeObserver.observe(boardElement);
    setBoardSize(boardElement.offsetWidth); // Initial size

    return () => resizeObserver.unobserve(boardElement);
  }, []);

  const pieceSize = boardSize / 15 * 0.8;
  const infoCardSize = boardSize / 15 * 5;

  const handlePieceClick = async (pieceId: number) => {
    if (localIsAnimating || isAnimating || !movablePieces.includes(pieceId) || !diceValue) return;

    const pieceToAnimate = players.flatMap(p => p.pieces).find(p => p.id === pieceId);
    if (!pieceToAnimate) return;

    setLocalIsAnimating(true);
    setAnimating(true);

    const path = getMovementPath(pieceToAnimate, diceValue);
    const destinationPosition = path.length > 0 ? path[path.length - 1] : -1;

    let capturedPieceId: number | null = null;
    if (destinationPosition > 0 && destinationPosition < FINISH_POSITION_START && !SAFE_SPOTS.includes(destinationPosition)) {
        const opponents = players.filter(p => p.color !== pieceToAnimate.color);
        const opponentOnSquare = opponents.flatMap(p => p.pieces).find(p => p.state === PieceState.Active && p.position === destinationPosition);
        if (opponentOnSquare) {
            capturedPieceId = opponentOnSquare.id;
        }
    }

    const animationStep = async (pos: number, isLastStep: boolean) => {
        setVisualPieces(currentPieces =>
            currentPieces.map(p =>
                p.id === pieceId ? { ...p, position: pos, state: PieceState.Active } : p
            )
        );
        await new Promise(r => setTimeout(r, 150));

        if (isLastStep && capturedPieceId !== null) {
            playCaptureSound();
            setVisualPieces(currentPieces =>
                currentPieces.map(p =>
                    p.id === capturedPieceId ? { ...p, captured: true } : p
                )
            );
            await new Promise(r => setTimeout(r, 300)); // Wait for capture animation to play out
        }
    };
    
    // Animate step-by-step
    for (let i = 0; i < path.length; i++) {
        const position = path[i];
        const isLastStep = i === path.length - 1;
        await animationStep(position, isLastStep);
    }

    // After animation, commit the move to the game state
    onPieceClick(pieceId);
    
    // Release animation lock after a short delay to allow state to update
    setTimeout(() => {
        setAnimating(false);
        setLocalIsAnimating(false);
    }, 300);
  };
  
  const boardContainerStyle: React.CSSProperties = {
      position: 'relative',
      width: '100%',
      maxWidth: 'var(--board-max-width)',
      aspectRatio: '1 / 1',
      margin: '0 auto',
  };

  const currentPlayer = players[currentPlayerIndex];

  return (
    <div ref={boardRef} style={boardContainerStyle}>
      <div dangerouslySetInnerHTML={{ __html: LudoBoardSVG }} style={{width: '100%', height: '100%'}}/>
      {players.map((player, index) => {
        const isCurrent = index === currentPlayerIndex;
        const cardContainerStyle: React.CSSProperties = {
            position: 'absolute',
            width: `${infoCardSize}px`,
            height: `${infoCardSize}px`,
            zIndex: 1,
            pointerEvents: 'none',
            transform: 'translate(-50%, -50%)',
        };
        switch (player.color) {
            case PlayerColor.Red:
                cardContainerStyle.top = `${(3 / 15) * 100}%`;
                cardContainerStyle.left = `${(3 / 15) * 100}%`;
                break;
            case PlayerColor.Green:
                cardContainerStyle.top = `${(12 / 15) * 100}%`;
                cardContainerStyle.left = `${(3 / 15) * 100}%`;
                break;
            case PlayerColor.Yellow:
                cardContainerStyle.top = `${(12 / 15) * 100}%`;
                cardContainerStyle.left = `${(12 / 15) * 100}%`;
                break;
            case PlayerColor.Blue:
                cardContainerStyle.top = `${(3 / 15) * 100}%`;
                cardContainerStyle.left = `${(12 / 15) * 100}%`;
                break;
        }
        return (
          <div key={player.color} style={cardContainerStyle}>
            <PlayerInfo 
              player={player} 
              isCurrent={isCurrent}
              boardSize={boardSize}
            />
          </div>
        );
      })}
      {visualPieces.map((piece) => (
        <Piece
          key={piece.id}
          piece={piece}
          onClick={handlePieceClick}
          isMovable={movablePieces.includes(piece.id) && !isAnimating}
          coords={getPieceCoords(piece)}
          size={pieceSize}
        />
      ))}
       <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 20,
      }}>
          <Dice value={diceValue} onRoll={onRollDice} canRoll={canRoll} boardSize={boardSize} isRolling={isRolling} currentPlayerColor={currentPlayer?.color} />
      </div>
    </div>
  );
};

export default Board;