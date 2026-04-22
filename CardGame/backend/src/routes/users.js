import express from 'express';
import { protect } from '../middleware/auth.js';
const router = express.Router();

/**
 * @route  GET /api/users/:userId
 * @desc   Get public user profile
 * @access Public
 * @return { success, message, data: { username, avatar, createdAt, totalWins, totalGames, achievements } }
 */
router.get('/:userId', async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented', data: null });
});

/**
 * @route  GET /api/users/:userId/stats
 * @desc   Get user statistics
 * @access Public
 * @return { success, message, data: { totalGames, winRate, avgDuration, topSkills, bestSkill } }
 */
router.get('/:userId/stats', async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented', data: null });
});

/**
 * @route  GET /api/users/:userId/achievements
 * @desc   Get user achievements
 * @access Public
 * @return { success, message, data: [{ achievementId, unlockedAt }] }
 */
router.get('/:userId/achievements', async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented', data: null });
});

/**
 * @route  PUT /api/users/me
 * @desc   Update current user profile
 * @access Requires JWT
 * @body   { username?, avatar? }
 * @return { success, message, data: { user } }
 */
router.put('/me', protect, async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented', data: null });
});

/**
 * @route  PUT /api/users/me/password
 * @desc   Change current user password
 * @access Requires JWT
 * @body   { oldPassword, newPassword }
 * @return { success, message, data: null }
 */
router.put('/me/password', protect, async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented', data: null });
});

export default router;
