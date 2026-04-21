import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';

// Mock the Redis client to prevent test errors
jest.mock('../src/redis.js', () => ({
  redisClient: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue('mocked_user_id'),
    del: jest.fn().mockResolvedValue(1),
  }
}));

import authRouter from '../src/routes/auth.js';


// Testing environment variables and preparing an Express instance
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRES_IN = '15m';

const app = express();
app.use(express.json());

// To test the /logout route, need to provide a simple fake protect middleware mechanism
jest.mock('../src/middleware/auth.js', () => ({
  protect: (req, res, next) => {
    req.user = { id: 'mocked_user_id' }; // Pretend to be logged in
    next();
  }
}));

app.use('/api/auth', authRouter);

let mongoServer;

// Database lifecycle management
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
  // Clear the call records between test cases
  jest.clearAllMocks(); 
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Test cases
describe('Auth Endpoints Tests', () => {
  const validUser = {
    username: 'testplayer',
    email: 'player@game.com',
    password: 'Password123!'
  };

  // Test POST /api/auth/register
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Registration successful');
      
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.username).toBe(validUser.username);
    });

    it('should fail if user already exists (duplicate user)', async () => {
      await request(app).post('/api/auth/register').send(validUser);
      
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/);
    });
  });

  // Test POST /api/auth/login
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register the user first
      await request(app).post('/api/auth/register').send(validUser);
    });

    it('should login successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successfully');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.email).toBe(validUser.email);
    });

    it('should fail with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: 'WrongPassword999!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email or password is incorrect');
    });

    it('should fail with unknown email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nobody@game.com',
          password: validUser.password
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email or password is incorrect');
    });
  });
});