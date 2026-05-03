import { DEFAULT_BOT_HEALTH } from "../constants.js";

export function createBotState({ health = DEFAULT_BOT_HEALTH } = {}) {
  return {
    health,
    holeCards: [],
  };
}
