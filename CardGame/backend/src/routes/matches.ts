import express from 'express';
import { protect } from '../middleware/auth.js';
import { Match } from '../models/Match.js';
import { MatchReplay } from '../models/MatchReplay.js';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * GET /api/matches
 * Get paginated match history. Query: userId, page (default 1), limit (default 10).
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const userId = req.query.userId as string;

    const filter: Record<string, unknown> = {};
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    const [matches, total] = await Promise.all([
      Match.find(filter).sort({ endedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Match.countDocuments(filter),
    ]);

    res.json({
      success: true,
      message: 'OK',
      data: { matches, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/matches/:matchId
 * Get single match detail.
 */
router.get('/:matchId', async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.matchId).lean();
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found', data: null });
    }
    res.json({ success: true, message: 'OK', data: { match } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/matches/:matchId/replay
 * Get replay data for a match. Requires JWT.
 */
router.get('/:matchId/replay', protect, async (req, res, next) => {
  try {
    const replay = await MatchReplay.findOne({ matchId: req.params.matchId }).lean();
    if (!replay) {
      return res.status(404).json({ success: false, message: 'Replay not found', data: null });
    }
    res.json({ success: true, message: 'OK', data: { replay } });
  } catch (err) {
    next(err);
  }
});

export default router;
