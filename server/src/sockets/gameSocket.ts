import { markUserConnected, markUserDisconnected, setPresenceIO } from './presence.js';
import { Server, Socket } from 'socket.io';
import { verifyAuthToken } from '../auth/firebase.js';
import { prisma } from '../db.js';
import { GameManager } from '../game/manager.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

export function setupGameSockets(io: Server): void {
  setPresenceIO(io);
  const gameManager = GameManager.getInstance();
  gameManager.setSocketServer(io);

  // Socket authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = await verifyAuthToken(token);
      if (!decoded) {
        return next(new Error('Invalid token'));
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [{ firebaseUid: decoded.uid }, { id: decoded.uid }],
        },
      });

      if (!user) {
        return next(new Error('User profile not found'));
      }

      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Socket authentication error'));
    }
  });

  // Track player rate limits for transfers
  const lastPassTime: Map<string, number> = new Map();

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`🔌 Player connected: ${socket.user.username} (${userId})`);

    // Join private channel for personalized cards and direct invites
    socket.join(`user:${userId}`);
    markUserConnected(userId);

    // Update online presence
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: true, lastSeenAt: new Date() },
      });
    } catch (e) {
      // Non-critical background DB sync failure
    }
    io.emit('presence:update', { userId, isOnline: true });

    /**
     * Join Room socket channel
     */
    socket.on('room:join', async ({ roomId }: { roomId: string }) => {
      if (!roomId) return;
      socket.join(`room:${roomId}`);
      console.log(`User ${socket.user.username} joined room channel: room:${roomId}`);

      // If there is an active match in this room, emit state immediately
      const game = gameManager.getGame(roomId);
      if (game) {
        socket.emit('gameState:public', game.getPublicState());
        const privateState = game.getPrivateStateForPlayer(userId);
        if (privateState) {
          socket.emit('gameState:private', privateState);
        }
      }
    });

    /**
     * Leave Room socket channel
     */
    socket.on('room:leave', ({ roomId }: { roomId: string }) => {
      if (!roomId) return;
      socket.leave(`room:${roomId}`);
    });

    /**
     * Request full authoritative state sync (reconnect / tab refresh)
     */
    socket.on('game:requestSync', ({ roomId }: { roomId: string }) => {
      const game = gameManager.getGame(roomId);
      if (!game) {
        socket.emit('game:notActive', { roomId });
        return;
      }

      socket.emit('gameState:public', game.getPublicState());
      const privateState = game.getPrivateStateForPlayer(userId);
      if (privateState) {
        socket.emit('gameState:private', privateState);
      }
    });

    /**
     * Pass Card to clockwise neighbor
     */
    socket.on(
      'game:passCard',
      async ({ roomId, cardId }: { roomId: string; cardId: string }) => {
        // Rate-limit check (prevent double-clicks, bursts, spamming)
        const now = Date.now();
        const lastTime = lastPassTime.get(userId) || 0;
        if (now - lastTime < 300) {
          socket.emit('game:error', { message: 'Transfer in progress. Please wait a moment.' });
          return;
        }
        lastPassTime.set(userId, now);

        const game = await gameManager.getGameAsync(roomId);
        if (!game) {
          socket.emit('game:error', { message: 'No active match found for this room.' });
          return;
        }

        const result = game.passCard(userId, cardId);
        if (!result.success) {
          socket.emit('game:error', { message: result.error || 'Invalid card transfer.' });
          return;
        }

        // Save to PostgreSQL database immediately to guarantee 100% sync across all instances
        await gameManager.saveGame(game);

        // Broadcast updated states (public to room, private to sender and receiver)
        gameManager.broadcastGameState(roomId);
      }
    );

    /**
     * Declare 16 Parchi Win
     */
    socket.on('game:declare', async ({ roomId }: { roomId: string }) => {
      const game = await gameManager.getGameAsync(roomId);
      if (!game) {
        socket.emit('game:error', { message: 'No active match found.' });
        return;
      }

      const seatIndex = game.seats.findIndex((s) => s.userId === userId);
      if (seatIndex === -1) {
        socket.emit('game:error', { message: 'You are not seated in this match.' });
        return;
      }

      const result = game.declareWin(seatIndex);
      if (!result.success) {
        socket.emit('game:error', { message: result.error || 'Cannot declare win.' });
        return;
      }

      await gameManager.saveGame(game);
      gameManager.broadcastGameState(roomId);
    });

    /**
     * In-game table chat / reaction messages
     */
    socket.on(
      'table:chat',
      ({ roomId, message }: { roomId: string; message: string }) => {
        if (!roomId || !message) return;
        const sanitized = message.trim().substring(0, 100);
        io.to(`room:${roomId}`).emit('table:chat', {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId,
          displayName: socket.user.displayName,
          avatarUrl: socket.user.avatarUrl,
          message: sanitized,
          timestamp: Date.now(),
        });
      }
    );

    /**
     * Rematch vote / return to lobby
     */
    socket.on('game:rematch', async ({ roomId }: { roomId: string }) => {
      const room = await prisma.gameRoom.findUnique({
        where: { id: roomId },
        include: { members: true },
      });

      if (room && room.hostId === userId) {
        gameManager.removeGame(roomId);
        await prisma.gameRoom.update({
          where: { id: roomId },
          data: { status: 'LOBBY' },
        });
        io.to(`room:${roomId}`).emit('game:resetToLobby', { roomId });
      }
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', async () => {
      console.log(`🔌 Player disconnected: ${socket.user.username}`);

      // Check if user has other open sockets
      const userSockets = await io.in(`user:${userId}`).fetchSockets();
      if (userSockets.length === 0) {
        markUserDisconnected(userId);
        try {
          await prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeenAt: new Date() },
          });
        } catch (e) {
          // Non-critical background DB sync failure
        }
        io.emit('presence:update', { userId, isOnline: false });
      }
    });
  });
}
