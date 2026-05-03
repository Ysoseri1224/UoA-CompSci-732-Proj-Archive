import { describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

// 1. 必须在导入任何业务代码前设置环境，防止 index.js 执行多余逻辑
process.env.NODE_ENV = 'test';

// 2. 导入 redisClient 并立即 Mock，防止其尝试连接物理 Redis
import { redisClient } from '../../src/redis.js';
mock.method(redisClient, 'connect', async () => {});
mock.method(redisClient, 'on', () => {});
mock.method(redisClient, 'set', async () => 'OK');
mock.method(redisClient, 'get', async () => null);
mock.method(redisClient, 'del', async () => 1);
mock.method(redisClient, 'isOpen', () => true, { getter: true });

// 3. 现在可以安全地导入 app 和数据库配置了
import { app } from '../../src/index.js'; 
import { User } from '../../src/models/User.js';
import { connectTestDB, clearDatabase, disconnectTestDB } from '../db/setup.js';

describe('GET /api/leaderboard Integration Tests (Native Fetch)', () => {
  let server;
  let baseUrl;

  before(async () => {
    await connectTestDB();
    
    // 启动临时服务器获取动态端口
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    // 确保数据库断开连接
    await disconnectTestDB();
    // 确保服务器关闭并释放句柄
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(async () => {
    await clearDatabase();
    // 确保数据符合最新的 User Schema (移除了 name)
    await User.insertMany([
      { username: 'rookie', email: '1@t.com', passwordHash: 'h', stats: { totalGames: 5, totalWins: 5 } }, 
      { username: 'player_A', email: '2@t.com', passwordHash: 'h', stats: { totalGames: 20, totalWins: 10 } },
      { username: 'player_B', email: '3@t.com', passwordHash: 'h', stats: { totalGames: 50, totalWins: 40 } }
    ]);
  });

  // 使用原生 fetch
  async function fetchLeaderboard(queryString = '') {
    const res = await fetch(`${baseUrl}/leaderboard${queryString}`);
    const body = await res.json();
    return { status: res.status, body };
  }

  it('1. Default behavior (winRate desc)', async () => {
    const { status, body } = await fetchLeaderboard();
    assert.strictEqual(status, 200);
    // rookie (5场) 会被逻辑过滤，剩 2 人
    assert.strictEqual(body.data.total, 2); 
    assert.strictEqual(body.data.rankings[0].username, 'player_B'); 
  });

  it('2. Invalid sort returns 400', async () => {
    const { status } = await fetchLeaderboard('?sort=error');
    assert.strictEqual(status, 400);
  });
});