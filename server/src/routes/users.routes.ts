import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth, AuthRequest } from '../auth/middleware.js';

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
        gamesPlayed: true,
        gamesWon: true,
      },
      take: 10,
    });

    res.json({ users });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

/**
 * Update player profile
 */
router.patch('/profile', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { displayName, avatarUrl } = req.body;
    const userId = req.user!.id;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(displayName ? { displayName: displayName.trim().substring(0, 30) } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
      },
    });

    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
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
