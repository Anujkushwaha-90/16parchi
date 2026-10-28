import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth, AuthRequest } from '../auth/middleware.js';
import { GameManager } from '../game/manager.js';
import { CardTheme } from '../game/types.js';

const router = Router();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new private room
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { cardTheme = 'royals', turnTimeSeconds = 20 } = req.body;

    let code = generateRoomCode();
    while (await prisma.gameRoom.findUnique({ where: { code } })) {
      code = generateRoomCode();
    }

    const room = await prisma.gameRoom.create({
      data: {
        code,
        hostId: userId,
        status: 'LOBBY',
        maxPlayers: 4,
        cardTheme,
        turnTimeSeconds,
        members: {
          create: {
            userId,
            seatIndex: 0,
            isReady: true, // Host is ready by default
            isBot: false,
          },
        },
      },
      include: {
        host: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { seatIndex: 'asc' },
        },
      },
    });

    res.json({ room });
  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

/**
 * Get room by code
 */
router.get('/:code', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const room = await prisma.gameRoom.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        host: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true, friendCode: true },
            },
          },
          orderBy: { seatIndex: 'asc' },
        },
      },
    });

    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }

    res.json({ room });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

/**
 * Join room by code
 */
router.post('/:code/join', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const userId = req.user!.id;

    const room = await prisma.gameRoom.findUnique({
      where: { code: code.toUpperCase() },
      include: { members: true },
    });

    if (!room) {
      res.status(404).json({ error: 'Room code does not exist.' });
      return;
    }

    if (room.status !== 'LOBBY') {
      res.status(400).json({ error: 'Match has already started in this room.' });
      return;
    }

    // Check if user is already in room
    const existingMember = room.members.find((m) => m.userId === userId);
    if (existingMember) {
      res.json({ success: true, room });
      return;
    }

    // Check taken seat indexes
    const occupiedSeats = new Set(room.members.map((m) => m.seatIndex));
    if (occupiedSeats.size >= 4) {
      res.status(400).json({ error: 'Room is full (Maximum 4 players).' });
      return;
    }

    // Find first free seat (0, 1, 2, 3)
    let assignedSeat = 0;
    for (let i = 0; i < 4; i++) {
      if (!occupiedSeats.has(i)) {
        assignedSeat = i;
        break;
      }
    }

    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId,
        seatIndex: assignedSeat,
        isReady: false,
        isBot: false,
      },
    });

    const updatedRoom = await prisma.gameRoom.findUnique({
      where: { id: room.id },
      include: {
        host: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { seatIndex: 'asc' },
        },
      },
    });

    res.json({ success: true, room: updatedRoom });
  } catch (err) {
    console.error('Error joining room:', err);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

/**
 * Toggle ready status
 */
router.post('/:code/ready', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const userId = req.user!.id;

    const room = await prisma.gameRoom.findUnique({
      where: { code: code.toUpperCase() },
      include: { members: true },
    });

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const member = room.members.find((m) => m.userId === userId);
    if (!member) {
      res.status(403).json({ error: 'You are not in this room' });
      return;
    }

    const updated = await prisma.roomMember.update({
      where: { id: member.id },
      data: { isReady: !member.isReady },
    });

    res.json({ success: true, isReady: updated.isReady });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ready state' });
  }
});

/**
 * Add / Remove AI Bot in empty seat
 */
router.post('/:code/bot', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const userId = req.user!.id;
    const { action, seatIndex } = req.body; // action: 'add' | 'remove'

    const room = await prisma.gameRoom.findUnique({
      where: { code: code.toUpperCase() },
      include: { members: true },
    });

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (room.hostId !== userId) {
      res.status(403).json({ error: 'Only room host can manage bots' });
      return;
    }

    if (room.status !== 'LOBBY') {
      res.status(400).json({ error: 'Cannot modify bots while game is active' });
      return;
    }

    if (action === 'add') {
      const occupiedSeats = new Set(room.members.map((m) => m.seatIndex));
      if (occupiedSeats.size >= 4) {
        res.status(400).json({ error: 'Room is already full' });
        return;
      }

      let freeSeat = typeof seatIndex === 'number' ? seatIndex : -1;
      if (freeSeat === -1 || occupiedSeats.has(freeSeat)) {
        for (let i = 0; i < 4; i++) {
          if (!occupiedSeats.has(i)) {
            freeSeat = i;
            break;
          }
        }
      }

      const botNames = ['Chanakya (AI)', 'Birbal (AI)', 'Tenali (AI)', 'Vikram (AI)'];
      const botName = botNames[freeSeat] || `AI Bot ${freeSeat + 1}`;

      await prisma.roomMember.create({
        data: {
          roomId: room.id,
          seatIndex: freeSeat,
          isReady: true,
          isBot: true,
          botName,
          botAvatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${botName}`,
        },
      });
    } else if (action === 'remove') {
      const targetMember = room.members.find(
        (m) => m.seatIndex === seatIndex && m.isBot
      );
      if (targetMember) {
        await prisma.roomMember.delete({ where: { id: targetMember.id } });
      }
    }

    const updated = await prisma.gameRoom.findUnique({
      where: { id: room.id },
      include: {
        host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { seatIndex: 'asc' },
        },
      },
    });

    res.json({ success: true, room: updated });
  } catch (err) {
    console.error('Error modifying bot:', err);
    res.status(500).json({ error: 'Failed to modify bot' });
  }
});

/**
 * Leave room
 */
router.post('/:code/leave', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const userId = req.user!.id;

    const room = await prisma.gameRoom.findUnique({
      where: { code: code.toUpperCase() },
      include: { members: true },
    });

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const member = room.members.find((m) => m.userId === userId);
    if (member) {
      await prisma.roomMember.delete({ where: { id: member.id } });
    }

    // If host left, either assign next human host or delete room if empty
    const remainingMembers = await prisma.roomMember.findMany({
      where: { roomId: room.id, isBot: false },
    });

    if (remainingMembers.length === 0) {
      await prisma.gameRoom.delete({ where: { id: room.id } });
      res.json({ success: true, message: 'Room closed' });
      return;
    }

    if (room.hostId === userId) {
      await prisma.gameRoom.update({
        where: { id: room.id },
        data: { hostId: remainingMembers[0].userId! },
      });
    }

    res.json({ success: true, message: 'Left room successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to leave room' });
  }
});

/**
 * Start match (Host only, all 4 seats occupied & ready)
 */
router.post('/:code/start', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const userId = req.user!.id;

    const room = await prisma.gameRoom.findUnique({
      where: { code: code.toUpperCase() },
      include: { members: true },
    });

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (room.hostId !== userId) {
      res.status(403).json({ error: 'Only the host can start the game.' });
      return;
    }

    if (room.members.length < 4) {
      res.status(400).json({
        error: 'Exactly 4 players/bots are required to start 16 Parchi. Fill empty seats with AI bots or invite friends!',
      });
      return;
    }

    const notReady = room.members.some((m) => !m.isReady);
    if (notReady) {
      res.status(400).json({ error: 'All players must be ready before starting.' });
      return;
    }

    const gameManager = GameManager.getInstance();
    const game = await gameManager.createAndStartGame(
      room.id,
      room.cardTheme as CardTheme,
      room.turnTimeSeconds
    );

    res.json({
      success: true,
      matchId: game.matchId,
      publicState: game.getPublicState(),
    });
  } catch (err: any) {
    console.error('Error starting game:', err);
    res.status(500).json({ error: err.message || 'Failed to start game' });
  }
});

/**
 * Send room invite to friend
 */
router.post('/:code/invite', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const { friendUserId } = req.body;
    const inviterId = req.user!.id;

    const room = await prisma.gameRoom.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    // Auto expires after 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const invite = await prisma.roomInvite.create({
      data: {
        roomId: room.id,
        inviterId,
        inviteeId: friendUserId,
        status: 'PENDING',
        expiresAt,
      },
      include: {
        room: true,
        inviter: {
          select: { id: true, displayName: true, username: true, avatarUrl: true },
        },
      },
    });

    res.json({ success: true, invite });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send invite' });
  }
});

/**
 * Get pending invites for current user
 */
router.get('/invites/pending', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const now = new Date();

    const invites = await prisma.roomInvite.findMany({
      where: {
        inviteeId: userId,
        status: 'PENDING',
        expiresAt: { gt: now },
      },
      include: {
        room: true,
        inviter: {
          select: { id: true, displayName: true, username: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ invites });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
});

export default router;
