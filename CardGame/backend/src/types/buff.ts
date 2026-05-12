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

export interface TieredChipsBonus  { type: 'TIERED_CHIPS_BONUS'; commonBonus: number; rareBonus: number; epicBonus: number }
export interface TieredMultBonus   { type: 'TIERED_MULT_BONUS';  commonMult: number;  rareMult: number;  epicMult: number }

export interface SkillEnergyMaxBuff { type: 'SKILL_ENERGY_MAX'; bonusEnergy: number }

export type Buff = HandMultBonus | HandChipsBonus | AllChipsBonus | ElementChipMult | ElementChipsBonus | ElementDrawBuff | HighRankDrawBuff | HpBonusBuff | TieredChipsBonus | TieredMultBonus | SkillEnergyMaxBuff;

export const BUFF_TYPE = {
  HAND_MULT_BONUS: 'HAND_MULT_BONUS', HAND_CHIPS_BONUS: 'HAND_CHIPS_BONUS',
  ALL_CHIPS_BONUS: 'ALL_CHIPS_BONUS', ELEMENT_CHIP_MULT: 'ELEMENT_CHIP_MULT',
  ELEMENT_CHIPS_BONUS: 'ELEMENT_CHIPS_BONUS', ELEMENT_DRAW_ON_SHUFFLE: 'ELEMENT_DRAW_ON_SHUFFLE',
  HIGH_RANK_DRAW_ON_SHUFFLE: 'HIGH_RANK_DRAW_ON_SHUFFLE',
  HP_BONUS: 'HP_BONUS',
  TIERED_CHIPS_BONUS: 'TIERED_CHIPS_BONUS', TIERED_MULT_BONUS: 'TIERED_MULT_BONUS',
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

export function createTieredChipsBonus(commonBonus: number, rareBonus: number, epicBonus: number): TieredChipsBonus {
  return { type: 'TIERED_CHIPS_BONUS', commonBonus, rareBonus, epicBonus };
}
export function createTieredMultBonus(commonMult: number, rareMult: number, epicMult: number): TieredMultBonus {
  return { type: 'TIERED_MULT_BONUS', commonMult, rareMult, epicMult };
}

export function createSkillEnergyMax(bonusEnergy: number = 1): SkillEnergyMaxBuff {
  return { type: 'SKILL_ENERGY_MAX', bonusEnergy };
}

// ── 第一层：固定 3 选 1 ─────────────────────────────────────────
export const FIRST_LAYER_UPGRADES: Upgrade[] = [
  createUpgrade('water_spec', 'Water Spec', 'Water cards chip ×1.1', createElementChipMult('WATER')),
  createUpgrade('fire_spec',  'Fire Spec', 'Fire cards chip ×1.1', createElementChipMult('FIRE')),
  createUpgrade('grass_spec', 'Grass Spec', 'Grass cards chip ×1.1', createElementChipMult('GRASS')),
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

const ELEMENT_NAMES: Record<Element, string> = { WATER: 'Water', FIRE: 'Fire', GRASS: 'Grass' };

export function generateUpgradePool(
  chosenElement: Element,
  layer: number,
  excludeTypes: string[] = [],
): Upgrade[] {
  const el = ELEMENT_NAMES[chosenElement];

  const all: Upgrade[] = [
    // ── Element-specific ──
    createUpgrade(`${chosenElement}_mult_${layer}`, `${el} Boost`, `${el} cards chip ×1.1 (stackable)`, createElementChipMult(chosenElement)),
    createUpgrade(`${chosenElement}_chips_${layer}`, `${el} Charge`, `${el} cards +5 chip each (stackable)`, createElementChipsBonus(chosenElement, 5)),
    createUpgrade(`${chosenElement}_draw_${layer}`, 'Shuffle Guarantee', `Each shuffle guarantees one ${el} card`, createElementDrawBuff(chosenElement)),
    createUpgrade(`high_rank_draw_${layer}`, 'High Rank Draw', 'Each shuffle guarantees one K (rank 13) card', createHighRankDrawBuff()),

    // ── Flat damage ──
    createUpgrade(`all_chips_${layer}`, 'Chip Boost', '+2 chip per played card (stackable)', createAllChipsBonus(2)),

    // ── Tiered hand buffs (common +10/+0 / rare +20/+2 / epic +35/+3) ──
    createUpgrade(`tiered_chips_${layer}`, 'Hand Chips', 'Common +10 / Rare +20 / Epic +35 base chips (stackable)', createTieredChipsBonus(10, 20, 35)),
    createUpgrade(`tiered_mult_${layer}`,  'Hand Mult', 'Rare +2 / Epic +3 multiplier (stackable)',    createTieredMultBonus(0, 2, 3)),

    // ── Survival ──
    createUpgrade(`hp_boost_${layer}`, 'Vitality', 'Max HP +5 (stackable)', createHpBonus(5)),

    // ── Tool (one-time) ──
    createUpgrade(`skill_energy_${layer}`, 'Energy Boost', 'Skill energy +1 (one-time only)', createSkillEnergyMax(1)),
  ];

  const pool = all.filter(u => !excludeTypes.includes(u.buff.type));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}
