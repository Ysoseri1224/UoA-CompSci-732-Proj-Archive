import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BASE_BOSS_HP,
  BASE_BOSS_ATTACK,
  calcBossHp,
  calcBossAttack,
  calcChargeAttack,
  createBossForLayer,
} from '../../src/lib/boss.js';
import { BOSS_WEIGHTS_BY_LAYER } from '../../src/types/state.js';

// ══════════════════════════════════════════════════════════════════
//  基础常量
// ══════════════════════════════════════════════════════════════════

test('BASE_BOSS_HP is 300', () => {
  assert.equal(BASE_BOSS_HP, 300);
});

test('BASE_BOSS_ATTACK is 5', () => {
  assert.equal(BASE_BOSS_ATTACK, 5);
});

// ══════════════════════════════════════════════════════════════════
//  缩放公式
// ══════════════════════════════════════════════════════════════════

test('calcBossHp: layer 1 = 300', () => {
  assert.equal(calcBossHp(1), 300);
});

test('calcBossHp: grows with layer', () => {
  const hp1 = calcBossHp(1);
  const hp3 = calcBossHp(3);
  const hp5 = calcBossHp(5);

  // Layer 3: 300 * (1 + 0.3*2) = 300 * 1.6 = 480
  assert.equal(hp3, Math.floor(300 * 1.6));
  // Layer 5: 300 * (1 + 0.3*4) = 300 * 2.2 = 660
  assert.equal(hp5, Math.floor(300 * 2.2));

  assert.ok(hp3 > hp1, 'layer 3 HP should exceed layer 1');
  assert.ok(hp5 > hp3, 'layer 5 HP should exceed layer 3');
});

test('calcBossAttack: layer 1 = 5', () => {
  assert.equal(calcBossAttack(1), 5);
});

test('calcBossAttack: grows with layer', () => {
  const atk1 = calcBossAttack(1);
  const atk4 = calcBossAttack(4);
  // Layer 4: 5 * (1 + 0.2*3) = 5 * 1.6 = 8
  assert.equal(atk4, Math.floor(5 * 1.6));
  assert.ok(atk4 > atk1, 'layer 4 attack should exceed layer 1');
});

test('calcChargeAttack: 2.2x attack', () => {
  assert.equal(calcChargeAttack(10), 22);
  assert.equal(calcChargeAttack(5), Math.floor(5 * 2.2));
  assert.equal(calcChargeAttack(0), 0);
});

// ══════════════════════════════════════════════════════════════════
//  Boss 工厂
// ══════════════════════════════════════════════════════════════════

test('createBossForLayer: layer 1 boss', () => {
  const boss = createBossForLayer(1);
  assert.equal(boss.id, 'boss_layer_1');
  assert.equal(boss.layer, 1);
  assert.equal(boss.hp, calcBossHp(1));
  assert.equal(boss.maxHp, calcBossHp(1));
  assert.equal(boss.attackPerRound, calcBossAttack(1));
  assert.equal(boss.chargeAttack, calcChargeAttack(boss.attackPerRound));
  assert.equal(boss.behavior.currentIntent, 'ATTACK');
  assert.equal(boss.behavior.chargeStored, false);
});

test('createBossForLayer: layer 5 boss scales correctly', () => {
  const boss = createBossForLayer(5);
  assert.equal(boss.layer, 5);
  assert.equal(boss.hp, calcBossHp(5));
  assert.equal(boss.attackPerRound, calcBossAttack(5));
  assert.ok(boss.hp > 300, 'layer 5 HP should be > base 300');
});

test('createBossForLayer: element cycles', () => {
  // ALL_ELEMENTS = ['WATER', 'FIRE', 'GRASS']
  // Cycle: WATER(1), FIRE(2), GRASS(3), WATER(4), ...
  const b1 = createBossForLayer(1);
  const b2 = createBossForLayer(2);
  const b3 = createBossForLayer(3);
  const b4 = createBossForLayer(4);

  assert.equal(b1.element, 'WATER');
  assert.equal(b2.element, 'FIRE');
  assert.equal(b3.element, 'GRASS');
  assert.equal(b4.element, 'WATER');
});

test('createBossForLayer: uses correct weight tier', () => {
  const boss1 = createBossForLayer(1);
  const boss5 = createBossForLayer(5);

  // Layer 1: { attack: 0.80, ... }
  assert.equal(boss1.weights.attack, 0.80);
  // Layer 5: { attack: 0.60, ... }
  assert.equal(boss5.weights.attack, 0.60);
});

test('createBossForLayer: all layers 1-10 produce valid bosses', () => {
  for (let layer = 1; layer <= 10; layer++) {
    const boss = createBossForLayer(layer);
    assert.equal(boss.layer, layer);
    assert.ok(boss.hp > 0, `layer ${layer}: hp must be positive`);
    assert.ok(boss.attackPerRound > 0, `layer ${layer}: attack must be positive`);
    assert.ok(boss.chargeAttack >= boss.attackPerRound,
      `layer ${layer}: chargeAttack must be >= attackPerRound`);
    assert.ok(['FIRE', 'WATER', 'GRASS'].includes(boss.element),
      `layer ${layer}: element must be valid`);
    const w = boss.weights;
    assert.ok(Math.abs(w.attack + w.charge + w.defend - 1.0) < 0.001,
      `layer ${layer}: weights must sum to 1`);
  }
});
