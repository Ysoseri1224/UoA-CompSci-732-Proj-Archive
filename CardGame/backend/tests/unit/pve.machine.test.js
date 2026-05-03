import test from "node:test";
import assert from "node:assert/strict";

import { createActor } from "xstate";

import { PHASE, createPveMachine, createInitialPveState } from "../../src/logic/pve/index.js";

test("PVE.START moves WAITING -> SKILL_SELECT and keeps context.phase in sync", () => {
  const machine = createPveMachine({ initialState: createInitialPveState() });
  const actor = createActor(machine).start();

  assert.equal(actor.getSnapshot().value, PHASE.WAITING);
  assert.equal(actor.getSnapshot().context.phase, PHASE.WAITING);

  actor.send({ type: "PVE.START" });

  const snap = actor.getSnapshot();
  assert.equal(snap.value, PHASE.SKILL_SELECT);
  assert.equal(snap.context.phase, PHASE.SKILL_SELECT);
  assert.equal(snap.context.lastError, null);
});

test("PVE.SELECT_SKILLS validates payload and sets stable English error on failure", () => {
  const machine = createPveMachine({ initialState: createInitialPveState() });
  const actor = createActor(machine).start();

  actor.send({ type: "PVE.START" });
  actor.send({ type: "PVE.SELECT_SKILLS", skills: ["only_one"] });

  const snap = actor.getSnapshot();
  assert.equal(snap.value, PHASE.SKILL_SELECT);
  assert.equal(snap.context.phase, PHASE.SKILL_SELECT);
  assert.equal(snap.context.lastError.code, "INVALID_PAYLOAD");
  assert.ok(typeof snap.context.lastError.message === "string");
});

test("PVE.DAMAGE_PLAYER ends game when player health reaches 0", () => {
  const machine = createPveMachine({ initialState: createInitialPveState() });
  const actor = createActor(machine).start();

  actor.send({ type: "PVE.DAMAGE_PLAYER", amount: 10 });

  const snap = actor.getSnapshot();
  assert.equal(snap.value, PHASE.GAME_OVER);
  assert.equal(snap.context.phase, PHASE.GAME_OVER);
  assert.equal(snap.context.player.health, 0);
  assert.equal(snap.context.gameOver.reason, "PLAYER_DIED");
  assert.equal(snap.context.gameOver.winner, "bot");
});

test("PVE.DAMAGE_BOT ends game when bot health reaches 0", () => {
  const machine = createPveMachine({ initialState: createInitialPveState() });
  const actor = createActor(machine).start();

  actor.send({ type: "PVE.DAMAGE_BOT", amount: 100 });

  const snap = actor.getSnapshot();
  assert.equal(snap.value, PHASE.GAME_OVER);
  assert.equal(snap.context.phase, PHASE.GAME_OVER);
  assert.equal(snap.context.bot.health, 0);
  assert.equal(snap.context.gameOver.reason, "BOT_DIED");
  assert.equal(snap.context.gameOver.winner, "player");
});

test("PVE.PLAYER_DIED forces GAME_OVER", () => {
  const machine = createPveMachine({ initialState: createInitialPveState() });
  const actor = createActor(machine).start();

  actor.send({ type: "PVE.PLAYER_DIED" });

  const snap = actor.getSnapshot();
  assert.equal(snap.value, PHASE.GAME_OVER);
  assert.equal(snap.context.gameOver.reason, "PLAYER_DIED");
});

test("PVE.BOT_DIED forces GAME_OVER", () => {
  const machine = createPveMachine({ initialState: createInitialPveState() });
  const actor = createActor(machine).start();

  actor.send({ type: "PVE.BOT_DIED" });

  const snap = actor.getSnapshot();
  assert.equal(snap.value, PHASE.GAME_OVER);
  assert.equal(snap.context.gameOver.reason, "BOT_DIED");
});
