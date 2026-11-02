import React, { useState } from 'react';
import { Heart, Sparkles, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../services/sound.js';

interface VipLoveAuraProps {
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  className?: string;
  interactive?: boolean;
}

export const VipLoveAura: React.FC<VipLoveAuraProps> = ({
  children,
  size = 'md',
  showBadge = true,
  className = '',
  interactive = true,
}) => {
  const [clickedCount, setClickedCount] = useState(0);

  const handleHeartBurst = (e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    setClickedCount((prev) => prev + 1);
    sound.playClick();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 25,
      spread: 60,
      startVelocity: 25,
      origin: { x, y },
      shapes: ['circle'],
      colors: ['#f43f5e', '#fb7185', '#ec4899', '#fda4af', '#fef08a'],
      scalar: 1.2,
    });
  };

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  }[size];

  return (
    <div
      onClick={handleHeartBurst}
      title="👑 Royal Sovereign of Hearts - Pure Love Aura (Tap to unleash love hearts)"
      className={`relative inline-flex items-center justify-center cursor-pointer select-none group ${className}`}
      style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
    >
      {/* 1. Deep 3D Radial Love Backlight */}
      <div className="absolute inset-[-12px] rounded-full bg-gradient-to-tr from-rose-600/50 via-pink-500/40 to-amber-300/30 blur-xl animate-pulse pointer-events-none" />

      {/* 2. Floating 3D Hearts rising upward */}
      <div className="absolute -left-3 bottom-0 text-sm float-heart-1 pointer-events-none drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]">
        💖
      </div>
      <div className="absolute -right-3 bottom-2 text-xs float-heart-2 pointer-events-none drop-shadow-[0_0_8px_rgba(236,72,153,0.9)]">
        💕
      </div>
      <div className="absolute -left-1 -bottom-2 text-sm float-heart-3 pointer-events-none drop-shadow-[0_0_8px_rgba(251,113,133,0.9)]">
        ✨
      </div>
      <div className="absolute right-0 -bottom-1 text-xs float-heart-4 pointer-events-none drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]">
        💘
      </div>

      {/* 3. Orbiting 3D Crystal Hearts (Elliptical Path with Z-depth) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="animate-orbit-1">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,1)] border border-pink-200">
            <span className="text-[10px]">💖</span>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="animate-orbit-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-300 to-rose-500 flex items-center justify-center shadow-[0_0_10px_rgba(251,113,133,1)] border border-amber-200">
            <span className="text-[9px]">✨</span>
          </div>
        </div>
      </div>

      {/* 4. Multi-Layer 3D Heartbeat Outer Ring */}
      <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-300 animate-heartbeat-3d animate-love-pulse">
        {/* Inner Gold Rim */}
        <div className="p-0.5 rounded-full bg-gradient-to-b from-amber-200 via-rose-900 to-pink-900 shadow-inner">
          {children}
        </div>
      </div>

      {/* 5. 3D Floating Royal Heart Crown Badge */}
      {showBadge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 border border-pink-200/80 shadow-[0_4px_16px_rgba(244,63,94,0.9)] pointer-events-none whitespace-nowrap z-40 transform transition-transform group-hover:scale-110">
          <Crown className="w-3 h-3 text-amber-200 fill-amber-200" />
          <span className="text-[9px] font-black tracking-wider text-white uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            3D Sovereign 💕
          </span>
        </div>
      )}
    </div>
  );
};

export const VipBadgeTag: React.FC<{ subtitle?: string }> = ({ subtitle }) => {
  return (
    <div className="inline-flex flex-col items-center">
      <div className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-rose-950 via-pink-950 to-amber-950 border-2 border-rose-400/80 shadow-[0_0_20px_rgba(244,63,94,0.6)] backdrop-blur-md">
        {/* Glow ambient */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-500/20 to-pink-500/20 animate-pulse pointer-events-none" />

        <Crown className="w-4 h-4 text-amber-300 fill-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
        <span className="text-xs font-black tracking-wider bg-gradient-to-r from-rose-200 via-pink-100 to-amber-200 bg-clip-text text-transparent drop-shadow">
          Royal Sovereign of Hearts
        </span>
        <span className="text-sm animate-bounce drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]">
          💖
        </span>
      </div>
      {subtitle && (
        <span className="text-[10px] text-pink-300/80 italic mt-0.5 font-medium tracking-wide">
          {subtitle}
        </span>
      )}
    </div>
  );
};
