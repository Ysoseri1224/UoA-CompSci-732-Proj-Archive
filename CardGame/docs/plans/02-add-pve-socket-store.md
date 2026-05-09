# Plan 02: Add PvE Socket Store

## Goal

Define a temporary Zustand store that mirrors the new backend PvE socket state and connection lifecycle, without turning the store into a business-logic engine.

## Checklist

- [x] Define the store responsibility boundary.
- [x] Define the mirrored server-state fields to cache from `gameState`.
- [x] Define connection metadata fields such as connection, room, and error state.
- [x] Define the minimum store write APIs needed for socket event handling.
- [x] Define reset, error, reconnect, and teardown behavior.
- [x] Define how this temporary store relates to the existing `gameStore`, `battleStore`, and `roundStore`.

## Required Conclusions

- [x] Record that this store is a synchronization cache layer, not the gameplay engine.
- [x] Record that the store only accepts socket-pushed state and connection metadata.
- [x] Record that phase one does not force the existing three stores to become the primary write path.

## Notes

- [x] Keep this document focused on data synchronization and not component wiring.
- [x] Keep every checkbox unchecked until the corresponding implementation work is actually done.
