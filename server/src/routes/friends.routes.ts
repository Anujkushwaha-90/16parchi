import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth, AuthRequest } from '../auth/middleware.js';

const router = Router();

/**
 * Get all friends of current user
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        userA: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            friendCode: true,
            isOnline: true,
            lastSeenAt: true,
            gamesPlayed: true,
            gamesWon: true,
          },
        },
        userB: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            friendCode: true,
            isOnline: true,
            lastSeenAt: true,
            gamesPlayed: true,
            gamesWon: true,
          },
        },
      },
    });

    const friends = friendships.map((f) => {
      const friendData = f.userAId === userId ? f.userB : f.userA;
      return {
        friendshipId: f.id,
        createdAt: f.createdAt,
        ...friendData,
      };
    });

    res.json({ friends });
  } catch (err) {
    console.error('Error fetching friends:', err);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

/**
 * Get pending friend requests (incoming & outgoing)
 */
router.get('/requests', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const incoming = await prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            friendCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const outgoing = await prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: 'PENDING',
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            friendCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      incoming: incoming.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        user: r.sender,
      })),
      outgoing: outgoing.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        user: r.receiver,
      })),
    });
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
});

/**
 * Send friend request
 */
router.post('/request', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetUserId, friendCode } = req.body;
    const senderId = req.user!.id;

    let targetUser;
    if (targetUserId) {
      targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    } else if (friendCode) {
      targetUser = await prisma.user.findUnique({ where: { friendCode: friendCode.toUpperCase() } });
    }

    if (!targetUser) {
      res.status(404).json({ error: 'Player not found.' });
      return;
    }

    if (targetUser.id === senderId) {
      res.status(400).json({ error: 'You cannot send a friend request to yourself.' });
      return;
    }

    // Check if already friends
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userAId: senderId, userBId: targetUser.id },
          { userAId: targetUser.id, userBId: senderId },
        ],
      },
    });

    if (existingFriendship) {
      res.status(400).json({ error: 'You are already friends with this player.' });
      return;
    }

    // Check for existing pending request
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId: targetUser.id },
          { senderId: targetUser.id, receiverId: senderId },
        ],
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      if (existingRequest.senderId === targetUser.id) {
        // Automatically accept reverse request!
        await prisma.$transaction([
          prisma.friendRequest.update({
            where: { id: existingRequest.id },
            data: { status: 'ACCEPTED' },
          }),
          prisma.friendship.create({
            data: {
              userAId: senderId,
              userBId: targetUser.id,
            },
          }),
        ]);
        res.json({ success: true, message: 'Mutual request found! Friendship established.' });
        return;
      }
      res.status(400).json({ error: 'A pending friend request already exists.' });
      return;
    }

    const newRequest = await prisma.friendRequest.create({
      data: {
        senderId,
        receiverId: targetUser.id,
        status: 'PENDING',
      },
    });

    res.json({ success: true, request: newRequest });
  } catch (err) {
    console.error('Error sending friend request:', err);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

/**
 * Accept friend request
 */
router.post('/request/:id/accept', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const request = await prisma.friendRequest.findUnique({
      where: { id },
    });

    if (!request || request.receiverId !== userId || request.status !== 'PENDING') {
      res.status(404).json({ error: 'Valid pending request not found.' });
      return;
    }

    await prisma.$transaction([
      prisma.friendRequest.update({
        where: { id },
        data: { status: 'ACCEPTED' },
      }),
      prisma.friendship.create({
        data: {
          userAId: request.senderId,
          userBId: request.receiverId,
        },
      }),
    ]);

    res.json({ success: true, message: 'Friend request accepted!' });
  } catch (err) {
    console.error('Error accepting friend request:', err);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

/**
 * Reject friend request
 */
router.post('/request/:id/reject', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const request = await prisma.friendRequest.findUnique({
      where: { id },
    });

    if (!request || request.receiverId !== userId) {
      res.status(404).json({ error: 'Request not found.' });
      return;
    }

    await prisma.friendRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    res.json({ success: true, message: 'Friend request rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

/**
 * Cancel outgoing friend request
 */
router.delete('/request/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const request = await prisma.friendRequest.findUnique({
      where: { id },
    });

    if (!request || request.senderId !== userId) {
      res.status(404).json({ error: 'Request not found.' });
      return;
    }

    await prisma.friendRequest.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Friend request cancelled.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});

/**
 * Remove an existing friend
 */
router.delete('/:friendId', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { friendId } = req.params;
    const userId = req.user!.id;

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: friendId },
          { userAId: friendId, userBId: userId },
        ],
      },
    });

    if (!friendship) {
      res.status(404).json({ error: 'Friendship not found' });
      return;
    }

    await prisma.friendship.delete({
      where: { id: friendship.id },
    });

    res.json({ success: true, message: 'Friend removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

export default router;
