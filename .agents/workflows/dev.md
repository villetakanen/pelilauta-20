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

## Step 2: Contract-Driven Planning (Phase 0)
Before ANY code is written, you MUST establish the contract. Code cannot lead the spec.
1. **Update Specs First:** Propose and outline missing Gherkin scenarios, new API contracts, and new tool/package exports in the relevant `specs/**/spec.md` files.
2. **Identify Dependencies:** Map out which workspace packages will cross-communicate and explicitly state the aliases or workspace deps required.
3. **Security/Guardrail Check:** State how the plan honors the Regression Guardrails defined in the spec.
4. **Validation:** Review your contract extensions. Do do they introduce orphan tests? Do they bypass architectural layers?

*Note: If the spec is incomplete for your task, use tools to modify the spec as your very first action.*

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
