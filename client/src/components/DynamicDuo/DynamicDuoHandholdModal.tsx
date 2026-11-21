import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, Sparkles, Flame, Shield, Crown, Send, Music } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DynamicDuoScene3D } from './DynamicDuoScene3D.js';
import { duoAudio } from '../../services/duoAudio.js';
import { sound } from '../../services/sound.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { api } from '../../services/api.js';
import { isDuoBoy, isDuoGirl } from '../../utils/duo.js';

interface DynamicDuoHandholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: any;
}

export const DynamicDuoHandholdModal: React.FC<DynamicDuoHandholdModalProps> = ({
  isOpen,
  onClose,
  targetUser,
}) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [duoData, setDuoData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isAccepted, setIsAccepted] = useState(true); // Default true for preview or live
  const [actionLoading, setActionLoading] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<
    Array<{ id: number; emoji: string; x: number; drift: number; scale: number; duration: number; delay: number }>
  >([]);

  const isBoy = isDuoBoy(currentUser);
  const isGirl = isDuoGirl(currentUser);

  // Play romantic song and fetch status on mount
  useEffect(() => {
    if (!isOpen) return;

    duoAudio.playDuoSong();
    sound.playWin();

    confetti({
      particleCount: 85,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#38bdf8', '#f43f5e', '#fb7185', '#fde047', '#ffffff'],
    });

    // Fetch live status from backend
    setLoading(true);
    fetch('/api/duo/status', {
      headers: {
        Authorization: `Bearer ${api.getToken() || ''}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.duo) {
          setDuoData(data.duo);
          setIsAccepted(data.duo.status === 'ACCEPTED');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => {
      duoAudio.stopDuoSong();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Accept Hand-hold
  const handleAcceptHandhold = async () => {
    setActionLoading(true);
    sound.playWin();
    try {
      const res = await fetch('/api/duo/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${api.getToken() || ''}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setIsAccepted(true);
        confetti({
          particleCount: 150,
          spread: 120,
          origin: { y: 0.4 },
          colors: ['#f43f5e', '#fb7185', '#38bdf8', '#fde047', '#ffffff'],
        });
        showToast('💖 Hand Clasped! Dynamic Duo Formed in Destiny! 🤝✨', 'success');
      } else {
        // Fallback for offline/preview
        setIsAccepted(true);
        showToast('💖 Hand Clasped! Dynamic Duo Active! 🤝✨', 'success');
      }
    } catch {
      setIsAccepted(true);
      showToast('💖 Hand Clasped! Dynamic Duo Active! 🤝✨', 'success');
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger floating interaction (Kiss, Rose, Hug)
  const handleInteraction = (type: 'KISS' | 'ROSE' | 'HUG') => {
    sound.playClick();
    const emojiMap = { KISS: '💋', ROSE: '🌹', HUG: '🫂' };
    const emoji = emojiMap[type];

    // Spawn flying particles with full inline CSS animation (guaranteed to fly and never get stuck!)
    const batchId = Date.now();
    const newItems = Array.from({ length: 10 }).map((_, i) => ({
      id: batchId + i + Math.random(),
      emoji,
      x: 10 + Math.random() * 80, // 10% to 90%
      drift: (Math.random() - 0.5) * 120, // drift left or right
      scale: 1.1 + Math.random() * 0.7,
      duration: 1.8 + Math.random() * 0.8,
      delay: i * 0.08,
    }));

    setFloatingEmojis((prev) => [...prev, ...newItems]);
    setTimeout(() => {
      const idsToRemove = new Set(newItems.map((n) => n.id));
      setFloatingEmojis((prev) => prev.filter((item) => !idsToRemove.has(item.id)));
    }, 2800);

    // Pure Confetti emoji blast across the entire screen!
    try {
      if ((confetti as any).shapeFromText) {
        const shape = (confetti as any).shapeFromText({ text: emoji, scalar: 2.8 });
        confetti({
          shapes: [shape],
          scalar: 2.8,
          particleCount: 28,
          spread: 80,
          startVelocity: 35,
          origin: { y: 0.7 },
          ticks: 200,
          gravity: 0.8,
        });
      } else {
        confetti({
          particleCount: 45,
          spread: 80,
          origin: { y: 0.7 },
          colors:
            type === 'ROSE'
              ? ['#f43f5e', '#e11d48', '#fb7185']
              : type === 'KISS'
              ? ['#ec4899', '#f43f5e', '#fda4af']
              : ['#38bdf8', '#818cf8', '#c084fc'],
        });
      }
    } catch {
      confetti({
        particleCount: 45,
        spread: 80,
        origin: { y: 0.7 },
      });
    }

    const actionText =
      type === 'KISS'
        ? 'Flying Kiss sent with all your love! 💋'
        : type === 'ROSE'
        ? 'A Crimson Rose sent! 🌹'
        : 'A Warm Loving Hug sent! 🫂';
    showToast(actionText, 'success');

    // Fire API call asynchronously
    fetch('/api/duo/interact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${api.getToken() || ''}`,
      },
      body: JSON.stringify({ type }),
    }).catch(() => {});
  };

  const streakDays = duoData?.streakDays || 1;

  return createPortal(
    <div
      onClick={() => {
        sound.playClick();
        duoAudio.stopDuoSong();
        onClose();
      }}
      className="fixed inset-0 z-[99999] overflow-y-auto bg-black/85 backdrop-blur-md animate-fade-in"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="min-h-full flex items-center justify-center p-3 sm:p-5 text-center">
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg my-auto rounded-3xl p-5 sm:p-6 shadow-2xl text-left transition-all duration-300 bg-gradient-to-b from-[#0c1322] via-[#1a0f24] to-[#0d0714] border-2 border-cyan-400/50 shadow-[0_0_60px_rgba(56,189,248,0.35)]"
        >
          {/* Close Button */}
          <button
            onClick={() => {
              sound.playClick();
              duoAudio.stopDuoSong();
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors z-30"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Dynamic Keyframes Injection to guarantee 100% animation execution */}
          <style>{`
            @keyframes flyUpRocket {
              0% {
                transform: translate3d(0, 0, 0) scale(0.6) rotate(0deg);
                opacity: 0;
              }
              15% {
                opacity: 1;
                transform: translate3d(calc(var(--fly-drift, 0px) * 0.3), -70px, 0) scale(1.35) rotate(-10deg);
              }
              50% {
                opacity: 0.95;
                transform: translate3d(calc(var(--fly-drift, 0px) * 0.7), -220px, 0) scale(1.5) rotate(12deg);
              }
              80% {
                opacity: 0.8;
                transform: translate3d(var(--fly-drift, 0px), -380px, 0) scale(1.2) rotate(-6deg);
              }
              100% {
                transform: translate3d(calc(var(--fly-drift, 0px) * 1.3), -540px, 0) scale(0.7) rotate(15deg);
                opacity: 0;
              }
            }
          `}</style>

          {/* Floating Flying Screen Emojis */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
            {floatingEmojis.map((item) => (
              <span
                key={item.id}
                style={{
                  left: `${item.x}%`,
                  bottom: '75px',
                  fontSize: `${2 * item.scale}rem`,
                  animation: `flyUpRocket ${item.duration}s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                  animationDelay: `${item.delay}s`,
                  ['--fly-drift' as any]: `${item.drift}px`,
                }}
                className="absolute select-none pointer-events-none filter drop-shadow-[0_4px_16px_rgba(244,63,94,0.6)]"
              >
                {item.emoji}
              </span>
            ))}
          </div>

          {/* Header Title */}
          <div className="text-center relative z-20 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-950/80 to-rose-950/80 border border-amber-400/50 text-amber-300 text-xs font-black tracking-widest uppercase shadow-md mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              <span>Cosmic Dynamic Duo</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            </div>

            <h2 className="text-xl sm:text-2xl font-serif font-black text-ivory-100 tracking-tight flex items-center justify-center gap-2">
              <span className="text-cyan-300">Ayush Singh</span>
              <span className="text-amber-400 text-base">🤝</span>
              <span className="text-pink-300">Palak Pandey</span>
            </h2>

            {/* Song Pill */}
            <div className="mt-1 flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  duoAudio.toggleDuoSong();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-white/10 hover:bg-white/15 border border-white/20 text-pink-200 transition-all hover:scale-105"
              >
                <Music className="w-3 h-3 text-pink-300 animate-pulse" />
                <span>Perfect • Ed Sheeran</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </button>
            </div>
          </div>

          {/* 3D Scene Viewport */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/50 shadow-inner mb-3">
            <DynamicDuoScene3D isAccepted={isAccepted} />

            {/* Dynamic Hand-Hold Tag */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[11px] font-bold text-white flex items-center gap-1.5 shadow-lg">
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 animate-pulse" />
              <span>{isAccepted ? 'Hand Clasped • Bound Forever' : 'Hand Outstretched • Awaiting Clasp'}</span>
            </div>
          </div>

          {/* Heart Streak & Milestones Bar */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/40 to-rose-950/40 border border-white/15 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300">
                <Flame className="w-5 h-5 text-amber-400 animate-bounce" />
              </div>
              <div>
                <div className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">Daily Heart Streak</div>
                <div className="text-base font-black text-amber-300 flex items-center gap-1">
                  <span>Day {streakDays}</span>
                  <span className="text-xs text-rose-300 font-normal">• Unbreakable Bond</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">Duo Rank</div>
              <div className="text-xs font-black text-cyan-200 flex items-center gap-1 justify-end">
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span>Eternal Legends 💎</span>
              </div>
            </div>
          </div>

          {/* Interactive Accept / Status Button */}
          {!isAccepted && (
            <div className="mb-3">
              <button
                onClick={handleAcceptHandhold}
                disabled={actionLoading}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-600 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(244,63,94,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span className="text-lg">🤝</span>
                <span>Hold His Hand 💕 (Accept Dynamic Duo)</span>
              </button>
            </div>
          )}

          {/* Secret Couple Interactions Row (Kiss, Rose, Hug) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-stone-300 text-center flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3 text-pink-300" />
              <span>Send Instant Duo Reaction</span>
              <Sparkles className="w-3 h-3 text-pink-300" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleInteraction('ROSE')}
                className="py-2 px-3 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-pink-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow"
              >
                <span className="text-base">🌹</span>
                <span>Send Rose</span>
              </button>

              <button
                type="button"
                onClick={() => handleInteraction('KISS')}
                className="py-2 px-3 rounded-xl bg-pink-950/50 hover:bg-pink-900/60 border border-pink-500/40 text-pink-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow"
              >
                <span className="text-base">💋</span>
                <span>Flying Kiss</span>
              </button>

              <button
                type="button"
                onClick={() => handleInteraction('HUG')}
                className="py-2 px-3 rounded-xl bg-sky-950/50 hover:bg-sky-900/60 border border-sky-500/40 text-sky-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow"
              >
                <span className="text-base">🫂</span>
                <span>Tight Hug</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

