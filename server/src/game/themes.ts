import { CardTheme, ParchiCard } from './types.js';

interface ThemeIdentity {
  name: string;
  title: string;
  icon: string;
  color: string;
}

export const THEME_IDENTITIES: Record<CardTheme, ThemeIdentity[]> = {
  royals: [
    { name: 'RAJA', title: 'Raja (King)', icon: 'Crown', color: '#f59e0b' },
    { name: 'RANI', title: 'Rani (Queen)', icon: 'Sparkles', color: '#ec4899' },
    { name: 'CHOR', title: 'Chor (Thief)', icon: 'Moon', color: '#818cf8' },
    { name: 'SIPAHI', title: 'Sipahi (Guard)', icon: 'Shield', color: '#10b981' },
  ],
  seasons: [
    { name: 'SPRING', title: 'Basant (Spring)', icon: 'Flower2', color: '#10b981' },
    { name: 'SUMMER', title: 'Grishma (Summer)', icon: 'Sun', color: '#f59e0b' },
    { name: 'AUTUMN', title: 'Sharad (Autumn)', icon: 'Leaf', color: '#f97316' },
    { name: 'WINTER', title: 'Hemant (Winter)', icon: 'Snowflake', color: '#06b6d4' },
  ],
  elements: [
    { name: 'FIRE', title: 'Agni (Fire)', icon: 'Flame', color: '#ef4444' },
    { name: 'WATER', title: 'Jal (Water)', icon: 'Droplets', color: '#3b82f6' },
    { name: 'EARTH', title: 'Prithvi (Earth)', icon: 'Mountain', color: '#84cc16' },
    { name: 'AIR', title: 'Vayu (Air)', icon: 'Wind', color: '#a855f7' },
  ],
  animals: [
    { name: 'LION', title: 'Sher (Lion)', icon: 'Cat', color: '#f59e0b' },
    { name: 'EAGLE', title: 'Garuda (Eagle)', icon: 'Feather', color: '#3b82f6' },
    { name: 'TIGER', title: 'Baagh (Tiger)', icon: 'Flame', color: '#ea580c' },
    { name: 'ELEPHANT', title: 'Haathi (Elephant)', icon: 'Shield', color: '#64748b' },
  ],
};

/**
 * Creates exactly 16 parchis: 4 distinct identities x 4 copies each.
 */
export function generateDeck(theme: CardTheme = 'royals'): ParchiCard[] {
  const identities = THEME_IDENTITIES[theme] || THEME_IDENTITIES.royals;
  const deck: ParchiCard[] = [];

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
