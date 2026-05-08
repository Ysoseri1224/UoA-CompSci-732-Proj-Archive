import { create } from 'zustand';

/**
 * GameState — 整局 Run 的状态
 *
 * @typedef {Object} GameState
 * @property {string|null} runId
 * @property {number} layer
 * @property {{ hp: number, maxHp: number, buffs: Array, chosenElement: string|null }} player
 * @property {Array} deck
 * @property {Array} discardPile
 * @property {Array} hand
 * @property {'BATTLE'|'UPGRADE'|'GAME_OVER'|'RUN_COMPLETE'} phase
 * @property {'GENERATING'|'CHOOSING'|'APPLYING'|null} upgradePhase
 * @property {Array} upgradeOptions
 * @property {Object|null} savepoint
 */

/** @type {GameState} */
const initialGameState = {
  runId: null,
  layer: 1,
  player: { hp: 20, maxHp: 20, buffs: [], chosenElement: null },
  deck: [],
  discardPile: [],
  hand: [],
  phase: 'BATTLE',
  upgradePhase: null,
  upgradeOptions: [],
  savepoint: null,
};

export const useGameStore = create((set) => ({
  ...initialGameState,

  /** 初始化新 Run */
  initRun: (runId) => set({ ...initialGameState, runId }),

  /** 更新玩家状态 */
  updatePlayer: (player) => set({ player }),

  /** 更新牌堆 */
  updateDeck: (deck, discardPile, hand) => set({ deck, discardPile, hand }),

  /** 切换阶段 */
  setPhase: (phase) => set({ phase }),
  setUpgradePhase: (upgradePhase) => set({ upgradePhase }),
  setUpgradeOptions: (upgradeOptions) => set({ upgradeOptions }),

  /** 进入下一层 */
  advanceLayer: () => set((s) => ({ layer: s.layer + 1 })),

  /** 写入存档 */
  setSavepoint: (savepoint) => set({ savepoint }),

  /** 重置 */
  reset: () => set(initialGameState),
}));
