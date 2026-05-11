import { createBossState, BOSS_WEIGHTS_BY_LAYER } from '../types/state.js';
import { ALL_ELEMENTS } from '../types/card.js';
import type { BossState } from '../types/state.js';
import type { Element } from '../types/card.js';

// ══════════════════════════════════════════════════════════════════
//  10 层 Boss 数值表（最终版，由 calc.py 模拟生成）
//  锚定：3-5 回合击杀，存活 ≥ 3.5 轮，胜率单调下降
//  DPS 基准 143（裸打），玩家 HP 分三档 20→30→40
// ══════════════════════════════════════════════════════════════════

/** 层数 → Boss HP */
const BOSS_HP: Record<number, number> = {
  1: 543, 2: 570, 3: 647, 4: 780, 5: 966,
  6: 1144, 7: 1292, 8: 1450, 9: 1586, 10: 1760,
};

/** 层数 → Boss ATK */
const BOSS_ATK: Record<number, number> = {
  1: 3, 2: 4, 3: 4, 4: 9, 5: 10,
  6: 10, 7: 19, 8: 21, 9: 22, 10: 23,
};

/** 蓄力 = ATK × 2.2（取整） */
export function calcChargeAttack(attackPerRound: number): number {
  return Math.floor(attackPerRound * 2.2);
}

/** 层数 → 玩家基础 HP */
export function playerHpForLayer(layer: number): number {
  if (layer <= 3) return 20;
  if (layer <= 6) return 30;
  return 40;
}

/**
 * 根据层数创建 Boss（使用数值表）
 * 属性循环：layer 1 → WATER, 2 → FIRE, 3 → GRASS, ...
 */
export function createBossForLayer(layer: number): BossState {
  const hp = BOSS_HP[layer] ?? BOSS_HP[10];
  const atk = BOSS_ATK[layer] ?? BOSS_ATK[10];
  const element: Element = ALL_ELEMENTS[(layer - 1) % 3];

  return createBossState({
    id: `boss_layer_${layer}`,
    layer,
    element,
    hp,
    maxHp: hp,
    attackPerRound: atk,
  });
}

export { type BossState } from '../types/state.js';
