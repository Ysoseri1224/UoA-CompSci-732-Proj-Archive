import test from 'node:test';
import assert from 'node:assert/strict';

import { shuffle, initDeckState, drawCards, playCards, shuffleHand } from '../../src/lib/deck.js';

// ══════════════════════════════════════════════════════════════════
//  shuffle
// ══════════════════════════════════════════════════════════════════

test('shuffle returns array of same length', () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const result = shuffle(arr);
  assert.equal(result.length, arr.length);
});

test('shuffle does not mutate original array', () => {
  const arr = [1, 2, 3, 4, 5];
  const copy = [...arr];
  shuffle(arr);
  assert.deepEqual(arr, copy);
});

test('shuffle contains all original elements', () => {
  const arr = [1, 2, 3, 4, 5];
  const result = shuffle(arr);
  assert.deepEqual([...result].sort((a, b) => a - b), arr);
});

test('shuffle does not change a single-element array', () => {
  assert.deepEqual(shuffle([42]), [42]);
});

test('shuffle returns empty array for empty input', () => {
  assert.deepEqual(shuffle([]), []);
});

// ══════════════════════════════════════════════════════════════════
//  initDeckState
// ══════════════════════════════════════════════════════════════════

test('initDeckState returns hand of 7 and deck of 32', () => {
  const state = initDeckState();
  assert.equal(state.hand.length, 7);
  assert.equal(state.deck.length, 32);
  assert.equal(state.discardPile.length, 0);
});

test('initDeckState hand and deck have no overlap', () => {
  const state = initDeckState();
  const handIds = new Set(state.hand.map(c => c.id));
  const deckIds = new Set(state.deck.map(c => c.id));
  for (const id of handIds) {
    assert.ok(!deckIds.has(id), `card ${id} appears in both hand and deck`);
  }
});

test('initDeckState has exactly 39 unique cards across all piles', () => {
  const state = initDeckState();
  const allIds = [
    ...state.hand.map(c => c.id),
    ...state.deck.map(c => c.id),
    ...state.discardPile.map(c => c.id),
  ];
  assert.equal(new Set(allIds).size, 39);
});

// ══════════════════════════════════════════════════════════════════
//  drawCards
// ══════════════════════════════════════════════════════════════════

test('drawCards draws from top of deck into hand', () => {
  const state = initDeckState();
  const handBefore = state.hand.length;
  const deckBefore = state.deck.length;

  const next = drawCards(state, 3);

  assert.equal(next.hand.length, handBefore + 3);
  assert.equal(next.deck.length, deckBefore - 3);
  assert.equal(next.discardPile.length, 0);
});

test('drawCards with n=0 returns identical state', () => {
  const state = initDeckState();
  const next = drawCards(state, 0);
  assert.equal(next.hand.length, state.hand.length);
  assert.equal(next.deck.length, state.deck.length);
});

test('drawCards recycles discard pile when deck is low', () => {
  // Set up: empty deck, some cards in discard, hand has 0 cards
  const state = initDeckState();
  const hand = state.hand;
  const deck = state.deck;
  const discard = state.deck.slice(0, 10); // fake discard

  // Move all deck cards to discard (simulating heavy play)
  const starved = {
    deck: [],
    discardPile: [...deck, ...discard],
    hand: [],
  };

  const next = drawCards(starved, 7);
  assert.ok(next.hand.length > 0);
  // Cards should come from shuffled-together deck+discard
});

test('drawCards returns fewer cards than requested when total pool insufficient', () => {
  const state = {
    deck: [],
    discardPile: [],
    hand: [],
  };
  const next = drawCards(state, 5);
  assert.equal(next.hand.length, 0);
});

test('drawCards does not mutate original state', () => {
  const state = initDeckState();
  const handLen = state.hand.length;
  drawCards(state, 3);
  assert.equal(state.hand.length, handLen);
});

// ══════════════════════════════════════════════════════════════════
//  playCards
// ══════════════════════════════════════════════════════════════════

test('playCards removes played cards from hand and adds to discard', () => {
  const state = initDeckState();
  const toPlay = [state.hand[0].id, state.hand[1].id];

  const next = playCards(state, toPlay);

  // Played cards gone from hand
  for (const id of toPlay) {
    assert.ok(!next.hand.some(c => c.id === id), `card ${id} still in hand`);
  }

  // Played cards in discard
  for (const id of toPlay) {
    assert.ok(next.discardPile.some(c => c.id === id), `card ${id} not in discard`);
  }
});

test('playCards refills hand to 7', () => {
  const state = initDeckState();
  const toPlay = [state.hand[0].id, state.hand[1].id];

  const next = playCards(state, toPlay);

  assert.equal(next.hand.length, 7);
  assert.equal(state.deck.length - next.deck.length, 2); // drew 2
});

test('playCards with no cards selected leaves hand unchanged size', () => {
  const state = initDeckState();
  const next = playCards(state, []);
  assert.equal(next.hand.length, 7);
  assert.equal(next.discardPile.length, 0);
});

test('playCards puts played cards in discard pile', () => {
  const state = initDeckState();
  const toPlay = state.hand.map(c => c.id); // play all 7

  const next = playCards(state, toPlay);

  assert.equal(next.hand.length, 7); // refilled
  assert.equal(next.discardPile.length, 7); // original 7 discarded
});

// ══════════════════════════════════════════════════════════════════
//  shuffleHand
// ══════════════════════════════════════════════════════════════════

test('shuffleHand removes selected cards from hand and replaces them', () => {
  const state = initDeckState();
  const toDiscard = [state.hand[0].id, state.hand[1].id, state.hand[2].id];

  const next = shuffleHand(state, toDiscard);

  // Hand size unchanged
  assert.equal(next.hand.length, 7);

  // Discarded cards gone from hand
  for (const id of toDiscard) {
    assert.ok(!next.hand.some(c => c.id === id), `card ${id} still in hand`);
  }
});

test('shuffleHand does not draw back just-discarded cards', () => {
  const state = initDeckState();
  const toDiscard = state.hand.map(c => c.id); // discard all 7

  const next = shuffleHand(state, toDiscard);

  // All 7 new cards should be different from the 7 discarded
  const newHandIds = new Set(next.hand.map(c => c.id));
  for (const id of toDiscard) {
    assert.ok(!newHandIds.has(id), `just-discarded card ${id} was drawn back`);
  }
});

test('shuffleHand puts discarded cards into discard pile', () => {
  const state = initDeckState();
  const toDiscard = [state.hand[0].id, state.hand[1].id];

  const next = shuffleHand(state, toDiscard);

  // Discarded cards end up in discard pile
  const discardIds = new Set(next.discardPile.map(c => c.id));
  for (const id of toDiscard) {
    assert.ok(discardIds.has(id), `card ${id} not found in discard pile`);
  }
});

test('shuffleHand with empty ids returns unchanged', () => {
  const state = initDeckState();
  const next = shuffleHand(state, []);
  assert.deepEqual(next.hand.map(c => c.id), state.hand.map(c => c.id));
  assert.equal(next.deck.length, state.deck.length);
});

test('shuffleHand preserves total card count', () => {
  const state = initDeckState();

  // Run 100 random shuffle operations
  let current = state;
  for (let i = 0; i < 100; i++) {
    const n = 1 + Math.floor(Math.random() * 7);
    const toDiscard = current.hand.slice(0, n).map(c => c.id);
    current = shuffleHand(current, toDiscard);

    const total = current.hand.length + current.deck.length + current.discardPile.length;
    assert.equal(total, 39, `total cards should be 39, got ${total} at iteration ${i}`);
  }
});

test('shuffleHand unique cards maintained across all piles', () => {
  const state = initDeckState();

  let current = state;
  for (let i = 0; i < 50; i++) {
    const n = 1 + Math.floor(Math.random() * 4);
    const toDiscard = current.hand.slice(0, n).map(c => c.id);
    current = shuffleHand(current, toDiscard);

    const allIds = [
      ...current.hand.map(c => c.id),
      ...current.deck.map(c => c.id),
      ...current.discardPile.map(c => c.id),
    ];
    assert.equal(new Set(allIds).size, 39, `duplicate cards at iteration ${i}`);
  }
});

test('shuffleHand recycles discard pile when deck runs low', () => {
  // Create state where deck is emptied and discard pile has cards
  const state = initDeckState();
  const allDeckCards = state.deck;

  // Move everything to discard
  let current = {
    deck: [],
    discardPile: [...allDeckCards],
    hand: state.hand,
  };

  const toDiscard = current.hand.slice(0, 3).map(c => c.id);
  const next = shuffleHand(current, toDiscard);

  // Should still work — shuffles discard back in
  assert.equal(next.hand.length, 7);
});
