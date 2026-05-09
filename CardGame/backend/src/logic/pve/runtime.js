import { createActor } from "xstate";

import { loadGame, saveGame } from '../../lib/savepoint.js';
import { createInitialPveState } from "./state.js";
import { createPveMachine } from "./machine.js";

const actorsByRoomId = new Map();
const roomIdBySocketId = new Map();

function safeRoomId(roomId) {
  return typeof roomId === "string" && roomId.length > 0;
}

export function getRoomIdForSocket(socketId) {
  return roomIdBySocketId.get(socketId) ?? null;
}

export function createRoomActor({
  roomId,
  userId = null,
  socketId = null,
  onSnapshot = null,
} = {}) {
  if (!safeRoomId(roomId)) {
    throw new Error("roomId is required");
  }
  if (actorsByRoomId.has(roomId)) {
    throw new Error("room already exists");
  }

  const initialState = createInitialPveState({ roomId, userId, socketId });
  const machine = createPveMachine({ initialState });
  const actor = createActor(machine);

  const sub =
    typeof onSnapshot === "function"
      ? actor.subscribe((snapshot) => {
          try {
            onSnapshot(snapshot);
          } catch {
            // ignore broadcaster failures; runtime should not crash the process
          }
        })
      : null;

  actor.start();

  actorsByRoomId.set(roomId, { actor, sub });
  if (socketId) roomIdBySocketId.set(socketId, roomId);

  return { actor, snapshot: actor.getSnapshot() };
}

export function getRoomSnapshot(roomId) {
  const entry = actorsByRoomId.get(roomId);
  if (!entry) return null;
  return entry.actor.getSnapshot();
}

export function sendRoomEvent(roomId, event) {
  const entry = actorsByRoomId.get(roomId);
  if (!entry) return null;
  entry.actor.send(event);
  return entry.actor.getSnapshot();
}

export function stopRoom(roomId) {
  const entry = actorsByRoomId.get(roomId);
  if (!entry) return false;

  try {
    entry.sub?.unsubscribe?.();
  } catch {
    // ignore
  }
  try {
    entry.actor.stop();
  } catch {
    // ignore
  }

  actorsByRoomId.delete(roomId);
  for (const [socketId, rid] of roomIdBySocketId.entries()) {
    if (rid === roomId) roomIdBySocketId.delete(socketId);
  }
  return true;
}

export function stopRoomForSocket(socketId) {
  const roomId = roomIdBySocketId.get(socketId);
  if (!roomId) return false;
  return stopRoom(roomId);
}

