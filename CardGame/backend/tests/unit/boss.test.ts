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
  assert.equal(playerHpForLayer(4), 30);
  assert.equal(playerHpForLayer(6), 30);
  assert.equal(playerHpForLayer(7), 40);
  assert.equal(playerHpForLayer(10), 40);
});
