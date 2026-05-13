# Meeting 03 — Frontend Bootstrap, Auth Integration & CI

**Date:** April 17, 2026 

**Sprint:** Week 2–3 

**Attendees:** Manqi Wang, Sheng Xiao, Yi Lin, Zengguang Feng, Zihan Zhao, Zhixuan Wei

---

## Summary

Frontend project was initialized with React + Vite. Authentication flow completed end-to-end (login API, frontend auth store, route guards). CI pipeline established. Leaderboard endpoint built. All backend user-facing text unified to English. Token field naming standardized across the stack.

## Progress

### Merged PRs

| PR | Author | Title |
|----|--------|-------|
| #37 | Apulu556 | feat: implement POST /api/auth/login |
| #38 | Apulu556 | feat: GET /api/users/:userId |
| #39 | sxia092 | feat: add pino HTTP logger and logging docs |
| #41 | sxia092 | feat: add leaderboard endpoint |
| #43 | sxia092 | feat: add CI workflow for Node.js automation |
| #45 | Apulu556 | test: add integration tests for auth routes |
| #46 | Noah-art-eng | feat: initialize frontend project scaffold |
| #48 | Ysoseri1224 | fix: unify token field name to accessToken |
| #49 | Ysoseri1224 | feat: implement PUT /api/users/me/password |
| #50 | Ysoseri1224 | feat: implement GET /api/users/:userId/stats |
| #52 | Ysoseri1224 | chore: unify all backend user-facing text to English |
| #53 | Noah-art-eng | feat: configure routing and auth guard |
| #54 | sxia092 | test: adapt db user model fixtures to required email |
| #55 | Noah-art-eng | feat: API layer |
| #56 | Ysoseri1224 | fix: add missing env vars to docker-compose and fix PrivateRoute token key |

### Details

- **Login endpoint (#37):** Completed `POST /api/auth/login` — validates credentials, returns JWT access + refresh tokens.
- **Frontend scaffold (#46, #53, #55):** Created React + Vite frontend project. Configured React Router with protected routes (auth guard). Built a centralized API client layer with axios for backend communication.
- **Auth store (#55):** Implemented auth state management with token persistence in localStorage — login, logout, and token refresh flows.
- **CI workflow (#43):** Set up GitHub Actions `nodejs-ci.yml` — runs lint and tests on push to main.
- **Leaderboard (#41):** Built `GET /api/leaderboard` endpoint returning top players by win rate and total wins.
- **User endpoints (#38, #49, #50):** Added user profile lookup, stats retrieval, and password change functionality.
- **Logging (#39):** Integrated Pino as the structured logger with HTTP request logging middleware.
- **i18n (#52):** Unified all backend error messages, responses, and logs to English.
- **Token standardization (#48, #56):** Fixed inconsistent token field naming (`token`→`accessToken`) across register, login, and refresh. Fixed Docker Compose env vars and frontend auth token key mismatch.

## Decisions

- Frontend uses React with Vite, React Router v6, and axios for API calls.
- Auth tokens stored in localStorage with an auth store pattern (not Context — direct store).
- CI runs on push to main only (PR trigger removed later in #69 to save compute).
- All user-facing text in English (backend and frontend).

## Next Steps

- [x] Design and build game UI (card components, hand area, battlefield)
- [x] Implement game design specifications (boss stats, buff system)
- [x] Build XState-based game state machine
- [x] Create login/register UI pages
- [x] Add landing page
- [x] Set up Socket.io for real-time game communication
- [x] Refactor data models for PvE skill-poker requirements
