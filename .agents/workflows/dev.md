---
description: "Implement a task with spec-anchored verification"
---

# Dev Workflow

The Dev workflow handles the implementation of a task, ensuring it meets functional requirements and passes all quality gates.

## Step 1: Understand the Task
1. **Gather Context:** Read the task description/issue.
2. **Issue Details:** If a GitHub issue is provided, fetch details via `gh issue view <number>`.
3. **Spec Review:** Read the relevant spec in `specs/`. Check `CLAUDE.md` and `AGENTS.md` for architectural constraints.
4. **Source Exploration:** Read the source files mentioned in the spec's Architecture section.

## Step 2: Plan the Implementation
Create a brief plan before modifying code:
- Identify affected packages/apps.
- Identify required tests (unit and E2E).
- Verify package boundaries (`packages/models`, `packages/firebase`, `packages/threads`, `packages/cyan`, `app/pelilauta`).
- Note the required commit message format (Conventional Commits).

## Step 3: Implement
Execute the changes:
- Modify source files.
- **Spec-Driven Tests:** Tests MUST directly map to scenarios, contracts, and guardrails defined in the spec. Do not write tests that merely codify the current implementation (e.g. asserting structural side-effects of your code rather than the spec's Required outputs).
- Add or update unit tests (colocated `.test.ts`).
- Add or update E2E tests (`app/*/e2e/`).
- Ensure all Design System components are Svelte 5 and 100% SSR-compatible.
- Use only `--cn-*` tokens.

## Step 4: Verify
Run the validation pipeline:
1. `pnpm check` (Lint/Format)
2. `pnpm build` (Build)
3. `pnpm test` (Unit tests)
4. `pnpm test:e2e` (E2E tests, if applicable)

Fix all failures before proceeding.

## Step 5: Report
Summary of work:
1. List of files changed and tests added.
2. Status of spec scenarios fulfilled.
3. Any open questions or required spec updates.

> [!NOTE]
> Do NOT commit or push changes. Use the `/ship` workflow for finalizing.
