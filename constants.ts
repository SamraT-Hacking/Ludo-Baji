import { PlayerColor } from './types';

export const TOTAL_PATH_LENGTH = 52;
export const HOME_STRETCH_LENGTH = 6; // 5 steps + 1 finish spot
export const FINISH_POSITION_START = 100;
export const TURN_TIME_LIMIT = 30;

export const START_POSITIONS: Record<PlayerColor, number> = {
  [PlayerColor.Green]: 1,
  [PlayerColor.Red]: 14,
  [PlayerColor.Yellow]: 40,
  [PlayerColor.Blue]: 27,
};

export const PRE_HOME_POSITIONS: Record<PlayerColor, number> = {
    [PlayerColor.Green]: 51,
    [PlayerColor.Red]: 12,
    [PlayerColor.Yellow]: 38,
    [PlayerColor.Blue]: 25,
};

export const SAFE_SPOTS = [1, 9, 14, 22, 27, 35, 40, 48];

// These coordinates are for a 15x15 grid. Path re-numbered as per user request.
export const PATH_COORDINATES: { [key: number]: [number, number] } = {
    1: [6, 13], 2: [6, 12], 3: [6, 11], 4: [6, 10], 5: [6, 9],
    6: [5, 8], 7: [4, 8], 8: [3, 8], 9: [2, 8], 10: [1, 8],
    11: [0, 8], 12: [0, 7], 13: [0, 6],
    14: [1, 6], 15: [2, 6], 16: [3, 6], 17: [4, 6], 18: [5, 6],
    19: [6, 5], 20: [6, 4], 21: [6, 3], 22: [6, 2], 23: [6, 1],
    24: [6, 0], 25: [7, 0], 26: [8, 0],
    27: [8, 1], 28: [8, 2], 29: [8, 3], 30: [8, 4], 31: [8, 5],
    32: [9, 6], 33: [10, 6], 34: [11, 6], 35: [12, 6], 36: [13, 6],
    37: [14, 6], 38: [14, 7], 39: [14, 8],
    40: [13, 8], 41: [12, 8], 42: [11, 8], 43: [10, 8], 44: [9, 8],
    45: [8, 9], 46: [8, 10], 47: [8, 11], 48: [8, 12], 49: [8, 13],
    50: [8, 14], 51: [7, 14], 52: [6, 14],
};

// Home stretch lanes
export const FINISH_LANE_COORDINATES: Record<PlayerColor, { [key: number]: [number, number] }> = {
    [PlayerColor.Blue]: {
        100: [7, 1], 101: [7, 2], 102: [7, 3], 103: [7, 4], 104: [7, 5], 105: [7, 6], // Finish-Blue
    },
    [PlayerColor.Red]: {
        100: [1, 7], 101: [2, 7], 102: [3, 7], 103: [4, 7], 104: [5, 7], 105: [6, 7],
    },
    [PlayerColor.Green]: {
        100: [7, 13], 101: [7, 12], 102: [7, 11], 103: [7, 10], 104: [7, 9], 105: [7, 8],  //Green
    },
    [PlayerColor.Yellow]: {
        100: [13, 7], 101: [12, 7], 102: [11, 7], 103: [10, 7], 104: [9, 7], 105: [8, 7],  //Green
    },
};

// Home yards (where pieces start)
export const HOME_YARD_COORDINATES: Record<PlayerColor, [number, number][]> = {
    [PlayerColor.Red]: [[2, 2], [4, 2], [2, 4], [4, 4]],
    [PlayerColor.Green]: [[2, 11], [4, 11], [2, 13], [4, 13]],
    [PlayerColor.Yellow]: [[11, 11], [13, 11], [11, 13], [13, 13]],
    [PlayerColor.Blue]: [[11, 2], [13, 2], [11, 4], [13, 4]],
};
