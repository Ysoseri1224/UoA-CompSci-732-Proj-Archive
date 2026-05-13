# Meeting 04 — UI Foundation & Game Design Specs

**Date:** May 2, 2026 

**Sprint:** Week 3–4 

**Attendees:** Manqi Wang, Sheng Xiao, Yi Lin, Zengguang Feng, Zihan Zhao, Zhixuan Wei

---

## Summary

Frontend game UI took shape — card components with hover effects, hand area layout, battlefield with staged zones, skill bar design, and player state display. Backend game design specifications were formalized: boss stats across 10 layers, hand evaluation library, skill effects library, and TypeScript migration of all core types. Auth pages (login/register) and animated landing page were completed.

## Progress

### Merged PRs

| PR | Author | Title |
|----|--------|-------|
| #57 | Noah-art-eng | feat: implement auth store with token persistence |
| #58 | Noah-art-eng | feat: auth pages |
| #60 | Eric999314 | add card image and restructured handcard UI |
| #61 | Eric999314 | improve the hover function and rebuild battlefield and handarea background |
| #62 | Eric999314 | feat: playerstate UI |
| #63 | Eric999314 | feat: skilldesign logic |
| #64 | Eric999314 | feat: battlefield divided stage |
| #65 | yiln257 | feat: add leaderboard integration tests |
| #66 | Eric999314 | fix: fix frontend battle windows UI compatibility |
| #67 | Noah-art-eng | feat: add animated landing page |
| #68 | sxia092 | feat: basic XState machine model + socket start |
| #69 | sxia092 | ci: remove pull_request trigger |
| #70 | yiln257 | refactor(models): align schema with PvE skill poker requirements |
| #71 | Ysoseri1224 | docs: add game design specifications for Elemental Poker v0.1 |
| #72 | Noah-art-eng | fix: landing responsive |
| #73 | Ysoseri1224 | feat(game-logic): add types, deck, hand evaluation, and skills libraries (PR1) |
| #75 | Noah-art-eng | feat: login register UI |
| #77 | Ysoseri1224 | refactor(backend): migrate types and lib to TypeScript |

### Details

- **Card & Battlefield UI (#60, #61, #62, #64):** Built card components with hover animation, hand area with card fan layout, battlefield with boss zone and player zone, player HP/chips/mult stat display.
- **Skill bar (#63):** Designed and implemented the skill selection bar — players pick poker hands as skills pre-battle, with elemental affinity indicators.
- **Auth pages (#58, #75):** Login and register forms with validation, error display, and redirect to landing.
- **Landing page (#67, #72):** Animated landing page with game title, responsive design fixes.
- **Game design specs (#71):** Documented the full Elemental Poker v0.1 design — boss stats per layer, elemental type system (Water/Fire/Grass), damage formula, buff categories.
- **Game logic libraries (#73):** Implemented TypeScript types (`Card`, `Deck`, `HandType`, `Buff`, `Boss`), deck operations, poker hand evaluator, and 6 skill effect functions.
- **XState machine (#68):** Built initial XState v5 state machine for PvE game flow — idle → deal → playerTurn → evaluation → bossTurn → settlement. Socket.io server scaffold started.
- **Model refactor (#70):** Aligned MongoDB schemas (User, Match) with PvE requirements — added element, layer, damage tracking fields.
- **TypeScript migration (#77):** Migrated backend types and game logic libraries from JS to TypeScript for type safety.

## Decisions

- Game uses a 3-element rock-paper-scissors system: Water beats Fire, Fire beats Grass, Grass beats Water.
- Skills are poker hands (Pair, Two Pair, Three of a Kind, etc.) with elemental modifiers.
- XState v5 for state management — machine definition on backend, sent to frontend via Socket.io.
- Card images are PNG sprites; UI uses CSS transforms for card fan and hover effects.

## Next Steps

- [x] Wire XState machine to Socket.io events for real PvE gameplay
- [x] Implement card playing effects (drag cards to play area, discard, deal)
- [x] Build lobby page with game mode selection
- [x] Connect lobby to game page (start game flow)
- [x] Implement backend PvE runtime (turn processing, damage calculation)
- [x] Fix backend entrypoint and round flow issues
