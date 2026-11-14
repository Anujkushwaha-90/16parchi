import React, { useState, useEffect } from 'react';
import { EternalLoveScene3D } from './EternalLoveScene3D.js';
import { romanticAudio } from '../../services/romanticAudio.js';
import { sound } from '../../services/sound.js';
import { VipUniqueName } from '../../utils/vip.js';
import confetti from 'canvas-confetti';
import {
  Heart,
  Sparkles,
  Crown,
  Trophy,
  Award,
  Flame,
  Copy,
  Check,
  Share2,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Swords,
  ArrowLeft,
  MessageCircle,
} from 'lucide-react';

interface EternalLoveProfileProps {
  profile: {
    id?: string;
    userId?: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    friendCode?: string;
    gamesPlayed?: number;
    gamesWon?: number;
    winRate?: number;
    createdAt?: string;
  };
  isSelf?: boolean;
  onNavigate?: (screen: string) => void;
  onBack?: () => void;
}

export const EternalLoveProfile: React.FC<EternalLoveProfileProps> = ({
  profile,
  isSelf = false,
  onNavigate,
  onBack,
}) => {
  // Theme state: 'dark' (Dark Romantic) | 'light' (Light Dream)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('eternal_love_theme') as 'dark' | 'light') || 'dark';
  });

  // Sound state
  const [isMuted, setIsMuted] = useState<boolean>(romanticAudio.getMuted());

  // Automatically start Haareya song when 3D Universe mounts, stop on leave
  useEffect(() => {
    romanticAudio.playHaareya();
    return () => {
      romanticAudio.stopHaareya();
    };
  }, []);

  // Heart Reaction Counter
  const [loveCount, setLoveCount] = useState<number>(() => {
    const saved = localStorage.getItem(`love_counter_${profile.username}`);
    return saved ? parseInt(saved, 10) : 520; // 520 = I Love You symbol
  });

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSurprise, setShowSurprise] = useState(false);
  const [cupidGreeting, setCupidGreeting] = useState("Cupid's blessing is upon you! 🏹💖");

  // Toggle Theme
  const toggleTheme = () => {
    sound.playClick();
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('eternal_love_theme', next);
    romanticAudio.playLoveChime();
  };

  // Toggle Sound
  const toggleSound = () => {
    romanticAudio.toggleHaareya();
    const nextMuted = romanticAudio.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      sound.playClick();
    }
  };

  // Heart Explosion Interaction
  const handleHeartExplosion = (e: React.MouseEvent) => {
    e.stopPropagation();
    romanticAudio.playLoveChime();
    romanticAudio.playHeartbeat();

    setLoveCount((prev) => {
      const next = prev + 1;
      localStorage.setItem(`love_counter_${profile.username}`, String(next));
      return next;
    });

    // Particle Burst from button position
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 45,
      spread: 75,
      startVelocity: 32,
      origin: { x, y },
      colors: theme === 'dark'
        ? ['#f43f5e', '#fb7185', '#ec4899', '#fde047', '#ffffff']
        : ['#fb7185', '#f472b6', '#c084fc', '#fef08a', '#fda4af'],
      shapes: ['circle'],
      scalar: 1.25,
    });
  };

  // Main Surprise Trigger
  const handleTriggerSurprise = () => {
    romanticAudio.playLoveChime();
    romanticAudio.playHeartbeat();
    setShowSurprise(true);

    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.4 },
      colors: ['#f43f5e', '#ec4899', '#fb7185', '#fde047', '#ff69b4', '#ffffff'],
    });
  };

  // Copy Friend Code
  const handleCopyCode = () => {
    if (!profile.friendCode) return;
    navigator.clipboard.writeText(profile.friendCode);
    setCopiedCode(true);
    sound.playClick();
    romanticAudio.playLoveChime();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Copy Profile Link
  const handleCopyLink = () => {
    const code = profile.friendCode || profile.username;
    const url = `${window.location.origin}/profile?code=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    sound.playClick();
    romanticAudio.playLoveChime();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    sound.playClick();
    const code = profile.friendCode || profile.username;
    const url = `${window.location.origin}/profile?code=${encodeURIComponent(code)}`;
    const text = `💖 *16 PARCHI • ETERNAL LOVE INVITATION* 💖

${profile.displayName} has invited you to play 16 Parchi together!

🆔 *Player Friend Code:* ${profile.friendCode || profile.username}
✨ *Royalty:* 3D Sovereign Experience

👇 *Click to Play Together & View Profile:*
${url}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Cupid Interaction
  const handleCupidClick = () => {
    romanticAudio.playLoveChime();
    const quotes = [
      "Love is the ultimate winning card! 🏹💖",
      "May eternal happiness follow every move! ✨",
      "Cupid sends a cloud of golden blessings! 🌸",
      "A pure heart always rules the table! 👑",
    ];
    setCupidGreeting(quotes[Math.floor(Math.random() * quotes.length)]);

    confetti({
      particleCount: 30,
      spread: 60,
      origin: { x: 0.85, y: 0.25 },
      colors: ['#f43f5e', '#fef08a', '#f472b6'],
    });
  };

  const winRate =
    profile.winRate !== undefined
      ? profile.winRate
      : (profile.gamesPlayed || 0) > 0
      ? Math.round(((profile.gamesWon || 0) / (profile.gamesPlayed || 1)) * 100)
      : 0;

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden transition-colors duration-700 select-none ${
        theme === 'dark'
          ? 'bg-gradient-to-b from-[#0e0307] via-[#1a0510] to-[#0a0206] text-rose-50'
          : 'bg-gradient-to-b from-[#fff5f7] via-[#fdf2f8] to-[#fce7f3] text-stone-900'
      }`}
    >
      {/* 1. 3D Romantic World Canvas (Three.js Scene) */}
      <EternalLoveScene3D
        theme={theme}
        onCupidClick={handleCupidClick}
      />

      {/* 2. Top Interactive Utility Bar (Theme, Sound, Back) */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between">
        {onBack ? (
          <button
            onClick={() => {
              sound.playClick();
              romanticAudio.stopHaareya();
              onBack();
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border transition-all ${
              theme === 'dark'
                ? 'bg-black/40 border-rose-500/30 text-rose-200 hover:border-rose-400'
                : 'bg-white/70 border-pink-300/60 text-pink-900 hover:border-pink-400'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-base animate-pulse">💖</span>
            <span className={`text-xs font-black tracking-widest uppercase ${
              theme === 'dark' ? 'text-rose-300' : 'text-pink-600'
            }`}>
              Eternal Love Universe
            </span>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          {/* Sound Toggle Button */}
          <button
            onClick={toggleSound}
            title={isMuted ? 'Turn on romantic audio experience' : 'Mute audio'}
            className={`p-2.5 rounded-full backdrop-blur-md border transition-all hover:scale-110 active:scale-95 ${
              theme === 'dark'
                ? isMuted
                  ? 'bg-black/50 border-rose-900 text-stone-400'
                  : 'bg-rose-950/80 border-rose-400 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                : isMuted
                ? 'bg-white/60 border-pink-200 text-stone-400'
                : 'bg-pink-100 border-pink-400 text-pink-700 shadow-[0_0_15px_rgba(236,72,153,0.4)]'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-rose-400 animate-pulse" />}
          </button>

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light Dream' : 'Dark Romantic'} Mode`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border transition-all hover:scale-105 active:scale-95 ${
              theme === 'dark'
                ? 'bg-rose-950/60 border-rose-500/40 text-amber-200 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                : 'bg-white/80 border-pink-300 text-pink-800 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
            }`}
          >
            {theme === 'dark' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-rose-300" />
                <span className="text-[11px] font-bold">Dark Romantic</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-bold">Light Dream</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Cupid Floating Companion Bubble */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 pt-3 flex justify-end">
        <div
          onClick={handleCupidClick}
          className={`cursor-pointer px-3.5 py-1.5 rounded-2xl backdrop-blur-md border text-xs font-medium flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all ${
            theme === 'dark'
              ? 'bg-rose-950/60 border-rose-500/40 text-pink-200'
              : 'bg-white/80 border-pink-200 text-pink-900'
          }`}
        >
          <span className="text-base">🏹</span>
          <span className="truncate max-w-[240px] sm:max-w-none">{cupidGreeting}</span>
        </div>
      </div>

      {/* 4. Main Glassmorphic Profile Card */}
      <div className="relative z-20 max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div
          className={`relative rounded-[36px] p-6 sm:p-10 backdrop-blur-xl border-2 transition-all duration-500 shadow-2xl overflow-hidden ${
            theme === 'dark'
              ? 'bg-gradient-to-b from-[#1c0812]/80 via-[#270b1a]/75 to-[#12040c]/85 border-rose-500/60 shadow-[0_0_60px_rgba(244,63,94,0.35)]'
              : 'bg-gradient-to-b from-white/85 via-pink-50/80 to-white/90 border-pink-300/80 shadow-[0_0_50px_rgba(244,63,94,0.2)]'
          }`}
        >
          {/* Decorative Corner Shimmer Accents */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-rose-500/20 via-pink-400/10 to-transparent rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-44 h-44 bg-gradient-to-tr from-pink-500/20 via-rose-400/10 to-transparent rounded-full blur-2xl pointer-events-none" />

          {/* Profile Header */}
          <div className="flex flex-col items-center text-center relative z-10">
            {/* 3D Animated Royal Gem Avatar Frame */}
            <div className="relative mb-4 group cursor-pointer" onClick={handleHeartExplosion}>
              {/* Outer Pulsing Glow */}
              <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-rose-600 via-pink-500 to-amber-300 blur-md opacity-80 group-hover:opacity-100 transition-opacity animate-pulse" />

              {/* Shimmering Multi-Gem Ring */}
              <div className="relative p-2 rounded-full bg-gradient-to-tr from-rose-500 via-pink-400 to-amber-300 animate-heartbeat-3d shadow-[0_0_30px_rgba(244,63,94,0.8)]">
                <div className="p-1 rounded-full bg-gradient-to-b from-amber-200 via-rose-950 to-pink-900">
                  <img
                    src={profile.avatarUrl}
                    alt={profile.displayName}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover bg-stone-900 border-2 border-white/70 shadow-inner group-hover:scale-105 transition-transform"
                  />
                </div>
              </div>

              {/* Floating Sovereign Crown */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-0.5 rounded-full bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 border border-amber-200/80 shadow-[0_4px_16px_rgba(244,63,94,0.9)] pointer-events-none whitespace-nowrap z-30">
                <Crown className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
                <span className="text-[10px] font-black tracking-widest text-white uppercase drop-shadow">
                  Sovereign 💕
                </span>
              </div>

              {/* Mini Interactive Heart Burst Trigger on Avatar */}
              <span className="absolute -bottom-1 -right-1 text-lg animate-bounce pointer-events-none drop-shadow">
                💖
              </span>
            </div>

            {/* Sovereign Badge Tag */}
            <div className="mb-2 inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-rose-950/90 via-pink-900/80 to-amber-950/90 border border-rose-400/80 shadow-[0_0_20px_rgba(244,63,94,0.5)]">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-xs font-black tracking-wider bg-gradient-to-r from-rose-200 via-pink-100 to-amber-200 bg-clip-text text-transparent">
                Royal Sovereign of Hearts
              </span>
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 animate-pulse" />
            </div>

            {/* Display Name with Unique Sovereign Typography */}
            <div className="my-1">
              <VipUniqueName name={profile.displayName} className="text-3xl sm:text-5xl" showTitle={false} />
            </div>

            <p className={`text-xs mt-1 font-mono ${theme === 'dark' ? 'text-pink-300/80' : 'text-pink-700/80'}`}>
              @{profile.username}
            </p>

            {/* Romantic Quote */}
            <p className={`mt-2 text-xs italic max-w-md ${theme === 'dark' ? 'text-rose-200/70' : 'text-stone-600'}`}>
              "In a universe of millions, you are my one and only sovereign."
            </p>

            {/* 1-Tap Friend Code Pill */}
            {profile.friendCode && (
              <button
                onClick={handleCopyCode}
                title="Tap to copy Friend Code"
                className={`mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all hover:scale-105 active:scale-95 ${
                  theme === 'dark'
                    ? 'bg-rose-950/70 border border-rose-400/50 text-pink-200 hover:border-pink-300'
                    : 'bg-pink-100/80 border border-pink-300 text-pink-900 hover:border-pink-400'
                }`}
              >
                <span>{profile.friendCode}</span>
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 opacity-70" />
                )}
              </button>
            )}
          </div>

          {/* 5. Signature Heart Reaction Button Bar */}
          <div className="my-6 relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleHeartExplosion}
              title="Click to send love & release 3D heart fireworks"
              className="group relative px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(244,63,94,0.6)] hover:scale-105 active:scale-95 transition-all"
            >
              <Heart className="w-5 h-5 fill-white group-hover:scale-125 transition-transform" />
              <span>Shower Love Hearts</span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-mono">
                {loveCount}
              </span>
            </button>

            <button
              onClick={handleTriggerSurprise}
              title="Click for a magical romantic surprise"
              className={`px-5 py-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${
                theme === 'dark'
                  ? 'bg-rose-950/40 border-rose-400/40 text-pink-200 hover:border-rose-300'
                  : 'bg-white/80 border-pink-300 text-pink-800 hover:border-pink-400'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              <span>Touch of Eternal Love</span>
            </button>
          </div>

          {/* 6. Interactive Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6 relative z-10">
            <div
              className={`p-3.5 rounded-2xl text-center border backdrop-blur-md transition-all hover:scale-105 ${
                theme === 'dark'
                  ? 'bg-rose-950/40 border-rose-400/30 shadow-[0_4px_16px_rgba(244,63,94,0.2)]'
                  : 'bg-white/70 border-pink-200 shadow-sm'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1 opacity-75">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Matches</span>
              </div>
              <div className="text-xl font-black text-rose-400">{profile.gamesPlayed ?? 0}</div>
            </div>

            <div
              className={`p-3.5 rounded-2xl text-center border backdrop-blur-md transition-all hover:scale-105 ${
                theme === 'dark'
                  ? 'bg-rose-950/40 border-rose-400/30 shadow-[0_4px_16px_rgba(244,63,94,0.2)]'
                  : 'bg-white/70 border-pink-200 shadow-sm'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1 opacity-75">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Victories</span>
              </div>
              <div className="text-xl font-black text-amber-300">{profile.gamesWon ?? 0}</div>
            </div>

            <div
              className={`p-3.5 rounded-2xl text-center border backdrop-blur-md transition-all hover:scale-105 ${
                theme === 'dark'
                  ? 'bg-rose-950/40 border-rose-400/30 shadow-[0_4px_16px_rgba(244,63,94,0.2)]'
                  : 'bg-white/70 border-pink-200 shadow-sm'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1 opacity-75">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>Win Rate</span>
              </div>
              <div className="text-xl font-black text-emerald-400">{winRate}%</div>
            </div>
          </div>

          {/* 7. Action Controls (Play Together, WhatsApp, Share Link) */}
          <div className="space-y-2.5 relative z-10">
            <button
              onClick={() => {
                sound.playClick();
                onNavigate?.('rooms');
              }}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-white font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Swords className="w-4 h-4" />
              <span>Challenge Sovereign to 16 Parchi Table</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleShareWhatsApp}
                className="py-2.5 px-4 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Share WhatsApp</span>
              </button>

              <button
                onClick={handleCopyLink}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 ${
                  theme === 'dark'
                    ? 'bg-rose-950/60 hover:bg-rose-900/60 border-rose-400/40 text-pink-200'
                    : 'bg-white/80 hover:bg-pink-50 border-pink-300 text-pink-900'
                }`}
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 8. Romantic Surprise Overlay Modal */}
      {showSurprise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            className={`relative max-w-sm w-full p-8 rounded-3xl border-2 text-center shadow-2xl transition-all ${
              theme === 'dark'
                ? 'bg-gradient-to-b from-[#2b0c1b] to-[#14040d] border-rose-400 shadow-[0_0_60px_rgba(244,63,94,0.6)] text-rose-100'
                : 'bg-white border-pink-400 shadow-[0_0_50px_rgba(236,72,153,0.4)] text-pink-950'
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <span className="text-3xl">💖</span>
            </div>

            <h3 className="text-xl font-serif font-black text-rose-300 mb-2">
              Eternal Love Transmitted
            </h3>

            <p className="text-xs leading-relaxed mb-6 opacity-90">
              "Every parchi dealt, every victory claimed — you reign supreme in the kingdom of hearts.
              May your journey be forever blessed with boundless love and royal glory."
            </p>

            <button
              onClick={() => {
                sound.playClick();
                setShowSurprise(false);
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              Seal With Love ✨
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

