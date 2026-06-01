> **File and folder organization.** A spec's location reflects its shape:
>
> - **Feature = folder containing `spec.md`.**
> - **Sub-spec of a feature = flat `<name>.md` sibling of `spec.md`.** Use this
>   when a component, aspect, or sub-system deserves its own contract but is
>   not a feature in its own right.
> - **Sub-feature = subfolder with its own `spec.md`.** Use this when the
>   sub-system could plausibly own further sub-specs of its own.
>
> Examples in this repo: `front-page/top-threads-stream/thread-card.md`
> (component sub-spec — ThreadCard belongs to the stream, isn't a feature on
> its own); `channels/channel-page/spec.md` (sub-feature — its own route, its
> own future sub-specs).
>
> Deciding question: *could this thing plausibly own its own sub-specs?*
> Yes → subfolder. No → flat sibling.

---
feature: [Feature Name]
status: [draft | alpha | stable | deprecated]
maturity: [design | implementation | verified]
last_major_review: 2026-04-25
# [Optional] Link to the parent spec for sub-specs and sub-features.
# Flat sibling: `./spec.md`. Subfolder child: `../spec.md`.
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

Specs describe intent. Verification — which test, lint rule, or build check enforces a scenario — lives in code, not in this spec.

Load-bearing contracts (security, data integrity, public API, regression-critical behaviour) should be covered by at least one verification artifact that declares upward via a `Verifies:` tag (see `specs/VERIFICATION.md`). Aspirational, decorative, or visually-validated scenarios may stay un-tagged — the tag system is a *navigation* tool ("which test covers this contract"), not a forcing function that compels a test for every Gherkin block. Cap scenarios at 5-7 per spec; if you need more, the feature is probably more than one spec.

Don't name paths or tools here; the implementer picks them, the artifact declares the link, and `pnpm spec:coverage` builds the inverse map. `pnpm spec:coverage` fails on orphan tags (tag → non-existent scenario heading); it does not fail on un-tagged scenarios.

#### Scenario: [Name]
```gherkin
Given [Precondition]
When [Action]
Then [Expected outcome]
```
