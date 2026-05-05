// ── 属性 ────────────────────────────────────────────────────────
/** @typedef {'WATER' | 'FIRE' | 'GRASS'} Element */

export const ALL_ELEMENTS = /** @type {Element[]} */ (['WATER', 'FIRE', 'GRASS']);

// ── 点数 ────────────────────────────────────────────────────────
/** @typedef {1|2|3|4|5|6|7|8|9|10|11|12|13} Rank */

export const ALL_RANKS = /** @type {Rank[]} */ ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);

// ── 牌型 ────────────────────────────────────────────────────────
/** @typedef {'STRAIGHT_FLUSH'|'FOUR_OF_A_KIND'|'FULL_HOUSE'|'FLUSH'|'STRAIGHT'|'THREE_OF_A_KIND'|'TWO_PAIR'|'PAIR'|'HIGH_CARD'} HandType */

export const HAND_TYPE = /** @type {Record<HandType, HandType>} */ ({
  STRAIGHT_FLUSH:  'STRAIGHT_FLUSH',
  FOUR_OF_A_KIND:  'FOUR_OF_A_KIND',
  FULL_HOUSE:      'FULL_HOUSE',
  FLUSH:           'FLUSH',
  STRAIGHT:        'STRAIGHT',
  THREE_OF_A_KIND: 'THREE_OF_A_KIND',
  TWO_PAIR:        'TWO_PAIR',
  PAIR:            'PAIR',
  HIGH_CARD:       'HIGH_CARD',
});

// ── 牌型优先级（从高到低，用于比较）────────────────────────────
export const HAND_TYPE_ORDER = /** @type {HandType[]} */ ([
  'STRAIGHT_FLUSH',
  'FOUR_OF_A_KIND',
  'FULL_HOUSE',
  'FLUSH',
  'STRAIGHT',
  'THREE_OF_A_KIND',
  'TWO_PAIR',
  'PAIR',
  'HIGH_CARD',
]);

// ── 卡牌唯一 ID ─────────────────────────────────────────────────
/** @typedef {string} CardId   格式: "{Element}_{Rank}" */

// ── 卡牌数据结构 ─────────────────────────────────────────────────
/** @typedef {{ id: CardId, element: Element, rank: Rank, displayRank: string, chipValue: number }} Card */

/**
 * 点数 → 展示文字
 * @param {Rank} rank
 * @returns {string}
 */
export function rankToDisplay(rank) {
  if (rank === 1)  return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

/**
 * 点数 → 计分用点数值 A=11, 2-10=面值, J/Q/K=10
 * @param {Rank} rank
 * @returns {number}
 */
export function rankToChipValue(rank) {
  if (rank === 1)               return 11;
  if (rank >= 11 && rank <= 13) return 10;
  return rank;
}

/**
 * 创建卡牌
 * @param {Element} element
 * @param {Rank} rank
 * @returns {Card}
 */
export function createCard(element, rank) {
  return {
    id: `${element}_${rank}`,
    element,
    rank,
    displayRank: rankToDisplay(rank),
    chipValue:   rankToChipValue(rank),
  };
}

/**
 * 生成完整 39 张牌库（有序，未洗牌）
 * @returns {Card[]}
 */
export function createFullDeck() {
  const deck = [];
  for (const element of ALL_ELEMENTS) {
    for (const rank of ALL_RANKS) {
      deck.push(createCard(element, rank));
    }
  }
  return deck;
}
