# Verification Convention

> Specs describe **intent**: contracts, scenarios, regression guardrails. They do not name verification artifacts. The mapping from a Gherkin scenario to the thing that enforces it lives in code (or in the registry below for artifacts that can't carry comments). This keeps specs stable across toolchain changes and gives implementers full latitude to pick the lightest verification mechanism.

## Convention

Every Gherkin scenario in `specs/**/spec.md` is a contract. Each contract MUST have at least one **verification artifact** that fails when the scenario's Then-clause is violated.

A verification artifact declares the scenario it covers via a structured comment:

```ts
// Verifies: specs/pelilauta/auth-package/spec.md §Server barrel rejects client-side imports
```

Equivalent comment styles for languages that don't accept `//`:

| File type | Form |
|---|---|
| `.ts`, `.svelte`, `.astro`, `.css` | `// Verifies: <spec-path> §<scenario heading>` |
| `.md`, `.html` | `<!-- Verifies: <spec-path> §<scenario heading> -->` |
| `.yaml`, `.sh` | `# Verifies: <spec-path> §<scenario heading>` |
| `.json` (no comments) | registry entry below |

Multiple `Verifies:` lines in one artifact are fine; a single test or rule can cover several scenarios.

## Tooling

- `pnpm spec:coverage` walks `specs/**/spec.md` for `#### Scenario: <name>` headings, walks the codebase for `Verifies:` tags, reads the registry below, and prints the inverse map. It exits non-zero on **orphan tags** (an artifact pointing at a scenario that doesn't exist — usually a typo or a renamed heading). It does NOT currently fail on uncovered scenarios; that's intentional during the rollout while legacy specs still use the old `**Vitest Unit Test:**` / `**Playwright E2E Test:**` slots.

- Legacy specs (those still using the old slot labels) are grandfathered. New scenarios — and any scenario whose owning spec is being touched — use the inverted convention: spec stays silent on verification, artifact tags upward.

## Registry — comment-less artifacts

Artifacts whose file format doesn't accept comments map their coverage here. One entry per scenario covered.

- `biome.json` overrides[].includes=`packages/auth/src/server/**/*.ts` (the `noRestrictedImports` rule):
  - Verifies: `specs/pelilauta/auth-package/spec.md` §Server barrel rejects client-side imports
