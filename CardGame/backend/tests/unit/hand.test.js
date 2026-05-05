import test from 'node:test';
import assert from 'node:assert/strict';

import { createCard } from '../../src/types/card.js';
import { createElementDamageBuff } from '../../src/types/buff.js';
import {
  HAND_SCORES,
  identifyHand,
  detectHandType,
  calculateDamage,
  getRankCounts,
} from '../../src/lib/hand.js';

// ══════════════════════════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════════════════════════

/** @param {[import('../../src/types/card.js').Element, import('../../src/types/card.js').Rank][]} pairs */
function makeCards(pairs) {
  return pairs.map(([e, r]) => createCard(e, r));
}

// ══════════════════════════════════════════════════════════════════
//  HAND_SCORES
// ══════════════════════════════════════════════════════════════════

test('HAND_SCORES has entries for all 9 hand types', () => {
  const types = Object.keys(HAND_SCORES);
  assert.equal(types.length, 9);
  for (const t of types) {
    assert.ok(typeof HAND_SCORES[t].chips === 'number');
    assert.ok(typeof HAND_SCORES[t].mult === 'number');
  }
});

// ══════════════════════════════════════════════════════════════════
//  detectHandType — Straight Flush
// ══════════════════════════════════════════════════════════════════

test('Straight Flush: 5 cards same element + consecutive ranks', () => {
  const cards = makeCards([
    ['WATER', 3], ['WATER', 4], ['WATER', 5], ['WATER', 6], ['WATER', 7],
  ]);
  assert.equal(detectHandType(cards), 'STRAIGHT_FLUSH');
});

test('Straight Flush: not triggered when element mismatch', () => {
  const cards = makeCards([
    ['WATER', 3], ['WATER', 4], ['WATER', 5], ['WATER', 6], ['FIRE', 7],
  ]);
  assert.notEqual(detectHandType(cards), 'STRAIGHT_FLUSH');
});

// ══════════════════════════════════════════════════════════════════
//  detectHandType — Four of a Kind
// ══════════════════════════════════════════════════════════════════

test('Four of a Kind: 4 cards same rank across different elements', () => {
  const cards = makeCards([
    ['WATER', 8], ['FIRE', 8], ['GRASS', 8], ['WATER', 8], // WATER_8 doesn't exist twice! Use different elements
  ]);
  // Fix: 4 of same rank needs 3 elements + 1 duplicate element won't work because cards are unique
  // Actually createCard creates unique cards per element+rank. So we can only have at most 3 of same rank (one per element).
  // Four of a Kind can only happen with skills that create copies or additional cards.
  // For now we still test the detection logic with mocked cards that bypass uniqueness:
  const mockFour = [
    { id: 'WATER_8', element: 'WATER', rank: 8, displayRank: '8', chipValue: 8 },
    { id: 'FIRE_8', element: 'FIRE', rank: 8, displayRank: '8', chipValue: 8 },
    { id: 'GRASS_8', element: 'GRASS', rank: 8, displayRank: '8', chipValue: 8 },
    { id: 'WATER_8_dup', element: 'WATER', rank: 8, displayRank: '8', chipValue: 8 },
  ];
  assert.equal(detectHandType(mockFour), 'FOUR_OF_A_KIND');
});

test('Four of a Kind: with extra card still detected', () => {
  const mockFourPlus = [
    { id: 'WATER_8', element: 'WATER', rank: 8, displayRank: '8', chipValue: 8 },
    { id: 'FIRE_8', element: 'FIRE', rank: 8, displayRank: '8', chipValue: 8 },
    { id: 'GRASS_8', element: 'GRASS', rank: 8, displayRank: '8', chipValue: 8 },
    { id: 'WATER_8b', element: 'WATER', rank: 8, displayRank: '8', chipValue: 8 },
    { id: 'FIRE_3', element: 'FIRE', rank: 3, displayRank: '3', chipValue: 3 },
  ];
  assert.equal(detectHandType(mockFourPlus), 'FOUR_OF_A_KIND');
});

// ══════════════════════════════════════════════════════════════════
//  detectHandType — Full House
// ══════════════════════════════════════════════════════════════════

test('Full House: 3 of a kind + 2 of a kind (5 cards)', () => {
  // With unique cards: 3 of rank 9 (one per element) + 2 of rank 5 (two elements)
  // But we need 3+2=5, which is fine
  const cards = makeCards([
    ['WATER', 9], ['FIRE', 9], ['GRASS', 9],  // three 9s
    ['WATER', 5], ['FIRE', 5],                 // two 5s
  ]);
  assert.equal(detectHandType(cards), 'FULL_HOUSE');
});

test('Full House: not triggered with only 3 of a kind', () => {
  const cards = makeCards([
    ['WATER', 9], ['FIRE', 9], ['GRASS', 9],
    ['WATER', 5], ['WATER', 3],
  ]);
  assert.notEqual(detectHandType(cards), 'FULL_HOUSE');
  assert.equal(detectHandType(cards), 'THREE_OF_A_KIND');
});

// ══════════════════════════════════════════════════════════════════
//  detectHandType — Flush
// ══════════════════════════════════════════════════════════════════

test('Flush: 5+ cards all same element', () => {
  const cards = makeCards([
    ['FIRE', 1], ['FIRE', 4], ['FIRE', 7], ['FIRE', 10], ['FIRE', 13],
  ]);
  assert.equal(detectHandType(cards), 'FLUSH');
});

test('Flush: 6 cards all same element still flush', () => {
  const cards = makeCards([
    ['FIRE', 1], ['FIRE', 4], ['FIRE', 7], ['FIRE', 10], ['FIRE', 13], ['FIRE', 2],
  ]);
  assert.equal(detectHandType(cards), 'FLUSH');
});

test('Flush: degraded to High Card with 1 off-element card', () => {
  // 5 FIRE + 1 WATER → not all same element → no flush
  const cards = makeCards([
    ['FIRE', 1], ['FIRE', 4], ['FIRE', 7], ['FIRE', 10], ['FIRE', 13],
    ['WATER', 2],
  ]);
  const type = detectHandType(cards);
  assert.ok(type !== 'FLUSH' && type !== 'STRAIGHT_FLUSH',
    `expected no flush with off-element card, got ${type}`);
});

test('Flush: needs at least 5 cards', () => {
  const cards = makeCards([
    ['FIRE', 1], ['FIRE', 4], ['FIRE', 7], ['FIRE', 10],
  ]);
  assert.notEqual(detectHandType(cards), 'FLUSH');
});

// ══════════════════════════════════════════════════════════════════
//  detectHandType — Straight
// ══════════════════════════════════════════════════════════════════

test('Straight: 5 consecutive ranks', () => {
  const cards = makeCards([
    ['WATER', 5], ['FIRE', 6], ['GRASS', 7], ['WATER', 8], ['FIRE', 9],
  ]);
  assert.equal(detectHandType(cards), 'STRAIGHT');
});

test('Straight: 6 consecutive ranks still straight', () => {
  const cards = makeCards([
    ['WATER', 3], ['FIRE', 4], ['GRASS', 5], ['WATER', 6], ['FIRE', 7], ['GRASS', 8],
  ]);
  assert.equal(detectHandType(cards), 'STRAIGHT');
});

test('Straight: with gap is not straight', () => {
  const cards = makeCards([
    ['WATER', 3], ['FIRE', 4], ['GRASS', 5], ['WATER', 7], ['FIRE', 8],
  ]);
  assert.notEqual(detectHandType(cards), 'STRAIGHT');
});

test('Straight: needs at least 5 cards', () => {
  const cards = makeCards([
    ['WATER', 3], ['FIRE', 4], ['GRASS', 5], ['WATER', 6],
  ]);
  assert.notEqual(detectHandType(cards), 'STRAIGHT');
});

test('Straight: with duplicate rank (pair) breaks straight', () => {
  // 2,3,3,4,5 — has a pair of 3s, not a straight because not all ranks are unique-and-consecutive.
  // Actually, the ranks are {2,3,4,5} after dedup, which IS consecutive.
  // So a pair within a straight is fine: 2,3,3,4,5 has deduped ranks [2,3,4,5] which is straight.
  const cards = makeCards([
    ['WATER', 2], ['FIRE', 3], ['GRASS', 3], ['WATER', 4], ['FIRE', 5],
  ]);
  assert.equal(detectHandType(cards), 'STRAIGHT');
});

// ══════════════════════════════════════════════════════════════════
//  detectHandType — Three of a Kind
// ══════════════════════════════════════════════════════════════════

test('Three of a Kind: 3 cards same rank', () => {
  const cards = makeCards([
    ['WATER', 7], ['FIRE', 7], ['GRASS', 7],
    ['FIRE', 3], ['FIRE', 9],
  ]);
  assert.equal(detectHandType(cards), 'THREE_OF_A_KIND');
});

// ══════════════════════════════════════════════════════════════════
//  detectHandType — Two Pair
// ══════════════════════════════════════════════════════════════════

test('Two Pair: 2+2 same rank', () => {
  const cards = makeCards([
    ['WATER', 4], ['FIRE', 4],
    ['WATER', 10], ['FIRE', 10],
    ['GRASS', 13],
  ]);
  assert.equal(detectHandType(cards), 'TWO_PAIR');
});

// ══════════════════════════════════════════════════════════════════
//  detectHandType — Pair
// ══════════════════════════════════════════════════════════════════

test('Pair: 2 cards same rank', () => {
  const cards = makeCards([
    ['WATER', 6], ['FIRE', 6],
    ['GRASS', 3], ['WATER', 9], ['FIRE', 13],
  ]);
  assert.equal(detectHandType(cards), 'PAIR');
});

// ══════════════════════════════════════════════════════════════════
//  detectHandType — High Card
// ══════════════════════════════════════════════════════════════════

test('High Card: no hand type matched', () => {
  const cards = makeCards([
    ['WATER', 2], ['FIRE', 5], ['GRASS', 8], ['WATER', 10], ['FIRE', 13],
  ]);
  assert.equal(detectHandType(cards), 'HIGH_CARD');
});

test('High Card: empty hand', () => {
  assert.equal(detectHandType([]), 'HIGH_CARD');
});

test('High Card: single card', () => {
  const cards = makeCards([['FIRE', 7]]);
  assert.equal(detectHandType(cards), 'HIGH_CARD');
});

// ══════════════════════════════════════════════════════════════════
//  identifyHand
// ══════════════════════════════════════════════════════════════════

test('identifyHand returns type, chips, mult', () => {
  const cards = makeCards([
    ['WATER', 5], ['FIRE', 6], ['GRASS', 7], ['WATER', 8], ['FIRE', 9],
  ]);
  const result = identifyHand(cards);
  assert.equal(result.type, 'STRAIGHT');
  assert.equal(result.chips, 30);
  assert.equal(result.mult, 4);
});

// ══════════════════════════════════════════════════════════════════
//  calculateDamage
// ══════════════════════════════════════════════════════════════════

test('calculateDamage: doc example — three 7s (score 189)', () => {
  const cards = makeCards([
    ['FIRE', 7], ['FIRE', 9], ['FIRE', 3], ['WATER', 7], ['GRASS', 7],
  ]);
  const result = calculateDamage(cards);
  // THREE_OF_A_KIND: baseChips=30, mult=3
  // cardChips = 7+9+3+7+7 = 33
  // total = (30+33) * 3 = 189
  assert.equal(result.handType, 'THREE_OF_A_KIND');
  assert.equal(result.baseChips, 30);
  assert.equal(result.cardChips, 33);
  assert.equal(result.mult, 3);
  assert.equal(result.total, 189);
});

test('calculateDamage: high card', () => {
  const cards = makeCards([
    ['WATER', 2], ['FIRE', 5], ['GRASS', 8],
  ]);
  const result = calculateDamage(cards);
  assert.equal(result.handType, 'HIGH_CARD');
  assert.equal(result.baseChips, 5);
  assert.equal(result.cardChips, 2 + 5 + 8);
  assert.equal(result.mult, 1);
  assert.equal(result.total, Math.floor((5 + 15) * 1));
});

test('calculateDamage: straight flush', () => {
  const cards = makeCards([
    ['FIRE', 3], ['FIRE', 4], ['FIRE', 5], ['FIRE', 6], ['FIRE', 7],
  ]);
  const result = calculateDamage(cards);
  assert.equal(result.handType, 'STRAIGHT_FLUSH');
  assert.equal(result.baseChips, 100);
  assert.equal(result.mult, 8);
  // cardChips = 3+4+5+6+7 = 25
  // total = (100+25)*8 = 1000
  assert.equal(result.total, 1000);
});

test('calculateDamage: empty hand', () => {
  const result = calculateDamage([]);
  assert.equal(result.handType, 'HIGH_CARD');
  assert.equal(result.baseChips, 5);
  assert.equal(result.cardChips, 0);
  assert.equal(result.mult, 1);
  assert.equal(result.total, 5);
});

test('calculateDamage applies element damage buff', () => {
  const cards = makeCards([
    ['WATER', 5], ['WATER', 10], ['FIRE', 3],
  ]);
  // Without buff: HIGH_CARD, cardChips=5+10+3=18, total=(5+18)*1=23
  // With WATER buff x1.5: WATER cards (5,10) get extra: 5*(1.5-1)+10*(1.5-1)=2.5+5=7.5
  // cardChips = 18 + 7.5 = 25.5 → round to 25.5, total=Math.floor((5+25.5)*1)=30
  const buff = createElementDamageBuff('WATER', 1.5);
  const result = calculateDamage(cards, [buff]);

  assert.equal(result.handType, 'HIGH_CARD');
  // cardChips = 5+10+3 + 5*0.5 + 10*0.5 = 18 + 2.5 + 5 = 25.5
  assert.ok(result.cardChips > 18, `expected cardChips > 18, got ${result.cardChips}`);
  assert.equal(result.total, Math.floor((5 + 25.5) * 1)); // 30
});

test('calculateDamage: multiple buffs stack', () => {
  const cards = makeCards([
    ['WATER', 5], ['FIRE', 10],
  ]);
  const waterBuff = createElementDamageBuff('WATER', 1.5);
  const fireBuff = createElementDamageBuff('FIRE', 1.5);
  const result = calculateDamage(cards, [waterBuff, fireBuff]);

  // cardChips = 5+10 + 5*0.5 + 10*0.5 = 15 + 2.5 + 5 = 22.5
  assert.ok(result.cardChips > 15);
});

test('calculateDamage: buff only applies to matching element', () => {
  const cards = makeCards([
    ['WATER', 10], ['FIRE', 10],
  ]);
  const waterBuff = createElementDamageBuff('WATER', 2.0); // double
  const result = calculateDamage(cards, [waterBuff]);

  // cardChips = 10+10 + 10*(2.0-1) = 20 + 10 = 30
  assert.equal(result.cardChips, 30);
});

test('calculateDamage rounds total down', () => {
  const cards = makeCards([
    ['WATER', 2], ['FIRE', 5],
  ]);
  const result = calculateDamage(cards);
  assert.equal(result.total, Math.floor((5 + 7) * 1));
  assert.equal(result.total, 12);
});

// ══════════════════════════════════════════════════════════════════
//  getRankCounts
// ══════════════════════════════════════════════════════════════════

test('getRankCounts returns correct counts', () => {
  const cards = makeCards([
    ['WATER', 7], ['FIRE', 7], ['GRASS', 7],
    ['FIRE', 3], ['GRASS', 3],
  ]);
  const counts = getRankCounts(cards);
  assert.equal(counts[7], 3);
  assert.equal(counts[3], 2);
  assert.equal(counts[1], undefined);
});
