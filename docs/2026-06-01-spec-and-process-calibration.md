# Spec, Skills, and Gate Calibration

**Date:** 2026-06-01
**Trigger:** End-of-session retrospective after shipping #34 / #35 / #37 / #43.

## What this is

A retrospective on the dev/critic/spec process as it ran across the thread-detail-page parity work, and the concrete repo changes that came out of it. The goal of writing this down is to make the *why* of the rule changes traceable — so future calibration starts from "what we learned" rather than "what we left in place."

## Symptoms observed

The session shipped a handful of small features (two-column layout, sidebar metadata block, cover lightbox, replies-container wrap). Every one of them used the `/spec` → `/assemble` (dev → critic loop) → `/ship` chain. Result:

- A 5-line code change (`<img>` → `<CnLightbox>`) carried ~2 KB of spec, 8 new unit tests, 2 dev cycles + 2 critic cycles, 3 full `pnpm verify` runs, a tag-traceability fix, and a spec typo correction.
- Multiple tests were added defending against hypothetical regressions of code being written in the same diff (e.g. "what if `.some()` is changed to `images[0].src === ...`").
- Critic cycles routinely surfaced findings that turned out to be non-issues — driven by the `/critic` skill's explicit *"bias toward false positives over false negatives"* instruction.
- One spec (`detail-page/replies/spec.md`) reached 367 lines, mostly engineering-decision prose defending implementation choices. An aggressive rewrite reduced it to 158 lines with zero contract loss.
- `pnpm verify` flaked on `net::ERR_ABORTED` failures (`auth-logout`, `reply-authoring`) several times per session, each costing a cycle. Always passed in isolation; never a real regression.

## Diagnosis — what was driving this

Four interacting incentives:

1. **One process for every change size.** A trivial visual swap ran the same loop as a cross-package data-contract refactor. The dev/critic loop is justified for medium-and-larger changes; for one-file swaps it is pure ceremony.

2. **The critic's framing manufactured findings.** *"Bias toward false positives — better to flag something that turns out to be fine than miss a real issue"* incentivises the critic agent to invent findings against hypothetical-future-regressions. Each finding triggers another dev cycle.

3. **The `Verifies:` tag convention couples spec scope to test scope.** The spec template instructed that *"each Gherkin scenario MUST be covered by at least one verification artifact"*. This forced two paths: either (a) write more tests for each scenario, or (b) write fewer scenarios. The default agent behaviour picked (a), producing tests-for-testability — extracted helpers (`getMetadataDate.ts`, `resolveChannelName.ts`) created purely so they could be unit-tested in isolation from the Astro components that actually used them.

4. **Specs drifted into engineering-decision logs.** The replies spec's Architecture and Constraints sections defended implementation choices ("the schema's `z.preprocess` is the only conversion boundary", "the listener is owned by a Svelte `$effect` keyed on `[uid, sessionState]`") instead of stating intent. This is the *spec-as-engineering-defense* anti-pattern: the agent (or human) wants to record *why* a choice was made, but a spec is a contract, not a defense. The *why* belongs in code comments, ADRs, or commit bodies.

## ASDLC frame

The repo already follows ASDLC's core stance — *spec is authority for intent, code is authority for execution*. The drift was in *how much intent the spec was forced to carry* and *how aggressive the adversarial review was incentivised to be*. The fixes preserve the architecture but recalibrate the dials.

## Changes landing with this doc

### Constitution (`AGENTS.md`)

- **§Change tiers** — new section. Tasks are classified Trivial / Standard / High-risk by scope (lines changed, packages touched, presence of contract change). Each tier names its required process. Trivial tasks run edit + verify + ship; no critic, no separate spec. Standard tasks run the existing flow. High-risk tasks add manual verification before ship.
- **§Spec discipline** — new section. Specs describe *intent and observable contract* only. Engineering rationale, decision history, and "we chose X because Y" prose belongs in code comments, ADRs, or commit messages. Constraint bullets that restate Architecture in negative form are removed by default.

### Skills (`.claude/commands/`)

- **`/critic`** — the *"bias toward false positives"* line is replaced. Findings must cite a current contract violation, runtime defect, or security/correctness bug observed in the diff. "What if the code is later changed to be wrong" is explicitly not a finding.
- **`/assemble`** — a Step 0 triage step is added. If the change is Trivial (per the new tier rubric), the orchestrator skips the critic cycle and runs dev → verify → exit.

### Skill files (`.claude/skills/spec/SKILL.md`)

- Cap scenarios at 5-7 in the template instructions. More than that almost always means more than one feature; split it.
- Replace the *"each Gherkin scenario MUST be covered by at least one verification artifact"* rule with *"scenarios that describe load-bearing contracts should be covered. Aspirational, decorative, or visual scenarios may stay un-tagged."*

### Gates (`scripts/`, `package.json`)

A first pass split `verify` into `verify:fast` / `verify` along a "fast vs slow" axis. On reflection — recorded mid-session — this was the *spec ceremony anti-pattern showing up in a different costume*: we were adding gate ceremony to compensate for the fact that `pnpm verify` was being over-invoked.

**The actual problem** was that `/assemble`, `/dev`, and `/critic` all mandated `pnpm verify` evidence per cycle. The fix is removing the mandate, not engineering a parallel fast chain.

Final state:

- `pnpm verify` is the **only** named gate. Full chain (lint + types + astro:check + build + unit + e2e + spec:coverage). Runs once, at `/ship`.
- Dev cycles run **focused unit tests** for the package they touched (e.g. `pnpm --filter @pelilauta/threads test`) — not chained gate scripts. Senior-engineer discipline: confirm the change works; don't audit deploy-readiness on every edit.
- Critic does **not** re-run gates. Its job is finding violations in the diff, not auditing gate evidence.
- `pnpm spec:coverage` unchanged behaviour (fails only on orphan tags). `Verifies:` tags are a *navigation* tool, not a forcing function.
- Long-term off-ramp: pre-commit gates (lint + types + astro:check) move to `lefthook`; pre-push gates (build + e2e) move to CI. At that point `verify.sh` becomes the scaffolding it currently is. Filed as a chore on the backlog.

### Issue filed

- **#47** — `harness: eliminate flaky net::ERR_ABORTED failures in full e2e suite`. The Playwright flakes that interrupted the session are an infrastructure issue, not a process issue, and get their own ticket.

## What was *not* changed

Some things looked like candidates and survived review:

- **The same-commit rule for specs.** Outdated spec is worse than no spec. Keep.
- **SSR Data Flow and Astro/Svelte boundary rules in ARCHITECTURE.md.** Real failure modes; earn their ceremony.
- **`/ship`.** Not the source of friction; just the canonical exit.
- **The DS-vs-domain boundary.** Genuinely load-bearing and not over-applied.

## How to use this doc later

If a future session hits the same friction pattern — slow cycles, redundant tests, sprawling specs — re-open this doc and check whether the rules are being honoured. If they are and the friction is back, the rules need a second pass. If they aren't, the gap is enforcement, not policy.
