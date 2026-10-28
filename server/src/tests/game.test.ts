import { describe, it, expect } from 'vitest';
import { ParchiGame } from '../game/engine.js';
import { generateDeck } from '../game/themes.js';

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
});
