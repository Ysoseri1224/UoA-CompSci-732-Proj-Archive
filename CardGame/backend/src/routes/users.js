import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { changePasswordRules, validate } from '../middleware/validate.js';

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
router.get('/:userId/stats', async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId', data: null });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', data: null });
    }

    const totalGames = user.stats?.totalGames ?? 0;
    const totalWins = user.stats?.totalWins ?? 0;
    const winRate = totalGames > 0 ? totalWins / totalGames : 0;

    return res.status(200).json({
      success: true,
      message: 'OK',
      data: {
        totalGames,
        totalWins,
        winRate: Math.round(winRate * 10000) / 10000,
      },
    });
  } catch (err) {
    next(err);
  }
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
router.put('/me/password', protect, changePasswordRules, validate, async (req, res, next) => {
  try {
    const { userId } = req.user || {};

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: 'Not authenticated', data: null });
    }

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', data: null });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Old password incorrect', data: null });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ success: true, message: 'Password changed', data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
