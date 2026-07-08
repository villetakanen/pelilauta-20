---
feature: Lefthook Quality Gates
status: draft
last_major_review: 2026-06-02
---

# Feature: Lefthook Quality Gates

## Blueprint

### Context

Gates are a property of the repo, not a ceremony. Bypassing one requires an explicit, visible flag.

### Architecture

- **Components:** `lefthook.yml`, `package.json` `prepare`, `AGENTS.md` §Quality gates, `.claude/skills/ship/SKILL.md`.
- **Dependencies:** `lefthook`; existing gate scripts (`check`, `check:types`, `astro:check`, `build`, `test`, `spec:coverage`, `test:e2e`).
- **Constraints:**
  - Each gate runs at exactly one boundary. Lint/types/astro at pre-commit; build/unit/spec:coverage/e2e at pre-push.
  - `lefthook.yml` is the only definition of the chain.
  - Bypass is `--no-verify`. No silent path.

## Contract

### Definition of Done

- [ ] `pnpm install` on a fresh clone wires the hooks.
- [ ] Pre-commit rejects lint, type, or astro:check failures.
- [ ] Pre-push rejects build, unit, `spec:coverage`, or e2e failures.
- [ ] `scripts/verify.sh`, `scripts/ship.sh`, and the `verify`/`ship` package scripts are gone.
- [ ] `AGENTS.md` §Quality gates names hooks as authoritative.
- [ ] `/ship` reduces to `git add <files> && git commit && git push`.

### Regression Guardrails

- The chain is defined in `lefthook.yml`. No second location.
- Iteration loops (`/dev`, `/critic`, `/assemble`) do not invoke the full chain.

### Testing Scenarios

#### Scenario: Pre-commit blocks malformed code
```gherkin
Given a staged change that fails lint, types, or astro:check
When git commit runs
Then the commit is rejected
```

#### Scenario: Pre-push blocks broken code
```gherkin
Given a commit that fails build, unit tests, spec:coverage, or e2e
When git push runs
Then the push is rejected
```

#### Scenario: Fresh clone is gated
```gherkin
Given a fresh clone
When pnpm install completes
Then git commit and git push run the configured gates with no further setup
```

## Out of Scope

- Chain composition. Which tools run is owned elsewhere.
- E2e reliability (#47). E2e flake will surface as pre-push pain until #47 lands.
