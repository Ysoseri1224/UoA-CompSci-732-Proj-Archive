import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldAdvanceRound } from '../src/game/roundProgression.js';

test('advances the round only after a full non-lethal round resolves', () => {
  assert.equal(
    shouldAdvanceRound({ bossDefeated: false, playerDefeated: false }),
    true
  );
});

test('does not advance the round when the boss is defeated', () => {
  assert.equal(
    shouldAdvanceRound({ bossDefeated: true, playerDefeated: false }),
    false
  );
});

test('does not advance the round when the player is defeated', () => {
  assert.equal(
    shouldAdvanceRound({ bossDefeated: false, playerDefeated: true }),
    false
  );
});
