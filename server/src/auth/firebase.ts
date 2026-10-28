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
    // Check if default credentials available
    admin.initializeApp();
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

  // 1. Try Firebase Admin if initialized
  if (firebaseInitialized) {
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      return {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name || decoded.displayName,
        picture: decoded.picture,
      };
    } catch (err) {
      // Fallback to local JWT if it's a dev token
    }
  }

  // 2. Fallback / Dev token verification using JWT_SECRET
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as any;
    if (decoded && decoded.uid) {
      return {
        uid: decoded.uid,
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
