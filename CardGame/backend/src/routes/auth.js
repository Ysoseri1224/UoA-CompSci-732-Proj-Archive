import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { registerRules, validate } from '../middleware/validate.js';

const router = express.Router();

/**
 * @route  POST /api/auth/register
 * @desc   注册新用户
 * @access 公开
 * @body   { username, email, password }
 * @return { success, message, data: { token, user } }
 */
router.post('/register', authLimiter, registerRules, validate, async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // 检查用户名或邮箱是否已被占用
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      const field = existing.username === username ? '用户名' : '邮箱';
      return res.status(409).json({ success: false, message: `${field}已被占用`, data: null });
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户，name 默认与 username 相同，后续可通过 PUT /users/me 修改
    const user = await User.create({ name: username, username, email, passwordHash });

    // 签发 JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      success: true,
      message: '注册成功',
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
 * @desc   用户登录
 * @access 公开
 * @body   { email, password }
 * @return { success, message, data: { token, user } }
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route  POST /api/auth/refresh
 * @desc   使用 Refresh Token 换取新 Access Token
 * @access 公开（需携带 Refresh Token）
 * @body   { refreshToken }
 * @return { success, message, data: { token } }
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};

    if (!refreshToken) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const { userId, username } = decoded || {};
    if (!userId || !username) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const newToken = jwt.sign(
      { userId, username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({ token: newToken });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route  POST /api/auth/logout
 * @desc   登出（使 Token 失效）
 * @access 需 JWT
 * @return { success, message, data: null }
 */
router.post('/logout', async (req, res) => {
  res.status(501).json({ success: false, message: '待实现', data: null });
});

export default router;
