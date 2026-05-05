import assert from 'node:assert/strict';
import test, {before, beforeEach, after} from 'node:test';
import { Match } from '../../src/models/Match.js';
import mongoose from 'mongoose';

import {connectTestDB, clearDatabase, disconnectTestDB} from './setup.js';

before(async () => {
  await connectTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});

after(async () => {
  await disconnectTestDB();
});

test('Match model stores PvE match record', async () => {
  const playerId = new mongoose.Types.ObjectId();

  const match = new Match({
    winnerId: playerId.toString(),
    loserId: 'bot',
    playerUserId: playerId,
    duration: 180,
    handsPlayed: 12,
    playerSkillsUsed: { 'Clue Sniffing': 3, 'Double Protocol': 1 },
    botSkillsUsed: { 'Shield Counter': 2 },
    finalChips: { player: 2000, bot: 0 },
  });

  await match.save();

  console.log('✅ 数据层测试：成功存入一场 PvE 对局记录！');

  const found = await Match.findOne({ playerUserId: playerId });

  assert.ok(found);
  assert.equal(found.winnerId, playerId.toString());
  assert.equal(found.loserId, 'bot');
  assert.equal(found.duration, 180);
  assert.equal(found.handsPlayed, 12);
  assert.equal(found.playerSkillsUsed.get('Clue Sniffing'), 3);
  assert.equal(found.botSkillsUsed.get('Shield Counter'), 2);
  assert.equal(found.finalChips.player, 2000);
  assert.equal(found.finalChips.bot, 0);

  console.log('验证读取：', {
    winnerId: found.winnerId,
    loserId: found.loserId,
    handsPlayed: found.handsPlayed,
    finalChips: found.finalChips,
  });
});

test('database is cleared between tests', async () => {
  const count = await Match.countDocuments();
  assert.equal(count, 0);
});