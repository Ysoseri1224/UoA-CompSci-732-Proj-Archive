import { create } from 'zustand';

/**
 * RoundState — 单回合状态
 *
 * @typedef {Object} RoundState
 * @property {string} phase — 'DRAW'|'BOSS_TELEGRAPH'|'SKILL'|'SHUFFLE'|'PLAY'|'RESOLVE'|'BOSS_ATTACK'|'ROUND_END'
 * @property {{ changeColor: {used: boolean}, changeCost: {used: boolean}, shield: {active: boolean, onCooldown: boolean} }} skills
 * @property {{ remaining: number, pendingDiscard: string[] }} shuffle
 * @property {{ selectedCards: string[], handType: string|null, score: number|null }} play
 * @property {{ intent: string, isDefending: boolean, willReleaseCharge: boolean }} bossRound
 */

/** @type {RoundState} */
const initialRoundState = {
  phase: 'DRAW',
  skills: {
    changeColor: { used: false },
    changeCost: { used: false },
    shield: { active: false, onCooldown: false },
  },
  shuffle: { remaining: 2, pendingDiscard: [] },
  play: { selectedCards: [], handType: null, score: null },
  bossRound: { intent: 'ATTACK', isDefending: false, willReleaseCharge: false },
};

export const useRoundStore = create((set) => ({
  ...initialRoundState,

  /** 切换阶段 */
  setPhase: (phase) => set({ phase }),

  /** 更新技能状态 */
  setSkills: (skills) => set({ skills }),

  /** 更新 shuffle 状态 */
  setShuffle: (shuffle) => set({ shuffle }),

  /** 更新出牌状态 */
  setPlay: (play) => set({ play }),

  /** 更新 Boss 回合状态 */
  setBossRound: (bossRound) => set({ bossRound }),

  /** 全量更新（Socket 推送时用） */
  setAll: (roundState) => set(roundState),

  /** 重置回合 */
  reset: () => set(initialRoundState),
}));
