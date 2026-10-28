import { Server } from 'socket.io';
import { ParchiGame } from './engine.js';
import { prisma } from '../db.js';
import { CardTheme } from './types.js';

export class GameManager {
  private static instance: GameManager;
  private activeGames: Map<string, ParchiGame> = new Map(); // roomId -> ParchiGame
  private io: Server | null = null;

  private constructor() {}

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public setSocketServer(io: Server): void {
    this.io = io;
  }

  public getGame(roomId: string): ParchiGame | undefined {
    return this.activeGames.get(roomId);
  }

  public getGameByCode(code: string): ParchiGame | undefined {
    for (const game of this.activeGames.values()) {
      if (game.roomCode === code) return game;
    }
    return undefined;
  }

  /**
   * Start a new match for a room
   */
  public async createAndStartGame(
    roomId: string,
    theme: CardTheme = 'royals',
    turnTimeSeconds: number = 20
  ): Promise<ParchiGame> {
    // End existing game if any
    const existing = this.activeGames.get(roomId);
    if (existing) {
      existing.destroy();
      this.activeGames.delete(roomId);
    }

    const room = await prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { user: true },
          orderBy: { seatIndex: 'asc' },
        },
      },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    const players: Array<{
      userId: string;
      username: string;
      displayName: string;
      avatarUrl: string;
      isBot: boolean;
      seatIndex: number;
    }> = [];

    // Ensure 4 seats
    for (let seatIdx = 0; seatIdx < 4; seatIdx++) {
      const member = room.members.find((m) => m.seatIndex === seatIdx);
      if (member && member.user) {
        players.push({
          userId: member.user.id,
          username: member.user.username,
          displayName: member.user.displayName,
          avatarUrl: member.user.avatarUrl,
          isBot: member.isBot,
          seatIndex: seatIdx,
        });
      } else if (member && member.isBot) {
        players.push({
          userId: `bot_${seatIdx}_${room.id.substring(0, 4)}`,
          username: member.botName || `Bot_${seatIdx + 1}`,
          displayName: member.botName || `AI Player ${seatIdx + 1}`,
          avatarUrl: member.botAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=Bot${seatIdx + 1}`,
          isBot: true,
          seatIndex: seatIdx,
        });
      } else {
        // Auto-fill empty seat with bot
        players.push({
          userId: `bot_${seatIdx}_${room.id.substring(0, 4)}`,
          username: `Bot_${seatIdx + 1}`,
          displayName: `AI Player ${seatIdx + 1}`,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=Bot${seatIdx + 1}`,
          isBot: true,
          seatIndex: seatIdx,
        });
      }
    }

    // Create match record in DB
    const matchRecord = await prisma.match.create({
      data: {
        roomId: room.id,
        hostId: room.hostId,
        totalRounds: 0,
      },
    });

    // Update room status
    await prisma.gameRoom.update({
      where: { id: room.id },
      data: { status: 'IN_GAME' },
    });

    const game = new ParchiGame(
      matchRecord.id,
      room.id,
      room.code,
      players,
      theme,
      turnTimeSeconds
    );

    game.setCallbacks(
      () => this.broadcastGameState(room.id),
      (botSeatIndex) => game.executeBotTurn(botSeatIndex)
    );

    this.activeGames.set(room.id, game);
    game.startMatch();

    return game;
  }

  /**
   * Broadcast state to room: public to room channel, and private hands to each player's user channel
   */
  public broadcastGameState(roomId: string): void {
    const game = this.activeGames.get(roomId);
    if (!game || !this.io) return;

    const publicState = game.getPublicState();
    this.io.to(`room:${roomId}`).emit('gameState:public', publicState);

    // Send private states to each player
    for (const seat of game.seats) {
      if (!seat.isBot && seat.userId) {
        const privateState = game.getPrivateStateForPlayer(seat.userId);
        if (privateState) {
          this.io.to(`user:${seat.userId}`).emit('gameState:private', privateState);
        }
      }
    }

    // If match just finished, persist stats and update DB
    if (game.status === 'FINISHED' && game.endedAt) {
      this.persistMatchResults(game).catch((err) =>
        console.error('Failed to persist match results:', err)
      );
    }
  }

  /**
   * Persist match results to database
   */
  private async persistMatchResults(game: ParchiGame): Promise<void> {
    try {
      const durationSeconds = game.endedAt
        ? Math.floor((game.endedAt - game.createdAt) / 1000)
        : 0;

      await prisma.match.update({
        where: { id: game.matchId },
        data: {
          endedAt: new Date(game.endedAt || Date.now()),
          durationSeconds,
          rankingsJson: JSON.stringify(game.rankings),
          totalRounds: game.roundNumber,
          eventLogsJson: JSON.stringify(game.logs),
        },
      });

      // Update room status
      await prisma.gameRoom.update({
        where: { id: game.roomId },
        data: { status: 'FINISHED' },
      });

      // Update player statistics
      for (const rankItem of game.rankings) {
        if (!rankItem.isBot && rankItem.userId) {
          const updateData: any = {
            gamesPlayed: { increment: 1 },
          };

          if (rankItem.rank === 1) updateData.gamesWon = { increment: 1 };
          else if (rankItem.rank === 2) updateData.secondPlaceCount = { increment: 1 };
          else if (rankItem.rank === 3) updateData.thirdPlaceCount = { increment: 1 };
          else if (rankItem.rank === 4) updateData.fourthPlaceCount = { increment: 1 };

          await prisma.user.update({
            where: { id: rankItem.userId },
            data: updateData,
          });
        }
      }
    } catch (err) {
      console.error('Error persisting match results:', err);
    }
  }

  public removeGame(roomId: string): void {
    const game = this.activeGames.get(roomId);
    if (game) {
      game.destroy();
      this.activeGames.delete(roomId);
    }
  }
}
