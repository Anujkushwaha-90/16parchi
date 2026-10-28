import crypto from 'crypto';
import {
  CardTheme,
  ParchiCard,
  PlayerSeat,
  PublicGameState,
  PrivatePlayerState,
  RankingEntry,
  GameLogEntry,
  MatchStatus,
} from './types.js';
import { generateDeck } from './themes.js';

/**
 * Cryptographically secure Fisher-Yates shuffle
 */
function secureShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    // Generate secure random integer in [0, i]
    const randomBuffer = crypto.randomBytes(4);
    const randomFloat = randomBuffer.readUInt32BE(0) / 0xffffffff;
    const j = Math.floor(randomFloat * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class ParchiGame {
  public matchId: string;
  public roomId: string;
  public roomCode: string;
  public theme: CardTheme;
  public status: MatchStatus;
  public seats: PlayerSeat[];
  public activeSeat: number;
  public turnNumber: number;
  public roundNumber: number;
  public turnTimeSeconds: number;
  public timeRemaining: number;
  public rankings: RankingEntry[];
  public lastTransfer: { fromSeat: number; toSeat: number; timestamp: number } | null = null;
  public logs: GameLogEntry[] = [];
  public createdAt: number;
  public endedAt: number | null = null;

  private timerInterval: NodeJS.Timeout | null = null;
  private onStateChangeCallback: (() => void) | null = null;
  private onBotTurnCallback: ((seatIndex: number) => void) | null = null;

  constructor(
    matchId: string,
    roomId: string,
    roomCode: string,
    players: Array<{
      userId: string;
      username: string;
      displayName: string;
      avatarUrl: string;
      isBot: boolean;
      seatIndex: number;
    }>,
    theme: CardTheme = 'royals',
    turnTimeSeconds: number = 20
  ) {
    this.matchId = matchId;
    this.roomId = roomId;
    this.roomCode = roomCode;
    this.theme = theme;
    this.status = 'LOBBY';
    this.turnNumber = 1;
    this.roundNumber = 1;
    this.turnTimeSeconds = turnTimeSeconds;
    this.timeRemaining = turnTimeSeconds;
    this.rankings = [];
    this.createdAt = Date.now();

    // Exactly 4 seats required
    this.seats = [];
    for (let i = 0; i < 4; i++) {
      const p = players.find((pl) => pl.seatIndex === i);
      if (p) {
        this.seats.push({
          seatIndex: i,
          userId: p.userId,
          username: p.username,
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          isBot: p.isBot,
          isReady: true,
          isConnected: true,
          hand: [],
          hasPassedInTurn: false,
          finishedRank: null,
          winningCards: null,
          declaredAt: null,
        });
      } else {
        // Fallback bot placeholder if seat empty
        this.seats.push({
          seatIndex: i,
          userId: `bot_${i}_${Math.random().toString(36).substring(2, 6)}`,
          username: `Bot_${i + 1}`,
          displayName: `AI Player ${i + 1}`,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=ParchiBot${i + 1}`,
          isBot: true,
          isReady: true,
          isConnected: true,
          hand: [],
          hasPassedInTurn: false,
          finishedRank: null,
          winningCards: null,
          declaredAt: null,
        });
      }
    }

    this.activeSeat = 0;
  }

  public setCallbacks(
    onStateChange: () => void,
    onBotTurn: (seatIndex: number) => void
  ) {
    this.onStateChangeCallback = onStateChange;
    this.onBotTurnCallback = onBotTurn;
  }

  /**
   * Start the match: generate deck, shuffle securely, deal 4 cards per player
   */
  public startMatch(): void {
    if (this.status !== 'LOBBY') return;

    this.status = 'DEALING';
    this.addLog('Game started! Dealing 16 parchis...', 'DEAL');

    const deck = generateDeck(this.theme);
    const shuffled = secureShuffle(deck);

    // Deal exactly 4 cards to each of the 4 players
    for (let i = 0; i < 4; i++) {
      this.seats[i].hand = shuffled.slice(i * 4, (i + 1) * 4);
    }

    this.status = 'ACTIVE';
    this.activeSeat = 0;
    this.turnNumber = 1;
    this.roundNumber = 1;
    this.timeRemaining = this.turnTimeSeconds;

    this.addLog(
      `Round 1 begins. ${this.seats[this.activeSeat].displayName}'s turn to pass a parchi.`,
      'SYSTEM'
    );
    this.startTurnTimer();
    this.notifyState();
    this.triggerBotIfCurrentTurn();
  }

  /**
   * Helper to find next eligible active (non-finished) seat in clockwise direction
   */
  public getNextActiveSeat(fromSeat: number): number {
    for (let step = 1; step <= 4; step++) {
      const next = (fromSeat + step) % 4;
      if (this.seats[next].finishedRank === null) {
        return next;
      }
    }
    return (fromSeat + 1) % 4;
  }

  /**
   * Check if a hand has 4 identical cards
   */
  public checkFourOfAKind(hand: ParchiCard[]): boolean {
    if (hand.length < 4) return false;
    const counts: Record<string, number> = {};
    for (const card of hand) {
      counts[card.name] = (counts[card.name] || 0) + 1;
      if (counts[card.name] >= 4) return true;
    }
    return false;
  }

  /**
   * Get the card name that has 4 copies in hand, or null
   */
  public getWinningCardName(hand: ParchiCard[]): string | null {
    const counts: Record<string, number> = {};
    for (const card of hand) {
      counts[card.name] = (counts[card.name] || 0) + 1;
      if (counts[card.name] >= 4) return card.name;
    }
    return null;
  }

  /**
   * Pass a parchi from active player to next active player clockwise
   */
  public passCard(
    senderUserId: string,
    cardId: string
  ): { success: boolean; error?: string } {
    if (this.status !== 'ACTIVE') {
      return { success: false, error: 'Match is not active.' };
    }

    const currentSeat = this.seats[this.activeSeat];
    if (currentSeat.userId !== senderUserId) {
      return { success: false, error: 'It is not your turn to pass.' };
    }

    if (currentSeat.finishedRank !== null) {
      return { success: false, error: 'You have already completed your set!' };
    }

    const cardIndex = currentSeat.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, error: 'Selected parchi is not in your hand.' };
    }

    const targetSeatIndex = this.getNextActiveSeat(this.activeSeat);
    const targetSeat = this.seats[targetSeatIndex];

    // Atomic transfer
    const [cardToPass] = currentSeat.hand.splice(cardIndex, 1);
    targetSeat.hand.push(cardToPass);

    this.lastTransfer = {
      fromSeat: this.activeSeat,
      toSeat: targetSeatIndex,
      timestamp: Date.now(),
    };

    this.addLog(
      `${currentSeat.displayName} passed a parchi to ${targetSeat.displayName}`,
      'TRANSFER'
    );

    // Move turn to the receiver or next active seat
    this.advanceTurn(targetSeatIndex);

    return { success: true };
  }

  /**
   * Advance turn
   */
  private advanceTurn(nextSeatIndex: number): void {
    if (this.status === 'FINISHED') return;

    // Check if match should end (3 players finished)
    const finishedCount = this.seats.filter((s) => s.finishedRank !== null).length;
    if (finishedCount >= 3) {
      this.endMatch();
      return;
    }

    // If next seat has already finished, find next active seat
    let finalNext = nextSeatIndex;
    if (this.seats[finalNext].finishedRank !== null) {
      finalNext = this.getNextActiveSeat(finalNext);
    }

    this.activeSeat = finalNext;
    this.turnNumber++;
    this.roundNumber = Math.floor(this.turnNumber / 4) + 1;
    this.timeRemaining = this.turnTimeSeconds;

    this.notifyState();
    this.triggerBotIfCurrentTurn();
  }

  /**
   * Declare a win for a seat
   */
  public declareWin(seatIndex: number): { success: boolean; error?: string } {
    const seat = this.seats[seatIndex];
    if (!seat) return { success: false, error: 'Seat not found' };

    if (seat.finishedRank !== null) {
      return { success: false, error: 'Player already has a ranking.' };
    }

    const winningName = this.getWinningCardName(seat.hand);
    if (!winningName) {
      return {
        success: false,
        error: 'Cannot declare: You do not have 4 identical parchis!',
      };
    }

    const rank = this.rankings.length + 1;
    seat.finishedRank = rank;
    seat.declaredAt = Date.now();
    seat.winningCards = seat.hand.map((c) => c.name);

    const rankingEntry: RankingEntry = {
      rank,
      seatIndex,
      userId: seat.userId,
      displayName: seat.displayName,
      avatarUrl: seat.avatarUrl,
      isBot: seat.isBot,
      cardName: winningName,
      declaredAt: seat.declaredAt,
    };

    this.rankings.push(rankingEntry);

    const rankTitles = ['1st Place 🏆', '2nd Place 🥈', '3rd Place 🥉', '4th Place'];
    this.addLog(
      `🎉 ${seat.displayName} completed 4x ${winningName} and won ${rankTitles[rank - 1]}!`,
      'WIN'
    );

    // If 3 players have now finished, assign 4th place to the remaining player and finish match
    const remainingUnfinished = this.seats.filter((s) => s.finishedRank === null);
    if (remainingUnfinished.length === 1) {
      const lastSeat = remainingUnfinished[0];
      lastSeat.finishedRank = 4;
      lastSeat.declaredAt = Date.now();
      lastSeat.winningCards = lastSeat.hand.map((c) => c.name);

      this.rankings.push({
        rank: 4,
        seatIndex: lastSeat.seatIndex,
        userId: lastSeat.userId,
        displayName: lastSeat.displayName,
        avatarUrl: lastSeat.avatarUrl,
        isBot: lastSeat.isBot,
        cardName: lastSeat.hand[0]?.name || 'PARCHI',
        declaredAt: lastSeat.declaredAt,
      });

      this.addLog(`Game Over! ${lastSeat.displayName} finished in 4th place.`, 'WIN');
      this.endMatch();
    } else {
      // If the player who just won was the active seat, move turn to next active seat
      if (this.activeSeat === seatIndex) {
        const nextSeat = this.getNextActiveSeat(seatIndex);
        this.advanceTurn(nextSeat);
      } else {
        this.notifyState();
      }
    }

    return { success: true };
  }

  /**
   * End match and finalize
   */
  public endMatch(): void {
    this.status = 'FINISHED';
    this.endedAt = Date.now();
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.addLog('Match concluded! View final podium rankings.', 'SYSTEM');
    this.notifyState();
  }

  /**
   * Auto-timeout timer for turn
   */
  private startTurnTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (this.status !== 'ACTIVE') {
        if (this.timerInterval) clearInterval(this.timerInterval);
        return;
      }

      this.timeRemaining--;
      if (this.timeRemaining <= 0) {
        // Auto-pass a card for inactive player
        this.handleTurnTimeout();
      } else if (this.timeRemaining % 5 === 0) {
        this.notifyState();
      }
    }, 1000);
  }

  /**
   * Timeout auto-move: picks a non-matching card to pass
   */
  private handleTurnTimeout(): void {
    const currentSeat = this.seats[this.activeSeat];
    if (currentSeat && currentSeat.hand.length > 0) {
      // Choose card to pass: pick lowest frequency card
      const cardToPass = this.getCardToPass(currentSeat.hand);
      this.addLog(`${currentSeat.displayName} timed out. Auto-passing a parchi.`, 'SYSTEM');
      this.passCard(currentSeat.userId, cardToPass.id);
    }
  }

  /**
   * Smart card selection: keeps cards with highest count, passes the rarest card
   */
  public getCardToPass(hand: ParchiCard[]): ParchiCard {
    const counts: Record<string, number> = {};
    for (const card of hand) {
      counts[card.name] = (counts[card.name] || 0) + 1;
    }

    // Find card with lowest frequency (or random among lowest)
    let minCount = 999;
    let chosenCard = hand[0];

    for (const card of hand) {
      if (counts[card.name] < minCount) {
        minCount = counts[card.name];
        chosenCard = card;
      }
    }

    return chosenCard;
  }

  private triggerBotIfCurrentTurn(): void {
    if (this.status !== 'ACTIVE') return;
    const currentSeat = this.seats[this.activeSeat];
    if (currentSeat && currentSeat.isBot && this.onBotTurnCallback) {
      // Slight realistic human-like delay for bot turn
      setTimeout(() => {
        if (this.status === 'ACTIVE' && this.activeSeat === currentSeat.seatIndex) {
          this.onBotTurnCallback!(currentSeat.seatIndex);
        }
      }, 1200);
    }
  }

  /**
   * Bot plays its turn
   */
  public executeBotTurn(seatIndex: number): void {
    if (this.status !== 'ACTIVE' || this.activeSeat !== seatIndex) return;
    const botSeat = this.seats[seatIndex];
    if (!botSeat || !botSeat.isBot || botSeat.hand.length === 0) return;

    // Check if bot already has 4-of-a-kind
    if (this.checkFourOfAKind(botSeat.hand)) {
      this.declareWin(seatIndex);
      return;
    }

    const cardToPass = this.getCardToPass(botSeat.hand);
    this.passCard(botSeat.userId, cardToPass.id);
  }

  private addLog(text: string, type: GameLogEntry['type']): void {
    this.logs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      text,
      type,
    });
    if (this.logs.length > 50) this.logs.pop();
  }

  private notifyState(): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback();
    }
  }

  /**
   * Return sanitized public state: NEVER reveals any player's actual hand cards
   */
  public getPublicState(): PublicGameState {
    return {
      matchId: this.matchId,
      roomId: this.roomId,
      roomCode: this.roomCode,
      theme: this.theme,
      status: this.status,
      seats: this.seats.map((s) => ({
        seatIndex: s.seatIndex,
        userId: s.userId,
        username: s.username,
        displayName: s.displayName,
        avatarUrl: s.avatarUrl,
        isBot: s.isBot,
        isReady: s.isReady,
        isConnected: s.isConnected,
        cardCount: s.hand.length,
        hasPassedInTurn: s.hasPassedInTurn,
        finishedRank: s.finishedRank,
        // Only show winning cards if they have finished!
        winningCards: s.winningCards,
      })),
      activeSeat: this.activeSeat,
      turnNumber: this.turnNumber,
      roundNumber: this.roundNumber,
      turnTimeSeconds: this.turnTimeSeconds,
      timeRemaining: this.timeRemaining,
      rankings: this.rankings,
      lastTransfer: this.lastTransfer,
      logs: this.logs.slice(0, 15),
    };
  }

  /**
   * Return personalized private state: Contains ONLY the authenticated player's own cards
   */
  public getPrivateStateForPlayer(userId: string): PrivatePlayerState | null {
    const seatIndex = this.seats.findIndex((s) => s.userId === userId);
    if (seatIndex === -1) return null;

    const seat = this.seats[seatIndex];
    const publicState = this.getPublicState();

    const isMyTurn = this.status === 'ACTIVE' && this.activeSeat === seatIndex;
    const canPass = isMyTurn && seat.finishedRank === null && seat.hand.length > 0;
    const canDeclare = seat.finishedRank === null && this.checkFourOfAKind(seat.hand);

    return {
      ...publicState,
      mySeatIndex: seatIndex,
      myHand: seat.hand, // ONLY authenticated player's own hand!
      canPass,
      canDeclare,
      isMyTurn,
    };
  }

  public destroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
