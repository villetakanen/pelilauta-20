# Context Engineering Status

**Date:** 2026-04-02
**Branch:** feat/skills
**Scope:** Cyan DS backport (Lit → Astro/Svelte), agent drift root cause analysis

---

## Summary

The v20 DS demo page is broken primarily because the context given to agents is internally contradictory and under-specified. Agents drift not because they lack spec files, but because the specs, AGENTS.md, and the actual code all disagree with each other on fundamentals: which token namespace to use, how the tray toggles, and where to route spec authority for the docs app. Each contradiction is a fork in the road where an agent guesses — usually wrong.

---

## Critical Flaws

### 1. AGENTS.md Context Map Routes the Docs App to the Wrong Spec Directory

**File:** `AGENTS.md` (line 22)

```yaml
app/cyan-ds/**: specs/cyan-ds/
```

The `cyan-ds` app is the documentation site. Its spec authority is `specs/cyan-app/`. The `specs/cyan-ds/` directory contains the design system component contracts (the DS package), not docs app page specs.

Every agent that reads AGENTS.md and then works on `app/cyan-ds/` will look for context in the wrong directory. The `/spec` command's co-spec rule (section 6) correctly identifies `specs/cyan-app/` as the docs app spec home — but AGENTS.md overrides this with the wrong path.

**Fix:** Change to `app/cyan-ds/**: specs/cyan-app/`.

---

### 2. Token Namespace Not Documented (All Non-`--cn-*` Are Deprecated)

`--cn-*` is the only active token namespace. `--cyan-*` and `--color-*` are deprecated. This was not stated in AGENTS.md, so agents mixed all three freely:

- `Button.svelte` uses `--cyan-primary`, `--cyan-on-primary` — deprecated
- `index.astro` uses `--cyan-space-md` mixed with `--cn-border-radius-medium`

**Fix:** Added to AGENTS.md. `Button.svelte` needs a token migration pass.

---

### 3. The Tray Toggle Does Not Work (CSS mechanism missing)

**Components:** `Tray.astro`, `TrayButton.astro`

Both components are pure Astro (SSR-only). The `expanded` prop is serialized to `aria-expanded` at build time and is static in the browser. Clicking the TrayButton does nothing.

The tray must be CSS-only — no JavaScript. The correct implementation is a hidden `<input type="checkbox">` + `:has(:checked)` pattern (or `<details>`), where the TrayButton becomes a `<label>` targeting the checkbox. CSS then drives `aria-expanded` via the `:has()` selector.

The current implementation renders the right HTML structure and animation CSS, but has no CSS state mechanism wired up. The component is purely declarative with no toggle pathway.

**Fix:** Implement CSS toggle in `Tray.astro`: hidden checkbox, `<label>` on the button, `:has(input:checked)` selector replacing the `[aria-expanded="true"]` CSS hooks. No `<script>` blocks.

---

### 4. ~~Invalid CSS in `@container` Query~~ (retracted)

The container query breakpoint using `var()` is an intentional design decision and must not be changed.

---

### 5. Shell Spec Documents Phantom Functionality

**File:** `specs/shell/spec.md` — "Tray Orchestration" section

The spec describes:
> Base.astro reads `trayExpanded` from the preferences store, passes it to `<Tray>`, listens for toggle clicks, and updates the store.

`Base.astro` is 59 lines. It has no preferences store import, no event listeners, no store integration. The `trayExpanded` prop exists but it is a pass-through prop — the consuming page must handle state.

Agents that read this spec will assume this wiring exists and write code that calls it. This spec section is aspirational documentation presented as implemented fact.

**Fix:** Mark the Tray Orchestration section as `[NOT YET IMPLEMENTED]` or move it to the preferences spec as a future contract. Remove or clearly defer it until implemented.

---

### 6. `Button.svelte` Is a Hallucinated Component and Should Not Exist

`Button.svelte` has no spec and should never have been a Svelte component. A button has no complex reactive state — it does not meet the bar for Svelte (see UI Architecture rule). The agent that created it skipped `/reverse-spec`, did not check how cyan 4 implements buttons, and invented a wrapped component using deprecated `--cyan-*` tokens.

Cyan 4 implements buttons as CSS classes on native `<button>` elements (`.text`, `.cta`, icon variants). The correct v20 equivalent is a CSS styling set at `packages/cyan/src/css/button.css` using `--cn-*` tokens — reverse-specced from cyan 4, not invented.

**`Button.svelte` should be deleted.** The export in `index.ts` and all usages in `index.astro` should be removed. The replacement is:
- `packages/cyan/src/css/button.css` — reverse-specced from cyan 4
- `specs/cyan-ds/css/button/spec.md` — DS spec
- `specs/cyan-app/css/button/spec.md` — docs page spec
- `app/cyan-ds/src/pages/css/button.mdx` — docs page

This is the canonical example of the hallucination pattern: no upstream reference → agent invents → wrong abstraction layer, wrong tokens, no spec.

---

### 7. `plans/` Has No Status in the Context Model

The `plans/ds-spec-clearing.md` document is a detailed, correct tactical plan. But nothing in AGENTS.md, the commands, or the spec hierarchy tells an agent what `plans/` is or whether to read it. Agents asked to work on DS components will not discover this plan.

Similarly, nothing enforces or tracks execution of the plan. Steps 1-7 are defined but not marked done/pending in any machine-readable way.

**Fix:** Either reference the clearing plan from AGENTS.md explicitly, or convert its action items into specs (which have formal authority). A plan that isn't read isn't a plan.

---

### 8. The `spec.md` Command Has an Unresolvable Tension

**File:** `.claude/commands/spec.md` (section 2)

> Do NOT fetch external URLs or explore upstream repos — use only what is in the working tree.

**File:** `.claude/commands/reverse-spec.md` (section 1)

> Fetch the raw file content from GitHub.

These are complementary commands, but an agent using `/spec` to bootstrap a new component from cyan-4 source will follow the "no external URLs" rule and produce a spec based purely on local inference. The `/reverse-spec` command is the correct tool for that job but requires the user to supply the URL — creating a workflow dependency on human judgment at every migration step.

The commands don't tell each other apart. An agent in a new session doesn't know to use `/reverse-spec` vs `/spec` for a migration task unless the user explicitly invokes the right one.

**Fix:** Add a decision rule to `/spec`: "If this is a migration from a prior version (cyan-4, pelilauta-17), use `/reverse-spec` instead."

---

### 9. Dual Tooling Drift (.claude vs .opencode)

The git status shows both `.claude/commands/` and `.opencode/commands/` contain `spec.md` and `reverse-spec.md`, both modified. These are parallel command systems for Claude Code and OpenCode respectively.

If these files drift out of sync (they are already modified independently per git status), agents running in different tooling will receive different instructions for the same operations. The co-spec rule in one system may not match the other.

**Fix:** Keep one canonical source (e.g. `.claude/commands/`) and treat `.opencode/commands/` as a symlink or generated copy. Or document explicitly in AGENTS.md that both must be kept in sync when updating commands.

---

### 10. The Demo Page Architecture Is Stuck in an Undecided State

`app/cyan-ds/src/pages/index.astro` currently embeds full component demos (Button variants, Tray collapsed/expanded states). The `ds-spec-clearing.md` plan says these should move to `/components/*` pages. The `specs/cyan-app/spec.md` still lists the index as a "landing page" but doesn't say component demos are forbidden there.

Result: agents touching `index.astro` continue adding demos there because:
- It's the only page with demos
- The spec doesn't say "no demos here"
- The `/components/` pages don't exist yet

The ambiguity causes index.astro to accumulate demos every time an agent demonstrates something new.

**Fix:** The `specs/cyan-app/spec.md` must explicitly state: "Index is a landing page only — no component demos. All component demos live at `/components/{name}.mdx`." Then create the `/components/` pages so agents have somewhere to put demos.

---

## Cyan 4 → v20 Backport Gap Assessment

Cyan 4 (live at cyan-4.netlify.app) has 22 web components, 18 style subsections, and 4 top-level navigation sections. The docs site follows a consistent page structure: introduction, properties table, slots, interactive states, full example, CSS custom property reference.

v20 has 3 components, no per-component docs pages, and a single index page acting as catch-all demo surface.

### Component Parity

| Cyan 4 Component | v20 Status | Notes |
|---|---|---|
| `cn-tray-button` | Partial (`TrayButton.astro`) | Static only; toggle broken |
| Tray CSS layout | Partial (`Tray.astro`) | Wide-viewport rule broken |
| Buttons | Partial (`Button.svelte`) | Legacy tokens, no dark mode |
| `cn-app-bar` | Not started | Only `TopNav.svelte` stub |
| App rail (nav) | Not started | No spec |
| `cn-card` | Not started | — |
| `cn-avatar`, `cn-avatar-button` | Not started | — |
| `cn-menu` | Not started | — |
| `cn-toggle-button` | Not started | — |
| `cn-snackbar` | Not started | — |
| `cn-loader` | Not started | — |
| 12 other components | Not started | — |

### Docs Site Parity

| Cyan 4 Docs Pattern | v20 Status |
|---|---|
| Per-component pages with props table | Not started — blocked by #10 above |
| Interactive demos per component | Not started |
| Principles (typography, spacing, color) | Partial — MDX pages exist for tokens |
| CSS custom property reference per component | Not started |
| Application layout patterns | Not started |

### Key Scope Note

Cyan 4's game-specific components (`cn-d20-ability-score`, `cn-dice`, `cn-stat-block`, `cn-story-clock`) are Pelilauta-specific and should eventually exist in v20, but are lower priority than the core navigation/layout system (app bar, rail, tray, card).

---

## Priority Actions

Ordered by unblocking value:

1. **Fix AGENTS.md context map** — `app/cyan-ds/**: specs/cyan-app/` — 2 min, prevents every future agent from looking in the wrong place.

2. **Add token namespace rule to AGENTS.md** — One paragraph stating: use `--color-*` for color, `--cn-*` for structure, `--cyan-*` tokens in `colors.css` are deprecated and must not be used in new component work.

3. **Implement Tray toggle** — Add `<script>` to `Tray.astro` that handles button click → toggle `aria-expanded` on `.cn-tray`. ~10 lines. Unblocks all tray scenarios and makes the demo usable.

4. **Fix `@container` breakpoint syntax** — Replace `var(--cn-breakpoint-tray-wide)` with `64rem` hardcoded and add a comment citing the CSS limitation.

5. **Create Button and TrayButton specs** — Execute steps 1-2 of `plans/ds-spec-clearing.md`. Without these, agents inventing Button changes will perpetuate the legacy token usage.

6. **Mark Shell spec Tray Orchestration as deferred** — Prevents agents from writing code against an interface that doesn't exist.

7. **Create `/components/` pages in cyan-ds app** — Execute ds-spec-clearing.md steps 3-5. Gives agents a correct target for demos and unblocks the index cleanup.

---

## Structural Recommendation

The current spec system is well-designed but it has a "last mile" problem: specs exist, plans exist, but there is no connection between them and running code verification. An agent completing a task has no way to know whether the component it just wrote satisfies the spec scenarios — there are no e2e tests, no Playwright scenarios, and no automated lint rule checking spec compliance.

Until there are tests that encode the spec contracts (especially the Tray Gherkin scenarios), agents will drift on every pass because the feedback loop is missing. The `/critic` command helps, but it requires deliberate invocation after each change.

Consider adding a `pnpm test:e2e` Playwright suite that covers at minimum:
- Tray toggle (open, close, keyboard)
- Button renders all variants
- TopNav renders app name

These three tests would catch the most common agent regressions without significant test infrastructure investment.
