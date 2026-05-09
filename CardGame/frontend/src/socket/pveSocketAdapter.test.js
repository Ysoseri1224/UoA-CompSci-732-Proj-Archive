import test from 'node:test';
import assert from 'node:assert/strict';

import {
  adaptServerCard,
  adaptPveGameState,
  deriveGameOver,
} from './pveSocketAdapter.js';

test('adaptServerCard maps backend card fields to existing frontend card view model', () => {
  const card = adaptServerCard({
    id: 'FIRE_13',
    element: 'FIRE',
    rank: 13,
    displayRank: 'K',
    chipValue: 13,
  });

  assert.deepEqual(card, {
    id: 'FIRE_13',
    name: '红-K',
    cost: 13,
    color: 'red',
    image: '/cards/card_13.png',
  });
});

test('adaptPveGameState projects backend payload into the frontend socket cache shape', () => {
  const state = adaptPveGameState({
    hand: [
      { id: 'WATER_1', element: 'WATER', rank: 1, displayRank: 'A', chipValue: 1 },
    ],
    deckCount: 12,
    discardCount: 3,
    player: { hp: 18, maxHp: 20, buffs: [], chosenElement: null },
    boss: {
      id: 'boss_layer_2',
      layer: 2,
      element: 'GRASS',
      hp: 240,
      maxHp: 300,
      attackPerRound: 6,
      chargeAttack: 13,
      behavior: { currentIntent: 'ATTACK', chargeStored: false },
      weights: { attack: 0.8, charge: 0.15, defend: 0.05 },
    },
    round: 4,
    phase: 'PLAY',
    skills: {
      changeColor: { used: false },
      changeCost: { used: true },
      shield: { active: true, onCooldown: false },
    },
    shuffle: { remaining: 1, pendingDiscard: [] },
    play: { selectedCards: ['WATER_1'], handType: null, score: null },
    bossRound: { intent: 'ATTACK', isDefending: false, willReleaseCharge: false },
    battleResult: 'ONGOING',
  });

  assert.equal(state.hand[0].color, 'blue');
  assert.equal(state.hand[0].cost, 1);
  assert.equal(state.deckCount, 12);
  assert.equal(state.floor, 2);
  assert.equal(state.phase, 'PLAY');
  assert.equal(state.shieldActive, true);
  assert.equal(state.shuffle.remaining, 1);
});

test('deriveGameOver maps backend battle results to existing page overlay states', () => {
  assert.equal(deriveGameOver('ONGOING'), null);
  assert.equal(deriveGameOver('WIN'), 'win');
  assert.equal(deriveGameOver('LOSE'), 'lose');
});
