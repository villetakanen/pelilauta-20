---
description: "Dev-Critic loop: implement, review, fix — repeat until clean"
---

# Assemble Workflow

The Assemble workflow orchestrates a **Dev -> Critic** feedback loop, driving a task from implementation to a clean, verified state.

> [!IMPORTANT]
> **Sub-Agent Model Policy:** Per user preference, all sub-agent operations should prefer **Gemini 3 Flash** for speed and efficiency, unless high-reasoning (Pro models) is explicitly required.
> **DO NOT** use `browser_subagent` or other sandboxed tools to perform the Critic Cycle. Sandbox agents lack terminal/file access to the workspace repository and cannot perform code review. The primary agent MUST perform the Critic review directly.

## Goal

Run implementation and review in alternating cycles until the critic issues a **Ship it** verdict. Each cycle should ideally operate with a fresh perspective. Only interrupt the user if genuinely blocked.

## Pipeline

### Step 1: Context Gathering
Before starting the loop, gather the necessary context:
1. **Task Brief:** Read the user request/issue. If a GitHub issue is mentioned, use `gh issue view <number>` to get criteria.
2. **Specs:** Identify relevant specs in `specs/` for the task domain.
3. **Constraints:** Read `AGENTS.md` and `CLAUDE.md` for architectural rules (e.g., Astro vs Svelte 5, `--cn-*` tokens).

### Step 2: Dev Cycle
Implement the task following the **[/dev](file:///.agents/workflows/dev.md)** workflow:
1. **Plan:** Outline changes and tests.
2. **Execute:** Modify code and add tests.
3. **Verify:** Run `pnpm check`, `pnpm build`, and `pnpm test`.
4. **Fix:** Address any failures immediately.
5. **Summary:** Capture a summary of changes made for the Critic.

### Step 3: Critic Cycle
Perform an adversarial review of the changes using the **[/adversarial-review](file:///.agents/workflows/adversarial-review.md)** workflow:
1. **Context:** Run `git diff` and `git diff --cached` using your terminal tools to capture the exact raw code changes. **Do NOT merely use a summary.** The Critic must analyze the actual code.
2. **Execution:** Evaluate the code changes locally within your own context. Do not spawn a subagent for this.
3. **Verdict:** Capture the verdict (PASS, PASS WITH NOTES, or FAIL).

### Step 4: Decision Gate
Based on the Critic's verdict:
- **PASS (Ship it):** Proceed to Step 5.
- **FAIL (Fix before commit):** Extract the violation list and go back to **Step 2 (Dev Cycle)** with the findings as fix instructions.
- **PASS WITH NOTES / Discuss:** If there are non-blocking notes or discussion points, present them to the user or address them if they align with the goal.

**Circuit Breaker:** If the loop completes **3 full cycles** without reaching a clean "PASS", stop and present findings to the user.

### Step 5: Finish
1. Report the summary of implementation.
2. State the number of cycles taken.
3. Suggest running `/ship` to finalize the work.

## Principles
- **Self-healing:** Critic findings drive the next Dev cycle.
- **Silent execution:** Do not ask for confirmation between cycles unless genuinely blocked.
- **Deterministic exit:** Exit on PASS or after 3 failed cycles.
- **Constraint Enforcement:** Ensure Astro/Svelte boundaries and Design System tokens are respected.
