import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { sound } from '../services/sound.js';
import { api } from '../services/api.js';
import { RoomInvite } from '../types/index.js';
import { VipLoveAura, VipBadgeTag } from '../components/VipLoveAura.js';
import { isVipUser } from '../utils/vip.js';
import { isDuoMember, isDuoBoy, isDuoGirl, DuoBadgeTag } from '../utils/duo.js';
import { DynamicDuoHandholdModal } from '../components/DynamicDuo/DynamicDuoHandholdModal.js';
import { PlayerAvatar } from '../components/PlayerAvatar.js';
import {
  Trophy,
  Swords,
  Users,
  PlusCircle,
  LogIn,
  Crown,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  BellRing,
  Camera,
  Shield,
  Heart,
} from 'lucide-react';

interface DashboardScreenProps {
  onNavigate: (screen: string) => void;
  onJoinRoomByCode: (code: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  onJoinRoomByCode,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isVip = isVipUser(user);
  const isDuo = isDuoMember(user);
  const isBoy = isDuoBoy(user);
  const isGirl = isDuoGirl(user);
  const [invites, setInvites] = useState<RoomInvite[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isDuoModalOpen, setIsDuoModalOpen] = useState(false);
  const [isQuickMatching, setIsQuickMatching] = useState(false);

  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const res = await api.getPendingRoomInvites();
        setInvites(res.invites || []);
      } catch (e) {}
    };
    fetchInvites();
    const interval = setInterval(fetchInvites, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const winRate =
    user.gamesPlayed > 0 ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.friendCode);
    setCopiedCode(true);
    sound.playClick();
    showToast('Friend code copied!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCodeInput.trim().toUpperCase();
    if (clean.length < 4) {
      showToast('Please enter a valid room code', 'error');
      return;
    }
    sound.playClick();
    onJoinRoomByCode(clean);
  };

  const handleQuickMatch = async () => {
    try {
      setIsQuickMatching(true);
      sound.playClick();
      const res = await api.quickMatch();
      if (res.success && res.roomCode) {
        showToast(res.message || '⚡ Quick match ready!', 'gold');
        onJoinRoomByCode(res.roomCode);
      }
    } catch (err: any) {
      showToast(err.message || 'Could not start quick match', 'error');
    } finally {
      setIsQuickMatching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Pending Room Invitations Banner */}
      {invites.length > 0 && (
        <div className="space-y-3">
          {invites.map((inv) => (
            <div
              key={inv.id}
              className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 to-emerald-950/80 border border-gold-500/50 shadow-gold-glow flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gold-500/20 text-gold-400">
                  <BellRing className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="text-sm font-bold text-ivory-100 flex items-center gap-2">
                    <span>{inv.inviter.displayName} invited you to play!</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/40 text-gold-300">
                      Room {inv.room.code}
                    </span>
                  </div>
                  <div className="text-xs text-stone-400">16 Parchi Private Room</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sound.playClick();
                    onJoinRoomByCode(inv.room.code);
                  }}
                  className="gold-gradient-btn px-4 py-2 rounded-xl text-xs font-bold shadow-md"
                >
                  Join Table
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Player Header Banner */}
      <div
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl transition-all ${
          isVip
            ? 'bg-gradient-to-br from-stone-950 via-rose-950/30 to-stone-950 border-2 border-rose-500/60 shadow-[0_0_40px_rgba(244,63,94,0.3)]'
            : isDuo
            ? isBoy
              ? 'bg-gradient-to-br from-[#0a1128] via-[#101f42] to-[#080d1e] border-2 border-cyan-400/80 shadow-[0_0_45px_rgba(56,189,248,0.45)]'
              : 'bg-gradient-to-br from-[#200918] via-[#330f26] to-[#160510] border-2 border-rose-400/80 shadow-[0_0_45px_rgba(244,63,94,0.45)]'
            : 'bg-gradient-to-br from-table-surface via-table-card to-emerald-950/30 border border-table-border'
        }`}
      >
        {isVip && (
          <div className="absolute -top-24 -left-24 w-60 h-60 bg-rose-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        )}
        {isDuo && (
          <div
            className={`absolute -top-24 -left-24 w-60 h-60 rounded-full blur-3xl pointer-events-none animate-pulse ${
              isBoy ? 'bg-cyan-500/25' : 'bg-rose-500/25'
            }`}
          />
        )}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-6">
            {isVip ? (
              <div className="relative group">
                <VipLoveAura size="lg">
                  <PlayerAvatar
                    src={user.avatarUrl}
                    name={user.displayName}
                    alt={user.displayName}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/60 object-cover bg-stone-900 shadow-md cursor-pointer"
                    onClick={() => {
                      sound.playClick();
                      onNavigate('settings');
                    }}
                  />
                </VipLoveAura>
                <button
                  onClick={() => {
                    sound.playClick();
                    onNavigate('settings');
                  }}
                  title="Change Profile Photo"
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-gold-500 hover:bg-gold-400 text-table-dark shadow-md transition-transform hover:scale-110 border border-table-dark"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : isDuo ? (
              <div
                className="relative group cursor-pointer"
                onClick={() => {
                  sound.playClick();
                  setIsDuoModalOpen(true);
                }}
                title="Dynamic Duo • Tap to open 3D Universe"
              >
                <PlayerAvatar
                  src={user.avatarUrl}
                  name={user.displayName}
                  alt={user.displayName}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 object-cover bg-stone-900 transition-transform group-hover:scale-105 ${
                    isBoy
                      ? 'border-cyan-300 shadow-[0_0_25px_rgba(56,189,248,0.8)]'
                      : 'border-pink-300 shadow-[0_0_25px_rgba(244,63,94,0.8)]'
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
              <div className="relative group">
                <PlayerAvatar
                  src={user.avatarUrl}
                  name={user.displayName}
                  alt={user.displayName}
                  onClick={() => {
                    sound.playClick();
                    onNavigate('settings');
                  }}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-gold-400/60 object-cover bg-emerald-950 shadow-gold-glow cursor-pointer transition-transform group-hover:scale-105"
                />
                <button
                  onClick={() => {
                    sound.playClick();
                    onNavigate('settings');
                  }}
                  title="Change Profile Photo"
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-gold-500 hover:bg-gold-400 text-table-dark shadow-md transition-transform hover:scale-110 border border-table-dark"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div>
              {isVip && (
                <div className="mb-1.5 animate-bounce">
                  <VipBadgeTag />
                </div>
              )}
              {isDuo && (
                <div className="mb-1.5 animate-bounce">
                  <DuoBadgeTag isBoy={isBoy} streakDays={1} />
                </div>
              )}
              <div className="flex items-center gap-2 mb-1">
                <h2
                  className={`text-xl sm:text-2xl font-serif font-black ${
                    isVip
                      ? 'bg-gradient-to-r from-rose-200 via-pink-100 to-amber-200 bg-clip-text text-transparent drop-shadow'
                      : isDuo
                      ? isBoy
                        ? 'bg-gradient-to-r from-cyan-200 via-sky-100 to-amber-200 bg-clip-text text-transparent drop-shadow'
                        : 'bg-gradient-to-r from-rose-200 via-pink-100 to-amber-200 bg-clip-text text-transparent drop-shadow'
                      : 'text-ivory-100'
                  }`}
                >
                  {user.displayName}
                </h2>
                {isVip ? (
                  <Crown className="w-5 h-5 text-rose-400" />
                ) : isDuo ? (
                  isBoy ? (
                    <Shield className="w-5 h-5 text-cyan-400 animate-pulse" />
                  ) : (
                    <Crown className="w-5 h-5 text-pink-400 animate-pulse" />
                  )
                ) : (
                  <Crown className="w-5 h-5 text-gold-400" />
                )}
              </div>
              <div className="text-xs text-stone-400 font-mono flex items-center gap-3">
                <span>@{user.username}</span>
                <span>•</span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/40 border border-gold-500/30 text-gold-300 hover:border-gold-400 transition-colors"
                >
                  <span>{user.friendCode}</span>
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Win Rate Pill */}
          <div className="flex items-center gap-3 bg-table-dark/80 px-4 py-3 rounded-2xl border border-table-border w-full sm:w-auto justify-between sm:justify-start">
            <div className="p-2.5 rounded-xl bg-gold-500/10 text-gold-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-stone-400 font-semibold uppercase">Win Rate</div>
              <div className="text-lg font-bold text-ivory-100 flex items-center gap-1.5">
                <span>{winRate}%</span>
                <span className="text-xs text-stone-400 font-normal">({user.gamesWon}/{user.gamesPlayed} wins)</span>
              </div>
            </div>
          </div>

          {/* Win Streak Pill */}
          {(user.winStreak || 0) > 0 && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-orange-950/80 to-amber-950/80 px-4 py-3 rounded-2xl border border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.3)] w-full sm:w-auto justify-between sm:justify-start animate-pulse">
              <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 text-xl">
                🔥
              </div>
              <div>
                <div className="text-xs text-orange-300 font-semibold uppercase tracking-wider">Active Streak</div>
                <div className="text-lg font-black text-amber-200">
                  {user.winStreak} {user.winStreak === 1 ? 'Win' : 'Wins in a row'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="mt-8 pt-6 border-t border-table-border/60 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-table-dark/50 border border-table-border/40 text-center">
            <div className="text-xs text-stone-400">Games Played</div>
            <div className="text-lg font-black text-ivory-100">{user.gamesPlayed}</div>
          </div>
          <div className="p-3 rounded-xl bg-table-dark/50 border border-gold-500/30 text-center">
            <div className="text-xs text-gold-400">1st Place 🏆</div>
            <div className="text-lg font-black text-gold-300">{user.gamesWon}</div>
          </div>
          <div className="p-3 rounded-xl bg-table-dark/50 border border-table-border/40 text-center">
            <div className="text-xs text-stone-300">2nd Place 🥈</div>
            <div className="text-lg font-black text-stone-200">{user.secondPlaceCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-table-dark/50 border border-amber-800/40 text-center">
            <div className="text-xs text-amber-500">3rd Place 🥉</div>
            <div className="text-lg font-black text-amber-400">{user.thirdPlaceCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-table-dark/50 border border-table-border/40 text-center col-span-2 sm:col-span-1">
            <div className="text-xs text-stone-500">4th Place</div>
            <div className="text-lg font-black text-stone-400">{user.fourthPlaceCount}</div>
          </div>
        </div>
      </div>

      {/* Dynamic Duo Cosmic Clasp Card (Exclusive to Ayush & Palak) */}
      {isDuo && (
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-cyan-950/70 via-purple-950/70 to-rose-950/70 border-2 border-cyan-400/50 shadow-[0_0_35px_rgba(56,189,248,0.3)] flex flex-col sm:flex-row items-center justify-between gap-5 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-md">
              <span className="text-2xl">🤝</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/30 border border-rose-400/50 text-pink-200">
                  Exclusive Bond
                </span>
                <span className="text-xs text-amber-300 font-mono flex items-center gap-1">
                  🔥 Streak 1 Day
                </span>
              </div>
              <h3 className="text-lg font-serif font-black text-white mt-1">
                Cosmic Dynamic Duo • Ayush & Palak
              </h3>
              <p className="text-xs text-cyan-200/80 mt-0.5">
                Destiny Clasped • Hand-Hold Clasp & Ed Sheeran Song Active 💖
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              setIsDuoModalOpen(true);
            }}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-rose-500 hover:from-cyan-400 hover:to-rose-400 text-white font-black text-xs shadow-[0_0_20px_rgba(56,189,248,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Open 3D Universe (Hand-Hold Clasp)</span>
            <Sparkles className="w-4 h-4 text-amber-200" />
          </button>
        </div>
      )}

      {/* ⚡ Quick Match Hero Section */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-slate-900/60 border border-violet-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-violet-950/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-400/40 text-violet-300 flex items-center justify-center font-bold text-xl shrink-0 shadow-inner">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/20 border border-violet-400/30 text-violet-300 font-mono">
                Speed Queue
              </span>
              <span className="text-xs text-slate-400 font-medium font-mono">
                Instant Table Setup
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide">
              Quick Match Arena
            </h3>
            <p className="text-xs text-slate-400 max-w-xl mt-0.5">
              Jump directly into a 4-player competitive table with ready bots and fast turns.
            </p>
          </div>
        </div>

        <button
          onClick={handleQuickMatch}
          disabled={isQuickMatching}
          className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-950/60 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
        >
          <span>{isQuickMatching ? 'Connecting...' : 'Play Now'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Room Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Room Card */}
        <div className="p-6 rounded-3xl bg-table-surface border border-table-border hover:border-gold-500/50 transition-all flex flex-col justify-between group">
          <div>
            <div className="p-3 rounded-2xl bg-gold-500/10 text-gold-400 w-fit mb-4 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-ivory-100 mb-2">Create Private Room</h3>
            <p className="text-xs text-stone-400 leading-relaxed mb-6">
              Host a 4-player match with custom themes (Royals, Seasons, Elements) and turn timers.
            </p>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('rooms');
            }}
            className="gold-gradient-btn w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
          >
            <span>Host a Room</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Join by Code Card */}
        <div className="p-6 rounded-3xl bg-table-surface border border-table-border hover:border-emerald-500/50 transition-all flex flex-col justify-between group">
          <div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 w-fit mb-4 group-hover:scale-110 transition-transform">
              <LogIn className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-ivory-100 mb-2">Join with Code</h3>
            <p className="text-xs text-stone-400 leading-relaxed mb-4">
              Enter a 6-character room code from your friend to join their active lobby.
            </p>
          </div>
          <form onSubmit={handleQuickJoin} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. PR8K2M"
              maxLength={6}
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 rounded-xl bg-table-card border border-table-border text-xs font-mono tracking-wider uppercase text-ivory-100 focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Join
            </button>
          </form>
        </div>

        {/* Friends Card */}
        <div className="p-6 rounded-3xl bg-table-surface border border-table-border hover:border-purple-500/50 transition-all flex flex-col justify-between group">
          <div>
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 w-fit mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-ivory-100 mb-2">Friends & Invites</h3>
            <p className="text-xs text-stone-400 leading-relaxed mb-6">
              Search players by friend code, view online status, and send direct table invitations.
            </p>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('friends');
            }}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-ivory-100 font-bold text-xs flex items-center justify-center gap-2"
          >
            <span>Open Friends List</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isDuoModalOpen && (
        <DynamicDuoHandholdModal
          isOpen={isDuoModalOpen}
          onClose={() => setIsDuoModalOpen(false)}
          targetUser={user}
        />
      )}
    </div>
  );
};
