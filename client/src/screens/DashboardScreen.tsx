import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { sound } from '../services/sound.js';
import { api } from '../services/api.js';
import { RoomInvite } from '../types/index.js';
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
  const [invites, setInvites] = useState<RoomInvite[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');

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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-table-surface via-table-card to-emerald-950/30 border border-table-border p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative">
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-gold-400/60 object-cover bg-emerald-950 shadow-gold-glow"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-table-dark flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl sm:text-2xl font-serif font-black text-ivory-100">
                  {user.displayName}
                </h2>
                <Crown className="w-5 h-5 text-gold-400" />
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
    </div>
  );
};
