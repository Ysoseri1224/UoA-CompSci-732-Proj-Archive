import test from 'node:test';
import assert from 'node:assert/strict';

import { createCard } from '../../src/types/card.js';
import { initDeckState } from '../../src/lib/deck.js';
import {
  skillChangeColor,
  skillChangeCost,
  activateShield,
  shatterShield,
  voidShield,
  resetShieldCooldown,
  canUseChangeColor,
  canUseChangeCost,
  canUseShield,
  canShuffle,
  canPlay,
  resetRoundSkills,
} from '../../src/lib/skills.js';

// ══════════════════════════════════════════════════════════════════
//  skillChangeColor
// ══════════════════════════════════════════════════════════════════

test('skillChangeColor replaces card with same rank + target color', () => {
  const state = initDeckState();
  // Pick a card from hand, find it in deck for the target color
  const target = state.hand[0];
  // Find a card in deck with same rank but different color
  const replacement = state.deck.find(c => c.rank === target.rank && c.element !== target.element);

  if (replacement) {
    const next = skillChangeColor(state, target.id, replacement.element);

    // Target removed from hand
    assert.ok(!next.hand.some(c => c.id === target.id), 'original card still in hand');

    // Replacement in hand
    assert.ok(next.hand.some(c => c.id === replacement.id), 'replacement not in hand');

    // Original in discard
    assert.ok(next.discardPile.some(c => c.id === target.id), 'original card not in discard');

    // Replacement removed from deck/discard
    assert.ok(!next.deck.some(c => c.id === replacement.id), 'replacement still in deck');

    // Hand size preserved
    assert.equal(next.hand.length, 7);
  }
});

test('skillChangeColor falls back to closest rank in target color', () => {
  // Set up: hand has WATER_1, deck has no FIRE_1 (same rank), but has FIRE_3 (close)
  const card1 = createCard('WATER', 1);
  const card2 = createCard('FIRE', 3); // close to rank 1
  const card3 = createCard('FIRE', 10);
  const card4 = createCard('GRASS', 1);
  const card5 = createCard('WATER', 5);
  const card6 = createCard('FIRE', 5);
  const card7 = createCard('GRASS', 7);

  const state = {
    deck: [
      createCard('FIRE', 7),
      card3, // FIRE_10
      createCard('GRASS', 13),
    ],
    discardPile: [
      card2, // FIRE_3 (closest to 1)
      createCard('WATER', 9),
    ],
    hand: [card1, card4, card5, card6, card7, createCard('WATER', 13), createCard('GRASS', 3)],
  };

  const next = skillChangeColor(state, card1.id, 'FIRE');

  // No FIRE_1 exists, should find FIRE_3 (closest: |3-1|=2 vs |5-1|=4 vs others)
  const newHandIds = next.hand.map(c => c.id);
  assert.ok(!newHandIds.includes('WATER_1'), 'original should be gone');
  assert.ok(newHandIds.includes('FIRE_3'), 'closest rank FIRE_3 should be in hand');
});

test('skillChangeColor does nothing when target card not in hand', () => {
  const state = initDeckState();
  const next = skillChangeColor(state, 'NONEXISTENT_99', 'FIRE');
  assert.deepEqual(next.hand.map(c => c.id), state.hand.map(c => c.id));
  assert.deepEqual(next.deck.map(c => c.id), state.deck.map(c => c.id));
});

test('skillChangeColor does nothing when no replacement available', () => {
  // Hand has only WATER cards, pool has no FIRE cards to replace with
  const hand = [
    createCard('WATER', 1),
    createCard('WATER', 2),
    createCard('WATER', 3),
  ];
  const state = { deck: [], discardPile: [], hand };

  const next = skillChangeColor(state, 'WATER_1', 'FIRE');
  // No replacement available — state unchanged
  assert.deepEqual(next.hand.map(c => c.id), hand.map(c => c.id));
});

test('skillChangeColor does not use a card already in hand', () => {
  // Target: WATER_7, want FIRE. FIRE_7 is already in hand → should not be chosen.
  const fire7 = createCard('FIRE', 7);
  const water7 = createCard('WATER', 7);
  const state = {
    deck: [createCard('GRASS', 7)], // GRASS_7 is available (same rank, different color)
    discardPile: [],
    hand: [water7, fire7, createCard('WATER', 1), createCard('WATER', 2),
           createCard('WATER', 3), createCard('WATER', 4), createCard('WATER', 5)],
  };

  const next = skillChangeColor(state, 'WATER_7', 'FIRE');

  // FIRE_7 is already in hand, so can't be used. GRASS_7 is the next best (same rank 7, different color).
  // But the filter allows target color only. So only FIRE cards are candidates, and FIRE_7 is in hand.
  // So there's no available FIRE rank replacement at all.
  // Actually wait — there's no other FIRE card in the pool. So the hand stays unchanged.
  assert.ok(next.hand.some(c => c.id === 'WATER_7'), 'WATER_7 should still be in hand');
  assert.ok(next.hand.some(c => c.id === 'FIRE_7'), 'FIRE_7 should still be in hand');
});

// ══════════════════════════════════════════════════════════════════
//  skillChangeCost
// ══════════════════════════════════════════════════════════════════

test('skillChangeCost replaces card with same color + target rank', () => {
  const card1 = createCard('WATER', 3);
  const state = {
    deck: [createCard('WATER', 10), createCard('FIRE', 10), createCard('GRASS', 10)],
    discardPile: [],
    hand: [card1, createCard('FIRE', 1), createCard('GRASS', 2),
           createCard('WATER', 5), createCard('FIRE', 7),
           createCard('GRASS', 11), createCard('WATER', 13)],
  };

  const next = skillChangeCost(state, card1.id, 10);

  // WATER_3 → WATER_10
  const newHandIds = next.hand.map(c => c.id);
  assert.ok(!newHandIds.includes('WATER_3'), 'original should be gone');
  assert.ok(newHandIds.includes('WATER_10'), 'WATER_10 should be in hand');

  // Original in discard
  assert.ok(next.discardPile.some(c => c.id === 'WATER_3'), 'WATER_3 should be in discard');
});

test('skillChangeCost does nothing when target card not in hand', () => {
  const state = initDeckState();
  const next = skillChangeCost(state, 'GHOST_7', 5);
  assert.deepEqual(next.hand.map(c => c.id), state.hand.map(c => c.id));
});

test('skillChangeCost does nothing when exact replacement not available', () => {
  const card1 = createCard('WATER', 3);
  const state = {
    deck: [createCard('FIRE', 10)],
    discardPile: [],
    hand: [card1, createCard('WATER', 1), createCard('WATER', 2),
           createCard('WATER', 4), createCard('WATER', 5),
           createCard('WATER', 6), createCard('WATER', 7)],
  };

  // Want WATER_10 but only FIRE_10 exists
  const next = skillChangeCost(state, card1.id, 10);

  assert.deepEqual(next.hand.map(c => c.id), state.hand.map(c => c.id));
});

test('skillChangeCost does not use a card already in hand', () => {
  const water10 = createCard('WATER', 10);
  const water3 = createCard('WATER', 3);
  const state = {
    deck: [createCard('FIRE', 5)],
    discardPile: [],
    hand: [water3, water10, createCard('WATER', 1), createCard('WATER', 2),
           createCard('WATER', 4), createCard('FIRE', 7), createCard('GRASS', 7)],
  };

  // Try to change WATER_3 to rank 10 — but WATER_10 is already in hand
  const next = skillChangeCost(state, 'WATER_3', 10);

  // No change
  assert.ok(next.hand.some(c => c.id === 'WATER_3'), 'WATER_3 should still be in hand');
  assert.ok(next.hand.some(c => c.id === 'WATER_10'), 'WATER_10 should still be in hand');
});

// ══════════════════════════════════════════════════════════════════
//  Shield state machine
// ══════════════════════════════════════════════════════════════════

test('activateShield sets active=true when inactive and off cooldown', () => {
  const shield = { active: false, onCooldown: false };
  const next = activateShield(shield);
  assert.equal(next.active, true);
  assert.equal(next.onCooldown, false);
});

test('activateShield does nothing when already active', () => {
  const shield = { active: true, onCooldown: false };
  const next = activateShield(shield);
  assert.equal(next.active, true);
});

test('activateShield does nothing when on cooldown', () => {
  const shield = { active: false, onCooldown: true };
  const next = activateShield(shield);
  assert.equal(next.active, false);
  assert.equal(next.onCooldown, true);
});

test('shatterShield sets active=false and onCooldown=true', () => {
  const shield = { active: true, onCooldown: false };
  const next = shatterShield(shield);
  assert.equal(next.active, false);
  assert.equal(next.onCooldown, true);
});

test('shatterShield does nothing when not active', () => {
  const shield = { active: false, onCooldown: false };
  const next = shatterShield(shield);
  assert.deepEqual(next, shield);
});

test('voidShield deactivates without cooldown', () => {
  const shield = { active: true, onCooldown: false };
  const next = voidShield(shield);
  assert.equal(next.active, false);
  assert.equal(next.onCooldown, false);
});

test('voidShield does nothing when not active', () => {
  const shield = { active: false, onCooldown: true };
  const next = voidShield(shield);
  assert.equal(next.active, false);
  assert.equal(next.onCooldown, true); // preserves existing cooldown
});

test('resetShieldCooldown clears cooldown', () => {
  const shield = { active: false, onCooldown: true };
  const next = resetShieldCooldown(shield);
  assert.equal(next.onCooldown, false);
});

test('shield full lifecycle: activate → block boss → shatter → cooldown → reset', () => {
  let shield = { active: false, onCooldown: false };

  // Activate
  shield = activateShield(shield);
  assert.equal(shield.active, true);

  // Boss attacks → shield shatters
  shield = shatterShield(shield);
  assert.equal(shield.active, false);
  assert.equal(shield.onCooldown, true);

  // Can't re-activate while on cooldown
  shield = activateShield(shield);
  assert.equal(shield.active, false);

  // Reset cooldown
  shield = resetShieldCooldown(shield);
  assert.equal(shield.onCooldown, false);

  // Can activate again
  shield = activateShield(shield);
  assert.equal(shield.active, true);
});

// ══════════════════════════════════════════════════════════════════
//  Guard conditions
// ══════════════════════════════════════════════════════════════════

test('canUseChangeColor: true only in SKILL phase and not used', () => {
  assert.equal(canUseChangeColor({ changeColor: { used: false } }, 'SKILL'), true);
  assert.equal(canUseChangeColor({ changeColor: { used: true } }, 'SKILL'), false);
  assert.equal(canUseChangeColor({ changeColor: { used: false } }, 'PLAY'), false);
  assert.equal(canUseChangeColor({ changeColor: { used: false } }, 'SHUFFLE'), false);
});

test('canUseChangeCost: true only in SKILL phase and not used', () => {
  assert.equal(canUseChangeCost({ changeCost: { used: false } }, 'SKILL'), true);
  assert.equal(canUseChangeCost({ changeCost: { used: true } }, 'SKILL'), false);
  assert.equal(canUseChangeCost({ changeCost: { used: false } }, 'DRAW'), false);
});

test('canUseShield: true only when not active, not on cooldown, in SKILL phase', () => {
  const shield = { active: false, onCooldown: false };
  assert.equal(canUseShield(shield, 'SKILL'), true);
  assert.equal(canUseShield({ active: true, onCooldown: false }, 'SKILL'), false);
  assert.equal(canUseShield({ active: false, onCooldown: true }, 'SKILL'), false);
  assert.equal(canUseShield(shield, 'PLAY'), false);
});

test('canShuffle: true only when remaining > 0 and in SHUFFLE phase', () => {
  assert.equal(canShuffle({ remaining: 2 }, 'SHUFFLE'), true);
  assert.equal(canShuffle({ remaining: 0 }, 'SHUFFLE'), false);
  assert.equal(canShuffle({ remaining: 2 }, 'SKILL'), false);
});

test('canPlay: true only when at least 1 card selected and in PLAY phase', () => {
  assert.equal(canPlay(['WATER_1'], 'PLAY'), true);
  assert.equal(canPlay([], 'PLAY'), false);
  assert.equal(canPlay(['WATER_1'], 'SKILL'), false);
});

// ══════════════════════════════════════════════════════════════════
//  resetRoundSkills
// ══════════════════════════════════════════════════════════════════

test('resetRoundSkills resets changeColor and changeCost, preserves shield', () => {
  const skills = {
    changeColor: { used: true },
    changeCost:  { used: true },
    shield:      { active: true, onCooldown: false },
  };
  const result = resetRoundSkills(skills);

  assert.equal(result.skills.changeColor.used, false);
  assert.equal(result.skills.changeCost.used, false);
  // Shield preserved
  assert.equal(result.skills.shield.active, true);
  assert.equal(result.skills.shield.onCooldown, false);
  // Shuffle reset
  assert.equal(result.shuffle.remaining, 2);
});

test('resetRoundSkills does not mutate original', () => {
  const skills = {
    changeColor: { used: true },
    changeCost:  { used: true },
    shield:      { active: false, onCooldown: true },
  };
  resetRoundSkills(skills);

  assert.equal(skills.changeColor.used, true);
  assert.equal(skills.shield.onCooldown, true);
});
