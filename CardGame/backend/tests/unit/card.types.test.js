import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALL_ELEMENTS,
  ALL_RANKS,
  HAND_TYPE,
  HAND_TYPE_ORDER,
  rankToDisplay,
  rankToChipValue,
  createCard,
  createFullDeck,
} from '../../src/types/card.js';

import {
  ROUND_PHASE,
  ALL_ROUND_PHASES,
  GAME_PHASE,
  createShieldState,
  createRoundSkills,
  createShuffleState,
  createPlayState,
  createRoundState,
  createPlayerState,
  createBossState,
  createBattleState,
  createGameState,
  createSavepoint,
} from '../../src/types/state.js';

import {
  BUFF_TYPE,
  createElementDamageBuff,
  createElementDrawBuff,
  createHighRankDrawBuff,
  createUpgrade,
  FIRST_LAYER_UPGRADES,
  generateUpgradePool,
} from '../../src/types/buff.js';

import {
  EVENT,
  skillChangeColor,
  skillChangeCost,
  skillShield,
  shuffleSelect,
  shuffleConfirm,
  shuffleCancel,
  playSelect,
  playConfirm,
  drawComplete,
  resolveComplete,
  bossAttackComplete,
  roundEndConfirm,
  battleWin,
  battleLose,
  selectUpgrade,
  loadSavepoint,
  startBattle,
} from '../../src/types/events.js';

// ══════════════════════════════════════════════════════════════════
//  Card types
// ══════════════════════════════════════════════════════════════════

test('ALL_ELEMENTS has exactly 3 elements', () => {
  assert.equal(ALL_ELEMENTS.length, 3);
  assert.deepEqual(ALL_ELEMENTS, ['WATER', 'FIRE', 'GRASS']);
});

test('ALL_RANKS has exactly 13 ranks from 1 to 13', () => {
  assert.equal(ALL_RANKS.length, 13);
  assert.deepEqual(ALL_RANKS, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
});

test('rankToDisplay maps correctly', () => {
  assert.equal(rankToDisplay(1),  'A');
  assert.equal(rankToDisplay(2),  '2');
  assert.equal(rankToDisplay(10), '10');
  assert.equal(rankToDisplay(11), 'J');
  assert.equal(rankToDisplay(12), 'Q');
  assert.equal(rankToDisplay(13), 'K');
});

test('rankToChipValue maps correctly', () => {
  assert.equal(rankToChipValue(1), 1);    // A
  assert.equal(rankToChipValue(2), 2);
  assert.equal(rankToChipValue(9), 9);
  assert.equal(rankToChipValue(10), 10);
  assert.equal(rankToChipValue(11), 11);  // J
  assert.equal(rankToChipValue(12), 12);  // Q
  assert.equal(rankToChipValue(13), 13);  // K
});

test('createCard returns a complete Card object', () => {
  const card = createCard('FIRE', 7);
  assert.equal(card.id, 'FIRE_7');
  assert.equal(card.element, 'FIRE');
  assert.equal(card.rank, 7);
  assert.equal(card.displayRank, '7');
  assert.equal(card.chipValue, 7);
});

test('createCard handles Ace correctly', () => {
  const ace = createCard('WATER', 1);
  assert.equal(ace.id, 'WATER_1');
  assert.equal(ace.displayRank, 'A');
  assert.equal(ace.chipValue, 1);
});

test('createCard handles face cards correctly', () => {
  assert.equal(createCard('GRASS', 11).chipValue, 11);
  assert.equal(createCard('GRASS', 12).chipValue, 12);
  assert.equal(createCard('GRASS', 13).chipValue, 13);
});

test('CardId format is {ELEMENT}_{rank}', () => {
  const card = createCard('WATER', 13);
  assert.equal(card.id, 'WATER_13');
  assert.ok(card.id.match(/^(WATER|FIRE|GRASS)_(1[0-3]|[1-9])$/));
});

test('createFullDeck generates 39 unique cards', () => {
  const deck = createFullDeck();
  assert.equal(deck.length, 39);

  const ids = new Set(deck.map(c => c.id));
  assert.equal(ids.size, 39);

  // Verify each element has 13 ranks
  for (const element of ALL_ELEMENTS) {
    const elementCards = deck.filter(c => c.element === element);
    assert.equal(elementCards.length, 13);
    for (const rank of ALL_RANKS) {
      assert.ok(elementCards.some(c => c.rank === rank),
        `Missing ${element}_${rank}`);
    }
  }
});

// ══════════════════════════════════════════════════════════════════
//  Hand types
// ══════════════════════════════════════════════════════════════════

test('HAND_TYPE has all 9 hand types', () => {
  const expected = [
    'STRAIGHT_FLUSH', 'FOUR_OF_A_KIND', 'FULL_HOUSE',
    'FLUSH', 'STRAIGHT', 'THREE_OF_A_KIND',
    'TWO_PAIR', 'PAIR', 'HIGH_CARD',
  ];
  for (const t of expected) {
    assert.equal(HAND_TYPE[t], t);
  }
});

test('HAND_TYPE_ORDER is sorted from highest to lowest priority', () => {
  assert.deepEqual(HAND_TYPE_ORDER, [
    'STRAIGHT_FLUSH',
    'FOUR_OF_A_KIND',
    'FULL_HOUSE',
    'FLUSH',
    'STRAIGHT',
    'THREE_OF_A_KIND',
    'TWO_PAIR',
    'PAIR',
    'HIGH_CARD',
  ]);
});

// ══════════════════════════════════════════════════════════════════
//  State types
// ══════════════════════════════════════════════════════════════════

test('ROUND_PHASE exports all 7 phases', () => {
  const required = ['DRAW', 'SKILL', 'SHUFFLE', 'PLAY', 'RESOLVE', 'BOSS_ATTACK', 'ROUND_END'];
  for (const k of required) {
    assert.equal(ROUND_PHASE[k], k);
  }
  assert.deepEqual(ALL_ROUND_PHASES, required);
});

test('GAME_PHASE exports all 4 phases', () => {
  assert.equal(GAME_PHASE.BATTLE, 'BATTLE');
  assert.equal(GAME_PHASE.UPGRADE, 'UPGRADE');
  assert.equal(GAME_PHASE.GAME_OVER, 'GAME_OVER');
  assert.equal(GAME_PHASE.RUN_COMPLETE, 'RUN_COMPLETE');
});

test('createShieldState defaults to inactive and not on cooldown', () => {
  const shield = createShieldState();
  assert.equal(shield.active, false);
  assert.equal(shield.onCooldown, false);
});

test('createRoundSkills initialises with nothing used', () => {
  const skills = createRoundSkills();
  assert.equal(skills.changeColor.used, false);
  assert.equal(skills.changeCost.used, false);
  assert.equal(skills.shield.active, false);
  assert.equal(skills.shield.onCooldown, false);
});

test('createShuffleState defaults to 2 remaining and empty pending', () => {
  const shuffle = createShuffleState();
  assert.equal(shuffle.remaining, 2);
  assert.deepEqual(shuffle.pendingDiscard, []);
});

test('createPlayState defaults to empty selection', () => {
  const play = createPlayState();
  assert.deepEqual(play.selectedCards, []);
  assert.equal(play.handType, null);
  assert.equal(play.score, null);
});

test('createRoundState defaults to DRAW phase', () => {
  const rs = createRoundState();
  assert.equal(rs.phase, 'DRAW');
  assert.ok(rs.skills);
  assert.ok(rs.shuffle);
  assert.ok(rs.play);
});

test('createRoundState accepts custom phase', () => {
  const rs = createRoundState({ roundPhase: 'PLAY' });
  assert.equal(rs.phase, 'PLAY');
});

test('createPlayerState defaults', () => {
  const p = createPlayerState();
  assert.equal(p.hp, 20);
  assert.equal(p.maxHp, 20);
  assert.deepEqual(p.buffs, []);
  assert.equal(p.chosenElement, null);
});

test('createPlayerState accepts overrides', () => {
  const p = createPlayerState({ hp: 15, chosenElement: 'WATER' });
  assert.equal(p.hp, 15);
  assert.equal(p.chosenElement, 'WATER');
});

test('createBossState defaults', () => {
  const b = createBossState();
  assert.equal(b.id, 'boss_layer_1');
  assert.equal(b.layer, 1);
  assert.equal(b.hp, 300);
  assert.equal(b.maxHp, 300);
  assert.equal(b.attackPerRound, 5);
});

test('createBattleState defaults to ONGOING round 1', () => {
  const bs = createBattleState();
  assert.equal(bs.round, 1);
  assert.equal(bs.result, 'ONGOING');
  assert.ok(bs.boss);
  assert.ok(bs.roundState);
});

test('createGameState defaults', () => {
  const gs = createGameState();
  assert.equal(gs.layer, 1);
  assert.equal(gs.phase, 'BATTLE');
  assert.deepEqual(gs.deck, []);
  assert.deepEqual(gs.hand, []);
  assert.equal(gs.savepoint, null);
});

test('createSavepoint preserves gameState without savepoint field', () => {
  const gs = createGameState({ runId: 'test-run-1', layer: 3 });
  const sp = createSavepoint(gs);
  assert.equal(sp.layer, 3);
  assert.ok(typeof sp.timestamp === 'number');
  assert.ok(sp.gameState);
  assert.equal(sp.gameState.runId, 'test-run-1');
  assert.equal('savepoint' in sp.gameState, false);
});

// ══════════════════════════════════════════════════════════════════
//  Buff types
// ══════════════════════════════════════════════════════════════════

test('createElementDamageBuff creates correct buff', () => {
  const buff = createElementDamageBuff('WATER', 1.2);
  assert.equal(buff.type, BUFF_TYPE.ELEMENT_DAMAGE_MULT);
  assert.equal(buff.element, 'WATER');
  assert.equal(buff.value, 1.2);
});

test('createElementDamageBuff defaults to 1.1', () => {
  const buff = createElementDamageBuff('FIRE');
  assert.equal(buff.value, 1.1);
});

test('createElementDrawBuff creates correct buff', () => {
  const buff = createElementDrawBuff('GRASS');
  assert.equal(buff.type, BUFF_TYPE.ELEMENT_DRAW_ON_SHUFFLE);
  assert.equal(buff.element, 'GRASS');
});

test('createHighRankDrawBuff creates correct buff', () => {
  const buff = createHighRankDrawBuff();
  assert.equal(buff.type, BUFF_TYPE.HIGH_RANK_DRAW_ON_SHUFFLE);
});

test('createUpgrade returns complete object', () => {
  const buff = createElementDamageBuff('FIRE');
  const up = createUpgrade('u1', 'Test', 'Desc', buff);
  assert.equal(up.id, 'u1');
  assert.equal(up.label, 'Test');
  assert.equal(up.description, 'Desc');
  assert.deepEqual(up.buff, buff);
});

test('FIRST_LAYER_UPGRADES has exactly 3 choices', () => {
  assert.equal(FIRST_LAYER_UPGRADES.length, 3);
  const elements = FIRST_LAYER_UPGRADES.map(u => u.buff.element);
  assert.deepEqual(elements, ['WATER', 'FIRE', 'GRASS']);
});

test('generateUpgradePool returns exactly 3 upgrades', () => {
  const pool = generateUpgradePool('WATER', 2);
  assert.equal(pool.length, 3);
  for (const u of pool) {
    assert.ok(typeof u.id === 'string');
    assert.ok(typeof u.label === 'string');
    assert.ok(typeof u.description === 'string');
    assert.ok(u.buff);
  }
});

test('generateUpgradePool returns upgrades for the chosen element', () => {
  const pool = generateUpgradePool('WATER', 3);
  // At least one upgrade should reference the chosen element
  const hasElementUpgrade = pool.some(u =>
    u.buff.element === 'WATER' ||
    u.id.includes('WATER') ||
    u.id.includes('water')
  );
  assert.ok(hasElementUpgrade);
});

// ══════════════════════════════════════════════════════════════════
//  Event types
// ══════════════════════════════════════════════════════════════════

test('EVENT exports all event type constants', () => {
  const required = [
    'SKILL_CHANGE_COLOR', 'SKILL_CHANGE_COST', 'SKILL_SHIELD',
    'SHUFFLE_SELECT', 'SHUFFLE_CONFIRM', 'SHUFFLE_CANCEL',
    'PLAY_SELECT', 'PLAY_CONFIRM',
    'DRAW_COMPLETE', 'RESOLVE_COMPLETE', 'BOSS_ATTACK_COMPLETE', 'ROUND_END_CONFIRM',
    'BATTLE_WIN', 'BATTLE_LOSE',
    'SELECT_UPGRADE', 'LOAD_SAVEPOINT',
    'START_BATTLE',
  ];
  for (const k of required) {
    assert.equal(EVENT[k], k);
  }
});

test('all event factory functions return { type } objects', () => {
  const events = [
    skillChangeColor('WATER_1', 'FIRE'),
    skillChangeCost('FIRE_7', 10),
    skillShield(),
    shuffleSelect(['WATER_1', 'FIRE_3']),
    shuffleConfirm(),
    shuffleCancel(),
    playSelect('WATER_5'),
    playConfirm(),
    drawComplete(),
    resolveComplete(),
    bossAttackComplete(),
    roundEndConfirm(),
    battleWin(),
    battleLose(),
    selectUpgrade(createUpgrade('u1', 'L', 'D', createElementDamageBuff('WATER'))),
    loadSavepoint(),
    startBattle(),
  ];

  for (const ev of events) {
    assert.ok(typeof ev.type === 'string', `event missing type: ${JSON.stringify(ev)}`);
  }
});

test('skillChangeColor includes cardId and newColor', () => {
  const ev = skillChangeColor('WATER_3', 'FIRE');
  assert.equal(ev.type, 'SKILL_CHANGE_COLOR');
  assert.equal(ev.cardId, 'WATER_3');
  assert.equal(ev.newColor, 'FIRE');
});

test('skillChangeCost includes cardId and newCost', () => {
  const ev = skillChangeCost('GRASS_10', 13);
  assert.equal(ev.type, 'SKILL_CHANGE_COST');
  assert.equal(ev.cardId, 'GRASS_10');
  assert.equal(ev.newCost, 13);
});

test('shuffleSelect includes cardIds array', () => {
  const ev = shuffleSelect(['WATER_1', 'FIRE_7']);
  assert.equal(ev.type, 'SHUFFLE_SELECT');
  assert.deepEqual(ev.cardIds, ['WATER_1', 'FIRE_7']);
});

test('playSelect includes cardId', () => {
  const ev = playSelect('GRASS_13');
  assert.equal(ev.type, 'PLAY_SELECT');
  assert.equal(ev.cardId, 'GRASS_13');
});

test('selectUpgrade includes upgrade object', () => {
  const up = createUpgrade('test_up', 'Test Upgrade', 'A test upgrade', createElementDamageBuff('WATER'));
  const ev = selectUpgrade(up);
  assert.equal(ev.type, 'SELECT_UPGRADE');
  assert.deepEqual(ev.upgrade, up);
});
