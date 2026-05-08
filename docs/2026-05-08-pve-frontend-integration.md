# PvE Frontend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the frontend with the first-layer backend PvE protocol so the UI becomes a socket-driven client for room startup, skill selection, hand actions, and `resolution[]` playback while preserving the current visual shell.

**Architecture:** Add a frontend session/store layer for backend-owned PvE state, a card adapter layer for converting backend cards into current UI card props, and a resolution player that interprets backend `resolution[]` events into local presentation state. Keep the existing page/component structure where possible, but replace local gameplay truth with backend state and socket actions.

**Tech Stack:** React, React Router, Zustand, Socket.io client, existing game UI components, backend-driven `gameState`

---

## File Map

### Existing files to modify
- `CardGame/frontend/src/pages/LobbyPage.jsx`
- `CardGame/frontend/src/pages/SkillSelectPage.jsx`
- `CardGame/frontend/src/pages/GamePage.jsx`
- `CardGame/frontend/src/router/index.jsx`
- `CardGame/frontend/src/components/game/Battlefield.jsx`
- `CardGame/frontend/src/components/game/ScorePanel.jsx`
- `CardGame/frontend/src/components/game/HandArea.jsx`
- `CardGame/frontend/src/components/game/SkillBar.jsx`
- `CardGame/frontend/src/store/authStore.js`

### Existing files to read and reuse
- `CardGame/frontend/src/components/game/HandCard.jsx`
- `CardGame/frontend/src/data/cards.js`
- `CardGame/docs/superpowers/analysis/pve-resolution-and-action-protocol-draft.md`
- `CardGame/docs/superpowers/plans/2026-05-08-pve-backend-state-machine-alignment.md`

### New files to create
- `CardGame/frontend/src/store/pveSessionStore.js`
- `CardGame/frontend/src/lib/cardPresentation.js`
- `CardGame/frontend/src/lib/cardAdapters.js`
- `CardGame/frontend/src/lib/resolutionPlayer.js`
- `CardGame/frontend/tests/cardAdapters.test.js`
- `CardGame/frontend/tests/pveSessionStore.test.js`
- `CardGame/frontend/tests/resolutionPlayer.test.js`

## Task 1: Add Backend Card Presentation Registry And Adapter

**Files:**
- Create: `CardGame/frontend/src/lib/cardPresentation.js`
- Create: `CardGame/frontend/src/lib/cardAdapters.js`
- Create: `CardGame/frontend/tests/cardAdapters.test.js`
- Reuse: `CardGame/frontend/src/data/cards.js`

- [ ] **Step 1: Write the failing adapter tests**

Create `cardAdapters.test.js` with focused expectations:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import { toUICard, toUICards } from '../src/lib/cardAdapters.js';

test('toUICard maps backend FIRE card to current red UI shape', () => {
  const uiCard = toUICard({
    id: 'FIRE_7',
    element: 'FIRE',
    rank: 7,
    displayRank: '7',
    chipValue: 7,
  });

  assert.equal(uiCard.id, 'FIRE_7');
  assert.equal(uiCard.color, 'red');
  assert.equal(uiCard.cost, 7);
  assert.ok(uiCard.image.includes('/cards/'));
  assert.ok(typeof uiCard.name === 'string');
});

test('toUICards preserves card order', () => {
  const cards = toUICards([
    { id: 'FIRE_1', element: 'FIRE', rank: 1, displayRank: 'A', chipValue: 1 },
    { id: 'WATER_2', element: 'WATER', rank: 2, displayRank: '2', chipValue: 2 },
  ]);

  assert.deepEqual(cards.map((card) => card.id), ['FIRE_1', 'WATER_2']);
});
```

- [ ] **Step 2: Run the adapter tests and verify they fail**

Run:

```bash
cd CardGame/frontend && npm test -- tests/cardAdapters.test.js
```

Expected:
- FAIL because adapter modules do not exist yet

- [ ] **Step 3: Build an explicit presentation registry**

Create `cardPresentation.js` by converting the existing `src/data/cards.js` asset data into a registry keyed by backend ids:

```js
export const CARD_PRESENTATION_BY_ID = {
  FIRE_1: { color: 'red', image: '/cards/card_01.png', name: 'Fire A' },
  FIRE_2: { color: 'red', image: '/cards/card_02.png', name: 'Fire 2' },
  WATER_1: { color: 'blue', image: '/cards/card_14.jpg', name: 'Water A' },
  GRASS_1: { color: 'green', image: '/cards/card_27.png', name: 'Grass A' },
  // ...fill out all 39 cards explicitly
};
```

- [ ] **Step 4: Implement the adapter functions**

Create `cardAdapters.js`:

```js
import { CARD_PRESENTATION_BY_ID } from './cardPresentation.js';

export function toUICard(card) {
  const presentation = CARD_PRESENTATION_BY_ID[card.id];

  if (!presentation) {
    throw new Error(`Missing card presentation for ${card.id}`);
  }

  return {
    id: card.id,
    color: presentation.color,
    cost: card.rank,
    displayRank: card.displayRank,
    image: presentation.image,
    name: presentation.name,
  };
}

export function toUICards(cards) {
  return cards.map(toUICard);
}
```

- [ ] **Step 5: Re-run the adapter tests and verify they pass**

Run:

```bash
cd CardGame/frontend && npm test -- tests/cardAdapters.test.js
```

Expected:
- PASS for both adapter tests

- [ ] **Step 6: Commit**

```bash
git add CardGame/frontend/src/lib/cardPresentation.js CardGame/frontend/src/lib/cardAdapters.js CardGame/frontend/tests/cardAdapters.test.js
git commit -m "feat: add frontend backend-card adapter layer"
```

## Task 2: Add PvE Session Store For Socket-Driven Backend Truth

**Files:**
- Create: `CardGame/frontend/src/store/pveSessionStore.js`
- Create: `CardGame/frontend/tests/pveSessionStore.test.js`
- Modify: `CardGame/frontend/src/store/authStore.js`

- [ ] **Step 1: Write the failing store tests**

Create `pveSessionStore.test.js` with minimal behavior tests:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import usePveSessionStore from '../src/store/pveSessionStore.js';

test('store accepts incoming gameState and updates backend-owned fields', () => {
  usePveSessionStore.getState().resetForTest();

  usePveSessionStore.getState().applyGameState({
    phase: 'SKILL_SELECT',
    gameState: {
      room: { roomId: '123456' },
      player: { health: 20, maxHealth: 20, hand: [], selectedCardIds: [], skillCharges: 3, shield: { active: false, onCooldown: false } },
      deck: { remainingCount: 32 },
      discard: { count: 0 },
      bot: { health: 100, maxHealth: 100 },
      battle: { round: 1, lastPlayedCards: [], lastHandEvaluation: null },
      lastError: null,
      gameOver: null,
      resolution: null,
    },
  });

  const state = usePveSessionStore.getState();
  assert.equal(state.phase, 'SKILL_SELECT');
  assert.equal(state.roomId, '123456');
  assert.equal(state.player.health, 20);
  assert.equal(state.deck.remainingCount, 32);
});

test('store queues incoming resolution for playback', () => {
  usePveSessionStore.getState().resetForTest();

  usePveSessionStore.getState().applyGameState({
    phase: 'RESOLVE',
    gameState: {
      room: { roomId: '123456' },
      player: { health: 20, maxHealth: 20, hand: [], selectedCardIds: [], skillCharges: 3, shield: { active: false, onCooldown: false } },
      deck: { remainingCount: 32 },
      discard: { count: 0 },
      bot: { health: 80, maxHealth: 100 },
      battle: { round: 1, lastPlayedCards: [], lastHandEvaluation: null },
      lastError: null,
      gameOver: null,
      resolution: [{ type: 'PLAYER_ATTACK_STARTED' }],
    },
  });

  assert.equal(usePveSessionStore.getState().pendingResolution.length, 1);
});
```

- [ ] **Step 2: Run the store tests and verify they fail**

Run:

```bash
cd CardGame/frontend && npm test -- tests/pveSessionStore.test.js
```

Expected:
- FAIL because the store does not exist yet

- [ ] **Step 3: Implement the first-version PvE session store**

Create `pveSessionStore.js` with:
- socket instance storage
- latest backend `gameState`
- derived `roomId`
- `pendingResolution`
- `isResolving`
- `presentationState` for local UI-only animation flags
- `connect`, `disconnect`, `applyGameState`, `queueResolution`, `consumeResolution`, `resetForTest`

Minimum shape:

```js
const usePveSessionStore = create((set, get) => ({
  socket: null,
  phase: null,
  roomId: null,
  player: null,
  deck: null,
  discard: null,
  bot: null,
  battle: null,
  gameOver: null,
  lastError: null,
  pendingResolution: [],
  isResolving: false,
  presentationState: {
    battlePhase: null,
    lastScore: null,
  },
  applyGameState: (payload) => { /* ... */ },
  resetForTest: () => { /* ... */ },
}));
```

- [ ] **Step 4: Re-run the store tests and verify they pass**

Run:

```bash
cd CardGame/frontend && npm test -- tests/pveSessionStore.test.js
```

Expected:
- PASS for state application and resolution queueing

- [ ] **Step 5: Commit**

```bash
git add CardGame/frontend/src/store/pveSessionStore.js CardGame/frontend/tests/pveSessionStore.test.js
git commit -m "feat: add frontend pve session store"
```

## Task 3: Add Resolution Player For UI-Only Presentation State

**Files:**
- Create: `CardGame/frontend/src/lib/resolutionPlayer.js`
- Create: `CardGame/frontend/tests/resolutionPlayer.test.js`
- Modify: `CardGame/frontend/src/store/pveSessionStore.js`

- [ ] **Step 1: Write the failing resolution player tests**

Create `resolutionPlayer.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import { createResolutionInterpreter } from '../src/lib/resolutionPlayer.js';

test('resolution interpreter maps PLAYER_ATTACK_STARTED to battlePhase player', async () => {
  const events = [];
  const interpreter = createResolutionInterpreter({
    onStep: (state) => events.push(state),
    wait: async () => {},
  });

  await interpreter.play([{ type: 'PLAYER_ATTACK_STARTED' }]);

  assert.equal(events.at(-1).battlePhase, 'player');
});

test('resolution interpreter maps HAND_EVALUATED to lastScore', async () => {
  const events = [];
  const interpreter = createResolutionInterpreter({
    onStep: (state) => events.push(state),
    wait: async () => {},
  });

  await interpreter.play([{
    type: 'HAND_EVALUATED',
    selectedCardIds: ['FIRE_7'],
    handType: 'PAIR',
    baseAttack: 7,
    bonusAttack: 10,
    multiplier: 1.2,
    totalScore: 20,
  }]);

  assert.equal(events.at(-1).lastScore, 20);
});
```

- [ ] **Step 2: Run the resolution player tests and verify they fail**

Run:

```bash
cd CardGame/frontend && npm test -- tests/resolutionPlayer.test.js
```

Expected:
- FAIL because the interpreter module does not exist yet

- [ ] **Step 3: Implement a UI-only resolution interpreter**

Create `resolutionPlayer.js` with:
- `createResolutionInterpreter({ onStep, wait })`
- `play(resolution)`
- one switch over step types

Minimum mapping:
- `PLAYER_ATTACK_STARTED` -> `battlePhase: 'player'`
- `BOSS_COUNTER_STARTED` -> `battlePhase: 'boss'`
- `SHIELD_BROKEN` -> `battlePhase: 'shield_break'`
- `HAND_EVALUATED` -> `lastScore`
- `ROUND_RESOLVED` -> clear presentation phase and finish unlock

- [ ] **Step 4: Hook the interpreter into the session store**

Extend `pveSessionStore.js` so:
- `applyGameState()` queues `resolution`
- a `playPendingResolution()` action consumes one queued resolution
- during playback:
  - `isResolving = true`
  - `presentationState` is updated by interpreter callbacks
  - `isResolving = false` after playback completes

- [ ] **Step 5: Re-run the tests and verify they pass**

Run:

```bash
cd CardGame/frontend && npm test -- tests/resolutionPlayer.test.js tests/pveSessionStore.test.js
```

Expected:
- PASS for interpreter and store integration

- [ ] **Step 6: Commit**

```bash
git add CardGame/frontend/src/lib/resolutionPlayer.js CardGame/frontend/src/store/pveSessionStore.js CardGame/frontend/tests/resolutionPlayer.test.js
git commit -m "feat: add frontend pve resolution playback"
```

## Task 4: Wire Minimal Lobby And Skill Selection Flow

**Files:**
- Modify: `CardGame/frontend/src/pages/LobbyPage.jsx`
- Modify: `CardGame/frontend/src/pages/SkillSelectPage.jsx`
- Modify: `CardGame/frontend/src/router/index.jsx`
- Modify: `CardGame/frontend/src/store/pveSessionStore.js`

- [ ] **Step 1: Write a failing store-level startup test**

Add to `pveSessionStore.test.js`:

```js
test('startGame emits startPveGame through the active socket', () => {
  const emitted = [];
  const fakeSocket = { emit: (...args) => emitted.push(args) };

  usePveSessionStore.getState().resetForTest();
  usePveSessionStore.setState({ socket: fakeSocket });
  usePveSessionStore.getState().startGame();

  assert.deepEqual(emitted, [['startPveGame']]);
});
```

- [ ] **Step 2: Run the store test and verify it fails**

Run:

```bash
cd CardGame/frontend && npm test -- tests/pveSessionStore.test.js
```

Expected:
- FAIL because `startGame()` is not implemented

- [ ] **Step 3: Implement the minimum lobby/start flow**

In `pveSessionStore.js`, add:
- `connectSocket(token)`
- `startGame()`
- `submitSkills(skills)`

`startGame()` should only emit `startPveGame`.

Update `LobbyPage.jsx` so it renders only:
- one start button
- click handler to ensure socket connection and emit `startPveGame`

Keep this page intentionally minimal because its full design is deferred.

- [ ] **Step 4: Implement the minimal SkillSelect flow**

Update `SkillSelectPage.jsx` so it:
- reads backend `phase` from `pveSessionStore`
- renders a small hardcoded first-version skill list
- allows selecting exactly two skills
- calls `submitSkills(selectedSkills)` on confirm
- shows disabled state while the selection is incomplete or while `isResolving`

Do not add countdowns or advanced layout in first version.

- [ ] **Step 5: Re-run tests and verify they pass**

Run:

```bash
cd CardGame/frontend && npm test -- tests/pveSessionStore.test.js
```

Expected:
- PASS including `startGame()` emission behavior

- [ ] **Step 6: Commit**

```bash
git add CardGame/frontend/src/pages/LobbyPage.jsx CardGame/frontend/src/pages/SkillSelectPage.jsx CardGame/frontend/src/store/pveSessionStore.js
git commit -m "feat: wire frontend lobby and skill selection to backend pve"
```

## Task 5: Replace `GamePage` Local Truth With Backend State

**Files:**
- Modify: `CardGame/frontend/src/pages/GamePage.jsx`
- Modify: `CardGame/frontend/src/components/game/Battlefield.jsx`
- Modify: `CardGame/frontend/src/components/game/ScorePanel.jsx`
- Modify: `CardGame/frontend/src/components/game/HandArea.jsx`
- Modify: `CardGame/frontend/src/components/game/SkillBar.jsx`
- Modify: `CardGame/frontend/src/store/pveSessionStore.js`
- Reuse: `CardGame/frontend/src/lib/cardAdapters.js`

- [ ] **Step 1: Write a failing page-level data-shape test**

Because current frontend tests are node-based and not DOM-heavy, add a focused store-derived test instead of a full rendered page test:

```js
test('store exposes adapted hand cards for UI rendering', () => {
  usePveSessionStore.getState().resetForTest();
  usePveSessionStore.getState().applyGameState({
    phase: 'PLAY',
    gameState: {
      room: { roomId: '123456' },
      player: {
        health: 20,
        maxHealth: 20,
        hand: [{ id: 'FIRE_7', element: 'FIRE', rank: 7, displayRank: '7', chipValue: 7 }],
        selectedCardIds: ['FIRE_7'],
        skillCharges: 3,
        shield: { active: false, onCooldown: false },
      },
      deck: { remainingCount: 31 },
      discard: { count: 1 },
      bot: { health: 100, maxHealth: 100 },
      battle: { round: 1, lastPlayedCards: [], lastHandEvaluation: null },
      lastError: null,
      gameOver: null,
      resolution: null,
    },
  });

  const uiCards = usePveSessionStore.getState().getUICards();
  assert.equal(uiCards[0].color, 'red');
});
```

- [ ] **Step 2: Run the store test and verify it fails**

Run:

```bash
cd CardGame/frontend && npm test -- tests/pveSessionStore.test.js
```

Expected:
- FAIL because UI card derivation is not implemented

- [ ] **Step 3: Add derived selectors to the session store**

Add store selectors/actions for:
- `getUICards()`
- `isCardSelected(cardId)`
- `sendSelection(cardIds)`
- `playSelectedHand()`
- `discardSelectedCards()`
- `activateShield()`
- `changeCardColor(cardId, newColor)`
- `changeCardCost(cardId, newCost)`

- [ ] **Step 4: Convert `GamePage` to backend-driven data**

Update `GamePage.jsx` so it reads from `pveSessionStore` instead of `useGameLogic`:
- `hand` -> adapted UI cards from backend hand
- `selected` -> backend `selectedCardIds`
- `deckCount` -> backend `deck.remainingCount`
- `playerHp` / `playerMaxHp` -> backend player state
- `bossHp` / `bossMaxHp` -> backend bot state
- `round` -> backend `battle.round`
- `skillCharges` / `shieldActive` -> backend player state
- `battlePhase` / `lastScore` -> `presentationState`
- `gameOver` -> backend `gameOver`

Replace local action handlers with socket-backed store actions.

Remove the direct dependency on `useGameLogic`.

- [ ] **Step 5: Keep the existing visual shell stable**

Adjust child components only as needed:
- `Battlefield` should continue using `battlePhase`, `lastScore`, `bossHp`, `bossMaxHp`
- `HandArea` should continue receiving UI cards plus selected ids
- `ScorePanel` should consume backend-backed evaluation state
- `SkillBar` should trigger store actions rather than local hook callbacks

Avoid redesigning layout in this task.

- [ ] **Step 6: Re-run frontend tests and build**

Run:

```bash
cd CardGame/frontend && npm test
cd CardGame/frontend && npm run build
```

Expected:
- frontend tests PASS
- production build succeeds

- [ ] **Step 7: Commit**

```bash
git add CardGame/frontend/src/pages/GamePage.jsx CardGame/frontend/src/components/game/Battlefield.jsx CardGame/frontend/src/components/game/ScorePanel.jsx CardGame/frontend/src/components/game/HandArea.jsx CardGame/frontend/src/components/game/SkillBar.jsx CardGame/frontend/src/store/pveSessionStore.js
git commit -m "feat: switch frontend game page to backend pve state"
```

## Final Verification

- [ ] **Step 1: Run all frontend targeted tests**

Run:

```bash
cd CardGame/frontend && npm test
```

Expected:
- all frontend tests PASS

- [ ] **Step 2: Run frontend build**

Run:

```bash
cd CardGame/frontend && npm run build
```

Expected:
- exit code 0

- [ ] **Step 3: Manual verification checklist**

Verify locally against a running backend:
- `LobbyPage` start button emits `startPveGame`
- `SkillSelectPage` accepts exactly two skills
- `GamePage` renders backend hand and health values
- selecting cards updates backend selection state
- discard action updates hand and deck count
- shield activation affects later resolution playback
- `play_hand` animates through `resolution[]`
- game over state shows correctly

- [ ] **Step 4: Commit final integration pass**

```bash
git add CardGame/frontend
git commit -m "feat: integrate frontend with backend pve protocol"
```

## Assumptions
- `LobbyPage` remains intentionally minimal and only owns the start button
- `SkillSelectPage` first version is functional, not fully polished
- `GamePage` keeps the current visual shell while changing state source
- backend `resolution[]` remains the only ordered animation script source
- frontend animation timing stays frontend-owned
- backend card truth is adapted into legacy UI card fields rather than changing the backend protocol
