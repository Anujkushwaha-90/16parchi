import React from 'react';
import { Shield, Crown, Flame, Heart, Sparkles } from 'lucide-react';

export const DUO_BOY_EMAIL = 'singhayush20626@gmail.com';
export const DUO_GIRL_EMAIL = 'palakpandey808@gmail.com';

export const DUO_BOY_USERNAME = 'ayushsingh';
export const DUO_BOY_FRIEND_CODE = 'PARCHI-8460';

export interface DuoUserLike {
  id?: string | null;
  userId?: string | null;
  email?: string | null;
  username?: string | null;
  friendCode?: string | null;
  displayName?: string | null;
}

/**
 * Check if user is Ayush Singh
 */
export const isDuoBoy = (u?: DuoUserLike | null): boolean => {
  if (!u) return false;
  const email = (u.email || '').toLowerCase().trim();
  const username = (u.username || '').toLowerCase().trim();
  const friendCode = (u.friendCode || '').toUpperCase().trim();
  const displayName = (u.displayName || '').toLowerCase().trim();

  return (
    email === DUO_BOY_EMAIL ||
    username === DUO_BOY_USERNAME ||
    friendCode === DUO_BOY_FRIEND_CODE ||
    displayName === 'ayush singh'
  );
};

/**
 * Check if user is Palak Pandey
 */
export const isDuoGirl = (u?: DuoUserLike | null): boolean => {
  if (!u) return false;
  const email = (u.email || '').toLowerCase().trim();
  const username = (u.username || '').toLowerCase().trim();
  const displayName = (u.displayName || '').toLowerCase().trim();

  return (
    email === DUO_GIRL_EMAIL ||
    username === 'palakpandey' ||
    username === 'palak' ||
    username.includes('palak') ||
    displayName === 'palak pandey' ||
    displayName.includes('palak')
  );
};

/**
 * Check if user is either Ayush or Palak
 */
export const isDuoMember = (u?: DuoUserLike | null): boolean => {
  return isDuoBoy(u) || isDuoGirl(u);
};

/**
 * Get partner info
 */
export const getDuoPartnerName = (u?: DuoUserLike | null): string => {
  if (isDuoBoy(u)) return 'Palak Pandey';
  if (isDuoGirl(u)) return 'Ayush Singh';
  return '';
};

/**
 * Cute styled name for Duo members
 */
export const DuoUniqueName: React.FC<{
  name: string;
  isBoy: boolean;
  className?: string;
  showTitle?: boolean;
}> = ({ name, isBoy, className = '', showTitle = true }) => {
  return (
    <div className="inline-flex flex-col items-center">
      <div className={`inline-flex items-center gap-1.5 font-serif font-black tracking-tight ${className}`}>
        <span
          className={
            isBoy
              ? 'bg-gradient-to-r from-cyan-300 via-sky-200 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(56,189,248,0.7)]'
              : 'bg-gradient-to-r from-rose-300 via-pink-200 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(244,63,94,0.7)]'
          }
        >
          {name}
        </span>
        <span className="text-base sm:text-lg animate-pulse filter drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]">
          {isBoy ? '🛡️' : '👑'}
        </span>
        <span className="text-sm animate-bounce filter drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]">
          💖
        </span>
      </div>
      {showTitle && (
        <span
          className={`text-[10px] font-black tracking-widest uppercase mt-0.5 ${
            isBoy
              ? 'bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-rose-400 via-pink-300 to-amber-300 bg-clip-text text-transparent'
          }`}
        >
          {isBoy ? '✦ Celestial Knight ✦' : '✦ Starlight Empress ✦'}
        </span>
      )}
    </div>
  );
};

/**
 * Duo Badge Tag (e.g. Protected by Palak / Cherished by Ayush)
 */
export const DuoBadgeTag: React.FC<{
  isBoy: boolean;
  streakDays?: number;
}> = ({ isBoy, streakDays = 1 }) => {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wide shadow-md border ${
          isBoy
            ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border-cyan-400/60 text-cyan-200 shadow-[0_0_15px_rgba(56,189,248,0.35)]'
            : 'bg-gradient-to-r from-rose-950/80 to-pink-950/80 border-rose-400/60 text-pink-200 shadow-[0_0_15px_rgba(244,63,94,0.35)]'
        }`}
      >
        {isBoy ? <Shield className="w-3.5 h-3.5 text-cyan-400" /> : <Crown className="w-3.5 h-3.5 text-amber-300" />}
        <span>{isBoy ? 'Protected by Palak 🛡️💖' : 'Cherished by Ayush 👑✨'}</span>
      </div>

      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/40 border border-amber-500/40 text-amber-300">
        <Flame className="w-3 h-3 text-amber-400 animate-pulse" />
        <span>Heart Streak: Day {streakDays}</span>
        <Sparkles className="w-2.5 h-2.5 text-amber-300" />
      </div>
    </div>
  );
};

