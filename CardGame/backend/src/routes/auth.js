import express from 'express';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * @route  POST /api/auth/register
 * @desc   注册新用户
 * @access 公开
 * @body   { username, email, password }
 * @return { success, message, data: { token, user } }
 */
router.post('/register', authLimiter, async (req, res) => {
  res.status(501).json({ success: false, message: '待实现', data: null });
});

/**
 * @route  POST /api/auth/login
 * @desc   用户登录
 * @access 公开
 * @body   { email, password }
 * @return { success, message, data: { token, user } }
 */
router.post('/login', authLimiter, async (req, res) => {
  res.status(501).json({ success: false, message: '待实现', data: null });
});

/**
 * @route  POST /api/auth/refresh
 * @desc   使用 Refresh Token 换取新 Access Token
 * @access 公开（需携带 Refresh Token）
 * @body   { refreshToken }
 * @return { success, message, data: { token } }
 */
router.post('/refresh', async (req, res) => {
  res.status(501).json({ success: false, message: '待实现', data: null });
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
