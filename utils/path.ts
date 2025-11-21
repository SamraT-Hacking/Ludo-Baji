import { Piece, PieceState } from '../types';
import { PRE_HOME_POSITIONS, TOTAL_PATH_LENGTH, FINISH_POSITION_START, START_POSITIONS, HOME_STRETCH_LENGTH } from '../constants';

export function getMovementPath(piece: Piece, diceValue: number): number[] {
    const path: number[] = [];
    if (piece.state === PieceState.Home && diceValue === 6) {
        return [START_POSITIONS[piece.color]];
    }

    if (piece.state !== PieceState.Active) return [];

    let currentPos = piece.position;
    for (let i = 0; i < diceValue; i++) {
        if (currentPos >= FINISH_POSITION_START) {
            const homeStretchPos = currentPos - FINISH_POSITION_START;
            if (homeStretchPos >= HOME_STRETCH_LENGTH - 1) {
                // At the end of the home stretch, cannot move further.
                break;
            }
            currentPos++;
        } else if (currentPos === PRE_HOME_POSITIONS[piece.color]) {
            currentPos = FINISH_POSITION_START;
        } else {
            currentPos = (currentPos % TOTAL_PATH_LENGTH) + 1;
        }
        path.push(currentPos);
    }

    // The game logic checks for invalid moves (like overshooting home).
    // This function assumes a valid move is being animated.
    return path;
}
