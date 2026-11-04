import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth, AuthRequest } from '../auth/middleware.js';
import { isUserOnline } from '../sockets/presence.js';

const router = Router();

/**
 * Search users by username or friendCode
 */
router.get('/search', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = (req.query.q as string)?.trim();
    if (!query || query.length < 2) {
      res.json({ users: [] });
      return;
    }

    const currentUserId = req.user!.id;

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { username: { contains: query } },
              { displayName: { contains: query } },
              { friendCode: { equals: query.toUpperCase() } },
            ],
          },
        ],
      },
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
      take: 10,
    });

    const mappedUsers = users.map(u => ({
      ...u,
      isOnline: isUserOnline(u.id, u.isOnline, u.lastSeenAt),
    }));
    res.json({ users: mappedUsers });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

/**
 * View player public/rich profile by ID, friendCode, or username
 */
router.get('/profile/view/:identifier', async (req, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;
    if (!identifier) {
      res.status(400).json({ error: 'Identifier required' });
      return;
    }

    const trimmed = identifier.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: trimmed },
          { friendCode: trimmed.toUpperCase() },
          { username: trimmed.toLowerCase() },
        ],
      },
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
        secondPlaceCount: true,
        thirdPlaceCount: true,
        fourthPlaceCount: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Player profile not found' });
      return;
    }

    const winRate =
      user.gamesPlayed > 0
        ? Math.round((user.gamesWon / user.gamesPlayed) * 100)
        : 0;

    res.json({
      profile: {
        ...user,
        isOnline: isUserOnline(user.id, user.isOnline, user.lastSeenAt),
        winRate,
      },
    });
  } catch (err) {
    console.error('Profile view error:', err);
    res.status(500).json({ error: 'Failed to fetch player profile' });
  }
});

/**
 * Update player profile (with permanent database avatar history log)
 */
router.patch('/profile', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { displayName, avatarUrl, avatarSource, avatarFileSize } = req.body;
    const userId = req.user!.id;
    const currentUser = req.user!;

    // Check displayName uniqueness if being updated
    if (displayName) {
      const trimmed = displayName.trim().substring(0, 30);
      const existing = await prisma.user.findUnique({ where: { displayName: trimmed } });
      if (existing && existing.id !== userId) {
        res.status(400).json({ error: 'This display name is already taken. Please choose another.' });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(displayName ? { displayName: displayName.trim().substring(0, 30) } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
      },
    });

    // Record every profile photo permanently in the database with user ID and name
    if (avatarUrl) {
      try {
        await prisma.avatarHistory.create({
          data: {
            userId: updated.id,
            userEmail: updated.email || currentUser.email || null,
            username: updated.username,
            displayName: updated.displayName,
            avatarUrl: avatarUrl,
            source: avatarSource || 'CUSTOM_UPLOAD',
            fileSize: typeof avatarFileSize === 'number' ? avatarFileSize : null,
          },
        });
      } catch (logErr) {
        console.error('Failed to record avatar history:', logErr);
      }
    }

    res.json({ user: updated });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * Get permanent avatar history for current user
 */
router.get('/profile/avatar-history', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const history = await prisma.avatarHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        avatarUrl: true,
        source: true,
        displayName: true,
        username: true,
        fileSize: true,
        createdAt: true,
      },
    });
    res.json({ history });
  } catch (err) {
    console.error('Avatar history error:', err);
    res.status(500).json({ error: 'Failed to fetch avatar history' });
  }
});

/**
 * Get user stats and summary
 */
router.get('/:id/stats', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        friendCode: true,
        gamesPlayed: true,
        gamesWon: true,
        secondPlaceCount: true,
        thirdPlaceCount: true,
        fourthPlaceCount: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const winRate =
      user.gamesPlayed > 0
        ? Math.round((user.gamesWon / user.gamesPlayed) * 100)
        : 0;

    res.json({
      stats: {
        ...user,
        winRate,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

export default router;
