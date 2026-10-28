export type CardTheme = 'royals' | 'seasons' | 'elements' | 'animals' | 'custom';

export interface CustomParchiItem {
  name: string;
  count: number;
  title?: string;
  icon?: string;
  color?: string;
}

export interface CustomDeckConfig {
  isCustom: boolean;
  items: CustomParchiItem[];
}

export interface ParchiCard {
  id: string;
  name: string;
  theme: CardTheme;
  title: string;
  icon: string;
  color: string;
}

export interface PlayerSeat {
  seatIndex: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isBot: boolean;
  isReady: boolean;
  isConnected: boolean;
  hand: ParchiCard[];
  hasPassedInTurn: boolean;
  finishedRank: number | null; // 1, 2, 3, 4
  winningCards: string[] | null;
  declaredAt: number | null;
  lastReceivedCardId?: string;
}

export interface PublicPlayerSeat {
  seatIndex: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isBot: boolean;
  isReady: boolean;
  isConnected: boolean;
  cardCount: number;
  hasPassedInTurn: boolean;
  finishedRank: number | null;
  winningCards: string[] | null;
}

export type MatchStatus = 'LOBBY' | 'DEALING' | 'ACTIVE' | 'FINISHED';

export interface RankingEntry {
  rank: number; // 1, 2, 3, 4
  seatIndex: number;
  userId: string;
  displayName: string;
  avatarUrl: string;
  isBot: boolean;
  cardName: string;
  declaredAt: number;
}

export interface GameLogEntry {
  id: string;
  timestamp: number;
  text: string;
  type: 'DEAL' | 'TRANSFER' | 'WIN' | 'SYSTEM';
}

export interface PublicGameState {
  matchId: string;
  roomId: string;
  roomCode: string;
  theme: CardTheme;
  status: MatchStatus;
  seats: PublicPlayerSeat[];
  activeSeat: number;
  turnNumber: number;
  roundNumber: number;
  turnTimeSeconds: number;
  timeRemaining: number;
  rankings: RankingEntry[];
  lastTransfer: { fromSeat: number; toSeat: number; timestamp: number } | null;
  logs: GameLogEntry[];
  playerCount: number;
  customDeckConfig?: CustomDeckConfig | null;
}

export interface PrivatePlayerState extends PublicGameState {
  mySeatIndex: number;
  myHand: ParchiCard[];
  canPass: boolean;
  canDeclare: boolean;
  isMyTurn: boolean;
}
