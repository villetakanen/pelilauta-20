---
description: "Implement a task using subagents with spec-anchored verification"
argument-hint: "[issue number, task description, or spec reference]"
---

# Dev Agent (@Dev)

Implement the following task:

$ARGUMENTS

## Instructions

You are implementing a task for Pelilauta 20. This command orchestrates work using subagents.

### Step 1: Understand the task

1. If a GitHub issue number is given, fetch details with `gh issue view <number>`
2. Read the spec referenced in the issue (if any) from `specs/`
3. Read `CLAUDE.md` for hard constraints and toolchain
4. Read the source files listed in the spec's Architecture section

### Step 2: Plan the implementation

Before writing code, create a brief plan:

- What changes are needed in each package/app
- What tests need to be written or updated
- What the commit message(s) will be
- Which package boundaries apply (models, firebase, threads, cyan-ds, pelilauta app)

### Step 3: Implement using subagents

Use the Agent tool to parallelize independent work. Delegate to subagents for:

**Research / exploration subagents** (subagent_type: Explore):
- Investigating how existing modules work before making changes
- Finding all consumers of a type or component being modified
- Understanding test patterns used in the existing test suite

**Implementation subagents** (subagent_type: general-purpose):
- Writing or modifying source files
- Writing or updating unit tests (colocated `.test.ts`)
- Writing or updating E2E tests (`app/*/e2e/`)

### Subagent guidelines

- Only parallelize truly independent work (e.g., unit tests for two unrelated packages)
- Do NOT parallelize source changes that touch the same module
- Each subagent should receive: the relevant spec section, the file(s) to read/modify, and the acceptance criteria it's fulfilling
- Subagents must follow CLAUDE.md constraints (Biome, `--cn-*` tokens only, SSR-compatible, Svelte 5 for DS components)
- Subagents must respect package boundaries:
  - `packages/models` — pure Zod, no Firebase imports
  - `packages/firebase` — infrastructure only, no domain logic
  - `packages/threads` — domain logic, SSR/CSR split
  - `packages/cyan` — DS components, stateless, no app logic
  - `app/pelilauta` — pages, stores, routing
  - `app/cyan-ds` — DS documentation site

### Step 4: Verify

After implementation, run these checks sequentially:

1. `pnpm check` — Biome lint + format
2. `pnpm build` — Full build
3. `pnpm test` — Vitest unit tests
4. Fix any failures before proceeding

### Step 5: Report

After verification passes, report back:

1. What was done (files changed, tests added)
2. Which spec scenarios are now satisfied
3. If implementation revealed new constraints, note what spec updates are needed
4. Any open questions

Do NOT commit, push, or close the issue — that is `/ship`'s job.

## Rules

- Never skip the verification step — all three checks must pass
- If a check fails, fix it before proceeding
- If the task is blocked (missing dependency, spec ambiguity), stop and ask rather than guessing
- Do NOT commit, push, or close issues — the user controls git and GitHub operations
- Do not modify files outside the package scope of the task without asking
- If the task's acceptance criteria can't all be met, explain what's missing and why
- All DS components must be 100% SSR-compatible per ADR-001
- Only `--cn-*` tokens — flag any `--cyan-*` or `--color-*` as migration debt
