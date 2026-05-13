# Testing Workflow Document

This document explains the backend test infrastructure layout, test entry points, and the rules for running database tests.

## Current Test Directories

Backend tests live under `CardGame/backend/tests/` and are currently split into three directories by purpose:

- `tests/unit/`: pure logic tests
- `tests/db/`: database and model tests
- `tests/api/`: reserved directory for API integration tests

## Test Entry Points

The currently available test commands are defined in `CardGame/backend/package.json`:

| Command | Purpose |
|------|------|
| `npm test` | Run all `*.test.js` files under `tests/` |
| `npm run test:unit` | Run tests under `tests/unit/` |
| `npm run test:db` | Run database tests under `tests/db/` |
| `npm run test:api` | Run API tests under `tests/api/` |

All test commands are currently configured to run with single concurrency; database tests must remain serial to avoid interfering with the shared test database.

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

`tests/db/setup.js` handles the base database-test workflow:

- Connect to the test database
- Clean existing data before each test
- Disconnect after the tests finish

Database cleanup is only allowed to target the test database. The current implementation checks the active database name before cleanup and fails immediately if it does not match the test database convention.

## Placement Rules for New Tests

- Pure logic or pure function tests: put them in `tests/unit/`
- Tests that depend on MongoDB or Mongoose models: put them in `tests/db/`
- Tests that depend on HTTP endpoints or service startup flow: put them in `tests/api/`

When adding new tests, prefer the existing directories and commands; do not create a new test entry point unless a genuinely new test type is introduced.

## Current Status

The current test workflow status in this repository is:

- `tests/db/` is currently the clearest and most fully specified formal test workflow
- `tests/unit/` already has a test entry point and directory, but the existing cases are still being organized
- `tests/api/` already has a script entry and directory structure and is currently reserved for future API integration tests

If test scripts, test directory structure, or database test conventions are changed later, this file must be updated accordingly.
