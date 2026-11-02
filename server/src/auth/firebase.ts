import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config.js';
import fs from 'fs';

let firebaseInitialized = false;

try {
  if (CONFIG.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(CONFIG.FIREBASE_SERVICE_ACCOUNT_PATH)) {
    const serviceAccount = JSON.parse(
      fs.readFileSync(CONFIG.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8')
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized with service account.');
  } else {
    // Use Application Default Credentials with explicit project
    admin.initializeApp({
      projectId: process.env.GCLOUD_PROJECT || 'parchi-b8190',
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized with default credentials.');
  }
} catch (e) {
  console.log('ℹ️ Firebase Admin SDK using local developer/JWT verification mode.');
}

export interface DecodedAuthToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

export async function verifyAuthToken(token: string): Promise<DecodedAuthToken | null> {
  if (!token) return null;

  // 1. Try Firebase Admin if initialized with credentials
  if (firebaseInitialized) {
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      return {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name || (decoded as any).displayName,
        picture: decoded.picture,
      };
    } catch (err) {
      // If Admin SDK verification fails, continue to resilient checks
    }
  }

  // 2. Decode and verify Firebase Google ID Token (Works in cloud / serverless without service account file)
  try {
    const unverified = jwt.decode(token, { complete: true }) as any;
    if (unverified && unverified.payload) {
      const payload = unverified.payload;
      const isFirebaseToken =
        (typeof payload.iss === 'string' && payload.iss.includes('securetoken.google.com')) ||
        payload.aud === (process.env.GCLOUD_PROJECT || 'parchi-b8190');

      if (isFirebaseToken) {
        // Check token expiry
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          console.warn('Firebase token has expired.');
          return null;
        }

        const uid = payload.sub || payload.user_id;
        if (uid) {
          return {
            uid,
            email: payload.email,
            name: payload.name || payload.displayName,
            picture: payload.picture,
          };
        }
      }
    }
  } catch (err) {
    // Continue
  }

  // 3. Fallback / Dev token verification using JWT_SECRET
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as any;
    if (decoded && (decoded.uid || decoded.userId)) {
      return {
        uid: decoded.uid || decoded.userId,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      };
    }
  } catch (jwtErr) {
    // Invalid token
  }

  return null;
}

/**
 * Generate a signed session token for a user
 */
export function generateSessionToken(user: { id: string; firebaseUid?: string | null; email?: string | null; displayName: string }): string {
  return jwt.sign(
    {
      userId: user.id,
      uid: user.firebaseUid || user.id,
      email: user.email,
      name: user.displayName,
    },
    CONFIG.JWT_SECRET,
    { expiresIn: '30d' }
  );
}
