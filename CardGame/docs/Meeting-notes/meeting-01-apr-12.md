# Meeting 01 — Project Kickoff & Backend Foundation

**Date:** April 12, 2026 

**Sprint:** Week 1 

**Attendees:** Manqi Wang, Sheng Xiao, Yi Lin, Zengguang Feng, Zihan Zhao, Zhixuan Wei

---

## Summary

Project kicked off. The team established the backend architecture, core data models, scoring pipeline logic, ESM module system, ESLint configuration, and repository-level conventions. This sprint focused entirely on laying the technical foundation before feature work begins.

## Progress

### Merged PRs

| PR | Author | Title |
|----|--------|-------|
| #1 | yiln257 | feat: implement core data models and scoring pipeline logic |
| #2 | Ysoseri1224 | feat: backend architecture setup with ESM, API/Socket docs, route scaffolding |
| #3 | sxia092 | Add backend ESLint setup and repo instructions |

### Details

- **Data models (#1):** Designed and implemented the core MongoDB schemas — User, Match, and Achievement. Also built the initial scoring pipeline for poker hand evaluation (chips × mult calculation).
- **Architecture (#2):** Set up the Express.js backend with ES module syntax (ESM), established the project folder structure, scaffolded REST API routes, wrote initial API documentation (`api.md`) and Socket.io event documentation (`socket.md`).
- **Tooling (#3):** Added ESLint configuration for the backend, wrote repository setup instructions covering Node.js and Docker requirements.

## Decisions

- Use ESM (`"type": "module"`) for the backend — all imports use `.js` extensions.
- MongoDB with Mongoose ODM for persistence; Redis for future real-time features.
- API documentation lives in `CardGame/docs/api.md`, socket protocol in `CardGame/docs/socket.md`.
- Poker hand evaluation follows Texas Hold'em mechanics extended with elemental modifiers.

## Next Steps

- [x] Implement user registration and authentication flow
- [x] Add error handling middleware (global error handler)
- [x] Add request validation layer (express-validator)
- [x] Set up CI pipeline with GitHub Actions
- [x] Begin frontend project scaffold
- [x] Add testing infrastructure and write initial backend tests
