import test from 'node:test';
import assert from 'node:assert/strict';


function applyEnhancement(existing, enhancement) {
  const next = [...existing, enhancement];
  const buffs = next.map(e => e.buff).filter(Boolean);
  return { enhancements: next, buffs };
}

const WATER_SPEC = { id: 'water_spec', buff: { type: 'ELEMENT_CHIP_MULT', element: 'WATER' } };
const FIRE_SPEC = { id: 'fire_spec', buff: { type: 'ELEMENT_CHIP_MULT', element: 'FIRE' } };
const VITALITY = { id: 'hp_boost_3', buff: { type: 'HP_BONUS', bonusHp: 5 } };
const TIERED_MULT = { id: 'tiered_mult_2', buff: { type: 'TIERED_MULT_BONUS' } };


test('confirmEnhancement: first enhancement added to empty array', () => {
  const { enhancements } = applyEnhancement([], WATER_SPEC);
  assert.equal(enhancements.length, 1);
  assert.equal(enhancements[0].id, 'water_spec');
});

test('confirmEnhancement: second enhancement stacks (stackable type)', () => {
  const { enhancements: after1 } = applyEnhancement([], WATER_SPEC);
  const { enhancements: after2 } = applyEnhancement(after1, WATER_SPEC);
  assert.equal(after2.length, 2);
  assert.equal(after2[0].id, 'water_spec');
});

test('confirmEnhancement: different enhancement types stack independently', () => {
  const { enhancements: after1 } = applyEnhancement([], WATER_SPEC);
  const { enhancements: after2 } = applyEnhancement(after1, FIRE_SPEC);
  assert.equal(after2.length, 2);
  assert.equal(after2[1].id, 'fire_spec');
});

test('confirmEnhancement: three different enhancements accumulate correctly', () => {
  let state = applyEnhancement([], WATER_SPEC).enhancements;
  state = applyEnhancement(state, VITALITY).enhancements;
  state = applyEnhancement(state, TIERED_MULT).enhancements;
  assert.equal(state.length, 3);
});

test('buffs extracted correctly from enhancements', () => {
  const { buffs } = applyEnhancement([WATER_SPEC], FIRE_SPEC);
  assert.equal(buffs.length, 2);
  assert.equal(buffs[0].type, 'ELEMENT_CHIP_MULT');
  assert.equal(buffs[1].element, 'FIRE');
});

test('enhancements without buff field are filtered out', () => {
  const noBuff = { id: 'no_buff' };
  const { buffs } = applyEnhancement([noBuff], WATER_SPEC);
  assert.equal(buffs.length, 1);
  assert.equal(buffs[0].element, 'WATER');
});

test('stackable buff (HP_BONUS) appears in buffs array', () => {
  const { buffs } = applyEnhancement([], VITALITY);
  assert.equal(buffs.length, 1);
  assert.equal(buffs[0].type, 'HP_BONUS');
});

test('stacking same buff type keeps both entries', () => {
  const { enhancements: after1 } = applyEnhancement([], VITALITY);
  const { buffs } = applyEnhancement(after1, VITALITY);
  assert.equal(buffs.length, 2);
  assert.ok(buffs.every(b => b.type === 'HP_BONUS'));
});