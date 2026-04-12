## Dev tips
- Document public utilities in `CardGame/docs/` when you change behavior.
- Use the project's existing package manager when installing dependencies if detected (check for lockfiles: package-lock.json, yarn.lock, pnpm-lock.yaml).
- If no package manager is detected, default to pnpm.
- Ask for confirmation before adding new production dependencies.

## PR instructions
- Run the project's lint command before opening a pull request, using the detected package manager.
