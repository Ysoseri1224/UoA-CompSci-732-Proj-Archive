# Meeting 02 — Backend Middleware & Auth Foundation

**Date:** April 14, 2026 

**Sprint:** Week 1–2 

**Attendees:** Manqi Wang, Sheng Xiao, Yi Lin, Zengguang Feng, Zihan Zhao, Zhixuan Wei

---

## Summary

Backend middleware layer completed. Global error handling, request validation, and rate limiting were added as cross-cutting concerns. The user registration endpoint was implemented as the first auth endpoint. The User model was finalized with required email field.

## Progress

### Merged PRs

| PR | Author | Title |
|----|--------|-------|
| #4 | sxia092 | feat: add testing workflow, ESM migration, and user model |
| #32 | Ysoseri1224 | feat: add global error handler middleware |
| #33 | Ysoseri1224 | feat: add request validation middleware with express-validator |
| #34 | Ysoseri1224 | feat: add rate limiting middleware for auth endpoints |
| #35 | Ysoseri1224 | feat: implement POST /api/auth/register |

### Details

- **Testing workflow (#4):** Established the backend test runner setup using Node.js native test runner with `tsx` for TypeScript. Migrated remaining CommonJS modules to ESM. Finalized the User model schema with email as a required field.
- **Error handler (#32):** Implemented a global Express error handling middleware with structured error responses and Pino logging integration.
- **Validation (#33):** Added `express-validator` based request validation middleware for all incoming requests, starting with auth routes.
- **Rate limiting (#34):** Configured `express-rate-limit` for auth endpoints (login, register) to prevent brute force attacks.
- **Register endpoint (#35):** Implemented `POST /api/auth/register` — validates username/email/password, hashes password with bcryptjs, creates user in MongoDB, returns JWT access token and refresh token.

## Decisions

- All API errors follow a consistent `{ error: { code, message } }` structure.
- Rate limiting: 5 attempts per 15 minutes for login, 3 per hour for register.
- JWT access token expires in 15 minutes; refresh token for longer sessions.
- Passwords hashed with bcryptjs (cost factor 10).

## Next Steps

- [x] Implement POST /api/auth/login
- [x] Implement token refresh mechanism
- [x] Add GET /api/users/:userId/stats
- [x] Add PUT /api/users/me/password
- [x] Write integration tests for auth routes
- [x] Begin frontend project scaffold
