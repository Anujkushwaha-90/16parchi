import { romanticAudio } from '../../services/romanticAudio.js';
import { duoAudio } from '../../services/duoAudio.js';
import { isDuoMember, isDuoBoy, isDuoGirl, DuoBadgeTag, DuoUniqueName } from '../../utils/duo.js';
import { DynamicDuoHandholdModal } from '../DynamicDuo/DynamicDuoHandholdModal.js';
import { PlayerAvatar } from '../PlayerAvatar.js';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { sound } from '../../services/sound.js';
import { api } from '../../services/api.js';
import { VipLoveAura, VipBadgeTag } from '../VipLoveAura.js';
import { isVipUser, VipUniqueName } from '../../utils/vip.js';
import confetti from 'canvas-confetti';
import {
  X,
  Crown,
  Trophy,
  Award,
  Flame,
  Copy,
  Check,
  UserPlus,
  Share2,
  Settings,
  History,
  Bot,
  Heart,
  Sparkles,
  Camera,
  Shield,
} from 'lucide-react';

export interface ProfileModalData {
  id?: string;
  userId?: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  friendCode?: string;
  email?: string;
  gamesPlayed?: number;
  gamesWon?: number;
  secondPlaceCount?: number;
  thirdPlaceCount?: number;
  winRate?: number;
  isOnline?: boolean;
  isBot?: boolean;
  isVipUser?: boolean;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  target?: ProfileModalData | null;
  onNavigate?: (screen: string, extraParam?: string) => void;
}

const autoPlayedProfileKeys = new Set<string>();

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  target,
  onNavigate,
}) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<ProfileModalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [loveShowerCount, setLoveShowerCount] = useState(0);
  const [isHandholdModalOpen, setIsHandholdModalOpen] = useState(false);
  const [isHaareyaPlaying, setIsHaareyaPlaying] = useState<boolean>(romanticAudio.getHaareyaPlaying());
  const targetRef = useRef(target);
  targetRef.current = target;
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const celebratedModalKeyRef = useRef<string | null>(null);

  useEffect(() => {
    romanticAudio.setHaareyaCallback((playing) => {
      setIsHaareyaPlaying(playing);
    });
    return () => {
      romanticAudio.setHaareyaCallback(() => {});
    };
  }, []);

  const effectiveId = target?.id || target?.userId || (target?.friendCode ? target.friendCode : null);
  const isSelf = Boolean(
    currentUser &&
      (effectiveId === currentUser.id ||
        target?.username === currentUser.username ||
        target?.friendCode === currentUser.friendCode)
  );

  // VIP Check strictly for anujkushwaha9090@gmail.com
  const isVip = Boolean(
    isVipUser(profile) ||
    isVipUser(target) ||
    (isSelf && isVipUser(currentUser))
  );

  // Dynamic Duo Check (Ayush Singh & Palak Pandey)
  const isDuo = Boolean(
    isDuoMember(profile) ||
    isDuoMember(target) ||
    (isSelf && isDuoMember(currentUser))
  );
  const isBoy = Boolean(isDuoBoy(profile) || isDuoBoy(target) || (isSelf && isDuoBoy(currentUser)));
  const isGirl = Boolean(isDuoGirl(profile) || isDuoGirl(target) || (isSelf && isDuoGirl(currentUser)));

  // Fetch profile data & manage audio cleanup solely when modal opens/closes or target ID changes
  useEffect(() => {
    if (!isOpen) {
      celebratedModalKeyRef.current = null;
      romanticAudio.stopHaareya();
      duoAudio.stopDuoSong();
      return;
    }

    const latestTarget = targetRef.current;
    const latestUser = currentUserRef.current;

    if (latestTarget) {
      setProfile(latestTarget);
    }
    setRequestSent(false);
    setIsFriend(false);

    if (effectiveId && !latestTarget?.isBot) {
      setLoading(true);
      api
        .getPlayerProfile(effectiveId)
        .then((res: any) => {
          if (res && res.profile) {
            setProfile((prev) => ({
              ...(prev || {}),
              ...res.profile,
            }));
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));

      const viewingSelf = Boolean(
        latestUser &&
          (effectiveId === latestUser.id ||
            latestTarget?.username === latestUser.username ||
            latestTarget?.friendCode === latestUser.friendCode)
      );

      if (!viewingSelf && latestUser) {
        api
          .getFriends()
          .then((res: any) => {
            if (res && res.friends) {
              const matched = res.friends.some(
                (f: any) => f.id === effectiveId || f.friendCode === latestTarget?.friendCode
              );
              setIsFriend(matched);
            }
          })
          .catch(() => {});
      }
    }

    return () => {
      // Stop background songs only when modal closes, target switches, or component unmounts
      romanticAudio.stopHaareya();
      duoAudio.stopDuoSong();
    };
  }, [isOpen, effectiveId]);

  // Trigger VIP / Duo celebration and song on modal open
  useEffect(() => {
    if (!isOpen || (!isVip && !isDuo)) return;

    if (isVip) {
      sound.playWin();
      confetti({
        particleCount: 65,
        spread: 85,
        origin: { y: 0.5 },
        colors: ['#f43f5e', '#ec4899', '#fb7185', '#f59e0b', '#ffffff'],
      });
      romanticAudio.playHaareya(true);
    } else if (isDuo) {
      sound.playWin();
      confetti({
        particleCount: 65,
        spread: 85,
        origin: { y: 0.5 },
        colors: isBoy
          ? ['#38bdf8', '#0284c7', '#f59e0b', '#ffffff']
          : ['#f43f5e', '#fb7185', '#fde047', '#ffffff'],
      });
      duoAudio.playDuoSong();
    }
  }, [isOpen, effectiveId, isVip, isDuo, isBoy]);

  if (!isOpen || !profile) return null;

  const handleCopyCode = () => {
    if (!profile.friendCode) return;
    navigator.clipboard.writeText(profile.friendCode);
    setCopiedCode(true);
    sound.playClick();
    showToast(`Friend Code ${profile.friendCode} copied!`, 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyShareLink = () => {
    const code = profile.friendCode || profile.username;
    const shareUrl = `${window.location.origin}/profile?code=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    sound.playClick();
    showToast('Profile share link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleTriggerLoveShower = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    setLoveShowerCount((prev) => prev + 1);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 40,
      spread: 90,
      startVelocity: 30,
      origin: { x, y },
      colors: ['#f43f5e', '#fda4af', '#ec4899', '#fde047', '#ff69b4'],
    });
    showToast('💖 3D Love Shower unleashed!', 'success');
  };

  const handleSendFriendRequest = async () => {
    if (!currentUser) {
      showToast('Please sign in to add friends', 'info');
      return;
    }
    setSendingRequest(true);
    sound.playClick();
    try {
      await api.sendFriendRequest(
        profile.id || profile.userId,
        profile.friendCode
      );
      setRequestSent(true);
      if (isVip) {
        romanticAudio.playLoveChime();
        confetti({
          particleCount: 80,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#f43f5e', '#fb7185', '#ec4899', '#fde047', '#ffffff'],
        });
        showToast('💖 Royal Petition Delivered to Sovereign Anuj! ✨', 'success');
      } else {
        showToast(`Friend request sent to ${profile.displayName}!`, 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to send friend request', 'error');
    } finally {
      setSendingRequest(false);
    }
  };

  const winRate =
    profile.winRate !== undefined
      ? profile.winRate
      : (profile.gamesPlayed || 0) > 0
      ? Math.round(((profile.gamesWon || 0) / (profile.gamesPlayed || 1)) * 100)
      : 0;

  if (!isOpen || !profile) return null;

  return createPortal(
    <div
      onClick={() => {
        sound.playClick();
        romanticAudio.stopHaareya();
        duoAudio.stopDuoSong();
        onClose();
      }}
      className="fixed inset-0 z-[99999] overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="min-h-full flex items-center justify-center p-4 sm:p-6 text-center">
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-md my-auto rounded-3xl p-5 sm:p-6 shadow-2xl text-left transition-all duration-300 ${
            isVip
              ? 'bg-gradient-to-b from-[#180a10] via-[#220d18] to-[#12050b] border-2 border-rose-400/80 shadow-[0_0_60px_rgba(244,63,94,0.45)]'
              : isDuo
              ? isBoy
                ? 'bg-gradient-to-b from-[#0a1128] via-[#101f42] to-[#080d1e] border-2 border-cyan-400/80 shadow-[0_0_60px_rgba(56,189,248,0.45)]'
                : 'bg-gradient-to-b from-[#200918] via-[#330f26] to-[#160510] border-2 border-rose-400/80 shadow-[0_0_60px_rgba(244,63,94,0.45)]'
              : 'bg-table-surface border border-gold-500/40 shadow-2xl'
          }`}
          style={{ perspective: 1200 }}
        >
          {/* VIP 3D Floating Hearts in Background */}
          {isVip && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-10 -left-10 w-64 h-64 bg-rose-500/25 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-pink-500/25 rounded-full blur-3xl animate-pulse" />
              
              {/* Ambient Rising 3D Love Particles */}
              <span className="absolute left-6 bottom-4 text-lg float-heart-1 opacity-70">💖</span>
              <span className="absolute right-8 bottom-12 text-sm float-heart-2 opacity-80">💕</span>
              <span className="absolute left-1/4 bottom-6 text-xl float-heart-3 opacity-75">💘</span>
              <span className="absolute right-1/4 bottom-2 text-base float-heart-4 opacity-70">🌸</span>
            </div>
          )}

          {/* Duo Ambient Starlight Glow in Background */}
          {isDuo && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div
                className={`absolute -top-10 -left-10 w-64 h-64 rounded-full blur-3xl animate-pulse ${
                  isBoy ? 'bg-cyan-500/20' : 'bg-rose-500/20'
                }`}
              />
              <div
                className={`absolute -bottom-10 -right-10 w-64 h-64 rounded-full blur-3xl animate-pulse ${
                  isBoy ? 'bg-blue-500/20' : 'bg-pink-500/20'
                }`}
              />
              <span className="absolute left-6 bottom-4 text-lg opacity-70 animate-bounce">
                {isBoy ? '🛡️' : '👑'}
              </span>
              <span className="absolute right-8 bottom-12 text-sm opacity-80 animate-pulse">✨</span>
              <span className="absolute left-1/4 bottom-6 text-xl opacity-75 animate-bounce">💖</span>
              <span className="absolute right-1/4 bottom-2 text-base opacity-70 animate-pulse">💫</span>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={() => {
              sound.playClick();
              romanticAudio.stopHaareya();
              duoAudio.stopDuoSong();
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-ivory-100 transition-colors z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Profile Header */}
          <div className="flex flex-col items-center text-center relative z-10 mb-3.5">
            {/* Avatar with optional VIP 3D Love Aura or Duo Crown */}
            {isVip ? (
              <div className="relative mb-2">
                <VipLoveAura size="lg">
                  <PlayerAvatar
                    src={profile.avatarUrl}
                    name={profile.displayName}
                    alt={profile.displayName}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover bg-stone-900 border-2 border-pink-200/90 shadow-[0_0_20px_rgba(244,63,94,0.7)]"
                  />
                </VipLoveAura>
                {isSelf && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      onClose();
                      onNavigate?.('settings');
                    }}
                    title="Change Profile Photo"
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-gold-500 hover:bg-gold-400 text-table-dark shadow-md transition-transform hover:scale-110 border border-table-dark"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : isDuo ? (
              <div
                className="relative mb-2 cursor-pointer group"
                onClick={() => {
                  sound.playClick();
                  setIsHandholdModalOpen(true);
                }}
                title="Dynamic Duo • Click to open Universe 🤝"
              >
                <PlayerAvatar
                  src={profile.avatarUrl}
                  name={profile.displayName}
                  alt={profile.displayName}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover bg-stone-900 border-2 transition-transform duration-300 group-hover:scale-105 ${
                    isBoy
                      ? 'border-cyan-300 shadow-[0_0_22px_rgba(56,189,248,0.7)]'
                      : 'border-pink-300 shadow-[0_0_22px_rgba(244,63,94,0.7)]'
                  }`}
                />
                <div
                  className={`absolute -bottom-1 -right-1 p-1 rounded-full text-white text-xs ${
                    isBoy ? 'bg-cyan-600 border border-cyan-300' : 'bg-rose-600 border border-pink-300'
                  }`}
                >
                  {isBoy ? '🛡️' : '👑'}
                </div>
              </div>
            ) : (
              <div className="relative mb-2">
                <PlayerAvatar
                  src={profile.avatarUrl}
                  name={profile.displayName}
                  alt={profile.displayName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-emerald-950 border-2 border-gold-400/60 shadow-gold-glow"
                />
                {isSelf && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      onClose();
                      onNavigate?.('settings');
                    }}
                    title="Change Profile Photo"
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-gold-500 hover:bg-gold-400 text-table-dark shadow-md transition-transform hover:scale-110 border border-table-dark"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                )}
                {profile.isBot && (
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-cyan-900 border border-cyan-400 text-cyan-200">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
              </div>
            )}

            {/* VIP 3D Badge Tag */}
            {isVip && (
              <div className="mb-1.5">
                <VipBadgeTag subtitle="Eternal Reign of Pure Love ✨" />
              </div>
            )}

            {/* Dynamic Duo Badge Tag */}
            {isDuo && (
              <div className="mb-2">
                <DuoBadgeTag isBoy={isBoy} streakDays={1} />
              </div>
            )}

            {/* Player Name */}
            {isVip ? (
              <VipUniqueName name={profile.displayName} className="text-xl sm:text-2xl" titleClassName="mt-0.5" />
            ) : isDuo ? (
              <DuoUniqueName name={profile.displayName} isBoy={isBoy} className="text-xl sm:text-2xl" />
            ) : (
              <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-ivory-100">
                {profile.displayName}
              </h2>
            )}

            <p className="text-xs text-stone-400 mt-0.5 font-medium">@{profile.username}</p>

            {/* Friend Code Pill */}
            {profile.friendCode && (
              <button
                onClick={handleCopyCode}
                title="Click to copy Friend Code"
                className={`mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono transition-colors ${
                  isVip
                    ? 'bg-rose-950/60 border border-rose-400/50 text-pink-200 hover:border-pink-300'
                    : isDuo
                    ? isBoy
                      ? 'bg-cyan-950/60 border border-cyan-400/50 text-cyan-200 hover:border-cyan-300'
                      : 'bg-rose-950/60 border border-rose-400/50 text-pink-200 hover:border-pink-300'
                    : 'bg-table-dark/70 border border-gold-500/30 text-gold-300 hover:border-gold-400'
                }`}
              >
                <span>{profile.friendCode}</span>
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 opacity-60" />
                )}
              </button>
            )}

            {/* VIP Romantic Song Playing Indicator */}
            {isVip && (
              <div className="mt-2 flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.playClick();
                    const next = romanticAudio.toggleHaareya();
                    setIsHaareyaPlaying(next);
                  }}
                  title={isHaareyaPlaying ? "Song: Haareya • Tap to Pause" : "Song: Haareya • Tap to Play"}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-md ${
                    isHaareyaPlaying
                      ? 'bg-rose-950/80 border border-rose-400 text-pink-200 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                      : 'bg-stone-900/80 border border-amber-500/50 text-amber-300 hover:border-amber-400'
                  }`}
                >
                  <span className="text-xs">{isHaareyaPlaying ? '⏸️' : '▶️'}</span>
                  <span>Haareya • Arijit Singh</span>
                  {isHaareyaPlaying ? (
                    <span className="flex items-center gap-0.5">
                      <span className="w-1 h-3 bg-pink-400 rounded-full animate-bounce" />
                      <span className="w-1 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-3 bg-pink-300 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400/90 font-mono">(Tap to Play)</span>
                  )}
                </button>
              </div>
            )}

            {/* Dynamic Duo Romantic Song Indicator */}
            {isDuo && (
              <div className="mt-2 flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.playClick();
                    duoAudio.toggleDuoSong();
                  }}
                  title="Song: Perfect • Ed Sheeran • Tap to Pause / Play"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all hover:scale-105 active:scale-95 ${
                    isBoy
                      ? 'bg-cyan-950/70 border-cyan-400/40 text-cyan-200 hover:border-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                      : 'bg-rose-950/70 border-rose-400/40 text-pink-200 hover:border-pink-300 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                  }`}
                >
                  <span className="text-xs animate-pulse">🎵</span>
                  <span>Perfect • Ed Sheeran</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                </button>
              </div>
            )}

            {profile.isBot && (
              <div className="mt-1.5 px-3 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[11px] text-cyan-300 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" />
                <span>AI Automated Bot</span>
              </div>
            )}
          </div>

          {/* Dynamic Duo 3D Hand-Hold Universe Button */}
          {isDuo && (
            <div className="mb-3 relative z-10">
              <button
                onClick={() => {
                  sound.playClick();
                  setIsHandholdModalOpen(true);
                }}
                className={`w-full py-2.5 px-3 rounded-2xl text-white text-xs font-black flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg ${
                  isBoy
                    ? 'bg-gradient-to-r from-cyan-600 via-sky-600 to-amber-500 hover:from-cyan-500 hover:to-amber-400 shadow-[0_0_20px_rgba(56,189,248,0.6)]'
                    : 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                }`}
              >
                <span className="text-base">🤝</span>
                <span>3D Dynamic Duo Universe (Hand-Hold)</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-mono">3D ✨</span>
              </button>
            </div>
          )}

        {/* 3D Interactive Love Shower & 3D Universe Entry for VIP */}
        {isVip && (
          <div className="mb-3 relative z-10 space-y-1.5">
            <button
              onClick={() => {
                sound.playClick();
                onClose();
                const code = profile.friendCode || profile.username;
                window.history.pushState({}, '', '/?code=' + encodeURIComponent(code));
                onNavigate?.('profile', code);
              }}
              className="w-full py-2 px-3 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-black flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(244,63,94,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="text-base">🏹</span>
              <span>Enter 3D Eternal Love Universe</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-mono">3D ✨</span>
            </button>

            <button
              onClick={handleTriggerLoveShower}
              className="w-full py-1.5 px-3 rounded-2xl bg-gradient-to-r from-rose-900/60 via-pink-900/60 to-amber-900/40 border border-rose-400/50 hover:border-rose-300 text-pink-100 text-xs font-black flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="text-base animate-pulse">💖</span>
              <span>Tap for 3D Love Shower</span>
              <span className="text-xs bg-rose-500/40 px-2 py-0.5 rounded-full font-mono">
                {loveShowerCount > 0 ? `+${loveShowerCount} Love` : 'Free ✨'}
              </span>
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3.5 relative z-10">
          <div
            className={`p-3 rounded-2xl text-center border transition-all ${
              isVip
                ? 'bg-rose-950/40 border-rose-400/30 shadow-[0_4px_12px_rgba(244,63,94,0.15)]'
                : 'bg-table-dark/60 border-table-border/60'
            }`}
          >
            <div className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              {isVip ? <Heart className="w-3 h-3 text-rose-400 fill-rose-400" /> : <Flame className="w-3 h-3 text-amber-400" />}
              <span>Played</span>
            </div>
            <div className={`text-lg font-black ${isVip ? 'text-pink-100' : 'text-ivory-100'}`}>
              {profile.gamesPlayed ?? 0}
            </div>
          </div>

          <div
            className={`p-3 rounded-2xl text-center border transition-all ${
              isVip
                ? 'bg-rose-950/40 border-rose-400/30 shadow-[0_4px_12px_rgba(244,63,94,0.15)]'
                : 'bg-table-dark/60 border-table-border/60'
            }`}
          >
            <div className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              {isVip ? <Crown className="w-3 h-3 text-amber-300 fill-amber-300" /> : <Trophy className="w-3 h-3 text-gold-400" />}
              <span>Victories</span>
            </div>
            <div className={`text-lg font-black ${isVip ? 'text-amber-300' : 'text-gold-300'}`}>
              {profile.gamesWon ?? 0}
            </div>
          </div>

          <div
            className={`p-3 rounded-2xl text-center border transition-all ${
              isVip
                ? 'bg-rose-950/40 border-rose-400/30 shadow-[0_4px_12px_rgba(244,63,94,0.15)]'
                : 'bg-table-dark/60 border-table-border/60'
            }`}
          >
            <div className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              {isVip ? <Sparkles className="w-3 h-3 text-pink-300" /> : <Award className="w-3 h-3 text-emerald-400" />}
              <span>Win Rate</span>
            </div>
            <div className={`text-lg font-black ${isVip ? 'text-rose-300' : 'text-emerald-400'}`}>
              {winRate}%
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2.5 relative z-10">
          {isSelf ? (
            /* Controls for current player */
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  sound.playClick();
                  onClose();
                  onNavigate?.('settings');
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  isVip
                    ? 'bg-rose-950/60 hover:bg-rose-900/60 border border-rose-400/40 text-pink-100'
                    : 'bg-table-dark/80 hover:bg-table-dark border border-gold-500/30 hover:border-gold-400 text-ivory-100'
                }`}
              >
                <Settings className="w-4 h-4 text-pink-300" />
                <span>Edit Profile</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  onClose();
                  onNavigate?.('history');
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                  isVip
                    ? 'bg-rose-950/60 hover:bg-rose-900/60 border border-rose-400/40 text-pink-100'
                    : 'bg-table-dark/80 hover:bg-table-dark border border-gold-500/30 hover:border-gold-400 text-ivory-100'
                }`}
              >
                <History className="w-4 h-4 text-pink-300" />
                <span>Match History</span>
              </button>

              <button
                onClick={handleCopyShareLink}
                className={`col-span-2 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                  isVip
                    ? 'bg-gradient-to-r from-rose-500 via-pink-600 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                    : 'gold-gradient-btn shadow-gold-glow'
                }`}
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Share Royal Profile Link'}</span>
              </button>
            </div>
          ) : (
            /* Controls for opponent viewing this profile */
            <div className="space-y-2">
              {!profile.isBot && (
                <>
                  {isFriend ? (
                    <div className="w-full py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>Already Royal Friends ✓</span>
                    </div>
                  ) : requestSent ? (
                    isVip ? (
                      <div className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-950 via-pink-900 to-amber-950 border border-rose-400 text-rose-200 text-xs font-black flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse">
                        <span className="text-sm">💖</span>
                        <span>Royal Request Delivered to Sovereign Anuj ✓</span>
                      </div>
                    ) : (
                      <div className="w-full py-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />
                        <span>Friend Request Sent!</span>
                      </div>
                    )
                  ) : (
                    <button
                      onClick={handleSendFriendRequest}
                      disabled={sendingRequest}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 ${
                        isVip
                          ? 'bg-gradient-to-r from-rose-500 via-pink-600 to-amber-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                          : 'gold-gradient-btn shadow-gold-glow'
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{sendingRequest ? 'Sending...' : 'Add Friend'}</span>
                    </button>
                  )}
                </>
              )}

              <button
                onClick={handleCopyShareLink}
                className="w-full py-2.5 px-4 rounded-xl bg-table-dark/80 hover:bg-table-dark border border-table-border hover:border-gold-500/40 text-xs font-bold text-stone-300 hover:text-ivory-100 flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Profile Link</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    {isHandholdModalOpen && (
      <DynamicDuoHandholdModal
        isOpen={isHandholdModalOpen}
        onClose={() => setIsHandholdModalOpen(false)}
        targetUser={profile}
      />
    )}
  </div>,
  document.body
);
};
