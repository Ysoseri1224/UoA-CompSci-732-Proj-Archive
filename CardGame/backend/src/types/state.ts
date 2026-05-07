import type { Card, Element } from './card.js';
import type { Buff, Upgrade } from './buff.js';

// ── 回合阶段 ────────────────────────────────────────────────────
export type RoundPhase = 'DRAW' | 'BOSS_TELEGRAPH' | 'SKILL' | 'SHUFFLE' | 'PLAY' | 'RESOLVE' | 'BOSS_ATTACK' | 'ROUND_END';

export const ROUND_PHASE: Record<RoundPhase, RoundPhase> = {
  DRAW:            'DRAW',
  BOSS_TELEGRAPH:  'BOSS_TELEGRAPH',
  SKILL:           'SKILL',
  SHUFFLE:         'SHUFFLE',
  PLAY:            'PLAY',
  RESOLVE:         'RESOLVE',
  BOSS_ATTACK:     'BOSS_ATTACK',
  ROUND_END:       'ROUND_END',
};

export const ALL_ROUND_PHASES: RoundPhase[] = [
  'DRAW', 'BOSS_TELEGRAPH', 'SKILL', 'SHUFFLE', 'PLAY', 'RESOLVE', 'BOSS_ATTACK', 'ROUND_END',
];

// ── Boss 意图 ───────────────────────────────────────────────────
export type BossIntent = 'ATTACK' | 'CHARGE' | 'DEFEND';

export interface BossWeights { attack: number; charge: number; defend: number }

export const BOSS_WEIGHTS_BY_LAYER: Record<number, BossWeights> = {
  1: { attack: 0.80, charge: 0.15, defend: 0.05 },
  2: { attack: 0.80, charge: 0.15, defend: 0.05 },
  3: { attack: 0.80, charge: 0.15, defend: 0.05 },
  4: { attack: 0.60, charge: 0.25, defend: 0.15 },
  5: { attack: 0.60, charge: 0.25, defend: 0.15 },
  6: { attack: 0.60, charge: 0.25, defend: 0.15 },
  7: { attack: 0.45, charge: 0.30, defend: 0.25 },
  8: { attack: 0.45, charge: 0.30, defend: 0.25 },
  9: { attack: 0.45, charge: 0.30, defend: 0.25 },
  10: { attack: 0.45, charge: 0.30, defend: 0.25 },
};

// ── 全局阶段 ────────────────────────────────────────────────────
export type GamePhase = 'BATTLE' | 'UPGRADE' | 'GAME_OVER' | 'RUN_COMPLETE';
export type UpgradePhase = 'GENERATING' | 'CHOOSING' | 'APPLYING' | null;

export const GAME_PHASE: Record<GamePhase, GamePhase> = {
  BATTLE: 'BATTLE', UPGRADE: 'UPGRADE', GAME_OVER: 'GAME_OVER', RUN_COMPLETE: 'RUN_COMPLETE',
};

export type BattleResult = 'ONGOING' | 'WIN' | 'LOSE';

// ══════════════════════════════════════════════════════════════════
//  子状态
// ══════════════════════════════════════════════════════════════════

export interface ShieldState { active: boolean; onCooldown: boolean }
export interface RoundSkills { changeColor: { used: boolean }; changeCost: { used: boolean }; shield: ShieldState }
export interface ShuffleState { remaining: number; pendingDiscard: string[] }
export interface PlayState { selectedCards: string[]; handType: HandType | null; score: number | null }
export interface BossRoundState { intent: BossIntent; isDefending: boolean; willReleaseCharge: boolean }

export interface RoundState {
  phase: RoundPhase; skills: RoundSkills; shuffle: ShuffleState;
  play: PlayState; bossRound: BossRoundState;
}

export interface BossState {
  id: string; layer: number; element: Element; hp: number; maxHp: number;
  attackPerRound: number; chargeAttack: number;
  behavior: { currentIntent: BossIntent; chargeStored: boolean }; weights: BossWeights;
}

export interface PlayerState { hp: number; maxHp: number; buffs: Buff[]; chosenElement: Element | null }

export interface SavePoint { layer: number; timestamp: number; gameState: Omit<GameState, 'savepoint'> }

export interface GameState {
  runId: string | null; layer: number; player: PlayerState;
  deck: Card[]; discardPile: Card[]; hand: Card[];
  phase: GamePhase; upgradePhase: UpgradePhase; upgradeOptions: Upgrade[]; savepoint: SavePoint | null;
}

export interface BattleState { boss: BossState; round: number; roundState: RoundState; result: BattleResult }

// ══════════════════════════════════════════════════════════════════
//  工厂函数
// ══════════════════════════════════════════════════════════════════

import type { HandType } from './card.js';

export function createShieldState(): ShieldState {
  return { active: false, onCooldown: false };
}

export function createRoundSkills(): RoundSkills {
  return { changeColor: { used: false }, changeCost: { used: false }, shield: createShieldState() };
}

export function createShuffleState(): ShuffleState {
  return { remaining: 2, pendingDiscard: [] };
}

export function createPlayState(): PlayState {
  return { selectedCards: [], handType: null, score: null };
}

export function createBossRoundState(): BossRoundState {
  return { intent: 'ATTACK', isDefending: false, willReleaseCharge: false };
}

export function createRoundState(opts: { roundPhase?: RoundPhase } = {}): RoundState {
  return {
    phase: opts.roundPhase ?? ROUND_PHASE.DRAW, skills: createRoundSkills(),
    shuffle: createShuffleState(), play: createPlayState(), bossRound: createBossRoundState(),
  };
}

export function createPlayerState(opts: {
  hp?: number; maxHp?: number; buffs?: Buff[]; chosenElement?: Element | null
} = {}): PlayerState {
  return { hp: opts.hp ?? 20, maxHp: opts.maxHp ?? 20, buffs: opts.buffs ?? [], chosenElement: opts.chosenElement ?? null };
}

export function createBossState(opts: {
  id?: string; layer?: number; element?: Element; hp?: number; maxHp?: number; attackPerRound?: number;
} = {}): BossState {
  const layer = opts.layer ?? 1;
  const atk = opts.attackPerRound ?? 5;
  const weights = BOSS_WEIGHTS_BY_LAYER[layer] ?? BOSS_WEIGHTS_BY_LAYER[1];
  return {
    id: opts.id ?? `boss_layer_${layer}`, layer, element: opts.element ?? 'FIRE',
    hp: opts.hp ?? 300, maxHp: opts.maxHp ?? 300, attackPerRound: atk,
    chargeAttack: Math.floor(atk * 2.2), behavior: { currentIntent: 'ATTACK', chargeStored: false }, weights,
  };
}

export function createBattleState(opts: {
  boss?: BossState; round?: number; roundState?: RoundState; result?: BattleResult;
} = {}): BattleState {
  return {
    boss: opts.boss ?? createBossState(), round: opts.round ?? 1,
    roundState: opts.roundState ?? createRoundState(), result: opts.result ?? 'ONGOING',
  };
}

export function createGameState(opts: {
  runId?: string; layer?: number; player?: PlayerState; deck?: Card[]; discardPile?: Card[]; hand?: Card[];
  phase?: GamePhase; upgradePhase?: UpgradePhase; upgradeOptions?: Upgrade[]; savepoint?: SavePoint | null;
} = {}): GameState {
  return {
    runId: opts.runId ?? null, layer: opts.layer ?? 1, player: opts.player ?? createPlayerState(),
    deck: opts.deck ?? [], discardPile: opts.discardPile ?? [], hand: opts.hand ?? [],
    phase: opts.phase ?? GAME_PHASE.BATTLE, upgradePhase: opts.upgradePhase ?? null,
    upgradeOptions: opts.upgradeOptions ?? [], savepoint: opts.savepoint ?? null,
  };
}

export function createSavepoint(gameState: GameState): SavePoint {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { savepoint, ...rest } = gameState;
  return { layer: gameState.layer, timestamp: Date.now(), gameState: rest };
}
