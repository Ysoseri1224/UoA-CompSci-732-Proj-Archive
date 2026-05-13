# Backend Game Logic - Step-by-Step Implementation Plan

> Goal: complete backend logic, align with frontend actions, pass tests, and keep frontend + backend + database integration working without bugs.

---

## Current Status Overview

| Step | Status |
|---|---|
| Steps 1-4 (types + deck + hand + skills) | Merged, migrated to TS |
| State machine v0.2 (Boss telegraph / intent / buff extensions) | Merged |
| TypeScript migration (types/ + lib/) | Merged |
| Step 5 (state machine) | Pending - replace XState with a custom state machine |
| Steps 6-9 | Pending |

---

## Step 1: Backend Types + Card Primitives

**Goal**: build TypeScript (JSDoc) type definitions and a pure-function utility library for the backend, with no dependencies and unit-testability.

**Files**:
```txt
backend/src/types/
  card.ts        <- Element, Rank, HandType, CardId, Card, createCard, rankToDisplay, rankToChipValue
  state.ts       <- GameState, BattleState, RoundState, RoundPhase
  buff.ts        <- Buff / ElementDamageBuff / ElementDrawBuff / HighRankDrawBuff / Upgrade
  events.ts      <- all Action/Event types (SKILL_CHANGE_COLOR, SHUFFLE_SELECT, PLAY_CONFIRM, ...)
```

**Acceptance Criteria**:
- [ ] `tests/unit/card.types.test.ts` passes
  - CardId format `{ELEMENT}_{rank}` is correct
  - rankToDisplay(1) = 'A', (11) = 'J', (12) = 'Q', (13) = 'K'
  - rankToChipValue(rank) = rank (A=1, 2-10=face value, J=11, Q=12, K=13)
  - createCard generates a complete Card object

---

## Step 2: Deck Operations

**Goal**: implement pure-function deck operations with no external state dependencies.

**Files**:
```txt
backend/src/lib/
  deck.ts       <- createFullDeck, shuffle, initDeckState, drawCards, playCards, shuffleHand
```

**Key Rules**:
- 39 cards total (3 elements x 13 ranks), no duplicates
- Fisher-Yates shuffle
- If drawing runs out of cards, the discard pile is shuffled back in first
- Shuffle discards are staged first and only returned to the discard pile after drawing completes, to avoid redrawing cards that were just discarded

**Acceptance Criteria**:
- [ ] `tests/unit/deck.test.ts` passes
  - createFullDeck generates 39 unique cards
  - initDeckState creates 7 cards in hand + 32 cards in deck
  - drawCards refills correctly and recycles the discard pile when the deck is short
  - playCards moves played cards to the discard pile and refills to 7 cards
  - shuffleHand does not redraw cards that were just discarded
  - 1000 random operation runs finish without errors

---

## Step 3: Hand Recognition + Damage Calculation

**Goal**: implement 9 poker hand types and the damage formula in a new standalone module (keep the old `evaluator.js` / `scoring.js` untouched).

**Files**:
```txt
backend/src/lib/
  hand.ts       <- HAND_SCORES, identifyHand, detectHandType, checkStraight, calculateDamage
```

**Hand Priority**: Straight Flush > Four of a Kind > Full House > Flush > Straight > Three of a Kind > Two Pair > Pair > High Card

**Damage Formula**: `(base chips + Σ played card chip values) x multiplier`, rounded down

**Acceptance Criteria**:
- [ ] `tests/unit/hand.test.ts` passes
  - At least 2 cases per hand type (positive + boundary)
  - Straight flush is recognized correctly
  - Off-suit selections degrade to High Card
  - Damage numbers are correct
  - Cross-check against the example in `card-abstractions.md` (three 7s, 9, 3, 7, 7 = 189)

---

## Step 4: Skill Logic

**Goal**: implement the pure-function logic and guard conditions for the 3 skills (change color / change rank / shield).

**Files**:
```txt
backend/src/lib/
  skills.ts     <- skillChangeColor, skillChangeCost, skillShield, canUseChangeColor, canUseChangeCost, canUseShield
```

**Rules aligned with game-rules-prompt.md**:
- Change color: prioritize same rank + target color, otherwise the closest rank in the target color
- Change rank: same color + target rank
- Replacement cards must not already be in the current hand
- Shield: after breaking it enters cooldown, persists across turns, and is void if the boss dies

**Acceptance Criteria**:
- [ ] `tests/unit/skills.test.ts` passes
  - Change color: same-rank replacement succeeds; if not found, falls back to nearest rank
  - Change rank: same-color target-rank replacement succeeds
  - Replacement never creates duplicate cards
  - If no replacement exists, state stays unchanged
  - Shield state transitions: inactive -> active -> broken -> cooldown

---

## Step 5: Custom State Machine

**Goal**: use a lightweight custom state machine (`transition(state, event)`) to implement the RoundState turn flow and replace the backend's current XState PvE state machine. The event format stays XState-compatible (`{ type, ... }`) so it can be swapped later.

**Files**:
```txt
backend/src/pve/
  roundMachine.ts  <- RoundPhase state machine: DRAW -> SKILL/SHUFFLE -> PLAY -> RESOLVE -> BOSS_ATTACK -> ROUND_END
  guards.ts        <- guard conditions (canUseChangeColor, canShuffle, canPlay, ...)
  actions.ts       <- side effects (draw_cards, resolve_damage, boss_attack, round_end_reset, ...)
  index.ts         <- update to use the new state machine
```

**State Transitions** (aligned with state-machine.md §4.2):
```txt
DRAW -> BOSS_TELEGRAPH (determine intent, show UI) -> SKILL/SHUFFLE (player actions) -> PLAY -> RESOLVE
  |- Boss HP <= 0 -> WIN
  `- Boss HP > 0 -> BOSS_ATTACK
       |- Player HP <= 0 -> LOSE
       `- Player HP > 0 -> ROUND_END -> back to DRAW
```

**Acceptance Criteria**:
- [ ] `tests/unit/pve.roundMachine.test.ts` passes
  - Full turn flow: DRAW -> SKILL -> PLAY -> RESOLVE -> BOSS_ATTACK -> ROUND_END -> DRAW
  - SKILL/SHUFFLE phases can alternate
  - Boss HP <= 0 jumps to WIN
  - Shield blocks boss damage -> breaks -> enters cooldown next turn
  - Shield is void when the boss dies
  - round_end resets skills.used and shuffle.remaining

---

## Step 6: GameState + BattleState Store (Zustand)

**Goal**: implement game state management with clear separation between GameState / BattleState / RoundState.

**Files**:
```txt
frontend/src/store/
  gameStore.ts    <- GameState slice (runId, layer, player, deck, hand, phase)
  battleStore.ts  <- BattleState slice (boss, round, roundState, result)
  roundStore.ts   <- RoundState slice + event handling
```

**Backend Extensions**:
```txt
backend/src/lib/
  boss.ts         <- createBoss, Boss scaling formula (to be implemented)
  savepoint.ts    <- createSavepoint, loadSavepoint, serialization/deserialization (to be implemented)
```
Note: `FIRST_LAYER_UPGRADES` / `generateUpgradePool` are already implemented in `types/buff.ts`.

**Acceptance Criteria**:
- [ ] `tests/unit/boss.test.ts` - boss creation and scaling by layer
- [ ] `tests/unit/upgrades.test.ts` - first layer 3-choice reward, later layers generate candidate pools
- [ ] `tests/unit/savepoint.test.ts` - SavePoint write/read, serialization/deserialization
- [ ] Frontend store state changes are visible through DevTools
- [ ] Zustand's three store layers are clearly separated and do not leak into each other

---

## Step 7: Socket.io Multiplayer Layer

**Goal**: connect backend state machine and frontend UI through Socket.io to achieve the full PvE flow.

**Files**:
```txt
backend/src/
  socket.ts         <- update: register PvE game event handlers
  utils/
    pveHandlers.ts  <- rewrite: connect the new state machine, startPveGame / selectSkills / playerAction / disconnect
backend/src/pve/
  runtime.ts        <- update: connect the new state machine, actor lifecycle management
```

**Event Flow**:
```txt
Client                           Server
  |                                |
  |- startPveGame --------------->| create actor, init Deck + Boss
  |- phase:DRAW ------------------| auto draw complete
  |- phase:SKILL/SHUFFLE ---------| wait for player action
  |- skill:changeColor(cardId) -->| execute skill, return new state
  |- shuffle:select(cardIds) ---->| execute shuffle
  |- play:confirm(cardIds) ------>| play cards, resolve damage
  |- phase:RESOLVE ---------------| show damage result
  |- phase:BOSS_ATTACK ---------->| boss attacks
  |- phase:ROUND_END ------------>| enter next turn
  |  ...                           |
  |- phase:WIN/LOSE --------------| victory / defeat
```

**Acceptance Criteria**:
- [ ] Socket.io connect/disconnect works correctly
- [ ] A full PvE run completes without stalling
- [ ] Frontend UI responds to state changes pushed by the state machine
- [ ] `tests/unit/pve.socketHandlers.test.ts` is updated and passes

---

## Step 8: Database Persistence + Route Completion

**Goal**: connect the Match / MatchReplay models to game results and complete the stubbed routes.

**Files**:
```txt
backend/src/routes/
  matches.ts      <- implement GET /api/matches, GET /api/matches/:matchId, GET /api/matches/:matchId/replay
  achievements.ts <- implement GET /api/achievements
```

**Database Write Timing**:
- Write a Match record when each run ends
- Write MatchReplay.hand after every turn
- Check achievements on clear / defeat

**Acceptance Criteria**:
- [ ] `tests/api/matches.test.ts` - Match CRUD endpoints work
- [ ] `tests/api/achievements.test.ts` - achievement endpoints work
- [ ] After a game ends, the database contains a complete Match + MatchReplay record
- [ ] Reading MatchReplay can replay a full run

---

## Step 9: Frontend/Backend Integration + Integration Tests

**Goal**: complete the end-to-end chain across frontend, backend, MongoDB, and Redis without bugs.

**Contents**:
- Full-game integration test (register -> login -> start PvE -> multiple turns -> victory/defeat -> view replay)
- Boundary condition tests (disconnect/reconnect, multiple windows acting at once, extreme deck states)
- Verify synchronization between the frontend Zustand store and backend state

**Acceptance Criteria**:
- [ ] Docker Compose starts everything with one command, and frontend + backend + MongoDB + Redis all work
- [ ] A full game completes without console errors
- [ ] `tests/integration/fullGame.test.ts` passes
- [ ] The manual testing checklist fully passes

---

## Dependencies

```txt
Step 1 (types)
  -> Step 2 (deck)
       -> Step 3 (hand + damage)
            |- Step 4 (skills)
            |    -> Step 5 (state machine)
            |         |- Step 6 (Store + Boss + Upgrade)
            |         |    -> Step 7 (Socket.io multiplayer)
            |         |         -> Step 8 (database + routes)
            |         |              -> Step 9 (integration + integration tests)
            |         `- (parallel) backend part of Step 6
            `- (parallel) backend part of Step 6
```

---

## Final File Organization

```txt
backend/src/
  types/
    card.ts          <- Element, Rank, HandType, CardId, Card
    state.ts         <- GameState, BattleState, RoundState, RoundPhase
    buff.ts          <- Buff, Upgrade
    events.ts        <- Action/Event types
  lib/
    deck.ts          <- createFullDeck, shuffle, initDeckState, drawCards, playCards, shuffleHand
    hand.ts          <- HAND_SCORES, identifyHand, detectHandType, calculateDamage
    skills.ts        <- skillChangeColor, skillChangeCost, shieldStateMachine
    boss.ts          <- createBoss (to be implemented)
    savepoint.ts     <- createSavepoint, loadSavepoint (to be implemented)
  pve/
    roundMachine.ts  <- custom state machine: transition(state, event)
    guards.ts        <- guard conditions
    actions.ts       <- side effects
    runtime.ts       <- actor lifecycle + Socket event routing
    index.ts
  store/             <- Zustand (or keep using XState context)
    gameStore.ts
    battleStore.ts
    roundStore.ts
  routes/
    matches.ts       <- full implementation
    achievements.ts  <- full implementation
  models/            <- already exists (may need field adjustments)

frontend/src/
  store/
    gameStore.ts     <- Zustand GameState slice
    battleStore.ts   <- Zustand BattleState slice
    roundStore.ts    <- Zustand RoundState slice
  hooks/
    useGameLogic.ts  <- refactor: move from local state to Zustand store
```

---

## Testing Strategy

| Layer | Test Type | Command |
|---|---|---|
| types/lib | pure-function unit tests | `node --import tsx --test tests/unit/*.test.ts` |
| custom state machine | state transition tests | `node --import tsx --test` (pure functions, no mock needed) |
| API routes | integration tests | `node --import tsx --test tests/api/*.test.js` (requires MongoDB) |
| DB models | database tests | `docker exec cardgame-backend-1 npx tsx --test tests/db/*.test.js` (run inside container) |
| Socket.io | event-driven tests | socket.io-client + event listeners |
| Full flow | E2E tests | Docker Compose + manual checklist |

All tests should use `node --import tsx` so `.ts` and `.js` files can be mixed.
