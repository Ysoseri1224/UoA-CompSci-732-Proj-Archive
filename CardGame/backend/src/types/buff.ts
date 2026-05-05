import type { Element, HandType } from './card.js';

export interface HandMultBonus     { type: 'HAND_MULT_BONUS';     handType: HandType; bonusMult: number }
export interface HandChipsBonus    { type: 'HAND_CHIPS_BONUS';     handType: HandType; bonusChips: number }
export interface AllChipsBonus     { type: 'ALL_CHIPS_BONUS';      bonusChips: number }
export interface ElementChipMult   { type: 'ELEMENT_CHIP_MULT';    element: Element;  mult: number }
export interface ElementChipsBonus { type: 'ELEMENT_CHIPS_BONUS';  element: Element;  bonusChips: number }
export interface ElementDrawBuff   { type: 'ELEMENT_DRAW_ON_SHUFFLE'; element: Element }
export interface HighRankDrawBuff  { type: 'HIGH_RANK_DRAW_ON_SHUFFLE' }

export type Buff = HandMultBonus | HandChipsBonus | AllChipsBonus | ElementChipMult | ElementChipsBonus | ElementDrawBuff | HighRankDrawBuff;

export const BUFF_TYPE = {
  HAND_MULT_BONUS: 'HAND_MULT_BONUS', HAND_CHIPS_BONUS: 'HAND_CHIPS_BONUS',
  ALL_CHIPS_BONUS: 'ALL_CHIPS_BONUS', ELEMENT_CHIP_MULT: 'ELEMENT_CHIP_MULT',
  ELEMENT_CHIPS_BONUS: 'ELEMENT_CHIPS_BONUS', ELEMENT_DRAW_ON_SHUFFLE: 'ELEMENT_DRAW_ON_SHUFFLE',
  HIGH_RANK_DRAW_ON_SHUFFLE: 'HIGH_RANK_DRAW_ON_SHUFFLE',
} as const;

export interface Upgrade { id: string; label: string; description: string; buff: Buff }

// ── 工厂函数 ────────────────────────────────────────────────────

export function createHandMultBonus(handType: HandType, bonusMult: number): HandMultBonus {
  return { type: 'HAND_MULT_BONUS', handType, bonusMult };
}
export function createHandChipsBonus(handType: HandType, bonusChips: number): HandChipsBonus {
  return { type: 'HAND_CHIPS_BONUS', handType, bonusChips };
}
export function createAllChipsBonus(bonusChips: number): AllChipsBonus {
  return { type: 'ALL_CHIPS_BONUS', bonusChips };
}
export function createElementChipMult(element: Element, mult: number = 1.1): ElementChipMult {
  return { type: 'ELEMENT_CHIP_MULT', element, mult };
}
export function createElementChipsBonus(element: Element, bonusChips: number): ElementChipsBonus {
  return { type: 'ELEMENT_CHIPS_BONUS', element, bonusChips };
}
export function createElementDrawBuff(element: Element): ElementDrawBuff {
  return { type: 'ELEMENT_DRAW_ON_SHUFFLE', element };
}
export function createHighRankDrawBuff(): HighRankDrawBuff {
  return { type: 'HIGH_RANK_DRAW_ON_SHUFFLE' };
}
export function createUpgrade(id: string, label: string, description: string, buff: Buff): Upgrade {
  return { id, label, description, buff };
}

// ── 第一层：固定 3 选 1 ─────────────────────────────────────────
export const FIRST_LAYER_UPGRADES: Upgrade[] = [
  createUpgrade('water_spec', '水系专精', '水系牌 chip ×1.1', createElementChipMult('WATER')),
  createUpgrade('fire_spec',  '火系专精', '火系牌 chip ×1.1', createElementChipMult('FIRE')),
  createUpgrade('grass_spec', '草系专精', '草系牌 chip ×1.1', createElementChipMult('GRASS')),
];

// ── 后续层候选池 ────────────────────────────────────────────────
export function generateUpgradePool(chosenElement: Element, layer: number): Upgrade[] {
  const pool: Upgrade[] = [
    createUpgrade(`${chosenElement}_mult_${layer}`, `${chosenElement} 强化`, `${chosenElement} 系牌 chip ×1.1（可叠加）`, createElementChipMult(chosenElement)),
    createUpgrade(`${chosenElement}_draw_${layer}`, 'Shuffle 保底', `每次 Shuffle 保证获得一张 ${chosenElement} 系牌`, createElementDrawBuff(chosenElement)),
    createUpgrade(`high_rank_draw_${layer}`, '高费保底', '每次 Shuffle 保证获得一张 K（13点）牌', createHighRankDrawBuff()),
  ];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}
