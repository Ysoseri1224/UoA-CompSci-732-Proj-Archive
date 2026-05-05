// ══════════════════════════════════════════════════════════════════
//  事件（Actions / Events）
//  对应 state-machine.md §5，所有状态机接受的事件
// ══════════════════════════════════════════════════════════════════

export const EVENT = {
  // ── 技能事件 ──────────────────────────────────
  SKILL_CHANGE_COLOR: 'SKILL_CHANGE_COLOR',
  SKILL_CHANGE_COST:  'SKILL_CHANGE_COST',
  SKILL_SHIELD:       'SKILL_SHIELD',

  // ── Shuffle 事件 ──────────────────────────────
  SHUFFLE_SELECT:  'SHUFFLE_SELECT',
  SHUFFLE_CONFIRM: 'SHUFFLE_CONFIRM',
  SHUFFLE_CANCEL:  'SHUFFLE_CANCEL',

  // ── 出牌事件 ──────────────────────────────────
  PLAY_SELECT:  'PLAY_SELECT',
  PLAY_CONFIRM: 'PLAY_CONFIRM',

  // ── 系统事件（自动触发）───────────────────────
  DRAW_COMPLETE:            'DRAW_COMPLETE',
  BOSS_TELEGRAPH_COMPLETE:  'BOSS_TELEGRAPH_COMPLETE',
  RESOLVE_COMPLETE:         'RESOLVE_COMPLETE',
  BOSS_ATTACK_COMPLETE:     'BOSS_ATTACK_COMPLETE',
  ROUND_END_CONFIRM:        'ROUND_END_CONFIRM',

  // ── 胜负事件 ──────────────────────────────────
  BATTLE_WIN:  'BATTLE_WIN',
  BATTLE_LOSE: 'BATTLE_LOSE',

  // ── Roguelike 事件 ────────────────────────────
  UPGRADE_OPTIONS_READY: 'UPGRADE_OPTIONS_READY',
  SELECT_UPGRADE:        'SELECT_UPGRADE',
  UPGRADE_APPLIED:       'UPGRADE_APPLIED',
  LOAD_SAVEPOINT:        'LOAD_SAVEPOINT',

  // ── 全局事件 ──────────────────────────────────
  START_BATTLE: 'START_BATTLE',
};

// ══════════════════════════════════════════════════════════════════
//  事件工厂函数
// ══════════════════════════════════════════════════════════════════

/**
 * @param {import('./card.js').CardId} cardId
 * @param {import('./card.js').Element} newColor
 */
export function skillChangeColor(cardId, newColor) {
  return { type: EVENT.SKILL_CHANGE_COLOR, cardId, newColor };
}

/**
 * @param {import('./card.js').CardId} cardId
 * @param {import('./card.js').Rank} newCost
 */
export function skillChangeCost(cardId, newCost) {
  return { type: EVENT.SKILL_CHANGE_COST, cardId, newCost };
}

/** @returns {{ type: string }} */
export function skillShield() {
  return { type: EVENT.SKILL_SHIELD };
}

/**
 * @param {import('./card.js').CardId[]} cardIds
 */
export function shuffleSelect(cardIds) {
  return { type: EVENT.SHUFFLE_SELECT, cardIds };
}

export function shuffleConfirm() {
  return { type: EVENT.SHUFFLE_CONFIRM };
}

export function shuffleCancel() {
  return { type: EVENT.SHUFFLE_CANCEL };
}

/**
 * @param {import('./card.js').CardId} cardId
 */
export function playSelect(cardId) {
  return { type: EVENT.PLAY_SELECT, cardId };
}

export function playConfirm() {
  return { type: EVENT.PLAY_CONFIRM };
}

// ── 系统事件 ────────────────────────────────────────────────────
export function drawComplete()            { return { type: EVENT.DRAW_COMPLETE }; }
export function bossTelegraphComplete()   { return { type: EVENT.BOSS_TELEGRAPH_COMPLETE }; }
export function resolveComplete()         { return { type: EVENT.RESOLVE_COMPLETE }; }
export function bossAttackComplete()      { return { type: EVENT.BOSS_ATTACK_COMPLETE }; }
export function roundEndConfirm()         { return { type: EVENT.ROUND_END_CONFIRM }; }
export function battleWin()               { return { type: EVENT.BATTLE_WIN }; }
export function battleLose()              { return { type: EVENT.BATTLE_LOSE }; }

/**
 * @param {string} upgradeId
 */
export function selectUpgrade(upgradeId) {
  return { type: EVENT.SELECT_UPGRADE, upgradeId };
}

export function upgradeOptionsReady()  { return { type: EVENT.UPGRADE_OPTIONS_READY }; }
export function upgradeApplied()       { return { type: EVENT.UPGRADE_APPLIED }; }
export function loadSavepoint()        { return { type: EVENT.LOAD_SAVEPOINT }; }
export function startBattle()          { return { type: EVENT.START_BATTLE }; }
