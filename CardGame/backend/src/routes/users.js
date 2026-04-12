import express from 'express';
import { protect } from '../middleware/auth.js';
const router = express.Router();

/**
 * @route  GET /api/users/:userId
 * @desc   获取用户公开资料
 * @access 公开
 * @return { success, message, data: { username, avatar, createdAt, totalWins, totalGames, achievements } }
 */
router.get('/:userId', async (req, res) => {
  res.status(501).json({ success: false, message: '待实现', data: null });
});

/**
 * @route  GET /api/users/:userId/stats
 * @desc   获取用户统计数据（胜率、技能使用分析等）
 * @access 公开
 * @return { success, message, data: { totalGames, winRate, avgDuration, topSkills, bestSkill } }
 */
router.get('/:userId/stats', async (req, res) => {
  res.status(501).json({ success: false, message: '待实现', data: null });
});

/**
 * @route  GET /api/users/:userId/achievements
 * @desc   获取用户已解锁成就列表
 * @access 公开
 * @return { success, message, data: [{ achievementId, unlockedAt }] }
 */
router.get('/:userId/achievements', async (req, res) => {
  res.status(501).json({ success: false, message: '待实现', data: null });
});

/**
 * @route  PUT /api/users/me
 * @desc   修改自己的资料
 * @access 需 JWT
 * @body   { username?, avatar? }
 * @return { success, message, data: { user } }
 */
router.put('/me', protect, async (req, res) => {
  res.status(501).json({ success: false, message: '待实现', data: null });
});

/**
 * @route  PUT /api/users/me/password
 * @desc   修改密码
 * @access 需 JWT
 * @body   { oldPassword, newPassword }
 * @return { success, message, data: null }
 */
router.put('/me/password', protect, async (req, res) => {
  res.status(501).json({ success: false, message: '待实现', data: null });
});

export default router;
