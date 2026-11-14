import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { sound } from '../services/sound.js';
import { Crown, Sparkles, Swords, Users, ShieldCheck, Play, HelpCircle, ChevronRight, Award } from 'lucide-react';
import { HowToPlayModal } from '../components/Modals/HowToPlayModal.js';
import { Card } from '../components/Card.js';

interface LandingScreenProps {
  onNavigate: (screen: string) => void;
  onOpenAuth: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onNavigate, onOpenAuth }) => {
  const { user } = useAuth();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const previewCards = [
    { id: 'p1', name: 'RAJA', theme: 'royals' as const, title: 'Raja (King)', icon: 'Crown', color: '#f59e0b' },
    { id: 'p2', name: 'RANI', theme: 'royals' as const, title: 'Rani (Queen)', icon: 'Sparkles', color: '#ec4899' },
    { id: 'p3', name: 'CHOR', theme: 'royals' as const, title: 'Chor (Thief)', icon: 'Moon', color: '#818cf8' },
    { id: 'p4', name: 'SIPAHI', theme: 'royals' as const, title: 'Sipahi (Guard)', icon: 'Shield', color: '#10b981' },
  ];

  const handleStartPlaying = () => {
    sound.playClick();
    if (user) {
      onNavigate('dashboard');
    } else {
      onOpenAuth();
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Copy */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/40 border border-violet-500/30 text-violet-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Competitive Indian Card Arena • Online Multiplayer</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-serif font-black tracking-tight text-white leading-tight">
            Pass the Slips. <br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">Match All Four.</span> <br />
            Dominate the Table.
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
            The beloved traditional Indian slip passing game rebuilt with competitive esports netcode. Real-time circular transfers, private lobbies, and high-stakes match dare penalties.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
            <button
              onClick={handleStartPlaying}
              className="px-8 py-3.5 rounded-xl text-sm sm:text-base font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-950/60 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{user ? 'Enter Arena' : 'Play Live with Friends'}</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setShowHowToPlay(true);
              }}
              className="px-6 py-3.5 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800/60 text-slate-200 text-sm sm:text-base font-medium flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-violet-400" />
              <span>How to Play</span>
            </button>
          </div>

          {/* Feature Badges */}
          <div className="pt-6 grid grid-cols-3 gap-3 border-t border-slate-800/80 max-w-lg mx-auto lg:mx-0 text-left">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-violet-400 font-bold text-sm sm:text-base">4-8 Players</div>
              <div className="text-[11px] text-slate-400 font-mono">Custom Decks</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-cyan-400 font-bold text-sm sm:text-base">Real-Time</div>
              <div className="text-[11px] text-slate-400 font-mono">Zero Latency</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-pink-400 font-bold text-sm sm:text-base">Stakes</div>
              <div className="text-[11px] text-slate-400 font-mono">Loser Dares</div>
            </div>
          </div>
        </div>

        {/* Right Preview Card Deck / Felt Table */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-full max-w-md aspect-square rounded-full table-felt p-6 sm:p-8 flex items-center justify-center shadow-table">
            {/* Center Royal Seal */}
            <div className="absolute w-24 h-24 rounded-full border border-gold-500/30 bg-emerald-950/70 flex flex-col items-center justify-center text-center shadow-inner pointer-events-none">
              <Crown className="w-8 h-8 text-gold-400 mb-0.5" />
              <span className="font-serif font-black text-xs text-gold-200">16 PARCHI</span>
            </div>

            {/* Orbiting 4 Parchis */}
            <div className="grid grid-cols-2 gap-4 z-10">
              {previewCards.map((c, idx) => (
                <div
                  key={c.id}
                  className="transform transition-transform hover:scale-110 hover:z-20 cursor-pointer"
                  style={{
                    transform: `rotate(${idx % 2 === 0 ? '-4deg' : '4deg'})`,
                  }}
                >
                  <Card card={c} small />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Highlights Grid */}
      <div className="mt-16 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-table-surface border border-table-border hover:border-gold-500/40 transition-colors">
          <div className="p-3 rounded-2xl bg-gold-500/10 text-gold-400 w-fit mb-4">
            <Swords className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-ivory-100 mb-2">Private Multiplayer Rooms</h3>
          <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
            Generate a short 6-character room code, invite your friends with 1-click links, or add smart AI bots to fill open seats anytime.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-table-surface border border-table-border hover:border-emerald-500/40 transition-colors">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 w-fit mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-ivory-100 mb-2">Authoritative Security</h3>
          <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
            Zero-leak architecture. Only your own cards are delivered to your device. Shuffling and atomic clockwise transfers happen strictly on the server.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-table-surface border border-table-border hover:border-purple-500/40 transition-colors">
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 w-fit mb-4">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-ivory-100 mb-2">Podium Rankings & Stats</h3>
          <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
            Full 1st, 2nd, 3rd, and 4th place rankings similar to Ludo. Track your career stats, win rates, and rematch your squad immediately.
          </p>
        </div>
      </div>

      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </div>
  );
};
