// ── 回合阶段 ────────────────────────────────────────────────────
/** @typedef {'DRAW'|'BOSS_TELEGRAPH'|'SKILL'|'SHUFFLE'|'PLAY'|'RESOLVE'|'BOSS_ATTACK'|'ROUND_END'} RoundPhase */

export const ROUND_PHASE = /** @type {Record<RoundPhase, RoundPhase>} */ ({
  DRAW:            'DRAW',
  BOSS_TELEGRAPH:  'BOSS_TELEGRAPH',
  SKILL:           'SKILL',
  SHUFFLE:         'SHUFFLE',
  PLAY:            'PLAY',
  RESOLVE:         'RESOLVE',
  BOSS_ATTACK:     'BOSS_ATTACK',
  ROUND_END:       'ROUND_END',
});

export const ALL_ROUND_PHASES = /** @type {RoundPhase[]} */ ([
  'DRAW',
  'BOSS_TELEGRAPH',
  'SKILL',
  'SHUFFLE',
  'PLAY',
  'RESOLVE',
  'BOSS_ATTACK',
  'ROUND_END',
]);

// ── Boss 意图 ───────────────────────────────────────────────────
/** @typedef {'ATTACK'|'CHARGE'|'DEFEND'} BossIntent */

// ── Boss 行为权重 ───────────────────────────────────────────────
/**
 * @typedef {{ attack: number, charge: number, defend: number }} BossWeights
 */

/** @type {Record<number, BossWeights>} */
export const BOSS_WEIGHTS_BY_LAYER = {
  1:  { attack: 0.80, charge: 0.15, defend: 0.05 },
  2:  { attack: 0.80, charge: 0.15, defend: 0.05 },
  3:  { attack: 0.80, charge: 0.15, defend: 0.05 },
  4:  { attack: 0.60, charge: 0.25, defend: 0.15 },
  5:  { attack: 0.60, charge: 0.25, defend: 0.15 },
  6:  { attack: 0.60, charge: 0.25, defend: 0.15 },
  7:  { attack: 0.45, charge: 0.30, defend: 0.25 },
  8:  { attack: 0.45, charge: 0.30, defend: 0.25 },
  9:  { attack: 0.45, charge: 0.30, defend: 0.25 },
  10: { attack: 0.45, charge: 0.30, defend: 0.25 },
};

// ── 全局阶段 ────────────────────────────────────────────────────
/** @typedef {'BATTLE'|'UPGRADE'|'GAME_OVER'|'RUN_COMPLETE'} GamePhase */

export const GAME_PHASE = /** @type {Record<GamePhase, GamePhase>} */ ({
  BATTLE:       'BATTLE',
  UPGRADE:      'UPGRADE',
  GAME_OVER:    'GAME_OVER',
  RUN_COMPLETE: 'RUN_COMPLETE',
});

// ── 战斗结果 ────────────────────────────────────────────────────
/** @typedef {'ONGOING'|'WIN'|'LOSE'} BattleResult */

// ── 技能冷却状态 ────────────────────────────────────────────────
/** @typedef {{ active: boolean, onCooldown: boolean }} ShieldState */

// ── 回合内技能 ──────────────────────────────────────────────────
/** @typedef {{ changeColor: { used: boolean }, changeCost: { used: boolean }, shield: ShieldState }} RoundSkills */

// ── Shuffle 状态 ────────────────────────────────────────────────
/** @typedef {{ remaining: number, pendingDiscard: string[] }} ShuffleState */

// ── Boss 回合状态 ──────────────────────────────────────────────
/** @typedef {{ intent: BossIntent, isDefending: boolean, willReleaseCharge: boolean }} BossRoundState */

/**
 * @returns {BossRoundState}
 */
export function createBossRoundState() {
  return { intent: 'ATTACK', isDefending: false, willReleaseCharge: false };
}

// ── 出牌状态 ────────────────────────────────────────────────────
/** @typedef {{ selectedCards: string[], handType: import('./card.js').HandType|null, score: number|null }} PlayState */

// ── 玩家持久数据 ────────────────────────────────────────────────
/** @typedef {{ hp: number, maxHp: number, buffs: import('./buff.js').Buff[], chosenElement: import('./card.js').Element|null }} PlayerState */

// ── Boss 数据 ───────────────────────────────────────────────────
/** @typedef {{ id: string, layer: number, element: import('./card.js').Element, hp: number, maxHp: number, attackPerRound: number, chargeAttack: number, behavior: { currentIntent: BossIntent, chargeStored: boolean }, weights: BossWeights }} BossState */

// ══════════════════════════════════════════════════════════════════
//  工厂函数
// ══════════════════════════════════════════════════════════════════

/**
 * @returns {ShieldState}
 */
export function createShieldState() {
  return { active: false, onCooldown: false };
}

/**
 * @returns {RoundSkills}
 */
export function createRoundSkills() {
  return {
    changeColor: { used: false },
    changeCost:  { used: false },
    shield:      createShieldState(),
  };
}

/**
 * @returns {ShuffleState}
 */
export function createShuffleState() {
  return { remaining: 2, pendingDiscard: [] };
}

/**
 * @returns {PlayState}
 */
export function createPlayState() {
  return { selectedCards: [], handType: null, score: null };
}

/**
 * @param {{ roundPhase?: RoundPhase }} [opts]
 * @returns {RoundState}
 */
export function createRoundState(opts = {}) {
  return {
    phase:     opts.roundPhase ?? ROUND_PHASE.DRAW,
    skills:    createRoundSkills(),
    shuffle:   createShuffleState(),
    play:      createPlayState(),
    bossRound: createBossRoundState(),
  };
}

// ── RoundState ──────────────────────────────────────────────────
/** @typedef {{ phase: RoundPhase, skills: RoundSkills, shuffle: ShuffleState, play: PlayState, bossRound: BossRoundState }} RoundState */

/**
 * @param {{ hp?: number, maxHp?: number, buffs?: import('./buff.js').Buff[], chosenElement?: import('./card.js').Element|null }} [opts]
 * @returns {PlayerState}
 */
export function createPlayerState(opts = {}) {
  return {
    hp:            opts.hp ?? 20,
    maxHp:         opts.maxHp ?? 20,
    buffs:         opts.buffs ?? [],
    chosenElement: opts.chosenElement ?? null,
  };
}

/**
 * @param {{ id?: string, layer?: number, element?: import('./card.js').Element, hp?: number, maxHp?: number, attackPerRound?: number }} [opts]
 * @returns {BossState}
 */
export function createBossState(opts = {}) {
  const layer = opts.layer ?? 1;
  const atk = opts.attackPerRound ?? 5;
  const weights = BOSS_WEIGHTS_BY_LAYER[layer] ?? BOSS_WEIGHTS_BY_LAYER[1];
  return {
    id:             opts.id ?? `boss_layer_${layer}`,
    layer,
    element:        opts.element ?? 'FIRE',
    hp:             opts.hp ?? 300,
    maxHp:          opts.maxHp ?? 300,
    attackPerRound: atk,
    chargeAttack:   Math.floor(atk * 2.2),
    behavior: {
      currentIntent: 'ATTACK',
      chargeStored:  false,
    },
    weights,
  };
}

/**
 * @param {{
 *   boss?: import('./state.js').BossState,
 *   round?: number,
 *   roundState?: RoundState,
 *   result?: import('./state.js').BattleResult
 * }} [opts]
 * @returns {BattleState}
 */
export function createBattleState(opts = {}) {
  return {
    boss:       opts.boss ?? createBossState(),
    round:      opts.round ?? 1,
    roundState: opts.roundState ?? createRoundState(),
    result:     opts.result ?? 'ONGOING',
  };
}

// ── BattleState ─────────────────────────────────────────────────
/** @typedef {{ boss: BossState, round: number, roundState: RoundState, result: import('./state.js').BattleResult }} BattleState */

/**
 * @param {{
 *   runId?: string,
 *   layer?: number,
 *   player?: PlayerState,
 *   deck?: import('./card.js').Card[],
 *   discardPile?: import('./card.js').Card[],
 *   hand?: import('./card.js').Card[],
 *   phase?: GamePhase,
 *   upgradePhase?: 'GENERATING'|'CHOOSING'|'APPLYING'|null,
 *   upgradeOptions?: import('./buff.js').Upgrade[],
 *   savepoint?: SavePoint|null
 * }} [opts]
 * @returns {GameState}
 */
export function createGameState(opts = {}) {
  return {
    runId:          opts.runId ?? null,
    layer:          opts.layer ?? 1,
    player:         opts.player ?? createPlayerState(),
    deck:           opts.deck ?? [],
    discardPile:    opts.discardPile ?? [],
    hand:           opts.hand ?? [],
    phase:          opts.phase ?? GAME_PHASE.BATTLE,
    upgradePhase:   opts.upgradePhase ?? null,
    upgradeOptions: opts.upgradeOptions ?? [],
    savepoint:      opts.savepoint ?? null,
  };
}

// ── GameState ───────────────────────────────────────────────────
/** @typedef {{ runId: string|null, layer: number, player: PlayerState, deck: import('./card.js').Card[], discardPile: import('./card.js').Card[], hand: import('./card.js').Card[], phase: GamePhase, upgradePhase: ('GENERATING'|'CHOOSING'|'APPLYING'|null), upgradeOptions: import('./buff.js').Upgrade[], savepoint: SavePoint|null }} GameState */

// ── 存档点 ──────────────────────────────────────────────────────
/** @typedef {{ layer: number, timestamp: number, gameState: Omit<GameState, 'savepoint'> }} SavePoint */

/**
 * @param {GameState} gameState
 * @returns {SavePoint}
 */
export function createSavepoint(gameState) {
  const { savepoint, ...rest } = gameState;
  return {
    layer:     gameState.layer,
    timestamp: Date.now(),
    gameState: rest,
  };
}
