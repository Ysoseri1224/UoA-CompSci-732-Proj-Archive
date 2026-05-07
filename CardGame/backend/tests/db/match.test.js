import assert from 'node:assert';
import { test } from 'node:test';
import './setup.js';
import { Match } from '../../src/models/Match.js';
import { User } from '../../src/models/User.js';

test('Match Model: should create a match with correct fields', async () => {
  const user = await User.create({
    username: 'matchuser',
    email: 'match@example.com',
    password: 'securepassword123'
  });

  const match = await Match.create({
    matchType: 'PVP',
    // 注意：根据你的 Match.js，这里存的是 String，所以要加上 .toString()
    players: [user._id.toString()], 
    rounds: 5,
    duration: 120
  });

  assert.strictEqual(match.matchType, 'PVP');
  assert.strictEqual(match.rounds, 5);
  assert.strictEqual(match.duration, 120);
  assert.strictEqual(match.players.length, 1);
  assert.strictEqual(match.players[0], user._id.toString());
});