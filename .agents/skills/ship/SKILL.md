---
name: ship
description: Ship the current state of the repository securely ensuring linting, building, and testing. It handles atomic save points, quality gates, spec verification, and commit/push procedures.
---

# Ship Skill

The **Ship Skill** is responsible for final validation and delivery of code changes. It ensures that the workspace is clean, specs are satisfied, quality gates pass, and changes are securely pushed to the remote repository.

## Workflow

### 1. Preparation & Review
- **Git Status:** Check `git status` to ensure all intended changes are present and no unwanted files are staged.
- **Diff Review:** Briefly review the uncommitted changes to ensure they align with the current task and follow the project's architectural constraints (e.g., ADR-0001 in `docs/adr/`).
- **Spec Verification:** If a spec was involved in the task, verify that the implementation matches the "Definition of Done" and "Contract" in the relevant spec file.

### 2. Formulate Commit Message
- Create a concise and descriptive commit message following the **Conventional Commits** format:
  - `feat(...)`: for new features
  - `fix(...)`: for bug fixes
  - `docs(...)`: for documentation changes
  - `refactor(...)`: for code changes that neither fix a bug nor add a feature
  - `test(...)`: for adding missing tests or correcting existing tests
  - `chore(...)`: for maintenance tasks

### 3. Execute Quality Gates
- Use the dedicated ship script: `scripts/ship.sh`.
- Run the command: `./scripts/ship.sh "<conventional commit message>"`
- This script automatically runs:
  - `pnpm check` (Linting & Formatting via Biome)
  - `pnpm build` (Production build)
  - `pnpm test` (Unit tests)
  - `pnpm test:e2e` (End-to-end tests)

### 4. Direct Commit & Push
- If all quality gates pass, the script will:
  - Stage all changes (`git add .`)
  - Commit with the provided message.
  - Push to the current branch.

### 5. Handling Failures
- If any step in `./scripts/ship.sh` fails:
  - **Stop.** Do not attempt to bypass gates.
  - **Analyze:** Examine the error output (lint failures, build errors, or test regressions).
  - **Fix:** Resolve the issues in the codebase.
  - **Retry:** Execute `./scripts/ship.sh` again until it passes completely.

## When to use
- When a task or sub-task is complete and ready for integration.
- After a successful `reverse-spec` or `spec` update.
- After fixing bugs identified by the `critic` skill.

## Safety Constraints
- **Never** push if quality gates fail.
- **Never** use `--force` when pushing unless explicitly instructed by the user.
- **Always** ensure the workspace is "green" before considering a task shipped.
