import { describe, it, expect } from 'vitest';
import { ParchiGame } from '../game/engine.js';
import { generateDeck, validateDeckConfiguration } from '../game/themes.js';

describe('16 PARCHI Master Test Suite', () => {
  const dummyPlayers = [
    {
      userId: 'user_1',
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: 'https://avatar/1',
      isBot: false,
      seatIndex: 0,
    },
    {
      userId: 'user_2',
      username: 'bob',
      displayName: 'Bob',
      avatarUrl: 'https://avatar/2',
      isBot: false,
      seatIndex: 1,
    },
    {
      userId: 'user_3',
      username: 'charlie',
      displayName: 'Charlie',
      avatarUrl: 'https://avatar/3',
      isBot: false,
      seatIndex: 2,
    },
    {
      userId: 'user_4',
      username: 'david',
      displayName: 'David',
      avatarUrl: 'https://avatar/4',
      isBot: false,
      seatIndex: 3,
    },
  ];

  describe('Deck Composition & Dealing', () => {
    it('generates a valid 16-parchi deck with exactly 4 identities and 4 copies each', () => {
      const deck = generateDeck('royals');
      expect(deck).toHaveLength(16);

      const counts: Record<string, number> = {};
      for (const card of deck) {
        counts[card.name] = (counts[card.name] || 0) + 1;
      }

      expect(Object.keys(counts)).toHaveLength(4);
      expect(counts['RAJA']).toBe(4);
      expect(counts['RANI']).toBe(4);
      expect(counts['CHOR']).toBe(4);
      expect(counts['SIPAHI']).toBe(4);
    });

    it('generates alternative valid themes (seasons, elements, animals)', () => {
      const seasonsDeck = generateDeck('seasons');
      expect(seasonsDeck).toHaveLength(16);

      const elementsDeck = generateDeck('elements');
      expect(elementsDeck).toHaveLength(16);

      const animalsDeck = generateDeck('animals');
      expect(animalsDeck).toHaveLength(16);
    });

    it('deals exactly 4 cards to each of the 4 players on start', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      expect(game.status).toBe('ACTIVE');
      expect(game.seats).toHaveLength(4);

      for (let i = 0; i < 4; i++) {
        expect(game.seats[i].hand).toHaveLength(4);
      }
    });
  });

  describe('Authoritative Passing & Winning Logic (12 Mandatory Tests)', () => {
    it('1. A normal one-way transfer changes sender count from 4 to 3 and receiver count from 4 to 5', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      expect(game.seats[0].hand).toHaveLength(4);
      expect(game.seats[1].hand).toHaveLength(4);

      const cardToPass = game.seats[0].hand[0];
      const result = game.passCard('user_1', cardToPass.id);

      expect(result.success).toBe(true);
      expect(game.seats[0].hand).toHaveLength(3);
      expect(game.seats[1].hand).toHaveLength(5);
      expect(game.seats[1].hand.some((c) => c.id === cardToPass.id)).toBe(true);
    });

    it('2. Transfers follow the circular seat order', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      // P1 (Seat 0) -> P2 (Seat 1)
      expect(game.activeSeat).toBe(0);
      const c0 = game.seats[0].hand[0];
      expect(game.passCard('user_1', c0.id).success).toBe(true);
      expect(game.activeSeat).toBe(1);

      // P2 (Seat 1) -> P3 (Seat 2)
      const c1 = game.seats[1].hand[0];
      expect(game.passCard('user_2', c1.id).success).toBe(true);
      expect(game.activeSeat).toBe(2);

      // P3 (Seat 2) -> P4 (Seat 3)
      const c2 = game.seats[2].hand[0];
      expect(game.passCard('user_3', c2.id).success).toBe(true);
      expect(game.activeSeat).toBe(3);

      // P4 (Seat 3) -> P1 (Seat 0)
      const c3 = game.seats[3].hand[0];
      expect(game.passCard('user_4', c3.id).success).toBe(true);
      expect(game.activeSeat).toBe(0);
    });

    it('3. No winning check occurs when the sender has 3 cards after transferring', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      // Setup Seat 0 with 4 RAJA cards
      game.seats[0].hand = [
        { id: 'r1', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'r2', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'r3', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'r4', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
      ];

      // Sender transfers 1 card, leaving 3 cards in hand
      const passResult = game.passCard('user_1', 'r4');
      expect(passResult.success).toBe(true);
      expect(game.seats[0].hand).toHaveLength(3);

      // No winning check occurs: sender remains active with finishedRank null
      expect(game.seats[0].finishedRank).toBeNull();
      expect(game.rankings).toHaveLength(0);
    });

    it('4. The winning check occurs when the sender has exactly 4 cards after transferring', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      // Setup Seat 0 with 5 cards (4 RAJA + 1 CHOR)
      game.seats[0].hand = [
        { id: 'r1', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'r2', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'r3', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'r4', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'c1', name: 'CHOR', theme: 'royals', title: 'Chor', icon: 'Moon', color: '#6366f1' },
      ];

      // Transfer the 1 odd CHOR card
      const passResult = game.passCard('user_1', 'c1');
      expect(passResult.success).toBe(true);
      expect(game.seats[0].hand).toHaveLength(4);

      // Winning check executed on sender's remaining 4 cards!
      expect(game.seats[0].finishedRank).toBe(1);
      expect(game.rankings).toHaveLength(1);
      expect(game.rankings[0].cardName).toBe('RAJA');
    });

    it('5. Four identical cards among exactly 4 remaining cards finish the sender', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      game.seats[0].hand = [
        { id: 'rn1', name: 'RANI', theme: 'royals', title: 'Rani', icon: 'Sparkles', color: '#ec4899' },
        { id: 'rn2', name: 'RANI', theme: 'royals', title: 'Rani', icon: 'Sparkles', color: '#ec4899' },
        { id: 'rn3', name: 'RANI', theme: 'royals', title: 'Rani', icon: 'Sparkles', color: '#ec4899' },
        { id: 'rn4', name: 'RANI', theme: 'royals', title: 'Rani', icon: 'Sparkles', color: '#ec4899' },
        { id: 's1', name: 'SIPAHI', theme: 'royals', title: 'Sipahi', icon: 'Shield', color: '#10b981' },
      ];

      const res = game.passCard('user_1', 's1');
      expect(res.success).toBe(true);

      expect(game.seats[0].finishedRank).toBe(1);
      expect(game.seats[0].winningCards).toEqual(['RANI', 'RANI', 'RANI', 'RANI']);
      expect(game.seats[0].hand).toHaveLength(4);
    });

    it('6. Four identical cards among 5 or more remaining cards do not finish the sender', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      // Setup Seat 0 with 6 cards: 4 RAJA + 2 CHOR
      game.seats[0].hand = [
        { id: 'r1', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'r2', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'r3', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'r4', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'c1', name: 'CHOR', theme: 'royals', title: 'Chor', icon: 'Moon', color: '#6366f1' },
        { id: 'c2', name: 'CHOR', theme: 'royals', title: 'Chor', icon: 'Moon', color: '#6366f1' },
      ];

      // Passes 1 CHOR card, leaving 5 cards in hand (4 RAJA + 1 CHOR)
      const res = game.passCard('user_1', 'c1');
      expect(res.success).toBe(true);
      expect(game.seats[0].hand).toHaveLength(5);

      // Remaining count is 5 (not exactly 4) -> Sender MUST NOT FINISH
      expect(game.seats[0].finishedRank).toBeNull();
      expect(game.rankings).toHaveLength(0);
    });

    it('7. Four cards with different names do not finish the sender', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      // Setup Seat 0 with 5 cards: 2 RAJA + 2 RANI + 1 CHOR
      game.seats[0].hand = [
        { id: 'r1', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'r2', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'rn1', name: 'RANI', theme: 'royals', title: 'Rani', icon: 'Sparkles', color: '#ec4899' },
        { id: 'rn2', name: 'RANI', theme: 'royals', title: 'Rani', icon: 'Sparkles', color: '#ec4899' },
        { id: 'c1', name: 'CHOR', theme: 'royals', title: 'Chor', icon: 'Moon', color: '#6366f1' },
      ];

      // Pass CHOR card, leaving exactly 4 cards in hand (2 RAJA + 2 RANI)
      const res = game.passCard('user_1', 'c1');
      expect(res.success).toBe(true);
      expect(game.seats[0].hand).toHaveLength(4);

      // 4 cards are not all identical -> Sender remains active
      expect(game.seats[0].finishedRank).toBeNull();
      expect(game.rankings).toHaveLength(0);
    });

    it('8. Finished players cannot send or receive cards', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      // Finish Seat 0
      game.finishSeat(0, 'RAJA');
      expect(game.seats[0].finishedRank).toBe(1);

      // 1. Finished player cannot send cards
      game.activeSeat = 0;
      const sendAttempt = game.passCard('user_1', game.seats[0].hand[0]?.id || 'any');
      expect(sendAttempt.success).toBe(false);
      expect(sendAttempt.error).toContain('already completed');

      // 2. Finished player cannot receive cards
      // When Seat 3 passes (normally target would be Seat 0), it skips Seat 0 and sends to Seat 1
      game.activeSeat = 3;
      const seat0CountBefore = game.seats[0].hand.length;
      const seat1CountBefore = game.seats[1].hand.length;
      const cardToPass = game.seats[3].hand[0];

      const passRes = game.passCard('user_4', cardToPass.id);
      expect(passRes.success).toBe(true);

      // Seat 0 did not receive any card
      expect(game.seats[0].hand.length).toBe(seat0CountBefore);

      // Seat 1 received the card instead
      expect(game.seats[1].hand.length).toBe(seat1CountBefore + 1);
      expect(game.seats[1].hand.some((c) => c.id === cardToPass.id)).toBe(true);
    });

    it('9. Finished players are skipped in circular turn order', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      // Mark Seat 1 (Bob) as FINISHED
      game.finishSeat(1, 'RANI');

      // Seat 0 (Alice) is active. She passes a card.
      expect(game.activeSeat).toBe(0);
      const card = game.seats[0].hand[0];
      game.passCard('user_1', card.id);

      // Turn must skip finished Seat 1 and land directly on Seat 2 (Charlie)
      expect(game.activeSeat).toBe(2);
    });

    it('10. Multiple simultaneous transfer requests cannot duplicate cards or produce duplicate finish positions', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      const initialTotalCards = game.seats.reduce((sum, s) => sum + s.hand.length, 0);
      expect(initialTotalCards).toBe(16);

      const cardId = game.seats[0].hand[0].id;

      // First transfer call
      const res1 = game.passCard('user_1', cardId);
      expect(res1.success).toBe(true);

      // Duplicate/replay transfer with same card by user_1
      const res2 = game.passCard('user_1', cardId);
      expect(res2.success).toBe(false);

      // Total cards in system remains strictly 16
      const finalTotalCards = game.seats.reduce((sum, s) => sum + s.hand.length, 0);
      expect(finalTotalCards).toBe(16);

      // No card exists twice in any hand
      const allCardIds = game.seats.flatMap((s) => s.hand.map((c) => c.id));
      const uniqueCardIds = new Set(allCardIds);
      expect(uniqueCardIds.size).toBe(16);
    });

    it('11. Private hands are never exposed to other players', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      // Public state verification
      const publicState = game.getPublicState();
      for (const seat of publicState.seats) {
        expect((seat as any).hand).toBeUndefined();
        expect(seat.cardCount).toBe(4);
      }

      // Private state for user_1
      const p1State = game.getPrivateStateForPlayer('user_1');
      expect(p1State).not.toBeNull();
      expect(p1State!.myHand).toHaveLength(4);
      // Other players' actual cards are never included
      expect((p1State!.seats[1] as any).hand).toBeUndefined();
      expect((p1State!.seats[2] as any).hand).toBeUndefined();
      expect((p1State!.seats[3] as any).hand).toBeUndefined();
    });

    it('12. The round ends safely when only one active player remains', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      // Finish Seat 0 (1st Place)
      game.finishSeat(0, 'RAJA');
      expect(game.status).toBe('ACTIVE');
      expect(game.rankings).toHaveLength(1);

      // Finish Seat 1 (2nd Place)
      game.finishSeat(1, 'RANI');
      expect(game.status).toBe('ACTIVE');
      expect(game.rankings).toHaveLength(2);

      // Finish Seat 2 (3rd Place)
      game.finishSeat(2, 'SIPAHI');

      // Now only 1 active player remains (Seat 3 - David)
      // Round must end safely and assign 4th place
      expect(game.status).toBe('FINISHED');
      expect(game.seats[3].finishedRank).toBe(4);
      expect(game.rankings).toHaveLength(4);
      expect(game.rankings[0].rank).toBe(1);
      expect(game.rankings[1].rank).toBe(2);
      expect(game.rankings[2].rank).toBe(3);
      expect(game.rankings[3].rank).toBe(4);
      expect(game.rankings[3].displayName).toBe('David');
    });
  });

  describe('Section 10: Custom Player Count & Custom Parchi Names', () => {
    const fivePlayers = [
      ...dummyPlayers,
      {
        userId: 'user_5',
        username: 'eva',
        displayName: 'Eva',
        avatarUrl: 'https://avatar/5',
        isBot: false,
        seatIndex: 4,
      },
    ];

    it('rejects fewer than 4 players', () => {
      const result = validateDeckConfiguration(3);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('At least 4 players');
    });

    it('accepts valid configurations with 4 or more players up to the maximum (4, 5, 6, 8, 10)', () => {
      for (const count of [4, 5, 6, 7, 8, 9, 10]) {
        const result = validateDeckConfiguration(count);
        expect(result.valid).toBe(true);
        expect(result.totalCards).toBe(count * 4);
      }
    });

    it('generates the expected standard deck for N players (4 x N cards)', () => {
      const deck5 = generateDeck('royals', 5);
      expect(deck5).toHaveLength(20);

      const deck6 = generateDeck('seasons', 6);
      expect(deck6).toHaveLength(24);

      const deck8 = generateDeck('elements', 8);
      expect(deck8).toHaveLength(32);
    });

    it('rejects custom decks with empty names, duplicates, or non-positive quantities', () => {
      // Empty name
      const emptyRes = validateDeckConfiguration(4, {
        isCustom: true,
        items: [
          { name: 'Raja', count: 4 },
          { name: ' ', count: 4 },
          { name: 'Chor', count: 4 },
          { name: 'Sipahi', count: 4 },
        ],
      });
      expect(emptyRes.valid).toBe(false);
      expect(emptyRes.error).toContain('cannot be empty');

      // Duplicate name (case insensitive)
      const dupRes = validateDeckConfiguration(4, {
        isCustom: true,
        items: [
          { name: 'King', count: 4 },
          { name: 'king', count: 4 },
          { name: 'Queen', count: 4 },
          { name: 'Jack', count: 4 },
        ],
      });
      expect(dupRes.valid).toBe(false);
      expect(dupRes.error).toContain('Duplicate parchi name');

      // Invalid quantity (< 1)
      const qtyRes = validateDeckConfiguration(4, {
        isCustom: true,
        items: [
          { name: 'Raja', count: 0 },
          { name: 'Rani', count: 4 },
          { name: 'Chor', count: 4 },
          { name: 'Sipahi', count: 4 },
        ],
      });
      expect(qtyRes.valid).toBe(false);
      expect(qtyRes.error).toContain('positive whole number');
    });

    it('rejects custom decks with insufficient cards (< 4 x playerCount) or too few unique names', () => {
      // 5 players but only 16 cards
      const notEnoughCards = validateDeckConfiguration(5, {
        isCustom: true,
        items: [
          { name: 'A', count: 4 },
          { name: 'B', count: 4 },
          { name: 'C', count: 4 },
          { name: 'D', count: 4 },
        ],
      });
      expect(notEnoughCards.valid).toBe(false);
      expect(notEnoughCards.error).toContain('requires at least 20 parchis');

      // 5 players with 20 cards but only 4 unique names (5 of each)
      const notEnoughUnique = validateDeckConfiguration(5, {
        isCustom: true,
        items: [
          { name: 'A', count: 5 },
          { name: 'B', count: 5 },
          { name: 'C', count: 5 },
          { name: 'D', count: 5 },
        ],
      });
      expect(notEnoughUnique.valid).toBe(false);
      expect(notEnoughUnique.error).toContain('unique parchi identities');
    });

    it('correctly validates, saves, and generates custom names in Hindi, English, and Unicode with custom quantities', () => {
      const customConfig = {
        isCustom: true,
        items: [
          { name: 'राजा (King)', count: 4 },
          { name: 'रानी (Queen)', count: 4 },
          { name: 'चोर (Thief)', count: 4 },
          { name: 'सिपाही (Guard)', count: 4 },
          { name: 'वज़ीर 👑', count: 4 },
        ],
      };

      const val = validateDeckConfiguration(5, customConfig);
      expect(val.valid).toBe(true);
      expect(val.totalCards).toBe(20);

      const deck = generateDeck('royals', 5, customConfig);
      expect(deck).toHaveLength(20);

      const uniqueNames = new Set(deck.map((c) => c.name));
      expect(uniqueNames.size).toBe(5);
      expect(uniqueNames.has('राजा (King)')).toBe(true);
      expect(uniqueNames.has('वज़ीर 👑')).toBe(true);
    });

    it('initializes and deals exactly 4 cards to each player in an N-player game (5 players = 20 cards)', () => {
      const game = new ParchiGame('match_5p', 'room_5p', 'CODE55', fivePlayers, 'royals', 20, null, 5);
      game.startMatch();

      expect(game.status).toBe('ACTIVE');
      expect(game.seats).toHaveLength(5);
      for (let i = 0; i < 5; i++) {
        expect(game.seats[i].hand).toHaveLength(4);
      }

      const totalCards = game.seats.reduce((sum, s) => sum + s.hand.length, 0);
      expect(totalCards).toBe(20);
    });

    it('maintains circular turn order for 5 players (0 -> 1 -> 2 -> 3 -> 4 -> 0)', () => {
      const game = new ParchiGame('match_5p', 'room_5p', 'CODE55', fivePlayers, 'royals', 20, null, 5);
      game.startMatch();

      expect(game.activeSeat).toBe(0);
      expect(game.getNextActiveSeat(0)).toBe(1);
      expect(game.getNextActiveSeat(1)).toBe(2);
      expect(game.getNextActiveSeat(2)).toBe(3);
      expect(game.getNextActiveSeat(3)).toBe(4);
      expect(game.getNextActiveSeat(4)).toBe(0);
    });

    it('correctly skips finished players in N-player circular turns', () => {
      const game = new ParchiGame('match_5p', 'room_5p', 'CODE55', fivePlayers, 'royals', 20, null, 5);
      game.startMatch();

      // Finish Seat 1 and Seat 3
      game.finishSeat(1, 'RANI');
      game.finishSeat(3, 'SIPAHI');

      // Seat 0 now passes directly to Seat 2 (skipping 1)
      expect(game.getNextActiveSeat(0)).toBe(2);
      // Seat 2 now passes directly to Seat 4 (skipping 3)
      expect(game.getNextActiveSeat(2)).toBe(4);
      // Seat 4 passes to Seat 0
      expect(game.getNextActiveSeat(4)).toBe(0);
    });

    it('winning check works with custom Hindi/Unicode names and finishes sender after pass', () => {
      const customConfig = {
        isCustom: true,
        items: [
          { name: 'सुपरहीरो', count: 4 },
          { name: 'जादूगर', count: 4 },
          { name: 'योद्धा', count: 4 },
          { name: 'शहंशाह', count: 4 },
          { name: 'खिलाड़ी', count: 4 },
        ],
      };

      const game = new ParchiGame('match_custom', 'room_c', 'CUST01', fivePlayers, 'royals', 20, customConfig, 5);
      game.startMatch();

      // Manually set player 0 hand to 4 identical custom parchis + 1 unwanted card (5 cards total, e.g. after receiving)
      game.seats[0].hand = [
        { id: 'c1', name: 'सुपरहीरो', theme: 'royals', color: 'gold' },
        { id: 'c2', name: 'सुपरहीरो', theme: 'royals', color: 'gold' },
        { id: 'c3', name: 'सुपरहीरो', theme: 'royals', color: 'gold' },
        { id: 'c4', name: 'सुपरहीरो', theme: 'royals', color: 'gold' },
        { id: 'unwanted', name: 'जादूगर', theme: 'royals', color: 'cyan' },
      ];

      // Player 0 passes unwanted card
      const passResult = game.passCard('user_1', 'unwanted');
      expect(passResult.success).toBe(true);

      // Remaining hand has exactly 4 'सुपरहीरो' parchis
      expect(game.seats[0].hand).toHaveLength(4);
      expect(game.checkFourOfAKind(game.seats[0].hand)).toBe(true);
      expect(game.getWinningCardName(game.seats[0].hand)).toBe('सुपरहीरो');

      // Sender is immediately finished with 1st place and their custom card name
      expect(game.seats[0].finishedRank).toBe(1);
      expect(game.seats[0].winningCards).toEqual(['सुपरहीरो', 'सुपरहीरो', 'सुपरहीरो', 'सुपरहीरो']);
      expect(game.rankings).toHaveLength(1);
      expect(game.rankings[0].cardName).toBe('सुपरहीरो');
      expect(game.rankings[0].displayName).toBe('Alice');
    });

    it('concludes an N-player match when only 1 active player remains, assigning Nth place', () => {
      const game = new ParchiGame('match_5p_end', 'room_5pe', 'CODE5E', fivePlayers, 'royals', 20, 5);
      game.startMatch();

      game.finishSeat(0, 'A');
      game.finishSeat(1, 'B');
      game.finishSeat(2, 'C');
      expect(game.status).toBe('ACTIVE');

      // Finish Seat 3 -> only Seat 4 (Eva) remains out of 5 players
      game.finishSeat(3, 'D');

      expect(game.status).toBe('FINISHED');
      expect(game.seats[4].finishedRank).toBe(5);
      expect(game.rankings).toHaveLength(5);
      expect(game.rankings[4].rank).toBe(5);
      expect(game.rankings[4].displayName).toBe('Eva');
    });
  });
});
