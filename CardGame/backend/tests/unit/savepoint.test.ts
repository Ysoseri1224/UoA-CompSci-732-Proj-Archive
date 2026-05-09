import test from 'node:test';
import assert from 'node:assert/strict';

import { createPlayerState, createBossState, createGameState } from '../../src/types/state.js';
import { createElementChipMult } from '../../src/types/buff.js';
import {
  createSavepoint,
  restoreFromSavepoint,
  validateSavepoint,
} from '../../src/lib/savepoint.js';

// ══════════════════════════════════════════════════════════════════
//  createSavepoint
// ══════════════════════════════════════════════════════════════════

test('createSavepoint produces valid SavePoint', () => {
  const gs = createGameState({ runId: 'run-1', layer: 3 });
  const sp = createSavepoint(gs);

  assert.equal(sp.layer, 3);
  assert.ok(typeof sp.timestamp === 'number');
  assert.ok(sp.timestamp > 0);
  assert.ok(sp.gameState);
  assert.equal(sp.gameState.runId, 'run-1');
});

test('createSavepoint strips savepoint field from gameState', () => {
  const gs = createGameState({ runId: 'run-2' });
  const sp = createSavepoint(gs);

  assert.ok(!('savepoint' in sp.gameState), 'gameState inside savepoint should not have savepoint');
});

test('createSavepoint deep-clones: modifying original does not affect savepoint', () => {
  const gs = createGameState({ runId: 'run-3', layer: 2 });
  const sp = createSavepoint(gs);

  gs.layer = 99;
  gs.player.hp = 0;

  assert.equal(sp.gameState.layer, 2);
  assert.equal(sp.gameState.player.hp, 20); // original default
});

// ══════════════════════════════════════════════════════════════════
//  restoreFromSavepoint
// ══════════════════════════════════════════════════════════════════

test('restoreFromSavepoint returns original gameState', () => {
  const gs = createGameState({
    runId: 'run-4',
    layer: 5,
    player: createPlayerState({ hp: 10, chosenElement: 'FIRE' }),
  });
  const sp = createSavepoint(gs);
  const restored = restoreFromSavepoint(sp);

  assert.equal(restored.runId, 'run-4');
  assert.equal(restored.layer, 5);
  assert.equal(restored.player.hp, 10);
  assert.equal(restored.player.chosenElement, 'FIRE');
});

test('restoreFromSavepoint preserves buffs', () => {
  const buff = createElementChipMult('WATER', 1.5);
  const gs = createGameState({
    player: createPlayerState({ buffs: [buff], chosenElement: 'WATER' }),
  });
  const sp = createSavepoint(gs);
  const restored = restoreFromSavepoint(sp);

  assert.equal(restored.player.buffs.length, 1);
  assert.equal(restored.player.buffs[0].type, 'ELEMENT_CHIP_MULT');
  assert.equal(restored.player.buffs[0].element, 'WATER');
});

// ══════════════════════════════════════════════════════════════════
//  validateSavepoint
// ══════════════════════════════════════════════════════════════════

test('validateSavepoint: valid savepoint passes', () => {
  const gs = createGameState({ runId: 'run-5' });
  const sp = createSavepoint(gs);
  assert.equal(validateSavepoint(sp), true);
});

test('validateSavepoint: null fails', () => {
  assert.equal(validateSavepoint(null), false);
});

test('validateSavepoint: undefined fails', () => {
  assert.equal(validateSavepoint(undefined), false);
});

test('validateSavepoint: non-object fails', () => {
  assert.equal(validateSavepoint('not-a-savepoint'), false);
  assert.equal(validateSavepoint(42), false);
});

test('validateSavepoint: missing fields fail', () => {
  assert.equal(validateSavepoint({}), false);
  assert.equal(validateSavepoint({ layer: 1 }), false);
  assert.equal(validateSavepoint({ layer: 1, timestamp: 0 }), false);
  assert.equal(validateSavepoint({ layer: 1, timestamp: 0, gameState: null }), false);
});

// ══════════════════════════════════════════════════════════════════
//  往返测试
// ══════════════════════════════════════════════════════════════════

test('round-trip: save → validate → restore produces identical state', () => {
  const original = createGameState({
    runId: 'round-trip-test',
    layer: 4,
    player: createPlayerState({ hp: 15, chosenElement: 'GRASS' }),
  });

  const sp = createSavepoint(original);
  assert.equal(validateSavepoint(sp), true);

  const restored = restoreFromSavepoint(sp);
  assert.equal(restored.runId, original.runId);
  assert.equal(restored.layer, original.layer);
  assert.equal(restored.player.hp, original.player.hp);
  assert.equal(restored.player.chosenElement, original.player.chosenElement);
});
