import { createBossState, BOSS_WEIGHTS_BY_LAYER } from '../types/state.js';
import { ALL_ELEMENTS } from '../types/card.js';
import type { BossState } from '../types/state.js';
import type { Element } from '../types/card.js';

// Layers 1-10: fixed table (from calc.py simulation)
const BOSS_HP: Record<number, number> = {
  1: 543, 2: 570, 3: 647, 4: 780, 5: 966,
  6: 1144, 7: 1292, 8: 1450, 9: 1586, 10: 1760,
};

const BOSS_ATK: Record<number, number> = {
  1: 3, 2: 4, 3: 4, 4: 9, 5: 10,
  6: 10, 7: 19, 8: 21, 9: 22, 10: 23,
};

export function calcChargeAttack(attackPerRound: number): number {
  return Math.floor(attackPerRound * 2.2);
}

// Tiered player HP: UX snap points (no formula exposure)
const HP_TIERS: [number, number][] = [
  [5, 20], [10, 30], [15, 40], [20, 50],
  [25, 60], [30, 70], [35, 80], [40, 90],
  [45, 100], [50, 110],
];

export function playerHpForLayer(layer: number): number {
  for (const [upTo, hp] of HP_TIERS) {
    if (layer <= upTo) return hp;
  }
  return 120;
}

// L11+: extrapolated from L10 anchor
// boss_hp(L) = round(L10_HP * 1.06^(L-10))
// boss_atk(L) = L10_ATK + (L-10)
function extrapolateBossHp(layer: number): number {
  return Math.round(1760 * Math.pow(1.06, layer - 10));
}

function extrapolateBossAtk(layer: number): number {
  return 23 + (layer - 10);
}

export function createBossForLayer(layer: number): BossState {
  const hp = BOSS_HP[layer] ?? extrapolateBossHp(layer);
  const atk = BOSS_ATK[layer] ?? extrapolateBossAtk(layer);
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
