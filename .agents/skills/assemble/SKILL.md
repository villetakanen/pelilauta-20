---
name: assemble
description: Orchestrate a dev-critic loop (implement, review, fix) until clean or circuit-breaker.
---

# Assemble

Run a **Dev -> Critic** feedback loop for `$ARGUMENTS` until the critic returns a ship-ready verdict, or until a 3-cycle circuit breaker triggers.

This skill is a conversion of `.claude/commands/assemble.md` from slash-command format into `.agents` skill format.

## Trigger

Use when the user wants implementation and adversarial review in one pass.

## Goal

Alternate between implementation and review cycles with fresh sub-agent context each time:

1. Dev cycle implements or fixes findings.
2. Critic cycle reviews the result and returns verdict/findings.
3. Repeat until clean.

Do not interrupt the user unless genuinely blocked.

## Pipeline

Before starting cycle 1:

- Ensure log directory exists: `./tmp/agent-logs`
- Create a run id: `assemble-YYYYMMDD-HHMMSS`
- Persist every sub-agent response as markdown in that directory

### 0) Context gathering

Prepare a self-contained **Task Brief** shared with each cycle:

- Read the task in `$ARGUMENTS`.
- If an issue number is provided, fetch it with `gh issue view <number>`.
- Read relevant specs under `specs/` for the feature area.
- Read `AGENTS.md` and `ARCHITECTURE.md` constraints.

Task Brief should include:

- Requested outcome and scope boundaries.
- Acceptance criteria and relevant scenarios.
- Files/packages likely in scope.
- Hard constraints (SSR/CSR boundaries, data-contract limits, no destructive git ops, etc.).

### 1) Dev cycle

Launch a sub-agent (`task` tool, `subagent_type: "general"`) with:

- Dev instructions source: `.claude/commands/dev.md`
- The Task Brief
- If cycle > 1: prior critic findings as a mandatory fix checklist

Capture:

- Files changed
- Tests/checks run
- Remaining risks/open items
- Dev cycle result status: `clean` | `needs-followup`

Log artifact:

- Save full dev sub-agent output to `./tmp/agent-logs/<run-id>-cycle-<n>-dev.md`
- Prefix file with a small metadata header:
  - Run id
  - Cycle number
  - Phase (`dev`)
  - Timestamp (ISO8601)
  - Source scope (`$ARGUMENTS`)

### 2) Critic cycle

Launch a sub-agent (`task` tool, `subagent_type: "general"`) with:

- Critic instructions source: `.claude/commands/critic.md`
- The Task Brief
- Dev-cycle change summary
- Current diff context (what changed this cycle)

Capture:

- Verdict: `ship it` | `fix before commit` | `discuss`
- Findings list with severity and concrete file references
- Follow-up trigger summary (why another loop is needed, if verdict is not `ship it`)

Log artifact:

- Save full critic sub-agent output to `./tmp/agent-logs/<run-id>-cycle-<n>-critic.md`
- Prefix file with the same metadata header, phase set to `critic`

### 3) Decision gate

- **Ship it** -> finish.
- **Fix before commit** -> feed findings into next dev cycle.
- **Discuss** -> stop and ask user one focused question with recommendation.

Circuit breaker:

- Stop after **3 full dev-critic cycles** if not clean.
- Present unresolved findings and options to proceed.

### 4) Finish

Report:

- What was implemented
- Number of full dev-critic cycles completed
- Final critic verdict
- Any residual notes/tech debt
- Loop report section with one bullet per cycle:
  - Cycle number
  - Critic verdict
  - Whether another loop was initiated
  - Concrete reason for initiating the next loop (e.g., failing test, lint warning, SSR boundary violation, contract mismatch)
- Suggest running ship flow (`pnpm verify`, commit, push) if user wants delivery
- Log index section listing written files under `./tmp/agent-logs/` for this run

Use this compact finish template:

```md
## Assemble Report

- Implemented: <short summary>
- Full cycles: <N>
- Final verdict: <ship it|fix before commit|discuss>

## Loop Log

- Cycle 1: verdict <...>; next loop <yes/no>; reason <...>
- Cycle 2: verdict <...>; next loop <yes/no>; reason <...>

## Validation

- Checks run: <command> -> <result>

## Residual Notes

- <none or concise note>
```

## Sub-agent policy

- Use fresh sub-agent invocation per cycle (no stale context accumulation).
- Prefer `general` sub-agent for both dev and critic loops.
- Only escalate to deeper architectural discussion with the user when blocked by ambiguity/contract conflict.
- Log persistence is mandatory for each sub-agent invocation in this skill.

## Principles

- **Fresh context per cycle**
- **Self-healing loop** (critic findings become next dev checklist)
- **Silent unless blocked**
- **Deterministic exit** (ship-it or circuit-breaker)
- **Spec-anchored and boundary-safe**

## Boundaries

- Does **not** auto-commit or auto-push.
- Does **not** bypass quality gates.
- Does **not** rewrite specs unless explicitly requested (flag spec gaps if discovered).

## Inputs

`$ARGUMENTS`: issue number, task description, or spec reference.
