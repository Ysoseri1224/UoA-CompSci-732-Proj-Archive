import type { CardId, Element, Rank } from './card.js';

export const EVENT = {
  SKILL_CHANGE_COLOR:      'SKILL_CHANGE_COLOR',
  SKILL_CHANGE_COST:       'SKILL_CHANGE_COST',
  SKILL_SHIELD:            'SKILL_SHIELD',
  SHUFFLE_SELECT:          'SHUFFLE_SELECT',
  SHUFFLE_CONFIRM:         'SHUFFLE_CONFIRM',
  SHUFFLE_CANCEL:          'SHUFFLE_CANCEL',
  PLAY_SELECT:             'PLAY_SELECT',
  PLAY_CONFIRM:            'PLAY_CONFIRM',
  DRAW_COMPLETE:           'DRAW_COMPLETE',
  BOSS_TELEGRAPH_COMPLETE: 'BOSS_TELEGRAPH_COMPLETE',
  RESOLVE_COMPLETE:        'RESOLVE_COMPLETE',
  BOSS_ATTACK_COMPLETE:    'BOSS_ATTACK_COMPLETE',
  ROUND_END_CONFIRM:       'ROUND_END_CONFIRM',
  BATTLE_WIN:              'BATTLE_WIN',
  BATTLE_LOSE:             'BATTLE_LOSE',
  UPGRADE_OPTIONS_READY:   'UPGRADE_OPTIONS_READY',
  SELECT_UPGRADE:          'SELECT_UPGRADE',
  UPGRADE_APPLIED:         'UPGRADE_APPLIED',
  LOAD_SAVEPOINT:          'LOAD_SAVEPOINT',
  START_BATTLE:            'START_BATTLE',
} as const;

// ── 事件工厂 ────────────────────────────────────────────────────

export function skillChangeColor(cardId: CardId, newColor: Element) {
  return { type: EVENT.SKILL_CHANGE_COLOR, cardId, newColor } as const;
}
export function skillChangeCost(cardId: CardId, newCost: Rank) {
  return { type: EVENT.SKILL_CHANGE_COST, cardId, newCost } as const;
}
export function skillShield()            { return { type: EVENT.SKILL_SHIELD } as const; }
export function shuffleSelect(cardIds: CardId[]) {
  return { type: EVENT.SHUFFLE_SELECT, cardIds } as const;
}
export function shuffleConfirm()          { return { type: EVENT.SHUFFLE_CONFIRM } as const; }
export function shuffleCancel()          { return { type: EVENT.SHUFFLE_CANCEL } as const; }
export function playSelect(cardId: CardId) {
  return { type: EVENT.PLAY_SELECT, cardId } as const;
}
export function playConfirm()            { return { type: EVENT.PLAY_CONFIRM } as const; }
export function drawComplete()           { return { type: EVENT.DRAW_COMPLETE } as const; }
export function bossTelegraphComplete()  { return { type: EVENT.BOSS_TELEGRAPH_COMPLETE } as const; }
export function resolveComplete()        { return { type: EVENT.RESOLVE_COMPLETE } as const; }
export function bossAttackComplete()     { return { type: EVENT.BOSS_ATTACK_COMPLETE } as const; }
export function roundEndConfirm()        { return { type: EVENT.ROUND_END_CONFIRM } as const; }
export function battleWin()              { return { type: EVENT.BATTLE_WIN } as const; }
export function battleLose()             { return { type: EVENT.BATTLE_LOSE } as const; }
export function upgradeOptionsReady()    { return { type: EVENT.UPGRADE_OPTIONS_READY } as const; }
export function selectUpgrade(upgradeId: string) {
  return { type: EVENT.SELECT_UPGRADE, upgradeId } as const;
}
export function upgradeApplied()         { return { type: EVENT.UPGRADE_APPLIED } as const; }
export function loadSavepoint()          { return { type: EVENT.LOAD_SAVEPOINT } as const; }
export function startBattle()            { return { type: EVENT.START_BATTLE } as const; }

/** Union of all possible game event types */
export type GameEvent = ReturnType<typeof skillChangeColor>
  | ReturnType<typeof skillChangeCost>
  | ReturnType<typeof skillShield>
  | ReturnType<typeof shuffleSelect>
  | ReturnType<typeof shuffleConfirm>
  | ReturnType<typeof shuffleCancel>
  | ReturnType<typeof playSelect>
  | ReturnType<typeof playConfirm>
  | ReturnType<typeof drawComplete>
  | ReturnType<typeof bossTelegraphComplete>
  | ReturnType<typeof resolveComplete>
  | ReturnType<typeof bossAttackComplete>
  | ReturnType<typeof roundEndConfirm>
  | ReturnType<typeof battleWin>
  | ReturnType<typeof battleLose>
  | ReturnType<typeof upgradeOptionsReady>
  | ReturnType<typeof selectUpgrade>
  | ReturnType<typeof upgradeApplied>
  | ReturnType<typeof loadSavepoint>
  | ReturnType<typeof startBattle>;
