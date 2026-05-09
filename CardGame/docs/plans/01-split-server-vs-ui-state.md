# Plan 01: Split Server State vs UI State

## Goal

Clarify which state should stop living directly inside `useGameLogic`, and which state should remain in the frontend as temporary UI state during the socket migration.

## Checklist

- [x] Inventory all current `useGameLogic` state, memo, and action members.
- [x] Mark backend-authoritative battle state that should come from the new PvE socket payload.
- [x] Mark frontend-local temporary UI state that should stay client-side.
- [x] Mark frontend-local derived preview state that should remain computed in the browser.
- [x] Define the post-migration ownership table for each state field.
- [x] Identify which current local actions should be removed versus rewritten as socket emits.

## Required Conclusions

- [x] Record that `hand / player / boss / round / phase / skills / shuffle / play / battleResult` belong to the backend authority layer.
- [x] Record that `selected / panel / float / hit flash / transition banner` belong to the frontend temporary UI layer.
- [x] Record that `evaluation` remains a frontend-local preview for the first migration stage.

## Notes

- [x] Confirm that this document is state-boundary only and does not define socket wiring details.
- [x] Keep every checkbox unchecked until the corresponding implementation work is actually done.
