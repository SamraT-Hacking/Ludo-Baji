
export enum PlayerColor {
  Red = 'Red',
  Green = 'Green',
  Blue = 'Blue',
  Yellow = 'Yellow',
}

export enum PlayerType {
  Human = 'Human',
  AI = 'AI',
}

export enum PieceState {
  Home = 'Home',
  Active = 'Active',
  Finished = 'Finished',
}

export enum GameStatus {
    Setup = 'Setup', // Lobby
    Playing = 'Playing',
    Finished = 'Finished',
}

export interface Piece {
  id: number;
  color: PlayerColor;
  state: PieceState;
  position: number; // -1 for home, 0-51 for main path, 100+ for finish path
}

export interface Player {
  id: number; // This is now the player index (0-3)
  playerId: string; // Unique persistent ID for the session
  name: string;
  color: PlayerColor;
  type: PlayerType.Human; // AI is removed for multiplayer
  pieces: Piece[];
  hasFinished: boolean;
  inactiveTurns: number;
  isRemoved: boolean;
  isHost: boolean;
}

export interface ChatMessage {
  id: string;
  game_id?: string;
  game_code?: string;
  playerId: string;
  name: string;
  color: PlayerColor;
  text: string;
  timestamp: number;
  created_at?: string; // For messages fetched from DB
}

export interface ArchivedChatMessage {
    id: string;
    created_at: string;
    tournament_id: string;
    user_id: string;
    username: string;
    message_text: string;
}

export interface GameTurnActivity {
    id: string;
    created_at: string;
    tournament_id: string;
    user_id: string;
    username: string;
    description: string;
}

export interface GameState {
  gameId: string;
  hostId: string;
  type?: 'tournament' | 'manual';
  max_players?: number;
  players: Player[];
  playerOrder: PlayerColor[];
  currentPlayerIndex: number;
  diceValue: number | null;
  gameStatus: GameStatus;
  winner: Player | null;
  message: string;
  movablePieces: number[];
  isAnimating: boolean;
  isRolling: boolean;
  turnTimeLeft: number;
  chatMessages?: ChatMessage[]; // Populated on client from Firebase data
  turn_history?: { userId?: string, name?: string, description: string }[];
}

// PlayerOption is now only used for Lobby display
export interface PlayerOption {
    playerId: string;
    name: string;
    color: PlayerColor;
    isHost: boolean;
}

export interface Profile {
  id: string;
  updated_at: string;
  username: string;
  deposit_balance: number;
  winnings_balance: number;
  wins: number;
  losses: number;
  rating: number;
  is_banned?: boolean;
  role?: string;
  referral_code: string;
  referred_by: string | null;
  mobile?: string; // Added mobile field
  device_id?: string | null; // Added for security
}

export interface TournamentPlayer {
    id: string;
    name: string;
    joined_at: string;
}

export type TournamentStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'UNDER_REVIEW' | 'CANCELLED';

export interface Tournament {
    id: string;
    created_at: string;
    game_number: number;
    title: string;
    entry_fee: number;
    prize_pool: number;
    max_players: number;
    status: TournamentStatus;
    players_joined: TournamentPlayer[];
    game_code: string | null;
}

export enum TransactionType {
    DEPOSIT = 'DEPOSIT',
    WITHDRAWAL = 'WITHDRAWAL',
    ENTRY_FEE = 'ENTRY_FEE',
    WINNINGS = 'WINNINGS',
    REFUND = 'REFUND',
    CLAWBACK = 'CLAWBACK',
    REFERRAL_BONUS = 'REFERRAL_BONUS',
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REJECTED = 'REJECTED',
}

export interface Transaction {
    id: string;
    created_at: string;
    user_id: string;
    amount: number;
    type: TransactionType;
    status: TransactionStatus;
    description: string;
    profiles: { username: string }; // For joining user data
}

export interface Notification {
    id: string;
    created_at: string;
    title: string;
    content: string;
    target_user_ids: string[] | null; // null for all users
    is_read?: boolean; // This will be added on the client-side
}

export interface TournamentResult {
    id: string;
    created_at: string;
    tournament_id: string;
    user_id: string;
    result: 'WIN' | 'LOSE' | 'CANCELLED';
    reason: string | null;
    screenshot_url: string | null;
    profiles: { username: string; }; // Join user data for display
}

export interface HowToPlayVideo {
    id: string;
    created_at: string;
    title: string;
    youtube_url: string;
}

export interface SupportChatMessage {
    id: string;
    created_at: string;
    user_id: string;
    username: string;
    message_text: string;
    sent_by_admin: boolean;
    is_read: boolean;
}

export interface SecurityConfig {
    device_fingerprint: boolean;
    ip_signup_limit: boolean;
    vpn_detection: boolean;
    incognito_block: boolean;
    one_account_per_device: boolean;
    max_signups_per_ip: number;
    vpn_api_key?: string; // Optional API Key for IPInfo or similar
    secure_session_storage: boolean; // Use sessionStorage instead of localStorage
}
