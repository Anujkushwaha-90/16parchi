import { Server } from 'socket.io';
import { ParchiGame } from './engine.js';
import { prisma } from '../db.js';
import { CardTheme } from './types.js';

export class GameManager {
  private static instance: GameManager;
  private activeGames: Map<string, ParchiGame> = new Map(); // roomId -> ParchiGame
  private io: Server | null = null;
  private persistedMatches: Set<string> = new Set();

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

  public broadcastToRoom(roomId: string, event: string, data?: any): void {
    if (this.io) {
      this.io.to(`room:${roomId}`).emit(event, data);
    }
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

  public async getGameAsync(roomId: string): Promise<ParchiGame | undefined> {
    const existing = this.activeGames.get(roomId);

    try {
      const room = await prisma.gameRoom.findUnique({
        where: { id: roomId },
      });
      if (room && room.gameStateJson) {
        const dbState = JSON.parse(room.gameStateJson);
        // Resync if in-memory instance is missing OR if database has newer turnNumber/finished status/rankings
        const needsResync =
          !existing ||
          dbState.turnNumber > existing.turnNumber ||
          (dbState.status === 'FINISHED' && existing.status !== 'FINISHED') ||
          ((dbState.rankings?.length || 0) > (existing.rankings?.length || 0));

        if (needsResync) {
          if (existing) existing.destroy();
          const game = ParchiGame.fromJSON(dbState);
          game.setCallbacks(
            () => {
              this.broadcastGameState(room.id);
              this.saveGame(game).catch(console.error);
            },
            (botSeatIndex) => {
              game.executeBotTurn(botSeatIndex);
              this.saveGame(game).catch(console.error);
            }
          );
          this.activeGames.set(room.id, game);
          return game;
        }
      }
    } catch (e) {
      console.error('Failed to load game from DB:', e);
    }

    return existing;
  }

  public async getGameByCodeAsync(code: string): Promise<ParchiGame | undefined> {
    const cleanCode = code.toUpperCase();
    const existing = this.getGameByCode(cleanCode);

    try {
      const room = await prisma.gameRoom.findUnique({
        where: { code: cleanCode },
      });
      if (room && room.gameStateJson) {
        const dbState = JSON.parse(room.gameStateJson);
        // Resync if in-memory instance is missing OR if database has newer turnNumber/finished status/rankings
        const needsResync =
          !existing ||
          dbState.turnNumber > existing.turnNumber ||
          (dbState.status === 'FINISHED' && existing.status !== 'FINISHED') ||
          ((dbState.rankings?.length || 0) > (existing.rankings?.length || 0));

        if (needsResync) {
          if (existing) existing.destroy();
          const game = ParchiGame.fromJSON(dbState);
          game.setCallbacks(
            () => {
              this.broadcastGameState(room.id);
              this.saveGame(game).catch(console.error);
            },
            (botSeatIndex) => {
              game.executeBotTurn(botSeatIndex);
              this.saveGame(game).catch(console.error);
            }
          );
          this.activeGames.set(room.id, game);
          return game;
        }
      }
    } catch (e) {
      console.error('Failed to load game by code from DB:', e);
    }

    return existing;
  }

  public async saveGame(game: ParchiGame): Promise<void> {
    try {
      await prisma.gameRoom.update({
        where: { id: game.roomId },
        data: {
          status: game.status === 'FINISHED' ? 'FINISHED' : 'IN_GAME',
          gameStateJson: JSON.stringify(game.toJSON()),
        },
      });

      // If match finished, persist match results & player career statistics immediately
      if (game.status === 'FINISHED') {
        await this.persistMatchResults(game);
      }
    } catch (e) {
      console.error('Failed to save game state to DB:', e);
    }
  }

  /**
   * Start a new match for a room
   */
  public async createAndStartGame(
    roomId: string,
    theme: CardTheme = 'royals',
    turnTimeSeconds: number = 60
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

    const maxPlayers = room.maxPlayers || 4;
    let customDeckConfig: any = null;
    if (room.customDeckJson) {
      try {
        customDeckConfig = JSON.parse(room.customDeckJson);
      } catch (e) {
        console.error('Failed to parse room customDeckJson:', e);
      }
    }

    const players: Array<{
      userId: string;
      username: string;
      displayName: string;
      avatarUrl: string;
      isBot: boolean;
      seatIndex: number;
    }> = [];

    // Ensure maxPlayers seats
    for (let seatIdx = 0; seatIdx < maxPlayers; seatIdx++) {
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

    // Create match record in DB with associated MatchPlayer rows
    const matchRecord = await prisma.match.create({
      data: {
        roomId: room.id,
        hostId: room.hostId,
        totalRounds: 0,
        players: {
          create: players.map((p) => ({
            userId: p.isBot ? null : p.userId,
            isBot: p.isBot,
            playerName: p.displayName,
            avatarUrl: p.avatarUrl,
            seatIndex: p.seatIndex,
          })),
        },
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
      turnTimeSeconds,
      customDeckConfig,
      maxPlayers
    );

    game.setCallbacks(
      () => {
        this.broadcastGameState(room.id);
        this.saveGame(game).catch(console.error);
      },
      (botSeatIndex) => {
        game.executeBotTurn(botSeatIndex);
        this.saveGame(game).catch(console.error);
      }
    );

    this.activeGames.set(room.id, game);
    game.startMatch();

    // Persist active game state to Neon Database immediately
    await this.saveGame(game);

    return game;
  }

  /**
   * Broadcast state to room: public to room channel, and private hands to each player's user channel
   */
  public broadcastGameState(roomId: string): void {
    const game = this.activeGames.get(roomId);
    if (!game) return;

    // Always sync state changes to Neon DB
    this.saveGame(game);

    if (this.io) {
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
    if (this.persistedMatches.has(game.matchId)) return;
    this.persistedMatches.add(game.matchId);

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

      // Update MatchPlayer rows with final placement ranks and winning sets
      for (const rankItem of game.rankings) {
        await prisma.matchPlayer.updateMany({
          where: {
            matchId: game.matchId,
            seatIndex: rankItem.seatIndex,
          },
          data: {
            finalRank: rankItem.rank,
            winningCards: rankItem.cardName,
          },
        });
      }

      // Update room status
      await prisma.gameRoom.update({
        where: { id: game.roomId },
        data: { status: 'FINISHED' },
      });

      // Update player statistics in Neon PostgreSQL
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
