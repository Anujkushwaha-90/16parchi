import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useGameSocket } from '../context/SocketContext.js';
import { sound } from '../services/sound.js';
import { Trophy, Medal, RotateCcw, Home, Crown, Bot, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RankingsScreenProps {
  onReturnToLobby: () => void;
  onReturnToDashboard: () => void;
}

export const RankingsScreen: React.FC<RankingsScreenProps> = ({
  onReturnToLobby,
  onReturnToDashboard,
}) => {
  const { user } = useAuth();
  const { publicState, requestRematch, resetGameState } = useGameSocket();

  useEffect(() => {
    sound.playWin();
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#f59e0b', '#fbbf24', '#10b981', '#ffffff', '#ec4899'],
    });
  }, []);

  if (!publicState || !user) return null;

  const rankings = publicState.rankings;

  const handleRematch = () => {
    sound.playClick();
    requestRematch();
    onReturnToLobby();
  };

  const handleLeaveToDashboard = () => {
    sound.playClick();
    resetGameState();
    onReturnToDashboard();
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          title: '1st Place Winner 🏆',
          color: 'from-amber-400 to-amber-600',
          border: 'border-gold-400',
          glow: 'shadow-gold-glow',
        };
      case 2:
        return {
          title: '2nd Place Runner-Up 🥈',
          color: 'from-slate-200 to-slate-400',
          border: 'border-slate-300',
          glow: 'shadow-md',
        };
      case 3:
        return {
          title: '3rd Place 🥉',
          color: 'from-amber-700 to-amber-900',
          border: 'border-amber-700',
          glow: 'shadow-md',
        };
      case 4:
      default:
        return {
          title: '4th Place (Lost)',
          color: 'from-stone-700 to-stone-900',
          border: 'border-stone-700',
          glow: 'shadow-none',
        };
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-center">
      {/* Celebration Header */}
      <div>
        <div className="inline-flex p-4 rounded-3xl bg-gold-500/20 text-gold-400 border border-gold-500/40 mb-3 shadow-gold-glow">
          <Trophy className="w-10 h-10 animate-bounce" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif font-black text-ivory-100 tracking-tight">
          Match Concluded!
        </h1>
        <p className="text-sm text-stone-400 mt-2">
          Final authoritative rankings for Room {publicState.roomCode}
        </p>
      </div>

      {/* Podium Cards List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        {rankings.map((entry) => {
          const badge = getRankBadge(entry.rank);
          const isMe = entry.userId === user.id;

          return (
            <div
              key={entry.rank}
              className={`relative p-6 rounded-3xl bg-table-surface border flex flex-col items-center justify-between transition-all ${badge.border} ${badge.glow} ${
                entry.rank === 1 ? 'scale-105 z-10' : ''
              }`}
            >
              {/* Rank Position Pill */}
              <div
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-4 text-white bg-gradient-to-r ${badge.color}`}
              >
                {badge.title}
              </div>

              {/* Avatar */}
              <div className="relative mb-3">
                <img
                  src={entry.avatarUrl}
                  alt={entry.displayName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/20 object-cover bg-emerald-950 shadow-lg"
                />
                {entry.isBot && (
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-cyan-950 border border-cyan-400 text-cyan-300">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Player Name */}
              <div className="mb-4">
                <div className="text-base font-bold text-ivory-100 flex items-center justify-center gap-1.5">
                  <span>{entry.displayName}</span>
                  {isMe && <span className="text-xs text-gold-400 font-mono">(You)</span>}
                </div>
                <div className="text-xs text-stone-400 font-mono mt-0.5">
                  Completed 4x {entry.cardName}
                </div>
              </div>

              {/* Crown for winner */}
              {entry.rank === 1 && (
                <div className="flex items-center gap-1 text-gold-400 text-xs font-bold font-serif">
                  <Crown className="w-4 h-4" />
                  <span>Grand Champion</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={handleRematch}
          className="gold-gradient-btn w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-black shadow-gold-glow flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Play Again / Rematch</span>
        </button>

        <button
          onClick={handleLeaveToDashboard}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-table-border bg-table-card hover:bg-white/5 text-xs sm:text-sm font-bold text-stone-300 hover:text-ivory-100 flex items-center justify-center gap-2 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};
