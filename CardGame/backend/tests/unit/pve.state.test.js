import test from "node:test";
import assert from "node:assert/strict";

import {
  ALL_PHASES,
  PHASE,
  createInitialPveState,
  createPveMachine,
} from "../../src/logic/pve/index.js";

test("PHASE exports all iteration-1 phases", () => {
  const required = [
    "WAITING",
    "SKILL_SELECT",
    "DEALING",
    "SKILL_WINDOW_A",
    "PRE_FLOP_BETTING",
    "FLOP",
    "SKILL_WINDOW_B",
    "FLOP_BETTING",
    "TURN",
    "SKILL_WINDOW_C",
    "TURN_BETTING",
    "RIVER",
    "SKILL_WINDOW_D",
    "RIVER_BETTING",
    "SHOWDOWN",
    "GAME_OVER",
  ];

  for (const k of required) {
    assert.equal(PHASE[k], k);
  }
  assert.deepEqual(ALL_PHASES, required);
});

test("createInitialPveState returns required top-level keys", () => {
  const s = createInitialPveState();
  assert.ok(s);
  assert.ok(s.room);
  assert.ok(s.player);
  assert.ok(s.bot);
  assert.ok(s.phase);
  assert.equal(s.lastError, null);
  assert.equal(s.gameOver, null);
});

test("createInitialPveState room fields are present for bootstrap", () => {
  const s = createInitialPveState();
  assert.equal(typeof s.room.pot, "number");
  assert.equal(typeof s.room.currentBet, "number");
  assert.equal(typeof s.room.dealerSide, "string");
  assert.equal(typeof s.room.activeSide, "string");
});

test("createInitialPveState player/bot include minimum poker fields", () => {
  const s = createInitialPveState();
  for (const side of ["player", "bot"]) {
    assert.equal(typeof s[side].health, "number");
    assert.ok(Array.isArray(s[side].holeCards));
  }
});

test("createPveMachine builds without throwing and starts in WAITING", () => {
  const m = createPveMachine();
  assert.ok(m);
  assert.equal(m.config.initial, PHASE.WAITING);
});
