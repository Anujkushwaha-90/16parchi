import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth, AuthRequest } from '../auth/middleware.js';

const router = Router();

const BOY_EMAIL = 'singhayush20626@gmail.com';
const GIRL_EMAIL = 'palakpandey808@gmail.com';

/**
 * Helper to check if an email belongs to the exclusive duo
 */
export const isDuoEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  return e === BOY_EMAIL || e === GIRL_EMAIL;
};

/**
 * GET /api/duo/status
 * Get the current duo status for the logged-in user or public lookup
 */
router.get('/status', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    const userId = req.user?.id;

    if (!userEmail && !userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Find duo record matching either email
    let duo = await prisma.dynamicDuo.findFirst({
      where: {
        OR: [
          { userAEmail: userEmail },
          { userBEmail: userEmail },
          { userAId: userId },
          { userBId: userId },
        ],
      },
    });

    if (!duo) {
      // If user is Ayush or Palak, ensure record exists
      if (userEmail === BOY_EMAIL || userEmail === GIRL_EMAIL) {
        duo = await prisma.dynamicDuo.upsert({
          where: {
            userAEmail_userBEmail: {
              userAEmail: BOY_EMAIL,
              userBEmail: GIRL_EMAIL,
            },
          },
          update: {
            ...(userEmail === BOY_EMAIL ? { userAId: userId } : { userBId: userId }),
          },
          create: {
            userAEmail: BOY_EMAIL,
            userBEmail: GIRL_EMAIL,
            userAId: userEmail === BOY_EMAIL ? userId : null,
            userBId: userEmail === GIRL_EMAIL ? userId : null,
            status: 'PROPOSED',
            proposedBy: 'userA',
            streakDays: 1,
            duoTitle: 'Cosmic Royal Duo',
          },
        });
      }
    }

    if (!duo) {
      res.json({ isDuoMember: false, duo: null });
      return;
    }

    // Auto-link ID if missing
    if (userEmail === BOY_EMAIL && !duo.userAId && userId) {
      duo = await prisma.dynamicDuo.update({
        where: { id: duo.id },
        data: { userAId: userId },
      });
    } else if (userEmail === GIRL_EMAIL && !duo.userBId && userId) {
      duo = await prisma.dynamicDuo.update({
        where: { id: duo.id },
        data: { userBId: userId },
      });
    }

    // Calculate days streak
    let streakDays = duo.streakDays;
    if (duo.acceptedAt) {
      const diffMs = Date.now() - new Date(duo.acceptedAt).getTime();
      const calculatedDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
      streakDays = Math.max(duo.streakDays, calculatedDays);
    }

    // Fetch details of both partners
    const [userA, userB] = await Promise.all([
      duo.userAId
        ? prisma.user.findUnique({
            where: { id: duo.userAId },
            select: { id: true, displayName: true, username: true, avatarUrl: true, friendCode: true },
          })
        : null,
      duo.userBId
        ? prisma.user.findUnique({
            where: { id: duo.userBId },
            select: { id: true, displayName: true, username: true, avatarUrl: true, friendCode: true },
          })
        : null,
    ]);

    const isBoy = userEmail === BOY_EMAIL;

    res.json({
      isDuoMember: true,
      duo: {
        id: duo.id,
        status: duo.status,
        proposedBy: duo.proposedBy,
        proposalText: duo.proposalText,
        acceptedAt: duo.acceptedAt,
        streakDays,
        duoTitle: duo.duoTitle,
        boy: {
          email: BOY_EMAIL,
          name: userA?.displayName || 'Ayush Singh',
          username: userA?.username || 'ayushsingh',
          avatarUrl: userA?.avatarUrl || '',
          friendCode: userA?.friendCode || 'PARCHI-8460',
          id: duo.userAId,
        },
        girl: {
          email: GIRL_EMAIL,
          name: userB?.displayName || 'Palak Pandey',
          username: userB?.username || 'palakpandey',
          avatarUrl: userB?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=Palak',
          friendCode: userB?.friendCode || 'PARCHI-PALAK',
          id: duo.userBId,
        },
        currentUserRole: isBoy ? 'boy' : 'girl',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch duo status' });
  }
});

/**
 * POST /api/duo/propose
 * Boy (or girl) initiates or updates the 3D Hand-hold proposal
 */
router.post('/propose', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    if (!isDuoEmail(userEmail)) {
      res.status(403).json({ error: 'This exclusive feature is reserved for the Cosmic Duo.' });
      return;
    }

    const { message } = req.body;
    const proposedBy = userEmail === BOY_EMAIL ? 'userA' : 'userB';

    const duo = await prisma.dynamicDuo.upsert({
      where: {
        userAEmail_userBEmail: {
          userAEmail: BOY_EMAIL,
          userBEmail: GIRL_EMAIL,
        },
      },
      update: {
        status: 'PROPOSED',
        proposedBy,
        proposalText: message || 'Will you be my Dynamic Duo, Palak? 🤝✨',
        updatedAt: new Date(),
      },
      create: {
        userAEmail: BOY_EMAIL,
        userBEmail: GIRL_EMAIL,
        userAId: req.user!.id,
        status: 'PROPOSED',
        proposedBy,
        proposalText: message || 'Will you be my Dynamic Duo, Palak? 🤝✨',
        streakDays: 1,
      },
    });

    res.json({ success: true, duo });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to propose duo' });
  }
});

/**
 * POST /api/duo/accept
 * Partner accepts the hand-hold proposal, activating the Dynamic Duo!
 */
router.post('/accept', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    if (!isDuoEmail(userEmail)) {
      res.status(403).json({ error: 'This exclusive feature is reserved for the Cosmic Duo.' });
      return;
    }

    const duo = await prisma.dynamicDuo.upsert({
      where: {
        userAEmail_userBEmail: {
          userAEmail: BOY_EMAIL,
          userBEmail: GIRL_EMAIL,
        },
      },
      update: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        streakDays: 1,
        lastStreakAt: new Date(),
        ...(userEmail === GIRL_EMAIL ? { userBId: req.user!.id } : { userAId: req.user!.id }),
      },
      create: {
        userAEmail: BOY_EMAIL,
        userBEmail: GIRL_EMAIL,
        userBId: userEmail === GIRL_EMAIL ? req.user!.id : null,
        userAId: userEmail === BOY_EMAIL ? req.user!.id : null,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        streakDays: 1,
      },
    });

    res.json({ success: true, message: 'Dynamic Duo Formed in Destiny! 🤝💖', duo });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to accept duo' });
  }
});

/**
 * POST /api/duo/interact
 * Send 'ROSE', 'KISS', or 'HUG' between Ayush and Palak
 */
router.post('/interact', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    if (!isDuoEmail(userEmail)) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const { type, message } = req.body;
    if (!['ROSE', 'KISS', 'HUG'].includes(type)) {
      res.status(400).json({ error: 'Invalid interaction type' });
      return;
    }

    const duo = await prisma.dynamicDuo.findFirst({
      where: {
        userAEmail: BOY_EMAIL,
        userBEmail: GIRL_EMAIL,
      },
    });

    if (!duo) {
      res.status(404).json({ error: 'Duo not found' });
      return;
    }

    const interaction = await prisma.duoInteraction.create({
      data: {
        duoId: duo.id,
        senderEmail: userEmail,
        type,
        message: message || '',
      },
    });

    res.json({ success: true, interaction });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send interaction' });
  }
});

/**
 * GET /api/duo/interactions
 * Fetch recent interactions
 */
router.get('/interactions', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    if (!isDuoEmail(userEmail)) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const duo = await prisma.dynamicDuo.findFirst({
      where: {
        userAEmail: BOY_EMAIL,
        userBEmail: GIRL_EMAIL,
      },
    });

    if (!duo) {
      res.json({ interactions: [] });
      return;
    }

    const interactions = await prisma.duoInteraction.findMany({
      where: { duoId: duo.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ interactions });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch interactions' });
  }
});

export default router;

