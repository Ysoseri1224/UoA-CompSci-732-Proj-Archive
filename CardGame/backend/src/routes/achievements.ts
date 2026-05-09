import express from 'express';
import { Achievement } from '../models/Achievement.js';

const router = express.Router();

/**
 * GET /api/achievements
 * Return all achievement definitions.
 */
router.get('/', async (_req, res, next) => {
  try {
    const achievements = await Achievement.find({}).lean();
    res.json({ success: true, message: 'OK', data: achievements });
  } catch (err) {
    next(err);
  }
});

export default router;
