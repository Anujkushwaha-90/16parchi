import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import { History, Trophy, Clock, Swords, Crown } from 'lucide-react';

export const MatchHistoryScreen: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await api.getMatchHistory();
        setMatches(res.matches || []);
      } catch (e) {
        showToast('Failed to load match history', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-black text-ivory-100 flex items-center gap-3">
          <History className="w-8 h-8 text-gold-400" />
          <span>Match History & Career Stats</span>
        </h1>
        <p className="text-xs sm:text-sm text-stone-400 mt-1">
          Review your 16 Parchi past tables, placements, and performance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-table-surface border border-table-border">
          <div className="text-xs text-stone-400 mb-1">Career Matches</div>
          <div className="text-2xl font-black text-ivory-100">{user.gamesPlayed}</div>
        </div>
        <div className="p-4 rounded-2xl bg-table-surface border border-gold-500/40">
          <div className="text-xs text-gold-400 mb-1">1st Place Wins 🏆</div>
          <div className="text-2xl font-black text-gold-300">{user.gamesWon}</div>
        </div>
        <div className="p-4 rounded-2xl bg-table-surface border border-table-border">
          <div className="text-xs text-stone-300 mb-1">Runner Up 🥈</div>
          <div className="text-2xl font-black text-stone-200">{user.secondPlaceCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-table-surface border border-table-border">
          <div className="text-xs text-amber-500 mb-1">3rd Place 🥉</div>
          <div className="text-2xl font-black text-amber-400">{user.thirdPlaceCount}</div>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-3">
        <h3 className="font-serif font-bold text-base text-ivory-100">Recent Matches</h3>

        {loading ? (
          <div className="py-12 text-center text-sm text-stone-400">Loading matches...</div>
        ) : matches.length === 0 ? (
          <div className="py-12 text-center bg-table-surface rounded-3xl border border-table-border p-8">
            <History className="w-10 h-10 text-stone-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-ivory-100 mb-1">No Matches Played Yet</h4>
            <p className="text-xs text-stone-400">Join a table or host a room to record your first game!</p>
          </div>
        ) : (
          matches.map((m) => {
            const isWinner = m.myRank === 1;
            return (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-table-surface border border-table-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-serif font-black text-lg ${
                      isWinner
                        ? 'bg-gold-500 text-table-dark shadow-gold-glow'
                        : 'bg-table-card border border-table-border text-stone-300'
                    }`}
                  >
                    {m.myRank ? `#${m.myRank}` : '—'}
                  </div>

                  <div>
                    <div className="text-sm font-bold text-ivory-100 flex items-center gap-2">
                      <span>Room {m.roomCode}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-stone-400 uppercase font-mono">
                        {m.cardTheme || 'royals'}
                      </span>
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(m.startedAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{m.durationSeconds ? `${m.durationSeconds}s duration` : 'Completed'}</span>
                    </div>
                  </div>
                </div>

                {/* Placement result pill */}
                <div className="flex items-center gap-3">
                  {m.myCardName && (
                    <span className="text-xs text-gold-300 font-mono">
                      Set: 4x {m.myCardName}
                    </span>
                  )}
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      isWinner
                        ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40'
                        : m.myRank === 2
                        ? 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                        : m.myRank === 3
                        ? 'bg-amber-700/20 text-amber-400 border border-amber-700/40'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {isWinner ? '1st Place 🏆' : m.myRank ? `${m.myRank}th Place` : 'Finished'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
