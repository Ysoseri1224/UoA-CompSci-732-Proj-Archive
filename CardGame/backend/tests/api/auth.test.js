import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import jwt from 'jsonwebtoken';
 
//Mock Redis
jest.mock('../src/redis.js', () => ({
  redisClient: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue('some_user_id'),
    del: jest.fn().mockResolvedValue(1),
  },
}));
 
// Mock protect middleware
jest.mock('../src/middleware/auth.js', () => ({
  protect: (req, res, next) => {
    req.user = { userId: 'mocked_user_id', username: 'testuser' };
    next();
  },
}));
 
import authRouter from '../src/routes/auth.js';
import { redisClient } from '../src/redis.js';
 
// Environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRES_IN = '15m';
 
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
 
// Database lifecycle
let mongoServer;
 
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});
 
afterEach(async () => {
  for (const key in mongoose.connection.collections) {
    await mongoose.connection.collections[key].deleteMany({});
  }
  jest.clearAllMocks();
});
 
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
 
// Test data
const validUser = {
  username: 'testplayer',
  email: 'player@game.com',
  password: 'Password123!',
};
 
// Helper function: register and login, return { accessToken, refreshToken }
async function registerAndLogin(user = validUser) {
  await request(app).post('/api/auth/register').send(user);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password });
  return res.body.data;
}
 
// Generate a valid refreshToken for the /refresh route test
function makeRefreshToken(payload = { userId: 'uid123', username: 'testplayer' }) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}
 
describe('Auth Endpoints', () => {
 
  // POST /api/auth/register
  describe('POST /api/auth/register', () => {
 
    it('新用户注册成功 → 201, 返回 token 及用户信息', async () => {
      const res = await request(app).post('/api/auth/register').send(validUser);
 
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('注册成功');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toMatchObject({
        username: validUser.username,
        email: validUser.email,
      });
      // Should not return password hash
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });
 
    it('返回的 token 是合法 JWT', async () => {
      const res = await request(app).post('/api/auth/register').send(validUser);
      const decoded = jwt.verify(res.body.data.token, process.env.JWT_SECRET);
 
      expect(decoded).toHaveProperty('userId');
      expect(decoded.username).toBe(validUser.username);
    });
 
    it('用户名重复 → 409, 提示用户名已被占用', async () => {
      await request(app).post('/api/auth/register').send(validUser);
 
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);
 
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('用户名已被占用');
      expect(res.body.data).toBeNull();
    });
 
    it('邮箱重复（用户名不同）→ 409, 提示邮箱已被占用', async () => {
      await request(app).post('/api/auth/register').send(validUser);
 
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, username: 'anotheruser' });
 
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('邮箱已被占用');
    });
 
    it('缺少必填字段(无 password) → 422/400 校验失败', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'nopass', email: 'nopass@game.com' });
 
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });
  });
 
  //POST /api/auth/login
  describe('POST /api/auth/login', () => {
 
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validUser);
    });
 
    it('正确凭证登录 → 200, 返回 accessToken 及用户信息', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password });
 
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('登录成功');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user).toMatchObject({
        email: validUser.email,
        username: validUser.username,
      });
    });
 
    it('accessToken 是合法 JWT, payload 含 userId / username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password });
 
      const decoded = jwt.verify(res.body.data.accessToken, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty('userId');
      expect(decoded.username).toBe(validUser.username);
    });
 
    it('登录成功后 refreshToken 写入 Redis', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password });
 
      expect(redisClient.set).toHaveBeenCalledWith(
        expect.stringMatching(/^refresh:/),
        expect.any(String),
        expect.objectContaining({ EX: 7 * 24 * 60 * 60 })
      );
    });
 
    it('密码错误 → 401, 提示邮箱或密码错误', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: 'WrongPass999!' });
 
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('邮箱或密码错误');
      expect(res.body.data).toBeNull();
    });
 
    it('邮箱不存在 → 401, 提示邮箱或密码错误', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@game.com', password: validUser.password });
 
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('邮箱或密码错误');
    });
 
    it('缺少 email 字段 → 校验失败，不返回 200', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: validUser.password });
 
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });
  });
 
  //POST /api/auth/refresh
  describe('POST /api/auth/refresh', () => {
 
    it('合法 refreshToken + Redis 有记录 → 200, 返回新 accessToken', async () => {
      const refreshToken = makeRefreshToken();
      redisClient.get.mockResolvedValueOnce('some_user_id'); // Redis 有记录
 
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });
 
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('token 已刷新');
      expect(res.body.data).toHaveProperty('accessToken');
 
      // New token should be a valid JWT
      const decoded = jwt.verify(res.body.data.accessToken, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty('userId');
    });
 
    it('未携带 refreshToken → 401', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});
 
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('refresh token 不能为空');
    });
 
    it('refreshToken 签名非法 → 401', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'totally.invalid.token' });
 
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/refresh token 无效/);
    });
 
    it('refreshToken 已从 Redis 撤销（登出后）→ 401', async () => {
      const refreshToken = makeRefreshToken();
      redisClient.get.mockResolvedValueOnce(null);
 
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });
 
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('refresh token 已失效，请重新登录');
    });
 
    it('refreshToken 已过期 → 401', async () => {
      // Issue a token that immediately expires
      const expiredToken = jwt.sign(
        { userId: 'uid123', username: 'testplayer' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '0s' }
      );
 
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredToken });
 
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/refresh token 无效/);
    });
  });
 
  //POST /api/auth/logout
  describe('POST /api/auth/logout', () => {
 
    it('携带 refreshToken 登出 → 200, Redis 中该 token 被删除', async () => {
      const refreshToken = 'some_refresh_token';
 
      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });
 
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('已登出');
      expect(res.body.data).toBeNull();
 
      // Confirm that Redis del is called and the key is correct
      expect(redisClient.del).toHaveBeenCalledWith(`refresh:${refreshToken}`);
    });
 
    it('不携带 refreshToken 也能登出 → 200, 不调用 Redis del', async () => {
      const res = await request(app).post('/api/auth/logout').send({});
 
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('已登出');
      expect(redisClient.del).not.toHaveBeenCalled();
    });
  });
});