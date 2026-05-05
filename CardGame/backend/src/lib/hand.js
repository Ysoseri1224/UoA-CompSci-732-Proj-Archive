import { HAND_TYPE, HAND_TYPE_ORDER } from '../types/card.js';

// ══════════════════════════════════════════════════════════════════
//  牌型底分 + 倍率表
// ══════════════════════════════════════════════════════════════════

/** @type {Record<import('../types/card.js').HandType, { chips: number, mult: number }>} */
export const HAND_SCORES = {
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

/**
 * @param {import('../types/card.js').Card[]} cards
 * @returns {{ type: import('../types/card.js').HandType, chips: number, mult: number }}
 */
export function identifyHand(cards) {
  const type = detectHandType(cards);
  const { chips, mult } = HAND_SCORES[type];
  return { type, chips, mult };
}

/**
 * 检测牌型。若选中牌包含破坏牌型的杂牌（如 5 同花 + 1 杂色），将降级。
 * @param {import('../types/card.js').Card[]} cards
 * @returns {import('../types/card.js').HandType}
 */
export function detectHandType(cards) {
  const n = cards.length;

  if (n === 0) return HAND_TYPE.HIGH_CARD;

  const isAllSameElement = cards.every(c => c.element === cards[0].element);

  // Straight flush: all same element + all consecutive (A-5 or 2-6 etc.)
  const isStraightResult = checkStraight(cards);
  if (n >= 5 && isAllSameElement && isStraightResult) {
    return HAND_TYPE.STRAIGHT_FLUSH;
  }

  // Four of a kind
  const { counts, maxCount } = getRankStats(cards);
  if (maxCount === 4) return HAND_TYPE.FOUR_OF_A_KIND;

  // Full house
  if (maxCount === 3 && counts.some(entry => entry[1] === 2)) return HAND_TYPE.FULL_HOUSE;

  // Flush: all same element, at least 5 cards
  if (n >= 5 && isAllSameElement) return HAND_TYPE.FLUSH;

  // Straight: all ranks consecutive, at least 5 cards
  if (n >= 5 && isStraightResult) return HAND_TYPE.STRAIGHT;

  // Three of a kind
  if (maxCount === 3) return HAND_TYPE.THREE_OF_A_KIND;

  // Two pair
  const pairCount = counts.filter(entry => entry[1] === 2).length;
  if (pairCount >= 2) return HAND_TYPE.TWO_PAIR;

  // Pair
  if (maxCount === 2) return HAND_TYPE.PAIR;

  return HAND_TYPE.HIGH_CARD;
}

// ══════════════════════════════════════════════════════════════════
//  辅助函数
// ══════════════════════════════════════════════════════════════════

/**
 * 统计各 rank 出现次数，返回按次数降序排列的 entries 和最大出现次数
 * @param {import('../types/card.js').Card[]} cards
 * @returns {{ counts: [number, number][], maxCount: number }}
 */
function getRankStats(cards) {
  /** @type {Record<number, number>} */
  const acc = {};
  for (const c of cards) {
    acc[c.rank] = (acc[c.rank] ?? 0) + 1;
  }
  const entries = Object.entries(acc).map(([r, cnt]) => [Number(r), cnt]);
  entries.sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  return { counts: entries, maxCount: entries.length > 0 ? entries[0][1] : 0 };
}

/**
 * 顺子检测：去重后排序，检查是否连续。A 固定当高牌(11)（暂不实现 A-5 轮转）。
 * 所有选中牌必须参与连续序列（不能有孤立的杂牌）。
 * @param {import('../types/card.js').Card[]} cards
 * @returns {boolean}
 */
function checkStraight(cards) {
  if (cards.length < 5) return false;
  const ranks = [...new Set(cards.map(c => c.rank))].sort((a, b) => a - b);

  // 所有去重后的 ranks 必须连续
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  return true;
}

/**
 * 获取 rank 计数（供外部使用）
 * @param {import('../types/card.js').Card[]} cards
 * @returns {Record<number, number>}
 */
export function getRankCounts(cards) {
  /** @type {Record<number, number>} */
  const acc = {};
  for (const c of cards) {
    acc[c.rank] = (acc[c.rank] ?? 0) + 1;
  }
  return acc;
}

// ══════════════════════════════════════════════════════════════════
//  伤害计算
// ══════════════════════════════════════════════════════════════════

/**
 * @typedef {{ handType: import('../types/card.js').HandType, baseChips: number, cardChips: number, mult: number, total: number }} ScoreResult
 */

/**
 * 计算最终伤害 = floor((baseChips + cardChips) × mult)
 * 应用 Buff 加成（属性伤害乘数作用于匹配属性的牌的贡献点数）。
 *
 * @param {import('../types/card.js').Card[]} cards
 * @param {import('../types/buff.js').Buff[]} [buffs]
 * @returns {ScoreResult}
 */
export function calculateDamage(cards, buffs = []) {
  const hand = identifyHand(cards);
  let cardChips = cards.reduce((sum, c) => sum + c.chipValue, 0);

  let baseChips = hand.chips;
  let mult = hand.mult;

  // 应用属性伤害加成 Buff
  for (const buff of buffs) {
    if (buff.type === 'ELEMENT_DAMAGE_MULT') {
      for (const card of cards) {
        if (card.element === buff.element) {
          // 该属性牌的点数部分乘以增幅系数
          cardChips += card.chipValue * (buff.value - 1);
        }
      }
    }
  }

  const total = Math.floor((baseChips + cardChips) * mult);

  return {
    handType: hand.type,
    baseChips,
    cardChips: Math.round(cardChips * 100) / 100, // 保留精度
    mult,
    total,
  };
}
