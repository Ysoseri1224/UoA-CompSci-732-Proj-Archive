import test from 'node:test';
import assert from 'node:assert/strict';


const EMPTY_EVALUATION = {
  handType: null,
  baseAttack: 0,
  bonusAttack: 0,
  multiplier: 0,
  totalScore: 0,
};

test('EMPTY_EVALUATION has all required keys with zero/null defaults', () => {
  assert.equal(EMPTY_EVALUATION.handType,    null);
  assert.equal(EMPTY_EVALUATION.baseAttack,  0);
  assert.equal(EMPTY_EVALUATION.bonusAttack, 0);
  assert.equal(EMPTY_EVALUATION.multiplier,  0);
  assert.equal(EMPTY_EVALUATION.totalScore,  0);
});

test('EMPTY_EVALUATION is spreadable', () => {
  const copy = { ...EMPTY_EVALUATION, totalScore: 42 };
  assert.equal(copy.totalScore, 42);
  assert.equal(copy.handType, null);
});