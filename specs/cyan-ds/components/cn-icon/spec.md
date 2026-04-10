# Feature: cn-icon (v20)

## Blueprint

### Context
Standardizes icon delivery across the RPG community platform. Replaces static assets with a deterministic, "source-code-first" architecture. This enables high-performance SSR rendering, type-safe icon nouns, and granular styling (monochromatic and branded).

### Architecture (3-Tier Resolution)
- **Component Type**: Svelte 5 (Runes)
- **File**: `packages/cyan/src/components/CnIcon.svelte` (SSR-only primitive)
- **Tier 1 (Community MIT):** `packages/pelilauta-icons/` (Local workspace package. Icons are stored as **raw .svg files** and registered in a TypeScript manifest).
- **Tier 2 (Managed Non-MIT):** `@myrrys/proprietary` (External subrepo. Icons are stored as **raw .svg files** for proprietary and fair-use assets).
- **Tier 3 (Essential Fallback):** `packages/cyan/src/components/CnIconFallback.ts` (Essential, MIT-licensed path data defined directly in TypeScript).
- **Dependencies:** Uses `--cn-icon-size-*` tokens from the design system for standardized scaling.

### Registry Codegen
Icon registries are **generated**, not hand-maintained. A single script reads `.svg` files from each package and produces a typed TypeScript entry point with inlined SVG content.

- **Script:** `scripts/generate-icon-registry.ts`
- **Run:** `pnpm gen:icons` — regenerate after adding/removing SVGs.
- **Check:** `pnpm check:icons` — CI guard, exits nonzero if registries are stale.
- **Output:** Each package's `index.ts` is overwritten with a typed `IconNoun` union, `getIcon()`, `getNouns()`, and `contents` exports.
- **Generated files are committed** — consumers do not need to run codegen before builds.

### Sources vs. Assets
Unlike the asset-based model of v4, v20 treats icons as **source code fragments**:
- **Source:** Standard `.svg` files in the icon repositories (enabling easy design tooling sync).
- **Delivery:** These files are read and **inlined** at codegen time into typed TypeScript registries. They are never served as standalone `.svg` network requests.

### API Contract (Props)
- `noun` (string): The unique identifier for the icon (e.g., `'account'`, `'sword'`).
- `size` (enum): `'xsmall' | 'small' | 'medium' (default) | 'large' | 'xlarge'`.

### Theming & Rendering Strategy
`CnIcon` automatically switches its rendering logic based on the identified icon's data structure:
1. **Monochrome Data:** Renders with `fill="currentColor"` for direct inheritance from the parent text color. Supports a single `path` or a simple group.
2. **Branded Data:** Renders multiple paths using internal CSS variables or specific attributes like **`fill-opacity`** and **`stroke`** (handled by the source data). Responds to `light-dark()` modes defined in the source registry.

### Anti-Patterns
- **No External SVGs:** Do not Use `<img>` or `object` tags to load icons. Icons must be inlined for SSR performance and styling fluidity.
- **No Inline Magic Numbers:** Size and color must derive from tokens.

## Contract

### Definition of Done
- [ ] `CnIcon` resolution order: Tier 1 (`@pelilauta/icons`) -> Tier 2 (`@myrrys/proprietary`) -> Tier 3 (`CnIconFallback.ts`).
- [ ] If no fallback exists, it renders a "missing" glyph (e.g., a square with a diagonal line).
- [ ] Renders monochromatic vs branded outputs **automatically** based on the resolved icon data format.
- [ ] Correctly applies `light-dark()` variables for branded icons as defined in the source registry.

### Regression Guardrails
- **Layout Locking:** Icons must avoid CLS (Cumulative Layout Shift) by having defined aspect ratios even in SSR.
- **Color Inheritance:** `currentColor` must be the absolute default for the monochrome variant.

### Testing Scenarios

#### Scenario: Icon Resolution and Fallback
```gherkin
Given a request for icon "xyz-unknown"
  And "xyz-unknown" does not exist in cyan-icons or fallback
  When the CnIcon component is rendered
  Then it renders the "missing" glyph
    And the SSR throughput is not impacted by heavy asset loading
```
- **Vitest Unit Test:** `packages/cyan/src/components/CnIcon.test.ts` (to verify resolution logic and fail-open/fail-closed states)
- **Playwright E2E Test:** `app/cyan-ds/e2e/components/icon.spec.ts` (to verify visually across light/dark modes)

## Fixtures / Sample Data

These icons from `pelilauta-17` serve as the foundational test cases for the 3-tier registry.

| Noun | Tier | Source URL | Style Note |
|---|---|---|---|
| `fox` | 1 | [fox.svg](https://raw.githubusercontent.com/villetakanen/pelilauta-17/main/public/icons/fox.svg) | Complex multi-polygon monochrome (MIT). |
| `mekanismi` | 1 | [mekanismi.svg](https://raw.githubusercontent.com/villetakanen/pelilauta-17/main/public/icons/mekanismi.svg) | Branded (Modernized depth version, MIT). |
| `add` | 1 | [add.svg](https://raw.githubusercontent.com/villetakanen/pelilauta-17/main/public/icons/add.svg) | Simple functional icon (MIT). |

### Book Page & Documentation
A living book page is required to demo this component, following the principles from the Cyan v4 Iconography guide.

- **Target Path:** `app/cyan-ds/src/pages/components/cn-icon.mdx`
- **Layout:** `app/cyan-ds/src/layouts/Book.astro`

#### Required Demo Sections:
1. **Overview** — High-level purpose of the `CnIcon` component and its 3-tier system.
2. **Sizing Matrix** — Grid of all available sizes (`xsmall` to `xlarge`) rendered with the `fox` fixture for scale comparison.
3. **Grid Alignment Demo** — Visualization of icons on the 8px baseline grid to verify centering and layout locking.
4. **Thematic Branding** — Side-by-side comparison of the `mekanismi` icon in Light and Dark modes to demonstrate automatic color-shifting.
5. **Tiered Icon Galleries** — Three automated sections listing all available nouns for each registry:
   - **Community MIT (Tier 1)** — Icons from `@pelilauta/icons`.
   - **Managed Assets (Tier 2)** — Proprietary and fair-use icons from `@myrrys/proprietary`.
   - **Core Fallbacks (Tier 3)** — Essential symbols defined in `CnIconFallback.ts`.

### Technical Details (ViewBox & Scale)
- **Standard ViewBox:** `0 0 128 128` (Matches high-fidelity Illustrator exports).
- **Default Fill:** `currentColor` (Inherited from parent container).

### Security / Trust Boundary

`CnIcon.svelte` uses Svelte's `{@html}` tag to inline raw SVG content into the DOM, which bypasses standard HTML escaping. This is an **intentional and accepted architectural trade-off** under the following constraints:

1. **Source must be repo-internal:** SVG content may only come from workspace packages (`@pelilauta/icons`, `@myrrys/proprietary`) or the hardcoded `CnIconFallback.ts`. User-supplied or externally-fetched SVGs must **never** be passed through this path.
2. **No runtime path injection:** The `noun` prop maps to a compile-time-constant registry key. There is no mechanism for a caller to supply an arbitrary file path.
3. **Trust model:** A compromised SVG file carries the same threat as a compromised Svelte component — both require supply-chain access to the repository. This is an acceptable shared trust boundary for a closed design system.

**If the trust model changes** (e.g., user-uploaded icons, external CDN assets), SVG content **must** be sanitized before passing to `{@html}`. A suitable sanitizer should strip `<script>`, `<a>`, `<use>`, `<image>`, `<foreignObject>`, and `xlink:href` attributes.
