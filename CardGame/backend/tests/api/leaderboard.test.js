import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';

// 导入 app 实例和模型
import { app } from '../../src/index.js'; 
import { User } from '../../src/models/User.js';
import { connectTestDB, clearDatabase, disconnectTestDB } from '../db/setup.js';

describe('GET /api/leaderboard Integration Tests (Native Fetch)', () => {
  let server;
  let baseUrl;

  before(async () => {
    process.env.NODE_ENV = 'test'; 
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
    await disconnectTestDB();
    if (server) server.close();
  });

  beforeEach(async () => {
    await clearDatabase();
    await User.insertMany([
      { username: 'rookie', email: '1@t.com', passwordHash: 'h', stats: { totalGames: 5, totalWins: 5 } }, 
      { username: 'player_A', email: '2@t.com', passwordHash: 'h', stats: { totalGames: 20, totalWins: 10 } },
      { username: 'player_B', email: '3@t.com', passwordHash: 'h', stats: { totalGames: 50, totalWins: 40 } }
    ]);
  });

  // 辅助函数
  async function fetchLeaderboard(queryString = '') {
    const res = await fetch(`${baseUrl}/leaderboard${queryString}`);
    const body = await res.json();
    return { status: res.status, body };
  }

  it('1. Default behavior (winRate desc)', async () => {
    const { status, body } = await fetchLeaderboard();
    assert.strictEqual(status, 200);
    assert.strictEqual(body.data.total, 2); // rookie 被过滤掉
    assert.strictEqual(body.data.rankings[0].username, 'player_B'); // 0.8 > 0.5
  });

  it('2. Invalid sort returns 400', async () => {
    const { status } = await fetchLeaderboard('?sort=error');
    assert.strictEqual(status, 400);
  });
});