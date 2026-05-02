import { PHASE } from "./phases.js";

export const DEFAULT_STACK = 1000;
export const DEFAULT_ENERGY = 8;

export function createInitialPveState({
  roomId = null,
  dealerSide = "player",
  activeSide = dealerSide,
  playerChips = DEFAULT_STACK,
  botChips = DEFAULT_STACK,
} = {}) {
  // Keep the shape minimal but explicit; later tasks can extend it without breaking
  // early tests and imports.
  return {
    room: {
      roomId,
      pot: 0,
      currentBet: 0,
      dealerSide,
      activeSide,
    },
    player: {
      chips: playerChips,
      energy: DEFAULT_ENERGY,
      selectedSkills: [],
      usedSkills: [],
      infoBlocked: false,
    },
    bot: {
      chips: botChips,
      energy: DEFAULT_ENERGY,
      selectedSkills: [],
      usedSkills: [],
      infoBlocked: false,
    },
    phase: PHASE.WAITING,
  };
}

