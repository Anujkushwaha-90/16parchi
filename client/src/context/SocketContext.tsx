import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext.js';
import { useToast } from './ToastContext.js';
import { PublicGameState, PrivatePlayerState } from '../types/index.js';
import { sound } from '../services/sound.js';
import { api } from '../services/api.js';
import { tauntService, THROW_ITEMS } from '../services/taunts.js';
import confetti from 'canvas-confetti';

export interface TableTauntEvent {
  id: string;
  senderId: string;
  senderSeatIndex: number;
  senderName: string;
  tauntId: string;
  type: 'voice' | 'throw';
  targetSeatIndex?: number;
  timestamp: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string;
  message: string;
  timestamp: number;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  publicState: PublicGameState | null;
  privateState: PrivatePlayerState | null;
  chatMessages: ChatMessage[];
  latestTaunt: TableTauntEvent | null;
  currentRoomId: string | null;
  joinRoomSocket: (roomId: string) => void;
  leaveRoomSocket: (roomId: string) => void;
  passCard: (cardId: string) => void;
  declareWin: () => void;
  sendChatMessage: (message: string) => void;
  sendTaunt: (tauntId: string, type?: 'voice' | 'throw', targetSeatIndex?: number) => void;
  requestRematch: () => void;
  resetGameState: () => void;
  setGameStates: (publicState: PublicGameState | null, privateState: PrivatePlayerState | null) => void;
  syncGameState: (roomCode: string) => Promise<boolean>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const getSocketUrl = (): string => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && window.location.hostname !== '127.0.0.1') {
    return 'https://server-delta-wheat.vercel.app';
  }
  return envUrl || 'http://localhost:4000';
};

const SOCKET_URL = getSocketUrl();

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [publicState, setPublicState] = useState<PublicGameState | null>(null);
  const [privateState, setPrivateState] = useState<PrivatePlayerState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [latestTaunt, setLatestTaunt] = useState<TableTauntEvent | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const currentRoomIdRef = useRef<string | null>(null);

  const prevCardsCountRef = useRef<number>(4);
  const lastActiveSeatRef = useRef<number>(-1);
  const celebratedMatchIdRef = useRef<string | null>(null);
  const celebratedPersonalWinMatchRef = useRef<string | null>(null);
  const prevCanDeclareRef = useRef<boolean>(false);

  const triggerVictoryCelebration = useCallback((particleCount = 120) => {
    confetti({
      particleCount,
      spread: 85,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#fbbf24', '#10b981', '#ffffff'],
    });
    setTimeout(() => {
      confetti({
        particleCount: Math.round(particleCount * 0.6),
        angle: 60,
        spread: 60,
        origin: { x: 0.1, y: 0.65 },
        colors: ['#f59e0b', '#fbbf24', '#10b981', '#ffffff'],
      });
      confetti({
        particleCount: Math.round(particleCount * 0.6),
        angle: 120,
        spread: 60,
        origin: { x: 0.9, y: 0.65 },
        colors: ['#f59e0b', '#fbbf24', '#10b981', '#ffffff'],
      });
    }, 180);
  }, []);

  const mergePublicState = useCallback(
    (prev: PublicGameState | null, next: PublicGameState): PublicGameState => {
      if (!prev || next.matchId !== prev.matchId) return next;
      if (next.status === 'FINISHED' && prev.status !== 'FINISHED') return next;
      if (prev.status === 'FINISHED' && next.status !== 'FINISHED') return prev;
      if (next.turnNumber < prev.turnNumber) return prev;
      if (
        next.turnNumber === prev.turnNumber &&
        (next.rankings?.length || 0) < (prev.rankings?.length || 0)
      ) {
        return prev;
      }
      return next;
    },
    []
  );

  const handleStateSideEffects = useCallback((state: PublicGameState) => {
    if (state.status === 'ACTIVE' && lastActiveSeatRef.current !== state.activeSeat) {
      lastActiveSeatRef.current = state.activeSeat;
      sound.playTick();
    }

    if (
      state.status === 'FINISHED' &&
      state.rankings.length > 0 &&
      celebratedMatchIdRef.current !== state.matchId
    ) {
      celebratedMatchIdRef.current = state.matchId;
      triggerVictoryCelebration(100);
      sound.playWin();
    }
  }, [triggerVictoryCelebration]);

  useEffect(() => {
    const token = localStorage.getItem('parchi_token');
    if (!user?.id || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    s.on('connect', () => {
      console.log('⚡ Socket connected to server');
      setIsConnected(true);
      const activeRoomId = currentRoomIdRef.current;
      if (activeRoomId) {
        s.emit('room:join', { roomId: activeRoomId });
        s.emit('game:requestSync', { roomId: activeRoomId });
      }
    });

    s.on('disconnect', () => {
      console.log('⚡ Socket disconnected');
      setIsConnected(false);
    });

    // Handle public game state updates
    s.on('gameState:public', (newState: PublicGameState) => {
      setPublicState((prev) => mergePublicState(prev, newState));
      handleStateSideEffects(newState);
    });

    // Handle private player hand updates
    s.on('gameState:private', (newPrivateState: PrivatePlayerState) => {
      const mySeat = newPrivateState.seats[newPrivateState.mySeatIndex];

      // Check if received a new card
      if (
        newPrivateState.myHand.length > prevCardsCountRef.current &&
        newPrivateState.status === 'ACTIVE' &&
        mySeat?.finishedRank === null
      ) {
        sound.playCardReceive();
        showToast('You received a new parchi slip!', 'info');
      }
      prevCardsCountRef.current = newPrivateState.myHand.length;

      setPrivateState((prev) => {
        if (!prev || newPrivateState.matchId !== prev.matchId) return newPrivateState;
        if (newPrivateState.status === 'FINISHED' && prev.status !== 'FINISHED') return newPrivateState;
        if (prev.status === 'FINISHED' && newPrivateState.status !== 'FINISHED') return prev;
        if (newPrivateState.turnNumber < prev.turnNumber) return prev;
        return newPrivateState;
      });

      // Keep publicState synced from privateState as well so UI never drifts if a room broadcast was missed
      const {
        mySeatIndex: _mySeatIndex,
        myHand: _myHand,
        canPass: _canPass,
        canDeclare: _canDeclare,
        isMyTurn: _isMyTurn,
        lastReceivedCardId: _lastReceivedCardId,
        ...derivedPublicState
      } = newPrivateState;
      setPublicState((prev) => mergePublicState(prev, derivedPublicState));
      handleStateSideEffects(derivedPublicState);

      // Celebrate immediately when the player completes 4 identical parchis (rank 1..3), even while match continues
      if (
        mySeat?.finishedRank !== null &&
        mySeat?.finishedRank !== undefined &&
        mySeat.finishedRank <= 3 &&
        celebratedPersonalWinMatchRef.current !== newPrivateState.matchId
      ) {
        celebratedPersonalWinMatchRef.current = newPrivateState.matchId;
        sound.playDeclare();
        sound.playWin();
        triggerVictoryCelebration(140);
        const rankLabel =
          mySeat.finishedRank === 1
            ? '1st Place 🏆'
            : mySeat.finishedRank === 2
            ? '2nd Place 🥈'
            : '3rd Place 🥉';
        showToast(`4 identical parchis complete! You finished in ${rankLabel}!`, 'gold', '16 PARCHI!');
      }

      // If user has 4 of a kind in an active game, alert with declare sound on transition
      const isDeclarable = Boolean(
        newPrivateState.status === 'ACTIVE' &&
          newPrivateState.canDeclare &&
          mySeat &&
          mySeat.finishedRank === null
      );
      if (isDeclarable && !prevCanDeclareRef.current) {
        sound.playDeclare();
        showToast('🎉 You have 4 identical parchis! DECLARE NOW!', 'gold', 'PARCHI BAN GAYI!');
      }
      prevCanDeclareRef.current = isDeclarable;
    });

    s.on('game:error', (data: { message: string }) => {
      showToast(data.message, 'error');
    });

    s.on('table:chat', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev.slice(-30), msg]);
    });

    s.on('table:taunt', (event: TableTauntEvent) => {
      setLatestTaunt(event);
      // Sender plays audio immediately inside click handler for instant user-gesture playback
      if (event.senderId !== user?.id) {
        if (event.type === 'voice') {
          tauntService.playVoiceTaunt(event.tauntId);
        } else if (event.type === 'throw') {
          const item = THROW_ITEMS.find((t) => t.id === event.tauntId);
          if (item) {
            tauntService.playThrowSfx(item.sfx);
          }
        }
      }
    });

    s.on('game:resetToLobby', () => {
      setPublicState(null);
      setPrivateState(null);
      prevCardsCountRef.current = 4;
      lastActiveSeatRef.current = -1;
      prevCanDeclareRef.current = false;
      celebratedPersonalWinMatchRef.current = null;
      showToast('Host returned game to lobby.', 'info');
    });

    s.on('friend:request_received', (data: any) => {
      showToast(`New friend request from ${data?.user?.displayName || 'a player'}!`, 'info');
      try { sound.playTick(); } catch { }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user?.id, mergePublicState, handleStateSideEffects, triggerVictoryCelebration]);

  const joinRoomSocket = useCallback(
    (roomId: string) => {
      setCurrentRoomId(roomId);
      currentRoomIdRef.current = roomId;
      if (socket && socket.connected) {
        socket.emit('room:join', { roomId });
        socket.emit('game:requestSync', { roomId });
      }
    },
    [socket]
  );

  const leaveRoomSocket = useCallback(
    (roomId: string) => {
      setCurrentRoomId(null);
      currentRoomIdRef.current = null;
      setPublicState(null);
      setPrivateState(null);
      prevCardsCountRef.current = 4;
      lastActiveSeatRef.current = -1;
      prevCanDeclareRef.current = false;
      celebratedPersonalWinMatchRef.current = null;
      if (socket && socket.connected) {
        socket.emit('room:leave', { roomId });
      }
    },
    [socket]
  );

  const passCard = useCallback(
    (cardId: string) => {
      if (!socket || !currentRoomId) return;
      sound.playCardPass();
      socket.emit('game:passCard', { roomId: currentRoomId, cardId });
    },
    [socket, currentRoomId]
  );

  const declareWin = useCallback(() => {
    if (!socket || !currentRoomId) return;
    sound.playDeclare();
    socket.emit('game:declare', { roomId: currentRoomId });
  }, [socket, currentRoomId]);

  const sendChatMessage = useCallback(
    (message: string) => {
      if (!socket || !currentRoomId || !message.trim()) return;
      sound.playClick();
      socket.emit('table:chat', { roomId: currentRoomId, message });
    },
    [socket, currentRoomId]
  );

  const sendTaunt = useCallback(
    (tauntId: string, type: 'voice' | 'throw' = 'voice', targetSeatIndex?: number) => {
      if (!socket || !currentRoomId) return;
      socket.emit('table:taunt', {
        roomId: currentRoomId,
        tauntId,
        type,
        targetSeatIndex,
      });
    },
    [socket, currentRoomId]
  );

  const requestRematch = useCallback(() => {
    if (!socket || !currentRoomId) return;
    socket.emit('game:rematch', { roomId: currentRoomId });
  }, [socket, currentRoomId]);

  const resetGameState = useCallback(() => {
    setPublicState(null);
    setPrivateState(null);
    prevCardsCountRef.current = 4;
    lastActiveSeatRef.current = -1;
    prevCanDeclareRef.current = false;
    celebratedPersonalWinMatchRef.current = null;
  }, []);

  const setGameStates = useCallback(
    (pub: PublicGameState | null, priv: PrivatePlayerState | null) => {
      if (pub) {
        setPublicState((prev) => mergePublicState(prev, pub));
      }
      if (priv) {
        setPrivateState((prev) => {
          if (!prev || priv.matchId !== prev.matchId) return priv;
          if (priv.status === 'FINISHED' && prev.status !== 'FINISHED') return priv;
          if (prev.status === 'FINISHED' && priv.status !== 'FINISHED') return prev;
          if (priv.turnNumber < prev.turnNumber) return prev;
          return priv;
        });
      }
    },
    [mergePublicState]
  );

  const syncGameState = useCallback(
    async (roomCode: string): Promise<boolean> => {
      try {
        const res = await api.getGameState(roomCode);
        if (res && res.success && res.publicState) {
          setGameStates(res.publicState, res.privateState || null);
          return true;
        }
      } catch (err) {
        console.warn('Game state sync notice:', err);
      }
      return false;
    },
    [setGameStates]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        publicState,
        privateState,
        chatMessages,
        latestTaunt,
        currentRoomId,
        joinRoomSocket,
        leaveRoomSocket,
        passCard,
        declareWin,
        sendChatMessage,
        sendTaunt,
        requestRematch,
        resetGameState,
        setGameStates,
        syncGameState,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useGameSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useGameSocket must be used within SocketProvider');
  return context;
};
