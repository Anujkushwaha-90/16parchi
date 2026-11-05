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
  CustomDeckConfig,
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
  public turnStartedAt: number;
  public rankings: RankingEntry[];
  public lastTransfer: { fromSeat: number; toSeat: number; timestamp: number } | null = null;
  public logs: GameLogEntry[] = [];
  public createdAt: number;
  public endedAt: number | null = null;
  public playerCount: number;
  public customDeckConfig: CustomDeckConfig | null;

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
    turnTimeSeconds: number = 60,
    customDeckConfig?: CustomDeckConfig | null,
    playerCount?: number
  ) {
    this.matchId = matchId;
    this.roomId = roomId;
    this.roomCode = roomCode;
    if (typeof customDeckConfig === 'number') {
      playerCount = customDeckConfig;
      customDeckConfig = null;
    }

    this.theme = theme;
    this.customDeckConfig = customDeckConfig || null;
    this.status = 'LOBBY';
    this.turnNumber = 1;
    this.roundNumber = 1;
    this.turnTimeSeconds = turnTimeSeconds;
    this.timeRemaining = turnTimeSeconds;
    this.turnStartedAt = Date.now();
    this.rankings = [];
    this.createdAt = Date.now();

    // Determine target player count (min 4, default 4 or max seatIndex + 1 or players.length)
    this.playerCount = Math.max(4, playerCount || players.length || 4);

    this.seats = [];
    for (let i = 0; i < this.playerCount; i++) {
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
          missedTurns: 0,
          isEliminated: false,
          ranOut: false,
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
          missedTurns: 0,
          isEliminated: false,
          ranOut: false,
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
    const totalParchis = this.playerCount * 4;
    this.addLog(`Game started! Dealing ${totalParchis} parchis to ${this.playerCount} players...`, 'DEAL');

    const deck = generateDeck(this.theme, this.playerCount, this.customDeckConfig);
    const shuffled = secureShuffle(deck);

    // Deal exactly 4 cards to each of the players
    for (let i = 0; i < this.playerCount; i++) {
      this.seats[i].hand = shuffled.slice(i * 4, (i + 1) * 4);
    }

    this.status = 'ACTIVE';
    this.activeSeat = 0;
    this.turnNumber = 1;
    this.roundNumber = 1;
    this.turnStartedAt = Date.now();
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
    const totalSeats = this.seats.length;
    for (let step = 1; step <= totalSeats; step++) {
      const next = (fromSeat + step) % totalSeats;
      if (this.seats[next].finishedRank === null && !this.seats[next].ranOut) {
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

    // Strict Anti-Bounce Rule: You cannot immediately pass back the parchi you just received if you have other cards
    if (
      currentSeat.lastReceivedCardId === cardId &&
      currentSeat.hand.some((c) => c.id !== cardId)
    ) {
      return {
        success: false,
        error: 'Anti-bounce rule: You cannot pass back the parchi you just received! Choose another parchi.',
      };
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
      if ((this.status as MatchStatus) === 'FINISHED') {
        this.notifyState();
        return { success: true };
      }

      // Reset transfer lock before advancing turn so bot or chained turns proceed without lock blockage
      this.isProcessingTransfer = false;

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

    // Check if match should end (only 1 active non-ranOut player remains)
    const remainingActive = this.seats.filter((s) => s.finishedRank === null && !s.ranOut);
    if (remainingActive.length <= 1) {
      if (remainingActive.length === 1) {
        this.finishSeat(remainingActive[0].seatIndex, remainingActive[0].hand[0]?.name || 'PARCHI');
      } else {
        this.endMatch();
      }
      return;
    }

    // If next seat has already finished or ran out, find next active seat
    let finalNext = nextSeatIndex;
    if (this.seats[finalNext].finishedRank !== null || this.seats[finalNext].ranOut) {
      finalNext = this.getNextActiveSeat(finalNext);
    }

    // Strict guarantee: Ensure activeSeat NEVER points to an already finished or ranOut player
    if (this.seats[finalNext].finishedRank !== null || this.seats[finalNext].ranOut) {
      for (let i = 0; i < this.seats.length; i++) {
        if (this.seats[i].finishedRank === null && !this.seats[i].ranOut) {
          finalNext = i;
          break;
        }
      }
    }

    this.activeSeat = finalNext;
    this.turnNumber++;
    this.roundNumber = Math.floor(this.turnNumber / 4) + 1;
    this.turnStartedAt = Date.now();
    this.timeRemaining = this.turnTimeSeconds;

    this.notifyState();

    // Auto-advance bot turns immediately without relying on frozen timers
    let botLoop = 0;
    while (
      this.status === 'ACTIVE' &&
      this.seats[this.activeSeat]?.isBot &&
      this.seats[this.activeSeat]?.finishedRank === null &&
      !this.seats[this.activeSeat]?.ranOut &&
      botLoop < 15
    ) {
      botLoop++;
      const botSeat = this.seats[this.activeSeat];
      if (!botSeat || botSeat.hand.length === 0) break;
      const cardToPass = this.getCardToPass(botSeat.hand, botSeat.lastReceivedCardId);
      this.passCard(botSeat.userId, cardToPass.id);
    }
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

    const rankTitles = ['1st Place 🏆', '2nd Place 🥈', '3rd Place 🥉'];
    const rankTitle = rank <= 3 ? rankTitles[rank - 1] : `${rank}th Place`;
    this.addLog(
      `🎉 ${seat.displayName} completed 4x ${winningName} and finished in ${rankTitle}!`,
      'WIN'
    );

    // If only 1 active non-ranOut player remains, assign last place and end match safely
    const remainingActive = this.seats.filter((s) => s.finishedRank === null && !s.ranOut);
    if (remainingActive.length <= 1) {
      if (remainingActive.length === 1) {
        const lastSeat = remainingActive[0];
        const lastRank = this.seats.length;
        lastSeat.finishedRank = lastRank;
        lastSeat.declaredAt = Date.now();
        lastSeat.winningCards = lastSeat.hand.map((c) => c.name);

        this.rankings.push({
          rank: lastRank,
          seatIndex: lastSeat.seatIndex,
          userId: lastSeat.userId,
          displayName: lastSeat.displayName,
          avatarUrl: lastSeat.avatarUrl,
          isBot: lastSeat.isBot,
          cardName: lastSeat.hand[0]?.name || 'PARCHI',
          declaredAt: lastSeat.declaredAt,
        });

        this.addLog(`Game Over! ${lastSeat.displayName} finished in ${lastRank}th place.`, 'WIN');
      }
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

    // If game has completed (e.g. last player assigned), notify and return
    if ((this.status as MatchStatus) === 'FINISHED') {
      this.notifyState();
      return { success: true };
    }

    // Critical: If the winning player currently held the turn, immediately advance to the next active player
    if (this.activeSeat === seatIndex) {
      const nextSeat = this.getNextActiveSeat(seatIndex);
      this.advanceTurn(nextSeat);
    } else {
      this.notifyState();
    }

    return { success: true };
  }

  /**
   * Handle player leaving / running out mid-game
   * Marks player as RAN OUT, immediately skips/passes their turn if active, and converts to fast auto-pass
   */
  public playerRanOut(userId: string): { success: boolean; error?: string } {
    const seat = this.seats.find((s) => s.userId === userId);
    if (!seat) return { success: false, error: 'Seat not found' };

    seat.ranOut = true;
    seat.isBot = true;
    seat.isConnected = false;
    seat.isEliminated = true;

    this.addLog(`🏃‍♂️ ${seat.displayName} ran out of the match!`, 'SYSTEM');

    // If only 1 non-ranOut human player remains, end match and grant them the win
    const activeHumans = this.seats.filter((s) => !s.ranOut && !s.isBot && s.finishedRank === null);
    if (activeHumans.length === 1) {
      const winner = activeHumans[0];
      this.finishSeat(winner.seatIndex, winner.hand[0]?.name || 'PARCHI');
      this.endMatch();
      this.notifyState();
      return { success: true };
    }

    // If it was currently their turn, skip their chance immediately!
    if (this.status === 'ACTIVE' && this.activeSeat === seat.seatIndex && seat.hand.length > 0) {
      const cardToPass = this.getCardToPass(seat.hand, seat.lastReceivedCardId);
      this.addLog(`⚡ ${seat.displayName}'s turn was skipped immediately (Ran Out).`, 'SYSTEM');
      this.passCard(seat.userId, cardToPass.id);
    } else {
      this.notifyState();
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
   * Timeout auto-move: picks a non-matching card to pass and applies Ludo 5-misses strike rule
   */
  private handleTurnTimeout(): void {
    const currentSeat = this.seats[this.activeSeat];
    if (!currentSeat) return;

    // If current active seat is already finished, immediately advance to the next active player
    if (currentSeat.finishedRank !== null) {
      const nextSeat = this.getNextActiveSeat(this.activeSeat);
      if (nextSeat !== this.activeSeat) {
        this.advanceTurn(nextSeat);
      }
      return;
    }

    if (currentSeat.hand.length === 0) return;

    if (!currentSeat.isBot) {
      currentSeat.missedTurns = (currentSeat.missedTurns || 0) + 1;
      const livesLeft = Math.max(0, 5 - currentSeat.missedTurns);

      this.addLog(
        `⏱️ ${currentSeat.displayName} missed turn! (${currentSeat.missedTurns}/5 strikes • ${livesLeft} lives left)`,
        'SYSTEM'
      );

      // If accumulated 5 missed turns, remove from human control and convert to AI Bot / Auto
      if (currentSeat.missedTurns >= 5) {
        currentSeat.isBot = true;
        currentSeat.isEliminated = true;
        this.addLog(
          `🚫 ${currentSeat.displayName} reached 5 strikes and was replaced by AI Bot (Auto-play)!`,
          'SYSTEM'
        );
      }
    } else {
      this.addLog(`${currentSeat.displayName} auto-passed a parchi.`, 'SYSTEM');
    }

    const cardToPass = this.getCardToPass(currentSeat.hand, currentSeat.lastReceivedCardId);
    this.passCard(currentSeat.userId, cardToPass.id);
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
   * Sync wall-clock timer authoritative state across serverless instances
   */
  public syncTurnTimer(): void {
    if (this.status !== 'ACTIVE') return;
    const elapsed = Math.floor((Date.now() - (this.turnStartedAt || Date.now())) / 1000);
    this.timeRemaining = Math.max(0, this.turnTimeSeconds - elapsed);
    if (this.timeRemaining <= 0) {
      this.handleTurnTimeout();
    }
  }

  /**
   * Return sanitized public state: NEVER reveals any player's actual hand cards
   */
  public getPublicState(): PublicGameState {
    this.syncTurnTimer();
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
        missedTurns: s.missedTurns || 0,
        isEliminated: !!s.isEliminated,
        ranOut: !!s.ranOut,
      })),
      activeSeat: this.activeSeat,
      turnNumber: this.turnNumber,
      roundNumber: this.roundNumber,
      turnTimeSeconds: this.turnTimeSeconds,
      timeRemaining: this.timeRemaining,
      rankings: this.rankings,
      lastTransfer: this.lastTransfer,
      logs: this.logs.slice(0, 15),
      playerCount: this.playerCount,
      customDeckConfig: this.customDeckConfig,
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
      lastReceivedCardId: seat.lastReceivedCardId || null,
    };
  }

  public destroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public toJSON() {
    return {
      matchId: this.matchId,
      roomId: this.roomId,
      roomCode: this.roomCode,
      theme: this.theme,
      status: this.status,
      seats: this.seats,
      activeSeat: this.activeSeat,
      turnNumber: this.turnNumber,
      roundNumber: this.roundNumber,
      turnTimeSeconds: this.turnTimeSeconds,
      turnStartedAt: this.turnStartedAt,
      timeRemaining: this.timeRemaining,
      rankings: this.rankings,
      lastTransfer: this.lastTransfer,
      logs: this.logs,
      createdAt: this.createdAt,
      endedAt: this.endedAt,
      playerCount: this.playerCount,
      customDeckConfig: this.customDeckConfig,
    };
  }

  public static fromJSON(data: any): ParchiGame {
    const game = new ParchiGame(
      data.matchId,
      data.roomId,
      data.roomCode,
      [],
      data.theme,
      data.turnTimeSeconds,
      data.customDeckConfig,
      data.playerCount
    );
    game.status = data.status || 'ACTIVE';
    game.seats = (data.seats || []).map((s: any) => ({
      ...s,
      missedTurns: s.missedTurns || 0,
      isEliminated: !!s.isEliminated,
      ranOut: !!s.ranOut,
    }));
    game.activeSeat = data.activeSeat ?? 0;
    game.turnNumber = data.turnNumber ?? 1;
    game.roundNumber = data.roundNumber ?? 1;
    game.turnStartedAt = data.turnStartedAt || Date.now();
    const elapsed = Math.floor((Date.now() - game.turnStartedAt) / 1000);
    game.timeRemaining = Math.max(0, game.turnTimeSeconds - elapsed);
    game.rankings = data.rankings || [];
    game.lastTransfer = data.lastTransfer || null;
    game.logs = data.logs || [];
    game.createdAt = data.createdAt || Date.now();
    game.endedAt = data.endedAt || null;

    // Safety: Ensure activeSeat never points to an already-finished player
    if (game.seats[game.activeSeat] && game.seats[game.activeSeat].finishedRank !== null) {
      game.activeSeat = game.getNextActiveSeat(game.activeSeat);
    }

    if (game.status === 'ACTIVE') {
      game.startTurnTimer();
    }

    return game;
  }
}
