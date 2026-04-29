---
feature: [Feature Name]
status: [draft | alpha | stable | deprecated]
maturity: [design | implementation | verified]
last_major_review: 2026-04-25
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
- **Components:** [Key files/modules with paths. Default to Svelte 5 for DS components; Astro for structural layouts. All must be 100% SSR-compatible per ADR-001. During active reverse-spec ports, temporary upstream source pointers (for example under `.tmp/`) are allowed if clearly marked as migration references.]
- **Data Models:** [Schemas, types — reference file paths, don't duplicate code]
- **API Contracts:** [Endpoints, events, public interfaces]
- **Dependencies:** [What this depends on / what depends on this]
- **Constraints:** [Security, compliance, or architectural boundaries stated positively as facts. E.g. "Tray toggle uses pure CSS — no JS." Only include constraints not already captured above.]

### Book Page
[Provide details about the component's book/story-nook page if it belongs to the Design System]
- **Target path:** [e.g. `app/cyan-ds/src/content/principles/...` or `app/cyan-ds/src/content/components/...`]
- **Structure:** [Outline the standalone demos, inline layout demos, and prop tables]

## Contract

### Definition of Done
- [ ] [Observable success criterion]

### Regression Guardrails
- [Critical invariant that must never break]

### Testing Scenarios

Specs describe intent. Verification — which test, lint rule, or build check enforces a scenario — lives in code, not in this spec. Each Gherkin scenario below MUST be covered by at least one verification artifact that declares upward via a `Verifies:` tag (see `specs/VERIFICATION.md`). Don't name paths or tools here; the implementer picks them, the artifact declares the link, and `pnpm spec:coverage` builds the inverse map.

#### Scenario: [Name]
```gherkin
Given [Precondition]
When [Action]
Then [Expected outcome]
```
