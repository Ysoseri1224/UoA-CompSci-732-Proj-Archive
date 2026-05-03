import { describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

// 1. 强制在一切业务模块加载前，设置环境变量！
process.env.NODE_ENV = 'test';

// 2. 使用“顶层 await 动态导入”，打破 ESM 的 Hoisting (提升) 陷阱
const { redisClient } = await import('../../src/redis.js');

// 3. 趁 index.js 还没加载，立即把 Redis 封印住
mock.method(redisClient, 'connect', async () => {});
mock.method(redisClient, 'on', () => {});
mock.method(redisClient, 'set', async () => 'OK');
mock.method(redisClient, 'get', async () => null);
mock.method(redisClient, 'del', async () => 1);
mock.method(redisClient, 'isOpen', () => true, { getter: true });

// 4. Redis 被彻底截胡后，再安全地导入 index.js 核心
const { app } = await import('../../src/index.js'); 
const { User } = await import('../../src/models/User.js');
const { connectTestDB, clearDatabase, disconnectTestDB } = await import('../db/setup.js');

describe('GET /api/leaderboard Integration Tests (Native Fetch)', () => {
  let server;
  let baseUrl;

  before(async () => {
    await connectTestDB();
    
    // 启动临时测试服务器获取动态端口
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    // 确保释放资源
    await disconnectTestDB();
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  beforeEach(async () => {
    await clearDatabase();
    await User.insertMany([
      { username: 'rookie', email: '1@t.com', passwordHash: 'h', stats: { totalGames: 5, totalWins: 5 } }, 
      { username: 'player_A', email: '2@t.com', passwordHash: 'h', stats: { totalGames: 20, totalWins: 10 } },
      { username: 'player_B', email: '3@t.com', passwordHash: 'h', stats: { totalGames: 50, totalWins: 40 } }
    ]);
  });

  async function fetchLeaderboard(queryString = '') {
    const res = await fetch(`${baseUrl}/leaderboard${queryString}`);
    const body = await res.json();
    return { status: res.status, body };
  }

  it('1. Default behavior (winRate desc)', async () => {
    const { status, body } = await fetchLeaderboard();
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data.total, 2); 
    assert.strictEqual(body.data.rankings[0].username, 'player_B'); 
  });

  it('2. Invalid sort returns 400', async () => {
    const { status } = await fetchLeaderboard('?sort=error');
    assert.strictEqual(status, 400);
  });
});