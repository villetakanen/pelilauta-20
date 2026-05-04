---
feature: Image Optimisation Helpers
status: draft
maturity: design
last_major_review: 2026-05-04
parent_spec: ../spec.md
---

# Feature: Image Optimisation Helpers

> Reverse-spec'd from
> `.tmp/pelilauta-17/src/utils/images/netlifyImage.ts` — exports
> `netlifyImage(url, options)` and `generateSrcset(url, widths,
> options)` that build Netlify Image CDN URLs from Firebase
> Storage URLs.

## Blueprint

### Context

Pelilauta hosts user-uploaded images (site posters, avatars,
backgrounds, thread covers, page assets) in Firebase Storage,
then serves them through the Netlify Image CDN for on-the-fly
resizing, format conversion, and quality control. Two helpers
build the CDN URLs:

- `netlifyImage(url, options)` returns a single transformed URL.
- `generateSrcset(url, widths, options)` returns a `srcset`
  string for multiple widths.

The helpers are shape-agnostic — they take a URL and dimension
options, never a domain shape. They live in `packages/utils` so
every consuming surface (sites covers, profile avatars, thread
images, syndicate cards) shares one implementation. v18 ships
them under `src/utils/images/netlifyImage.ts`; v20 ports them
verbatim with one ergonomic addition: a development-mode
pass-through that returns the raw URL unchanged when
`import.meta.env.PROD === false`, so local dev does not require
the Netlify Image CDN to be reachable.

### Architecture

- **Source (v17 / v18):**
  `.tmp/pelilauta-17/src/utils/images/netlifyImage.ts`.
- **v20 target:** `packages/utils/src/images/`.
- **Sub-export:** add `./images` to `packages/utils/package.json`
  exports map (mirrors the existing `./log`, `./sanitizeNext`,
  `./markdownToHTML` shape).
- **Co-located tests:**
  - `packages/utils/src/images/netlifyImage.test.ts`
  - `packages/utils/src/images/generateSrcset.test.ts`

#### API

```ts
export interface NetlifyImageOptions {
  width?: number;
  height?: number;
  format?: 'webp' | 'avif' | 'auto';
  quality?: number;                                       // 1–100
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

export function netlifyImage(
  firebaseUrl: string,
  options?: NetlifyImageOptions,
): string;

export function generateSrcset(
  firebaseUrl: string,
  widths?: number[],            // default: [400, 800, 1600]
  options?: Omit<NetlifyImageOptions, 'width'>,
): string;
```

#### `netlifyImage` behaviour

1. **Invalid input.** When `firebaseUrl` is empty, not a string,
   or otherwise unusable, log a warn via `@pelilauta/utils/log`
   (v17 calls `logWarn`) and return the input value
   verbatim. The caller decides what to do with the result; the
   helper does not throw.
2. **Non-Firebase URL.** When `firebaseUrl` does not contain
   `storage.googleapis.com` or
   `firebasestorage.googleapis.com`, log a warn and return the
   input verbatim. Pelilauta does not transform third-party
   images through its own CDN.
3. **Development mode.** When `import.meta.env.PROD === false`,
   return `firebaseUrl` unchanged. Local development does not
   round-trip through the Netlify Image CDN; the raw Firebase
   Storage URL is what callers receive. (v18 lacked this
   pass-through; the consumer at
   `.tmp/pelilauta-17/src/components/server/ui/SiteCard.astro`
   branched on `import.meta.env.PROD` itself. v20 lifts the
   branch into the helper.)
4. **Production transform.** Otherwise, build a query string with
   the supplied options and return
   `/.netlify/images?<encoded params>`. Param names match the
   Netlify Image CDN: `url`, `w`, `h`, `fm`, `q`, `fit`,
   `position`. Numeric options are rounded with `Math.round(...)`
   before serialisation. Options with falsy or out-of-range
   values are omitted (e.g. `quality: 0` is ignored — the
   Netlify CDN's default applies).

#### `generateSrcset` behaviour

- Iterates over `widths` (default `[400, 800, 1600]`), invokes
  `netlifyImage(firebaseUrl, { ...options, width })` for each,
  and returns a comma-separated `srcset` string of
  `${url} ${width}w` entries.
- Inherits all of `netlifyImage`'s validation, dev pass-through,
  and Firebase-URL gating — by composition, not by duplication.

#### Constraints

- **Pure functions.** No state, no side effects beyond logging
  via `@pelilauta/utils/log`. Calling either helper N times with
  the same arguments returns the same result.
- **SSR-safe.** No browser globals, no DOM APIs, no `fetch`.
  Both helpers are safe inside Astro frontmatter and Node /
  Edge runtimes.
- **No throw on bad input.** Invalid input logs and returns the
  raw value; rendering surfaces remain visually intact even when
  a URL is malformed.
- **Param names track the Netlify Image CDN.** If the upstream
  service renames or extends parameters, this helper updates;
  it does not invent its own shape.
- **Firebase Storage gate is load-bearing.** The third-party-URL
  short-circuit prevents proxying arbitrary external images
  through the platform's CDN budget. Removing the gate would
  expose the CDN to abuse via crafted URLs.

### Dependencies

- `@pelilauta/utils/log` — `logWarn` for invalid-input and
  non-Firebase-URL paths.
- Vite / Astro — `import.meta.env.PROD` for the dev
  pass-through. The helper imports nothing from
  `@astrojs/*`; it relies on the build-time replacement
  semantics that Vite already applies.

### Consumers (initial)

- [`../sites/site-card.md`](../sites/site-card.md) — site cover
  via `netlifyImage` + `generateSrcset`.
- Any future surface that displays a Firebase Storage image
  (profile avatars, thread covers, page assets, handouts).

## Contract

### Definition of Done

- [ ] `packages/utils/src/images/netlifyImage.ts` exists and
      exports `netlifyImage` plus the `NetlifyImageOptions`
      type.
- [ ] `packages/utils/src/images/generateSrcset.ts` exists and
      exports `generateSrcset` (composing `netlifyImage`).
- [ ] `packages/utils/src/images/index.ts` re-exports both
      symbols and the type.
- [ ] `packages/utils/package.json` declares an `./images`
      sub-export pointing at the index.
- [ ] In production (`import.meta.env.PROD === true`), a valid
      Firebase Storage URL produces a transformed URL of the
      shape `/.netlify/images?url=...&...`.
- [ ] In development (`import.meta.env.PROD === false`), a valid
      Firebase Storage URL passes through unchanged.
- [ ] An empty / non-string / non-Firebase URL logs a warn and
      returns the input verbatim, never throws.
- [ ] `generateSrcset(url, widths, options)` returns a
      comma-separated `srcset` string of N entries when `widths`
      has N entries.
- [ ] Co-located tests cover the production transform, dev
      pass-through, invalid-input warn, non-Firebase-URL
      short-circuit, and the srcset composition.

### Regression Guardrails

- The Firebase Storage URL gate (the
  `storage.googleapis.com` /
  `firebasestorage.googleapis.com` check) MUST stay in place.
  Removing it would let arbitrary external URLs route through
  the platform's Netlify Image CDN budget — a cost and abuse
  vector regression.
- Numeric option rounding (`Math.round(width)`,
  `Math.round(height)`, `Math.round(quality)`) MUST stay in
  place. Sub-pixel widths confuse the CDN and produce odd cache
  fragmentation.
- Dev pass-through MUST short-circuit before any URL building.
  Removing it would force every local dev page render through a
  CDN the developer's machine cannot reach, regressing local DX.
- Param names MUST match the Netlify Image CDN's documented
  shape (`url`, `w`, `h`, `fm`, `q`, `fit`, `position`).
  Renaming any of them is a regression — they are the API of
  the upstream service, not internal vocabulary.

### Testing Scenarios

#### Scenario: Production transform of a Firebase Storage URL

```gherkin
Given import.meta.env.PROD is true
And firebaseUrl is "https://firebasestorage.googleapis.com/v0/b/example/o/x.webp?alt=media"
When netlifyImage(firebaseUrl, { width: 800, format: 'webp', quality: 85 }) is called
Then the result starts with "/.netlify/images?"
And the result contains the encoded firebaseUrl as the "url" parameter
And the result contains "w=800"
And the result contains "fm=webp"
And the result contains "q=85"
```

#### Scenario: Development pass-through

```gherkin
Given import.meta.env.PROD is false
And firebaseUrl is "https://firebasestorage.googleapis.com/v0/b/example/o/x.webp?alt=media"
When netlifyImage(firebaseUrl, { width: 800 }) is called
Then the result is firebaseUrl, unchanged
And no "/.netlify/images?" prefix appears in the result
```

#### Scenario: Invalid URL logs and passes through

```gherkin
Given firebaseUrl is "" (or undefined, or a non-string)
When netlifyImage(firebaseUrl) is called
Then a warn is logged via @pelilauta/utils/log
And the input is returned verbatim
And no exception is thrown
```

#### Scenario: Non-Firebase URL short-circuits

```gherkin
Given firebaseUrl is "https://example.com/some-image.jpg"
When netlifyImage(firebaseUrl, { width: 800 }) is called
Then a warn is logged via @pelilauta/utils/log
And the input is returned verbatim
And no "/.netlify/images?" prefix appears in the result
```

#### Scenario: generateSrcset composes one entry per width

```gherkin
Given import.meta.env.PROD is true
And firebaseUrl is a valid Firebase Storage URL
And widths is [170, 300, 450]
When generateSrcset(firebaseUrl, widths, { format: 'webp', quality: 85 }) is called
Then the result is a comma-separated string of 3 entries
And each entry has the form "<netlifyImage url> <width>w"
And the entries appear in the order of the widths array
```

#### Scenario: Sub-pixel width is rounded

```gherkin
Given firebaseUrl is a valid Firebase Storage URL
When netlifyImage(firebaseUrl, { width: 449.7 }) is called in production
Then the result contains "w=450"
And no "w=449.7" or other decimal width appears in the result
```

#### Scenario: Out-of-range quality is omitted

```gherkin
Given firebaseUrl is a valid Firebase Storage URL
When netlifyImage(firebaseUrl, { quality: 0 }) is called in production
Then the result does not contain "q=0"
And no "q=" parameter is set
```
