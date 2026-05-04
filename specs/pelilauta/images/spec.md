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

1. **Non-Firebase URL.** Parse `firebaseUrl` via `new URL(...)`
   inside a `try`/`catch`. If construction throws (malformed
   URL string), or the parsed `host` is neither
   `storage.googleapis.com` nor
   `firebasestorage.googleapis.com`, log a warn via
   `@pelilauta/utils/log` and return the input verbatim.
   Pelilauta does not transform third-party or unparseable
   URLs through its own CDN. The check is **host-exact**, not
   substring — a query-string or path containing
   `firebasestorage.googleapis.com` does NOT pass the gate
   (see §Migration debt vs v18).
2. **Development mode.** When `import.meta.env.PROD === false`,
   return `firebaseUrl` unchanged. Local development does not
   round-trip through the Netlify Image CDN; the raw Firebase
   Storage URL is what callers receive. (v18 lacked this
   pass-through; the consumer at
   `.tmp/pelilauta-17/src/components/server/ui/SiteCard.astro`
   branched on `import.meta.env.PROD` itself. v20 lifts the
   branch into the helper.)
3. **Production transform.** Otherwise, build a query string with
   the supplied options and return
   `/.netlify/images?<encoded params>`. Param names match the
   Netlify Image CDN: `url`, `w`, `h`, `fm`, `q`, `fit`,
   `position`. Numeric options are rounded with `Math.round(...)`
   before serialisation. Options with falsy or out-of-range
   values are omitted (e.g. `quality: 0` is ignored — the
   Netlify CDN's default applies).

The signature accepts only `string`. Callers filter empty,
unset, and sentinel values (`""`, `undefined`, `null`)
upstream — typically by short-circuiting the helper call
itself (`url ? netlifyImage(url, opts) : undefined`), which
matches the v17 SiteCard pattern at
`.tmp/pelilauta-17/src/components/server/ui/SiteCard.astro`.
The helper has no defensive empty-input branch.

#### `generateSrcset` behaviour

- Iterates over `widths` (default `[400, 800, 1600]`), invokes
  `netlifyImage(firebaseUrl, { ...options, width })` for each,
  and returns a comma-separated `srcset` string of
  `${url} ${width}w` entries.
- Inherits all of `netlifyImage`'s validation, dev pass-through,
  and Firebase-URL gating — by composition, not by duplication.

#### Constraints

- **Pure functions.** No state, no side effects beyond logging
  via `@pelilauta/utils/log`. Within a single build,
  calling either helper N times with the same arguments
  returns the same result. (`import.meta.env.PROD` is a
  build-time constant; the dev/prod branch is deterministic
  per build.)
- **SSR-safe.** No browser globals, no DOM APIs, no `fetch`.
  Both helpers are safe inside Astro frontmatter and Node /
  Edge runtimes.
- **No defensive empty-input handling.** The signature accepts
  only `string`. Callers filter `""` / `undefined` / `null`
  upstream. The helper has no branch for "missing URL"; v17
  callers already short-circuit, v20 enforces this at the type
  layer.
- **No throw on legit input.** A URL that satisfies the type
  system but fails Firebase-host validation logs and returns
  verbatim — the helper never throws. Malformed URL strings
  (caught by `new URL` parse failure) take the same warn-and-
  passthrough path.
- **Param names track the Netlify Image CDN.** If the upstream
  service renames or extends parameters, this helper updates;
  it does not invent its own shape.
- **Firebase Storage host gate is load-bearing.** The
  host-exact check (parsed via `new URL`) prevents proxying
  arbitrary external images through the platform's CDN
  budget. Substring matching against the host name (the v18
  approach) is not load-bearing — see §Migration debt vs
  v18.

### Dependencies

- `@pelilauta/utils/log` — `logWarn` for invalid-input and
  non-Firebase-URL paths.
- Vite / Astro — `import.meta.env.PROD` for the dev
  pass-through. The helper imports nothing from
  `@astrojs/*`; it relies on the build-time replacement
  semantics that Vite already applies.

### Consumers (initial)

- [`../sites/site-card/spec.md`](../sites/site-card/spec.md) — site cover
  via `netlifyImage` + `generateSrcset`.
- Any future surface that displays a Firebase Storage image
  (profile avatars, thread covers, page assets, handouts).

### Migration debt vs v18

Three deliberate behavioural divergences from
`.tmp/pelilauta-17/src/utils/images/netlifyImage.ts`:

1. **No defensive empty-input handling.** v18 ran
   `if (!firebaseUrl || typeof firebaseUrl !== 'string')` at
   the top of `netlifyImage`, logging and passing through
   `''` / `undefined` / non-string inputs. v20 drops the
   check; the signature is `string`, callers filter
   upstream. v17's most important caller (SiteCard.astro)
   already short-circuits with `site.posterURL ? ...`, so
   the v18 defensive branch was dead code in practice.
2. **Host-exact gate, not substring matching.** v18's
   `firebaseUrl.includes('firebasestorage.googleapis.com')`
   is unanchored — a URL like
   `https://evil.com/?_=firebasestorage.googleapis.com`
   passes the gate while pointing at an attacker host.
   v20 parses the URL and matches against `host` exactly.
   This closes a real attack vector (CDN budget drain,
   content laundering via Pelilauta-branded CDN paths).
   See V2 in the original /critic review for the full
   threat model.
3. **Dev pass-through lifted into the helper.** v18
   required each consumer to branch on
   `import.meta.env.PROD` themselves (see SiteCard.astro);
   v20 lifts the branch into `netlifyImage` so the dev
   pass-through is automatic. Behavioural change for any
   v18 caller that didn't branch — they now get the dev
   pass-through implicitly.

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
- [ ] Both functions accept `firebaseUrl: string` only —
      TypeScript rejects `undefined` / `null` at compile time.
- [ ] In production (`import.meta.env.PROD === true`), a valid
      Firebase Storage URL produces a transformed URL of the
      shape `/.netlify/images?url=...&...`.
- [ ] In development (`import.meta.env.PROD === false`), a valid
      Firebase Storage URL passes through unchanged.
- [ ] A non-Firebase URL (host parsed via `new URL`, host does
      not exactly match `storage.googleapis.com` /
      `firebasestorage.googleapis.com`) logs a warn and returns
      the input verbatim, without throwing.
- [ ] A URL whose host substring contains
      `firebasestorage.googleapis.com` but whose actual host
      is something else (e.g. `evil.com/?_=firebasestorage.googleapis.com`)
      is rejected via the warn branch. The host gate is
      exact, not substring-based.
- [ ] A malformed URL string (one that throws when passed to
      `new URL`) takes the warn-and-passthrough branch without
      throwing.
- [ ] `generateSrcset(url, widths, options)` returns a
      comma-separated `srcset` string of N entries when `widths`
      has N entries.
- [ ] Co-located tests cover the production transform, dev
      pass-through, host-exact gate (including substring-spoof
      rejection), malformed-URL handling, and the srcset
      composition.

### Regression Guardrails

- The Firebase Storage host gate MUST be **host-exact**: the
  parsed `URL.host` matches one of `storage.googleapis.com` or
  `firebasestorage.googleapis.com` exactly, no substring
  fallback. Substring matching against the host name (v18's
  approach) is leaky — query strings and paths can contain the
  magic substring without the URL actually pointing at Firebase
  Storage. Reverting to substring matching is a regression
  against the documented attack vectors (CDN budget drain via
  spoofed URLs, content laundering through Pelilauta-branded
  CDN paths).
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
- The signature MUST stay narrow (`firebaseUrl: string`).
  Adding `undefined` / `null` defensive handling re-couples the
  helper to a defensive role v20 deliberately removed.

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

#### Scenario: Non-Firebase host short-circuits

```gherkin
Given firebaseUrl is "https://example.com/some-image.jpg"
When netlifyImage(firebaseUrl, { width: 800 }) is called
Then a warn is logged via @pelilauta/utils/log
And the input is returned verbatim
And no "/.netlify/images?" prefix appears in the result
```

#### Scenario: Substring-spoofed URL is rejected (V2 fix)

```gherkin
Given firebaseUrl is "https://evil-but-cheap.com/large.jpg?ref=firebasestorage.googleapis.com"
And the substring "firebasestorage.googleapis.com" is present in the URL's query string but NOT in its host
When netlifyImage(firebaseUrl, { width: 800 }) is called
Then a warn is logged via @pelilauta/utils/log
And the input is returned verbatim
And no "/.netlify/images?" prefix appears in the result
```

#### Scenario: Malformed URL string takes the warn-and-passthrough branch

```gherkin
Given firebaseUrl is "not a url" (a string that throws when passed to new URL())
When netlifyImage(firebaseUrl, { width: 800 }) is called
Then a warn is logged via @pelilauta/utils/log
And the input is returned verbatim
And no exception is thrown
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
