import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';

// 导入你的 app 实例和模型
import { app } from '../../src/index.js'; 
import { User } from '../../src/models/User.js';

// 导入数据库生命周期管理
import { connectTestDB, clearDatabase, disconnectTestDB } from '../db/setup.js';

describe('GET /api/leaderboard Integration Tests', () => {
  before(async () => {
    // 强制设置环境变量，防止 src/index.js 启动真实服务监听
    process.env.NODE_ENV = 'test'; 
    await connectTestDB();
  });

  after(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    // 注入受控数据。注意：此处结构完全匹配 UserSchema，winRate 会由路由中的聚合管道自动计算
    const testUsers = [
      // 资格过滤测试：不足 10 局，应被排除（尽管其隐式胜率为 1.0）
      { username: 'rookie', email: '1@test.com', passwordHash: 'hash', stats: { totalGames: 5, totalWins: 5 } }, 
      
      // 正常用户数据
      { username: 'player_A', email: '2@test.com', passwordHash: 'hash', stats: { totalGames: 20, totalWins: 10 } }, // winRate: 0.50
      { username: 'player_B', email: '3@test.com', passwordHash: 'hash', stats: { totalGames: 50, totalWins: 40 } }, // winRate: 0.80
      { username: 'player_C', email: '4@test.com', passwordHash: 'hash', stats: { totalGames: 30, totalWins: 27 } }, // winRate: 0.90
      { username: 'player_D', email: '5@test.com', passwordHash: 'hash', stats: { totalGames: 20, totalWins: 12 } }, // winRate: 0.60
      { username: 'player_E', email: '6@test.com', passwordHash: 'hash', stats: { totalGames: 20, totalWins: 14 } }  // winRate: 0.70
    ];

    await User.insertMany(testUsers);
  });

  it('1. Default behavior: sorts by winRate (desc) and filters totalGames >= 10', async () => {
    const res = await request(app).get('/api/leaderboard');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.message, 'OK');

    const rankings = res.body.data.rankings;
    
    // 验证过滤逻辑：总共 6 条数据，rookie 不足 10 局应被排除
    assert.strictEqual(res.body.data.total, 5);
    assert.strictEqual(rankings.length, 5);
    const usernames = rankings.map(r => r.username);
    assert.ok(!usernames.includes('rookie'), 'Users with < 10 totalGames should be excluded');

    // 验证默认排序 (winRate 降序) 和 rank 计算
    // 预期顺序: C(0.90), B(0.80), E(0.70), D(0.60), A(0.50)
    assert.strictEqual(rankings[0].username, 'player_C');
    assert.strictEqual(rankings[0].rank, 1);
    assert.strictEqual(rankings[0].winRate, 0.9); // 验证聚合管道计算结果
    
    assert.strictEqual(rankings[4].username, 'player_A');
    assert.strictEqual(rankings[4].rank, 5);
    assert.strictEqual(rankings[4].totalWins, 10); // 验证管道 projection 正确映射了嵌套字段
  });

  it('2. Sorting: sort=totalWins should explicitly sort by total wins', async () => {
    const res = await request(app).get('/api/leaderboard?sort=totalWins');

    assert.strictEqual(res.status, 200);
    const rankings = res.body.data.rankings;

    // 预期顺序 (按总胜场降序): B(40), C(27), E(14), D(12), A(10)
    assert.strictEqual(rankings[0].username, 'player_B');
    assert.strictEqual(rankings[1].username, 'player_C');
    assert.strictEqual(rankings[4].username, 'player_A');
  });

  it('3. Sorting: handles case-insensitive sort inputs', async () => {
    const res1 = await request(app).get('/api/leaderboard?sort=TOTALWINS');
    const res2 = await request(app).get('/api/leaderboard?sort=winrate');

    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.data.rankings[0].username, 'player_B');

    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.data.rankings[0].username, 'player_C');
  });

  it('4. Pagination: accurately paginates and global rank persists across pages', async () => {
    // 默认排序: C(1), B(2), E(3), D(4), A(5)
    // 请求第 2 页，每页 2 条数据，预期返回 E 和 D
    const res = await request(app).get('/api/leaderboard?sort=winRate&page=2&limit=2');

    assert.strictEqual(res.status, 200);
    const rankings = res.body.data.rankings;

    assert.strictEqual(rankings.length, 2);
    assert.strictEqual(res.body.data.page, 2);

    // 重点验证：排名（rank）必须反映其在全球榜单的真实位置
    assert.strictEqual(rankings[0].username, 'player_E');
    assert.strictEqual(rankings[0].rank, 3);
    
    assert.strictEqual(rankings[1].username, 'player_D');
    assert.strictEqual(rankings[1].rank, 4);
  });

  it('5. Validation: invalid sort parameter returns 400 Bad Request', async () => {
    const res = await request(app).get('/api/leaderboard?sort=invalid_sort_type');
    
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'Invalid sort parameter');
  });
});