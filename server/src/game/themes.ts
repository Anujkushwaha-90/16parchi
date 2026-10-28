import { CardTheme, ParchiCard, CustomDeckConfig } from './types.js';

export interface ThemeIdentity {
  name: string;
  title: string;
  icon: string;
  color: string;
}

export const PALETTE_COLORS = [
  '#f59e0b', // Amber / Gold
  '#ec4899', // Pink / Rose
  '#818cf8', // Indigo / Moon
  '#10b981', // Emerald / Guard
  '#8b5cf6', // Purple / Violet
  '#ef4444', // Red / Crimson
  '#06b6d4', // Cyan / Aqua
  '#ea580c', // Orange / Bronze
  '#eab308', // Yellow / Sun
  '#84cc16', // Lime / Olive
  '#3b82f6', // Blue / Sky
  '#64748b', // Slate / Iron
];

export const PALETTE_ICONS = [
  'Crown',
  'Sparkles',
  'Moon',
  'Shield',
  'Scroll',
  'Flame',
  'Sun',
  'Feather',
  'Leaf',
  'Heart',
  'Zap',
  'Droplets',
];

export const THEME_IDENTITIES: Record<Exclude<CardTheme, 'custom'>, ThemeIdentity[]> = {
  royals: [
    { name: 'RAJA', title: 'Raja (King)', icon: 'Crown', color: '#f59e0b' },
    { name: 'RANI', title: 'Rani (Queen)', icon: 'Sparkles', color: '#ec4899' },
    { name: 'CHOR', title: 'Chor (Thief)', icon: 'Moon', color: '#818cf8' },
    { name: 'SIPAHI', title: 'Sipahi (Guard)', icon: 'Shield', color: '#10b981' },
    { name: 'VAZIR', title: 'Vazir (Prime Minister)', icon: 'Scroll', color: '#8b5cf6' },
    { name: 'SENAPATI', title: 'Senapati (Commander)', icon: 'Flame', color: '#ef4444' },
    { name: 'KHANSAAMA', title: 'Khansaama (Royal Chef)', icon: 'Sun', color: '#ea580c' },
    { name: 'JAASOOS', title: 'Jaasoos (Royal Spy)', icon: 'Eye', color: '#64748b' },
    { name: 'DARBAARI', title: 'Darbaari (Courtier)', icon: 'Sparkles', color: '#06b6d4' },
    { name: 'KHAZANCHI', title: 'Khazanchi (Treasurer)', icon: 'Crown', color: '#eab308' },
  ],
  seasons: [
    { name: 'SPRING', title: 'Basant (Spring)', icon: 'Flower2', color: '#10b981' },
    { name: 'SUMMER', title: 'Grishma (Summer)', icon: 'Sun', color: '#f59e0b' },
    { name: 'AUTUMN', title: 'Sharad (Autumn)', icon: 'Leaf', color: '#f97316' },
    { name: 'WINTER', title: 'Hemant (Winter)', icon: 'Snowflake', color: '#06b6d4' },
    { name: 'MONSOON', title: 'Varsha (Monsoon)', icon: 'Droplets', color: '#3b82f6' },
    { name: 'BLOSSOM', title: 'Pravaal (Blossom)', icon: 'Sparkles', color: '#ec4899' },
    { name: 'COSMOS', title: 'Taaramandal (Cosmos)', icon: 'Moon', color: '#8b5cf6' },
    { name: 'SUNRISE', title: 'Suryodaya (Sunrise)', icon: 'Sun', color: '#fbbf24' },
    { name: 'TWILIGHT', title: 'Sandhya (Twilight)', icon: 'Cloud', color: '#a855f7' },
    { name: 'FROST', title: 'Shishir (Frost)', icon: 'Snowflake', color: '#38bdf8' },
  ],
  elements: [
    { name: 'FIRE', title: 'Agni (Fire)', icon: 'Flame', color: '#ef4444' },
    { name: 'WATER', title: 'Jal (Water)', icon: 'Droplets', color: '#3b82f6' },
    { name: 'EARTH', title: 'Prithvi (Earth)', icon: 'Mountain', color: '#84cc16' },
    { name: 'AIR', title: 'Vayu (Air)', icon: 'Wind', color: '#a855f7' },
    { name: 'ETHER', title: 'Aakash (Ether)', icon: 'Sparkles', color: '#6366f1' },
    { name: 'LIGHT', title: 'Prakash (Light)', icon: 'Sun', color: '#eab308' },
    { name: 'LIGHTNING', title: 'Vidyut (Lightning)', icon: 'Zap', color: '#f59e0b' },
    { name: 'METAL', title: 'Dhaatu (Metal)', icon: 'Shield', color: '#94a3b8' },
    { name: 'ICE', title: 'Him (Ice)', icon: 'Snowflake', color: '#38bdf8' },
    { name: 'SHADOW', title: 'Chhaya (Shadow)', icon: 'Moon', color: '#475569' },
  ],
  animals: [
    { name: 'LION', title: 'Sher (Lion)', icon: 'Cat', color: '#f59e0b' },
    { name: 'EAGLE', title: 'Garuda (Eagle)', icon: 'Feather', color: '#3b82f6' },
    { name: 'TIGER', title: 'Baagh (Tiger)', icon: 'Flame', color: '#ea580c' },
    { name: 'ELEPHANT', title: 'Haathi (Elephant)', icon: 'Shield', color: '#64748b' },
    { name: 'HORSE', title: 'Ghora (Horse)', icon: 'Compass', color: '#8b5cf6' },
    { name: 'PEACOCK', title: 'Mor (Peacock)', icon: 'Sparkles', color: '#06b6d4' },
    { name: 'BEAR', title: 'Bhaloo (Bear)', icon: 'Shield', color: '#78350f' },
    { name: 'CHEETAH', title: 'Cheetah (Swift)', icon: 'Zap', color: '#fbbf24' },
    { name: 'DEER', title: 'Hiran (Deer)', icon: 'Heart', color: '#10b981' },
    { name: 'FALCON', title: 'Baaz (Falcon)', icon: 'Feather', color: '#ef4444' },
  ],
};

/**
 * Validates player count and deck configuration before room creation or game start.
 */
export function validateDeckConfiguration(
  playerCount: number,
  customDeckConfig?: CustomDeckConfig | null,
  theme: CardTheme = 'royals'
): { valid: boolean; error?: string; totalCards: number; uniqueCount: number } {
  if (playerCount < 4) {
    return {
      valid: false,
      error: 'At least 4 players are required to start a game of 16 Parchi.',
      totalCards: 0,
      uniqueCount: 0,
    };
  }

  const requiredParchis = 4 * playerCount;

  // Custom Deck Validation
  if (customDeckConfig && customDeckConfig.isCustom) {
    const items = customDeckConfig.items || [];
    if (items.length === 0) {
      return {
        valid: false,
        error: 'Custom deck cannot be empty. Please add at least 4 custom parchi names.',
        totalCards: 0,
        uniqueCount: 0,
      };
    }

    const seenNames = new Set<string>();
    let totalCards = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const trimmedName = (item.name || '').trim();

      if (!trimmedName) {
        return {
          valid: false,
          error: `Parchi name at position #${i + 1} cannot be empty.`,
          totalCards: 0,
          uniqueCount: items.length,
        };
      }

      const lowerName = trimmedName.toLowerCase();
      if (seenNames.has(lowerName)) {
        return {
          valid: false,
          error: `Duplicate parchi name "${trimmedName}" detected. Please combine or rename duplicate names.`,
          totalCards: 0,
          uniqueCount: seenNames.size,
        };
      }
      seenNames.add(lowerName);

      if (typeof item.count !== 'number' || item.count < 1 || !Number.isInteger(item.count)) {
        return {
          valid: false,
          error: `Parchi "${trimmedName}" must have a positive whole number quantity (recommended: 4).`,
          totalCards: 0,
          uniqueCount: seenNames.size,
        };
      }

      totalCards += item.count;
    }

    if (totalCards < requiredParchis) {
      return {
        valid: false,
        error: `A ${playerCount}-player game requires at least ${requiredParchis} parchis (4 per player), but the deck currently has ${totalCards}.`,
        totalCards,
        uniqueCount: seenNames.size,
      };
    }

    if (seenNames.size < playerCount) {
      return {
        valid: false,
        error: `A ${playerCount}-player game requires at least ${playerCount} unique parchi identities, but only ${seenNames.size} were configured.`,
        totalCards,
        uniqueCount: seenNames.size,
      };
    }

    return {
      valid: true,
      totalCards,
      uniqueCount: seenNames.size,
    };
  }

  // Default Theme Deck Validation
  const identities = theme === 'custom'
    ? THEME_IDENTITIES.royals
    : THEME_IDENTITIES[theme] || THEME_IDENTITIES.royals;

  if (identities.length < playerCount) {
    return {
      valid: false,
      error: `Theme "${theme}" only supports up to ${identities.length} players. Please select another theme or use Custom Names.`,
      totalCards: identities.length * 4,
      uniqueCount: identities.length,
    };
  }

  const totalCards = playerCount * 4;
  return {
    valid: true,
    totalCards,
    uniqueCount: playerCount,
  };
}

/**
 * Generates deck for any supported player count N >= 4, supporting custom deck names.
 */
export function generateDeck(
  theme: CardTheme = 'royals',
  playerCount: number = 4,
  customConfig?: CustomDeckConfig | null
): ParchiCard[] {
  const deck: ParchiCard[] = [];

  // 1. Custom Names Deck
  if (customConfig && customConfig.isCustom && customConfig.items.length > 0) {
    customConfig.items.forEach((item, itemIdx) => {
      const trimmedName = item.name.trim();
      const color = item.color || PALETTE_COLORS[itemIdx % PALETTE_COLORS.length];
      const icon = item.icon || PALETTE_ICONS[itemIdx % PALETTE_ICONS.length];
      const title = item.title || trimmedName;

      for (let copy = 1; copy <= item.count; copy++) {
        deck.push({
          id: `parchi_custom_${itemIdx}_${copy}_${Math.random().toString(36).substring(2, 7)}`,
          name: trimmedName,
          theme: 'custom',
          title,
          icon,
          color,
        });
      }
    });

    return deck;
  }

  // 2. Default Theme Deck (supports N players by picking first N identities)
  const identitiesPool = theme === 'custom'
    ? THEME_IDENTITIES.royals
    : THEME_IDENTITIES[theme] || THEME_IDENTITIES.royals;

  const identities = identitiesPool.slice(0, playerCount);

  identities.forEach((ident, identIdx) => {
    for (let copy = 1; copy <= 4; copy++) {
      deck.push({
        id: `parchi_${theme}_${ident.name.toLowerCase()}_${copy}_${Math.random().toString(36).substring(2, 7)}`,
        name: ident.name,
        theme,
        title: ident.title,
        icon: ident.icon,
        color: ident.color,
      });
    }
  });

  return deck;
}
