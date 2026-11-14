import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useGameSocket } from '../context/SocketContext.js';
import { sound } from '../services/sound.js';
import { useToast } from '../context/ToastContext.js';
import { getBetPenaltySlipText, MATCH_BETS } from '../services/punishments.js';
import { Trophy, Medal, RotateCcw, Home, Crown, Bot, Sparkles, Share2, Copy, Check, Flame, AlertTriangle, ScrollText } from 'lucide-react';
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
  const { showToast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPenalty, setCopiedPenalty] = useState(false);

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
  const winner = rankings.find((r) => r.rank === 1) || rankings[0];
  const isWinnerMe = winner && (winner.userId === user.id || winner.displayName === user.displayName);

  // Loser is the player with the lowest rank (last place)
  const sortedRankings = [...rankings].sort((a, b) => b.rank - a.rank);
  const loser = sortedRankings[0];
  const isLoserMe = loser && (loser.userId === user.id || loser.displayName === user.displayName);

  const penaltyText = getBetPenaltySlipText(
    publicState.matchBet,
    loser ? (isLoserMe ? 'You' : loser.displayName) : 'Loser',
    winner ? (isWinnerMe ? 'You' : winner.displayName) : 'Champion',
    publicState.customBetText
  );

  const getShareUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://16parchi.com';
    return `${origin}/?join=${publicState.roomCode}`;
  };

  const handleShareWhatsApp = () => {
    sound.playClick();
    const shareUrl = getShareUrl();
    const winnerName = isWinnerMe ? 'Maine' : winner?.displayName || 'Player';
    const cardWon = winner?.cardName || '16 Parchi';
    const message = isWinnerMe
      ? `👑 *16 PARCHI CHAMPION ALERT!* 👑\nMaine sabko dhool chata di aur match jeet gaya! 🃏\nWinning Parchi: 4x ${cardWon}\n\nKisme dum hai mujhe harane ka? Aao khel ke dikhao!\n👉 Khelne ke liye click karo: ${shareUrl}`
      : `🔥 16 Parchi Royal Match Concluded!\nWinner: ${winnerName} with 4x ${cardWon}!\n👉 Next match join karo: ${shareUrl}`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    showToast('Opening WhatsApp...', 'success');
  };

  const handleSharePenaltyWhatsApp = () => {
    sound.playClick();
    const shareUrl = getShareUrl();
    const winnerName = isWinnerMe ? '👑 Maine (Champion)' : `👑 ${winner?.displayName || 'Champion'}`;
    const loserName = isLoserMe ? '🤦‍♂️ Main (Haara Hua Khiladi)' : `🤦‍♂️ ${loser?.displayName || 'Loser'}`;

    const roastMessage = `╔════════════════════════════════════════╗
  📜  *16 PARCHI OFFICIAL COURT SLIP*  📜
╚════════════════════════════════════════╝

🎮 *Match Room:* ${publicState.roomCode}
🏆 *Winner:* ${winnerName}
💀 *Loser:* ${loserName}

━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 *SHART KA FAISLA (STRICT PENALTY)* 🚨
"${penaltyText}"
━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ *Table Agreement Clause:*
Chupchaap bina natak kiye shart poori karo, warna pure group ke saamne bezti pakki hai! 😂

👉 *Badla lene ke liye match join karo:*
${shareUrl}`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(roastMessage)}`;
    window.open(whatsappUrl, '_blank');
    showToast('Opening WhatsApp with Official Penalty Slip...', 'success');
  };

  const handleCopyPenaltySlip = () => {
    sound.playClick();
    const shareUrl = getShareUrl();
    const winnerName = isWinnerMe ? '👑 Maine' : `👑 ${winner?.displayName || 'Champion'}`;
    const loserName = isLoserMe ? '🤦‍♂️ Main' : `🤦‍♂️ ${loser?.displayName || 'Loser'}`;

    const roastMessage = `📜 *16 PARCHI OFFICIAL PENALTY SLIP* 📜\nRoom: ${publicState.roomCode}\n🏆 Champion: ${winnerName}\n💀 Loser: ${loserName}\n\n⚠️ *Shart:* "${penaltyText}" 😂\n\n👉 Challenge: ${shareUrl}`;
    navigator.clipboard.writeText(roastMessage);
    setCopiedPenalty(true);
    showToast('Penalty slip copied! Send to friends on WhatsApp/Insta!', 'gold');
    setTimeout(() => setCopiedPenalty(false), 2500);
  };

  const handleCopyChallengeLink = () => {
    sound.playClick();
    const shareUrl = getShareUrl();
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    showToast('Revenge Challenge Link copied to clipboard!', 'gold');
    setTimeout(() => setCopiedLink(false), 2500);
  };

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
      default:
        return {
          title: `${rank}th Place`,
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

      {/* Viral Victory Poster / Story Card */}
      {winner && (
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#2a1a08] via-[#1a1309] to-[#0d0905] border-2 border-gold-400 shadow-[0_0_50px_rgba(245,158,11,0.3)] max-w-2xl mx-auto text-center animate-pulse">
          {/* Decorative Corner Flourishes */}
          <div className="absolute top-2 left-2 text-gold-500/30 text-xl font-serif">✦</div>
          <div className="absolute top-2 right-2 text-gold-500/30 text-xl font-serif">✦</div>
          <div className="absolute bottom-2 left-2 text-gold-500/30 text-xl font-serif">✦</div>
          <div className="absolute bottom-2 right-2 text-gold-500/30 text-xl font-serif">✦</div>

          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gold-500/20 border border-gold-400/50 text-gold-300 text-xs font-black tracking-widest uppercase mb-4 shadow">
            <Crown className="w-4 h-4 text-gold-400" />
            <span>16 PARCHI GRAND CHAMPION</span>
          </div>

          <div className="relative inline-block my-2">
            <img
              src={winner.avatarUrl}
              alt={winner.displayName}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-4 border-gold-400 object-cover bg-stone-900 shadow-[0_0_30px_rgba(245,158,11,0.6)] mx-auto"
            />
            <div className="absolute -top-3 -right-2 text-2xl animate-bounce">
              👑
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-black text-ivory-100 mt-2">
            {winner.displayName} {isWinnerMe && <span className="text-gold-400 text-lg">(You!)</span>}
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 font-mono mt-1">
            Declared with 4 identical slips of <span className="text-gold-300 font-bold underline">{winner.cardName}</span>!
          </p>

          {/* Defeated Opponents Pill */}
          <div className="mt-4 pt-3 border-t border-gold-500/30 flex items-center justify-center gap-2 flex-wrap text-xs text-stone-400">
            <span className="font-semibold text-stone-300">Runners-up:</span>
            {rankings
              .filter((r) => r.rank > 1)
              .map((r) => (
                <span
                  key={r.seatIndex}
                  className="px-2 py-0.5 rounded-lg bg-black/40 border border-stone-700 text-stone-300 text-[11px]"
                >
                  #{r.rank} {r.displayName}
                </span>
              ))}
          </div>

          {/* Viral Sharing Buttons Bar */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleShareWhatsApp}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-xs sm:text-sm shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Victory on WhatsApp</span>
            </button>

            <button
              onClick={handleCopyChallengeLink}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-table-card border border-gold-400/60 hover:border-gold-300 text-gold-300 font-bold text-xs sm:text-sm shadow transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>Copy Revenge Link</span>
            </button>
          </div>
        </div>
      )}

      {/* Official Defeat Penalty Slip / Shart Nama (Loser Roast Card) */}
      {loser && loser.userId !== winner.userId && (
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-[#29100d] via-[#1a0b09] to-[#120807] border-2 border-rose-500/80 shadow-[0_0_40px_rgba(244,63,94,0.35)] max-w-2xl mx-auto text-center animate-fade-in">
          {/* Stamp Effect */}
          <div className="absolute top-3 right-4 rotate-12 border-2 border-rose-500/60 rounded-xl px-2.5 py-1 text-[10px] font-mono font-black text-rose-400 tracking-widest uppercase opacity-80 pointer-events-none">
            OFFICIAL PENALTY
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-black tracking-wider uppercase mb-3 shadow">
            <ScrollText className="w-4 h-4 text-rose-400" />
            <span>16 PARCHI DEFEAT PENALTY SLIP • जुर्माना पर्ची</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 my-2">
            <div className="relative">
              <img
                src={loser.avatarUrl}
                alt={loser.displayName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-rose-400 object-cover bg-stone-900 shadow-md"
              />
              <span className="absolute -top-2 -right-1 text-lg">🩴</span>
            </div>

            <div className="text-center sm:text-left">
              <div className="text-xs font-mono text-rose-400 font-bold uppercase tracking-wider">
                Rank #{loser.rank} (Lowest Placement)
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-black text-white">
                {loser.displayName} {isLoserMe && <span className="text-rose-400 text-base">(You!)</span>}
              </h3>
              <p className="text-xs text-stone-400">
                Official Loser bound by table agreement
              </p>
            </div>
          </div>

          {/* Shart Box */}
          <div className="mt-4 p-4 rounded-2xl bg-black/60 border border-rose-500/40 text-left">
            <div className="flex items-center gap-2 text-rose-300 text-xs font-black uppercase tracking-wider mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Shart Ka Faisla:</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-rose-100 leading-relaxed font-sans">
              "{penaltyText}"
            </p>
          </div>

          {/* WhatsApp Roast Share Buttons */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleSharePenaltyWhatsApp}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs sm:text-sm shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Send Penalty to Loser on WhatsApp</span>
            </button>

            <button
              onClick={handleCopyPenaltySlip}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-table-card border border-rose-500/50 hover:border-rose-400 text-rose-200 font-bold text-xs sm:text-sm shadow transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedPenalty ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>Copy Penalty Slip</span>
            </button>
          </div>
        </div>
      )}

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
