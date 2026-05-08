import type { RoundPhase, ShieldState } from '../types/state.js';

// ══════════════════════════════════════════════════════════════════
//  守卫条件 — 判断事件在当前阶段是否合法
// ══════════════════════════════════════════════════════════════════

/** 补牌完成后才能进入 BOSS_TELEGRAPH */
export function canDrawComplete(phase: RoundPhase): boolean {
  return phase === 'DRAW';
}

/** Boss 意图展示完成后才能进入 SKILL */
export function canBossTelegraphComplete(phase: RoundPhase): boolean {
  return phase === 'BOSS_TELEGRAPH';
}

// SKILL 和 SHUFFLE 为玩家操作阶段，可自由交替。
const isPlayerActionPhase = (phase: RoundPhase) => phase === 'SKILL' || phase === 'SHUFFLE';

/** 技能在玩家操作阶段均可使用，充能够即可 */
export function canUseSkill(phase: RoundPhase, energy: number): boolean {
  return isPlayerActionPhase(phase) && energy > 0;
}

/** 护盾在玩家操作阶段均可使用，额外检查冷却和活跃状态 */
export function canUseShield(
  phase: RoundPhase,
  energy: number,
  shield: ShieldState,
): boolean {
  return isPlayerActionPhase(phase) && energy > 0 && !shield.active && !shield.onCooldown;
}

/** Shuffle 在玩家操作阶段均可使用，且剩余次数 > 0 */
export function canShuffle(phase: RoundPhase, remaining: number): boolean {
  return isPlayerActionPhase(phase) && remaining > 0;
}

/** 选牌只能在 PLAY 阶段 */
export function canPlaySelect(phase: RoundPhase): boolean {
  return phase === 'PLAY';
}

/** 确认出牌：PLAY 阶段 + 至少选 1 张 */
export function canPlayConfirm(phase: RoundPhase, selectedCount: number): boolean {
  return phase === 'PLAY' && selectedCount >= 1;
}

/** 进入 PLAY 阶段（从玩家操作阶段触发） */
export function canEnterPlay(phase: RoundPhase): boolean {
  return isPlayerActionPhase(phase);
}

/** 结算完成 */
export function canResolveComplete(phase: RoundPhase): boolean {
  return phase === 'RESOLVE';
}

/** Boss 攻击完成 */
export function canBossAttackComplete(phase: RoundPhase): boolean {
  return phase === 'BOSS_ATTACK';
}

/** 回合结束确认 */
export function canRoundEndConfirm(phase: RoundPhase): boolean {
  return phase === 'ROUND_END';
}
