# Meeting 06 — Lobby Features, Rogue Mode & Polish

**Date:** May 10, 2026 

**Sprint:** Week 5–6 

**Attendees:** Manqi Wang, Sheng Xiao, Yi Lin, Zengguang Feng, Zihan Zhao, Zhixuan Wei

---

## Summary

Major feature push: lobby received live countdown timer, recent matches panel, exit buttons, XP/rank system, and animations. Rogue-like game mode was fully integrated — backend runtime, boss death animation, save points, damage display, and entry card in lobby. Buff system wired into upgrade pool with 6 buff types. Frontend optimized with lazy-loading routes and oxlint migration. Numeric design finalized for 10-layer boss progression.

## Progress

### Merged PRs

| PR | Author | Title |
|----|--------|-------|
| #94 | Ysoseri1224 | test: add user journey integration test (20 cases) |
| #95 | Noah-art-eng | feat: improve leaderboard responsive layout and UI polish |
| #99 | Ysoseri1224 | feat(numeric): finalize 10-layer boss stats, buff pool, and design doc |
| #100 | Noah-art-eng | feat: add boss video animations and battlefield background |
| #101 | Noah-art-eng | fix: improve lobby responsive layout on small screens |
| #102 | yiln257 | feat(audio): add background music logic and gameplay sound effects |
| #103 | Ysoseri1224 | docs: add PvP requirements document |
| #104 | Noah-art-eng | fix(pve): fix archiveGame ValidationError by omitting null chosenElement |
| #105 | Noah-art-eng | feat(lobby): connect Recent Matches to real match history |
| #106 | Noah-art-eng | fix(game): restore and refine PvE attack effects |
| #107 | Noah-art-eng | feat(game): add Exit button to return to lobby from GamePage |
| #108 | Noah-art-eng | feat(lobby): add live season countdown timer |
| #109 | Apulu556 | feat: rogue full backend integration, boss death animation |
| #110 | Ysoseri1224 | docs: update numeric_thinking.md to reflect actual v1.0 code |
| #111 | Ysoseri1224 | feat(buff): wire 6 buff types into upgrade pool and player stats |
| #112 | sxia092 | feat(frontend): lazy-load route pages |
| #113 | sxia092 | refactor(frontend): extract battlefield and skill bar styles |
| #114 | sxia092 | chore(tooling): migrate frontend and backend to oxlint |
| #115 | Ysoseri1224 | fix(frontend): use VITE_API_BASE_URL env var for proxy target |
| #116 | sxia092 | fix(frontend): remove discard count panel from score panel |
| #117 | Apulu556 | feat: add enhancement icon pictures |
| #118 | Ysoseri1224 | fix(backend): remove any types in pveHandlers, drop unused XState imports |
| #119 | Apulu556 | feat: add rogue mode entry card to lobby |
| #120 | Apulu556 | fix: rogue mode damage display and save point bug |
| #121 | Noah-art-eng | style(lobby): unify PvE and Rogue CTA buttons with login style |
| #122 | Noah-art-eng | feat(lobby): add frontend XP and rank system |
| #123 | Noah-art-eng | feat(rogue): add exit button to return to lobby |
| #124 | Noah-art-eng | feat(lobby): add animations and rogue background video |

### Details

- **User journey tests (#94):** Comprehensive integration test suite with 20 test cases covering register → login → play PvE → view leaderboard → change password.
- **Lobby features (#95, #101, #105, #107, #108, #121, #122, #124):** Transformed lobby into a feature-rich hub — live season countdown timer, real match history pulled from backend, XP and rank system with progress bar, animated backgrounds, rogue mode video background, unified CTA button styling, responsive fixes for small screens.
- **Numeric design (#99, #110):** Finalized boss stats across all 10 layers — HP scaling (150 → 5000), attack damage curve (15 → 300), charge attack multiplier (2.2×). Buff pool balanced: 6 buff types with tiered stat bonuses. Documentation updated to reflect actual implemented values.
- **Boss animations (#100):** Added boss idle and attack video animations per layer. Battlefield now has parallax background layers.
- **Audio system (#102):** Implemented background music manager with cross-fade transitions between lobby, battle, and boss themes. Added sound effects for card play, attack, damage, and win/loss.
- **Buff system (#111):** Wired 6 buff types (HP+, Chips+, Mult+, Skill+, ChipsBonus, MultBonus) into the post-battle upgrade pool. Buffs persist across layers within a run. Player stats correctly accumulate buff modifiers.
- **Rogue mode (#109, #117, #119, #120, #123):** Full rogue-like game mode launched — endless layer progression, save points every 5 layers, boss death animation with elemental effects, enhancement icons for buffs, entry card in lobby, exit button, damage display fix.
- **Frontend optimization (#112, #113, #114):** Route-based code splitting with React.lazy() for faster initial load. Extracted battlefield and skill bar CSS into separate stylesheets. Migrated from ESLint to oxlint for both frontend and backend — 10× faster linting.
- **Env fix (#115):** Frontend now reads `VITE_API_BASE_URL` for API requests, enabling proper Docker proxy configuration.
- **Type cleanup (#118):** Removed all `any` types from `pveHandlers.ts`, deleted unused XState imports.

## Decisions

- Rogue mode uses the same PvE state machine with extended config (endless flag, checkpoint save).
- Buffs are stackable within a run, reset on death/restart.
- Season countdown timer is client-side with a hardcoded end date (configurable later).
- oxlint replaces ESLint project-wide for speed.

## Next Steps

- [x] Add boss intent display (ATTACK/CHARGE/DEFEND) with tri-color visuals
- [x] Move rogue meta-state machine to backend
- [x] Implement endless mode with checkpoint persistence
- [x] Improve boss English title styling
- [x] Refresh lobby and leaderboard UX
- [x] Add frontend unit tests (evaluator, socket adapter, game state)
- [x] Fix rogue buff stackable and collapsible buff panel
- [x] Write repository README
