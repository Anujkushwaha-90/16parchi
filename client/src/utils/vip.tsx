import React from 'react';

/**
 * Strict VIP check: EXCLUSIVELY and ONLY for anujkushwaha9090@gmail.com
 * (Username: everythinginoneplace, FriendCode: PARCHI-5164, ID: b621b722-6d83-4f6b-b977-6bf800edb487)
 * All other accounts (including skgamer, technicalak, etc.) are normal users.
 */
export const isVipUser = (u?: {
  id?: string | null;
  userId?: string | null;
  email?: string | null;
  username?: string | null;
  friendCode?: string | null;
  displayName?: string | null;
  isVipUser?: boolean;
} | null): boolean => {
  if (!u) return false;

  const id = (u.id || u.userId || '').trim();
  const email = (u.email || '').toLowerCase().trim();
  const username = (u.username || '').toLowerCase().trim();
  const friendCode = (u.friendCode || '').toUpperCase().trim();

  return (
    email === 'anujkushwaha9090@gmail.com' ||
    username === 'everythinginoneplace' ||
    friendCode === 'PARCHI-5164' ||
    id === 'b621b722-6d83-4f6b-b977-6bf800edb487'
  );
};

/**
 * Exclusive Royal Unique Name component for anujkushwaha9090@gmail.com
 */
export const VipUniqueName: React.FC<{
  name: string;
  className?: string;
  titleClassName?: string;
  showTitle?: boolean;
}> = ({ name, className = '', titleClassName = '', showTitle = true }) => {
  return (
    <div className="inline-flex flex-col items-center">
      <div className={`inline-flex items-center gap-1.5 font-serif font-black tracking-tight ${className}`}>
        <span className="bg-gradient-to-r from-amber-200 via-rose-200 to-pink-200 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(244,63,94,0.7)]">
          {name}
        </span>
        <span className="text-base sm:text-lg animate-pulse filter drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]">
          👑
        </span>
        <span className="text-sm animate-bounce filter drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]">
          💖
        </span>
      </div>
      {showTitle && (
        <span className={`text-[10px] font-black tracking-widest uppercase bg-gradient-to-r from-rose-400 via-pink-300 to-amber-300 bg-clip-text text-transparent ${titleClassName}`}>
          ✦ Imperial Sovereign ✦
        </span>
      )}
    </div>
  );
};
