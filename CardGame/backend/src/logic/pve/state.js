import { PHASE } from "./phases.js";
import { createBotState, createPlayerState, createRoomState } from "./models/index.js";

export function createInitialPveState({
  roomId = null,
  dealerSide = "player",
  activeSide = dealerSide,
  userId = null,
  socketId = null,
} = {}) {
  // Keep the shape minimal but explicit; later tasks can extend it without breaking
  // early tests and imports.
  return {
    room: createRoomState({ roomId, dealerSide, activeSide }),
    player: createPlayerState({ userId, socketId }),
    bot: createBotState(),
    phase: PHASE.WAITING,
    lastError: null,
    gameOver: null,
  };
}
