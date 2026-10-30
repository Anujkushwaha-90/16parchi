import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { sound } from '../services/sound.js';
import { X, Crown, Sparkles, UserCheck, ShieldAlert, ArrowRight, User, Smartphone } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { loginWithGoogle, loginWithDev, isFirebaseAvailable } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [playerName, setPlayerName] = useState('');

  const isInAppBrowser = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /FBAN|FBAV|Instagram|WhatsApp|Line|Twitter|Snapchat|MicroMessenger/i.test(ua);
  }, []);

  if (!isOpen) return null;

  const handleInstantNamePlay = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = playerName.trim();
    if (!cleanName) {
      showToast('Please enter your name', 'error');
      return;
    }
    sound.playClick();
    setLoading(true);
    try {
      const cleanUsername = cleanName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'player';
      await loginWithDev(cleanUsername, cleanName, cleanName);
      showToast(`Welcome, ${cleanName}!`, 'success');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Login failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    sound.playClick();
    setLoading(true);
    try {
      await loginWithGoogle();
      showToast('Welcome to 16 Parchi!', 'success');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      const msg = err.message || '';
      const code = err.code || '';
      if (msg.includes('Failed to fetch') || code === 'auth/network-request-failed' || code === 'auth/popup-blocked') {
        showToast(
          'Google popup blocked on this browser (e.g. WhatsApp/In-App). Please enter your name above to play instantly!',
          'error'
        );
      } else if (code === 'auth/popup-closed-by-user') {
        showToast('Sign-in cancelled. You can simply enter your name above to play!', 'info');
      } else {
        showToast(msg || 'Google sign in failed. Enter your name above to play!', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (username: string, displayName: string, avatarSeed: string) => {
    sound.playClick();
    setLoading(true);
    try {
      await loginWithDev(username, displayName, avatarSeed);
      showToast(`Logged in as ${displayName}!`, 'success');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showToast('Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-table-surface border border-gold-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-ivory-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gold-500/10 text-gold-400 border border-gold-500/30 mb-3 shadow-gold-glow">
            <Crown className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif font-black text-ivory-100">Join 16 Parchi</h2>
          <p className="text-xs text-stone-400 mt-1">
            Play with friends in real-time online tables
          </p>
        </div>

        {isInAppBrowser && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Opened in WhatsApp/App: Enter your name below to play instantly without popup blocks!</span>
          </div>
        )}

        {/* Instant Name Play (Option 1 - 100% Reliable everywhere) */}
        <div className="p-4 rounded-2xl bg-table-card border border-gold-500/30 mb-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-gold-400 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>INSTANT PLAY (NO PASSWORD NEEDED)</span>
          </div>
          <form onSubmit={handleInstantNamePlay} className="space-y-2.5">
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                maxLength={20}
                required
                placeholder="Enter your name (e.g. Rahul, Aman)..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-table-dark border border-table-border text-sm text-ivory-100 focus:outline-none focus:border-gold-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !playerName.trim()}
              className="w-full gold-gradient-btn py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>Play Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-table-border"></div>
          <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-stone-500 tracking-wider">
            Or connect with
          </span>
          <div className="flex-grow border-t border-table-border"></div>
        </div>

        {/* Google Authentication (Option 2) */}
        <div className="space-y-4">
          <button
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {/* Google SVG Logo */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Quick 1-Click Multi-Tab Accounts */}
          <div className="pt-3 border-t border-table-border">
            <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Quick 1-Click Avatars
              </span>
              <span className="text-[10px] text-stone-500">Multi-tab testing</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDevLogin('player_1', 'Raja Player (Host)', 'Raja1')}
                className="p-2 rounded-xl bg-table-card border border-gold-500/30 hover:border-gold-400 text-left transition-all hover:bg-gold-500/10"
              >
                <div className="text-[11px] font-bold text-ivory-100">👑 Player 1 (Host)</div>
                <div className="text-[9px] text-gold-300 font-mono">@player_1</div>
              </button>

              <button
                type="button"
                onClick={() => handleDevLogin('player_2', 'Rani Player', 'Rani2')}
                className="p-2 rounded-xl bg-table-card border border-table-border hover:border-pink-500 text-left transition-all hover:bg-pink-500/10"
              >
                <div className="text-[11px] font-bold text-ivory-100">✨ Player 2</div>
                <div className="text-[9px] text-pink-300 font-mono">@player_2</div>
              </button>

              <button
                type="button"
                onClick={() => handleDevLogin('player_3', 'Chor Player', 'Chor3')}
                className="p-2 rounded-xl bg-table-card border border-table-border hover:border-indigo-500 text-left transition-all hover:bg-indigo-500/10"
              >
                <div className="text-[11px] font-bold text-ivory-100">🌙 Player 3</div>
                <div className="text-[9px] text-indigo-300 font-mono">@player_3</div>
              </button>

              <button
                type="button"
                onClick={() => handleDevLogin('player_4', 'Sipahi Player', 'Sipahi4')}
                className="p-2 rounded-xl bg-table-card border border-table-border hover:border-emerald-500 text-left transition-all hover:bg-emerald-500/10"
              >
                <div className="text-[11px] font-bold text-ivory-100">🛡️ Player 4</div>
                <div className="text-[9px] text-emerald-300 font-mono">@player_4</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
