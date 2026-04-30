# ASDLC Assessment of Current Specs

Date: 2026-04-30
Scope: `specs/**/spec.md` (67 files)
Reference guidance: ASDLC `spec-engineer` and `agents-md-spec`

## Executive take

The specs are strong on coverage and explicitness, but they are currently over-optimized for completeness at the cost of signal density. Relative to ASDLC guidance, the main gaps are:

1. Too much negative framing (`Anti-Patterns`, "do not", "never") vs positive contracts.
2. Too much narrative and implementation detail for context-injection use.
3. Verification mapping embedded inline in many specs (legacy style), which inflates size and duplicates truth.

In short: high quality intent, low context efficiency.

## Evidence snapshot

- Spec files scanned: **67**
- Total lines: **9022**
- Average lines/spec: **134.7**
- Median lines/spec: **105**
- Specs over 200 lines: **13**
- Specs over 300 lines: **7**
- `### Anti-Patterns` sections: **31** specs
- Negative-term matches (`don't`, `do not`, `must not`, `never`, etc.): **252** matches
- Legacy scenario verification lines (`Vitest Unit Test` / `Playwright E2E Test`): **293** matches across **45** specs

Largest specs:

- `specs/pelilauta/session/spec.md` (585)
- `specs/pelilauta/threads/spec.md` (488)
- `specs/cyan-ds/core/buttons/spec.md` (374)
- `specs/cyan-ds/layouts/seo/spec.md` (353)
- `specs/pelilauta/auth/spec.md` (348)

## ASDLC alignment check

### 1) Positive constraints vs pink-elephant context

ASDLC guidance explicitly favors positive constraints and warns against anti-pattern-heavy instruction sets.

Current state:

- Many specs use dedicated `Anti-Patterns` sections.
- Negative instructions are often repeated across sections (Context, Constraints, Guardrails, DoD).
- Some negatives are necessary (security boundaries), but many can be rewritten as positive system rules.

Impact:

- Increases token load with repeated prohibitions.
- Raises risk of attention anchoring on forbidden patterns.
- Lowers first-pass readability for humans.

Representative files:

- `specs/pelilauta/session/spec.md`
- `specs/pelilauta/front-page/spec.md`
- `specs/cyan-ds/layouts/page/spec.md`
- `specs/cyan-ds/components/tray/spec.md`

### 2) Match depth to complexity

ASDLC: simple features should stay short; complexity should be earned.

Current state:

- Several specs are effectively implementation playbooks (300-585 lines).
- Some include long explanatory prose that is useful once, but expensive on every context injection.
- Multiple sections restate the same contract in different words.

Impact:

- Harder to rapidly parse intent.
- Higher prompt cost for agent workflows.
- More maintenance burden when behavior changes.

### 3) Spec intent vs verification inventory

Your local template (`specs/TEMPLATE.md`) already says spec should not name tools/paths in scenarios and should use `Verifies:` linkage.

Current state:

- Many specs still carry legacy inline verification bullets (`Vitest Unit Test`, `Playwright E2E Test`).
- This creates duplication against the verification registry pattern.

Impact:

- Larger files with repeated path references.
- Drift risk when test files move.
- Lower separation between contract and enforcement artifact.

## What is working well

- Specs are concrete and highly actionable.
- Most constraints are machine-verifiable in principle.
- Cross-spec references are generally good.
- Security and SSR boundaries are clearly documented.

These are strong foundations; the issue is mostly format economics, not intent quality.

## Recommendations (high leverage)

### A. Replace `Anti-Patterns` with `System Rules`

For each anti-pattern bullet, convert to an affirmative invariant when possible.

Example:

- From: "Do not use JavaScript resize listeners for tray layout"
- To: "Tray layout state is derived exclusively from CSS media/container queries and checkbox state selectors."

Keep true negatives only where required (security/compliance), and place them under `Constraints` or `Regression Guardrails` as explicit safety rules.

### B. Enforce a size budget per spec tier

Suggested soft limits:

- Small primitive/spec: 60-120 lines
- Medium feature/spec: 120-220 lines
- Large orchestration/spec: 220-320 lines
- Above 320: split into sub-specs or extract appendices

For very large specs (`session`, `threads`, `seo`, `buttons`), split "reference-heavy" material into subordinate specs or implementation notes and keep parent spec contract-focused.

### C. Remove legacy verification bullets from specs you touch

Adopt one style only:

- Gherkin scenario in spec
- Verification artifact declares `Verifies:` tag
- Registry (`specs/VERIFICATION.md`) maps inverse coverage

This is the single easiest reduction in spec length with minimal semantic loss.

### D. De-duplicate repeated constraints

Common repeated rules (e.g. "apps never override DS", "no direct AppShell import") should live once in the closest parent spec and be referenced by sub-spec path.

Rule of thumb:

- Parent spec owns cross-cutting invariant.
- Child spec references parent invariant and only adds local delta.

### E. Use a concise-writing pass as a mandatory review step

Before merge, check each touched spec for:

1. Can this sentence be cut without losing a testable contract?
2. Is this implementation detail better in code comments or ADR?
3. Is this a repeated negative that can become one positive invariant?

## Priority candidates for first cleanup

1. `specs/pelilauta/session/spec.md`
2. `specs/pelilauta/threads/spec.md`
3. `specs/cyan-ds/layouts/seo/spec.md`
4. `specs/cyan-ds/core/buttons/spec.md`
5. `specs/pelilauta/auth/spec.md`

Why these first: they dominate total line count and contain repeated negative/legacy verification patterns; cleanup here gives outsized context-window wins.

## Proposed target state (6-week practical)

- Reduce total spec lines by ~25-35% without dropping any scenario coverage.
- Reduce `Anti-Patterns` sections from 31 to under 5 (security-only exceptions).
- Remove legacy `Vitest/Playwright` bullets from all actively maintained specs.
- Keep all existing guardrails, but expressed as concise, testable, mostly positive constraints.

## Suggested migration policy

"Touch-and-tighten" policy to avoid big-bang rewrite:

- Any spec edited for feature work must also:
  - remove `Anti-Patterns` section (or collapse to security-only rule bullets),
  - convert at least 3 negative bullets to positive invariants,
  - remove inline legacy verification bullets in touched scenarios.

This keeps velocity while steadily improving spec quality.
