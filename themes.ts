
import { PlayerColor } from './types';

export type ThemeName = 'classic' | 'modern';

export interface Theme {
  [key: string]: string;
}

const classicColors = {
    red: '#FF6B6B',
    green: '#4ECCA3',
    yellow: '#FFD166',
    blue: '#1E90FF',
    redPiece: '#D32F2F',
    greenPiece: '#388E3C',
    yellowPiece: '#FBC02D',
    bluePiece: '#1976D2',
    redPath: '#FFB8B8',
    greenPath: '#A7E9C9',
    yellowPath: '#FFE9B3',
    bluePath: '#B3D9FF',
    path: '#F7F7F7',
    safe: '#E0E0E0',
    pathStroke: '#333',
    background: '#e8f4f8',
    white: 'white',
    black: 'black',
};

export const themes: Record<ThemeName, Theme> = {
  classic: {
    '--red-base': classicColors.red,
    '--green-base': classicColors.green,
    '--yellow-base': classicColors.yellow,
    '--blue-base': classicColors.blue,
    '--red-path': classicColors.redPath,
    '--green-path': classicColors.greenPath,
    '--yellow-path': classicColors.yellowPath,
    '--blue-path': classicColors.bluePath,
    '--piece-color-red': classicColors.redPiece,
    '--piece-color-green': classicColors.greenPiece,
    '--piece-color-yellow': classicColors.yellowPiece,
    '--piece-color-blue': classicColors.bluePiece,
    '--player-info-bg-red': classicColors.red,
    '--player-info-text-red': classicColors.white,
    '--player-info-bg-green': classicColors.green,
    '--player-info-text-green': classicColors.white,
    '--player-info-bg-yellow': classicColors.yellow,
    '--player-info-text-yellow': classicColors.black,
    '--player-info-bg-blue': classicColors.blue,
    '--player-info-text-blue': classicColors.white,
    '--path-color': classicColors.path,
    '--safe-color': classicColors.safe,
    '--path-stroke-color': classicColors.pathStroke,
    '--app-background': 'var(--bg-main)', // Changed to use semantic CSS variable
  },
  modern: {
    '--red-base': '#e57373',
    '--green-base': '#81c784',
    '--yellow-base': '#fff176',
    '--blue-base': '#64b5f6',
    '--red-path': '#ef9a9a',
    '--green-path': '#a5d6a7',
    '--yellow-path': '#fff59d',
    '--blue-path': '#90caf9',
    '--piece-color-red': '#c62828',
    '--piece-color-green': '#2e7d32',
    '--piece-color-yellow': '#f9a825',
    '--piece-color-blue': '#1565c0',
    '--player-info-bg-red': '#e57373',
    '--player-info-text-red': '#212121',
    '--player-info-bg-green': '#81c784',
    '--player-info-text-green': '#212121',
    '--player-info-bg-yellow': '#fff176',
    '--player-info-text-yellow': '#212121',
    '--player-info-bg-blue': '#64b5f6',
    '--player-info-text-blue': '#212121',
    '--path-color': '#fafafa',
    '--safe-color': '#eeeeee',
    '--path-stroke-color': '#bdbdbd',
    '--app-background': 'var(--bg-main)', // Changed to use semantic CSS variable
  },
};
