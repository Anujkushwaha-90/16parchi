import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { verifyAuthToken, generateSessionToken } from '../auth/firebase.js';
import { requireAuth, AuthRequest } from '../auth/middleware.js';
import crypto from 'crypto';

const router = Router();

function generateFriendCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `PARCHI-${num}`;
}

/**
 * Real Google Auth callback / verification
 */
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, username: requestedUsername } = req.body;
    if (!idToken) {
      res.status(400).json({ error: 'idToken is required.' });
      return;
    }

    const decoded = await verifyAuthToken(idToken);
    if (!decoded) {
      res.status(401).json({ error: 'Invalid Google Authentication token.' });
      return;
    }

    let user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    if (!user) {
      // First-time signup
      let baseUsername =
        requestedUsername ||
        (decoded.name ? decoded.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '') ||
        'player';
      
      let finalUsername = baseUsername;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
        finalUsername = `${baseUsername}${counter++}`;
      }

      let friendCode = generateFriendCode();
      while (await prisma.user.findUnique({ where: { friendCode } })) {
        friendCode = generateFriendCode();
      }

      // Ensure displayName is unique — if taken, append a number
      let baseDisplayName = decoded.name || finalUsername;
      let finalDisplayName = baseDisplayName;
      let dnCounter = 1;
      while (await prisma.user.findUnique({ where: { displayName: finalDisplayName } })) {
        finalDisplayName = `${baseDisplayName}${dnCounter++}`;
      }

      const avatarUrl =
        decoded.picture ||
        `https://api.dicebear.com/7.x/adventurer/svg?seed=${finalUsername}`;

      user = await prisma.user.create({
        data: {
          firebaseUid: decoded.uid,
          email: decoded.email,
          username: finalUsername,
          displayName: finalDisplayName,
          avatarUrl,
          friendCode,
          isOnline: true,
        },
      });
    } else {
      // Update online status
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastSeenAt: new Date() },
      });
    }

    const sessionToken = generateSessionToken(user);

    res.json({
      success: true,
      token: sessionToken,
      user,
    });
  } catch (error: any) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: 'Authentication failed.', details: error?.message || String(error) });
  }
});

/**
 * Developer & Multi-tab quick login (Ideal for local testing without multi-account friction)
 */
router.post('/dev-login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, displayName, avatarSeed } = req.body;
    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const cleanUsername = username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

    let user = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!user) {
      let friendCode = generateFriendCode();
      while (await prisma.user.findUnique({ where: { friendCode } })) {
        friendCode = generateFriendCode();
      }

      // Ensure displayName is unique — append number if already taken
      let baseDisplayName = displayName || cleanUsername;
      let finalDisplayName = baseDisplayName;
      let dnCounter = 1;
      while (await prisma.user.findUnique({ where: { displayName: finalDisplayName } })) {
        finalDisplayName = `${baseDisplayName}${dnCounter++}`;
      }

      const seed = avatarSeed || cleanUsername;
      user = await prisma.user.create({
        data: {
          username: cleanUsername,
          displayName: finalDisplayName,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`,
          friendCode,
          isOnline: true,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastSeenAt: new Date() },
      });
    }

    const sessionToken = generateSessionToken(user);

    res.json({
      success: true,
      token: sessionToken,
      user,
    });
  } catch (error: any) {
    console.error('Dev Login Error:', error);
    res.status(500).json({ error: 'Dev login failed.', details: error?.message || String(error) });
  }
});

/**
 * Get current authenticated user
 */
router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch current user' });
  }
});

/**
 * Delete account
 */
router.delete('/account', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.user.delete({
      where: { id: req.user!.id },
    });
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
