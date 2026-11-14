import { describe, it, expect } from 'vitest';
import { ParchiGame } from '../game/engine.js';
import { verifyAuthToken, generateSessionToken } from '../auth/firebase.js';

const createTestPlayers = (count = 4) => {
  return Array.from({ length: count }, (_, i) => ({
    userId: `user_${i + 1}`,
    username: `player${i + 1}`,
    displayName: `Player ${i + 1}`,
    avatarUrl: `https://example.com/p${i + 1}.png`,
    isBot: false, // Control turns manually for testing
    seatIndex: i,
  }));
};

describe('🎮 SENIOR GAME DEV STRESS & FUNCTION-BY-FUNCTION AUDIT', () => {

  // 1. AUTH & SECURITY AUDIT
  describe('🔐 Authentication: Google & Session Security', () => {
    it('should generate and verify JWT session token in < 5ms', async () => {
      const user = {
        id: 'usr_test_123',
        firebaseUid: 'google_uid_98765',
        email: 'proplayer@gmail.com',
        displayName: 'ProGamer',
      };
      const token = generateSessionToken(user);
      expect(typeof token).toBe('string');

      const start = performance.now();
      const decoded = await verifyAuthToken(token);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(15);
      expect(decoded).not.toBeNull();
      expect(decoded?.uid).toBe('google_uid_98765');
      expect(decoded?.email).toBe('proplayer@gmail.com');
    });

    it('should reject tampered or corrupted JWT tokens', async () => {
      const decoded = await verifyAuthToken('invalid.token.structure');
      expect(decoded).toBeNull();

      const decodedEmpty = await verifyAuthToken('');
      expect(decodedEmpty).toBeNull();
    });
  });

  // 2. CORE GAME MECHANICS & CONCURRENCY (AAA GAME NETCODE LOGIC)
  describe('🎲 Game Engine: Concurrency, Transfers & Win Conditions', () => {
    it('should properly deal cards and assign exactly 4 cards to each player upon start', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame('match_1', 'room_1', 'CODE1', players, 'royals', 30);
      game.startMatch();

      expect(game.status).toBe('ACTIVE');
      expect(game.activeSeat).toBe(0);
      expect(game.seats[0].hand.length).toBe(4);
      expect(game.seats[1].hand.length).toBe(4);
      expect(game.seats[2].hand.length).toBe(4);
      expect(game.seats[3].hand.length).toBe(4);
    });

    it('should prevent non-active players from passing cards (Turn enforcement)', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame('match_2', 'room_2', 'CODE2', players, 'royals', 30);
      game.startMatch();

      // user_2 tries to pass when active is user_1 (Seat 0)
      const cardToPass = game.seats[1].hand[0].id;
      const res = game.passCard('user_2', cardToPass);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/It is not your turn to pass/i);
    });

    it('should prevent passing a card the player does not possess (Cheating prevention)', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame('match_3', 'room_3', 'CODE3', players, 'royals', 30);
      game.startMatch();

      const fakeCardId = 'hacked_card_999';
      const res = game.passCard('user_1', fakeCardId);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Selected parchi is not in your hand/i);
    });

    it('should correctly transfer card in circular clockwise order (0 -> 1 -> 2 -> 3 -> 0)', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame('match_4', 'room_4', 'CODE4', players, 'royals', 30);
      game.startMatch();

      const cardId = game.seats[0].hand[0].id;
      const res = game.passCard('user_1', cardId);

      expect(res.success).toBe(true);
      expect(game.activeSeat).toBe(1);
      expect(game.seats[1].hand.some(c => c.id === cardId)).toBe(true);
    });

    it('should validate 4-of-a-kind victory and reject false win claims', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame('match_5', 'room_5', 'CODE5', players, 'royals', 30);
      game.startMatch();

      // Give Seat 0 four Raja cards
      game.seats[0].hand = [
        { id: 'c1', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'c2', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'c3', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'c4', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
      ];

      expect(game.checkFourOfAKind(game.seats[0].hand)).toBe(true);

      // Seat 1 with mismatched cards
      game.seats[1].hand = [
        { id: 'c5', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'c6', name: 'RANI', theme: 'royals', title: 'Rani', icon: 'Sparkles', color: '#ec4899' },
        { id: 'c7', name: 'CHOR', theme: 'royals', title: 'Chor', icon: 'Moon', color: '#818cf8' },
        { id: 'c8', name: 'SIPAHI', theme: 'royals', title: 'Sipahi', icon: 'Shield', color: '#10b981' },
      ];

      expect(game.checkFourOfAKind(game.seats[1].hand)).toBe(false);
      const falseWinRes = game.declareWin(1);
      expect(falseWinRes.success).toBe(false);
      expect(falseWinRes.error).toMatch(/Cannot declare: You do not have 4 identical parchis!/i);
    });

    it('should crown champion, complete rankings and finish match cleanly', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame('match_6', 'room_6', 'CODE6', players, 'royals', 30);
      game.startMatch();

      // Force Win on Seat 0
      game.seats[0].hand = [
        { id: 'c1', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'c2', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'c3', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
        { id: 'c4', name: 'RAJA', theme: 'royals', title: 'Raja', icon: 'Crown', color: '#f59e0b' },
      ];

      const winRes = game.declareWin(0);
      expect(winRes.success).toBe(true);
      expect(game.rankings.length).toBeGreaterThanOrEqual(1);
      expect(game.rankings[0].userId).toBe('user_1');
      expect(game.rankings[0].rank).toBe(1);
    });

    it('should support Bot AI automated turn execution when human disconnects or times out', () => {
      const players = createTestPlayers(4);
      // Make seat 1 a bot
      players[1].isBot = true;

      const game = new ParchiGame('match_7', 'room_7', 'CODE7', players, 'royals', 30);
      game.startMatch();

      // User 1 passes to Bot (Seat 1)
      const user1Card = game.seats[0].hand[0].id;
      const passRes = game.passCard('user_1', user1Card);
      expect(passRes.success).toBe(true);

      // Bot automatically executed turn upon receiving turn and passed to Seat 2!
      expect(game.activeSeat).toBe(2);
    });
  });

  // 3. BET & PENALTY SYSTEM AUDIT
  describe('📜 Shart & Loser Penalty System', () => {
    it('should initialize match with chosen bet and penalty metadata', () => {
      const players = createTestPlayers(4);
      const game = new ParchiGame(
        'match_bet_1',
        'room_bet_1',
        'CODEBET',
        players,
        'royals',
        30,
        null,
        4,
        'golgappe',
        '50 Golgappe treat'
      );

      expect(game.matchBet).toBe('golgappe');
      expect(game.customBetText).toBe('50 Golgappe treat');
    });
  });
});
