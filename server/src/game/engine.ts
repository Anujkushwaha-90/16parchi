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
  private isProcessingTransfer: boolean = false;

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
    return fromSeat;
  }

  /**
   * Check if a hand has exactly 4 identical cards
   */
  public checkFourOfAKind(hand: ParchiCard[]): boolean {
    if (hand.length !== 4) return false;
    const first = hand[0].name;
    return hand.every((c) => c.name === first);
  }

  /**
   * Get the card name that has 4 copies in hand, or null
   */
  public getWinningCardName(hand: ParchiCard[]): string | null {
    if (hand.length !== 4) return null;
    const first = hand[0].name;
    return hand.every((c) => c.name === first) ? first : null;
  }

  /**
   * Pass a parchi from active player to next active player clockwise
   * Strictly implements Section 2 & 3 rules:
   * - One-way transfer (sender hand -1, receiver hand +1)
   * - Post-transfer win check occurs ONLY on sender's remaining hand,
   *   and ONLY if sender now has EXACTLY 4 parchis remaining.
   */
  public passCard(
    senderUserId: string,
    cardId: string
  ): { success: boolean; error?: string } {
    if (this.status !== 'ACTIVE') {
      return { success: false, error: 'Match is not active.' };
    }

    if (this.isProcessingTransfer) {
      return { success: false, error: 'Transfer already in progress.' };
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

    if (targetSeat.finishedRank !== null || targetSeatIndex === this.activeSeat) {
      return { success: false, error: 'No eligible active receiver.' };
    }

    this.isProcessingTransfer = true;
    try {
      // 1. Remove selected parchi from sender's hand
      const [cardToPass] = currentSeat.hand.splice(cardIndex, 1);

      // 2. Add that parchi to receiver's hand
      targetSeat.hand.push(cardToPass);
      targetSeat.lastReceivedCardId = cardToPass.id;

      // 3. Sender's hand decreases by 1, receiver's hand increases by 1
      currentSeat.hasPassedInTurn = true;
      this.lastTransfer = {
        fromSeat: this.activeSeat,
        toSeat: targetSeatIndex,
        timestamp: Date.now(),
      };

      this.addLog(
        `${currentSeat.displayName} passed a parchi to ${targetSeat.displayName}`,
        'TRANSFER'
      );

      // 4. Exact Winning Check — Only After Transfer
      // Check sender's remaining hand.
      // Run 4-identical winning check ONLY if sender now has EXACTLY 4 parchis remaining.
      if (currentSeat.hand.length === 4) {
        const firstCardName = currentSeat.hand[0].name;
        const isAllIdentical = currentSeat.hand.every((c) => c.name === firstCardName);
        if (isAllIdentical) {
          this.finishSeat(this.activeSeat, firstCardName);
        }
      }

      // If match finished, notify and return
      if (this.status === 'FINISHED') {
        this.notifyState();
        return { success: true };
      }

      // 5. Advance turn to next eligible active player in circular order
      const nextTurnSeat = this.getNextActiveSeat(this.activeSeat);
      this.advanceTurn(nextTurnSeat);

      return { success: true };
    } finally {
      this.isProcessingTransfer = false;
    }
  }

  /**
   * Advance turn to the next eligible active player
   */
  private advanceTurn(nextSeatIndex: number): void {
    if (this.status === 'FINISHED') return;

    // Check if match should end (only 1 active player remains)
    const remainingActive = this.seats.filter((s) => s.finishedRank === null);
    if (remainingActive.length <= 1) {
      if (remainingActive.length === 1) {
        this.finishSeat(remainingActive[0].seatIndex, remainingActive[0].hand[0]?.name || 'PARCHI');
      } else {
        this.endMatch();
      }
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
   * Mark a seat as FINISHED in authoritative event order
   */
  public finishSeat(seatIndex: number, winningName: string): void {
    const seat = this.seats[seatIndex];
    if (!seat || seat.finishedRank !== null) return;

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
      `🎉 ${seat.displayName} completed 4x ${winningName} and finished ${rankTitles[rank - 1] || `${rank}th Place`}!`,
      'WIN'
    );

    // If only 1 active player remains, assign 4th place and end match safely
    const remainingActive = this.seats.filter((s) => s.finishedRank === null);
    if (remainingActive.length === 1) {
      const lastSeat = remainingActive[0];
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
    }
  }

  /**
   * Authoritative win declaration: requires exactly 4 cards, all identical
   */
  public declareWin(seatIndex: number): { success: boolean; error?: string } {
    const seat = this.seats[seatIndex];
    if (!seat) return { success: false, error: 'Seat not found' };
    if (seat.finishedRank !== null) return { success: false, error: 'Player already has a ranking.' };

    if (seat.hand.length !== 4) {
      return {
        success: false,
        error: 'Cannot declare: You must have exactly 4 identical parchis!',
      };
    }

    const firstCardName = seat.hand[0].name;
    const isFourOfAKind = seat.hand.every((c) => c.name === firstCardName);
    if (!isFourOfAKind) {
      return {
        success: false,
        error: 'Cannot declare: You do not have 4 identical parchis!',
      };
    }

    this.finishSeat(seatIndex, firstCardName);
    this.notifyState();
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
      const cardToPass = this.getCardToPass(currentSeat.hand, currentSeat.lastReceivedCardId);
      this.addLog(`${currentSeat.displayName} timed out. Auto-passing a parchi.`, 'SYSTEM');
      this.passCard(currentSeat.userId, cardToPass.id);
    }
  }

  /**
   * Strategic card selection:
   * 1. Identifies the bot's target suit (the identity it holds the most of)
   * 2. Protects the target suit cards and only selects from non-matching suits
   * 3. Implements anti-ping-pong: avoids passing back the card just received if another non-matching card is available
   */
  public getCardToPass(hand: ParchiCard[], lastReceivedCardId?: string): ParchiCard {
    if (hand.length <= 1) return hand[0];

    const counts: Record<string, number> = {};
    for (const card of hand) {
      counts[card.name] = (counts[card.name] || 0) + 1;
    }

    // Identify target identity with the most copies in hand
    let maxCount = -1;
    let targetSuit = '';
    for (const [name, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        targetSuit = name;
      }
    }

    // Select candidates from non-target identities only
    const nonTargetCards = hand.filter((c) => c.name !== targetSuit);
    const candidatePool = nonTargetCards.length > 0 ? nonTargetCards : hand;

    // Anti-ping-pong: if possible, avoid immediately bouncing back the card just received
    if (lastReceivedCardId && candidatePool.length > 1) {
      const otherCandidates = candidatePool.filter((c) => c.id !== lastReceivedCardId);
      if (otherCandidates.length > 0) {
        return otherCandidates[0];
      }
    }

    // Return the card with lowest frequency among candidates
    let minCount = 999;
    let chosenCard = candidatePool[0];
    for (const card of candidatePool) {
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
      setTimeout(() => {
        if (this.status === 'ACTIVE' && this.activeSeat === currentSeat.seatIndex) {
          this.onBotTurnCallback!(currentSeat.seatIndex);
        }
      }, 1000);
    }
  }

  /**
   * Bot plays its turn
   */
  public executeBotTurn(seatIndex: number): void {
    if (this.status !== 'ACTIVE' || this.activeSeat !== seatIndex) return;
    const botSeat = this.seats[seatIndex];
    if (!botSeat || !botSeat.isBot || botSeat.finishedRank !== null || botSeat.hand.length === 0) return;

    const cardToPass = this.getCardToPass(botSeat.hand, botSeat.lastReceivedCardId);
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
