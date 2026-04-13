import assert from 'node:assert/strict';
import test, {before, beforeEach, after} from 'node:test';
import Run from '../../src/models/Run.js';

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

test('Run model stores nested card data', async () => {
  try {
    // 2. 模拟创建一个带有“幻彩红蜡封倍率牌”的 K
    const testRun = new Run({
      userId: "newbie_01",
      deck: [{
        rank: "K",
        suit: "Hearts",
        enhancement: "multi", // 倍率牌
        seal: "red",          // 红蜡封
        edition: "polychrome" // 幻彩
      }]
    });

    await testRun.save();

    console.log("✅ 数据层测试：成功存入一张三维强化卡牌！");

    const found = await Run.findOne({ userId: "newbie_01" });

    assert.ok(found);
    assert.equal(found.deck.length, 1);
    assert.equal(found.deck[0].rank, 'K');
    assert.equal(found.deck[0].enhancement, 'multi');
    assert.equal(found.deck[0].seal, 'red');
    assert.equal(found.deck[0].edition, 'polychrome');
    console.log("验证读取：", found.deck[0]);

    process.exit(0);
  } catch (err) {
    console.error("❌ 错误：", err);
    process.exit(1);
  }
});

test('database is cleared between tests', async () => {
  const count = await Run.countDocuments();
  assert.equal(count, 0);
});