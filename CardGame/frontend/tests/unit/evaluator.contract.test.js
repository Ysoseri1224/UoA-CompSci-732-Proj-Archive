/**
 * Scoring contract test — frontend mirror.
 *
 * The backend authoritative version lives at
 * `backend/tests/unit/scoring.contract.test.ts`.  Both files must define the
 * SAME ten fixtures (same cards, same buffs, same expected `total`).  This
 * mirror exists because the frontend evaluator at
 * `frontend/src/lib/evaluator.js` is a pure-JS replica of the backend's
 * `calculateDamage` and cannot share source with the backend across the
 * Docker bind-mount boundary.
 *
 * If you touch either evaluator, update the fixture list in BOTH files.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateHand } from '../../src/lib/evaluator.js';

// Frontend cards use { id, cost, color } where `color` ∈ {red, blue, green}
// (red = FIRE, blue = WATER, green = GRASS) and `cost` = rank.
function feCard(id, color, cost) {
  return { id, cost, color, name: `${color}-${cost}`, image: `/cards/card_${cost}.png` };
}

const FIRE_K_a   = feCard('FIRE_K_a',   'red', 13);
const FIRE_K_b   = feCard('FIRE_K_b',   'red', 13);
const FIRE_FLUSH = [
  feCard('F3', 'red', 3),
  feCard('F5', 'red', 5),
  feCard('F7', 'red', 7),
  feCard('F9', 'red', 9),
  feCard('FJ', 'red', 11),
];
const MIXED_STRAIGHT = [
  feCard('F4', 'red',   4),
  feCard('W5', 'blue',  5),
  feCard('G6', 'green', 6),
  feCard('F7', 'red',   7),
  feCard('W8', 'blue',  8),
];

// Same expected numbers as backend/tests/unit/scoring.contract.test.ts.
// `handType` here is the *frontend* id (lowercase).
const FIXTURES = [
  {
    name: 'high card, no buffs',
    cards: [FIRE_K_a],
    buffs: [],
    expected: { handTypeId: 'high_card', totalScore: 18 },
  },
  {
    name: 'pair, no buffs',
    cards: [FIRE_K_a, FIRE_K_b],
    buffs: [],
    expected: { handTypeId: 'one_pair', totalScore: 72 },
  },
  {
    name: 'pair with HAND_CHIPS_BONUS targeting PAIR',
    cards: [FIRE_K_a, FIRE_K_b],
    buffs: [{ type: 'HAND_CHIPS_BONUS', handType: 'PAIR', bonusChips: 15 }],
    expected: { handTypeId: 'one_pair', totalScore: 102 },
  },
  {
    name: 'pair with HAND_MULT_BONUS targeting FLUSH → no effect',
    cards: [FIRE_K_a, FIRE_K_b],
    buffs: [{ type: 'HAND_MULT_BONUS', handType: 'FLUSH', bonusMult: 5 }],
    expected: { handTypeId: 'one_pair', totalScore: 72 },
  },
  {
    name: 'high card with ELEMENT_CHIP_MULT on FIRE (×1.1)',
    cards: [FIRE_K_a],
    buffs: [{ type: 'ELEMENT_CHIP_MULT', element: 'FIRE', mult: 1.1 }],
    expected: { handTypeId: 'high_card', totalScore: 19 },
  },
  {
    name: 'high card with ELEMENT_CHIPS_BONUS on FIRE (+5)',
    cards: [FIRE_K_a],
    buffs: [{ type: 'ELEMENT_CHIPS_BONUS', element: 'FIRE', bonusChips: 5 }],
    expected: { handTypeId: 'high_card', totalScore: 23 },
  },
  {
    name: 'pair with ALL_CHIPS_BONUS (+2 per card)',
    cards: [FIRE_K_a, FIRE_K_b],
    buffs: [{ type: 'ALL_CHIPS_BONUS', bonusChips: 2 }],
    expected: { handTypeId: 'one_pair', totalScore: 80 },
  },
  {
    name: 'FIRE flush + FIRE Mastery + FIRE Surge',
    cards: FIRE_FLUSH,
    buffs: [
      { type: 'ELEMENT_CHIP_MULT', element: 'FIRE', mult: 1.1 },
      { type: 'ELEMENT_CHIPS_BONUS', element: 'FIRE', bonusChips: 5 },
    ],
    expected: { handTypeId: 'flush', totalScore: 394 },
  },
  {
    name: 'STRAIGHT (rare) with TIERED_MULT_BONUS rare +2',
    cards: MIXED_STRAIGHT,
    buffs: [{ type: 'TIERED_MULT_BONUS', commonMult: 0, rareMult: 2, epicMult: 3 }],
    expected: { handTypeId: 'straight', totalScore: 360 },
  },
  {
    name: 'pair vs DEFEND boss → halved',
    cards: [FIRE_K_a, FIRE_K_b],
    buffs: [],
    isDefending: true,
    expected: { handTypeId: 'one_pair', totalScore: 36 },
  },
];

test('scoring contract — frontend evaluateHand matches all 10 fixtures', () => {
  for (const fx of FIXTURES) {
    const r = evaluateHand(fx.cards, fx.buffs, fx.isDefending ?? false);
    assert.equal(r.handType?.id, fx.expected.handTypeId, `[${fx.name}] hand type id`);
    assert.equal(r.totalScore,   fx.expected.totalScore, `[${fx.name}] total score`);
  }
});
