import React from 'react';
import { ParchiCard } from '../types/index.js';
import { Crown, Sparkles, Moon, Shield, Flame, Droplets, Mountain, Wind, Sun, Flower2, Leaf, Snowflake, Cat, Feather } from 'lucide-react';

interface CardProps {
  card: ParchiCard;
  isSelected?: boolean;
  isPassing?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
}

export const Card: React.FC<CardProps> = ({
  card,
  isSelected = false,
  isPassing = false,
  onClick,
  disabled = false,
  small = false,
}) => {
  // Map icon name to Lucide Icon
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Crown': return <Crown className={small ? 'w-4 h-4' : 'w-7 h-7'} />;
      case 'Sparkles': return <Sparkles className={small ? 'w-4 h-4' : 'w-7 h-7'} />;
      case 'Moon': return <Moon className={small ? 'w-4 h-4' : 'w-7 h-7'} />;
      case 'Shield': return <Shield className={small ? 'w-4 h-4' : 'w-7 h-7'} />;
      case 'Flame': return <Flame className={small ? 'w-4 h-4' : 'w-7 h-7'} />;
      case 'Droplets': return <Droplets className={small ? 'w-4 h-4' : 'w-7 h-7'} />;
      case 'Mountain': return <Mountain className={small ? 'w-4 h-4' : 'w-7 h-7'} />;
      case 'Wind': return <Wind className={small ? 'w-4 h-4' : 'w-7 h-7'} />;
      case 'Sun': return <Sun className={small ? 'w-4 h-4' : 'w-7 h-7'} />;
      case 'Flower2': return <Flower2 className={small ? 'w-4 h-4' : 'w-7 h-7'} />;
      case 'Leaf': return <Leaf className={small ? 'w-4 h-4' : 'w-7 h-7'} />;
      case 'Snowflake': return <Snowflake className={small ? 'w-4 h-4' : 'w-7 h-7'} />;
      case 'Cat': return <Cat className={small ? 'w-4 h-4' : 'w-7 h-7'} />;
      case 'Feather': return <Feather className={small ? 'w-4 h-4' : 'w-7 h-7'} />;
      default: return <Sparkles className={small ? 'w-4 h-4' : 'w-7 h-7'} />;
    }
  };

  const sizeClasses = small
    ? 'w-16 h-24 rounded-lg p-1.5'
    : 'w-28 h-40 sm:w-32 sm:h-48 md:w-36 md:h-52 rounded-2xl p-3';

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`parchi-card relative transition-all duration-300 flex flex-col justify-between cursor-pointer select-none border ${
        isSelected ? 'selected ring-4 ring-gold-400 ring-offset-2 ring-offset-table-dark' : ''
      } ${isPassing ? 'opacity-40 scale-95 translate-y-4' : ''} ${
        disabled ? 'cursor-not-allowed opacity-75' : ''
      } ${sizeClasses}`}
      style={{
        background: 'linear-gradient(145deg, #fdfbf7 0%, #f4ede1 50%, #e6dac6 100%)',
        borderColor: isSelected ? '#fbbf24' : '#c9b89d',
        boxShadow: isSelected
          ? '0 0 25px rgba(245, 158, 11, 0.6), 0 15px 30px rgba(0,0,0,0.5)'
          : '0 8px 18px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.8)',
      }}
    >
      {/* Decorative Golden Corner Flourishes */}
      <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t border-l border-amber-700/40 rounded-tl" />
      <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t border-r border-amber-700/40 rounded-tr" />
      <div className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b border-l border-amber-700/40 rounded-bl" />
      <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b border-r border-amber-700/40 rounded-br" />

      {/* Top Header: Identity Name & Mini Icon */}
      <div className="flex items-center justify-between text-stone-800">
        <span className="font-serif font-black tracking-wider text-[11px] sm:text-xs uppercase">
          {card.name}
        </span>
        <div style={{ color: card.color }}>{getIcon(card.icon)}</div>
      </div>

      {/* Center Seal / Motif */}
      <div className="flex flex-col items-center justify-center my-auto">
        <div
          className="rounded-full p-2.5 sm:p-3.5 mb-1 shadow-inner border border-white/60 flex items-center justify-center transition-transform group-hover:scale-110"
          style={{
            backgroundColor: `${card.color}15`,
            color: card.color,
          }}
        >
          {getIcon(card.icon)}
        </div>
        <div className="text-[10px] sm:text-xs font-serif font-bold text-stone-700 tracking-wide text-center">
          {card.title.split(' ')[0]}
        </div>
      </div>

      {/* Bottom Identity Label */}
      <div className="flex items-center justify-between text-stone-600 text-[9px] sm:text-[10px] font-mono border-t border-stone-300/80 pt-1">
        <span>PARCHI</span>
        <span className="font-bold text-stone-800 uppercase">{card.name}</span>
      </div>
    </div>
  );
};
