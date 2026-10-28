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

  describe('Security & Zero-Leak State Filtering', () => {
    it('strictly hides secret hands in public state (Zero-Leak Security)', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      const publicState = game.getPublicState();
      for (const seat of publicState.seats) {
        // Must never expose actual card identities or array of cards
        expect((seat as any).hand).toBeUndefined();
        expect(seat.cardCount).toBe(4);
      }

      // Private state for user_1 contains user_1's cards, but NOT other users' cards
      const privateState1 = game.getPrivateStateForPlayer('user_1');
      expect(privateState1).not.toBeNull();
      expect(privateState1!.myHand).toHaveLength(4);
      expect(privateState1!.seats[1].cardCount).toBe(4);
      expect((privateState1!.seats[1] as any).hand).toBeUndefined();
      expect((privateState1!.seats[2] as any).hand).toBeUndefined();
      expect((privateState1!.seats[3] as any).hand).toBeUndefined();
    });
  });

  describe('Circular Clockwise Turn & Transfer Validation', () => {
    it('enforces circular clockwise transfer (Seat 0 -> Seat 1)', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      expect(game.activeSeat).toBe(0);

      const aliceCard = game.seats[0].hand[0];
      const aliceHandLengthBefore = game.seats[0].hand.length;
      const bobHandLengthBefore = game.seats[1].hand.length;

      // Out of order: Bob cannot pass before Alice
      const bobAttempt = game.passCard('user_2', game.seats[1].hand[0].id);
      expect(bobAttempt.success).toBe(false);
      expect(bobAttempt.error).toContain('not your turn');

      // Alice cannot pass a card she does not own
      const fakeCardAttempt = game.passCard('user_1', 'fake_card_id_999');
      expect(fakeCardAttempt.success).toBe(false);
      expect(fakeCardAttempt.error).toContain('not in your hand');

      // Valid pass from Alice to Bob
      const validPass = game.passCard('user_1', aliceCard.id);
      expect(validPass.success).toBe(true);

      // Alice now has 3 cards, Bob now has 5 cards
      expect(game.seats[0].hand).toHaveLength(aliceHandLengthBefore - 1);
      expect(game.seats[1].hand).toHaveLength(bobHandLengthBefore + 1);

      // Card is now legitimately in Bob's hand
      expect(game.seats[1].hand.some((c) => c.id === aliceCard.id)).toBe(true);

      // Active seat advanced to Bob (Seat 1)
      expect(game.activeSeat).toBe(1);
    });

    it('rejects duplicate or replayed transfers in the same turn cycle', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      const aliceCard = game.seats[0].hand[0];
      game.passCard('user_1', aliceCard.id);

      // Attempting to pass again immediately as Alice must be rejected
      const secondPass = game.passCard('user_1', aliceCard.id);
      expect(secondPass.success).toBe(false);
      expect(secondPass.error).toContain('not your turn');
    });
  });

  describe('Winning Detection & Placement Rankings', () => {
    it('rejects declaration if player does NOT have 4 identical cards', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      game.seats[0].hand = [
        { id: '1', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: '2', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: '3', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: '4', name: 'CHOR', theme: 'royals', title: 'Chor', icon: 'Moon', color: '#6366f1' },
      ];

      expect(game.checkFourOfAKind(game.seats[0].hand)).toBe(false);
      const declareRes = game.declareWin(0);
      expect(declareRes.success).toBe(false);
      expect(declareRes.error).toContain('Cannot declare');
    });

    it('correctly assigns 1st, 2nd, 3rd, and 4th place in authoritative event order', () => {
      const game = new ParchiGame('match_1', 'room_1', 'CODE12', dummyPlayers, 'royals', 20);
      game.startMatch();

      // Alice (Seat 0) has 4 Raja
      game.seats[0].hand = [
        { id: '1', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: '2', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: '3', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: '4', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
      ];
      const aliceWin = game.declareWin(0);
      expect(aliceWin.success).toBe(true);
      expect(game.seats[0].finishedRank).toBe(1);

      // Bob (Seat 1) has 4 Rani
      game.seats[1].hand = [
        { id: '5', name: 'RANI', theme: 'royals', title: 'Rani', icon: 'Sparkles', color: '#ec4899' },
        { id: '6', name: 'RANI', theme: 'royals', title: 'Rani', icon: 'Sparkles', color: '#ec4899' },
        { id: '7', name: 'RANI', theme: 'royals', title: 'Rani', icon: 'Sparkles', color: '#ec4899' },
        { id: '8', name: 'RANI', theme: 'royals', title: 'Rani', icon: 'Sparkles', color: '#ec4899' },
      ];
      const bobWin = game.declareWin(1);
      expect(bobWin.success).toBe(true);
      expect(game.seats[1].finishedRank).toBe(2);

      // Charlie (Seat 2) has 4 Sipahi
      game.seats[2].hand = [
        { id: '9', name: 'SIPAHI', theme: 'royals', title: 'Sipahi', icon: 'Shield', color: '#10b981' },
        { id: '10', name: 'SIPAHI', theme: 'royals', title: 'Sipahi', icon: 'Shield', color: '#10b981' },
        { id: '11', name: 'SIPAHI', theme: 'royals', title: 'Sipahi', icon: 'Shield', color: '#10b981' },
        { id: '12', name: 'SIPAHI', theme: 'royals', title: 'Sipahi', icon: 'Shield', color: '#10b981' },
      ];
      const charlieWin = game.declareWin(2);
      expect(charlieWin.success).toBe(true);
      expect(game.seats[2].finishedRank).toBe(3);

      // David (Seat 3) is automatically assigned 4th place and match concludes
      expect(game.seats[3].finishedRank).toBe(4);
      expect(game.status).toBe('FINISHED');
      expect(game.rankings).toHaveLength(4);
      expect(game.rankings[0].displayName).toBe('Alice');
      expect(game.rankings[1].displayName).toBe('Bob');
      expect(game.rankings[2].displayName).toBe('Charlie');
      expect(game.rankings[3].displayName).toBe('David');
    });
  });
});
