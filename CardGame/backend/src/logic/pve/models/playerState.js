import { DEFAULT_PLAYER_HEALTH } from "../constants.js";

export function createPlayerState({
  userId = null,
  socketId = null,
  health = DEFAULT_PLAYER_HEALTH,
} = {}) {
  return {
    userId,
    socketId,
    health,
    holeCards: [],
  };
}
