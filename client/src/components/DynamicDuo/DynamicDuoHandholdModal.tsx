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
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{ id: number; emoji: string; x: number }>>([]);

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

    // Add multiple floating emojis
    for (let i = 0; i < 6; i++) {
      const newEmoji = {
        id: Date.now() + i,
        emoji,
        x: 20 + Math.random() * 60,
      };
      setFloatingEmojis((prev) => [...prev, newEmoji]);
      setTimeout(() => {
        setFloatingEmojis((prev) => prev.filter((item) => item.id !== newEmoji.id));
      }, 2500);
    }

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 },
      colors: type === 'ROSE' ? ['#f43f5e', '#e11d48'] : ['#ec4899', '#fde047', '#38bdf8'],
    });

    const actionText =
      type === 'KISS' ? 'Flying Kiss sent with all your love! 💋' : type === 'ROSE' ? 'A Crimson Rose sent! 🌹' : 'A Warm Loving Hug sent! 🫂';
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

          {/* Floating Screen Emojis */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
            {floatingEmojis.map((item) => (
              <span
                key={item.id}
                style={{ left: `${item.x}%` }}
                className="absolute bottom-10 text-3xl animate-bounce transition-all duration-1000 opacity-90 transform -translate-y-48"
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

