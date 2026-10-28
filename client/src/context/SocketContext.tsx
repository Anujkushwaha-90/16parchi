import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext.js';
import { useToast } from './ToastContext.js';
import { PublicGameState, PrivatePlayerState } from '../types/index.js';
import { sound } from '../services/sound.js';
import confetti from 'canvas-confetti';

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
  currentRoomId: string | null;
  joinRoomSocket: (roomId: string) => void;
  leaveRoomSocket: (roomId: string) => void;
  passCard: (cardId: string) => void;
  declareWin: () => void;
  sendChatMessage: (message: string) => void;
  requestRematch: () => void;
  resetGameState: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [publicState, setPublicState] = useState<PublicGameState | null>(null);
  const [privateState, setPrivateState] = useState<PrivatePlayerState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  const prevCardsCountRef = useRef<number>(4);
  const lastActiveSeatRef = useRef<number>(-1);

  useEffect(() => {
    const token = localStorage.getItem('parchi_token');
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    s.on('connect', () => {
      console.log('⚡ Socket connected to server');
      setIsConnected(true);
      if (currentRoomId) {
        s.emit('room:join', { roomId: currentRoomId });
        s.emit('game:requestSync', { roomId: currentRoomId });
      }
    });

    s.on('disconnect', () => {
      console.log('⚡ Socket disconnected');
      setIsConnected(false);
    });

    // Handle public game state updates
    s.on('gameState:public', (newState: PublicGameState) => {
      setPublicState(newState);

      // Play turn sound when active seat changes
      if (newState.status === 'ACTIVE' && lastActiveSeatRef.current !== newState.activeSeat) {
        lastActiveSeatRef.current = newState.activeSeat;
        sound.playTick();
      }

      // Check if match concluded with a win
      if (newState.status === 'FINISHED' && newState.rankings.length > 0) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#fbbf24', '#10b981', '#ffffff'],
        });
        sound.playWin();
      }
    });

    // Handle private player hand updates
    s.on('gameState:private', (newPrivateState: PrivatePlayerState) => {
      // Check if received a new card
      if (
        newPrivateState.myHand.length > prevCardsCountRef.current &&
        newPrivateState.status === 'ACTIVE'
      ) {
        sound.playCardReceive();
        showToast('You received a new parchi slip!', 'info');
      }
      prevCardsCountRef.current = newPrivateState.myHand.length;

      setPrivateState(newPrivateState);

      // If user has 4 of a kind, alert with declare sound!
      const mySeat = newPrivateState.seats[newPrivateState.mySeatIndex];
      if (newPrivateState.canDeclare && mySeat && mySeat.finishedRank === null) {
        sound.playDeclare();
        showToast('🎉 You have 4 identical parchis! DECLARE NOW!', 'gold', 'PARCHI BAN GAYI!');
      }
    });

    s.on('game:error', (data: { message: string }) => {
      showToast(data.message, 'error');
    });

    s.on('table:chat', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev.slice(-30), msg]);
    });

    s.on('game:resetToLobby', () => {
      setPublicState(null);
      setPrivateState(null);
      showToast('Host returned game to lobby.', 'info');
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user]);

  const joinRoomSocket = useCallback(
    (roomId: string) => {
      setCurrentRoomId(roomId);
      if (socket && socket.connected) {
        socket.emit('room:join', { roomId });
      }
    },
    [socket]
  );

  const leaveRoomSocket = useCallback(
    (roomId: string) => {
      setCurrentRoomId(null);
      setPublicState(null);
      setPrivateState(null);
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

  const requestRematch = useCallback(() => {
    if (!socket || !currentRoomId) return;
    socket.emit('game:rematch', { roomId: currentRoomId });
  }, [socket, currentRoomId]);

  const resetGameState = useCallback(() => {
    setPublicState(null);
    setPrivateState(null);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        publicState,
        privateState,
        chatMessages,
        currentRoomId,
        joinRoomSocket,
        leaveRoomSocket,
        passCard,
        declareWin,
        sendChatMessage,
        requestRematch,
        resetGameState,
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
