import assert from 'node:assert';
import { test } from 'node:test';
import mongoose from 'mongoose';
import './setup.js';
import { MatchReplay } from '../../src/models/MatchReplay.js';

test('MatchReplay Model: should store poker hands according to api.md', async () => {
  const matchId = new mongoose.Types.ObjectId();
  
  const replay = await MatchReplay.create({
    matchId,
    hands: [{
      handNumber: 1,
      holeCards: { 'user_123': ['As', 'Kh'], 'bot_456': ['2c', '7d'] },
      communityCards: ['Qh', 'Jd', 'Ts'],
      events: [{
        timestamp: 1200,
        type: 'bet',
        actor: 'user_123',
        data: { action: 'raise', amount: 40 }
      }],
      result: {
        winners: ['user_123'],
        pot: 80,
        handScores: { 'user_123': 28.3 },
        handRanks: { 'user_123': 'Straight' }
      }
    }],
    seed: 'random_seed_123'
  });

  assert.ok(replay.matchId.equals(matchId));
  assert.strictEqual(replay.hands.length, 1);
  assert.strictEqual(replay.hands[0].handNumber, 1);
  
  // 验证 Map 类型的读取
  assert.deepStrictEqual(Array.from(replay.hands[0].holeCards.get('user_123')), ['As', 'Kh']);
  assert.strictEqual(replay.hands[0].events[0].type, 'bet');
  assert.strictEqual(replay.hands[0].result.pot, 80);
});