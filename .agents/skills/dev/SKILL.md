# Skill: dev

# Dev (Plan + Parallel Implement)

Orchestrate feature delivery with a **strong planner model** and **fast/cheap executor models** in parallel, using deterministic gates and fresh context per sub-agent.

## Purpose

Use this skill when a task needs implementation (not just spec writing), especially when it can be split into independent slices.

- Planner does architecture-aware decomposition.
- Executors implement slices concurrently.
- Test specialist writes/updates tests from contracts.
- Verifier runs gates and drives fix loops.

## Inputs

`$ARGUMENTS` should include:

1. **Task objective** (what to build/fix)
2. **Scope** (paths/packages allowed)
3. **Spec references** (required contracts)
4. **Done criteria** (observable outcomes)
5. **Risk level** (low/medium/high)

If any of these are missing, infer from repo context when safe; ask only if ambiguity materially changes output.

## Non-negotiable rules

- Fresh context for every sub-agent invocation.
- Prefer smallest safe change.
- Respect package cleanup radius from `AGENTS.md`.
- Do not commit or push unless user explicitly asks.
- Do not bypass failing gates.
- No destructive git operations.

## Agent topology

### 1) Planner (capable model)

Produce a plan with:

- Ordered work graph (which tasks can run in parallel)
- File-level ownership per slice (avoid overlap)
- Contract/test mapping per slice (unit + e2e where relevant)
- Risk notes and rollback strategy

Output format:

```md
## Plan
- Slice A: ... (paths)
- Slice B: ... (paths)

## Parallelization
- A || B
- C after A

## Test Map
- Scenario ... -> <test file>
```

### 2) Executors (fast/cheap models)

Run one sub-agent per independent slice in parallel.

Each executor prompt must include only:

- Slice objective
- Exact files allowed
- Relevant spec excerpts
- Acceptance checks

Each executor returns:

- Proposed edits
- Why they satisfy contract
- Any blockers or assumptions

### 3) Test specialist (fast model)

In parallel with executors when possible:

- Add/update tests from plan contracts
- Cover edge/failure behavior explicitly
- Keep tests deterministic and minimal

### 4) Verifier (single gatekeeper)

After patch integration:

1. Run targeted checks first (package-local if possible)
2. Run required project gates (`pnpm verify` when needed)
3. If red, create focused fix tasks and loop

## Orchestration algorithm

1. Parse objective and identify touched packages.
2. Build slice graph with minimal overlap.
3. Launch planner.
4. Launch executor/test sub-agents in parallel per graph.
5. Integrate edits.
6. Verify gates.
7. Run targeted repair loops until green.
8. Report outcome, changed paths, and residual risks.

## Context packaging template (for each sub-agent)

```md
Task: <single slice goal>
Allowed paths: <exact list>
Do not touch: <explicit exclusions>
Contracts:
- <spec path + bullets>
Acceptance:
- <checks>
Output:
- unified patch summary + rationale
```

## Parallelization policy

Run sub-agents in parallel only when:

- File write sets do not overlap, and
- They do not depend on each other's outputs.

Otherwise run sequentially by dependency order.

## Failure policy

- If planner output conflicts with spec, spec wins.
- If executors produce conflicting edits, prefer the edit that better satisfies explicit contract text.
- If gates fail, do not ship; repair and re-run.

## Deliverable format back to user

- What was planned (1-3 bullets)
- What was implemented (by slice)
- What was verified (commands + pass/fail)
- Open risks / follow-ups

## Boundaries

- **Does:** plan, implement, test, and verify.
- **Does not:** auto-commit/push unless explicitly requested.
- **Does not:** invent behavior outside specs without flagging it.
