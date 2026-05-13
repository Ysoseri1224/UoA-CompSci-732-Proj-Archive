# Meeting 05 — PvE Gameplay Engine Integration

**Date:** May 7, 2026 

**Sprint:** Week 4–5 

**Attendees:** Manqi Wang, Sheng Xiao, Yi Lin, Zengguang Feng, Zihan Zhao, Zhixuan Wei

---

## Summary

The PvE game loop was wired end-to-end: card playing effects, custom state machine replacing XState, Socket.io event handling, round flow, damage calculation, and game-over settlement. The lobby page connected to a playable game page. Database routes for game archiving were implemented with integration tests.

## Progress

### Merged PRs

| PR | Author | Title |
|----|--------|-------|
| #74 | Eric999314 | fix: allow use same figure in same type |
| #76 | Eric999314 | fix: skill release adjustment |
| #80 | sxia092 | fix: correct backend entrypoint and frontend round flow |
| #81 | Ysoseri1224 | fix(lint): resolve all unused vars and update docs for TS |
| #82 | Eric999314 | feat: add card playing effects |
| #83 | yiln257 | fix: resolve breaking changes in models and runtime scripts |
| #84 | Noah-art-eng | feat: redesign fantasy lobby page UI |
| #85 | sxia092 | [docs] PvE integration spec drafts |
| #86 | Ysoseri1224 | feat(pve): custom state machine replacing XState |
| #88 | Ysoseri1224 | feat(socket): wire custom state machine to Socket.io events |
| #89 | sxia092 | feat: wire PvE frontend to socket state machine |
| #90 | Noah-art-eng | feat: connect lobby start button to playable game page |
| #91 | Ysoseri1224 | feat(db): implement routes, game archive, and integration tests (Steps 8+9) |
| #92 | sxia092 | fix: stabilize PvE play flow and auth model |

### Details

- **Card playing effects (#82):** Cards can now be dragged from hand to play area. Attack animations, chip/mult calculation display, and element-based visual feedback implemented.
- **Custom state machine (#86):** Replaced XState v5 with a custom TypeScript state machine. Rationale: XState caused type inference issues and added unnecessary bundle complexity for a deterministic turn-based flow. The custom machine is ~200 lines, fully typed, and easier to debug.
- **Socket.io wiring (#85, #88, #89):** Defined PvE socket event contract in `socket.md`. Backend state machine emits state transitions via Socket.io; frontend adapter consumes them to drive UI. Events: `pve:state`, `pve:action`, `pve:result`.
- **Game page connection (#90):** Lobby "Start Game" button navigates to GamePage, initializes socket connection, and begins the deal phase.
- **Round flow (#80, #92):** Fixed backend entrypoint to correctly initialize the game loop. Stabilized the deal → play → evaluate → bossTurn → next round cycle.
- **Lobby UI (#84):** Redesigned lobby with fantasy theme — card-style game mode tiles, animated background, player profile section, recent matches panel.
- **Database routes (#91):** Implemented game archive endpoint — saves completed match results (boss, layer, damage, win/loss) to MongoDB. Added integration tests for the archive flow.
- **Model fixes (#83):** Resolved breaking schema changes — aligned Match model with the new element and layer fields, fixed runtime script compatibility.
- **Lint cleanup (#81):** Resolved all TypeScript lint warnings (unused variables, implicit any) across the backend.

## Decisions

- Custom state machine over XState — simpler, fully typed, no framework lock-in.
- Socket.io event naming convention: `namespace:action` (e.g., `pve:deal`, `pve:playCards`).
- Game archive stores full match snapshot including chosen cards, damage per round, and final boss state.
- Frontend socket adapter acts as a thin wrapper — transforms socket events into UI state without business logic.

## Next Steps

- [x] Improve leaderboard responsive layout and polish
- [x] Add boss video animations and battlefield background effects
- [x] Finalize 10-layer boss stats and buff pool numeric design
- [x] Add background music and gameplay sound effects
- [x] Implement lobby: recent matches, season countdown, exit button
- [x] Begin rogue-like game mode development
- [x] Add user journey integration tests
- [x] Write PvP requirements document
