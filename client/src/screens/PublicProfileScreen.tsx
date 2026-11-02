import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { sound } from '../services/sound.js';
import { useToast } from '../context/ToastContext.js';
import { useAuth } from '../context/AuthContext.js';
import { isVipUser } from '../utils/vip.js';
import { EternalLoveProfile } from '../components/EternalLove/EternalLoveProfile.js';
import confetti from 'canvas-confetti';
import {
  Crown,
  Trophy,
  Award,
  Flame,
  Copy,
  Check,
  Share2,
  Swords,
  ArrowLeft,
} from 'lucide-react';

interface PublicProfileScreenProps {
  identifier?: string;
  onNavigate: (screen: string, extraParam?: string) => void;
}

export const PublicProfileScreen: React.FC<PublicProfileScreenProps> = ({
  identifier,
  onNavigate,
}) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const rawParam =
      identifier ||
      searchParams.get('code') ||
      searchParams.get('user') ||
      searchParams.get('id') ||
      searchParams.get('profile') ||
      '';

    const code =
      rawParam && rawParam !== 'undefined' && rawParam !== 'null' && rawParam !== 'profile'
        ? rawParam.trim()
        : currentUser?.friendCode || currentUser?.username || 'PARCHI-5164';

    // Instant local profile display if viewing own profile
    if (
      currentUser &&
      (currentUser.friendCode === code ||
        currentUser.username?.toLowerCase() === code.toLowerCase() ||
        currentUser.id === code)
    ) {
      setProfile(currentUser);
      setLoading(false);
      return;
    }

    setLoading(true);
    api
      .getPlayerProfile(code)
      .then((res: any) => {
        if (res && res.profile) {
          setProfile(res.profile);
          if (isVipUser(res.profile)) {
            sound.playWin();
            confetti({
              particleCount: 60,
              spread: 80,
              origin: { y: 0.5 },
              colors: ['#f43f5e', '#ec4899', '#fb7185', '#f59e0b', '#ffffff'],
            });
          }
        } else if (currentUser) {
          setProfile(currentUser);
        }
      })
      .catch((err: any) => {
        console.warn('Profile fetch error:', err);
        if (currentUser) {
          setProfile(currentUser);
        } else {
          // Sovereign VIP fallback
          api.getPlayerProfile('PARCHI-5164').then((r: any) => {
            if (r?.profile) setProfile(r.profile);
          }).catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, [identifier, currentUser]);

  const handleCopyCode = () => {
    if (!profile?.friendCode) return;
    navigator.clipboard.writeText(profile.friendCode);
    setCopiedCode(true);
    sound.playClick();
    showToast(`Friend Code ${profile.friendCode} copied!`, 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    sound.playClick();
    showToast('Profile link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    sound.playClick();
    const text = encodeURIComponent(
      `Check out ${profile?.displayName}'s royal player profile on 16 Parchi! 👑🏆\nPlay together: ${window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  if (loading && !profile) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold-500/20 border-t-gold-400 rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-stone-400 text-sm font-medium">Fetching Royal Profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <Crown className="w-16 h-16 text-stone-600 mb-4" />
        <h2 className="text-2xl font-serif font-black text-ivory-100">Profile Not Found</h2>
        <p className="text-stone-400 text-sm mt-2 max-w-sm">
          The player profile you are looking for does not exist or may have changed their friend code.
        </p>
        <button
          onClick={() => onNavigate('dashboard')}
          className="mt-6 gold-gradient-btn px-6 py-2.5 rounded-xl text-xs font-bold shadow-md"
        >
          Return to 16 Parchi
        </button>
      </div>
    );
  }

  // If VIP user (Eternal Love Premium Experience)
  if (isVipUser(profile) || (currentUser && isVipUser(currentUser) && profile.id === currentUser.id)) {
    return (
      <EternalLoveProfile
        profile={profile}
        onNavigate={onNavigate}
        onBack={() => onNavigate('dashboard')}
      />
    );
  }

  // Standard Profile for regular users (preserves existing clean profile)
  const winRate =
    profile.winRate !== undefined
      ? profile.winRate
      : (profile.gamesPlayed || 0) > 0
      ? Math.round(((profile.gamesWon || 0) / (profile.gamesPlayed || 1)) * 100)
      : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 animate-fade-in space-y-6">
      {/* Back Button */}
      <button
        onClick={() => {
          sound.playClick();
          onNavigate('dashboard');
        }}
        className="inline-flex items-center gap-2 text-stone-400 hover:text-ivory-100 text-xs font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Gaming Hall</span>
      </button>

      {/* Main Profile Card */}
      <div className="relative rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden border bg-table-surface border-gold-500/40 shadow-gold-glow">
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Profile Header */}
        <div className="flex flex-col items-center text-center relative z-10 mb-8">
          <div className="relative mb-4">
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover bg-emerald-950 border-2 border-gold-400/60 shadow-gold-glow"
            />
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-ivory-100">
            {profile.displayName}
          </h1>

          <p className="text-xs text-stone-400 mt-1 font-medium">@{profile.username}</p>

          {profile.friendCode && (
            <button
              onClick={handleCopyCode}
              title="Click to copy Friend Code"
              className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-table-dark/70 border border-gold-500/30 text-xs font-mono text-gold-300 hover:border-gold-400 transition-colors"
            >
              <span>{profile.friendCode}</span>
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-8 relative z-10">
          <div className="p-4 rounded-2xl bg-table-dark/60 border border-table-border/60 text-center">
            <div className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Matches</span>
            </div>
            <div className="text-xl font-black text-ivory-100">{profile.gamesPlayed ?? 0}</div>
          </div>

          <div className="p-4 rounded-2xl bg-table-dark/60 border border-table-border/60 text-center">
            <div className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-gold-400" />
              <span>Victories</span>
            </div>
            <div className="text-xl font-black text-gold-300">{profile.gamesWon ?? 0}</div>
          </div>

          <div className="p-4 rounded-2xl bg-table-dark/60 border border-table-border/60 text-center">
            <div className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Win Rate</span>
            </div>
            <div className="text-xl font-black text-emerald-400">{winRate}%</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 relative z-10">
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('rooms');
            }}
            className="w-full py-3.5 px-6 rounded-2xl gold-gradient-btn text-xs sm:text-sm font-black shadow-gold-glow flex items-center justify-center gap-2 tracking-wide uppercase"
          >
            <Swords className="w-4 h-4" />
            <span>Play 16 Parchi with {profile.displayName}</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleShareWhatsApp}
              className="py-2.5 px-4 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share WhatsApp</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="py-2.5 px-4 rounded-xl bg-table-dark/80 hover:bg-table-dark border border-table-border text-stone-300 hover:text-ivory-100 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
