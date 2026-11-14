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
    title: 'Garama-Garam Chai & Samosa Treat',
    description: 'Loser will treat the table to hot cutting chai and crisp samosas with sweet-sour chutney!',
    emoji: '☕',
    penaltySlipText: (loser, winner) =>
      `👑 16 Parchi Official Court Verdict:\n${loser} has been declared the absolute loser!\n\nAs per table protocol, ${loser} is strictly ordered to sponsor steaming hot Cutting Chai & Crispy Samosas for the Champion ${winner}! ☕🥟\n\nNo excuses accepted. Pay up immediately!`,
  },
  {
    id: 'whatsapp_status',
    title: 'Winner Photo on WhatsApp Status (24 Hours)',
    description: "Loser must put Winner's photo on WhatsApp Status for 24 hours with caption 'Mere Guru'.",
    emoji: '📸',
    penaltySlipText: (loser, winner) =>
      `⚡ Court Order: ${loser} has finished DEAD LAST!\n\nPenalty:\nMust put Champion ${winner}'s photo on WhatsApp Status for 24 full hours with the caption:\n👉 "16 Parchi ke Asli Baap & Mere Guru Ji" 📸👑\n\nTake screenshot as proof!`,
  },
  {
    id: 'voice_note_song',
    title: 'Sing Sad Bollywood Song on Voice Note',
    description: 'Loser must send a 30s emotional voice note singing a heartbreak song in the WhatsApp group.',
    emoji: '🎤',
    penaltySlipText: (loser, winner) =>
      `💔 Emotional Damage Penalty:\n${loser} suffered a crushing defeat against ${winner}!\n\n${loser} MUST send a 30-second live voice recording singing "Achha Sila Diya Tune Mere Pyar Ka" in the friends WhatsApp group right now! 🎤😂`,
  },
  {
    id: 'call_me_boss',
    title: 'Address Winner as "Sir / Maalik" for 24 Hours',
    description: 'Loser must address the winner as "Sir" or "Maalik" in every chat today.',
    emoji: '🫡',
    penaltySlipText: (loser, winner) =>
      `🎖️ Royal Decree:\n${loser} has lost their pride!\n\nFor the next 24 hours, ${loser} is officially obligated to address Champion ${winner} as "Sir / Maalik / Huzoor" in every message and phone call! 🫡🙇‍♂️`,
  },
  {
    id: 'treat_party',
    title: 'Pizza & Cold Drink Party Treat',
    description: 'Loser will sponsor a delicious Pizza and Cold Drink party for the champion.',
    emoji: '🍕',
    penaltySlipText: (loser, winner) =>
      `🍕 Grand Foodie Penalty:\n${loser} was outsmarted at the table!\n\nLoser ${loser} is now legally bound by friendship rules to sponsor a Cheesy Pizza & Chilled Cold Drink treat for Champion ${winner}! 🍕🥤🔥`,
  },
  {
    id: 'custom',
    title: 'Custom High Stakes Dare',
    description: 'Host sets a custom hilarious dare or challenge for the match.',
    emoji: '🎯',
    penaltySlipText: (loser, winner) =>
      `🎯 High Stakes Shart Executed:\n${loser} finished last and MUST complete the decreed dare for Champion ${winner}!`,
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

