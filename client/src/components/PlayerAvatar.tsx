import React, { useState } from 'react';

interface PlayerAvatarProps {
  src?: string | null;
  name?: string | null;
  alt?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  src,
  name,
  alt,
  className = '',
  onClick,
  title,
}) => {
  const [hasError, setHasError] = useState(false);

  // Safe fallback letter or icon if image fails to load
  const displayName = name || alt || 'Player';
  const initial = displayName.trim().charAt(0).toUpperCase() || '👑';

  const defaultDicebear = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName)}`;

  if (hasError || !src) {
    return (
      <div
        onClick={onClick}
        title={title || displayName}
        className={`flex items-center justify-center font-serif font-black select-none text-gold-300 bg-gradient-to-br from-stone-900 via-emerald-950 to-stone-950 border border-gold-500/40 shadow-inner ${className}`}
      >
        <span>{initial}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || displayName}
      title={title || displayName}
      onClick={onClick}
      onError={(e) => {
        // First try dicebear fallback if google photo / custom url blocked
        const target = e.currentTarget;
        if (target.src !== defaultDicebear) {
          target.src = defaultDicebear;
        } else {
          setHasError(true);
        }
      }}
      className={className}
      loading="lazy"
    />
  );
};

