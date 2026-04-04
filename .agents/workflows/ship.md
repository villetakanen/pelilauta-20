---
description: Ship the current state of the repository securely ensuring linting, building, and testing
---

# Ship Workflow

When the user asks to "ship", "ship it", or uses the `/ship` slash command, follow these steps to securely build, test, and push the code:

1. **Review the Changes:** Quickly review `git status` and the changes made to understand the scope of the modifications.
2. **Formulate Commit Message:** Create a concise and descriptive commit message adhering to Conventional Commits format (e.g., `feat(tray): implemented responsive modes`, `fix(layout): updated app shell imports`).
3. **Run the Ship Script:** Execute the dedicated ship script located at `scripts/ship.sh` using the `run_command` tool. Pass the commit message as an argument to the script.

// turbo
4. Run the ship script: `./scripts/ship.sh "<conventional commit message>"`

5. **Address Failures:** If the script fails (e.g., `pnpm check`, `pnpm build`, or tests fail):
    * Analyze the error output.
    * Fix the underlying issue(s).
    * Re-run the `./scripts/ship.sh` script until it executes successfully.
6. **Confirm:** Report back to the user that the ship process has successfully completed.
