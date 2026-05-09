# Plan 04: Wire GamePage and Components

## Goal

Update the page and game components so they consume the new socket-backed store plus the refactored `useGameLogic` adapter instead of relying on a fully local battle state.

## Checklist

- [x] Inventory all fields currently consumed by `GamePage`.
- [x] Define whether each consumed field comes from server state or frontend-local UI state.
- [x] Update `GamePage` to consume the new hook output shape.
- [x] Map the required data contract for `Battlefield`.
- [x] Map the required data contract for `HandArea`.
- [x] Map the required data contract for `ScorePanel`.
- [x] Map the required data contract for `SkillBar`.
- [x] Define page feedback behavior for `battleWin`, `battleLose`, and `gameError`.
- [ ] Verify the initialization flow when entering `/room/:roomId/game`.

## Required Conclusions

- [x] Record that `floor` should come from `boss.layer` in phase one.
- [x] Record that `shieldActive` should come from `skills.shield.active`.
- [x] Record that `discards` should come from `shuffle.remaining`.
- [x] Record that `gameOver` should be derived from `battleResult !== 'ONGOING'`.
- [x] Record that the frontend does not need the full `deck` array in phase one and should consume only `deckCount`.

## Notes

- [x] Keep this document focused on page/component wiring rather than lower-level store internals.
- [x] Keep every checkbox unchecked until the corresponding implementation work is actually done.
