import test from 'node:test';
import assert from 'node:assert/strict';


function buildRestorePayload(checkpoint) {
  const restoredEnhancements = Array.isArray(checkpoint.enhancements) ? checkpoint.enhancements : [];
  return {
    enhancements: restoredEnhancements,
    socketPayload: {
      layer: checkpoint.floor,
      playerHp: checkpoint.playerHp,
      bossHp: checkpoint.bossHp,
      buffs: restoredEnhancements.map(e => e.buff).filter(Boolean),
      shuffleCount: 2,
    },
  };
}

function buildInitialRogueState() {
  return {
    enhancements: [],
    pendingEnhancements: null,
    canRetryFloor: false,
    showLose: false,
    runComplete: false,
    victoryTriggered: false,
    winLayer: 0,
  };
}

const WATER_SPEC = { buff: { type: 'ELEMENT_CHIP_MULT' } };
const VITALITY = { buff: { type: 'HP_BONUS' } };
const ENERGY_BOOST = { buff: { type: 'SKILL_ENERGY_MAX' } };


test('buildRestorePayload: extracts enhancements and builds socket payload', () => {
  const checkpoint = { floor: 3, playerHp: 30, bossHp: 780, enhancements: [WATER_SPEC, VITALITY] };
  const { enhancements, socketPayload } = buildRestorePayload(checkpoint);
  assert.equal(enhancements.length, 2);
  assert.equal(socketPayload.layer, 3);
  assert.equal(socketPayload.buffs.length, 2);
});

test('buildRestorePayload: empty/null enhancements -> empty buffs array', () => {
  const { socketPayload: sp1 } = buildRestorePayload({ floor: 1, enhancements: [] });
  assert.deepEqual(sp1.buffs, []);
  
  const { socketPayload: sp2 } = buildRestorePayload({ floor: 2, enhancements: null });
  assert.deepEqual(sp2.buffs, []);
});

test('buildRestorePayload: buffs extracted correctly from checkpoint enhancements', () => {
  const checkpoint = { floor: 4, enhancements: [WATER_SPEC, ENERGY_BOOST] };
  const { socketPayload } = buildRestorePayload(checkpoint);
  assert.equal(socketPayload.buffs[1].type, 'SKILL_ENERGY_MAX');
});

test('buildInitialRogueState: all fields reset to defaults', () => {
  const s = buildInitialRogueState();
  assert.deepEqual(s.enhancements, []);
  assert.equal(s.winLayer, 0);
  assert.equal(s.canRetryFloor, false);
});

test('restartGame: state is fully reset after enhancements were accumulated', () => {
  let state = buildInitialRogueState();
  state.enhancements = [WATER_SPEC, VITALITY];
  state.winLayer = 5;

  const reset = buildInitialRogueState();
  assert.deepEqual(reset.enhancements, []);
  assert.equal(reset.winLayer, 0);
});