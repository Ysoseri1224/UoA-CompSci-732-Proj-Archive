import test from "node:test";
import assert from "node:assert/strict";

import {
  createRoomActor,
  getRoomIdForSocket,
  getRoomSnapshot,
  sendRoomEvent,
  stopRoomForSocket,
} from "../../src/logic/pve/runtime.js";

test("runtime creates actor, routes events, and cleans up by socket id", () => {
  const events = [];

  const { actor, snapshot } = createRoomActor({
    roomId: "123456",
    socketId: "sock-1",
    onSnapshot: (snap) => events.push(snap.value),
  });

  assert.ok(actor);
  assert.ok(snapshot);
  assert.equal(getRoomIdForSocket("sock-1"), "123456");
  assert.ok(getRoomSnapshot("123456"));

  sendRoomEvent("123456", { type: "PVE.START" });
  assert.ok(events.length >= 1);

  assert.equal(stopRoomForSocket("sock-1"), true);
  assert.equal(getRoomIdForSocket("sock-1"), null);
  assert.equal(getRoomSnapshot("123456"), null);
});

