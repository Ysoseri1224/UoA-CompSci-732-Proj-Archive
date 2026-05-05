// ── 属性 ────────────────────────────────────────────────────────
export type Element = 'WATER' | 'FIRE' | 'GRASS';
export const ALL_ELEMENTS: Element[] = ['WATER', 'FIRE', 'GRASS'];

// ── 点数 ────────────────────────────────────────────────────────
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export const ALL_RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// ── 牌型 ────────────────────────────────────────────────────────
export type HandType =
  | 'STRAIGHT_FLUSH' | 'FOUR_OF_A_KIND' | 'FULL_HOUSE'
  | 'FLUSH' | 'STRAIGHT' | 'THREE_OF_A_KIND'
  | 'TWO_PAIR' | 'PAIR' | 'HIGH_CARD';

export const HAND_TYPE: Record<HandType, HandType> = {
  STRAIGHT_FLUSH:  'STRAIGHT_FLUSH',
  FOUR_OF_A_KIND:  'FOUR_OF_A_KIND',
  FULL_HOUSE:      'FULL_HOUSE',
  FLUSH:           'FLUSH',
  STRAIGHT:        'STRAIGHT',
  THREE_OF_A_KIND: 'THREE_OF_A_KIND',
  TWO_PAIR:        'TWO_PAIR',
  PAIR:            'PAIR',
  HIGH_CARD:       'HIGH_CARD',
};

// ── 牌型优先级 ──────────────────────────────────────────────────
export const HAND_TYPE_ORDER: HandType[] = [
  'STRAIGHT_FLUSH',
  'FOUR_OF_A_KIND',
  'FULL_HOUSE',
  'FLUSH',
  'STRAIGHT',
  'THREE_OF_A_KIND',
  'TWO_PAIR',
  'PAIR',
  'HIGH_CARD',
];

// ── 卡牌唯一 ID ─────────────────────────────────────────────────
export type CardId = string; // 格式: "{Element}_{Rank}"

// ── 卡牌数据结构 ─────────────────────────────────────────────────
export interface Card {
  id: CardId;
  element: Element;
  rank: Rank;
  displayRank: string;
  chipValue: number;
}

// ── 工厂函数 ────────────────────────────────────────────────────

export function rankToDisplay(rank: Rank): string {
  if (rank === 1)  return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

export function rankToChipValue(rank: Rank): number {
  return rank;
}

export function createCard(element: Element, rank: Rank): Card {
  return {
    id: `${element}_${rank}`,
    element,
    rank,
    displayRank: rankToDisplay(rank),
    chipValue:   rankToChipValue(rank),
  };
}

export function createFullDeck(): Card[] {
  const deck: Card[] = [];
  for (const element of ALL_ELEMENTS) {
    for (const rank of ALL_RANKS) {
      deck.push(createCard(element, rank));
    }
  }
  return deck;
}
