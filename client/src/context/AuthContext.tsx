import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types/index.js';
import { api } from '../services/api.js';
import {
  signInWithGoogle,
  signInWithGoogleRedirect,
  checkRedirectAuth,
  subscribeToAuth,
  firebaseSignOut,
  isFirebaseConfigured,
} from '../services/firebase.js';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isFirebaseAvailable: boolean;
  loginWithGoogle: () => Promise<{ success: boolean; redirecting?: boolean }>;
  loginWithGoogleRedirect: () => Promise<void>;
  loginWithDev: (username: string, displayName?: string, avatarSeed?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updatedUser: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync token from localStorage or fetch user from server
  const refreshUser = useCallback(async () => {
    // 1. Check if user just completed a Google Redirect login
    try {
      const redirectData = await checkRedirectAuth();
      if (redirectData && redirectData.idToken) {
        const res = await api.googleAuth(redirectData.idToken);
        if (res && res.token && res.user) {
          api.setToken(res.token);
          setUser(res.user);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Redirect check error:', err);
    }

    const token = api.getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
        api.setToken(null);
      }
    } catch (e) {
      console.warn('Session check failed:', e);
      setUser(null);
      api.setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to Firebase Auth and check session on mount
  useEffect(() => {
    let isMounted = true;
    refreshUser();

    // Native Firebase Auth state observer (auto-heals sessions across tabs and refreshes)
    const unsubscribe = subscribeToAuth(async (fbUser) => {
      if (!isMounted) return;
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          const res = await api.googleAuth(idToken);
          if (res && res.token && res.user) {
            api.setToken(res.token);
            setUser(res.user);
          }
        } catch (err) {
          console.warn('Firebase observer sync:', err);
        } finally {
          setLoading(false);
        }
      }
    });

    // Periodic 30-second heartbeat to keep online presence active in database
    const heartbeatTimer = setInterval(() => {
      if (api.getToken()) {
        api.getMe().then((res) => {
          if (res && res.user && isMounted) {
            setUser(res.user);
          }
        }).catch(() => {});
      }
    }, 30000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(heartbeatTimer);
    };
  }, [refreshUser]);

  const loginWithGoogle = async (): Promise<{ success: boolean; redirecting?: boolean }> => {
    const googleResult = await signInWithGoogle();
    if (googleResult && googleResult.redirecting) {
      return { success: false, redirecting: true };
    }
    if (googleResult && googleResult.idToken) {
      setLoading(true);
      try {
        const res = await api.googleAuth(googleResult.idToken);
        if (res && res.token && res.user) {
          api.setToken(res.token);
          setUser(res.user);
          return { success: true };
        }
      } finally {
        setLoading(false);
      }
    }
    return { success: false };
  };

  const loginWithGoogleRedirect = async () => {
    await signInWithGoogleRedirect();
  };

  const loginWithDev = async (username: string, displayName?: string, avatarSeed?: string) => {
    setLoading(true);
    try {
      const res = await api.devLogin(username, displayName, avatarSeed);
      if (res.token && res.user) {
        api.setToken(res.token);
        setUser(res.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut();
    } catch (e) {}
    api.setToken(null);
    setUser(null);
  };

  const updateUser = useCallback((updated: UserProfile) => {
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFirebaseAvailable: isFirebaseConfigured,
        loginWithGoogle,
        loginWithGoogleRedirect,
        loginWithDev,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
