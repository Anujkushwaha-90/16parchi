import React from 'react';
import { X, Crown, RefreshCw, Trophy, ShieldCheck, Sparkles } from 'lucide-react';
import { sound } from '../../services/sound.js';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-table-surface border border-gold-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-ivory-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-gold-500/20 text-gold-400 border border-gold-500/30">
            <Crown className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-ivory-100">
              How to Play 16 Parchi
            </h2>
            <p className="text-xs sm:text-sm text-stone-400">
              The classic Indian slips collection card table game
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4 text-xs sm:text-sm text-stone-300">
          {/* Rule 1: The 16 Slips */}
          <div className="p-4 rounded-2xl bg-table-card border border-table-border flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 font-bold shrink-0">1</div>
            <div>
              <h4 className="font-bold text-ivory-100 mb-1 flex items-center gap-2">
                <span>The 16 Parchis & Deal</span>
              </h4>
              <p className="text-stone-400 leading-relaxed">
                There are 4 distinct identities (by default: <strong>Raja</strong>, <strong>Rani</strong>, <strong>Chor</strong>, and <strong>Sipahi</strong>), with exactly 4 copies each. All 16 parchis are shuffled on the server and 4 are dealt secretly to each of the 4 seated players.
              </p>
            </div>
          </div>

          {/* Rule 2: Circular Clockwise Passing */}
          <div className="p-4 rounded-2xl bg-table-card border border-table-border flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold shrink-0">2</div>
            <div>
              <h4 className="font-bold text-ivory-100 mb-1 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <span>Clockwise Slip Passing</span>
              </h4>
              <p className="text-stone-400 leading-relaxed">
                When it is your turn, pick <strong>one unwanted parchi</strong> from your hand and pass it to your clockwise neighbor (Seat 0 &rarr; 1 &rarr; 2 &rarr; 3 &rarr; 0). You cannot inspect what others have, and only the receiver sees what was passed to them!
              </p>
            </div>
          </div>

          {/* Rule 3: Collecting 4-of-a-Kind */}
          <div className="p-4 rounded-2xl bg-table-card border border-table-border flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 font-bold shrink-0">3</div>
            <div>
              <h4 className="font-bold text-ivory-100 mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Collecting 4 Matching Slips</span>
              </h4>
              <p className="text-stone-400 leading-relaxed">
                Your goal is to collect all <strong>4 identical parchis</strong> of any identity (e.g. 4x Raja or 4x Rani). Keep matching cards and pass away cards you only have one of.
              </p>
            </div>
          </div>

          {/* Rule 4: Declaring & Ranking */}
          <div className="p-4 rounded-2xl bg-table-card border border-table-border flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-gold-500/10 text-gold-400 font-bold shrink-0">4</div>
            <div>
              <h4 className="font-bold text-ivory-100 mb-1 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-gold-400" />
                <span>Declare & Podium Rankings</span>
              </h4>
              <p className="text-stone-400 leading-relaxed">
                The moment you have 4 matching parchis, press the glowing <strong>"DECLARE 16 PARCHI!"</strong> button! The 1st to declare gets <strong>1st Place 🏆</strong>. The remaining players keep passing until 3 players finish, leaving the 4th player as 4th place.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="gold-gradient-btn px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm"
          >
            Got it, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
