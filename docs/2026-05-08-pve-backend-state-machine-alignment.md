# PvE Backend State Machine Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the current backend PvE socket/runtime layer with the agreed first-layer protocol so the backend becomes the authoritative owner of hand state, selected cards, combat resolution, and `resolution[]` playback data.

**Architecture:** Keep the current socket entrypoint and room runtime, but expand the PvE state shape so room snapshots carry backend-owned hand/combat truth. Implement action-specific transition logic in the PvE machine incrementally: selection first, then hand mutation actions, then shield, then full `play_hand` resolution that emits ordered `resolution[]` events.

**Tech Stack:** Node.js, Socket.io, XState v5, TypeScript card/state utilities, node:test, existing PvE runtime skeleton

---

## File Map

### Existing files to modify
- `CardGame/backend/src/logic/pve/state.js`
- `CardGame/backend/src/logic/pve/machine.js`
- `CardGame/backend/src/logic/pve/models/playerState.js`
- `CardGame/backend/src/logic/pve/models/botState.js`
- `CardGame/backend/src/utils/socketHandlers.js`
- `CardGame/backend/tests/unit/pve.machine.test.js`
- `CardGame/backend/tests/unit/pve.socketHandlers.test.js`

### Existing files to read and reuse
- `CardGame/backend/src/types/card.ts`
- `CardGame/backend/src/lib/deck.ts`
- `CardGame/backend/src/lib/hand.ts`
- `CardGame/backend/src/lib/skills.ts`
- `CardGame/docs/superpowers/analysis/pve-resolution-and-action-protocol-draft.md`

### New files to create
- `CardGame/backend/src/logic/pve/resolution.js`
- `CardGame/backend/src/logic/pve/actions.js`
- `CardGame/backend/tests/unit/pve.playHand.test.js`
- `CardGame/backend/tests/unit/pve.selection-and-discard.test.js`
- `CardGame/backend/tests/unit/pve.skills.test.js`

## Task 1: Expand PvE Snapshot Shape

**Files:**
- Modify: `CardGame/backend/src/logic/pve/state.js`
- Modify: `CardGame/backend/src/logic/pve/models/playerState.js`
- Modify: `CardGame/backend/src/logic/pve/models/botState.js`
- Test: `CardGame/backend/tests/unit/pve.machine.test.js`

- [ ] **Step 1: Write the failing test for the first-version PvE state shape**

Add a new test near the top of `pve.machine.test.js` that asserts the initial snapshot includes backend-owned first-version fields:

```js
test("createInitialPveState exposes first-version backend-owned combat fields", () => {
  const initial = createInitialPveState({ roomId: "123456", socketId: "sock-1" });

  assert.equal(initial.room.roomId, "123456");
  assert.equal(initial.player.health, 20);
  assert.equal(initial.player.maxHealth, 20);
  assert.deepEqual(initial.player.hand, []);
  assert.deepEqual(initial.player.selectedCardIds, []);
  assert.equal(initial.player.skillCharges, 3);
  assert.deepEqual(initial.player.shield, { active: false, onCooldown: false });
  assert.equal(initial.deck.remainingCount, 0);
  assert.equal(initial.discard.count, 0);
  assert.equal(initial.bot.maxHealth, 100);
  assert.equal(initial.battle.round, 1);
  assert.equal(initial.battle.lastHandEvaluation, null);
  assert.equal(initial.resolution, null);
});
```

- [ ] **Step 2: Run the targeted test and verify it fails for missing fields**

Run:

```bash
node --test CardGame/backend/tests/unit/pve.machine.test.js
```

Expected:
- FAIL because `maxHealth`, `hand`, `selectedCardIds`, `skillCharges`, `shield`, `deck`, `discard`, `battle`, or `resolution` do not exist yet

- [ ] **Step 3: Implement the minimum state-shape expansion**

Update `playerState.js` to return:

```js
export function createPlayerState({
  userId = null,
  socketId = null,
  health = DEFAULT_PLAYER_HEALTH,
  maxHealth = DEFAULT_PLAYER_HEALTH,
} = {}) {
  return {
    userId,
    socketId,
    health,
    maxHealth,
    hand: [],
    selectedCardIds: [],
    skillCharges: 3,
    shield: { active: false, onCooldown: false },
  };
}
```

Update `botState.js` to return:

```js
export function createBotState({
  health = DEFAULT_BOT_HEALTH,
  maxHealth = DEFAULT_BOT_HEALTH,
} = {}) {
  return {
    health,
    maxHealth,
  };
}
```

Update `state.js` so `createInitialPveState()` includes:

```js
return {
  room: createRoomState({ roomId, dealerSide, activeSide }),
  player: createPlayerState({ userId, socketId }),
  deck: { remainingCount: 0 },
  discard: { count: 0 },
  bot: createBotState(),
  battle: {
    round: 1,
    lastPlayedCards: [],
    lastHandEvaluation: null,
  },
  phase: PHASE.WAITING,
  lastError: null,
  gameOver: null,
  resolution: null,
};
```

- [ ] **Step 4: Re-run the targeted test and verify it passes**

Run:

```bash
node --test CardGame/backend/tests/unit/pve.machine.test.js
```

Expected:
- PASS for the new snapshot-shape test

- [ ] **Step 5: Commit**

```bash
git add CardGame/backend/src/logic/pve/state.js CardGame/backend/src/logic/pve/models/playerState.js CardGame/backend/src/logic/pve/models/botState.js CardGame/backend/tests/unit/pve.machine.test.js
git commit -m "test: expand initial pve snapshot shape"
```

## Task 2: Add Backend-Owned Selection And Discard Actions

**Files:**
- Create: `CardGame/backend/tests/unit/pve.selection-and-discard.test.js`
- Modify: `CardGame/backend/src/logic/pve/machine.js`
- Create: `CardGame/backend/src/logic/pve/actions.js`

- [ ] **Step 1: Write the failing tests for selection and discard ownership**

Create `pve.selection-and-discard.test.js` with two focused tests:

```js
test("PVE.SELECT_CARDS replaces selectedCardIds when all ids exist in hand", () => {
  const initial = createInitialPveState();
  initial.player.hand = [
    { id: "FIRE_7", element: "FIRE", rank: 7, displayRank: "7", chipValue: 7 },
    { id: "FIRE_8", element: "FIRE", rank: 8, displayRank: "8", chipValue: 8 },
  ];

  const actor = createActor(createPveMachine({ initialState: initial })).start();
  actor.send({ type: "PVE.SELECT_CARDS", cardIds: ["FIRE_7"] });

  assert.deepEqual(actor.getSnapshot().context.player.selectedCardIds, ["FIRE_7"]);
  assert.equal(actor.getSnapshot().context.lastError, null);
});

test("PVE.DISCARD_CARDS removes selected cards, updates counts, and clears selection", () => {
  const initial = createInitialPveState();
  initial.player.hand = [
    { id: "FIRE_7", element: "FIRE", rank: 7, displayRank: "7", chipValue: 7 },
    { id: "FIRE_8", element: "FIRE", rank: 8, displayRank: "8", chipValue: 8 },
  ];
  initial.player.selectedCardIds = ["FIRE_7"];
  initial.deck = { remainingCount: 10 };
  initial.discard = { count: 0 };

  const actor = createActor(createPveMachine({ initialState: initial })).start();
  actor.send({ type: "PVE.DISCARD_CARDS" });

  assert.equal(actor.getSnapshot().context.player.hand.length, 1);
  assert.deepEqual(actor.getSnapshot().context.player.selectedCardIds, []);
  assert.equal(actor.getSnapshot().context.discard.count, 1);
  assert.equal(actor.getSnapshot().context.resolution, null);
});
```

- [ ] **Step 2: Run the new selection/discard tests and verify they fail**

Run:

```bash
node --test CardGame/backend/tests/unit/pve.selection-and-discard.test.js
```

Expected:
- FAIL because `PVE.SELECT_CARDS` and `PVE.DISCARD_CARDS` do not exist yet

- [ ] **Step 3: Add minimum action helpers**

Create `actions.js` with pure helpers that keep the machine readable:

```js
export function replaceSelection(context, cardIds) {
  return {
    ...context,
    player: { ...context.player, selectedCardIds: cardIds },
    lastError: null,
    resolution: null,
  };
}

export function discardSelected(context) {
  const selected = new Set(context.player.selectedCardIds);
  const kept = context.player.hand.filter((card) => !selected.has(card.id));
  const discarded = context.player.hand.filter((card) => selected.has(card.id));

  return {
    ...context,
    player: { ...context.player, hand: kept, selectedCardIds: [] },
    discard: { count: context.discard.count + discarded.length },
    lastError: null,
    resolution: null,
  };
}
```

- [ ] **Step 4: Wire the new machine events with minimal validations**

In `machine.js`, add:

```js
"PVE.SELECT_CARDS": [
  {
    guard: ({ context, event }) =>
      Array.isArray(event.cardIds) &&
      event.cardIds.length <= 5 &&
      event.cardIds.every((id) => context.player.hand.some((card) => card.id === id)),
    actions: assign(({ context, event }) => replaceSelection(context, event.cardIds)),
  },
  {
    actions: setError("INVALID_SELECTION", "Invalid selected card ids."),
  },
],
```

And:

```js
"PVE.DISCARD_CARDS": [
  {
    guard: ({ context }) => context.player.selectedCardIds.length > 0,
    actions: assign(({ context }) => discardSelected(context)),
  },
  {
    actions: setError("INVALID_DISCARD", "No selected cards available for discard."),
  },
],
```

- [ ] **Step 5: Re-run the tests and verify they pass**

Run:

```bash
node --test CardGame/backend/tests/unit/pve.selection-and-discard.test.js
```

Expected:
- PASS for both selection and discard tests

- [ ] **Step 6: Commit**

```bash
git add CardGame/backend/src/logic/pve/machine.js CardGame/backend/src/logic/pve/actions.js CardGame/backend/tests/unit/pve.selection-and-discard.test.js
git commit -m "feat: add backend-owned pve selection and discard"
```

## Task 3: Add Shield Activation And Skill Mutation Actions

**Files:**
- Create: `CardGame/backend/tests/unit/pve.skills.test.js`
- Modify: `CardGame/backend/src/logic/pve/machine.js`
- Modify: `CardGame/backend/src/logic/pve/actions.js`
- Reuse: `CardGame/backend/src/lib/skills.ts`

- [ ] **Step 1: Write failing tests for shield activation and one card mutation skill**

Create `pve.skills.test.js` with at least:

```js
test("PVE.SKILL_ACTIVATE_SHIELD consumes a charge and marks shield active", () => {
  const actor = createActor(createPveMachine({ initialState: createInitialPveState() })).start();
  actor.send({ type: "PVE.SKILL_ACTIVATE_SHIELD" });

  const snap = actor.getSnapshot();
  assert.equal(snap.context.player.skillCharges, 2);
  assert.deepEqual(snap.context.player.shield, { active: true, onCooldown: false });
  assert.equal(snap.context.resolution, null);
});

test("PVE.SKILL_CHANGE_COLOR updates the targeted card in hand", () => {
  const initial = createInitialPveState();
  initial.player.hand = [
    { id: "FIRE_7", element: "FIRE", rank: 7, displayRank: "7", chipValue: 7 },
  ];

  const actor = createActor(createPveMachine({ initialState: initial })).start();
  actor.send({ type: "PVE.SKILL_CHANGE_COLOR", cardId: "FIRE_7", newColor: "WATER" });

  const next = actor.getSnapshot().context.player.hand[0];
  assert.equal(next.element, "WATER");
  assert.equal(actor.getSnapshot().context.player.skillCharges, 2);
});
```

- [ ] **Step 2: Run the skill tests and verify they fail**

Run:

```bash
node --test CardGame/backend/tests/unit/pve.skills.test.js
```

Expected:
- FAIL because skill actions are not yet handled

- [ ] **Step 3: Implement the minimum helpers for shield and hand mutation**

Extend `actions.js` with:

```js
export function activateShield(context) {
  return {
    ...context,
    player: {
      ...context.player,
      skillCharges: context.player.skillCharges - 1,
      shield: { active: true, onCooldown: false },
    },
    lastError: null,
    resolution: null,
  };
}
```

Add a temporary card replacement helper that uses the existing backend card/skill utilities instead of frontend card data.

- [ ] **Step 4: Wire `PVE.SKILL_ACTIVATE_SHIELD`, `PVE.SKILL_CHANGE_COLOR`, and `PVE.SKILL_CHANGE_COST`**

Add transitions with guards such as:

```js
"PVE.SKILL_ACTIVATE_SHIELD": [
  {
    guard: ({ context }) =>
      context.player.skillCharges > 0 &&
      !context.player.shield.active &&
      !context.player.shield.onCooldown,
    actions: assign(({ context }) => activateShield(context)),
  },
  {
    actions: setError("INVALID_SKILL", "Shield cannot be activated right now."),
  },
],
```

Color/rank mutation should:
- verify target card exists in hand
- consume one charge
- replace the card in hand
- preserve selection by updating the selected id to the replacement id if the card was selected before mutation

- [ ] **Step 5: Re-run the tests and verify they pass**

Run:

```bash
node --test CardGame/backend/tests/unit/pve.skills.test.js
```

Expected:
- PASS for shield activation and skill mutation tests

- [ ] **Step 6: Commit**

```bash
git add CardGame/backend/src/logic/pve/machine.js CardGame/backend/src/logic/pve/actions.js CardGame/backend/tests/unit/pve.skills.test.js
git commit -m "feat: add backend pve shield and skill mutations"
```

## Task 4: Add `resolution[]` Builder And `PVE.PLAY_HAND` Combat Resolution

**Files:**
- Create: `CardGame/backend/src/logic/pve/resolution.js`
- Create: `CardGame/backend/tests/unit/pve.playHand.test.js`
- Modify: `CardGame/backend/src/logic/pve/actions.js`
- Modify: `CardGame/backend/src/logic/pve/machine.js`

- [ ] **Step 1: Write failing tests for the first-layer `play_hand` contract**

Create `pve.playHand.test.js` with focused action-resolution tests:

```js
test("PVE.PLAY_HAND emits first-layer resolution and advances round when both sides survive", () => {
  const initial = createInitialPveState();
  initial.player.hand = [
    { id: "FIRE_7", element: "FIRE", rank: 7, displayRank: "7", chipValue: 7 },
  ];
  initial.player.selectedCardIds = ["FIRE_7"];
  initial.bot.health = 100;
  initial.bot.maxHealth = 100;

  const actor = createActor(createPveMachine({ initialState: initial })).start();
  actor.send({ type: "PVE.PLAY_HAND" });

  const snap = actor.getSnapshot();
  assert.ok(Array.isArray(snap.context.resolution));
  assert.equal(snap.context.resolution[0].type, "PLAYER_ATTACK_STARTED");
  assert.ok(snap.context.resolution.some((step) => step.type === "HAND_EVALUATED"));
  assert.ok(snap.context.resolution.some((step) => step.type === "BOT_DAMAGED"));
  assert.ok(snap.context.resolution.some((step) => step.type === "ROUND_ADVANCED"));
  assert.equal(snap.context.battle.round, 2);
  assert.deepEqual(snap.context.player.selectedCardIds, []);
});

test("PVE.PLAY_HAND emits shield events instead of player damage when shield is active", () => {
  const initial = createInitialPveState();
  initial.player.hand = [
    { id: "FIRE_7", element: "FIRE", rank: 7, displayRank: "7", chipValue: 7 },
  ];
  initial.player.selectedCardIds = ["FIRE_7"];
  initial.player.shield = { active: true, onCooldown: false };

  const actor = createActor(createPveMachine({ initialState: initial })).start();
  actor.send({ type: "PVE.PLAY_HAND" });

  const types = actor.getSnapshot().context.resolution.map((step) => step.type);
  assert.ok(types.includes("SHIELD_BLOCKED"));
  assert.ok(types.includes("SHIELD_BROKEN"));
  assert.ok(!types.includes("PLAYER_DAMAGED"));
});
```

- [ ] **Step 2: Run the `play_hand` tests and verify they fail**

Run:

```bash
node --test CardGame/backend/tests/unit/pve.playHand.test.js
```

Expected:
- FAIL because `PVE.PLAY_HAND` does not yet exist and no resolution builder exists

- [ ] **Step 3: Create a dedicated resolution-builder helper**

Create `resolution.js` with small helpers like:

```js
export function createHandEvaluatedEvent({
  selectedCardIds,
  handType,
  baseAttack,
  bonusAttack,
  multiplier,
  totalScore,
}) {
  return {
    type: "HAND_EVALUATED",
    selectedCardIds,
    handType,
    baseAttack,
    bonusAttack,
    multiplier,
    totalScore,
  };
}
```

Also add event constructors for:
- `BOT_DAMAGED`
- `PLAYER_DAMAGED`
- `ROUND_ADVANCED`
- `GAME_OVER`

- [ ] **Step 4: Implement a pure `playHand` resolver in `actions.js`**

Add a resolver with a shape like:

```js
export function resolvePlayHand(context) {
  const selectedCards = context.player.hand.filter((card) =>
    context.player.selectedCardIds.includes(card.id)
  );

  const evaluation = evaluateSelectedCards(selectedCards);
  const nextBotHealth = Math.max(0, context.bot.health - evaluation.totalScore);

  const resolution = [
    { type: "PLAYER_ATTACK_STARTED" },
    createHandEvaluatedEvent({ ...evaluation, selectedCardIds: context.player.selectedCardIds }),
    createBotDamagedEvent({
      amount: evaluation.totalScore,
      previousHealth: context.bot.health,
      remainingHealth: nextBotHealth,
    }),
  ];

  // add defeat / counter / shield / player damage / round advance here
}
```

The first-version resolver must also:
- remove played cards from hand
- increment discard count by played card count
- decrement deck remaining count by replacement card count where available
- clear selection
- write `battle.lastPlayedCards`
- write `battle.lastHandEvaluation`
- set `gameOver` when someone dies

- [ ] **Step 5: Wire `PVE.PLAY_HAND` in the machine**

Add:

```js
"PVE.PLAY_HAND": [
  {
    guard: ({ context }) => context.player.selectedCardIds.length > 0,
    actions: assign(({ context }) => resolvePlayHand(context)),
  },
  {
    actions: setError("INVALID_PLAY", "No selected cards available for play."),
  },
],
```

- [ ] **Step 6: Re-run the new `play_hand` tests and verify they pass**

Run:

```bash
node --test CardGame/backend/tests/unit/pve.playHand.test.js
```

Expected:
- PASS for normal attack and shield-absorbed attack

- [ ] **Step 7: Commit**

```bash
git add CardGame/backend/src/logic/pve/resolution.js CardGame/backend/src/logic/pve/actions.js CardGame/backend/src/logic/pve/machine.js CardGame/backend/tests/unit/pve.playHand.test.js
git commit -m "feat: add backend pve play hand resolution"
```

## Task 5: Update Socket Mapping And Integration Tests

**Files:**
- Modify: `CardGame/backend/src/utils/socketHandlers.js`
- Modify: `CardGame/backend/tests/unit/pve.socketHandlers.test.js`

- [ ] **Step 1: Write a failing socket test for the new action payload mapping**

Extend `pve.socketHandlers.test.js` with:

```js
test("socket handler forwards play_hand through playerAction and emits updated resolution state", () => {
  const socket = createFakeSocket("sock-3");
  registerSocketHandlers(socket);

  socket.trigger("startPveGame");
  socket.trigger("playerAction", { action: "select_cards", cardIds: ["FIRE_7"] });
  socket.trigger("playerAction", { action: "play_hand" });

  const gameStates = socket.emitted.filter((entry) => entry.event === "gameState");
  const latest = gameStates.at(-1).payload;

  assert.ok(Array.isArray(latest.gameState.resolution));
  assert.equal(latest.gameState.resolution[0].type, "PLAYER_ATTACK_STARTED");
});
```

- [ ] **Step 2: Run the socket tests and verify they fail**

Run:

```bash
node --test CardGame/backend/tests/unit/pve.socketHandlers.test.js
```

Expected:
- FAIL because `playerAction.action` is not yet mapped to the new internal PvE events

- [ ] **Step 3: Update socket action mapping**

Replace the current raw `playerAction` forwarding with an explicit action mapper:

```js
function mapPlayerAction(payload) {
  switch (payload?.action) {
    case "select_cards":
      return { type: "PVE.SELECT_CARDS", cardIds: payload.cardIds };
    case "play_hand":
      return { type: "PVE.PLAY_HAND" };
    case "discard_cards":
      return { type: "PVE.DISCARD_CARDS" };
    case "skill_change_color":
      return { type: "PVE.SKILL_CHANGE_COLOR", cardId: payload.cardId, newColor: payload.newColor };
    case "skill_change_cost":
      return { type: "PVE.SKILL_CHANGE_COST", cardId: payload.cardId, newCost: payload.newCost };
    case "skill_activate_shield":
      return { type: "PVE.SKILL_ACTIVATE_SHIELD" };
    default:
      return null;
  }
}
```

Then emit an English error snapshot when the action is unknown.

- [ ] **Step 4: Re-run the socket tests and verify they pass**

Run:

```bash
node --test CardGame/backend/tests/unit/pve.socketHandlers.test.js
```

Expected:
- PASS for the new mapping test and existing lifecycle tests

- [ ] **Step 5: Commit**

```bash
git add CardGame/backend/src/utils/socketHandlers.js CardGame/backend/tests/unit/pve.socketHandlers.test.js
git commit -m "feat: map socket player actions to backend pve events"
```

## Final Verification

- [ ] **Step 1: Run all targeted PvE tests**

Run:

```bash
node --test \
  CardGame/backend/tests/unit/pve.machine.test.js \
  CardGame/backend/tests/unit/pve.selection-and-discard.test.js \
  CardGame/backend/tests/unit/pve.skills.test.js \
  CardGame/backend/tests/unit/pve.playHand.test.js \
  CardGame/backend/tests/unit/pve.socketHandlers.test.js
```

Expected:
- all listed tests PASS

- [ ] **Step 2: Run backend lint**

Run:

```bash
cd CardGame/backend && npm run lint
```

Expected:
- exit code 0

- [ ] **Step 3: Review protocol alignment**

Verify implemented behavior still matches:
- `CardGame/docs/superpowers/analysis/pve-resolution-and-action-protocol-draft.md`
- first-layer only scope
- backend-owned hand truth
- one `gameState` payload containing one `resolution[]`

- [ ] **Step 4: Commit final integration pass**

```bash
git add CardGame/backend
git commit -m "feat: align backend pve state machine with first-layer protocol"
```

## Assumptions
- First version remains first-layer only; `BOT_DIED` is terminal for now
- The backend continues to expose one authoritative `gameState` snapshot per action
- `deck.remainingCount` and `discard.count` are sufficient in emitted state for first version
- Frontend card rendering will consume backend cards through an adapter rather than forcing protocol changes
- The current PvE skeleton can remain on XState for this intermediate alignment step even though `GameLogic_backend.md` ultimately aims at a custom state machine
