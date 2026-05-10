import type { Card, Element, Rank } from '../types/card.js';
import type { DeckState } from './deck.js';
import type { RoundSkills } from '../types/state.js';

interface ShieldState {
  active: boolean;
  onCooldown: boolean;
}

interface SwapParams {
  state: DeckState;
  cardId: string;
  filter: (c: Card) => boolean;
  sortBy: ((a: Card, b: Card) => number) | null;
}

// ══════════════════════════════════════════════════════════════════
//  技能 1: 变色
// ══════════════════════════════════════════════════════════════════

/**
 * 将一张手牌替换为目标颜色的同 rank 牌。
 * 查找顺序：① 同 rank + 目标颜色；② 目标颜色中 rank 最接近的牌。
 * 替换牌不得已在当前手牌中。
 */
export function skillChangeColor(state: DeckState, cardId: string, newElement: Element): DeckState {
  const target = state.hand.find(c => c.id === cardId);
  if (!target) return { deck: [...state.deck], discardPile: [...state.discardPile], hand: [...state.hand] };

  return swapCard({
    state, cardId,
    filter: (c) => c.id !== target.id && c.element === newElement,
    sortBy: (a, b) => Math.abs(a.rank - target.rank) - Math.abs(b.rank - target.rank),
  });
}

// ══════════════════════════════════════════════════════════════════
//  技能 2: 变费
// ══════════════════════════════════════════════════════════════════

export function skillChangeCost(state: DeckState, cardId: string, newRank: Rank): DeckState {
  const target = state.hand.find(c => c.id === cardId);
  if (!target) return { deck: [...state.deck], discardPile: [...state.discardPile], hand: [...state.hand] };

  return swapCard({
    state, cardId,
    filter: (c) => c.id !== target.id && c.element === target.element && c.rank === newRank,
    sortBy: null,
  });
}

// ══════════════════════════════════════════════════════════════════
//  通用替换逻辑
// ══════════════════════════════════════════════════════════════════

function swapCard({ state, cardId, filter, sortBy }: SwapParams): DeckState {
  const target = state.hand.find(c => c.id === cardId);
  if (!target) return { deck: [...state.deck], discardPile: [...state.discardPile], hand: [...state.hand] };

  const handIds = new Set(state.hand.map(c => c.id));
  const pool = [...state.deck, ...state.discardPile];

  let candidates = pool.filter(c => filter(c) && !handIds.has(c.id));
  if (sortBy) candidates.sort(sortBy);

  const replacement = candidates[0];
  if (!replacement) return { deck: [...state.deck], discardPile: [...state.discardPile], hand: [...state.hand] };

  const newDeck = state.deck.filter(c => c.id !== replacement.id);
  let newDiscard = state.discardPile.filter(c => c.id !== replacement.id);
  newDiscard = [...newDiscard, target];
  const newHand = state.hand.map(c => c.id === cardId ? replacement : c);

  return { deck: newDeck, discardPile: newDiscard, hand: newHand };
}

// ══════════════════════════════════════════════════════════════════
//  技能 3: 护盾
// ══════════════════════════════════════════════════════════════════

export function activateShield(shield: ShieldState): ShieldState {
  if (shield.active || shield.onCooldown) return { ...shield };
  return { active: true, onCooldown: false };
}

export function shatterShield(shield: ShieldState): ShieldState {
  if (!shield.active) return { ...shield };
  return { active: false, onCooldown: true };
}

export function voidShield(shield: ShieldState): ShieldState {
  if (!shield.active) return { ...shield };
  return { active: false, onCooldown: false };
}

export function resetShieldCooldown(shield: ShieldState): ShieldState {
  return { ...shield, onCooldown: false };
}

// ══════════════════════════════════════════════════════════════════
//  守卫条件
// ══════════════════════════════════════════════════════════════════

export function canUseChangeColor(energy: number, phase: string): boolean {
  return energy > 0 && phase === 'SKILL';
}

export function canUseChangeCost(energy: number, phase: string): boolean {
  return energy > 0 && phase === 'SKILL';
}

export function canUseShield(energy: number, shield: ShieldState, phase: string): boolean {
  return energy > 0 && !shield.active && !shield.onCooldown && phase === 'SKILL';
}

export function canShuffle(shuffle: { remaining: number }, phase: string): boolean {
  return shuffle.remaining > 0 && phase === 'SHUFFLE';
}

export function canPlay(selectedCards: string[], phase: string): boolean {
  return selectedCards.length >= 1 && phase === 'PLAY';
}

// ══════════════════════════════════════════════════════════════════
//  回合结束重置
// ══════════════════════════════════════════════════════════════════

export function resetRoundSkills(
  skills: RoundSkills
): { skills: RoundSkills; shuffle: { remaining: number } } {
  return {
    skills: {
      energy: skills.energy,  // 充能跨回合保留
      shield: { ...skills.shield },
    },
    shuffle: { remaining: 2 },
  };
}
