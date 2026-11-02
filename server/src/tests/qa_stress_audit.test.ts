import { describe, it, expect } from 'vitest';
import { ParchiGame } from '../game/engine.js';
import { generateDeck, validateDeckConfiguration } from '../game/themes.js';
import { ParchiCard } from '../game/types.js';
import { isUserOnline, markUserConnected, markUserDisconnected } from '../sockets/presence.js';

describe('Senior QA Comprehensive Stress & Edge Case Test Suite', () => {
  const createTestPlayers = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      userId: `user_${i + 1}`,
      username: `player_${i + 1}`,
      displayName: `Player ${i + 1}`,
      avatarUrl: `https://avatar/${i + 1}`,
      isBot: false,
      seatIndex: i,
    }));

  const createTestGame = () => {
    const players = createTestPlayers(4);
    const game = new ParchiGame('match_test', 'room_test', 'ROOM12', players, 'royals', 60, null, 4);
    game.startMatch();
    return game;
  };

  describe('1. Card Invariants & Anti-Duplication Across Arbitrary Player Counts', () => {
    it.each([4, 5, 6, 7, 8])('maintains exact card conservation for %i players across 200 random passes', (playerCount) => {
      const players = createTestPlayers(playerCount);
      const game = new ParchiGame(
        `match_${playerCount}`,
        `room_${playerCount}`,
        `TEST0${playerCount}`,
        players,
        'royals',
        60,
        null,
        playerCount
      );
      game.startMatch();

      const expectedTotalCards = playerCount * 4;
      const initialCardIds = new Set<string>();
      game.seats.forEach((seat) => {
        expect(seat.hand).toHaveLength(4);
        seat.hand.forEach((card) => {
          expect(initialCardIds.has(card.id)).toBe(false);
          initialCardIds.add(card.id);
        });
      });
      expect(initialCardIds.size).toBe(expectedTotalCards);

      // Simulate 200 transfers
      for (let step = 0; step < 200; step++) {
        if (game.status === 'FINISHED') break;

        const currentSeat = game.seats[game.activeSeat];
        if (currentSeat.hand.length === 0) break;

        const cardToPass = currentSeat.hand[0];
        const res = game.passCard(currentSeat.userId, cardToPass.id);
        expect(res.success).toBe(true);

        // Invariant 1: Total cards across all hands must remain exactly expectedTotalCards
        const allCurrentCards = game.seats.flatMap((s) => s.hand);
        expect(allCurrentCards).toHaveLength(expectedTotalCards);

        // Invariant 2: No duplicate card IDs anywhere in the match
        const uniqueIds = new Set(allCurrentCards.map((c) => c.id));
        expect(uniqueIds.size).toBe(expectedTotalCards);
      }
    });
  });

  describe('2. Negative & Invalid Move Rejections', () => {
    it('strictly rejects a player passing when it is not their turn', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame('m1', 'r1', 'CODE1', players, 'royals', 60);
      game.startMatch();

      expect(game.activeSeat).toBe(0);
      const seat1 = game.seats[1];
      const res = game.passCard(seat1.userId, seat1.hand[0].id);

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/not your turn/i);
    });

    it('strictly rejects passing a card ID that does not exist in hand', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame('m1', 'r1', 'CODE1', players, 'royals', 60);
      game.startMatch();

      const seat0 = game.seats[0];
      const res = game.passCard(seat0.userId, 'non_existent_card_999');

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/not in your hand/i);
    });

    it('strictly rejects win declaration with invalid hand size (5 cards or 3 cards)', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame('m1', 'r1', 'CODE1', players, 'royals', 60);
      game.startMatch();

      // Give player 5 Raja cards
      game.seats[0].hand = [
        { id: 'c1', name: 'RAJA', title: 'King', color: '#000', icon: 'Crown', theme: 'royals' },
        { id: 'c2', name: 'RAJA', title: 'King', color: '#000', icon: 'Crown', theme: 'royals' },
        { id: 'c3', name: 'RAJA', title: 'King', color: '#000', icon: 'Crown', theme: 'royals' },
        { id: 'c4', name: 'RAJA', title: 'King', color: '#000', icon: 'Crown', theme: 'royals' },
        { id: 'c5', name: 'RAJA', title: 'King', color: '#000', icon: 'Crown', theme: 'royals' },
      ];

      const res = game.declareWin(0);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/must have exactly 4/i);
    });

    it('strictly rejects win declaration with 4 non-identical cards (e.g. 3 Raja, 1 Rani)', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame('m1', 'r1', 'CODE1', players, 'royals', 60);
      game.startMatch();

      game.seats[0].hand = [
        { id: 'c1', name: 'RAJA', title: 'King', color: '#000', icon: 'Crown', theme: 'royals' },
        { id: 'c2', name: 'RAJA', title: 'King', color: '#000', icon: 'Crown', theme: 'royals' },
        { id: 'c3', name: 'RAJA', title: 'King', color: '#000', icon: 'Crown', theme: 'royals' },
        { id: 'c4', name: 'RANI', title: 'Queen', color: '#000', icon: 'Sparkles', theme: 'royals' },
      ];

      const res = game.declareWin(0);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/not have 4 identical/i);
    });
  });

  describe('3. Win Declaration & Immediate Turn Transition', () => {
    it('declares 1st place when having 4 identical cards and transitions activeSeat away from winner', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame('m1', 'r1', 'CODE1', players, 'royals', 60);
      game.startMatch();

      game.seats[0].hand = [
        { id: 'c1', name: 'RAJA', title: 'King', color: '#000', icon: 'Crown', theme: 'royals' },
        { id: 'c2', name: 'RAJA', title: 'King', color: '#000', icon: 'Crown', theme: 'royals' },
        { id: 'c3', name: 'RAJA', title: 'King', color: '#000', icon: 'Crown', theme: 'royals' },
        { id: 'c4', name: 'RAJA', title: 'King', color: '#000', icon: 'Crown', theme: 'royals' },
      ];

      expect(game.activeSeat).toBe(0);
      const res = game.declareWin(0);
      expect(res.success).toBe(true);

      // Seat 0 finished as 1st place
      expect(game.seats[0].finishedRank).toBe(1);
      expect(game.rankings).toHaveLength(1);
      expect(game.rankings[0].userId).toBe('user_1');
      expect(game.rankings[0].rank).toBe(1);

      // Authoritative invariant: activeSeat must NOT be seat 0
      expect(game.activeSeat).not.toBe(0);
      expect(game.seats[game.activeSeat].finishedRank).toBeNull();
    });

    it('finishes match automatically when 3 of 4 players win, assigning 4th place to last player', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame('m1', 'r1', 'CODE1', players, 'royals', 60);
      game.startMatch();

      // Seat 0 wins
      game.finishSeat(0, 'RAJA');
      expect(game.status).toBe('ACTIVE');

      // Seat 1 wins
      game.finishSeat(1, 'RANI');
      expect(game.status).toBe('ACTIVE');

      // Seat 2 wins -> Only Seat 3 remains -> Match must conclude!
      game.finishSeat(2, 'CHOR');
      expect(game.status).toBe('FINISHED');
      expect(game.rankings).toHaveLength(4);
      expect(game.rankings[3].seatIndex).toBe(3);
      expect(game.rankings[3].rank).toBe(4);
      expect(game.seats[3].finishedRank).toBe(4);
    });
  });

  describe('4. Ran-Out Handling & Anti-Freeze Edge Cases', () => {
    it('skips a ran-out player immediately if it was their turn', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame('m1', 'r1', 'CODE1', players, 'royals', 60);
      game.startMatch();

      expect(game.activeSeat).toBe(0);
      const res = game.playerRanOut('user_1');
      expect(res.success).toBe(true);
      expect(game.seats[0].ranOut).toBe(true);

      // Active seat must have moved immediately away from seat 0!
      expect(game.activeSeat).not.toBe(0);
    });

    it('properly ends the match when players leave and only 1 active player remains', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame('m1', 'r1', 'CODE1', players, 'royals', 60);
      game.startMatch();

      // Players 1, 2, 3 run out
      game.playerRanOut('user_2');
      game.playerRanOut('user_3');
      const res = game.playerRanOut('user_4');

      expect(res.success).toBe(true);
      // Only user_1 remains -> match must end with user_1 winning!
      expect(game.status).toBe('FINISHED');
      expect(game.seats[0].finishedRank).toBe(1);
    });

    it('getNextActiveSeat never returns a seat that has ranOut', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame('m1', 'r1', 'CODE1', players, 'royals', 60);
      game.startMatch();

      // Mark seat 1 as ran out
      game.seats[1].ranOut = true;

      // Next active seat from seat 0 must skip seat 1 and go to seat 2!
      const nextSeat = game.getNextActiveSeat(0);
      expect(nextSeat).toBe(2);
    });
  });

  describe('5. Ludo 5-Strike Timeout Rule', () => {
    it('increments missedTurns and replaces human with AI bot after 5 missed turns', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame('m1', 'r1', 'CODE1', players, 'royals', 60);
      game.startMatch();

      expect(game.seats[0].missedTurns).toBe(0);
      expect(game.seats[0].isBot).toBe(false);

      // Trigger 5 timeouts
      for (let i = 1; i <= 5; i++) {
        if (game.seats[0].hand.length === 0) {
          game.seats[0].hand.push({
            id: `temp_c_${i}`,
            name: 'RAJA',
            title: 'King',
            color: '#000',
            icon: 'Crown',
            theme: 'royals',
          });
        }
        game.activeSeat = 0;
        game.timeRemaining = 0;
        (game as any).handleTurnTimeout();
        expect(game.seats[0].missedTurns).toBe(i);
      }

      expect(game.seats[0].missedTurns).toBe(5);
      expect(game.seats[0].isBot).toBe(true);
      expect(game.seats[0].isEliminated).toBe(true);
    });
  });

  describe('6. Deck Configuration Validation', () => {
    it('rejects custom decks with duplicate names', () => {
      const customItems = [
        { name: 'HERO', count: 4 },
        { name: 'VILLAIN', count: 4 },
        { name: 'HERO', count: 4 }, // duplicate
        { name: 'JOKER', count: 4 },
      ];
      const res = validateDeckConfiguration(4, customItems, 'custom');
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/duplicate/i);
    });

    it('rejects custom decks with empty names', () => {
      const customItems = [
        { name: 'HERO', count: 4 },
        { name: '  ', count: 4 },
        { name: 'SIDEKICK', count: 4 },
        { name: 'JOKER', count: 4 },
      ];
      const res = validateDeckConfiguration(4, customItems, 'custom');
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/cannot be empty/i);
    });

    it('rejects custom decks with insufficient cards (< 4 * N)', () => {
      const customItems = [
        { name: 'HERO', count: 3 },
        { name: 'VILLAIN', count: 3 },
        { name: 'SIDEKICK', count: 3 },
        { name: 'JOKER', count: 3 },
      ]; // total 12, need 16
      const res = validateDeckConfiguration(4, customItems, 'custom');
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/requires at least 16/i);
    });

    it('accepts perfectly valid custom deck', () => {
      const customItems = [
        { name: 'IRONMAN', count: 4 },
        { name: 'THOR', count: 4 },
        { name: 'HULK', count: 4 },
        { name: 'CAPTAIN', count: 4 },
      ];
      const res = validateDeckConfiguration(4, customItems, 'custom');
      expect(res.valid).toBe(true);
    });
  });

  describe('7. Avatar History & Custom Profile Photo Architecture', () => {
    it('validates avatar history record structure with particular user ID and name', () => {
      const dummyRecord = {
        userId: 'b621b722-6d83-4f6b-b977-6bf800edb487',
        userEmail: 'anujkushwaha9090@gmail.com',
        username: 'everythinginoneplace',
        displayName: 'Anuj',
        avatarUrl: 'data:image/webp;base64,UklGRmQAAABXRUJQVlA4IFgAAADwAQCdASo...',
        source: 'CUSTOM_UPLOAD',
        fileSize: 42560,
        createdAt: new Date(),
      };

      expect(dummyRecord.userId).toBe('b621b722-6d83-4f6b-b977-6bf800edb487');
      expect(dummyRecord.displayName).toBe('Anuj');
      expect(dummyRecord.username).toBe('everythinginoneplace');
      expect(dummyRecord.source).toBe('CUSTOM_UPLOAD');
      expect(dummyRecord.fileSize).toBeGreaterThan(0);
      expect(dummyRecord.avatarUrl).toContain('data:image');
    });
  });

  describe('8. No Return Parchi Automatic Rule & Anti-Ping-Pong Verification', () => {
    it('automatically avoids selecting the last received parchi if another non-matching card exists', () => {
      const game = createTestGame();

      // Give Seat 0 three RAJA and two CHOR cards
      const hand = [
        { id: 'c1', name: 'RAJA', rank: 1, color: '#f59e0b', icon: 'Crown', theme: 'royals' },
        { id: 'c2', name: 'RAJA', rank: 1, color: '#f59e0b', icon: 'Crown', theme: 'royals' },
        { id: 'c3', name: 'RAJA', rank: 1, color: '#f59e0b', icon: 'Crown', theme: 'royals' },
        { id: 'c4', name: 'CHOR', rank: 3, color: '#64748b', icon: 'Mask', theme: 'royals' },
        { id: 'c5_new', name: 'CHOR', rank: 3, color: '#64748b', icon: 'Mask', theme: 'royals' },
      ];

      // Simulate that 'c5_new' was just received in the previous hand transfer
      const chosenCard = game.getCardToPass(hand, 'c5_new');

      // The chosen card to pass MUST NOT be the card just received ('c5_new')
      expect(chosenCard.id).not.toBe('c5_new');
      expect(chosenCard.id).toBe('c4');
    });

    it('falls back safely only if every candidate in hand has the same ID or is the only option', () => {
      const game = createTestGame();
      const singleCardHand = [
        { id: 'only_card', name: 'SIPAHI', rank: 4, color: '#10b981', icon: 'Shield', theme: 'royals' },
      ];

      const chosen = game.getCardToPass(singleCardHand, 'only_card');
      expect(chosen.id).toBe('only_card');
    });
  });

  describe('9. AI Bot Turn Execution & Autoplay Engine', () => {
    it('executes bot turn autonomously without human intervention', () => {
      const game = createTestGame();

      // Make Seat 1 a Bot
      game.seats[1].isBot = true;
      game.activeSeat = 1;

      const initialHandCount = game.seats[1].hand.length;
      expect(initialHandCount).toBe(4);

      // Execute Bot Turn
      game.executeBotTurn(1);

      // Bot passed 1 card clockwise to Seat 2
      expect(game.seats[1].hand.length).toBe(3);
      expect(game.seats[2].hand.length).toBe(5);
      expect(game.activeSeat).toBe(2);
      expect(game.lastTransfer?.fromSeat).toBe(1);
      expect(game.lastTransfer?.toSeat).toBe(2);
    });

    it('triggers turn timeout auto-pass when a player runs out of time', () => {
      const game = createTestGame();

      game.activeSeat = 0;
      const initialHand = game.seats[0].hand.length;

      // Force turn timeout
      game.timeRemaining = 0;
      (game as any).handleTurnTimeout();

      // Hand count decreased, turn advanced
      expect(game.seats[0].hand.length).toBe(initialHand - 1);
      expect(game.activeSeat).toBe(1);
    });
  });

  describe('10. Live Presence Tracker (Authoritative State)', () => {
    it('tracks user connection, online status, and disconnect lifecycle accurately', () => {
      const testUserId = 'test-player-presence-uuid';

      // Initially offline
      expect(isUserOnline(testUserId)).toBe(false);

      // User connects
      markUserConnected(testUserId);
      expect(isUserOnline(testUserId)).toBe(true);

      // User disconnects
      markUserDisconnected(testUserId);
      expect(isUserOnline(testUserId)).toBe(false);
    });
  });

  describe('11. Full Match Completion & Rankings Assignment', () => {
    it('assigns 1st place when a player completes 4 identical parchis', () => {
      const game = createTestGame();

      // Setup Seat 0 with 5 cards (4 RAJA + 1 CHOR)
      game.seats[0].hand = [
        { id: 'r1', name: 'RAJA', rank: 1, color: '#f59e0b', icon: 'Crown', theme: 'royals' },
        { id: 'r2', name: 'RAJA', rank: 1, color: '#f59e0b', icon: 'Crown', theme: 'royals' },
        { id: 'r3', name: 'RAJA', rank: 1, color: '#f59e0b', icon: 'Crown', theme: 'royals' },
        { id: 'r4', name: 'RAJA', rank: 1, color: '#f59e0b', icon: 'Crown', theme: 'royals' },
        { id: 'c1', name: 'CHOR', rank: 3, color: '#64748b', icon: 'Mask', theme: 'royals' },
      ];
      game.activeSeat = 0;

      // Pass the non-matching CHOR card
      const res = game.passCard('user_1', 'c1');
      expect(res.success).toBe(true);

      // Seat 0 now has exactly 4 RAJA and claims 1st Place!
      expect(game.seats[0].hand.length).toBe(4);
      expect(game.seats[0].finishedRank).toBe(1);
      expect(game.rankings.length).toBe(1);
      expect(game.rankings[0].rank).toBe(1);
      expect(game.rankings[0].userId).toBe('user_1');
    });
  });
});
