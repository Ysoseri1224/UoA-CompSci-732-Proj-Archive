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
    it('new user registers successfully → 201, returns accessToken', async () => {
      const { status, body } = await fetchApi('/register', {
        method: 'POST',
        body: JSON.stringify(validUser)
      });


      assert.equal(status, 201);
      assert.equal(body.success, true);
      assert.equal(body.message, 'Registration successful');
      assert.ok(body.data.accessToken, 'accessToken should exist');
      assert.equal(body.data.user.username, validUser.username);
      //Verify token payload
      const decoded = jwt.verify(body.data.accessToken, process.env.JWT_SECRET);
      assert.ok(decoded.userId);
      assert.equal(decoded.username, validUser.username);
      //Password hashes should not be exposed
      assert.equal(body.data.user.passwordHash, undefined);
    });
 

    it('duplicate username → 409', async () => {
      await fetchApi('/register', { method: 'POST', body: JSON.stringify(validUser) });
      const { status, body } = await fetchApi('/register', { method: 'POST', body: JSON.stringify(validUser) });
 

      assert.equal(status, 409);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Username already taken');
    });

 
    //Email is duplicated but username is different
    it('duplicate email (different username) → 409', async () => {
      await fetchApi('/register', { method: 'POST', body: JSON.stringify(validUser) });
      const { status, body } = await fetchApi('/register', {
        method: 'POST',
        body: JSON.stringify({ ...validUser, username: 'anotheruser' })
      });

 
      assert.equal(status, 409);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Email already in use');
    });

 
    it('missing required fields → 400', async () => {
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

 
    it('valid credentials → 200, returns accessToken', async () => {
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

 

 
    it('wrong password → 401', async () => {
      const { status, body } = await fetchApi('/login', {
        method: 'POST',
        body: JSON.stringify({ email: validUser.email, password: 'WrongPass999!' })
      });

      assert.equal(status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Invalid email or password');
    });

 

    //Email does not exist
    it('email does not exist → 401', async () => {
      const { status, body } = await fetchApi('/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'nobody@game.com', password: validUser.password })
      });

      assert.equal(status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Invalid email or password');
    });

 

    //Missing email field
    it('missing email field → 400', async () => {
      const { status, body } = await fetchApi('/login', {
        method: 'POST',
        body: JSON.stringify({ password: validUser.password })
      });

      assert.ok(status >= 400);
      assert.equal(body.success, false);
    });
  });

 
  describe('POST /api/auth/refresh', () => {
    it('valid refreshToken → 200, returns new accessToken', async () => {
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

 
    it('missing refreshToken → 401', async () => {
      const { status, body } = await fetchApi('/refresh', { method: 'POST', body: JSON.stringify({}) });
      assert.equal(status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Refresh token is required');
    });

 
    //Invalid signature
    it('invalid refreshToken signature → 401', async () => {
      const { status, body } = await fetchApi('/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'totally.invalid.token' })
      });

      assert.equal(status, 401);
      assert.equal(body.success, false);
      assert.match(body.message, /Invalid or expired refresh token/);
    });

 

 
    //Token has expired
    it('expired refreshToken → 401', async () => {
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
      assert.match(body.message, /Invalid or expired refresh token/);
    });
  });

 
  describe('POST /api/auth/logout', () => {
    it('logout with refreshToken → 200', async () => {
      const refreshToken = 'some_refresh_token';
      const { status, body } = await fetchApi('/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });

 
      assert.equal(status, 200);
      assert.equal(body.success, true);
      assert.equal(body.message, 'Logged out');
    });

 
    //Can logout without refreshToken
    it('logout without refreshToken → 200', async () => {
      const { status, body } = await fetchApi('/logout', {
        method: 'POST',
        body: JSON.stringify({})
      });

 
      assert.equal(status, 200);
      assert.equal(body.success, true);
      assert.equal(body.message, 'Logged out');
    });
  });
});
