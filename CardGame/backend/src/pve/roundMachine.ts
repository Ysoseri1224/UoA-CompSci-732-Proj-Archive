import type { GameEvent } from '../types/events.js';
import type { GameContext } from './actions.js';
import {
  doDrawComplete,
  doBossTelegraphComplete,
  doSkillChangeColor,
  doSkillChangeCost,
  doSkillShield,
  doShuffleSelect,
  doShuffleConfirm,
  doShuffleCancel,
  doEnterPlay,
  doPlaySelect,
  doPlayConfirm,
  doResolveComplete,
  doBossAttackComplete,
  doRoundEndConfirm,
} from './actions.js';
import {
  canDrawComplete,
  canBossTelegraphComplete,
  canUseSkill,
  canUseShield,
  canShuffle,
  canPlaySelect,
  canPlayConfirm,
  canEnterPlay,
  canResolveComplete,
  canBossAttackComplete,
  canRoundEndConfirm,
} from './guards.js';

// ══════════════════════════════════════════════════════════════════
//  TransitionResult
// ══════════════════════════════════════════════════════════════════

export interface TransitionResult {
  ctx: GameContext;
  ok: boolean;
  error?: string;
}

function ok(ctx: GameContext): TransitionResult {
  return { ctx, ok: true };
}

function err(ctx: GameContext, error: string): TransitionResult {
  return { ctx, ok: false, error };
}

// ══════════════════════════════════════════════════════════════════
//  transition — 主状态转移函数
// ══════════════════════════════════════════════════════════════════

export function transition(ctx: GameContext, event: GameEvent): TransitionResult {
  const { phase } = ctx.roundState;

  switch (event.type) {
    // ── DRAW → BOSS_TELEGRAPH ──────────────────────
    case 'DRAW_COMPLETE':
      if (!canDrawComplete(phase)) return err(ctx, `Cannot DRAW_COMPLETE in phase ${phase}`);
      return ok(doDrawComplete(ctx));

    // ── BOSS_TELEGRAPH → SKILL ────────────────────
    case 'BOSS_TELEGRAPH_COMPLETE':
      if (!canBossTelegraphComplete(phase)) return err(ctx, `Cannot BOSS_TELEGRAPH_COMPLETE in phase ${phase}`);
      return ok(doBossTelegraphComplete(ctx));

    // ── 玩家操作阶段：技能 ────────────────────────
    case 'SKILL_CHANGE_COLOR':
      if (!canUseSkill(phase, ctx.roundState.skills.changeColor.used ? 0 : 1))
        return err(ctx, `Cannot use skill in phase ${phase}`);
      return ok(doSkillChangeColor(ctx, event.cardId, event.newColor));

    case 'SKILL_CHANGE_COST':
      if (!canUseSkill(phase, ctx.roundState.skills.changeCost.used ? 0 : 1))
        return err(ctx, `Cannot use skill in phase ${phase}`);
      return ok(doSkillChangeCost(ctx, event.cardId, event.newCost));

    case 'SKILL_SHIELD':
      if (!canUseShield(phase, ctx.roundState.skills.shield.active ? 0 : 1, ctx.roundState.skills.shield))
        return err(ctx, `Cannot use shield in phase ${phase}`);
      return ok(doSkillShield(ctx));

    // ── SHUFFLE 操作 ──────────────────────────────
    case 'SHUFFLE_SELECT':
      if (!canShuffle(phase, ctx.roundState.shuffle.remaining))
        return err(ctx, `Cannot shuffle in phase ${phase}`);
      return ok(doShuffleSelect(ctx, event.cardIds));

    case 'SHUFFLE_CONFIRM':
      if (!canShuffle(phase, ctx.roundState.shuffle.remaining))
        return err(ctx, `Cannot confirm shuffle in phase ${phase}`);
      return ok(doShuffleConfirm(ctx));

    case 'SHUFFLE_CANCEL':
      return ok(doShuffleCancel(ctx));

    // ── 进入 PLAY 阶段 ────────────────────────────
    case 'START_BATTLE':
      if (!canEnterPlay(phase)) return err(ctx, `Cannot enter PLAY from phase ${phase}`);
      return ok(doEnterPlay(ctx));

    // ── PLAY 阶段 ─────────────────────────────────
    case 'PLAY_SELECT':
      if (!canPlaySelect(phase)) return err(ctx, `Cannot PLAY_SELECT in phase ${phase}`);
      return ok(doPlaySelect(ctx, event.cardId));

    case 'PLAY_CONFIRM':
      if (!canPlayConfirm(phase, ctx.roundState.play.selectedCards.length))
        return err(ctx, `Cannot PLAY_CONFIRM in phase ${phase}`);
      return ok(doPlayConfirm(ctx));

    // ── RESOLVE → BOSS_ATTACK or WIN ──────────────
    case 'RESOLVE_COMPLETE':
      if (!canResolveComplete(phase)) return err(ctx, `Cannot RESOLVE_COMPLETE in phase ${phase}`);
      return ok(doResolveComplete(ctx));

    // ── BOSS_ATTACK → ROUND_END or LOSE ───────────
    case 'BOSS_ATTACK_COMPLETE':
      if (!canBossAttackComplete(phase)) return err(ctx, `Cannot BOSS_ATTACK_COMPLETE in phase ${phase}`);
      return ok(doBossAttackComplete(ctx));

    // ── ROUND_END → DRAW ──────────────────────────
    case 'ROUND_END_CONFIRM':
      if (!canRoundEndConfirm(phase)) return err(ctx, `Cannot ROUND_END_CONFIRM in phase ${phase}`);
      return ok(doRoundEndConfirm(ctx));

    // ── 未处理事件 ────────────────────────────────
    default:
      return err(ctx, `Unhandled event: ${(event as GameEvent).type}`);
  }
}

// ══════════════════════════════════════════════════════════════════
//  工厂
// ══════════════════════════════════════════════════════════════════

export { type GameContext } from './actions.js';
