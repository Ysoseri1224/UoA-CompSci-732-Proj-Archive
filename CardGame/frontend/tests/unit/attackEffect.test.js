import test from 'node:test';
import assert from 'node:assert/strict';

function card(id, color, cost) {
  return { id, cost, color, name: `${color}-${cost}`, image: `/cards/card_${cost}.png` };
}

function inferAttackEffectModeFromCards(cards) {
  if (!Array.isArray(cards) || cards.length === 0) return 'normal';
  function contribution(c) {
    if (!c) return null;
    if (c.color === 'red')   return 'fire';
    if (c.color === 'blue')  return 'water';
    if (c.color === 'green') return 'nature';
    return null;
  }
  const modes = cards.map(contribution);
  if (modes.some((m) => m == null)) return 'normal';
  const unique = new Set(modes);
  if (unique.size !== 1) return 'normal';
  return modes[0];
}

test('null input -> normal', () => {
  assert.equal(inferAttackEffectModeFromCards(null), 'normal');
});

test('empty array -> normal', () => {
  assert.equal(inferAttackEffectModeFromCards([]), 'normal');
});

test('undefined -> normal', () => {
  assert.equal(inferAttackEffectModeFromCards(undefined), 'normal');
});

test('single red card -> fire', () => {
  assert.equal(inferAttackEffectModeFromCards([card('a', 'red', 5)]), 'fire');
});

test('single blue card -> water', () => {
  assert.equal(inferAttackEffectModeFromCards([card('a', 'blue', 3)]), 'water');
});

test('single green card -> nature', () => {
  assert.equal(inferAttackEffectModeFromCards([card('a', 'green', 7)]), 'nature');
});

test('all red cards -> fire', () => {
  const cards = [card('a','red',1), card('b','red',2), card('c','red',3)];
  assert.equal(inferAttackEffectModeFromCards(cards), 'fire');
});

test('all blue cards -> water', () => {
  const cards = [card('a','blue',1), card('b','blue',2)];
  assert.equal(inferAttackEffectModeFromCards(cards), 'water');
});

test('all green cards -> nature', () => {
  const cards = [card('a','green',4), card('b','green',5)];
  assert.equal(inferAttackEffectModeFromCards(cards), 'nature');
});

test('mixed red and blue -> normal', () => {
  assert.equal(inferAttackEffectModeFromCards([card('a','red',1), card('b','blue',2)]), 'normal');
});

test('mixed red and green -> normal', () => {
  assert.equal(inferAttackEffectModeFromCards([card('a','red',1), card('b','green',2)]), 'normal');
});

test('unknown color -> normal', () => {
  assert.equal(inferAttackEffectModeFromCards([card('a','purple',5)]), 'normal');
});

test('null card in array -> normal', () => {
  assert.equal(inferAttackEffectModeFromCards([card('a','red',1), null]), 'normal');
});

test('5-card all-fire hand -> fire', () => {
  const cards = [1,2,3,4,5].map(i => card(`f${i}`, 'red', i));
  assert.equal(inferAttackEffectModeFromCards(cards), 'fire');
});
