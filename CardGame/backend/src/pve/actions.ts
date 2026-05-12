import { drawCards, playCards, shuffleHand } from '../lib/deck.js';
import { calculateDamage } from '../lib/hand.js';
import { skillChangeColor as skillChangeColorFn, skillChangeCost as skillChangeCostFn } from '../lib/skills.js';
import { activateShield, shatterShield, voidShield, tickShieldCooldown } from '../lib/skills.js';
import { createBossRoundState, createRoundState, createShuffleState, createPlayState } from '../types/state.js';
import { BOSS_WEIGHTS_BY_LAYER, ROUND_PHASE } from '../types/state.js';
import type { DeckState } from '../lib/deck.js';
import type { Card, Element, Rank } from '../types/card.js';
import type { PlayerState, BossState, RoundState, RoundSkills, ShuffleState, PlayState, BossRoundState, BattleResult } from '../types/state.js';
import type { Buff } from '../types/buff.js';

// ══════════════════════════════════════════════════════════════════
//  GameContext — 状态机操作的顶层上下文
// ══════════════════════════════════════════════════════════════════

export type RoguePhase = 'BATTLE' | 'UPGRADE';

export interface GameContext {
  deck: Card[];
  discardPile: Card[];
  hand: Card[];
  player: PlayerState;
  boss: BossState;
  round: number;
  roundState: RoundState;
  battleResult: BattleResult;
  rogueMode: boolean;
  roguePhase: RoguePhase;
}

function deckState(ctx: GameContext): DeckState {
  return { deck: ctx.deck, discardPile: ctx.discardPile, hand: ctx.hand };
}

function setDeckState(ctx: GameContext, ds: DeckState): void {
  ctx.deck = ds.deck;
  ctx.discardPile = ds.discardPile;
  ctx.hand = ds.hand;
}

// ══════════════════════════════════════════════════════════════════
//  DRAW → BOSS_TELEGRAPH
// ══════════════════════════════════════════════════════════════════

export function doDrawComplete(ctx: GameContext): GameContext {
  const ds = drawCards(deckState(ctx), 7 - ctx.hand.length);
  return { ...ctx, ...ds, roundState: { ...ctx.roundState, phase: ROUND_PHASE.BOSS_TELEGRAPH } };
}

// ══════════════════════════════════════════════════════════════════
//  BOSS_TELEGRAPH → SKILL
// ══════════════════════════════════════════════════════════════════

function rollBossIntent(weights: { attack: number; charge: number; defend: number }): 'ATTACK' | 'CHARGE' | 'DEFEND' {
  const r = Math.random();
  if (r < weights.attack) return 'ATTACK';
  if (r < weights.attack + weights.charge) return 'CHARGE';
  return 'DEFEND';
}

export function doBossTelegraphComplete(ctx: GameContext): GameContext {
  const { boss } = ctx;
  let intent: 'ATTACK' | 'CHARGE' | 'DEFEND';
  let willRelease = false;
  let chargeStored = false;
  let isDefending = false;

  if (boss.behavior.chargeStored) {
    // 上回合蓄力 → 本回合强制 ATTACK 释放
    intent = 'ATTACK';
    willRelease = true;
    chargeStored = false;
  } else {
    intent = rollBossIntent(boss.weights);
    if (intent === 'CHARGE') {
      chargeStored = true;
    } else if (intent === 'DEFEND') {
      isDefending = true;
    }
  }

  const bossRound: BossRoundState = { intent, isDefending, willReleaseCharge: willRelease };

  return {
    ...ctx,
    boss: {
      ...boss,
      behavior: { currentIntent: intent, chargeStored },
    },
    roundState: {
      ...ctx.roundState,
      phase: ROUND_PHASE.SKILL,
      bossRound,
    },
  };
}

// ══════════════════════════════════════════════════════════════════
//  SKILL 阶段：变色
// ══════════════════════════════════════════════════════════════════

export function doSkillChangeColor(ctx: GameContext, cardId: string, newColor: Element): GameContext {
  const { state: ds, replaced } = skillChangeColorFn(deckState(ctx), cardId, newColor);
  const ctxWithDeck = { ...ctx, ...ds };
  if (!replaced) return ctxWithDeck;
  return {
    ...ctxWithDeck,
    roundState: {
      ...ctx.roundState,
      skills: { energy: Math.max(0, ctx.roundState.skills.energy - 1), shield: ctx.roundState.skills.shield },
    },
  };
}

// ══════════════════════════════════════════════════════════════════
//  SKILL 阶段：变费
// ══════════════════════════════════════════════════════════════════

export function doSkillChangeCost(ctx: GameContext, cardId: string, newCost: Rank): GameContext {
  const { state: ds, replaced } = skillChangeCostFn(deckState(ctx), cardId, newCost);
  const ctxWithDeck = { ...ctx, ...ds };
  if (!replaced) return ctxWithDeck;
  return {
    ...ctxWithDeck,
    roundState: {
      ...ctx.roundState,
      skills: { energy: Math.max(0, ctx.roundState.skills.energy - 1), shield: ctx.roundState.skills.shield },
    },
  };
}

// ══════════════════════════════════════════════════════════════════
//  SKILL 阶段：护盾激活
// ══════════════════════════════════════════════════════════════════

export function doSkillShield(ctx: GameContext): GameContext {
  return {
    ...ctx,
    roundState: {
      ...ctx.roundState,
      skills: {
        energy: Math.max(0, ctx.roundState.skills.energy - 1),
        shield: activateShield(ctx.roundState.skills.shield),
      },
    },
  };
}

// ══════════════════════════════════════════════════════════════════
//  SHUFFLE 操作
// ══════════════════════════════════════════════════════════════════

export function doShuffleSelect(ctx: GameContext, cardIds: string[]): GameContext {
  return {
    ...ctx,
    roundState: {
      ...ctx.roundState,
      shuffle: {
        ...ctx.roundState.shuffle,
        pendingDiscard: cardIds,
      },
    },
  };
}

export function doShuffleConfirm(ctx: GameContext): GameContext {
  const cardIds = ctx.roundState.shuffle.pendingDiscard;
  const ds = shuffleHand(deckState(ctx), cardIds);
  const remaining = ctx.roundState.shuffle.remaining - 1;
  return {
    ...ctx,
    ...ds,
    roundState: {
      ...ctx.roundState,
      shuffle: { remaining, pendingDiscard: [] },
    },
  };
}

export function doShuffleCancel(ctx: GameContext): GameContext {
  return {
    ...ctx,
    roundState: {
      ...ctx.roundState,
      shuffle: { ...ctx.roundState.shuffle, pendingDiscard: [] },
    },
  };
}

// ══════════════════════════════════════════════════════════════════
//  PLAY 阶段
// ══════════════════════════════════════════════════════════════════

export function doEnterPlay(ctx: GameContext): GameContext {
  return {
    ...ctx,
    roundState: {
      ...ctx.roundState,
      phase: ROUND_PHASE.PLAY,
      play: createPlayState(),
    },
  };
}

export function doPlaySelect(ctx: GameContext, cardId: string): GameContext {
  const { selectedCards } = ctx.roundState.play;
  const idx = selectedCards.indexOf(cardId);
  const next = idx === -1
    ? [...selectedCards, cardId]
    : selectedCards.filter((id) => id !== cardId);

  return {
    ...ctx,
    roundState: {
      ...ctx.roundState,
      play: { ...ctx.roundState.play, selectedCards: next },
    },
  };
}

export function doPlayConfirm(ctx: GameContext): GameContext {
  const selected = ctx.roundState.play.selectedCards;
  const cards = ctx.hand.filter((c) => selected.includes(c.id));
  const isDefending = ctx.roundState.bossRound.isDefending;
  const score = calculateDamage(cards, ctx.player.buffs, isDefending);
  const resolvedDeckState = playCards(deckState(ctx), selected);

  return {
    ...ctx,
    ...resolvedDeckState,
    roundState: {
      ...ctx.roundState,
      phase: ROUND_PHASE.RESOLVE,
      play: {
        ...ctx.roundState.play,
        selectedCards: [],
        handType: score.handType,
        score: score.total,
      },
    },
  };
}

// ══════════════════════════════════════════════════════════════════
//  RESOLVE — 扣血判定
// ══════════════════════════════════════════════════════════════════

export function doResolveComplete(ctx: GameContext): GameContext {
  const score = ctx.roundState.play.score ?? 0;
  const newBossHp = ctx.boss.hp - score;

  if (newBossHp <= 0) {
    if (ctx.rogueMode) {
      // Rogue: 层通关 → 房间继续，进入 UPGRADE 阶段等待增益选择
      // battleResult 保持 ONGOING，防止房间被 archiveGame 回收
      return {
        ...ctx,
        battleResult: 'ONGOING',
        roguePhase: 'UPGRADE',
        boss: { ...ctx.boss, hp: 0 },
        roundState: {
          ...ctx.roundState,
          skills: {
            ...ctx.roundState.skills,
            shield: voidShield(ctx.roundState.skills.shield),
          },
        },
      };
    }
    // Solo: Boss 死亡 → WIN，正常结束
    return {
      ...ctx,
      battleResult: 'WIN',
      boss: { ...ctx.boss, hp: 0 },
      roundState: {
        ...ctx.roundState,
        skills: {
          ...ctx.roundState.skills,
          shield: voidShield(ctx.roundState.skills.shield),
        },
      },
    };
  }

  // Boss 存活 → BOSS_ATTACK
  return {
    ...ctx,
    boss: { ...ctx.boss, hp: newBossHp },
    roundState: {
      ...ctx.roundState,
      phase: ROUND_PHASE.BOSS_ATTACK,
    },
  };
}

// ══════════════════════════════════════════════════════════════════
//  BOSS_ATTACK — 攻击判定
// ══════════════════════════════════════════════════════════════════

export function doBossAttackComplete(ctx: GameContext): GameContext {
  const { bossRound } = ctx.roundState;
  const intent = bossRound.intent;

  // CHARGE / DEFEND → 不攻击
  if (intent === 'CHARGE' || intent === 'DEFEND') {
    return {
      ...ctx,
      roundState: {
        ...ctx.roundState,
        phase: ROUND_PHASE.ROUND_END,
      },
    };
  }

  // ATTACK
  const dmg = bossRound.willReleaseCharge ? ctx.boss.chargeAttack : ctx.boss.attackPerRound;
  const shieldActive = ctx.roundState.skills.shield.active;

  if (shieldActive) {
    // 护盾拦截
    return {
      ...ctx,
      roundState: {
        ...ctx.roundState,
        phase: ROUND_PHASE.ROUND_END,
        skills: {
          ...ctx.roundState.skills,
          shield: shatterShield(ctx.roundState.skills.shield),
        },
      },
    };
  }

  // 直接扣血
  const newHp = ctx.player.hp - dmg;
  if (newHp <= 0) {
    return {
      ...ctx,
      battleResult: 'LOSE',
      player: { ...ctx.player, hp: 0 },
    };
  }

  return {
    ...ctx,
    player: { ...ctx.player, hp: newHp },
    roundState: {
      ...ctx.roundState,
      phase: ROUND_PHASE.ROUND_END,
    },
  };
}

// ══════════════════════════════════════════════════════════════════
//  ROUND_END — 重置回合
// ══════════════════════════════════════════════════════════════════

export function doRoundEndConfirm(ctx: GameContext): GameContext {
  return {
    ...ctx,
    round: ctx.round + 1,
    roundState: {
      ...createRoundState(),
      skills: {
        energy: ctx.roundState.skills.energy,                          // 充能跨回合保留
        shield: tickShieldCooldown(ctx.roundState.skills.shield),     // shield 每回合递减冷却
      },
    },
  };
}
