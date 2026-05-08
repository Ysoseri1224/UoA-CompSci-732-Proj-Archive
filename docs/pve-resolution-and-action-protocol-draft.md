# PvE Resolution And Action Protocol Draft

## Purpose
This document records the currently agreed draft for:
- backend-to-frontend PvE `resolution` events
- frontend-to-backend PvE action payloads

It is intentionally scoped to the first-layer PvE flow only.

This draft is based on:
- `CardGame/docs/GameLogic_backend.md` as the active target design
- the current frontend `useGameLogic` flow and its existing UI expectations

It does not attempt to cover multi-floor progression yet.

## Working Principles
### 1. Backend owns gameplay truth
The backend is the source of truth for:
- hand state
- selected cards
- deck and discard changes
- health changes
- shield state
- round progression
- game over

The frontend should not independently decide these results.

### 2. Frontend reports player intent
The frontend is responsible for reporting user actions such as:
- card selection changes
- play confirmation
- discard requests
- skill usage

The frontend does not determine the authoritative result of those actions.

### 3. Backend returns one `gameState` payload with one `resolution[]`
The backend should not emit a separate socket event for every animation beat.

Instead:
- frontend sends one action
- backend resolves that action
- backend emits one updated `gameState`
- the emitted `gameState` may contain a `resolution[]` array

`resolution[]` represents the ordered sequence of semantic battle events that the frontend should play.

### 4. Frontend controls animation timing
The backend should define:
- event order
- event meaning
- resulting data

The frontend should define:
- animation style
- animation duration
- interpolation timing
- effect presentation

The backend should not own CSS, `setTimeout`, or visual timing constants.

## Scope
This draft only covers first-layer PvE combat.

Explicitly out of scope for now:
- floor advancement
- boss respawn on next layer
- replay history format
- multi-floor protocol extensions

For this draft, `BOT_DIED` is treated as terminal for the current run.

## Backend To Frontend: Resolution Events
`resolution[]` is a one-action, ordered event list. It is not a socket event list and not a persistent combat history.

### Event Type Table
```ts
type ResolutionEvent =
  | { type: 'PLAYER_ATTACK_STARTED' }
  | {
      type: 'HAND_EVALUATED';
      selectedCardIds: string[];
      handType: string;
      baseAttack: number;
      bonusAttack: number;
      multiplier: number;
      totalScore: number;
    }
  | {
      type: 'BOT_DAMAGED';
      amount: number;
      previousHealth: number;
      remainingHealth: number;
    }
  | { type: 'BOSS_COUNTER_STARTED' }
  | {
      type: 'PLAYER_DAMAGED';
      amount: number;
      previousHealth: number;
      remainingHealth: number;
    }
  | { type: 'SHIELD_BLOCKED' }
  | { type: 'SHIELD_BROKEN' }
  | { type: 'BOT_DEFEATED' }
  | { type: 'PLAYER_DEFEATED' }
  | {
      type: 'GAME_OVER';
      winner: 'player' | 'bot';
      reason: 'BOT_DIED' | 'PLAYER_DIED';
    }
  | {
      type: 'ROUND_ADVANCED';
      round: number;
    }
  | { type: 'ROUND_RESOLVED' };
```

### Event Intent
#### `PLAYER_ATTACK_STARTED`
Used to trigger the player attack presentation phase.

This maps well to the current frontend `battlePhase = 'player'` behavior.

#### `HAND_EVALUATED`
Used to expose the backend’s evaluation result for the played cards.

Required because the current frontend UI already depends on:
- hand type display
- score display
- knowledge of which cards were played

#### `BOT_DAMAGED`
Used to animate boss HP loss and damage feedback.

Includes both `previousHealth` and `remainingHealth` so the frontend does not need to infer animation ranges from stale state.

#### `BOSS_COUNTER_STARTED`
Used to trigger the boss counterattack presentation phase.

This maps well to the current frontend `battlePhase = 'boss'` behavior.

#### `PLAYER_DAMAGED`
Used to animate player HP loss.

Includes both `previousHealth` and `remainingHealth` for stable animation playback.

#### `SHIELD_BLOCKED`
Used when shield absorbs the incoming boss attack.

This indicates that player damage should not be shown for that counterattack.

#### `SHIELD_BROKEN`
Used when the absorbed hit consumes the active shield.

This maps well to the current frontend `battlePhase = 'shield_break'` behavior.

#### `BOT_DEFEATED`
Used to mark that the boss reached zero HP.

This is separate from `GAME_OVER` so the frontend can play a defeat beat before terminal UI if needed.

#### `PLAYER_DEFEATED`
Used to mark that the player reached zero HP.

This is separate from `GAME_OVER` for the same reason.

#### `GAME_OVER`
Used to deliver the terminal outcome in the resolution sequence.

The same final outcome should also exist in `gameState.gameOver`, but keeping it in `resolution[]` allows the frontend to sequence terminal presentation cleanly.

#### `ROUND_ADVANCED`
Used when combat survives into the next round and the round counter increments.

#### `ROUND_RESOLVED`
Used as the final beat of a non-terminal action resolution.

The frontend can use this as the end-of-playback unlock point.

## Example Resolution Sequences
### Normal attack, no shield
```json
[
  { "type": "PLAYER_ATTACK_STARTED" },
  {
    "type": "HAND_EVALUATED",
    "selectedCardIds": ["FIRE_7", "FIRE_8", "FIRE_9"],
    "handType": "STRAIGHT",
    "baseAttack": 24,
    "bonusAttack": 20,
    "multiplier": 1.5,
    "totalScore": 66
  },
  {
    "type": "BOT_DAMAGED",
    "amount": 66,
    "previousHealth": 300,
    "remainingHealth": 234
  },
  { "type": "BOSS_COUNTER_STARTED" },
  {
    "type": "PLAYER_DAMAGED",
    "amount": 5,
    "previousHealth": 20,
    "remainingHealth": 15
  },
  { "type": "ROUND_ADVANCED", "round": 2 },
  { "type": "ROUND_RESOLVED" }
]
```

### Normal attack, shield absorbs counter
```json
[
  { "type": "PLAYER_ATTACK_STARTED" },
  {
    "type": "HAND_EVALUATED",
    "selectedCardIds": ["WATER_3", "WATER_3"],
    "handType": "PAIR",
    "baseAttack": 6,
    "bonusAttack": 10,
    "multiplier": 1.2,
    "totalScore": 19
  },
  {
    "type": "BOT_DAMAGED",
    "amount": 19,
    "previousHealth": 120,
    "remainingHealth": 101
  },
  { "type": "BOSS_COUNTER_STARTED" },
  { "type": "SHIELD_BLOCKED" },
  { "type": "SHIELD_BROKEN" },
  { "type": "ROUND_ADVANCED", "round": 3 },
  { "type": "ROUND_RESOLVED" }
]
```

### Player defeats boss
```json
[
  { "type": "PLAYER_ATTACK_STARTED" },
  {
    "type": "HAND_EVALUATED",
    "selectedCardIds": ["GRASS_7", "GRASS_7", "GRASS_7"],
    "handType": "THREE_OF_A_KIND",
    "baseAttack": 21,
    "bonusAttack": 35,
    "multiplier": 1.8,
    "totalScore": 101
  },
  {
    "type": "BOT_DAMAGED",
    "amount": 101,
    "previousHealth": 80,
    "remainingHealth": 0
  },
  { "type": "BOT_DEFEATED" },
  {
    "type": "GAME_OVER",
    "winner": "player",
    "reason": "BOT_DIED"
  }
]
```

## Frontend To Backend: Action Payloads
The frontend should send player intent through a unified PvE action channel.

The transport shape can stay under the existing socket event such as `playerAction`, but the semantic action names should be explicit.

### Action Type Table
#### `select_cards`
Purpose:
- replace the backend’s current selected card set with the latest full selection from the frontend

Payload:
```json
{
  "action": "select_cards",
  "cardIds": ["FIRE_7", "FIRE_8"]
}
```

Note:
- this is a full replacement payload, not an incremental toggle

#### `play_hand`
Purpose:
- request authoritative resolution of the currently selected hand

Payload:
```json
{
  "action": "play_hand"
}
```

Note:
- this action should use the backend’s current `selectedCardIds`
- it should not re-send `cardIds` in first version

#### `discard_cards`
Purpose:
- request discard/replenish using the backend’s current selected cards

Payload:
```json
{
  "action": "discard_cards"
}
```

#### `skill_change_color`
Purpose:
- request the color-change skill on a specific card

Payload:
```json
{
  "action": "skill_change_color",
  "cardId": "FIRE_7",
  "newColor": "blue"
}
```

#### `skill_change_cost`
Purpose:
- request the rank-change skill on a specific card

Payload:
```json
{
  "action": "skill_change_cost",
  "cardId": "FIRE_7",
  "newCost": 10
}
```

#### `skill_activate_shield`
Purpose:
- request shield activation

Payload:
```json
{
  "action": "skill_activate_shield"
}
```

## Backend Internal Event Mapping
The frontend socket payloads should be mapped into clearer internal PvE events for the state machine.

Suggested mapping:
```ts
{ action: 'select_cards', cardIds } -> { type: 'PVE.SELECT_CARDS', cardIds }
{ action: 'play_hand' } -> { type: 'PVE.PLAY_HAND' }
{ action: 'discard_cards' } -> { type: 'PVE.DISCARD_CARDS' }
{ action: 'skill_change_color', cardId, newColor } -> { type: 'PVE.SKILL_CHANGE_COLOR', cardId, newColor }
{ action: 'skill_change_cost', cardId, newCost } -> { type: 'PVE.SKILL_CHANGE_COST', cardId, newCost }
{ action: 'skill_activate_shield' } -> { type: 'PVE.SKILL_ACTIVATE_SHIELD' }
```

## Implications For Game State
Because hand management is backend-owned, the backend PvE state will need to maintain at least:
- current hand
- current selected card ids
- deck / draw state
- discard state
- shield state
- skill resource state
- round state
- latest `resolution[]`

The frontend should never be the final authority for these values.

## First-Version PvE `gameState` Field Table
This section defines the minimum backend-owned PvE `gameState` needed to support:
- first-layer combat only
- backend-owned hand management
- action-driven socket updates
- `resolution[]` playback on the frontend

It intentionally does not try to cover multi-floor progression yet.

### Shape Overview
```ts
interface PveGameState {
  room: RoomState;
  player: PvePlayerState;
  deck: PveDeckState;
  discard: PveDiscardState;
  bot: PveBotState;
  battle: PveBattleState;
  phase: PvePhase;
  lastError: ErrorState | null;
  gameOver: GameOverState | null;
  resolution: ResolutionEvent[] | null;
}
```

## Top-Level Fields
### `room`
Purpose:
- identify the active PvE room/session

First version:
```ts
interface RoomState {
  roomId: string | null;
}
```

Notes:
- the current socket skeleton already carries more room metadata such as `pot` and `currentBet`
- those fields are not required for first-layer `play_hand` resolution
- they may remain in implementation temporarily, but they are not part of the minimum decision-complete shape

### `player`
Purpose:
- store the authoritative player combat and hand state

First version:
```ts
interface PvePlayerState {
  userId: string | null;
  socketId: string | null;
  health: number;
  maxHealth: number;
  hand: Card[];
  selectedCardIds: string[];
  skillCharges: number;
  shield: {
    active: boolean;
    onCooldown: boolean;
  };
}
```

Why each field exists:
- `health` / `maxHealth`
  - needed by current HUD rendering
  - needed for `PLAYER_DAMAGED` and terminal checks
- `hand`
  - must be backend-owned if the backend owns `play_hand`
  - required for evaluation, discard, and skill replacement
- `selectedCardIds`
  - needed because `play_hand` and `discard_cards` use backend selection state
- `skillCharges`
  - needed because current frontend skills consume a shared resource pool
- `shield`
  - required for `SHIELD_BLOCKED` and `SHIELD_BROKEN`

### `deck`
Purpose:
- expose the backend-owned draw pile in the smallest frontend-useful shape

First version:
```ts
interface PveDeckState {
  remainingCount: number;
}
```

Why this is the right first cut:
- the current frontend only renders deck size in `HandArea`
- first-layer playback does not need the client to inspect unrevealed draw-pile contents
- keeping full deck order server-only reduces accidental frontend coupling to implementation details

Design rule:
- backend stores the full authoritative `deck: Card[]`
- emitted `gameState` exposes only `remainingCount` in first version

### `discard`
Purpose:
- expose discard pile state in the smallest frontend-useful shape

First version:
```ts
interface PveDiscardState {
  count: number;
}
```

Why this is the right first cut:
- current frontend does not render discard pile contents
- first-layer combat does not need discard pile inspection for presentation
- backend still needs the full authoritative discard pile internally for draw and discard rules

Design rule:
- backend stores the full authoritative `discardPile: Card[]`
- emitted `gameState` exposes only `count` in first version

### `bot`
Purpose:
- store the authoritative enemy combat state

First version:
```ts
interface PveBotState {
  health: number;
  maxHealth: number;
}
```

Why this is enough for now:
- first-layer combat currently only needs boss HP truth
- current frontend `Battlefield` already depends on `bossHp` and `bossMaxHp`
- bot hand and richer intent systems can wait until the later `GameLogic_backend.md` phases

## Why `hand` Is Full But `deck` / `discard` Are Summarized
The first-version split should be:
- `player.hand`: full `Card[]`
- `deck`: summarized
- `discard`: summarized

This is intentional.

### `player.hand` must be a full card array
The frontend already needs card-level detail to render:
- color
- rank / display rank
- image
- selection state

Because the backend owns hand truth, the emitted `hand` must contain enough data for the frontend to render actual hand cards without reconstructing them from local card tables.

### `deck` should not expose full `Card[]` yet
The current first-layer frontend only needs the deck count.

Exposing the full draw pile to the client now would:
- add unused payload
- increase coupling to deck implementation details
- blur the boundary between hidden server state and visible client state

### `discard` should not expose full `Card[]` yet
The current frontend does not have a discard pile viewer or replay UI that needs discard contents.

So first version should keep discard internals backend-only while exposing only `count`.

## First-Version Card Shape For Emitted Hand State
The emitted `player.hand` should use the backend card model, not the current legacy frontend card table shape.

Recommended emitted shape:
```ts
interface Card {
  id: string;
  element: 'WATER' | 'FIRE' | 'GRASS';
  rank: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
  displayRank: string;
  chipValue: number;
}
```

Implication:
- the frontend hand UI will eventually need an adapter from backend `element/rank` data
  to the current display conventions such as color theme and image asset lookup
- first-layer backend protocol should not mirror the legacy `src/data/cards.js` shape just to avoid that adapter
- backend truth should stay aligned with `backend/src/types/card.ts`

### `battle`
Purpose:
- store action-resolution context that is neither generic room metadata nor persistent hand state

First version:
```ts
interface PveBattleState {
  round: number;
  lastPlayedCards: string[];
  lastHandEvaluation: {
    handType: string;
    baseAttack: number;
    bonusAttack: number;
    multiplier: number;
    totalScore: number;
  } | null;
}
```

Why each field exists:
- `round`
  - needed for `ROUND_ADVANCED`
  - aligns with current frontend round display
- `lastPlayedCards`
  - stores the exact cards used for the latest play resolution
  - useful for UI playback context and debugging
- `lastHandEvaluation`
  - preserves the backend’s latest hand scoring result
  - lets the frontend stop re-deriving this logic locally

### `phase`
Purpose:
- represent the backend PvE phase currently active for this room

Notes:
- first implementation can keep using the existing PvE skeleton phase enum temporarily
- long-term target should still move toward the `GameLogic_backend.md` round-machine phases
- `resolution[]` does not replace `phase`; it only describes the ordered events within one action resolution

### `lastError`
Purpose:
- expose validation or action rejection errors in a stable, user-facing-safe shape

First version:
```ts
interface ErrorState {
  code: string;
  message: string;
}
```

Notes:
- message text must remain English to match project rules

### `gameOver`
Purpose:
- expose terminal combat result as state, separate from transient `resolution[]`

First version:
```ts
interface GameOverState {
  winner: 'player' | 'bot';
  reason: 'BOT_DIED' | 'PLAYER_DIED';
}
```

Notes:
- this duplicates the final semantic outcome carried by the `GAME_OVER` resolution event on purpose
- `resolution[]` is for playback order
- `gameOver` is for persistent truth in the current snapshot

### `resolution`
Purpose:
- carry the most recent action’s ordered playback events

First version:
```ts
resolution: ResolutionEvent[] | null;
```

Lifecycle:
- overwritten on each new resolved action
- `null` when no current action playback data is needed
- not treated as a permanent combat history

## Minimal Example Snapshot
```json
{
  "room": { "roomId": "123456" },
  "player": {
    "userId": "u1",
    "socketId": "sock-1",
    "health": 15,
    "maxHealth": 20,
    "hand": [
      { "id": "FIRE_7", "element": "FIRE", "rank": 7, "displayRank": "7", "chipValue": 7 }
    ],
    "selectedCardIds": [],
    "skillCharges": 2,
    "shield": { "active": false, "onCooldown": true }
  },
  "deck": {
    "remainingCount": 29
  },
  "discard": {
    "count": 3
  },
  "bot": {
    "health": 234,
    "maxHealth": 300
  },
  "battle": {
    "round": 2,
    "lastPlayedCards": ["FIRE_7", "FIRE_8", "FIRE_9"],
    "lastHandEvaluation": {
      "handType": "STRAIGHT",
      "baseAttack": 24,
      "bonusAttack": 20,
      "multiplier": 1.5,
      "totalScore": 66
    }
  },
  "phase": "RESOLVE",
  "lastError": null,
  "gameOver": null,
  "resolution": [
    { "type": "PLAYER_ATTACK_STARTED" },
    {
      "type": "HAND_EVALUATED",
      "selectedCardIds": ["FIRE_7", "FIRE_8", "FIRE_9"],
      "handType": "STRAIGHT",
      "baseAttack": 24,
      "bonusAttack": 20,
      "multiplier": 1.5,
      "totalScore": 66
    }
  ]
}
```

## Fields Explicitly Deferred
The following are intentionally not part of the required first-version schema:
- floor / layer progression fields
- boss respawn / next-floor state
- upgrade options
- persistent replay history
- long-lived combat log history
- rich boss intent / telegraph state
- emitted full draw pile contents
- emitted full discard pile contents

These can be added later when the implementation moves beyond first-layer combat and closer to the full `GameLogic_backend.md` target.

## Frontend Card Adapter Strategy
Because the backend should emit the canonical card model from `backend/src/types/card.ts`, the frontend needs a thin presentation adapter instead of forcing the backend protocol to mirror legacy UI card fields.

### Principle
Use two distinct card shapes:
- backend card shape for truth
- frontend UI card shape for rendering

The backend should continue emitting canonical cards:
```ts
interface BackendCard {
  id: string;
  element: 'WATER' | 'FIRE' | 'GRASS';
  rank: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
  displayRank: string;
  chipValue: number;
}
```

The frontend can adapt that into a UI-focused shape:
```ts
interface UICard {
  id: string;
  color: 'red' | 'blue' | 'green';
  cost: number;
  displayRank: string;
  image: string;
  name: string;
}
```

### Why An Adapter Is Required
Current UI components such as `HandCard` and related gameplay views still depend on legacy presentation-oriented fields:
- `color`
- `cost`
- `image`
- `name`

The canonical backend card model instead expresses domain truth as:
- `element`
- `rank`
- `displayRank`
- `chipValue`

The adapter keeps those responsibilities separate:
- backend remains aligned with game rules
- frontend remains free to render cards in the existing visual system

### Color Mapping Rule
First-version fixed mapping:
```ts
FIRE  -> red
WATER -> blue
GRASS -> green
```

This matches the current frontend themes and card asset grouping.

### Asset Mapping Rule
Do not generate image paths heuristically.

Reason:
- current frontend card assets use mixed file extensions such as `.png` and `.jpg`
- deriving asset paths from `id` alone would be brittle

Instead, use an explicit presentation registry keyed by backend `Card.id`.

Example direction:
```ts
const CARD_PRESENTATION_BY_ID = {
  FIRE_1:  { color: 'red',   image: '/cards/card_01.png', name: 'Fire A' },
  FIRE_2:  { color: 'red',   image: '/cards/card_02.png', name: 'Fire 2' },
  WATER_1: { color: 'blue',  image: '/cards/card_14.jpg', name: 'Water A' },
  GRASS_1: { color: 'green', image: '/cards/card_27.png', name: 'Grass A' },
};
```

### Recommended Frontend Adapter Functions
Suggested adapter layer:
```ts
function toUICard(card: BackendCard): UICard
function toUICards(cards: BackendCard[]): UICard[]
```

Recommended conversion behavior:
- `id` -> keep backend id as-is
- `element` -> map to UI `color`
- `rank` -> map to UI `cost`
- `displayRank` -> keep as-is
- `image` / `name` -> load from presentation registry

### Recommended Frontend File Responsibilities
Suggested structure:
- `frontend/src/lib/cardPresentation.ts`
  - owns static presentation registry by backend `Card.id`
- `frontend/src/lib/cardAdapters.ts`
  - owns `toUICard()` and `toUICards()`

This keeps presentation assets separate from transformation logic.

### Compatibility Strategy
First version should prefer minimal UI churn.

That means:
- socket/store layers can carry backend card truth
- gameplay UI components can continue consuming `UICard`
- conversion happens at the page/store boundary before rendering

This avoids forcing an immediate rewrite of all existing card-rendering components.

### Non-Goal
Do not redesign the frontend card component API in this protocol step.

The first priority is:
- stable backend truth
- stable adapter boundary
- minimum-risk compatibility with current `HandCard`-style rendering

## Backend State Transition Responsibility Table
This section defines what the backend PvE state machine should read, mutate, and emit for the first set of frontend-driven actions.

The purpose is not to prescribe final code structure yet. The purpose is to lock down state ownership and mutation responsibility so implementation does not drift.

## Shared Transition Rules
These rules apply to all first-version PvE action handlers:

- backend is the only authority allowed to mutate:
  - `player.hand`
  - `player.selectedCardIds`
  - `player.skillCharges`
  - `player.shield`
  - `player.health`
  - `deck`
  - `discard`
  - `bot.health`
  - `battle.round`
  - `battle.lastPlayedCards`
  - `battle.lastHandEvaluation`
  - `gameOver`
  - `resolution`
- every accepted action should emit one fresh `gameState`
- every rejected action should:
  - leave gameplay truth unchanged
  - set a stable English `lastError`
  - emit a fresh `gameState`
- `resolution` is only for action playback results
  - non-resolution actions may set it to `null`
  - `play_hand` is the primary action expected to populate it

## `PVE.SELECT_CARDS`
### Purpose
Synchronize the authoritative selected card set with the latest full selection from the frontend.

### Reads
- `player.hand`
- incoming `cardIds`
- current phase if selection should be phase-limited

### Validations
- every incoming `cardId` must exist in `player.hand`
- selection size must respect current gameplay cap
  - current frontend cap is 5 cards
- duplicate ids must be rejected or normalized before state update

### Writes
- `player.selectedCardIds`
- `lastError`
- `resolution = null`

### Must Not Write
- `player.hand`
- `deck`
- `discard`
- `bot.health`
- `player.health`
- `battle.round`

### Emitted Result
One updated `gameState` reflecting the new selection truth.

### First-Version UI Intent
This action exists to make the backend selection state authoritative before:
- `play_hand`
- `discard_cards`

## `PVE.PLAY_HAND`
### Purpose
Resolve one full player attack cycle using the backend-owned selected cards.

### Reads
- `player.hand`
- `player.selectedCardIds`
- `player.health`
- `player.shield`
- `player.skillCharges` only if future play rules depend on charges
- `bot.health`
- `battle.round`
- backend scoring / hand evaluation utilities
- backend deck / discard state because played cards must leave hand and be replenished

### Validations
- at least one selected card must exist
- all selected ids must still be present in `player.hand`
- action must be legal in the current phase

### Core Responsibilities
`PVE.PLAY_HAND` is responsible for all of the following in first version:

1. evaluate the selected cards
2. compute the resulting attack score
3. apply damage to the bot
4. determine whether the bot dies immediately
5. if bot survives, resolve boss counterattack
6. if shield is active:
   - prevent player HP loss
   - consume or break shield as needed
7. if shield is not active:
   - apply player damage
8. determine whether player dies
9. if neither side dies:
   - advance round
10. remove played cards from hand
11. move played cards into discard
12. draw replacement cards from deck
13. clear `player.selectedCardIds`
14. write `battle.lastPlayedCards`
15. write `battle.lastHandEvaluation`
16. overwrite `resolution[]` with the current action’s ordered event list

### Writes
- `bot.health`
- `player.health`
- `player.hand`
- internal backend `deck`
- internal backend `discardPile`
- emitted `deck.remainingCount`
- emitted `discard.count`
- `player.selectedCardIds = []`
- `player.shield`
- `battle.round`
- `battle.lastPlayedCards`
- `battle.lastHandEvaluation`
- `gameOver`
- `resolution`
- `lastError`

### Resolution Contract
For first-layer combat, `PVE.PLAY_HAND` is the action that should produce:
- `PLAYER_ATTACK_STARTED`
- `HAND_EVALUATED`
- `BOT_DAMAGED`
- optional `BOSS_COUNTER_STARTED`
- optional `PLAYER_DAMAGED`
- optional `SHIELD_BLOCKED`
- optional `SHIELD_BROKEN`
- optional `BOT_DEFEATED`
- optional `PLAYER_DEFEATED`
- optional `GAME_OVER`
- optional `ROUND_ADVANCED`
- optional `ROUND_RESOLVED`

### First-Version Non-Goals
`PVE.PLAY_HAND` does not need to handle yet:
- next-floor boss spawn
- floor advancement
- long-lived replay timeline persistence
- advanced boss telegraph systems

## `PVE.DISCARD_CARDS`
### Purpose
Resolve a discard-and-replenish action using the backend-owned selected cards.

### Reads
- `player.hand`
- `player.selectedCardIds`
- internal backend `deck`
- internal backend `discardPile`
- any discard limit state needed by first version

### Validations
- at least one selected card must exist
- all selected ids must still be in hand
- discard must be legal in current phase
- discard count must not exceed remaining discard allowance

### Writes
- `player.hand`
- internal backend `deck`
- internal backend `discardPile`
- emitted `deck.remainingCount`
- emitted `discard.count`
- `player.selectedCardIds = []`
- `lastError`
- `resolution = null`

### Must Not Write
- `bot.health`
- `player.health`
- `battle.round`
- `battle.lastHandEvaluation`
- `gameOver`

### First-Version UI Intent
This action should support the current “弃牌补充” behavior without producing combat playback events.

## `PVE.SKILL_CHANGE_COLOR`
### Purpose
Apply the color-change skill to one backend-owned hand card.

### Reads
- `player.hand`
- `player.skillCharges`
- current phase
- incoming `cardId`
- incoming `newColor`
- backend skill replacement logic

### Validations
- the target card must exist in hand
- skill charges must remain
- action must be legal in current phase
- target replacement must be resolvable according to backend skill rules

### Writes
- `player.hand`
- `player.skillCharges`
- `lastError`
- `resolution = null`

### Must Not Write
- `bot.health`
- `player.health`
- `battle.round`
- `gameOver`

### Selection Rule
If the transformed card was selected before mutation, selection should remain attached to the new resulting card id in first version.

This avoids the frontend losing the player’s selection intent after a skill replacement.

## `PVE.SKILL_CHANGE_COST`
### Purpose
Apply the rank-change skill to one backend-owned hand card.

### Reads
- `player.hand`
- `player.skillCharges`
- current phase
- incoming `cardId`
- incoming `newCost`
- backend skill replacement logic

### Validations
- the target card must exist in hand
- skill charges must remain
- action must be legal in current phase
- target replacement must be valid under backend rules

### Writes
- `player.hand`
- `player.skillCharges`
- `lastError`
- `resolution = null`

### Must Not Write
- `bot.health`
- `player.health`
- `battle.round`
- `gameOver`

### Selection Rule
If the transformed card was selected before mutation, selection should remain attached to the new resulting card id in first version.

## `PVE.SKILL_ACTIVATE_SHIELD`
### Purpose
Activate shield before a later boss counterattack.

### Reads
- `player.skillCharges`
- `player.shield`
- current phase

### Validations
- skill charges must remain
- shield must not already be active
- shield must not be on cooldown
- action must be legal in current phase

### Writes
- `player.skillCharges`
- `player.shield.active = true`
- `lastError`
- `resolution = null`

### Must Not Write
- `player.hand`
- `bot.health`
- `player.health`
- `battle.round`
- `gameOver`

## Recommended First-Version Implementation Order
To reduce integration risk, implement backend action handling in this order:

1. `PVE.SELECT_CARDS`
   - establishes backend-owned selection truth
2. `PVE.DISCARD_CARDS`
   - proves backend-owned hand/deck/discard mutation without combat resolution
3. `PVE.SKILL_ACTIVATE_SHIELD`
   - adds the simplest stateful skill branch
4. `PVE.SKILL_CHANGE_COLOR`
5. `PVE.SKILL_CHANGE_COST`
6. `PVE.PLAY_HAND`
   - only after selection, hand mutation, and basic skill state are already backend-owned

This order matches the agreed architecture:
- frontend reports intent
- backend owns gameplay truth
- `play_hand` becomes the final authority for single-turn combat resolution
