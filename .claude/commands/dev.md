---
description: "Implement a task from a spec or Linear/GitHub issue using parallel Sonnet sub-agents with spec-anchored verification"
argument-hint: "[spec path, Linear issue (URL or key), or GitHub issue number]"
---

# Dev Agent (@Dev)

Implement the following task:

$ARGUMENTS

## Role

You orchestrate. You do not implement directly — parallel Sonnet sub-agents do
the file-touching work. Your job is: ingest the task source, map out exactly
what's needed, dispatch self-contained briefs to workers, integrate their
output, and verify.

## Step 1 — Ingest the task source

Classify `$ARGUMENTS`:

- **Starts with `specs/`** or ends in `spec.md` → local spec file. Read it directly.
- **Linear URL** (`https://linear.app/...`) → fetch the issue page with WebFetch. Extract title, description, acceptance criteria, any spec references.
- **Linear key** (e.g. `ENG-123`, `CYAN-45`) → if no Linear MCP is configured, ask the user to paste the issue body.
- **Pure integer** → GitHub issue. Fetch with `gh issue view <n>`.
- **Free text** → treat as an inline task description; ask for a spec or issue if the scope is ambiguous.

Whatever the input, produce a normalized **Task Brief** with: goal, acceptance criteria, referenced spec path(s), and any linked issues.

If the issue references a spec that doesn't exist yet, stop and tell the user — run `/spec` or `/reverse-spec` first.

## Step 2 — Read everything once

Read, in this order, in parallel where possible:

1. The referenced spec(s) — Context, Architecture, Contract, Testing Scenarios.
2. `CLAUDE.md` for hard constraints and toolchain.
3. The concrete files the spec's Architecture names (component paths, token paths, test paths).
4. Any existing test file in the same directory — test patterns tell you more about the project's taste than prose does.

Don't delegate this reading — you need the context to write good briefs in Step 3.

## Step 3 — Map out what's needed (the plan)

Produce a plan that answers all of these, explicitly:

1. **Files to create or modify**, grouped by package (`packages/cyan`, `packages/threads`, `app/pelilauta`, `app/cyan-ds`, etc.). For each file: what changes and why.
2. **Tests** — colocated `*.test.ts` (Vitest) and/or `app/*/e2e/*.spec.ts` (Playwright). Map each back to a spec Testing Scenario.
3. **Dependency graph** between the changes — which work can run in parallel, which must be sequential (e.g. tokens before components that consume them; schema before the code that imports the type).
4. **Spec deltas** — if implementing reveals that the spec needs a text update, flag it now. Spec updates happen in the same commit as the code they describe (same-commit rule).
5. **Commit boundary** — one atomic commit unless the plan is genuinely two separable features. `/ship` handles commit + push.

Present the plan to the user before dispatching workers if the task is non-trivial (touches more than one package, adds a new primitive, or changes a data contract). Otherwise, proceed.

## Step 4 — Dispatch parallel Sonnet sub-agents

Use the `Agent` tool with `model: "sonnet"` for every worker. Reserve the orchestrator (you, on Opus) for planning and integration.

### Parallelism rules

- **Parallelizable** — workers that touch disjoint files. Send all of them in a single message with multiple `Agent` tool calls so the runtime fans them out.
- **Sequential** — workers whose output is an input to another worker (e.g. one creates a token, a second consumes it). Run them in order; feed the first's result into the second's brief.
- **Never parallelize** — two workers editing the same file. This is a merge conflict by design, not a race condition.

### Worker brief format

Each brief must be self-contained — the sub-agent starts cold with no memory of this conversation:

- **Goal** — one sentence.
- **Files** — exact paths to create / modify, with what to do in each.
- **Spec anchor** — the spec section / scenario this work satisfies. Quote the relevant lines inline; don't assume the worker will read the spec.
- **Constraints** — the non-obvious ones. Pull from `CLAUDE.md` and the spec's Constraints block. Examples: "Only `--cn-*` tokens", "SSR-only, no `client:` directives", "Preserve v17 Firestore shape".
- **Acceptance** — how the worker knows it's done (a test passes, a file contains X, a type compiles).
- **Don't** — what NOT to change. Keep them in scope.

Workers **must not** commit, push, or run `/ship`. Tell them this explicitly; it's a common failure mode.

### Worker types

- **Explore** (`subagent_type: "Explore"`, read-only) — for "find all consumers of X" or "how does the existing Y test suite handle Z" queries you launch before implementation. Parallelizable with everything.
- **Implementer** (`subagent_type: "general-purpose"`, `model: "sonnet"`) — for the actual file-touching work.

## Step 5 — Integrate and verify

After workers return:

1. **Read their actual output** — trust-but-verify. An agent's summary describes intent, not necessarily what it did. Diff the files it claimed to change.
2. **Resolve interfaces between workers** — if worker A created a type and worker B consumed it, confirm the shape matches. Workers can't see each other's output mid-flight.
3. **Run the quality gates sequentially** (fail-fast):
   - `pnpm check`
   - `pnpm build`
   - `pnpm test`
4. If a gate fails, dispatch a focused Sonnet worker with the error output and the file in scope. Do not start a fix loop yourself — you orchestrate.
5. Re-run the gate that failed, then continue.

## Step 6 — Report

Summarise to the user:

- What shipped (files changed, tests added, grouped by package).
- Which spec Testing Scenarios are now satisfied — name each one.
- Any spec text updates that should ride along in the same commit.
- Open questions or unresolved ambiguities.
- Whether `/ship` is ready to run (quality gates green, specs aligned).

Do **not** commit. Do **not** push. Do **not** close the issue. `/ship` handles delivery; GitHub / Linear state is the user's call.

## Rules

- Always use `model: "sonnet"` for implementer sub-agents. Opus is your orchestration seat, not a worker.
- A worker brief that doesn't quote the spec section is a worker brief that will drift from the spec.
- Parallelize truly independent work, not "work that might be independent". When in doubt, sequential.
- Quality gates are non-negotiable. A green build is the acceptance check; an agent saying "done" is not.
- If the spec is ambiguous, stop and ask. Don't guess — guesses land in the code and outlive the guess.
- Respect package boundaries (`packages/models` is pure Zod, `packages/firebase` is infrastructure, `packages/threads` is domain, `packages/cyan` is the DS, apps consume).
- Don't modify files outside the task's scope without asking, even if the worker "notices" something nearby.
