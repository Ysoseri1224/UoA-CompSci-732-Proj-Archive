## Dev tips
- Document public utilities in `CardGame/docs/` when you change behavior.
- Use the project's existing package manager when installing dependencies if detected (check for lockfiles: package-lock.json, yarn.lock, pnpm-lock.yaml).
- If no package manager is detected, default to pnpm.
- Ask for confirmation before adding new production dependencies.

## PR instructions
- Run the project's lint command before opening a pull request, using the detected package manager.

## Testing workflow
- Keep the backend test entrypoints aligned with `CardGame/backend/package.json`: `npm test`, `npm run test:unit`, `npm run test:db`, and `npm run test:api`.
- Keep DB tests serial. Do not remove the single-concurrency setup from `test:db` unless the database isolation strategy changes.
- Treat `TEST_MONGO_URI` as test-only. Database cleanup in `CardGame/backend/tests/db/` must only target the dedicated test database.
- When changing test scripts, test directory layout, or DB test conventions, update `CardGame/docs/testing.md` and any README references in the same change.
