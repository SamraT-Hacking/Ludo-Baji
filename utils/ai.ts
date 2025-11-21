import { type Player, type Piece, PieceState } from '../types';
import { TOTAL_PATH_LENGTH, START_POSITIONS, PRE_HOME_POSITIONS, SAFE_SPOTS, FINISH_POSITION_START, HOME_STRETCH_LENGTH } from '../constants';

interface MoveOption {
    pieceId: number;
    score: number;
    description: string;
}

// Heuristic scores
const SCORES = {
    CAPTURE: 100,
    FINISH_PIECE: 80,
    MOVE_OUT_OF_HOME: 60,
    LAND_ON_SAFE_SPOT: 40,
    FORM_BLOCKADE: 55,
    PROGRESS: 1, // 1 point per step
    DANGER_PENALTY: -35,
    HUNTING_BONUS: 15,
    BREAK_BLOCKADE_PENALTY: -20,
};

const getNewPositionInfo = (piece: Piece, diceValue: number): { position: number, state: PieceState } => {
    if (piece.state === PieceState.Home && diceValue === 6) {
        return { position: START_POSITIONS[piece.color], state: PieceState.Active };
    }

    if (piece.state === PieceState.Active) {
        const currentPos = piece.position;
        const preHomePos = PRE_HOME_POSITIONS[piece.color];

        if (currentPos >= FINISH_POSITION_START) { 
            const homeStretchPos = currentPos - FINISH_POSITION_START;
            const newHomeStretchPos = homeStretchPos + diceValue;
             if (newHomeStretchPos === HOME_STRETCH_LENGTH - 1) {
                return { position: FINISH_POSITION_START + newHomeStretchPos, state: PieceState.Finished };
            }
             if (newHomeStretchPos < HOME_STRETCH_LENGTH) {
                return { position: FINISH_POSITION_START + newHomeStretchPos, state: PieceState.Active };
            }
        } else {
            const distToPreHome = (preHomePos - currentPos + TOTAL_PATH_LENGTH) % TOTAL_PATH_LENGTH;
            if (diceValue > distToPreHome) { 
                const homeStretchPos = diceValue - distToPreHome - 1;
                if (homeStretchPos < HOME_STRETCH_LENGTH) {
                    const newPos = FINISH_POSITION_START + homeStretchPos;
                    if (homeStretchPos === HOME_STRETCH_LENGTH - 1) {
                        return { position: newPos, state: PieceState.Finished };
                    }
                    return { position: newPos, state: PieceState.Active };
                }
            } else {
                const newPosRaw = (currentPos + diceValue) % TOTAL_PATH_LENGTH;
                const newPos = newPosRaw === 0 ? TOTAL_PATH_LENGTH : newPosRaw;
                return { position: newPos, state: PieceState.Active };
            }
        }
    }
    return { position: piece.position, state: piece.state };
};


export const calculateBestMove = (currentPlayer: Player, allPlayers: Player[], diceValue: number, movablePieceIds: number[]): number => {
    const movablePieces = currentPlayer.pieces.filter(p => movablePieceIds.includes(p.id));
    const moveOptions: MoveOption[] = [];
    const opponents = allPlayers.filter(p => p.color !== currentPlayer.color);

    for (const piece of movablePieces) {
        let score = 0;
        let description = `Move piece ${piece.id}: `;
        
        const isPartOfBlockade = piece.state === PieceState.Active && currentPlayer.pieces.some(p => p.id !== piece.id && p.position === piece.position);
        const { position: newPos, state: newState } = getNewPositionInfo(piece, diceValue);

        if (newState === piece.state && newPos === piece.position) continue; // Invalid move (e.g. overshooting home)

        if (newState === PieceState.Finished) {
            score += SCORES.FINISH_PIECE;
            description += `Finish piece (+${SCORES.FINISH_PIECE}). `;
        }
        
        if (piece.state === PieceState.Home) {
            score += SCORES.MOVE_OUT_OF_HOME;
            description += `Move out of home (+${SCORES.MOVE_OUT_OF_HOME}). `;
        }

        if(piece.state === PieceState.Active && piece.position < FINISH_POSITION_START) {
            score += diceValue * SCORES.PROGRESS;
            description += `Progress (+${diceValue * SCORES.PROGRESS}). `;
            score += (piece.position / TOTAL_PATH_LENGTH) * 10; // Bonus for moving advanced pieces
            description += `Advanced bonus. `;
        }
        

        if(newState === PieceState.Active && newPos < FINISH_POSITION_START) {
            let isDangerous = false;
            let isHunting = false;
            
            opponents.forEach(opponent => {
                opponent.pieces.forEach(oppPiece => {
                    if (oppPiece.state === PieceState.Active && oppPiece.position === newPos) {
                        score += SCORES.CAPTURE;
                        description += `Capture (+${SCORES.CAPTURE}). `;
                    }
                    for (let d = 1; d <= 6; d++) {
                        const { position: oppFuturePos } = getNewPositionInfo(oppPiece, d);
                        if(oppFuturePos === newPos) {
                            isDangerous = true;
                        }
                    }
                    if (oppPiece.state === PieceState.Active) {
                        const distance = (oppPiece.position - newPos + TOTAL_PATH_LENGTH) % TOTAL_PATH_LENGTH;
                        if (distance > 0 && distance <= 6) {
                            isHunting = true;
                        }
                    }
                });
            });

            if (isHunting) {
                score += SCORES.HUNTING_BONUS;
                description += `Hunting bonus (+${SCORES.HUNTING_BONUS}). `;
            }

            if (SAFE_SPOTS.includes(newPos)) {
                score += SCORES.LAND_ON_SAFE_SPOT;
                description += `Land on safe spot (+${SCORES.LAND_ON_SAFE_SPOT}). `;
            } else {
                if(isDangerous) {
                    score += SCORES.DANGER_PENALTY;
                    description += `Risk of capture (${SCORES.DANGER_PENALTY}). `;
                }
            }

            const willFormBlockade = currentPlayer.pieces.some(p => p.id !== piece.id && p.position === newPos);
            if (willFormBlockade) {
                score += SCORES.FORM_BLOCKADE;
                description += `Form blockade (+${SCORES.FORM_BLOCKADE}). `;
            } else if (isPartOfBlockade) {
                score += SCORES.BREAK_BLOCKADE_PENALTY;
                description += `Break blockade (${SCORES.BREAK_BLOCKADE_PENALTY}). `;
            }
        }

        moveOptions.push({ pieceId: piece.id, score, description });
    }

    if (moveOptions.length === 0) {
        return movablePieceIds[0];
    }
    
    moveOptions.sort((a, b) => b.score - a.score);
    
    // console.log("AI Decision for", currentPlayer.color, "with dice", diceValue);
    // console.table(moveOptions);

    return moveOptions[0].pieceId;
};