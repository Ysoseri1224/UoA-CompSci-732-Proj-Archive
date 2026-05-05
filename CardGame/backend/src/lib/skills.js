import { ALL_ELEMENTS } from '../types/card.js';

// ══════════════════════════════════════════════════════════════════
//  技能 1: 变色 skillChangeColor
// ══════════════════════════════════════════════════════════════════

/**
 * 将一张手牌替换为目标颜色的同 rank 牌。
 * 查找顺序：① 同 rank + 目标颜色；② 目标颜色中 rank 最接近的牌。
 * 替换牌不得已在当前手牌中。
 * 原牌进弃牌堆，新牌从牌堆/弃牌堆中移除。
 *
 * @param {DeckState} state
 * @param {string} cardId
 * @param {import('../types/card.js').Element} newElement
 * @returns {DeckState}
 */
export function skillChangeColor(state, cardId, newElement) {
  const target = state.hand.find(c => c.id === cardId);
  if (!target) return { deck: [...state.deck], discardPile: [...state.discardPile], hand: [...state.hand] };

  return swapCard({
    state,
    cardId,
    filter: (c) => c.id !== target.id && c.element === newElement,
    sortBy: (a, b) => Math.abs(a.rank - target.rank) - Math.abs(b.rank - target.rank),
  });
}

// ══════════════════════════════════════════════════════════════════
//  技能 2: 变费 skillChangeCost
// ══════════════════════════════════════════════════════════════════

/**
 * 将一张手牌替换为同颜色的目标 rank 牌。
 * 替换牌不得已在当前手牌中。
 *
 * @param {DeckState} state
 * @param {string} cardId
 * @param {import('../types/card.js').Rank} newRank
 * @returns {DeckState}
 */
export function skillChangeCost(state, cardId, newRank) {
  const target = state.hand.find(c => c.id === cardId);
  if (!target) return { deck: [...state.deck], discardPile: [...state.discardPile], hand: [...state.hand] };

  return swapCard({
    state,
    cardId,
    filter: (c) => c.id !== target.id && c.element === target.element && c.rank === newRank,
    sortBy: null, // exact match only
  });
}

// ══════════════════════════════════════════════════════════════════
//  通用替换逻辑
// ══════════════════════════════════════════════════════════════════

/**
 * @typedef {{
 *   state: DeckState,
 *   cardId: string,
 *   filter: (c: import('../types/card.js').Card) => boolean,
 *   sortBy: ((a: import('../types/card.js').Card, b: import('../types/card.js').Card) => number) | null
 * }} SwapParams
 */

/**
 * 从牌堆+弃牌堆中查找替换牌，执行替换。原牌进弃牌堆。
 * @param {SwapParams} params
 * @returns {DeckState}
 */
function swapCard({ state, cardId, filter, sortBy }) {
  const target = state.hand.find(c => c.id === cardId);
  if (!target) return { deck: [...state.deck], discardPile: [...state.discardPile], hand: [...state.hand] };

  const handIds = new Set(state.hand.map(c => c.id));
  const pool = [...state.deck, ...state.discardPile];

  let candidates = pool.filter(c => filter(c) && !handIds.has(c.id));

  if (sortBy) {
    candidates.sort(sortBy);
  }

  const replacement = candidates[0];
  if (!replacement) return { deck: [...state.deck], discardPile: [...state.discardPile], hand: [...state.hand] };

  // 新牌从牌堆/弃牌堆中移除
  const newDeck = state.deck.filter(c => c.id !== replacement.id);
  let newDiscard = state.discardPile.filter(c => c.id !== replacement.id);

  // 原牌进弃牌堆
  newDiscard = [...newDiscard, target];

  // 手牌替换
  const newHand = state.hand.map(c => c.id === cardId ? replacement : c);

  return { deck: newDeck, discardPile: newDiscard, hand: newHand };
}

// ══════════════════════════════════════════════════════════════════
//  技能 3: 护盾
// ══════════════════════════════════════════════════════════════════

/**
 * @typedef {{ active: boolean, onCooldown: boolean }} ShieldState
 */

/**
 * 激活护盾（技能阶段玩家主动使用）
 * @param {ShieldState} shield
 * @returns {ShieldState}
 */
export function activateShield(shield) {
  if (shield.active || shield.onCooldown) return { ...shield };
  return { active: true, onCooldown: false };
}

/**
 * 护盾阻挡 Boss 攻击 → 碎裂，进入冷却
 * @param {ShieldState} shield
 * @returns {ShieldState}
 */
export function shatterShield(shield) {
  if (!shield.active) return { ...shield };
  return { active: false, onCooldown: true };
}

/**
 * Boss 死亡时护盾作废（不进入冷却）
 * @param {ShieldState} shield
 * @returns {ShieldState}
 */
export function voidShield(shield) {
  if (!shield.active) return { ...shield };
  return { active: false, onCooldown: false };
}

/**
 * 重置护盾冷却（每层开始等场景）
 * @param {ShieldState} shield
 * @returns {ShieldState}
 */
export function resetShieldCooldown(shield) {
  return { ...shield, onCooldown: false };
}

// ══════════════════════════════════════════════════════════════════
//  守卫条件
// ══════════════════════════════════════════════════════════════════

/**
 * 变色是否可用
 * @param {{ changeColor: { used: boolean } }} skills
 * @param {string} phase
 * @returns {boolean}
 */
export function canUseChangeColor(skills, phase) {
  return !skills.changeColor.used && phase === 'SKILL';
}

/**
 * 变费是否可用
 * @param {{ changeCost: { used: boolean } }} skills
 * @param {string} phase
 * @returns {boolean}
 */
export function canUseChangeCost(skills, phase) {
  return !skills.changeCost.used && phase === 'SKILL';
}

/**
 * 护盾是否可用
 * @param {ShieldState} shield
 * @param {string} phase
 * @returns {boolean}
 */
export function canUseShield(shield, phase) {
  return !shield.active && !shield.onCooldown && phase === 'SKILL';
}

/**
 * Shuffle 是否可用
 * @param {{ remaining: number }} shuffle
 * @param {string} phase
 * @returns {boolean}
 */
export function canShuffle(shuffle, phase) {
  return shuffle.remaining > 0 && phase === 'SHUFFLE';
}

/**
 * 出牌是否合法
 * @param {string[]} selectedCards
 * @param {string} phase
 * @returns {boolean}
 */
export function canPlay(selectedCards, phase) {
  return selectedCards.length >= 1 && phase === 'PLAY';
}

// ══════════════════════════════════════════════════════════════════
//  回合结束重置
// ══════════════════════════════════════════════════════════════════

/**
 * 重置每回合技能使用次数和 shuffle 次数
 * @param {import('../types/state.js').RoundSkills} skills
 * @param {{ remaining: number }} shuffle
 * @returns {{ skills: import('../types/state.js').RoundSkills, shuffle: { remaining: number } }}
 */
export function resetRoundSkills(skills, shuffle) {
  return {
    skills: {
      changeColor: { used: false },
      changeCost:  { used: false },
      shield:      { ...skills.shield }, // shield does NOT reset — persists across rounds
    },
    shuffle: { remaining: 2 },
  };
}

// ══════════════════════════════════════════════════════════════════
//  类型导入（JSDoc）
// ══════════════════════════════════════════════════════════════════
/** @typedef {import('./deck.js').DeckState} DeckState */
