# Feature: Cyan Docs Index / Intro

> Reversed from: https://github.com/villetakanen/cyan-design-system-4/blob/main/apps/cyan-docs/src/content/intro.mdx

## Blueprint

### Context
This page serves as the entry point and general orientation for the Cyan Design System documentation. It explains the purpose of the design system (built for pelilauta.social), documents significant architectural milestones, and provides necessary licensing and repository links.

### Architecture
- **Components:** `app/cyan-ds/src/pages/index.astro` (SSR/CSS)
- **Data Models:** None
- **API Contracts:** None
- **Dependencies:** Relies on the Shell layouts for framing (e.g. `Base.astro`)

### Anti-Patterns
- **Lit Mentions:** The original intro references "Lit" as the underlying framework. For v20, all mentions of Lit must be replaced with the Astro component model and Svelte 5 as progressive enhancement.
- **Obsolete Versioning:** Mentions of "4.0.0" and "Cyan Design System is no longer distributed via npm" should be recontextualized. In v20, Cyan is an internal workspace package (`packages/cyan/`) inside the pnpm workspace instead of a git submodule.

## Contract

### Definition of Done
- [ ] An orientation page is rendered at the root of `app/cyan-ds/` containing the system's purpose.
- [ ] The page clearly states Astro and Svelte 5 as the rendering engines (instead of Lit).
- [ ] Appropriate licensing (MIT) and source code links are provided.

### Regression Guardrails
- The docs root page must always render successfully without requiring client-side JavaScript.

### Testing Scenarios

#### Scenario: Index Page Renders
```gherkin
Given a user visits the root of the cyan-ds app
When the page loads
Then the introductory text and foundational architecture (Astro/Svelte) is visible
And the licensing information is present
```
- **Vitest Unit Test:** None (Structural Astro page)
- **Playwright E2E Test:** `app/cyan-ds/e2e/index.spec.ts`
