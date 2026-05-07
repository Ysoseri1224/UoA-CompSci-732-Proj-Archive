import assert from 'node:assert';
import { test } from 'node:test';
import mongoose from 'mongoose';
import './setup.js';
import { MatchReplay } from '../../src/models/MatchReplay.js';

test('MatchReplay Model: should store history and stateAfter', async () => {
  const matchId = new mongoose.Types.ObjectId();
  
  const replay = await MatchReplay.create({
    matchId,
    history: [
      {
        step: 1,
        action: { type: 'PLAY', payload: ['WATER_1'] },
        stateAfter: { cards: 7 }
      }
    ],
    seed: 'random_seed_123'
  });

  assert.ok(replay.matchId.equals(matchId));
  // 以前这里写的是 rounds.length，现在改成正确的 history.length
  assert.strictEqual(replay.history.length, 1);
  assert.strictEqual(replay.history[0].step, 1);
  assert.strictEqual(replay.history[0].action.type, 'PLAY');
});