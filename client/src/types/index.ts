export type CardTheme = 'royals' | 'seasons' | 'elements' | 'animals' | 'custom';

export interface CustomParchiItem {
  id?: string;
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

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  friendCode: string;
  gamesPlayed: number;
  gamesWon: number;
  secondPlaceCount: number;
  thirdPlaceCount: number;
  fourthPlaceCount: number;
  isOnline: boolean;
  createdAt: string;
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

export interface RankingEntry {
  rank: number;
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
  status: 'LOBBY' | 'DEALING' | 'ACTIVE' | 'FINISHED';
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

export interface GameRoom {
  id: string;
  code: string;
  hostId: string;
  status: 'LOBBY' | 'IN_GAME' | 'FINISHED';
  maxPlayers: number;
  cardTheme: CardTheme;
  customDeckJson?: string | null;
  turnTimeSeconds: number;
  host: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  members: Array<{
    id: string;
    roomId?: string;
    userId?: string | null;
    seatIndex: number;
    isReady: boolean;
    isBot: boolean;
    botName?: string;
    botAvatar?: string;
    user?: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string;
      friendCode?: string;
    };
  }>;
}

export interface Friend {
  friendshipId: string;
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  friendCode: string;
  isOnline: boolean;
  gamesPlayed: number;
  gamesWon: number;
}

export interface FriendRequestItem {
  id: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    friendCode: string;
  };
}

export interface RoomInvite {
  id: string;
  roomId: string;
  room: {
    id: string;
    code: string;
    cardTheme: string;
  };
  inviter: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string;
  };
}
