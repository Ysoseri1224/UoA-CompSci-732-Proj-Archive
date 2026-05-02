// PvE iteration-1 phase list.
// Keep this as a stable contract for tests/events; behavior comes in later tasks.

export const PHASE = Object.freeze({
  WAITING: "WAITING",
  SKILL_SELECT: "SKILL_SELECT",
  DEALING: "DEALING",
  SKILL_WINDOW_A: "SKILL_WINDOW_A",
  PRE_FLOP_BETTING: "PRE_FLOP_BETTING",
  FLOP: "FLOP",
  SKILL_WINDOW_B: "SKILL_WINDOW_B",
  FLOP_BETTING: "FLOP_BETTING",
  TURN: "TURN",
  SKILL_WINDOW_C: "SKILL_WINDOW_C",
  TURN_BETTING: "TURN_BETTING",
  RIVER: "RIVER",
  SKILL_WINDOW_D: "SKILL_WINDOW_D",
  RIVER_BETTING: "RIVER_BETTING",
  SHOWDOWN: "SHOWDOWN",
  GAME_OVER: "GAME_OVER",
});

export const ALL_PHASES = Object.freeze(Object.values(PHASE));

