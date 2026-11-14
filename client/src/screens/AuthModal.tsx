import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { sound } from '../services/sound.js';
import { X, Crown, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { loginWithGoogle, loginWithGoogleRedirect } = useAuth();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        sound.playClick();
        if (res.deletionCancelled) {
          showToast('Welcome back! Your 24-hr account deletion was cancelled.', 'success');
        } else {
          showToast('Welcome to 16 Parchi!', 'success');
        }
        onSuccess?.();
        onClose();
      } else if (res.redirecting) {
        showToast('Redirecting to Google sign-in...', 'info');
      }
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      const code = err.code || '';
      const msg = err.message || '';

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User deliberately closed popup - do nothing
      } else if (code === 'auth/unauthorized-domain') {
        showToast('Domain not authorized in Firebase Console (Add localhost to Authorized Domains).', 'error');
      } else if (code === 'auth/popup-blocked') {
        showToast('Browser blocked the popup. Click the redirect link below to sign in.', 'info');
      } else {
        showToast(msg || `Sign in failed (${code || 'Unknown error'})`, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectRedirect = async () => {
    setSubmitting(true);
    showToast('Redirecting to Google sign-in...', 'info');
    try {
      await loginWithGoogleRedirect();
    } catch (err: any) {
      showToast(err?.message || 'Redirect failed. Please try again.', 'error');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-sm my-auto bg-table-surface border border-gold-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          disabled={submitting}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-ivory-100 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Brand */}
        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex p-3 rounded-2xl bg-gold-500/10 text-gold-400 border border-gold-500/30 mb-2.5 shadow-gold-glow">
            <Crown className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-black text-ivory-100">Play 16 Parchi</h2>
          <p className="text-xs text-stone-400 mt-1 leading-relaxed">
            Sign in with Google to play and save your royal stats.
          </p>
        </div>

        {/* Auth Body */}
        <div className="space-y-4 relative z-10">
          {/* Google Authentication Button */}
          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-stone-700" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                {/* Official Google SVG Logo */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              </>
            )}
          </button>

          {/* Fallback link for strict popup blockers */}
          <div className="text-center">
            <button
              type="button"
              disabled={submitting}
              onClick={handleDirectRedirect}
              className="text-[10px] text-stone-400 hover:text-gold-400 underline underline-offset-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Popup not opening? Sign in with full page redirect
            </button>
          </div>

          {/* Trust & Safety Badges */}
          <div className="pt-3 border-t border-table-border/60 flex items-center justify-center gap-4 text-[10px] text-stone-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Free & Secure</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-stone-600" />
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
              <span>Multiplayer Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};