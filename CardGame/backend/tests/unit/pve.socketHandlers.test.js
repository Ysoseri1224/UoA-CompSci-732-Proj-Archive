import test from "node:test";
import assert from "node:assert/strict";

import { registerSocketHandlers } from "../../src/utils/socketHandlers.js";
import { getRoomSnapshot } from "../../src/logic/pve/runtime.js";

function createFakeSocket(id = "sock-1") {
  const handlers = new Map();
  const emitted = [];

  return {
    id,
    emitted,
    on(event, fn) {
      handlers.set(event, fn);
    },
    emit(event, payload) {
      emitted.push({ event, payload });
    },
    trigger(event, payload) {
      const fn = handlers.get(event);
      if (!fn) throw new Error(`no handler for ${event}`);
      fn(payload);
    },
  };
}

test("socket handler: startPveGame then damageBot to 0 emits gameOver and cleans up runtime", () => {
  const socket = createFakeSocket("sock-1");
  registerSocketHandlers(socket);

  socket.trigger("startPveGame");

  const firstGameState = socket.emitted.find((e) => e.event === "gameState");
  assert.ok(firstGameState);
  const roomId = firstGameState.payload.gameState.room.roomId;
  assert.ok(roomId);
  assert.ok(getRoomSnapshot(roomId));

  socket.trigger("damageBot", { amount: 100 });

  const gameOver = socket.emitted.find((e) => e.event === "gameOver");
  assert.ok(gameOver);
  assert.equal(gameOver.payload.reason, "BOT_DIED");

  // After GAME_OVER, the runtime actor should be stopped and removed.
  assert.equal(getRoomSnapshot(roomId), null);
});

test("socket handler: startPveGame then damagePlayer to 0 emits gameOver and cleans up runtime", () => {
  const socket = createFakeSocket("sock-2");
  registerSocketHandlers(socket);

  socket.trigger("startPveGame");

  const firstGameState = socket.emitted.find((e) => e.event === "gameState");
  assert.ok(firstGameState);
  const roomId = firstGameState.payload.gameState.room.roomId;
  assert.ok(roomId);
  assert.ok(getRoomSnapshot(roomId));

  socket.trigger("damagePlayer", { amount: 10 });

  const gameOver = socket.emitted.find((e) => e.event === "gameOver");
  assert.ok(gameOver);
  assert.equal(gameOver.payload.reason, "PLAYER_DIED");

  assert.equal(getRoomSnapshot(roomId), null);
});
