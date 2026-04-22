import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { redisClient } from '../redis.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { protect } from '../middleware/auth.js';
import { registerRules, loginRules, validate } from '../middleware/validate.js';

const router = express.Router();

const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 天（秒）

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
    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      success: true,
      message: '注册成功',
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
 * @route  POST /api/auth/login
 * @desc   用户登录
 * @access 公开
 * @body   { email, password }
 * @return { success, message, data: { token, user } }
 */
router.post('/login', authLimiter, loginRules, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: '邮箱或密码错误', data: null });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '邮箱或密码错误', data: null });
    }

    // 签发短效 access token（15分钟）
    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    // 签发长效 refresh token（7天），存入 Redis
    const refreshToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
      { expiresIn: '7d' }
    );
    await redisClient.set(`refresh:${refreshToken}`, String(user._id), { EX: REFRESH_TTL });

    return res.status(200).json({
      success: true,
      message: '登录成功',
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
 * @desc   使用 Refresh Token 换取新 Access Token
 * @access 公开（需携带 Refresh Token）
 * @body   { refreshToken }
 * @return { success, message, data: { token } }
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'refresh token 不能为空', data: null });
    }

    // 验证 refresh token 签名
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh');
    } catch {
      return res.status(401).json({ success: false, message: 'refresh token 无效或已过期', data: null });
    }

    // 查 Redis，确认 token 未被登出撤销
    const stored = await redisClient.get(`refresh:${refreshToken}`);
    if (!stored) {
      return res.status(401).json({ success: false, message: 'refresh token 已失效，请重新登录', data: null });
    }

    // 签发新 access token
    const accessToken = jwt.sign(
      { userId: decoded.userId, username: decoded.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    return res.status(200).json({
      success: true,
      message: 'token 已刷新',
      data: { accessToken },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route  POST /api/auth/logout
 * @desc   登出（使 Token 失效）
 * @access 需 JWT
 * @return { success, message, data: null }
 */
router.post('/logout', protect, async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      await redisClient.del(`refresh:${refreshToken}`);
    }
    return res.status(200).json({ success: true, message: '已登出', data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
