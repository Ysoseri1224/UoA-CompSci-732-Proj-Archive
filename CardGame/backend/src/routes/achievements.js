import express from 'express';
const router = express.Router();

/**
 * @route  GET /api/achievements
 * @desc   获取全部成就定义列表（静态数据）
 * @access 公开
 * @return { success, message, data: [{ id, name, description, type }] }
 */
router.get('/', async (req, res) => {
  res.status(501).json({ success: false, message: '待实现', data: null });
});

export default router;
