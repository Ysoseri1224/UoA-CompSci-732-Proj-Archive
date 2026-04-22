import { describe, it, before, after, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import authRouter from '../../src/routes/auth.js';
import { redisClient } from '../../src/redis.js';
import * as authMiddleware from '../../src/middleware/auth.js';

 

// Environment variables and native Mock settings
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRES_IN = '15m';

 
// Intercepting Redis using Node's native mock
mock.method(redisClient, 'set', async () => 'OK');
mock.method(redisClient, 'get', async () => 'some_user_id');
mock.method(redisClient, 'del', async () => 1);

 

// Intercept the auth middleware using Node's native mock.
mock.method(authMiddleware, 'protect', (req, res, next) => {
  req.user = { userId: 'mocked_user_id', username: 'testuser' };
  next();
});

let server;
let baseUrl;

 
before(async () => {
  const mongoUri = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/cardgame_test';
  await mongoose.connect(mongoUri);
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}/api/auth`;
      resolve();
    });
  });
});

 

afterEach(async () => {
  for (const key in mongoose.connection.collections) {
    await mongoose.connection.collections[key].deleteMany({});
  }

  //Reset Redis mock call logs
  redisClient.set.mock.resetCalls();
  redisClient.get.mock.resetCalls();
  redisClient.del.mock.resetCalls();
});

 
after(async () => {
  await mongoose.disconnect();
  server.close();
});

 
// Native Fetch helper function
const validUser = {
  username: 'testplayer',
  email: 'player@game.com',
  password: 'Password123!',
};

 
async function fetchApi(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}
 

function makeRefreshToken(payload = { userId: 'uid123', username: 'testplayer' }) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}
 

 
// Test cases
describe('Auth API Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('新用户注册成功 → 201, 返回 token', async () => {
      const { status, body } = await fetchApi('/register', {
        method: 'POST',
        body: JSON.stringify(validUser)
      });


      assert.equal(status, 201);
      assert.equal(body.success, true);
      assert.equal(body.message, '注册成功');
      assert.ok(body.data.accessToken, 'Token 应该存在');
      assert.equal(body.data.user.username, validUser.username);
      //Verify token payload
      const decoded = jwt.verify(body.data.accessToken, process.env.JWT_SECRET);
      assert.ok(decoded.userId);
      assert.equal(decoded.username, validUser.username);
      //Password hashes should not be exposed
      assert.equal(body.data.user.passwordHash, undefined);
    });
 

    it('用户名重复 → 409', async () => {
      await fetchApi('/register', { method: 'POST', body: JSON.stringify(validUser) });
      const { status, body } = await fetchApi('/register', { method: 'POST', body: JSON.stringify(validUser) });
 

      assert.equal(status, 409);
      assert.equal(body.success, false);
      assert.equal(body.message, '用户名已被占用');
    });

 
    //Email is duplicated but username is different
    it('邮箱重复（用户名不同）→ 409, 提示邮箱已被占用', async () => {
      await fetchApi('/register', { method: 'POST', body: JSON.stringify(validUser) });
      const { status, body } = await fetchApi('/register', {
        method: 'POST',
        body: JSON.stringify({ ...validUser, username: 'anotheruser' })
      });

 
      assert.equal(status, 409);
      assert.equal(body.success, false);
      assert.equal(body.message, '邮箱已被占用');
    });

 
    it('缺少必填字段 → 400/422', async () => {
      const { status, body } = await fetchApi('/register', {
        method: 'POST',
        body: JSON.stringify({ username: 'nopass' })
      });

 
      assert.ok(status >= 400);
      assert.equal(body.success, false);
    });
  });

 
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await fetchApi('/register', { method: 'POST', body: JSON.stringify(validUser) });
    });

 
    it('正确凭证登录 → 200, 返回 accessToken', async () => {
      const { status, body } = await fetchApi('/login', {
        method: 'POST',
        body: JSON.stringify({ email: validUser.email, password: validUser.password })
      });

 
      assert.equal(status, 200);
      assert.equal(body.success, true);
      assert.ok(body.data.accessToken);
      //Verify token payload
      const decoded = jwt.verify(body.data.accessToken, process.env.JWT_SECRET);
      assert.ok(decoded.userId);
      assert.equal(decoded.username, validUser.username);
    });

 
    //Verify refreshToken is written to Redis
    it('After successful login, refreshToken is written to Redis with refresh: prefix, TTL = 7 days', async () => {
      await fetchApi('/login', {
        method: 'POST',
        body: JSON.stringify({ email: validUser.email, password: validUser.password })
      });

 
      const calls = redisClient.set.mock.calls;
      assert.ok(calls.length > 0, 'redisClient.set 应被调用');
      const [key, _value, options] = calls[0].arguments;
      assert.match(key, /^refresh:/);
      assert.equal(options?.EX, 7 * 24 * 60 * 60);
    });

 
    it('密码错误 → 401', async () => {
      const { status, body } = await fetchApi('/login', {
        method: 'POST',
        body: JSON.stringify({ email: validUser.email, password: 'WrongPass999!' })
      });

      assert.equal(status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, '邮箱或密码错误');
    });

 

    //Email does not exist
    it('邮箱不存在 → 401', async () => {
      const { status, body } = await fetchApi('/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'nobody@game.com', password: validUser.password })
      });

      assert.equal(status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, '邮箱或密码错误');
    });

 

    //Missing email field
    it('缺少 email 字段 → 4xx', async () => {
      const { status, body } = await fetchApi('/login', {
        method: 'POST',
        body: JSON.stringify({ password: validUser.password })
      });

      assert.ok(status >= 400);
      assert.equal(body.success, false);
    });
  });

 
  describe('POST /api/auth/refresh', () => {
    it('合法 refreshToken → 200, 返回新 accessToken', async () => {
      const refreshToken = makeRefreshToken();
      const { status, body } = await fetchApi('/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });

      assert.equal(status, 200);
      assert.equal(body.success, true);
      assert.ok(body.data.accessToken);
      //Verify the validity of the new token
      const decoded = jwt.verify(body.data.accessToken, process.env.JWT_SECRET);
      assert.ok(decoded.userId);
    });

 
    it('未携带 refreshToken → 401', async () => {
      const { status, body } = await fetchApi('/refresh', { method: 'POST', body: JSON.stringify({}) });
      assert.equal(status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, 'refresh token 不能为空');
    });

 
    //Invalid signature
    it('refreshToken 签名非法 → 401', async () => {
      const { status, body } = await fetchApi('/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'totally.invalid.token' })
      });

      assert.equal(status, 401);
      assert.equal(body.success, false);
      assert.match(body.message, /refresh token 无效/);
    });

 
    //Revoked from Redis
    it('refreshToken 已从 Redis 撤销 → 401', async () => {
      const refreshToken = makeRefreshToken();
      redisClient.get.mock.mockImplementationOnce(async () => null);
      const { status, body } = await fetchApi('/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });

      assert.equal(status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, 'refresh token 已失效，请重新登录');
    });

 
    //Token has expired
    it('refreshToken 已过期 → 401', async () => {
      const expiredToken = jwt.sign(
        { userId: 'uid123', username: 'testplayer' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '0s' }
      );

 
      const { status, body } = await fetchApi('/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: expiredToken })
      });
 

      assert.equal(status, 401);
      assert.match(body.message, /refresh token 无效/);
    });
  });

 
  describe('POST /api/auth/logout', () => {
    it('携带 refreshToken 登出 → 200', async () => {
      const refreshToken = 'some_refresh_token';
      const { status, body } = await fetchApi('/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });

 
      assert.equal(status, 200);
      assert.equal(body.success, true);
      assert.equal(body.message, '已登出');
      //Verify Redis del is called with the correct key
      const calls = redisClient.del.mock.calls;
      assert.ok(calls.length > 0, 'redisClient.del 应被调用');
      assert.equal(calls[0].arguments[0], `refresh:${refreshToken}`);
    });

 
    //Can logout without refreshToken
    it('不携带 refreshToken 也能登出 → 200, Redis del 不被调用', async () => {
      const { status, body } = await fetchApi('/logout', {
        method: 'POST',
        body: JSON.stringify({})
      });

 
      assert.equal(status, 200);
      assert.equal(body.success, true);
      assert.equal(body.message, '已登出');
      assert.equal(redisClient.del.mock.calls.length, 0, 'redisClient.del 不应被调用');
    });
  });
});
