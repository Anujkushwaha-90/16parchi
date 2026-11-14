export interface MatchBetOption {
  id: string;
  title: string;
  description: string;
  emoji: string;
  penaltySlipText: (loserName: string, winnerName: string) => string;
}

export const MATCH_BETS: MatchBetOption[] = [
  {
    id: 'chai_samosa',
    title: 'Chai-Samosa on Loser',
    description: 'Loser will treat the winner to steaming hot Chai & Samosa at the canteen!',
    emoji: '☕',
    penaltySlipText: (loser, winner) =>
      `As per 16 Parchi Canteen Rules, ${loser} has lost and MUST treat Champion ${winner} to hot Chai & Samosa today! No excuses! ☕🥟`,
  },
  {
    id: 'whatsapp_status',
    title: 'Winner Photo on WhatsApp Status',
    description: "Loser must put Winner's photo on WhatsApp Status for 24 hours with caption 'Mere Guru'.",
    emoji: '📱',
    penaltySlipText: (loser, winner) =>
      `${loser} has been defeated! Penalty: Must put ${winner}'s photo on WhatsApp Status for 24 hours with caption: "Mere 16 Parchi ke Guru Ji!" 📸👑`,
  },
  {
    id: 'voice_note_song',
    title: 'Sing a Song in WhatsApp Group',
    description: 'Loser must send a 30s voice note singing an emotional Bollywood song.',
    emoji: '🎤',
    penaltySlipText: (loser, winner) =>
      `Defeat Penalty: ${loser} must immediately send a 30-second voice note singing "Accha Sila Diya Tune Mere Pyar Ka" in the friends WhatsApp group! 🎤😂`,
  },
  {
    id: 'call_me_boss',
    title: 'Call Winner "Sir / Boss" for 24 Hours',
    description: 'Loser must address the winner as "Sir" or "Boss" in all conversations today.',
    emoji: '👑',
    penaltySlipText: (loser, winner) =>
      `Royal Decree: ${loser} has lost the match and is officially bound to address Champion ${winner} as "Sir / Boss" in every message for the next 24 hours! 🫡🙇‍♂️`,
  },
  {
    id: 'treat_party',
    title: 'Pizza / Momos Party Treat',
    description: 'Loser will sponsor a delicious Pizza or Momos treat for the table!',
    emoji: '🍕',
    penaltySlipText: (loser, winner) =>
      `Foodie Penalty: ${loser} has finished last! Sponsoring a piping hot plate of Momos/Pizza for Champion ${winner} is now mandatory! 🍕🔥`,
  },
  {
    id: 'custom',
    title: 'Custom Shart (Host Choice)',
    description: 'Host sets a custom hilarious dare or punishment for the match.',
    emoji: '🎯',
    penaltySlipText: (loser, winner) =>
      `Custom Shart Enforced: ${loser} must complete the custom punishment decreed by Champion ${winner}!`,
  },
];

export function getBetPenaltySlipText(
  betId: string | undefined,
  loserName: string,
  winnerName: string,
  customText?: string
): string {
  if (betId === 'custom' && customText && customText.trim()) {
    return `Special Shart decreed: ${loserName} MUST honor the punishment: "${customText.trim()}" for Champion ${winnerName}! 😂`;
  }
  const bet = MATCH_BETS.find((b) => b.id === betId) || MATCH_BETS[0];
  return bet.penaltySlipText(loserName, winnerName);
}

