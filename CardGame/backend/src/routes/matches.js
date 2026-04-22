import express from 'express';
import { protect } from '../middleware/auth.js';
const router = express.Router();

/**
 * @route  GET /api/matches
 * @desc   获取某用户的战绩列表（分页）
 * @access 公开
 * @query  userId, page (默认1), limit (默认10)
 * @return { success, message, data: { matches: [], total, page, totalPages } }
 */
router.get('/', async (req, res) => {
  res.status(501).json({ success: false, message: '待实现', data: null });
});

/**
 * @route  GET /api/matches/:matchId
 * @desc   获取某场对局详情
 * @access 公开
 * @return { success, message, data: { match } }
 */
router.get('/:matchId', async (req, res) => {
  res.status(501).json({ success: false, message: '待实现', data: null });
});

/**
 * @route  GET /api/matches/:matchId/replay
 * @desc   获取对局回放数据
 * @access 需 JWT（仅对局参与者可访问）
 * @return { success, message, data: { replay } }
 */
router.get('/:matchId/replay', protect, async (req, res) => {
  res.status(501).json({ success: false, message: '待实现', data: null });
});

export default router;
