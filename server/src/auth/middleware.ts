import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from './firebase.js';
import { prisma } from '../db.js';

export interface AuthenticatedUser {
  id: string;
  firebaseUid?: string | null;
  username: string;
  displayName: string;
  avatarUrl: string;
  friendCode: string;
  gamesPlayed: number;
  gamesWon: number;
  secondPlaceCount: number;
  thirdPlaceCount: number;
  fourthPlaceCount: number;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    return;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  const decoded = await verifyAuthToken(token);

  if (!decoded) {
    res.status(401).json({ error: 'Unauthorized: Invalid authentication token.' });
    return;
  }

  // Find user by firebaseUid or id
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { firebaseUid: decoded.uid },
        { id: decoded.uid },
      ],
    },
  });

  if (!user) {
    res.status(401).json({ error: 'User profile not found. Please complete onboarding.' });
    return;
  }

  req.user = user;
  next();
}
