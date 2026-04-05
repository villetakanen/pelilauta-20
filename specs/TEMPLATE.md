---
feature: [Feature Name]
# [Optional] Link to the parent specification if this is a sub-feature
parent_spec: [Path to parent spec.md]
# [Optional] URL to the Living Style Book (Required for Design System features)
stylebook_url: [https://...]
---

# Feature: [Feature Name]

## Blueprint

### Context
[Why does this feature exist? What problem does it solve? 1-3 sentences.]

### Architecture
- **Components:** [Key files/modules with paths. State clearly whether they are SSR/CSS (`.astro`) or CSR Progressive Enhancements (`.svelte`)]
- **Data Models:** [Schemas, types — reference file paths, don't duplicate code]
- **API Contracts:** [Endpoints, events, public interfaces]
- **Dependencies:** [What this depends on / what depends on this]

### Book Page
[Provide details about the component's book/story-nook page if it belongs to the Design System]
- **Target path:** [e.g. `app/cyan-ds/src/content/principles/...` or `app/cyan-ds/src/content/components/...`]
- **Structure:** [Outline the standalone demos, inline layout demos, and prop tables]

### Anti-Patterns
- [What agents must avoid when working on this feature, with rationale]

## Contract

### Definition of Done
- [ ] [Observable success criterion]

### Regression Guardrails
- [Critical invariant that must never break]

### Testing Scenarios
All features with behavioral contracts must have corresponding automated tests mapped to their Gherkin scenarios.

#### Scenario: [Name]
```gherkin
Given [Precondition]
When [Action]
Then [Expected outcome]
```
- **Vitest Unit Test:** [Provide the filepath for the colocated `.test.ts` file that covers the isolated functional logic]
- **Playwright E2E Test:** [Provide the filepath for the E2E test in `<app>/e2e/` that covers this browser scenario]
