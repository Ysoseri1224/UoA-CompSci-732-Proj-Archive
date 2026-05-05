import { createFullDeck } from '../types/card.js';

// ── 洗牌 ────────────────────────────────────────────────────────
/**
 * Fisher-Yates 原地洗牌，返回新数组
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── 初始化 ──────────────────────────────────────────────────────
/**
 * 洗牌后抽 7 张手牌
 * @returns {DeckState}
 */
export function initDeckState() {
  const deck = shuffle(createFullDeck());
  return {
    deck:        deck.slice(7),
    discardPile: [],
    hand:        deck.slice(0, 7),
  };
}

// ── 补牌 ────────────────────────────────────────────────────────
/**
 * 从牌堆顶抽 n 张。牌堆不足时先把弃牌堆洗回牌堆。
 * @param {DeckState} state
 * @param {number} n
 * @returns {DeckState}
 */
export function drawCards(state, n) {
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

// ── 打出手牌 ────────────────────────────────────────────────────
/**
 * 选中牌进弃牌堆，然后补至 7 张
 * @param {DeckState} state
 * @param {string[]} cardIds
 * @returns {DeckState}
 */
export function playCards(state, cardIds) {
  const idSet = new Set(cardIds);
  const played  = state.hand.filter(c => idSet.has(c.id));
  const newHand = state.hand.filter(c => !idSet.has(c.id));

  const newDiscard = [...state.discardPile, ...played];

  const needed = 7 - newHand.length;
  return drawCards(
    { deck: state.deck, discardPile: newDiscard, hand: newHand },
    needed
  );
}

// ── Shuffle 手牌 ────────────────────────────────────────────────
/**
 * 弃置选中牌 → 从现有牌堆（不含刚弃置的牌）抽等量 → 刚弃置的牌回弃牌堆
 * @param {DeckState} state
 * @param {string[]} cardIds
 * @returns {DeckState}
 */
export function shuffleHand(state, cardIds) {
  const idSet = new Set(cardIds);

  // Step 1: 移除选中牌（暂存）
  const discarded = state.hand.filter(c => idSet.has(c.id));
  const remaining = state.hand.filter(c => !idSet.has(c.id));

  if (discarded.length === 0) return { ...state, deck: [...state.deck], discardPile: [...state.discardPile], hand: [...state.hand] };

  // Step 2: 从现有牌堆抽等量（不含刚弃置的牌）
  const n = discarded.length;
  let workingDeck = [...state.deck];
  let workingDiscard = [...state.discardPile];

  if (workingDeck.length < n) {
    workingDeck = shuffle([...workingDeck, ...workingDiscard]);
    workingDiscard = [];
  }

  const drawn = workingDeck.splice(0, n);
  const newHand = [...remaining, ...drawn];

  // Step 3: 刚弃置的牌回弃牌堆
  const newDiscard = [...workingDiscard, ...discarded];

  return { deck: workingDeck, discardPile: newDiscard, hand: newHand };
}

// ── 牌堆状态类型 ────────────────────────────────────────────────
/**
 * @typedef {{
 *   deck: import('../types/card.js').Card[],
 *   discardPile: import('../types/card.js').Card[],
 *   hand: import('../types/card.js').Card[]
 * }} DeckState
 */
