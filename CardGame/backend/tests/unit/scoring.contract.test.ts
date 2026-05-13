/**
 * Scoring contract test
 *
 * The frontend ships a buff-aware preview evaluator at
 * `frontend/src/lib/evaluator.js`.  It mirrors the backend `calculateDamage`
 * at `backend/src/lib/hand.ts` so the selection-time preview number matches
 * the server's authoritative award.
 *
 * Docker bind-mounts split the two packages into separate containers, so the
 * two evaluators cannot share a single source file.  This file is the
 * **contract**: it pins ten fixtures whose expected values must be
 * reproducible by both implementations.
 *
 *   • Backend side: this test calls `calculateDamage` directly.
 *   • Frontend side: a sibling test at
 *     `frontend/tests/unit/evaluator.contract.test.js` runs the same fixture
 *     list against `frontend/src/lib/evaluator.js`.
 *
 * If you change either evaluator, update **both** test files together.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createCard } from '../../src/types/card.js';
import type { Card, Rank } from '../../src/types/card.js';
import type { Buff } from '../../src/types/buff.js';
import { calculateDamage } from '../../src/lib/hand.js';

// ── Fixture data ────────────────────────────────────────────────────────
const FIRE_K_a   = createCard('FIRE',  13 as Rank);
const FIRE_K_b   = { ...createCard('FIRE', 13 as Rank), id: 'FIRE_K_b' } as Card;
const FIRE_FLUSH: Card[] = [
  createCard('FIRE', 3 as Rank),
  createCard('FIRE', 5 as Rank),
  createCard('FIRE', 7 as Rank),
  createCard('FIRE', 9 as Rank),
  createCard('FIRE', 11 as Rank),
];
const MIXED_STRAIGHT: Card[] = [
  createCard('FIRE',  4 as Rank),
  createCard('WATER', 5 as Rank),
  createCard('GRASS', 6 as Rank),
  createCard('FIRE',  7 as Rank),
  createCard('WATER', 8 as Rank),
];

interface Fixture {
  name: string;
  cards: Card[];
  buffs: Buff[];
  isDefending?: boolean;
  expected: { handType: string; baseChips: number; mult: number; total: number };
}

export const SCORING_FIXTURES: Fixture[] = [
  {
    name: 'high card, no buffs',
    cards: [FIRE_K_a],
    buffs: [],
    // base chips 5, mult 1, cardChips 13 → (5+13)*1 = 18
    expected: { handType: 'HIGH_CARD', baseChips: 5, mult: 1, total: 18 },
  },
  {
    name: 'pair, no buffs',
    cards: [FIRE_K_a, FIRE_K_b],
    buffs: [],
    // (10 + 26) * 2 = 72
    expected: { handType: 'PAIR', baseChips: 10, mult: 2, total: 72 },
  },
  {
    name: 'pair with HAND_CHIPS_BONUS targeting PAIR',
    cards: [FIRE_K_a, FIRE_K_b],
    buffs: [{ type: 'HAND_CHIPS_BONUS', handType: 'PAIR', bonusChips: 15 }],
    // (10+15 + 26) * 2 = 102
    expected: { handType: 'PAIR', baseChips: 25, mult: 2, total: 102 },
  },
  {
    name: 'pair with HAND_MULT_BONUS targeting FLUSH → no effect',
    cards: [FIRE_K_a, FIRE_K_b],
    buffs: [{ type: 'HAND_MULT_BONUS', handType: 'FLUSH', bonusMult: 5 }],
    expected: { handType: 'PAIR', baseChips: 10, mult: 2, total: 72 },
  },
  {
    name: 'high card with ELEMENT_CHIP_MULT on FIRE (×1.1)',
    cards: [FIRE_K_a],
    buffs: [{ type: 'ELEMENT_CHIP_MULT', element: 'FIRE', mult: 1.1 }],
    // chip 13 * 1.1 = 14.3 → (5 + 14.3) * 1 = 19.3 → floor = 19
    expected: { handType: 'HIGH_CARD', baseChips: 5, mult: 1, total: 19 },
  },
  {
    name: 'high card with ELEMENT_CHIPS_BONUS on FIRE (+5)',
    cards: [FIRE_K_a],
    buffs: [{ type: 'ELEMENT_CHIPS_BONUS', element: 'FIRE', bonusChips: 5 }],
    // (5 + (13+5)) * 1 = 23
    expected: { handType: 'HIGH_CARD', baseChips: 5, mult: 1, total: 23 },
  },
  {
    name: 'pair with ALL_CHIPS_BONUS (+2 per card)',
    cards: [FIRE_K_a, FIRE_K_b],
    buffs: [{ type: 'ALL_CHIPS_BONUS', bonusChips: 2 }],
    // each chip 13+2=15, sum 30; (10 + 30) * 2 = 80
    expected: { handType: 'PAIR', baseChips: 10, mult: 2, total: 80 },
  },
  {
    name: 'FIRE flush + FIRE Mastery + FIRE Surge',
    cards: FIRE_FLUSH,
    buffs: [
      { type: 'ELEMENT_CHIP_MULT', element: 'FIRE', mult: 1.1 },
      { type: 'ELEMENT_CHIPS_BONUS', element: 'FIRE', bonusChips: 5 },
    ],
    // chips: 3→8.3, 5→10.5, 7→12.7, 9→14.9, 11→17.1 → 63.5
    // (35 + 63.5) * 4 = 394 (floor)
    expected: { handType: 'FLUSH', baseChips: 35, mult: 4, total: 394 },
  },
  {
    name: 'STRAIGHT (rare) with TIERED_MULT_BONUS rare +2',
    cards: MIXED_STRAIGHT,
    buffs: [{ type: 'TIERED_MULT_BONUS', commonMult: 0, rareMult: 2, epicMult: 3 }],
    // mult 4 + 2 = 6; cardChips 4+5+6+7+8 = 30; (30+30)*6 = 360
    expected: { handType: 'STRAIGHT', baseChips: 30, mult: 6, total: 360 },
  },
  {
    name: 'pair vs DEFEND boss → halved',
    cards: [FIRE_K_a, FIRE_K_b],
    buffs: [],
    isDefending: true,
    // 72 → floor(72 * 0.5) = 36
    expected: { handType: 'PAIR', baseChips: 10, mult: 2, total: 36 },
  },
];

// ── Backend assertions ───────────────────────────────────────────────────
test('scoring contract — backend calculateDamage matches all 10 fixtures', () => {
  for (const fx of SCORING_FIXTURES) {
    const r = calculateDamage(fx.cards, fx.buffs, fx.isDefending ?? false);
    assert.equal(r.handType,  fx.expected.handType,  `[${fx.name}] hand type`);
    assert.equal(r.baseChips, fx.expected.baseChips, `[${fx.name}] base chips`);
    assert.equal(r.mult,      fx.expected.mult,      `[${fx.name}] multiplier`);
    assert.equal(r.total,     fx.expected.total,     `[${fx.name}] total`);
  }
});
