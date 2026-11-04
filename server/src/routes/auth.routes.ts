import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { verifyAuthToken, generateSessionToken } from '../auth/firebase.js';
import { requireAuth, AuthRequest } from '../auth/middleware.js';
import { parseDeviceInfo } from '../utils/deviceParser.js';
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

    // Match by firebaseUid OR email (handles linking existing accounts seamlessly)
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { firebaseUid: decoded.uid },
          ...(decoded.email ? [{ email: decoded.email }] : []),
        ],
      },
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

      try {
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
      } catch (createErr: any) {
        // Concurrency / duplicate protection: if user was created concurrently in another request, fetch cleanly!
        user = await prisma.user.findFirst({
          where: {
            OR: [
              { firebaseUid: decoded.uid },
              ...(decoded.email ? [{ email: decoded.email }] : []),
            ],
          },
        });
        if (!user) {
          throw createErr;
        }
      }
    } else {
      // Update online status and ensure firebaseUid is synced
      // CRITICAL: DO NOT overwrite custom avatarUrl if user already has one!
      // Only use Google photo if user has no avatarUrl set yet.
      const shouldSetAvatar = (!user.avatarUrl || user.avatarUrl.trim() === '') && Boolean(decoded.picture);
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firebaseUid: decoded.uid,
          isOnline: true,
          lastSeenAt: new Date(),
          ...(shouldSetAvatar ? { avatarUrl: decoded.picture } : {}),
        },
      });
    }

    if (!user) {
      res.status(500).json({ error: 'Failed to retrieve or create user profile.' });
      return;
    }

    const sessionToken = generateSessionToken(user);

    // Auto-link Dynamic Duo if user is Ayush or Palak
    const userEmail = (user.email || '').toLowerCase().trim();
    const uName = (user.username || '').toLowerCase().trim();
    const dName = (user.displayName || '').toLowerCase().trim();
    const isPalak = userEmail === 'palakpandey808@gmail.com' || uName.includes('palak') || dName.includes('palak');
    const isAyush = userEmail === 'singhayush20626@gmail.com' || uName.includes('ayush') || dName.includes('ayush');

    if (isAyush || isPalak) {
      try {
        await prisma.dynamicDuo.updateMany({
          where: {},
          data: {
            ...(isAyush ? { userAId: user.id } : { userBId: user.id }),
          },
        });
      } catch {}
    }

    // Record login analytics & device information into Neon Database
    try {
      const devInfo = parseDeviceInfo(req);
      await prisma.userLoginLog.create({
        data: {
          userId: user.id,
          email: user.email || null,
          deviceType: devInfo.deviceType,
          browser: devInfo.browser,
          os: devInfo.os,
          ipAddress: devInfo.ipAddress,
          city: devInfo.city,
          country: devInfo.country,
          userAgent: devInfo.userAgent,
          loggedInAt: new Date(),
          lastActiveAt: new Date(),
          durationSeconds: 0,
        },
      });
    } catch (logErr) {
      console.warn('Login audit notice:', logErr);
    }

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

    // Auto-link Dynamic Duo if user is Ayush or Palak
    const userEmail = (user.email || '').toLowerCase().trim();
    const uName = (user.username || '').toLowerCase().trim();
    const dName = (user.displayName || '').toLowerCase().trim();
    const isPalak = userEmail === 'palakpandey808@gmail.com' || uName.includes('palak') || dName.includes('palak');
    const isAyush = userEmail === 'singhayush20626@gmail.com' || uName.includes('ayush') || dName.includes('ayush');

    if (isAyush || isPalak) {
      try {
        await prisma.dynamicDuo.updateMany({
          where: {},
          data: {
            ...(isAyush ? { userAId: user.id } : { userBId: user.id }),
          },
        });
      } catch {}
    }

    // Record login analytics & device information into Neon Database
    try {
      const devInfo = parseDeviceInfo(req);
      await prisma.userLoginLog.create({
        data: {
          userId: user.id,
          email: user.email || null,
          deviceType: devInfo.deviceType,
          browser: devInfo.browser,
          os: devInfo.os,
          ipAddress: devInfo.ipAddress,
          city: devInfo.city,
          country: devInfo.country,
          userAgent: devInfo.userAgent,
          loggedInAt: new Date(),
          lastActiveAt: new Date(),
          durationSeconds: 0,
        },
      });
    } catch (logErr) {
      console.warn('Login audit notice:', logErr);
    }

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
    const userId = req.user!.id;
    const now = new Date();
    const user = await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: now, isOnline: true },
    });

    // Update session duration in the most recent login log
    try {
      const latestLog = await prisma.userLoginLog.findFirst({
        where: { userId },
        orderBy: { loggedInAt: 'desc' },
      });
      if (latestLog) {
        const durationSeconds = Math.max(0, Math.floor((now.getTime() - latestLog.loggedInAt.getTime()) / 1000));
        await prisma.userLoginLog.update({
          where: { id: latestLog.id },
          data: { lastActiveAt: now, durationSeconds },
        });
      }
    } catch {}

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
