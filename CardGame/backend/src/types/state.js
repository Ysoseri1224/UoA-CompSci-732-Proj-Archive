// ── 回合阶段 ────────────────────────────────────────────────────
/** @typedef {'DRAW'|'SKILL'|'SHUFFLE'|'PLAY'|'RESOLVE'|'BOSS_ATTACK'|'ROUND_END'} RoundPhase */

export const ROUND_PHASE = /** @type {Record<RoundPhase, RoundPhase>} */ ({
  DRAW:        'DRAW',
  SKILL:       'SKILL',
  SHUFFLE:     'SHUFFLE',
  PLAY:        'PLAY',
  RESOLVE:     'RESOLVE',
  BOSS_ATTACK: 'BOSS_ATTACK',
  ROUND_END:   'ROUND_END',
});

export const ALL_ROUND_PHASES = /** @type {RoundPhase[]} */ ([
  'DRAW',
  'SKILL',
  'SHUFFLE',
  'PLAY',
  'RESOLVE',
  'BOSS_ATTACK',
  'ROUND_END',
]);

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

// ── 出牌状态 ────────────────────────────────────────────────────
/** @typedef {{ selectedCards: string[], handType: import('./card.js').HandType|null, score: number|null }} PlayState */

// ── 玩家持久数据 ────────────────────────────────────────────────
/** @typedef {{ hp: number, maxHp: number, buffs: import('./buff.js').Buff[], chosenElement: import('./card.js').Element|null }} PlayerState */

// ── Boss 数据 ───────────────────────────────────────────────────
/** @typedef {{ id: string, layer: number, element: import('./card.js').Element, hp: number, maxHp: number, attackPerRound: number }} BossState */

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
    phase:   opts.roundPhase ?? ROUND_PHASE.DRAW,
    skills:  createRoundSkills(),
    shuffle: createShuffleState(),
    play:    createPlayState(),
  };
}

// ── RoundState ──────────────────────────────────────────────────
/** @typedef {{ phase: RoundPhase, skills: RoundSkills, shuffle: ShuffleState, play: PlayState }} RoundState */

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
  return {
    id:             opts.id ?? 'boss_layer_1',
    layer:          opts.layer ?? 1,
    element:        opts.element ?? 'FIRE',
    hp:             opts.hp ?? 300,
    maxHp:          opts.maxHp ?? 300,
    attackPerRound: opts.attackPerRound ?? 5,
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
 *   savepoint?: SavePoint|null
 * }} [opts]
 * @returns {GameState}
 */
export function createGameState(opts = {}) {
  return {
    runId:       opts.runId ?? null,
    layer:       opts.layer ?? 1,
    player:      opts.player ?? createPlayerState(),
    deck:        opts.deck ?? [],
    discardPile: opts.discardPile ?? [],
    hand:        opts.hand ?? [],
    phase:       opts.phase ?? GAME_PHASE.BATTLE,
    savepoint:   opts.savepoint ?? null,
  };
}

// ── GameState ───────────────────────────────────────────────────
/** @typedef {{ runId: string|null, layer: number, player: PlayerState, deck: import('./card.js').Card[], discardPile: import('./card.js').Card[], hand: import('./card.js').Card[], phase: GamePhase, savepoint: SavePoint|null }} GameState */

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
