import { createMachine } from "xstate";

import { PHASE } from "./phases.js";
import { createInitialPveState } from "./state.js";

export function createPveMachine({ initialState } = {}) {
  const init = initialState ?? createInitialPveState();

  return createMachine({
    id: "pve",
    initial: init.phase,
    context: init,
    states: {
      [PHASE.WAITING]: {},
      [PHASE.SKILL_SELECT]: {},
      [PHASE.DEALING]: {},
      [PHASE.SKILL_WINDOW_A]: {},
      [PHASE.PRE_FLOP_BETTING]: {},
      [PHASE.FLOP]: {},
      [PHASE.SKILL_WINDOW_B]: {},
      [PHASE.FLOP_BETTING]: {},
      [PHASE.TURN]: {},
      [PHASE.SKILL_WINDOW_C]: {},
      [PHASE.TURN_BETTING]: {},
      [PHASE.RIVER]: {},
      [PHASE.SKILL_WINDOW_D]: {},
      [PHASE.RIVER_BETTING]: {},
      [PHASE.SHOWDOWN]: {},
      [PHASE.GAME_OVER]: {},
    },
  });
}

