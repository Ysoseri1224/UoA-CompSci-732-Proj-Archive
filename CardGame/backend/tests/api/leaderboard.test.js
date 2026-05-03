import { describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

// 1. 设置环境，防止 index.js 执行生产环境逻辑
process.env.NODE_ENV = 'test';

// 2. 彻底 Mock Redis 客户端，杜绝一切网络尝试
import { redisClient } from '../../src/redis.js';
mock.method(redisClient, 'connect', async () => {});
mock.method(redisClient, 'on', () => {});
mock.method(redisClient, 'set', async () => 'OK');
mock.method(redisClient, 'get', async () => null);
mock.method(redisClient, 'del', async () => 1);
// 必须使用函数作为 getter 以符合 Node 22/24 语法
mock.method(redisClient, 'isOpen', () => true, { getter: true });

// 3. 导入核心应用和模型
import { app } from '../../src/index.js'; 
import { User } from '../../src/models/User.js';
import { connectTestDB, clearDatabase, disconnectTestDB } from '../db/setup.js';

describe('GET /api/leaderboard Integration Tests (Native Fetch)', () => {
  let server;
  let baseUrl;

  before(async () => {
    // connectTestDB 内部已经处理了 mongoose 连接
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
    // 断开数据库并关闭服务器
    await disconnectTestDB();
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  beforeEach(async () => {
    await clearDatabase();
    // 插入测试数据
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
    // 验证排行榜过滤逻辑（假设 5 场以下不入榜）
    assert.strictEqual(body.data.total, 2); 
    assert.strictEqual(body.data.rankings[0].username, 'player_B'); 
  });

  it('2. Invalid sort returns 400', async () => {
    // 验证错误处理
    const { status } = await fetchLeaderboard('?sort=error');
    assert.strictEqual(status, 400);
  });
});