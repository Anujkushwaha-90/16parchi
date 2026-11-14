import React from 'react';
import { ParchiCard } from '../types/index.js';
import { Crown, Sparkles, Moon, Shield, Flame, Droplets, Mountain, Wind, Sun, Flower2, Leaf, Snowflake, Cat, Feather } from 'lucide-react';

interface CardProps {
  card: ParchiCard;
  isSelected?: boolean;
  isPassing?: boolean;
  isJustReceived?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
}

export const Card: React.FC<CardProps> = ({
  card,
  isSelected = false,
  isPassing = false,
  isJustReceived = false,
  onClick,
  disabled = false,
  small = false,
}) => {
  // Map icon name to Lucide Icon
  const getIcon = (iconName: string) => {
    const size = small ? 'w-3.5 h-3.5' : 'w-6 h-6';
    switch (iconName) {
      case 'Crown': return <Crown className={size} />;
      case 'Sparkles': return <Sparkles className={size} />;
      case 'Moon': return <Moon className={size} />;
      case 'Shield': return <Shield className={size} />;
      case 'Flame': return <Flame className={size} />;
      case 'Droplets': return <Droplets className={size} />;
      case 'Mountain': return <Mountain className={size} />;
      case 'Wind': return <Wind className={size} />;
      case 'Sun': return <Sun className={size} />;
      case 'Flower2': return <Flower2 className={size} />;
      case 'Leaf': return <Leaf className={size} />;
      case 'Snowflake': return <Snowflake className={size} />;
      case 'Cat': return <Cat className={size} />;
      case 'Feather': return <Feather className={size} />;
      default: return <Sparkles className={size} />;
    }
  };

  const sizeClasses = small
    ? 'w-14 h-20 sm:w-16 sm:h-24 rounded-lg p-1.5'
    : 'w-24 h-36 xs:w-28 xs:h-40 sm:w-32 sm:h-48 md:w-36 md:h-52 rounded-2xl p-3';

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`parchi-chit relative flex flex-col justify-between cursor-pointer select-none ${
        isSelected ? 'selected' : ''
      } ${isPassing ? 'opacity-20 scale-90 -translate-y-8 pointer-events-none' : ''} ${
        disabled ? 'cursor-not-allowed opacity-75' : ''
      } ${sizeClasses}`}
    >
      {/* Received indicator tag */}
      {isJustReceived && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-full bg-emerald-600 text-white shadow-sm z-20 whitespace-nowrap">
          Received
        </span>
      )}

      {/* Top Header: Identity & Small Mark */}
      <div className="flex items-center justify-between text-slate-200 border-b border-slate-700/60 pb-1.5">
        <span className="font-mono font-bold tracking-tight text-[11px] sm:text-xs uppercase text-indigo-200">
          {card.name}
        </span>
        <div style={{ color: card.color }}>{getIcon(card.icon)}</div>
      </div>

      {/* Center Motif / Stamp */}
      <div className="flex flex-col items-center justify-center my-auto py-2">
        <div
          className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center border border-slate-700/80 bg-slate-800/60 shadow-inner group-hover:scale-105 transition-transform"
          style={{
            color: card.color,
          }}
        >
          {getIcon(card.icon)}
        </div>
        <div className="text-[11px] sm:text-xs font-bold text-slate-200 tracking-wide mt-2 text-center">
          {card.title.split(' ')[0]}
        </div>
      </div>

      {/* Bottom Footer: Chit Slip Label */}
      <div className="flex items-center justify-between text-slate-400 text-[9px] sm:text-[10px] font-mono border-t border-slate-700/60 pt-1.5">
        <span className="text-slate-400">PARCHI</span>
        <span className="font-bold text-indigo-300">{card.name}</span>
      </div>
    </div>
  );
};
