import type { Element, HandType } from './card.js';
import type { PlayerState } from './state.js';

export interface HandMultBonus     { type: 'HAND_MULT_BONUS';     handType: HandType; bonusMult: number }
export interface HandChipsBonus    { type: 'HAND_CHIPS_BONUS';     handType: HandType; bonusChips: number }
export interface AllChipsBonus     { type: 'ALL_CHIPS_BONUS';      bonusChips: number }
export interface ElementChipMult   { type: 'ELEMENT_CHIP_MULT';    element: Element;  mult: number }
export interface ElementChipsBonus { type: 'ELEMENT_CHIPS_BONUS';  element: Element;  bonusChips: number }
export interface ElementDrawBuff   { type: 'ELEMENT_DRAW_ON_SHUFFLE'; element: Element }
export interface HighRankDrawBuff  { type: 'HIGH_RANK_DRAW_ON_SHUFFLE' }
export interface HpBonusBuff       { type: 'HP_BONUS'; bonusHp: number }

export interface SkillEnergyMaxBuff { type: 'SKILL_ENERGY_MAX'; bonusEnergy: number }

export type Buff = HandMultBonus | HandChipsBonus | AllChipsBonus | ElementChipMult | ElementChipsBonus | ElementDrawBuff | HighRankDrawBuff | HpBonusBuff | SkillEnergyMaxBuff;

export const BUFF_TYPE = {
  HAND_MULT_BONUS: 'HAND_MULT_BONUS', HAND_CHIPS_BONUS: 'HAND_CHIPS_BONUS',
  ALL_CHIPS_BONUS: 'ALL_CHIPS_BONUS', ELEMENT_CHIP_MULT: 'ELEMENT_CHIP_MULT',
  ELEMENT_CHIPS_BONUS: 'ELEMENT_CHIPS_BONUS', ELEMENT_DRAW_ON_SHUFFLE: 'ELEMENT_DRAW_ON_SHUFFLE',
  HIGH_RANK_DRAW_ON_SHUFFLE: 'HIGH_RANK_DRAW_ON_SHUFFLE',
  HP_BONUS: 'HP_BONUS',
  SKILL_ENERGY_MAX: 'SKILL_ENERGY_MAX',
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

export function createHpBonus(bonusHp: number = 5): HpBonusBuff {
  return { type: 'HP_BONUS', bonusHp };
}

export function createSkillEnergyMax(bonusEnergy: number = 1): SkillEnergyMaxBuff {
  return { type: 'SKILL_ENERGY_MAX', bonusEnergy };
}

// ── 第一层：固定 3 选 1 ─────────────────────────────────────────
export const FIRST_LAYER_UPGRADES: Upgrade[] = [
  createUpgrade('water_spec', '水系专精', '水系牌 chip ×1.1', createElementChipMult('WATER')),
  createUpgrade('fire_spec',  '火系专精', '火系牌 chip ×1.1', createElementChipMult('FIRE')),
  createUpgrade('grass_spec', '草系专精', '草系牌 chip ×1.1', createElementChipMult('GRASS')),
];

// ── 玩家属性 buff 计算 ───────────────────────────────────────────

/** 扫描 buff 数组，计算 HP_BONUS / SKILL_ENERGY_MAX 对玩家属性的最终影响 */
export function applyPlayerBuffs(
  buffs: Buff[],
  baseMaxHp: number,
  baseSkillEnergyMax: number,
): { maxHp: number; skillEnergyMax: number } {
  let maxHp = baseMaxHp;
  let skillEnergyMax = baseSkillEnergyMax;
  for (const buff of buffs) {
    if (buff.type === 'HP_BONUS')       maxHp += buff.bonusHp;
    if (buff.type === 'SKILL_ENERGY_MAX') skillEnergyMax += buff.bonusEnergy;
  }
  return { maxHp, skillEnergyMax };
}

// ── 后续层候选池 ────────────────────────────────────────────────

const ELEMENT_NAMES: Record<Element, string> = { WATER: '水系', FIRE: '火系', GRASS: '草系' };

export function generateUpgradePool(
  chosenElement: Element,
  layer: number,
  excludeTypes: string[] = [],
): Upgrade[] {
  const el = ELEMENT_NAMES[chosenElement];

  const all: Upgrade[] = [
    // ── 属性专属 ──
    createUpgrade(`${chosenElement}_mult_${layer}`, `${el}强化`, `${el}牌 chip ×1.1（可叠加）`, createElementChipMult(chosenElement)),
    createUpgrade(`${chosenElement}_chips_${layer}`, `${el}充能`, `${el}牌每张 +5 chip（可叠加）`, createElementChipsBonus(chosenElement, 5)),
    createUpgrade(`${chosenElement}_draw_${layer}`, 'Shuffle保底', `每次 Shuffle 保证获得一张 ${el}牌`, createElementDrawBuff(chosenElement)),
    createUpgrade(`high_rank_draw_${layer}`, '高费保底', '每次 Shuffle 保证获得一张 K（13点）牌', createHighRankDrawBuff()),

    // ── 通用伤害 ──
    createUpgrade(`all_chips_${layer}`, '固伤强化', '每张打出牌额外 +2 chip（可叠加）', createAllChipsBonus(2)),

    // ── 牌型底分（常见 +10 / 稀有 +20 / 史诗 +35）──
    createUpgrade(`pair_chips_${layer}`,       '一对·底分',       '一对牌型底分 +10（可叠加）',     createHandChipsBonus('PAIR', 10)),
    createUpgrade(`two_pair_chips_${layer}`,   '两对·底分',       '两对牌型底分 +10（可叠加）',     createHandChipsBonus('TWO_PAIR', 10)),
    createUpgrade(`three_kind_chips_${layer}`, '三条·底分',       '三条牌型底分 +10（可叠加）',     createHandChipsBonus('THREE_OF_A_KIND', 10)),
    createUpgrade(`flush_chips_${layer}`,      '同花·底分',       '同花牌型底分 +20（可叠加）',     createHandChipsBonus('FLUSH', 20)),
    createUpgrade(`straight_chips_${layer}`,   '顺子·底分',       '顺子牌型底分 +20（可叠加）',     createHandChipsBonus('STRAIGHT', 20)),
    createUpgrade(`full_house_chips_${layer}`, '葫芦·底分',       '葫芦牌型底分 +35（可叠加）',     createHandChipsBonus('FULL_HOUSE', 35)),
    createUpgrade(`four_kind_chips_${layer}`,  '四条·底分',       '四条牌型底分 +35（可叠加）',     createHandChipsBonus('FOUR_OF_A_KIND', 35)),
    createUpgrade(`str_flush_chips_${layer}`,  '同花顺·底分',     '同花顺牌型底分 +35（可叠加）',   createHandChipsBonus('STRAIGHT_FLUSH', 35)),

    // ── 牌型倍率（常见 +0 不入池，稀有 +2 / 史诗 +3）──
    createUpgrade(`straight_mult_${layer}`,    '顺子·倍率',       '顺子牌型倍率 +2（可叠加）',      createHandMultBonus('STRAIGHT', 2)),
    createUpgrade(`flush_mult_${layer}`,       '同花·倍率',       '同花牌型倍率 +2（可叠加）',      createHandMultBonus('FLUSH', 2)),
    createUpgrade(`full_house_mult_${layer}`,  '葫芦·倍率',       '葫芦牌型倍率 +3（可叠加）',      createHandMultBonus('FULL_HOUSE', 3)),
    createUpgrade(`four_kind_mult_${layer}`,   '四条·倍率',       '四条牌型倍率 +3（可叠加）',      createHandMultBonus('FOUR_OF_A_KIND', 3)),
    createUpgrade(`str_flush_mult_${layer}`,   '同花顺·倍率',     '同花顺牌型倍率 +3（可叠加）',    createHandMultBonus('STRAIGHT_FLUSH', 3)),

    // ── 生存 ──
    createUpgrade(`hp_boost_${layer}`, '生命强化', '最大 HP +5（可叠加）', createHpBonus(5)),

    // ── 工具（唯一）──
    createUpgrade(`skill_energy_${layer}`, '充能扩容', '技能充能上限 +1（唯一）', createSkillEnergyMax(1)),
  ];

  const pool = all.filter(u => !excludeTypes.includes(u.buff.type));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}
