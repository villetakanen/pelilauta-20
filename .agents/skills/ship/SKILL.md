---
name: ship
description: Ship the current state of the repository securely ensuring linting, building, and testing. It handles atomic save points, quality gates, spec verification, and commit/push procedures.
---

# Ship Skill

The **Ship Skill** is responsible for final validation and delivery of code changes. It ensures that the workspace is clean, specs are satisfied, quality gates pass, and changes are securely pushed to the remote repository.

## Agent vs Human shipping

- **`pnpm ship "msg"`** (`scripts/ship.sh`) is a **human convenience** wrapper. It runs `git add .` which is unsafe for agents. **Agents MUST NOT invoke `pnpm ship` directly.**
- **Agents** run `pnpm verify` (`scripts/verify.sh`) for gate validation, then stage files explicitly and commit via the chat loop.

## Workflow

### 1. Preparation & Review
- **Git Status:** Check `git status` to ensure all intended changes are present and no unwanted files are staged.
- **Diff Review:** Briefly review the uncommitted changes to ensure they align with the current task and follow the project's architectural constraints.
- **Spec Verification:** If a spec was involved in the task, verify that the implementation matches the "Definition of Done" and "Contract" in the relevant spec file.

### 2. Formulate Commit Message
- Create a concise and descriptive commit message following the **Conventional Commits** format:
  - `feat(...)`: for new features
  - `fix(...)`: for bug fixes
  - `docs(...)`: for documentation changes
  - `refactor(...)`: for code changes that neither fix a bug nor add a feature
  - `test(...)`: for adding missing tests or correcting existing tests
  - `chore(...)`: for maintenance tasks
- **Subject must be all-lowercase kebab-case.** Commitlint rejects pascal-case, sentence-case, and upper-case subjects. Code identifiers that are PascalCase in source (`AppBar.astro`, `CnCard.svelte`) become kebab-case in the subject (`app-bar`, `cn-card`). Body can keep original casing.

### 3. Execute Quality Gates
- Run **`pnpm verify`** to execute the full gate chain (`scripts/verify.sh`).
- This script runs all five gates in order, stopping on the first failure:
  1. `pnpm check` — Lint & format (Biome)
  2. `pnpm check:types` — TypeScript type checking
  3. `pnpm build` — Production build
  4. `pnpm test` — Unit tests (Vitest)
  5. `pnpm test:e2e` — End-to-end tests (Playwright)

### 4. Stage, Commit & Push
- After all gates pass, **stage files explicitly** (do NOT use `git add .`):
  - `git add <file1> <file2> ...`
- Commit with the formulated message:
  - `git commit -m "<conventional commit message>"`
- Push to the current branch:
  - `git push`

### 5. Handling Failures
- If any gate in `pnpm verify` fails:
  - **Stop.** Do not attempt to bypass gates.
  - **Analyze:** Examine the error output (lint failures, type errors, build errors, or test regressions).
  - **Fix:** Resolve the issues in the codebase.
  - **Retry:** Execute `pnpm verify` again until it passes completely.
- **Cleanup radius:** When you modify a file under `packages/X/` or `app/X/`, that entire package must be clean — including pre-existing warnings or test failures you didn't introduce. Fix them in the same commit.
- **When a gate is red:** Surface it. Options are (a) fix it now, (b) skip/mark the test with a tracking note, (c) explicit user opt-in to ship anyway. Never pick (c) on agent authority.

## When to use
- When a task or sub-task is complete and ready for integration.
- After a successful `reverse-spec` or `spec` update.
- After fixing bugs identified by the `critic` skill.

## Safety Constraints
- **Never** invoke `pnpm ship` — that is for human use only.
- **Never** push if quality gates fail.
- **Never** use `--force` when pushing unless explicitly instructed by the user.
- **Never** use `git add .` — stage files explicitly.
- **Always** ensure the workspace is "green" before considering a task shipped.
