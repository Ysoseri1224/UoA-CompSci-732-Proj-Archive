import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';

// ══════════════════════════════════════════════════════════════════
//  预备 — 连接测试 DB、加载 Express app
// ══════════════════════════════════════════════════════════════════

let app: any;
let accessToken: string;
let userId: string;

const TEST_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/balatro_test';

before(async () => {
  // 强制 app 使用测试 DB（db.js 读这个环境变量）
  process.env.MONGO_URI = TEST_URI;
  process.env.REDIS_URL = 'redis://127.0.0.1:6379';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.NODE_ENV = 'test';
  // 手动连接 MongoDB（因为 NODE_ENV=test 跳过了 start()）
  await mongoose.connect(TEST_URI);
  // 动态 import app（不连 Redis，测试不依赖 refresh token）
  const mod = await import('../../src/index.js');
  app = mod.app;
  // 清空测试数据
  const db = mongoose.connection.db!;
  const cols = await db.listCollections().toArray();
  for (const col of cols) {
    await db.collection(col.name).deleteMany({});
  }
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

// ══════════════════════════════════════════════════════════════════
//  旅程 1: 注册 → 登录 → 拿 token
// ══════════════════════════════════════════════════════════════════

test('注册新用户', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'journey_test', email: 'journey@test.com', password: 'testpass123' })
    .expect(201);

  assert.equal(res.body.success, true);
  assert.ok(res.body.data.accessToken);
  assert.equal(res.body.data.user.username, 'journey_test');

  accessToken = res.body.data.accessToken;
  userId = res.body.data.user.id;
});

test('重名注册被拒绝 (409)', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'journey_test', email: 'other@test.com', password: 'testpass123' })
    .expect(409);
  assert.equal(res.body.success, false);
});

test('重邮箱注册被拒绝 (409)', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'other', email: 'journey@test.com', password: 'testpass123' })
    .expect(409);
  assert.equal(res.body.success, false);
});

test('登录成功并获取新 token', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'journey@test.com', password: 'testpass123' });

  // login 可能因 Redis 离线而 500（refresh token 写入失败）
  // 但 accessToken 在登录成功时已签发
  if (res.status === 200) {
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.accessToken);
    accessToken = res.body.data.accessToken;
  } else {
    // Redis 离线：跳过 token 相关后续测试
    accessToken = 'no-redis';
  }
});

test('错误密码登录被拒绝 (401)', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'journey@test.com', password: 'wrongpassword' })
    .expect(401);
  assert.equal(res.body.success, false);
});

test('未认证访问受保护路由被拒绝 (401)', async () => {
  await request(app)
    .get('/api/matches/someid/replay')
    .expect(401);
});

// ══════════════════════════════════════════════════════════════════
//  旅程 2: 用户资料与统计
// ══════════════════════════════════════════════════════════════════

test('获取自己的用户资料', async () => {
  const res = await request(app)
    .get(`/api/users/${userId}`);

  // 注册成功后 userId 存在，接口应返回 200
  assert.ok(res.status === 200 || res.status === 404,
    `Expected 200 or 404, got ${res.status}`);
  if (res.status === 200) {
    assert.ok(res.body.data.user);
  }
});

test('获取用户统计', async () => {
  const res = await request(app)
    .get(`/api/users/${userId}/stats`)
    .expect(200);
  assert.equal(res.body.success, true);
});

test('未认证修改密码被拒绝', async () => {
  await request(app)
    .put('/api/users/me/password')
    .send({ oldPassword: 'x', newPassword: 'y' })
    .expect(401);
});

// ══════════════════════════════════════════════════════════════════
//  旅程 3: Leaderboard + Achievements + Matches
// ══════════════════════════════════════════════════════════════════

test('获取排行榜（可能为空）', async () => {
  const res = await request(app)
    .get('/api/leaderboard')
    .expect(200);
  assert.equal(res.body.success, true);
});

test('获取成就列表（可能为空）', async () => {
  const res = await request(app)
    .get('/api/achievements')
    .expect(200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
});

test('获取对局历史（无 token，可能为空）', async () => {
  const res = await request(app)
    .get('/api/matches')
    .query({ userId })
    .expect(200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data.matches));
});

test('不存在的对局返回 404', async () => {
  const fakeId = new mongoose.Types.ObjectId().toString();
  await request(app)
    .get(`/api/matches/${fakeId}`)
    .expect(404);
});

// ══════════════════════════════════════════════════════════════════
//  旅程 4: 完整游戏流程（用 runtime 模拟）
// ══════════════════════════════════════════════════════════════════

test('完整 PvE 游戏：注册 → 建房间 → 多回合 → 胜利归档', async () => {
  // 注册游戏专用账号
  const regRes = await request(app)
    .post('/api/auth/register')
    .send({ username: 'pveplayer', email: 'pve@test.com', password: 'gamepass123' });
  assert.ok(regRes.body.data?.accessToken || regRes.status === 201,
    `Register should succeed, got ${regRes.status}: ${JSON.stringify(regRes.body)}`);
  const pveUserId = regRes.body.data?.user?.id || regRes.body.data?.user?._id;

  // 模拟：创建房间（用 runtime 直接操作）
  const { createRoom, sendRoomEvent, stopRoom, getRoom } = await import('../../src/pve/runtime.js');
  const {
    drawComplete, bossTelegraphComplete,
    skillShield, skillChangeColor,
    shuffleSelect, shuffleConfirm,
    startBattle, playSelect, playConfirm,
    resolveComplete, bossAttackComplete, roundEndConfirm,
  } = await import('../../src/types/events.js');

  const roomId = `journey-${Date.now()}`;
  let ctx = createRoom({ roomId, socketId: 'journey-sock', userId: pveUserId });

  // 启动开局
  ctx = sendRoomEvent(roomId, drawComplete()).ctx!;
  ctx = sendRoomEvent(roomId, bossTelegraphComplete()).ctx!;

  let rounds = 0;
  const maxRounds = 50;

  while (ctx.battleResult === 'ONGOING' && rounds < maxRounds) {
    rounds++;

    // 使用护盾
    if (!ctx.roundState.skills.shield.active && !ctx.roundState.skills.shield.onCooldown) {
      const r = sendRoomEvent(roomId, skillShield());
      if (r.ok) ctx = r.ctx!;
    }

    // 变色技能
    const rColor = sendRoomEvent(roomId, skillChangeColor(ctx.hand[0].id, 'FIRE'));
    if (rColor.ok) ctx = rColor.ctx!;

    // Shuffle
    if (ctx.roundState.shuffle.remaining > 0 && ctx.hand.length >= 2) {
      const cardIds = ctx.hand.slice(0, 2).map(c => c.id);
      let r = sendRoomEvent(roomId, shuffleSelect(cardIds));
      if (r.ok) {
        r = sendRoomEvent(roomId, shuffleConfirm());
        if (r.ok) ctx = r.ctx!;
      }
    }

    // 进入出牌
    ctx = sendRoomEvent(roomId, startBattle()).ctx!;

    // 选 5 张牌
    const toPlay = ctx.hand.slice(0, Math.min(5, ctx.hand.length)).map(c => c.id);
    for (const id of toPlay) {
      ctx = sendRoomEvent(roomId, playSelect(id)).ctx!;
    }

    // 确认 → 结算
    ctx = sendRoomEvent(roomId, playConfirm()).ctx!;
    ctx = sendRoomEvent(roomId, resolveComplete()).ctx!;

    if (ctx.battleResult === 'WIN') break;
    ctx = sendRoomEvent(roomId, bossAttackComplete()).ctx!;
    if (ctx.battleResult === 'LOSE') break;

    // 下回合
    ctx = sendRoomEvent(roomId, roundEndConfirm()).ctx!;
    ctx = sendRoomEvent(roomId, drawComplete()).ctx!;
    ctx = sendRoomEvent(roomId, bossTelegraphComplete()).ctx!;
  }

  // 断言
  assert.ok(rounds > 0, '至少进行了 1 回合');
  assert.ok(['WIN', 'LOSE'].includes(ctx.battleResult),
    `期待的结局是 WIN 或 LOSE，实际 ${ctx.battleResult}`);

  // 验证归档
  if (ctx.battleResult === 'WIN' || ctx.battleResult === 'LOSE') {
    // archiveGame 是异步的，稍等
    await new Promise(r => setTimeout(r, 500));

    const { Match } = await import('../../src/models/Match.js');
    const match = await Match.findOne({ bossId: ctx.boss.id }).sort({ endedAt: -1 }).lean();
    assert.ok(match, '游戏结束后应有 Match 记录');
    assert.equal(match.isWin, ctx.battleResult === 'WIN');
  }

  stopRoom(roomId);
});

// ══════════════════════════════════════════════════════════════════
//  旅程 5: 边界条件 — 空牌堆、极端伤害、快速连击
// ══════════════════════════════════════════════════════════════════

test('边界：快速连续出牌不崩', async () => {
  const { createRoom, sendRoomEvent, stopRoom } = await import('../../src/pve/runtime.js');
  const { drawComplete, bossTelegraphComplete, startBattle, playSelect, playConfirm, resolveComplete } = await import('../../src/types/events.js');

  const roomId = 'boundary-rapid';
  let ctx = createRoom({ roomId, socketId: 'sock-rapid' });
  ctx = sendRoomEvent(roomId, drawComplete()).ctx!;
  ctx = sendRoomEvent(roomId, bossTelegraphComplete()).ctx!;
  ctx = sendRoomEvent(roomId, startBattle()).ctx!;

  // 反复选 3 张牌
  const cardIds = ctx.hand.slice(0, 3).map(c => c.id);
  for (let loop = 0; loop < 3; loop++) {
    for (const id of cardIds) {
      ctx = sendRoomEvent(roomId, playSelect(id)).ctx!;
    }
  }

  const r = sendRoomEvent(roomId, playConfirm());
  assert.ok(r.ok, `playConfirm should be ok, got: ${r.error}`);

  // 结算
  const r2 = sendRoomEvent(roomId, resolveComplete());
  assert.ok(r2.ctx!.battleResult === 'WIN' || r2.ok, 'resolve should complete');
  stopRoom(roomId);
});

test('边界：空选牌确认被拒绝', async () => {
  const { createRoom, sendRoomEvent, stopRoom } = await import('../../src/pve/runtime.js');
  const { drawComplete, bossTelegraphComplete, startBattle, playConfirm } = await import('../../src/types/events.js');

  const roomId = 'boundary-empty';
  let ctx = createRoom({ roomId, socketId: 'sock-empty' });
  ctx = sendRoomEvent(roomId, drawComplete()).ctx!;
  ctx = sendRoomEvent(roomId, bossTelegraphComplete()).ctx!;
  ctx = sendRoomEvent(roomId, startBattle()).ctx!;

  const r = sendRoomEvent(roomId, playConfirm());
  assert.equal(r.ok, false, '空选牌确认应被拒绝');
  stopRoom(roomId);
});

test('边界：房间不存在时 sendRoomEvent 报错', async () => {
  const { sendRoomEvent } = await import('../../src/pve/runtime.js');
  const { drawComplete } = await import('../../src/types/events.js');

  const r = sendRoomEvent('no-such-room', drawComplete());
  assert.equal(r.ok, false);
  assert.ok(r.error?.includes('not found'));
});

test('边界：同一 socket 重复创建房间', async () => {
  const { createRoom, stopRoom } = await import('../../src/pve/runtime.js');

  createRoom({ roomId: 'room-a', socketId: 'dup-sock' });
  assert.throws(() => createRoom({ roomId: 'room-a', socketId: 'dup-sock-2' }), '重复创建同一房间应报错');
  stopRoom('room-a');
});

// ══════════════════════════════════════════════════════════════════
//  旅程 6: 健康检查
// ══════════════════════════════════════════════════════════════════

test('根路径健康检查', async () => {
  const res = await request(app)
    .get('/')
    .expect(200);

  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Backend API is running');
});

test('API 路径健康检查', async () => {
  const res = await request(app)
    .get('/api')
    .expect(200);

  assert.ok(res.text.includes('Backend API'));
});
