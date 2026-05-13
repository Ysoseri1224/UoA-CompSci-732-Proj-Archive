# Testing Workflow Document

This document explains the backend test infrastructure layout, test entry points, and the rules for running database tests.

## Current Test Directories

Backend tests live under `CardGame/backend/tests/` and are currently split into three directories by purpose:

- `tests/unit/`: pure logic tests
- `tests/db/`: database and model tests
- `tests/api/`: HTTP route tests
- `tests/integration/`: broader end-to-end backend integration flows

## Test Entry Points

The currently available test commands are defined in `CardGame/backend/package.json`:

| Command | Purpose |
|------|------|
| `npm test` | Run all backend `*.test.ts` and `*.test.js` files under `tests/` |
| `npm run test:unit` | Run unit tests under `tests/unit/` |
| `npm run test:db` | Run database and model tests under `tests/db/` |
| `npm run test:api` | Run API and backend integration tests under `tests/api/` and `tests/integration/` |
| `npm run test:host` | Host-only fallback for Node environments that cannot spawn per-file test worker processes |

All backend test commands are configured to run with single concurrency. Database tests must remain serial to avoid interfering with the shared test database.

When the host machine cannot create Node child processes and reports `spawn EPERM`, use the host-only fallback command:

```bash
cd CardGame/backend
npm run test:host
```

The frontend has the same host-only fallback:

```bash
cd CardGame/frontend
npm run test:host
```

## Database Test Workflow

Database tests use a dedicated test database and do not reuse the development database.

- Environment variable: `TEST_MONGO_URI`
- Default test database: `balatro_test`
- Default connection example: `mongodb://127.0.0.1:27017/balatro_test`

To run database tests from the host machine:

```bash
cd CardGame/backend
npm run test:db
```

`tests/db/setup.js` handles the reusable database-test workflow:

- Connect to the test database
- Clear collections between tests when needed
- Disconnect after the test file finishes

Database cleanup is only allowed to target the test database. The current implementation checks the active database name before cleanup and fails immediately if it does not match the test database convention.

## Placement Rules for New Tests

- Pure logic or pure function tests: put them in `tests/unit/`
- Tests that depend on MongoDB or Mongoose models: put them in `tests/db/`
- Tests that depend on HTTP endpoints or service startup flow: put them in `tests/api/`

When adding new tests, prefer the existing directories and commands; do not create a new test entry point unless a genuinely new test type is introduced.

## Current Status

The current test workflow status in this repository is:

- `tests/db/` uses explicit per-file connection setup and teardown through `tests/db/setup.js`
- `tests/unit/` includes both TypeScript and JavaScript tests
- `tests/api/` and `tests/integration/` are both covered by `npm run test:api`

If test scripts, test directory structure, or database test conventions are changed later, this file must be updated accordingly.
