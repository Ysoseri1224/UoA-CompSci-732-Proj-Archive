// LEGACY: This file is superseded by pveHandlers.ts (custom TS state machine).
// It is no longer registered in socket.ts and has no active callers.
// Retained for git history only. Do not import or use.
import { logger } from "../middleware/logger.js";

import {
  createRoomActor,
  getRoomSnapshot,
  getRoomIdForSocket,
  sendRoomEvent,
  stopRoomForSocket,
} from "../logic/pve/runtime.js";

export function registerSocketHandlers(socket) {
  logger.info({ socketId: socket.id }, "socket connected");

  function emitGameState(snapshot) {
    if (!snapshot) return;
    socket.emit("gameState", {
      gameState: snapshot.context,
      phase: snapshot.value,
    });

    if (snapshot.value === "GAME_OVER") {
      socket.emit("gameOver", snapshot.context.gameOver);
      stopRoomForSocket(socket.id);
    }
  }

  function ensureRoomId() {
    const existing = getRoomIdForSocket(socket.id);
    if (existing) return existing;

    for (let i = 0; i < 10; i += 1) {
      const roomId = String(Math.floor(100000 + Math.random() * 900000));
      if (!getRoomSnapshot(roomId)) return roomId;
    }
    return String(Date.now());
  }

  socket.on("startPveGame", () => {
    try {
      const roomId = ensureRoomId();
      const { snapshot } = createRoomActor({
        roomId,
        socketId: socket.id,
        onSnapshot: emitGameState,
      });
      sendRoomEvent(roomId, { type: "PVE.START" });
      emitGameState(snapshot);
    } catch (err) {
      logger.error({ err, socketId: socket.id }, "failed to start PvE game");
      socket.emit("gameState", {
        gameState: null,
        phase: null,
        error: { code: "START_FAILED", message: "Failed to start PvE game." },
      });
    }
  });

  socket.on("selectSkills", (payload) => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) return;
    emitGameState(sendRoomEvent(roomId, { type: "PVE.SELECT_SKILLS", skills: payload?.skills }));
  });

  socket.on("playerAction", (payload) => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) return;
    emitGameState(
      sendRoomEvent(roomId, {
        type: "PVE.PLAYER_ACTION",
        action: payload?.action,
        amount: payload?.amount,
      })
    );
  });

  socket.on("damagePlayer", (payload) => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) return;
    emitGameState(sendRoomEvent(roomId, { type: "PVE.DAMAGE_PLAYER", amount: payload?.amount }));
  });

  socket.on("damageBot", (payload) => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) return;
    emitGameState(sendRoomEvent(roomId, { type: "PVE.DAMAGE_BOT", amount: payload?.amount }));
  });

  socket.on("disconnect", () => {
    stopRoomForSocket(socket.id);
    logger.info({ socketId: socket.id }, "socket disconnected");
  });
}

