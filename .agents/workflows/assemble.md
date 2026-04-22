---
description: "Dev-Critic loop: implement, review, fix — repeat until clean"
---

# Assemble Workflow

The Assemble workflow orchestrates a **Dev -> Critic** feedback loop, driving a task from implementation to a clean, verified state.

> [!IMPORTANT]
> **Sub-Agent Context Isolation:** To guarantee an adversarial, unbiased review, the Critic Cycle MUST be executed by spawning a fresh, memory-less sub-agent via the system's CLI.
> **DO NOT** perform the critic checks yourself in the same chat window. You must delegate to a newly spawned CLI sub-agent via the terminal (`gemini -p "... prompt ..." -m "gemini-3.0-flash" --yolo`) so it is blind to your implementation struggles and workarounds. Preferred model for sub-agents is **Gemini 3 Flash**.

## Goal

Run implementation and review in alternating cycles until the critic issues a **Ship it** verdict. Each cycle should ideally operate with a fresh perspective. Only interrupt the user if genuinely blocked.

## Pipeline

### Step 1: Context Gathering
Before starting the loop, gather the necessary context:
1. **Task Brief:** Read the user request/issue. If a GitHub issue is mentioned, use `gh issue view <number>` to get criteria.
2. **Specs:** Identify relevant specs in `specs/` for the task domain.
3. **Constraints:** Read `AGENTS.md` and `CLAUDE.md` for architectural rules (e.g., Astro vs Svelte 5, `--cn-*` tokens).

### Step 2: Dev Cycle (Contract First)
Implement the task following the **[/dev](file:///.agents/workflows/dev.md)** workflow, treating the contract as the absolute prerequisite:
1. **Contract/Plan:** Before writing application code, identify and write missing spec scenarios, API contracts, and define dependencies. Modify `specs/` first.
2. **Execute:** Modify application code and add tests that map strictly to the spec scenarios just established.
3. **Verify:** Run `pnpm check`, `pnpm build`, and `pnpm test`.
4. **Fix:** Address any failures immediately.
5. **Summary:** Capture a summary of changes made for the Critic, explicitly calling out the updated spec files.

### Step 3: Critic Cycle
Perform an adversarial review of the changes by spawning a fresh sub-agent to run the **[/adversarial-review](file:///.agents/workflows/adversarial-review.md)** workflow.
1. **Spawn Critic:** Use terminal execution tools to spawn a head-less CLI sub-agent with an empty context. 
   - Execute: `gemini -p "Perform an adversarial review of the uncommitted workspace changes following the /adversarial-review workflow." -m "gemini-3.0-flash" --yolo`
2. **Isolation:** The CLI sub-agent will run the tests, inspect the diffs, and generate a finding report without being influenced by the dev-cycle reasoning.
3. **Verdict Parsing:** Read the standard output of the command. Extract the structured findings and the final verdict (PASS, PASS WITH NOTES, or FAIL) declared by the CLI sub-agent.

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
