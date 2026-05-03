import { assign, createMachine } from "xstate";

import { PHASE } from "./phases.js";
import { createInitialPveState } from "./state.js";

function clearError() {
  return assign({ lastError: null });
}

function setError(code, message) {
  return assign({ lastError: { code, message } });
}

function syncPhase(phase) {
  return assign({ phase });
}

function isBettingPhase(phase) {
  return (
    phase === PHASE.PRE_FLOP_BETTING ||
    phase === PHASE.FLOP_BETTING ||
    phase === PHASE.TURN_BETTING ||
    phase === PHASE.RIVER_BETTING
  );
}

function isValidSkillsPayload(skills) {
  return Array.isArray(skills) && skills.length === 2 && skills.every((s) => typeof s === "string");
}

export function createPveMachine({ initialState } = {}) {
  const init = initialState ?? createInitialPveState();

  return createMachine({
    id: "pve",
    initial: init.phase,
    context: init,
    on: {
      "PVE.DAMAGE_PLAYER": [
        {
          guard: ({ context, event }) =>
            context.phase !== PHASE.GAME_OVER &&
            Math.max(0, context.player.health - event.amount) === 0,
          target: `.${PHASE.GAME_OVER}`,
          actions: [
            assign(({ context, event }) => ({
              player: { ...context.player, health: Math.max(0, context.player.health - event.amount) },
              lastError: null,
              gameOver: {
                reason: "PLAYER_DIED",
                winner: "bot",
                finalHealth: { player: 0, bot: context.bot.health },
              },
            })),
          ],
        },
        {
          guard: ({ context }) => context.phase !== PHASE.GAME_OVER,
          actions: assign(({ context, event }) => ({
            player: { ...context.player, health: Math.max(0, context.player.health - event.amount) },
            lastError: null,
          })),
        },
      ],

      "PVE.DAMAGE_BOT": [
        {
          guard: ({ context, event }) =>
            context.phase !== PHASE.GAME_OVER && Math.max(0, context.bot.health - event.amount) === 0,
          target: `.${PHASE.GAME_OVER}`,
          actions: [
            assign(({ context, event }) => ({
              bot: { ...context.bot, health: Math.max(0, context.bot.health - event.amount) },
              lastError: null,
              gameOver: {
                reason: "BOT_DIED",
                winner: "player",
                finalHealth: { player: context.player.health, bot: 0 },
              },
            })),
          ],
        },
        {
          guard: ({ context }) => context.phase !== PHASE.GAME_OVER,
          actions: assign(({ context, event }) => ({
            bot: { ...context.bot, health: Math.max(0, context.bot.health - event.amount) },
            lastError: null,
          })),
        },
      ],

      "PVE.PLAYER_DIED": {
        guard: ({ context }) => context.phase !== PHASE.GAME_OVER,
        target: `.${PHASE.GAME_OVER}`,
        actions: assign(({ context }) => ({
          lastError: null,
          gameOver: {
            reason: "PLAYER_DIED",
            winner: "bot",
            finalHealth: { player: context.player.health, bot: context.bot.health },
          },
        })),
      },

      "PVE.BOT_DIED": {
        guard: ({ context }) => context.phase !== PHASE.GAME_OVER,
        target: `.${PHASE.GAME_OVER}`,
        actions: assign(({ context }) => ({
          lastError: null,
          gameOver: {
            reason: "BOT_DIED",
            winner: "player",
            finalHealth: { player: context.player.health, bot: context.bot.health },
          },
        })),
      },
    },
    states: {
      [PHASE.WAITING]: {
        entry: [syncPhase(PHASE.WAITING), clearError()],
        on: {
          "PVE.START": {
            target: PHASE.SKILL_SELECT,
            actions: clearError(),
          },
        },
      },

      [PHASE.SKILL_SELECT]: {
        entry: [syncPhase(PHASE.SKILL_SELECT), clearError()],
        on: {
          "PVE.SELECT_SKILLS": [
            {
              target: PHASE.DEALING,
              guard: ({ event }) => isValidSkillsPayload(event.skills),
              // Skill system fields are intentionally not modeled yet; accept the
              // payload for flow control only.
              actions: [clearError()],
            },
            {
              actions: setError(
                "INVALID_PAYLOAD",
                "Invalid skills payload. Expected an array of exactly two skill names."
              ),
            },
          ],
        },
      },

      [PHASE.DEALING]: {
        entry: [syncPhase(PHASE.DEALING), clearError()],
        on: {
          // Placeholder: next tasks will flesh out dealing + window A.
          "PVE.NEXT": { target: PHASE.SKILL_WINDOW_A, actions: clearError() },
        },
      },

      [PHASE.SKILL_WINDOW_A]: {
        entry: [syncPhase(PHASE.SKILL_WINDOW_A), clearError()],
        on: {
          "PVE.NEXT": { target: PHASE.PRE_FLOP_BETTING, actions: clearError() },
        },
      },

      [PHASE.PRE_FLOP_BETTING]: {
        entry: [syncPhase(PHASE.PRE_FLOP_BETTING), clearError()],
        on: {
          "PVE.PLAYER_ACTION": [
            {
              guard: () => isBettingPhase(PHASE.PRE_FLOP_BETTING),
              actions: clearError(),
            },
          ],
          "PVE.TIMEOUT": { actions: clearError() },
        },
      },

      [PHASE.FLOP]: { entry: [syncPhase(PHASE.FLOP), clearError()] },
      [PHASE.SKILL_WINDOW_B]: { entry: [syncPhase(PHASE.SKILL_WINDOW_B), clearError()] },
      [PHASE.FLOP_BETTING]: { entry: [syncPhase(PHASE.FLOP_BETTING), clearError()] },
      [PHASE.TURN]: { entry: [syncPhase(PHASE.TURN), clearError()] },
      [PHASE.SKILL_WINDOW_C]: { entry: [syncPhase(PHASE.SKILL_WINDOW_C), clearError()] },
      [PHASE.TURN_BETTING]: { entry: [syncPhase(PHASE.TURN_BETTING), clearError()] },
      [PHASE.RIVER]: { entry: [syncPhase(PHASE.RIVER), clearError()] },
      [PHASE.SKILL_WINDOW_D]: { entry: [syncPhase(PHASE.SKILL_WINDOW_D), clearError()] },
      [PHASE.RIVER_BETTING]: { entry: [syncPhase(PHASE.RIVER_BETTING), clearError()] },
      [PHASE.SHOWDOWN]: { entry: [syncPhase(PHASE.SHOWDOWN), clearError()] },
      [PHASE.GAME_OVER]: { entry: [syncPhase(PHASE.GAME_OVER), clearError()] },
    },
  });
}
