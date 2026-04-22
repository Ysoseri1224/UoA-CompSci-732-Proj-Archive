import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { redisClient } from '../redis.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { protect } from '../middleware/auth.js';
import { registerRules, loginRules, validate } from '../middleware/validate.js';

const router = express.Router();

const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * @route  POST /api/auth/register
 * @desc   Register a new user
 * @access Public
 * @body   { username, email, password }
 * @return { success, message, data: { token, user } }
 */
router.post('/register', authLimiter, registerRules, validate, async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      const field = existing.username === username ? 'Username' : 'Email';
      return res.status(409).json({ success: false, message: `${field} is already taken`, data: null });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({ name: username, username, email, passwordHash });

    // Issue access token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route  POST /api/auth/login
 * @desc   Authenticate user and return tokens
 * @access Public
 * @body   { email, password }
 * @return { success, message, data: { token, user } }
 */
router.post('/login', authLimiter, loginRules, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password', data: null });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password', data: null });
    }

    // Issue short-lived access token (15 min)
    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    // Issue long-lived refresh token (7 days) and store in Redis
    const refreshToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
      { expiresIn: '7d' }
    );
    await redisClient.set(`refresh:${refreshToken}`, String(user._id), { EX: REFRESH_TTL });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route  POST /api/auth/refresh
 * @desc   Exchange a valid refresh token for a new access token
 * @access Public
 * @body   { refreshToken }
 * @return { success, message, data: { token } }
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token is required', data: null });
    }

    // Verify refresh token signature
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh');
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token', data: null });
    }

    // Check Redis to confirm token has not been revoked
    const stored = await redisClient.get(`refresh:${refreshToken}`);
    if (!stored) {
      return res.status(401).json({ success: false, message: 'Refresh token has been revoked, please log in again', data: null });
    }

    // Issue new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId, username: decoded.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    return res.status(200).json({
      success: true,
      message: 'Token refreshed',
      data: { accessToken },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route  POST /api/auth/logout
 * @desc   Log out and revoke refresh token
 * @access Requires JWT
 * @return { success, message, data: null }
 */
router.post('/logout', protect, async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      await redisClient.del(`refresh:${refreshToken}`);
    }
    return res.status(200).json({ success: true, message: 'Logged out successfully', data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
