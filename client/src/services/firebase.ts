import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut as fbSignOut,
  Auth,
  User as FirebaseUser,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'demo-api-key'
);

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
} catch (e) {
  console.warn('Firebase initialization notice:', e);
}

export function getFirebaseAuth(): Auth | null {
  return auth;
}

/**
 * Sign in with Google Popup and retrieve ID token directly
 * Automatically falls back to full-page redirect if popup is blocked, third-party cookies are restricted, or network fetch fails
 */
export async function signInWithGoogle(): Promise<{
  idToken: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  redirecting?: boolean;
}> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('Firebase credentials are not configured yet in .env.');
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();

    return {
      idToken,
      displayName: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
    };
  } catch (popupErr: any) {
    const code = popupErr?.code || '';
    const msg = popupErr?.message || '';

    // If user deliberately closed the popup window, do not force a redirect
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw popupErr;
    }

    // If popup was blocked, network request failed (e.g. Failed to fetch), or 3rd party cookies are restricted:
    // Automatically fall back to seamless Google redirect sign-in
    console.warn('Popup sign-in encountered an issue, transitioning to Google redirect:', popupErr);
    try {
      await signInWithRedirect(auth, googleProvider);
      return { idToken: '', redirecting: true };
    } catch (redirectErr) {
      console.error('Redirect sign-in error:', redirectErr);
      throw popupErr;
    }
  }
}

/**
 * Direct Google full-page redirect sign-in
 */
export async function signInWithGoogleRedirect(): Promise<void> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('Firebase credentials are not configured yet in .env.');
  }
  await signInWithRedirect(auth, googleProvider);
}

/**
 * Check if user just returned from a Google redirect sign-in
 */
export async function checkRedirectAuth(): Promise<{
  idToken: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
} | null> {
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const idToken = await result.user.getIdToken();
      return {
        idToken,
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
      };
    }
  } catch (e) {
    console.warn('Redirect auth check:', e);
  }
  return null;
}

/**
 * Subscribe to native Firebase Auth state changes
 */
export function subscribeToAuth(callback: (user: FirebaseUser | null) => void): () => void {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export async function firebaseSignOut(): Promise<void> {
  if (auth) {
    await fbSignOut(auth);
  }
}
