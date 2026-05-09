import { create } from 'zustand';

/**
 * BattleState — 单层 Boss 战
 *
 * @typedef {Object} BossInfo
 * @property {string} id
 * @property {number} layer
 * @property {string} element
 * @property {number} hp
 * @property {number} maxHp
 * @property {number} attackPerRound
 * @property {number} chargeAttack
 * @property {{ currentIntent: string, chargeStored: boolean }} behavior
 * @property {{ attack: number, charge: number, defend: number }} weights
 *
 * @typedef {Object} BattleState
 * @property {BossInfo|null} boss
 * @property {number} round
 * @property {'ONGOING'|'WIN'|'LOSE'} result
 */

/** @type {BattleState} */
const initialBattleState = {
  boss: null,
  round: 1,
  result: 'ONGOING',
};

export const useBattleStore = create((set) => ({
  ...initialBattleState,

  /** 设置 Boss */
  setBoss: (boss) => set({ boss }),

  /** 更新 Boss HP */
  damageBoss: (amount) =>
    set((s) => ({
      boss: s.boss ? { ...s.boss, hp: Math.max(0, s.boss.hp - amount) } : null,
    })),

  /** 递增回合 */
  nextRound: () => set((s) => ({ round: s.round + 1 })),

  /** 设置战斗结果 */
  setResult: (result) => set({ result }),

  /** 重置 */
  reset: () => set(initialBattleState),
}));
