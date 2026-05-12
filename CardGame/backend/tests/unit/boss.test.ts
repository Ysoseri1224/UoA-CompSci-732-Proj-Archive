import test from 'node:test';
import assert from 'node:assert/strict';

import { calcChargeAttack, createBossForLayer, playerHpForLayer } from '../../src/lib/boss.js';
import { BOSS_WEIGHTS_BY_LAYER } from '../../src/types/state.js';

// ══════════════════════════════════════════════════════════════════
//  蓄力公式
// ══════════════════════════════════════════════════════════════════

test('calcChargeAttack: 2.2x attack', () => {
  assert.equal(calcChargeAttack(10), 22);
  assert.equal(calcChargeAttack(3), Math.floor(3 * 2.2));
  assert.equal(calcChargeAttack(0), 0);
});

// ══════════════════════════════════════════════════════════════════
//  Boss 工厂（查表）
// ══════════════════════════════════════════════════════════════════

test('createBossForLayer: layer 1 boss', () => {
  const boss = createBossForLayer(1);
  assert.equal(boss.id, 'boss_layer_1');
  assert.equal(boss.layer, 1);
  assert.equal(boss.hp, 543);
  assert.equal(boss.maxHp, 543);
  assert.equal(boss.attackPerRound, 3);
  assert.equal(boss.chargeAttack, calcChargeAttack(3));
  assert.equal(boss.behavior.currentIntent, 'ATTACK');
  assert.equal(boss.behavior.chargeStored, false);
});

test('createBossForLayer: layer 5 boss', () => {
  const boss = createBossForLayer(5);
  assert.equal(boss.layer, 5);
  assert.equal(boss.hp, 966);
  assert.equal(boss.attackPerRound, 10);
});

test('createBossForLayer: layer 10 boss', () => {
  const boss = createBossForLayer(10);
  assert.equal(boss.hp, 1760);
  assert.equal(boss.attackPerRound, 23);
  assert.equal(boss.chargeAttack, Math.floor(23 * 2.2));
});

test('createBossForLayer: HP monotonically increases', () => {
  let prev = 0;
  for (let L = 1; L <= 10; L++) {
    const boss = createBossForLayer(L);
    assert.ok(boss.hp > prev, `Layer ${L} HP (${boss.hp}) should > layer ${L - 1} (${prev})`);
    prev = boss.hp;
  }
});

test('createBossForLayer: ATK monotonically increases', () => {
  let prev = 0;
  for (let L = 1; L <= 10; L++) {
    const boss = createBossForLayer(L);
    assert.ok(boss.attackPerRound >= prev, `Layer ${L} ATK (${boss.attackPerRound}) should >= layer ${L - 1} (${prev})`);
    prev = boss.attackPerRound;
  }
});

test('createBossForLayer: element cycles WATER→FIRE→GRASS', () => {
  assert.equal(createBossForLayer(1).element, 'WATER');
  assert.equal(createBossForLayer(2).element, 'FIRE');
  assert.equal(createBossForLayer(3).element, 'GRASS');
  assert.equal(createBossForLayer(4).element, 'WATER');
});

test('createBossForLayer: uses correct weight tier', () => {
  assert.equal(createBossForLayer(1).weights.attack, 0.80);
  assert.equal(createBossForLayer(5).weights.attack, 0.60);
  assert.equal(createBossForLayer(7).weights.attack, 0.45);
});

test('createBossForLayer: all layers produce valid bosses', () => {
  for (let L = 1; L <= 10; L++) {
    const boss = createBossForLayer(L);
    assert.equal(boss.layer, L);
    assert.ok(boss.hp > 0);
    assert.ok(boss.attackPerRound > 0);
    assert.ok(boss.chargeAttack >= boss.attackPerRound);
    assert.ok(['WATER', 'FIRE', 'GRASS'].includes(boss.element));
    const w = boss.weights;
    assert.ok(Math.abs(w.attack + w.charge + w.defend - 1.0) < 0.001);
  }
});

// ══════════════════════════════════════════════════════════════════
//  玩家 HP 分档
// ══════════════════════════════════════════════════════════════════

test('playerHpForLayer: tiered growth', () => {
  assert.equal(playerHpForLayer(1), 20);
  assert.equal(playerHpForLayer(3), 20);
  assert.equal(playerHpForLayer(4), 20);
  assert.equal(playerHpForLayer(6), 30);
  assert.equal(playerHpForLayer(7), 30);
  assert.equal(playerHpForLayer(10), 30);
});

// Endless mode L11+ extrapolation
test('createBossForLayer works for L11+ with extrapolation', () => {
  for (const layer of [11, 15, 20, 25, 30, 50]) {
    const boss = createBossForLayer(layer);
    assert.equal(boss.layer, layer);
    assert.ok(boss.hp > 1760, `L${layer} HP ${boss.hp} should exceed L10 HP 1760`);
    assert.ok(boss.maxHp > 1760);
    assert.ok(boss.attackPerRound >= 23, `L${layer} ATK ${boss.attackPerRound} should be >= L10 ATK 23`);
  }
});

test('playerHpForLayer returns correct tiered values', () => {
  const expected = {
    1: 20, 3: 20, 5: 20,
    6: 30, 8: 30, 10: 30,
    11: 40, 13: 40, 15: 40,
    16: 50, 18: 50, 20: 50,
    21: 60, 30: 70, 35: 80, 50: 110,
  };
  for (const [layer, hp] of Object.entries(expected)) {
    assert.equal(playerHpForLayer(Number(layer)), hp, `L${layer} should have ${hp} HP`);
  }
});

test('boss stats grow monotonically', () => {
  let prevHp = 0;
  let prevAtk = 0;
  for (let l = 1; l <= 30; l++) {
    const boss = createBossForLayer(l);
    assert.ok(boss.hp >= prevHp, `L${l} HP ${boss.hp} >= L${l-1} HP ${prevHp}`);
    assert.ok(boss.attackPerRound >= prevAtk, `L${l} ATK ${boss.attackPerRound} >= L${l-1} ATK ${prevAtk}`);
    prevHp = boss.hp;
    prevAtk = boss.attackPerRound;
  }
});
