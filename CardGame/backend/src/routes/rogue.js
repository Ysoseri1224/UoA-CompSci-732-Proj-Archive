import express from 'express';
import { protect } from '../middleware/auth.js';
import { saveGame, loadGame, clearSave } from '../lib/savepoint.js';
import { createBossForLayer, playerHpForLayer } from '../lib/boss.js';
import { FIRST_LAYER_UPGRADES, generateUpgradePool } from '../types/buff.js';

const router = express.Router();

function getUserId(req) {
  return req.user?.userId;
}

// 增益选项 — 公开端点，不需要认证
router.get('/upgrades', async (req, res, next) => {
  try {
    const layer = Math.max(1, parseInt(req.query.layer) || 1);
    const elementOrder = ['WATER', 'FIRE', 'GRASS'];
    const chosenElement = req.query.element || elementOrder[(layer - 1) % 3];
    const options = layer === 1 ? FIRST_LAYER_UPGRADES : generateUpgradePool(chosenElement, layer);
    return res.status(200).json({ success: true, message: 'OK', data: options });
  } catch (err) { next(err); }
});

router.use(protect);

// 以下端点需要认证
// 增益选项（已上移到 protect 之前）

// 开始新局 — 清除旧存档
router.post('/start', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated', data: null });

    await clearSave(userId);

    const boss     = createBossForLayer(1);
    const playerHp = playerHpForLayer(1);
    const snapshot = {
      layer:        1,
      playerHp,
      playerMaxHp:  playerHp,
      bossHp:       boss.hp,
      enhancements: [],
      status:       'active',
      startedAt:    new Date().toISOString(),
    };

    const saved = await saveGame(userId, 'rogue', snapshot, 1);
    return res.status(201).json({ success: true, message: 'Rogue run started', data: saved });
  } catch (err) { next(err); }
});

// 读取当前存档
router.get('/current', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated', data: null });

    const save = await loadGame(userId);
    if (!save || save.snapshot?.status !== 'active') {
      return res.status(404).json({ success: false, message: 'No active rogue run found', data: null });
    }
    return res.status(200).json({ success: true, message: 'OK', data: save });
  } catch (err) { next(err); }
});

// 保存进度
router.put('/save', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated', data: null });

    const { layer, playerHp, bossHp, enhancements, stats } = req.body || {};

    if (typeof layer !== 'number' || layer < 1 || layer > 10)
      return res.status(400).json({ success: false, message: 'Invalid layer', data: null });
    if (typeof playerHp !== 'number' || playerHp < 0)
      return res.status(400).json({ success: false, message: 'Invalid playerHp', data: null });
    if (typeof bossHp !== 'number' || bossHp < 0)
      return res.status(400).json({ success: false, message: 'Invalid bossHp', data: null });
    if (enhancements !== undefined && !Array.isArray(enhancements))
      return res.status(400).json({ success: false, message: 'enhancements must be an array', data: null });
    const save    = await loadGame(userId);
    const existing = save?.snapshot ?? {};

    const snapshot = {
      ...existing,
      layer:        layer        ?? existing.layer,
      playerHp:     playerHp    ?? existing.playerHp,
      bossHp:       bossHp      ?? existing.bossHp,
      enhancements: enhancements ?? existing.enhancements,
      stats:        stats        ?? existing.stats,
      savedAt:      new Date().toISOString(),
    };

    const updated = await saveGame(userId, 'rogue', snapshot, snapshot.layer);
    return res.status(200).json({ success: true, message: 'Saved', data: updated });
  } catch (err) { next(err); }
});

// 层通关 — 保存 checkpoint
// 注意：每层通关后 HP 重置为该层标准属性值，不继承上层剩余 HP
router.post('/floor-won', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated', data: null });

    const { layer, playerHp, enhancements } = req.body || {};

    if (typeof layer !== 'number' || layer < 1 || layer > 10)
      return res.status(400).json({ success: false, message: 'Invalid layer', data: null });
    if (typeof playerHp !== 'number' || playerHp < 0)
      return res.status(400).json({ success: false, message: 'Invalid playerHp', data: null });
    const nextLayer  = (layer ?? 1) + 1;
    const nextBoss   = createBossForLayer(nextLayer);
    const nextHp     = playerHpForLayer(nextLayer);

    const save = await loadGame(userId);
    const snapshot = {
      ...(save?.snapshot ?? {}),
      layer:           nextLayer,
      playerHp:        nextHp,
      playerMaxHp:     nextHp,
      bossHp:          nextBoss.hp,
      enhancements:    enhancements ?? save?.snapshot?.enhancements ?? [],
      checkpointLayer: layer,
      checkpointHp:    playerHp,
      status:          'active',
    };

    const updated = await saveGame(userId, 'rogue', snapshot, nextLayer);
    return res.status(200).json({ success: true, message: 'Floor cleared', data: updated });
  } catch (err) { next(err); }
});

// 失败 — 读取 checkpoint 恢复
router.post('/floor-lost', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated', data: null });

    const save = await loadGame(userId);
    if (!save?.snapshot) {
      return res.status(200).json({ success: true, message: 'No save found', data: { action: 'end' } });
    }

    const snap = save.snapshot;
    if (snap.checkpointLayer && snap.checkpointLayer >= 1) {
      const boss = createBossForLayer(snap.checkpointLayer);
      const hp   = playerHpForLayer(snap.checkpointLayer);
      const checkpoint = {
        floor:       snap.checkpointLayer,
        playerHp:    snap.checkpointHp ?? hp,
        playerMaxHp: hp,
        bossHp:      boss.hp,
        enhancements: snap.enhancements ?? [],
      };
      return res.status(200).json({
        success: true, message: 'Checkpoint restored',
        data: { action: 'restore', checkpoint },
      });
    }

    await clearSave(userId);
    return res.status(200).json({ success: true, message: 'Run ended', data: { action: 'end' } });
  } catch (err) { next(err); }
});

// 选择增益
router.post('/choose-enhancement', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated', data: null });

    const { enhancement } = req.body || {};
    if (!enhancement || typeof enhancement !== 'object' || !enhancement.id || !enhancement.buff) {
      return res.status(400).json({ success: false, message: 'Invalid enhancement', data: null });
    }
    const validTypes = ['ELEMENT_CHIP_MULT', 'ELEMENT_CHIPS_BONUS', 'ELEMENT_DRAW_ON_SHUFFLE',
      'HIGH_RANK_DRAW_ON_SHUFFLE', 'HAND_MULT_BONUS', 'HAND_CHIPS_BONUS',
      'ALL_CHIPS_BONUS', 'HP_BONUS', 'SKILL_ENERGY_MAX'];
    if (!validTypes.includes(enhancement.buff.type)) {
      return res.status(400).json({ success: false, message: 'Invalid buff type', data: null });
    }
    const save = await loadGame(userId);
    if (!save?.snapshot) return res.status(404).json({ success: false, message: 'No active run', data: null });

    const snapshot = {
      ...save.snapshot,
      enhancements: [...(save.snapshot.enhancements ?? []), enhancement],
    };
    const updated = await saveGame(userId, 'rogue', snapshot, snapshot.layer);
    return res.status(200).json({ success: true, message: 'Enhancement saved', data: updated });
  } catch (err) { next(err); }
});

// 通关
router.post('/won', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated', data: null });
    await clearSave(userId);
    return res.status(200).json({ success: true, message: 'Run complete', data: null });
  } catch (err) { next(err); }
});

export default router;