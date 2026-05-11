import { HAND_TYPE } from '../types/card.js';
import type { Card, HandType } from '../types/card.js';
import type { Buff } from '../types/buff.js';

// ══════════════════════════════════════════════════════════════════
//  牌型底分 + 倍率表
// ══════════════════════════════════════════════════════════════════

export const HAND_SCORES: Record<HandType, { chips: number; mult: number }> = {
  STRAIGHT_FLUSH:  { chips: 100, mult: 8 },
  FOUR_OF_A_KIND:  { chips: 60,  mult: 7 },
  FULL_HOUSE:      { chips: 40,  mult: 6 },
  FLUSH:           { chips: 35,  mult: 4 },
  STRAIGHT:        { chips: 30,  mult: 4 },
  THREE_OF_A_KIND: { chips: 30,  mult: 3 },
  TWO_PAIR:        { chips: 20,  mult: 2 },
  PAIR:            { chips: 10,  mult: 2 },
  HIGH_CARD:       { chips: 5,   mult: 1 },
};

// ══════════════════════════════════════════════════════════════════
//  牌型检测
// ══════════════════════════════════════════════════════════════════

export interface HandResult { type: HandType; chips: number; mult: number }

export function identifyHand(cards: Card[]): HandResult {
  const type = detectHandType(cards);
  const { chips, mult } = HAND_SCORES[type];
  return { type, chips, mult };
}

/**
 * 检测牌型。若选中牌包含破坏牌型的杂牌（如 5 同花 + 1 杂色），将降级。
 */
export function detectHandType(cards: Card[]): HandType {
  const n = cards.length;
  if (n === 0) return HAND_TYPE.HIGH_CARD;

  const isAllSameElement = cards.every(c => c.element === cards[0].element);
  const isStraightResult = checkStraight(cards);

  if (n >= 5 && isAllSameElement && isStraightResult) return HAND_TYPE.STRAIGHT_FLUSH;

  const { maxCount, pairCount } = getRankStats(cards);

  if (maxCount === 4) return HAND_TYPE.FOUR_OF_A_KIND;
  if (maxCount === 3 && pairCount >= 1) return HAND_TYPE.FULL_HOUSE;
  if (n >= 5 && isAllSameElement) return HAND_TYPE.FLUSH;
  if (n >= 5 && isStraightResult) return HAND_TYPE.STRAIGHT;
  if (maxCount === 3) return HAND_TYPE.THREE_OF_A_KIND;
  if (pairCount >= 2) return HAND_TYPE.TWO_PAIR;
  if (maxCount === 2) return HAND_TYPE.PAIR;

  return HAND_TYPE.HIGH_CARD;
}

// ══════════════════════════════════════════════════════════════════
//  辅助函数
// ══════════════════════════════════════════════════════════════════

function getRankStats(cards: Card[]): { maxCount: number; pairCount: number } {
  const acc: Record<number, number> = {};
  for (const c of cards) {
    acc[c.rank] = (acc[c.rank] ?? 0) + 1;
  }
  let maxCount = 0;
  let pairCount = 0;
  for (const cnt of Object.values(acc)) {
    if (cnt > maxCount) maxCount = cnt;
    if (cnt === 2) pairCount++;
  }
  return { maxCount, pairCount };
}

function checkStraight(cards: Card[]): boolean {
  if (cards.length < 5) return false;
  const ranks = [...new Set(cards.map(c => c.rank))].sort((a, b) => a - b);
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  return true;
}

export function getRankCounts(cards: Card[]): Record<number, number> {
  const acc: Record<number, number> = {};
  for (const c of cards) {
    acc[c.rank] = (acc[c.rank] ?? 0) + 1;
  }
  return acc;
}

// ══════════════════════════════════════════════════════════════════
//  伤害计算
// ══════════════════════════════════════════════════════════════════

export interface ScoreResult {
  handType: HandType;
  baseChips: number;
  cardChips: number;
  mult: number;
  total: number;
}

const COMMON_HANDS: HandType[]   = ['HIGH_CARD', 'PAIR', 'TWO_PAIR', 'THREE_OF_A_KIND'];
const RARE_HANDS: HandType[]     = ['STRAIGHT', 'FLUSH'];
const EPIC_HANDS: HandType[]     = ['FULL_HOUSE', 'FOUR_OF_A_KIND', 'STRAIGHT_FLUSH'];

export function getHandTier(handType: HandType): 'common' | 'rare' | 'epic' {
  if (COMMON_HANDS.includes(handType)) return 'common';
  if (RARE_HANDS.includes(handType))   return 'rare';
  return 'epic';
}

/**
 * 8 步顺序应用 buff：
 *   1. 查表取 base chips + base mult
 *   2. HAND_CHIPS_BONUS → base chips += bonusChips（单牌型，保留兼容）
 *   3. HAND_MULT_BONUS → mult += bonusMult（单牌型，保留兼容）
 *   4. TIERED_CHIPS_BONUS → 根据牌型稀有度加底分
 *   5. TIERED_MULT_BONUS → 根据牌型稀有度加倍率
 *   6. 每张牌 chip：ELEMENT_CHIP_MULT → ELEMENT_CHIPS_BONUS → ALL_CHIPS_BONUS
 *   7. total = floor((baseChips + cardChips) × mult)
 *   8. isDefending → total = floor(total × 0.5)
 */
export function calculateDamage(cards: Card[], buffs: Buff[] = [], isDefending: boolean = false): ScoreResult {
  const hand = identifyHand(cards);

  let baseChips = hand.chips;
  let mult = hand.mult;

  for (const buff of buffs) {
    if (buff.type === 'HAND_CHIPS_BONUS' && buff.handType === hand.type) {
      baseChips += buff.bonusChips;
    }
    if (buff.type === 'HAND_MULT_BONUS' && buff.handType === hand.type) {
      mult += buff.bonusMult;
    }
  }

  const tier = getHandTier(hand.type);
  for (const buff of buffs) {
    if (buff.type === 'TIERED_CHIPS_BONUS') {
      baseChips += tier === 'common' ? buff.commonBonus : tier === 'rare' ? buff.rareBonus : buff.epicBonus;
    }
    if (buff.type === 'TIERED_MULT_BONUS') {
      mult += tier === 'common' ? buff.commonMult : tier === 'rare' ? buff.rareMult : buff.epicMult;
    }
  }

  let cardChips = 0;
  for (const card of cards) {
    let chip = card.chipValue;

    for (const buff of buffs) {
      if (buff.type === 'ELEMENT_CHIP_MULT' && buff.element === card.element) {
        chip *= buff.mult;
      }
    }
    for (const buff of buffs) {
      if (buff.type === 'ELEMENT_CHIPS_BONUS' && buff.element === card.element) {
        chip += buff.bonusChips;
      }
    }
    for (const buff of buffs) {
      if (buff.type === 'ALL_CHIPS_BONUS') {
        chip += buff.bonusChips;
      }
    }

    cardChips += chip;
  }

  let total = Math.floor((baseChips + cardChips) * mult);

  if (isDefending) {
    total = Math.floor(total * 0.5);
  }

  return {
    handType: hand.type,
    baseChips,
    cardChips: Math.round(cardChips * 100) / 100,
    mult,
    total,
  };
}
