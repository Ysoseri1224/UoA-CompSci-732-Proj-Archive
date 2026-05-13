import test from 'node:test';
import assert from 'node:assert/strict';


const ONE_TIME_BUFF_TYPES = new Set([
  'SKILL_ENERGY_MAX',
  'ELEMENT_DRAW_ON_SHUFFLE',
  'HIGH_RANK_DRAW_ON_SHUFFLE',
]);

function isOneTimeBuff(buffType) {
  return ONE_TIME_BUFF_TYPES.has(buffType);
}

function filterExcludeTypes(pool, ownedBuffs) {
  const ownedOneTimeTypes = ownedBuffs
    .filter(b => ONE_TIME_BUFF_TYPES.has(b.type))
    .map(b => b.type);
  return pool.filter(u => !ownedOneTimeTypes.includes(u.buff.type));
}

const WATER_SPEC = { id: 'water_spec', buff: { type: 'ELEMENT_CHIP_MULT' } };
const ENERGY_BOOST = { id: 'skill_energy_1', buff: { type: 'SKILL_ENERGY_MAX' } };
const HIGH_RANK_DRAW = { id: 'high_rank_draw_2', buff: { type: 'HIGH_RANK_DRAW_ON_SHUFFLE' } };
const VITALITY = { id: 'hp_boost_3', buff: { type: 'HP_BONUS' } };
const TIERED_MULT = { id: 'tiered_mult_2', buff: { type: 'TIERED_MULT_BONUS' } };


test('SKILL_ENERGY_MAX is one-time', () => assert.equal(isOneTimeBuff('SKILL_ENERGY_MAX'), true));
test('ELEMENT_CHIP_MULT is stackable (not one-time)', () => assert.equal(isOneTimeBuff('ELEMENT_CHIP_MULT'), false));

test('filterExcludeTypes: owned one-time buff excluded from pool', () => {
  const pool = [WATER_SPEC, ENERGY_BOOST, HIGH_RANK_DRAW, TIERED_MULT];
  const ownedBuffs = [ENERGY_BOOST.buff]; 
  const filtered = filterExcludeTypes(pool, ownedBuffs);
  assert.ok(!filtered.find(u => u.buff.type === 'SKILL_ENERGY_MAX'));
  assert.ok(filtered.find(u => u.buff.type === 'ELEMENT_CHIP_MULT'));
});

test('filterExcludeTypes: owned stackable buff NOT excluded', () => {
  const pool = [WATER_SPEC, VITALITY, TIERED_MULT];
  const ownedBuffs = [VITALITY.buff]; 
  const filtered = filterExcludeTypes(pool, ownedBuffs);
  assert.ok(filtered.find(u => u.buff.type === 'HP_BONUS'));
});

test('filterExcludeTypes: no owned buffs -> full pool returned', () => {
  const pool = [WATER_SPEC, ENERGY_BOOST, VITALITY];
  assert.equal(filterExcludeTypes(pool, []).length, pool.length);
});

test('filterExcludeTypes: multiple one-time owned -> all excluded', () => {
  const pool = [ENERGY_BOOST, HIGH_RANK_DRAW, WATER_SPEC];
  const ownedBuffs = [ENERGY_BOOST.buff, HIGH_RANK_DRAW.buff];
  const filtered = filterExcludeTypes(pool, ownedBuffs);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'water_spec');
});