import { createBossState, BOSS_WEIGHTS_BY_LAYER } from '../types/state.js';
import { ALL_ELEMENTS } from '../types/card.js';
import type { BossState } from '../types/state.js';
import type { Element } from '../types/card.js';

// ══════════════════════════════════════════════════════════════════
//  占位基础数值（待数值策划最终校准）
// ══════════════════════════════════════════════════════════════════

export const BASE_BOSS_HP     = 300;
export const BASE_BOSS_ATTACK = 5;
export const BASE_PLAYER_HP   = 20;

// ══════════════════════════════════════════════════════════════════
//  缩放公式
// ══════════════════════════════════════════════════════════════════

/** Boss HP 随层数增长 */
export function calcBossHp(layer: number): number {
  return Math.floor(BASE_BOSS_HP * (1 + 0.3 * (layer - 1)));
}

/** Boss 攻击力随层数增长 */
export function calcBossAttack(layer: number): number {
  return Math.floor(BASE_BOSS_ATTACK * (1 + 0.2 * (layer - 1)));
}

/** 蓄力爆发 = 攻击力 × 2.2 */
export function calcChargeAttack(attackPerRound: number): number {
  return Math.floor(attackPerRound * 2.2);
}

// ══════════════════════════════════════════════════════════════════
//  Boss 工厂
// ══════════════════════════════════════════════════════════════════

/**
 * 根据层数创建 Boss（数值按公式缩放）
 * 属性循环：layer 1 → FIRE, 2 → GRASS, 3 → WATER, ...
 */
export function createBossForLayer(layer: number): BossState {
  const hp = calcBossHp(layer);
  const atk = calcBossAttack(layer);
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
