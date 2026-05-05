import { createFullDeck } from '../types/card.js';
import type { Card } from '../types/card.js';

export interface DeckState {
  deck: Card[];
  discardPile: Card[];
  hand: Card[];
}

/**
 * Fisher-Yates 原地洗牌，返回新数组
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 洗牌后抽 7 张手牌
 */
export function initDeckState(): DeckState {
  const deck = shuffle(createFullDeck());
  return { deck: deck.slice(7), discardPile: [], hand: deck.slice(0, 7) };
}

/**
 * 从牌堆顶抽 n 张。牌堆不足时先把弃牌堆洗回牌堆。
 */
export function drawCards(state: DeckState, n: number): DeckState {
  if (n <= 0) return { ...state, deck: [...state.deck], discardPile: [...state.discardPile], hand: [...state.hand] };

  let deck = [...state.deck];
  let discardPile = [...state.discardPile];
  let hand = [...state.hand];

  if (deck.length < n) {
    deck = shuffle([...deck, ...discardPile]);
    discardPile = [];
  }

  const drawn = deck.splice(0, Math.min(n, deck.length));
  hand = [...hand, ...drawn];

  return { deck, discardPile, hand };
}

/**
 * 选中牌进弃牌堆，然后补至 7 张
 */
export function playCards(state: DeckState, cardIds: string[]): DeckState {
  const idSet = new Set(cardIds);
  const played  = state.hand.filter(c => idSet.has(c.id));
  const newHand = state.hand.filter(c => !idSet.has(c.id));
  const newDiscard = [...state.discardPile, ...played];
  const needed = 7 - newHand.length;
  return drawCards({ deck: state.deck, discardPile: newDiscard, hand: newHand }, needed);
}

/**
 * 弃置选中牌 → 从现有牌堆（不含刚弃置的牌）抽等量 → 刚弃置的牌回弃牌堆
 */
export function shuffleHand(state: DeckState, cardIds: string[]): DeckState {
  const idSet = new Set(cardIds);
  const discarded = state.hand.filter(c => idSet.has(c.id));
  const remaining = state.hand.filter(c => !idSet.has(c.id));

  if (discarded.length === 0) return { ...state, deck: [...state.deck], discardPile: [...state.discardPile], hand: [...state.hand] };

  const n = discarded.length;
  let workingDeck = [...state.deck];
  let workingDiscard = [...state.discardPile];

  if (workingDeck.length < n) {
    workingDeck = shuffle([...workingDeck, ...workingDiscard]);
    workingDiscard = [];
  }

  const drawn = workingDeck.splice(0, n);
  const newHand = [...remaining, ...drawn];
  const newDiscard = [...workingDiscard, ...discarded];

  return { deck: workingDeck, discardPile: newDiscard, hand: newHand };
}
