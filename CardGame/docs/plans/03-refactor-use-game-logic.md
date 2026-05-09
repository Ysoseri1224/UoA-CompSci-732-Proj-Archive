# Plan 03: Refactor useGameLogic

## Goal

Turn `useGameLogic` from a local single-player battle engine into a frontend adapter that reads socket-backed state, keeps local preview behavior, and emits user actions to the backend.

## Checklist

- [x] Remove responsibility for initializing a full local battle state inside `useGameLogic`.
- [x] Change the hook to read authoritative battle data from the PvE socket store.
- [x] Keep local `selected` state management inside the hook.
- [x] Keep local `evaluation` preview calculation inside the hook.
- [x] Rewrite skill, discard, and play actions as socket emits instead of local state transitions.
- [x] Map confirmed backend results back into the hook return shape used by the page.
- [x] Delete no-longer-needed local shuffle, local damage, local floor progression, and other local battle simulation logic.

## Required Conclusions

- [x] Record that `useGameLogic` remains the page interaction orchestrator.
- [x] Record that `useGameLogic` stops acting as the local gameplay rules executor.
- [x] Record that preview values stay local, while confirmed results must come back from the backend.

## Notes

- [x] Keep this document focused on hook responsibility changes and action flow.
- [x] Keep every checkbox unchecked until the corresponding implementation work is actually done.
