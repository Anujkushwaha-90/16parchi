import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth, AuthRequest } from '../auth/middleware.js';

const router = Router();

/**
 * Get current user match history
 */
router.get('/history', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const matches = await prisma.match.findMany({
      where: {
        players: {
          some: { userId },
        },
      },
      include: {
        players: true,
        room: {
          select: { code: true, cardTheme: true },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    const formatted = matches.map((m) => {
      let parsedRankings: any[] = [];
      try {
        if (m.rankingsJson) parsedRankings = JSON.parse(m.rankingsJson);
      } catch (e) {}

      const myEntry = parsedRankings.find((r) => r.userId === userId);

      return {
        id: m.id,
        roomCode: m.room?.code,
        cardTheme: m.room?.cardTheme,
        startedAt: m.startedAt,
        endedAt: m.endedAt,
        durationSeconds: m.durationSeconds,
        totalRounds: m.totalRounds,
        rankings: parsedRankings,
        myRank: myEntry?.rank || null,
        myCardName: myEntry?.cardName || null,
      };
    });

    res.json({ matches: formatted });
  } catch (err) {
    console.error('Error fetching match history:', err);
    res.status(500).json({ error: 'Failed to fetch match history' });
  }
});

/**
 * Get specific match details
 */
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        players: true,
        room: { select: { code: true, cardTheme: true } },
      },
    });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    let parsedRankings = [];
    try {
      if (match.rankingsJson) parsedRankings = JSON.parse(match.rankingsJson);
    } catch (e) {}

    res.json({ match: { ...match, rankings: parsedRankings } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

export default router;
