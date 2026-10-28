import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types/index.js';
import { api } from '../services/api.js';
import { signInWithGoogle, firebaseSignOut, isFirebaseConfigured } from '../services/firebase.js';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isFirebaseAvailable: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithDev: (username: string, displayName?: string, avatarSeed?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
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

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const { idToken } = await signInWithGoogle();
      const res = await api.googleAuth(idToken);
      if (res.token && res.user) {
        api.setToken(res.token);
        setUser(res.user);
      }
    } finally {
      setLoading(false);
    }
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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFirebaseAvailable: isFirebaseConfigured,
        loginWithGoogle,
        loginWithDev,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
