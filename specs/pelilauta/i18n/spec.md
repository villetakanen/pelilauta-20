---
feature: i18n (translation engine, host composition, locale resolution)
parent_spec: ../spec.md
---

# Feature: i18n (translation engine, host composition, locale resolution)

> Reverse-engineered from `pelilauta-17/src/utils/i18n.ts`
> (https://github.com/villetakanen/pelilauta-17/blob/main/src/utils/i18n.ts)
> and the locale registry in `pelilauta-17/src/locales/`.
> v20 reshapes the v17 single-file utility into a shared engine package, per-feature locale exports, a host composition seam, and a UX-only locale resolution chain — so that N feature packages each own their strings, and the viewer's UX language is independent of the content's authored language.

## Blueprint

### Context

Pelilauta is a Finnish-first community platform composed of multiple feature packages (threads, sites, …) loaded by a single Astro host. Each feature package owns its own user-facing strings; the host composes them into a unified registry and exposes a bound `t()` function.

i18n in Pelilauta concerns **the chrome (UX language) only** — buttons, labels, navigation, error messages, dates, numbers. **Content language is independent** and is a property of each `Entry` (see [`models/spec.md`](../models/spec.md)). A Finnish viewer reading an English thread sees Finnish chrome wrapped around English content; URLs are stable regardless of viewer locale.

The translation engine itself is intentionally tiny: dotted, namespaced key lookup with `{var}` substitution. No pluralization, no ICU, no MessageFormat — those concerns are deferred until a real product need appears.

### Architecture

#### Engine package — `packages/i18n/`

- `packages/i18n/src/index.ts` — exports types and `createT(locales, defaultLocale)`.
- Pure TypeScript, zero runtime dependencies, no side effects, no I/O.

#### Per-feature locale exports

Each consuming package ships its strings via a sub-path export:

- `packages/threads/src/i18n/index.ts` — exposes `export const fi`, `export const en` trees.
- `packages/sites/src/i18n/index.ts` — same shape.
- Each package's `package.json` declares an `./i18n` entry under `exports`, so the host can import strings without pulling runtime code.

#### Host composition seam — `app/pelilauta/src/i18n.ts`

- Imports each package's locale module, the host's own `./locales/app` strings, and `createT`.
- Assembles a single `Locales` registry, assigns each package a namespace key (`threads`, `sites`, `app`, …), and exports a bound `t`.
- This file is the **only** place namespace keys are decided — package authors propose, host disposes.

#### UX locale resolution — `app/pelilauta/src/middleware.ts`

A request-scoped Astro middleware resolves the viewer's UX locale once per request and writes it to `Astro.locals.uxLocale`. Pages and components read it from there.

**Resolution chain (in order, first match wins):**

1. **`uxLocale` cookie** — set by an explicit user choice via the locale-switcher UI.
2. **`Accept-Language` header** — first supported locale that appears, parsed from the standard quality-ordered list.
3. **Default** — `"fi"`.

A logged-in user's saved preference is **deferred** — the `packages/preferences` integration is not part of this iteration. When added later, it slots in as step 0 of the chain.

The middleware also exposes `Astro.locals.contentLocale = uxLocale` as the **default** content lang for pages that render content without a known per-entry language. Components rendering a known `Entry` use `entry.locale` instead.

#### DOM lang attribution

- **`<html lang={Astro.locals.uxLocale}>`** — set in the base layout. One rule, every page.
- **Content components stamp `lang={entry.locale}` on their root element, always** — even when it equals `uxLocale`. The component knows its own content's locale and shouldn't need to also know what's above it on the tree.
- This is per the HTML spec (`lang` is inheritable, override on subtrees). Screen readers, hyphenation, and spellcheck respect the override.

#### Locale switcher

A UI control (in the host or a future DS component) that:

1. Writes the `uxLocale` cookie (`Path=/; Max-Age=31536000; SameSite=Lax`).
2. Triggers a navigation to the same URL — the next request resolves the new locale through the chain.

No URL prefixes. No redirects.

#### Data Models

- `NestedTranslation = string | { [k: string]: NestedTranslation }`
- `Locale = { [namespace: string]: NestedTranslation }`
- `Locales = { [locale: string]: Locale }`
- `LocaleSubstitutions = { [k: string]: string | number }`
- `Astro.locals.uxLocale: string` — typed via `env.d.ts` augmentation of `App.Locals`.

#### API Contracts

- **`createT(locales: Locales, defaultLocale: string): TFn`** — returns a bound `t`.
- **`t(key: string, subs?: LocaleSubstitutions, currentLocale?: string): string`**
- Key grammar: `key := [namespace ":"] segment ("." segment)*`. If no `:` is present, namespace defaults to `"app"`.
- Lookup order: `currentLocale` → `defaultLocale`. Missing in both → returns the input `key` verbatim.
- Substitution: every `{name}` token replaced globally with the stringified value.
- Each package's `./i18n` sub-export shape: `export const fi: NestedTranslation; export const en: NestedTranslation;`
- Middleware contract: every request gets `Astro.locals.uxLocale` set to a non-empty string. Never undefined.

#### Dependencies

- `packages/i18n` depends on nothing.
- Feature packages depend on `packages/i18n` only for the `NestedTranslation` type.
- Host depends on `packages/i18n` + every feature package's `./i18n` sub-export.
- DS package (`packages/cyan`) does **not** depend on `packages/i18n`. AppShell and other DS components are i18n-agnostic and accept user-facing text via props/slots.

#### Constraints

- **Default UX locale is `fi`** — the canonical authoring locale and the final fallback.
- **UX locale and content locale are independent.** UX locale never appears in URLs; URLs are locale-stable. Content locale is a per-`Entry` property.
- **No URL-prefix routing.** Astro's built-in `i18n` routing config is **not used** — its model assumes locale-bound URLs, which Pelilauta does not have. Locale lives in `Astro.locals`, not in the URL.
- **No automatic redirects on first visit.** `Accept-Language` informs the initial resolution but does not trigger a redirect. URLs remain CDN-cacheable.
- **Pure & SSR-safe engine:** no `window`, `document`, async, or I/O. Deterministic for a given `(key, subs, currentLocale, locales)` tuple.
- **Active locale is supplied by the caller.** The engine itself reads no cookies, headers, or stores — the middleware does that and passes the result to `t`.
- **Static composition only.** Locale registries are assembled via static imports at module load. No `registerNamespace()`, no runtime mutation, no codegen.
- **The host owns namespace keys.** Two packages cannot collide on a namespace.
- **DS carries no locale strings.** Locale-bound text in `AppShell` (and other DS components) is supplied by the host via props/slots.
- **Missing key returns the key string** — never `undefined`, never throws.
- **Hreflang is not emitted by default.** Content URLs have no per-locale equivalent (a Finnish thread has no English version), so hreflang is meaningless on content pages. Pure-chrome pages with parallel translations may emit hreflang once they exist; deferred until then.

## Contract

### Definition of Done

- [ ] `packages/i18n` exports `createT`, `NestedTranslation`, `Locale`, `Locales`, `LocaleSubstitutions`, `TFn`.
- [ ] `createT(locales, 'fi')` returns a `t` function matching the contract above.
- [ ] `app/pelilauta/src/i18n.ts` composes locales from feature packages' `./i18n` sub-exports plus host-owned `./locales/app`, and exports a bound `t`.
- [ ] `packages/threads` and `packages/sites` each ship a `./i18n` sub-path export with `fi` and `en` trees.
- [ ] `app/pelilauta/src/middleware.ts` resolves `Astro.locals.uxLocale` per request via the chain (cookie → `Accept-Language` → `'fi'`).
- [ ] Base layout emits `<html lang={Astro.locals.uxLocale}>`.
- [ ] Content components stamp `lang={entry.locale}` on their root element, always.
- [ ] `App.Locals` is augmented in `env.d.ts` with a `uxLocale: string` field.
- [ ] `packages/cyan` does not depend on `packages/i18n`.

### Regression Guardrails

- `t` MUST never throw for any string input — unknown namespaces, malformed keys, undefined locales all return the input key.
- The default UX locale constant MUST remain `fi` unless a product decision changes the canonical authoring locale.
- The `t(key, subs?, currentLocale?)` signature is part of the public contract; reordering or removing parameters is breaking. _("Breaking" here means every caller breaks at compile time and must be fixed in the same PR — there is no external consumer to coordinate with.)_
- DS components MUST NOT import from `packages/i18n` or hard-code user-facing strings — regression here breaks the i18n-agnostic DS boundary.
- Namespace assignment MUST live in the host composition file. A feature package MUST NOT assume its own namespace key.
- URLs MUST NOT carry a locale prefix. Adding one would couple URL identity to UX language, which the architecture explicitly rejects.
- The middleware MUST NOT issue redirects based on `Accept-Language` — it sets `Astro.locals.uxLocale` and lets the page render. Redirects break CDN caching.

### Testing Scenarios

#### Scenario: Resolve a nested key in the active locale
```gherkin
Given a Locales registry where fi.app.greeting.morning is "Huomenta"
When createT(locales, "fi")("app:greeting.morning", undefined, "fi") is called
Then it returns "Huomenta"
```
- **Vitest Unit Test:** `packages/i18n/src/index.test.ts`

#### Scenario: Default namespace is `app`
```gherkin
Given a Locales registry where fi.app.title is "Pelilauta"
When t("title", undefined, "fi") is called
Then it returns "Pelilauta"
```
- **Vitest Unit Test:** `packages/i18n/src/index.test.ts`

#### Scenario: Fall back to default locale when key missing in current locale
```gherkin
Given fi.app.onlyFi is "Vain suomeksi" and en.app.onlyFi is undefined
When t("app:onlyFi", undefined, "en") is called
Then it returns "Vain suomeksi"
```
- **Vitest Unit Test:** `packages/i18n/src/index.test.ts`

#### Scenario: Missing in both locales returns the key
```gherkin
Given no translation exists for "app:does.not.exist" in any locale
When t("app:does.not.exist") is called
Then it returns "app:does.not.exist"
```
- **Vitest Unit Test:** `packages/i18n/src/index.test.ts`

#### Scenario: Substitute placeholders globally
```gherkin
Given fi.app.welcome is "Hei {name}, tervetuloa {name}!"
When t("app:welcome", { name: "Ada" }, "fi") is called
Then it returns "Hei Ada, tervetuloa Ada!"
```
- **Vitest Unit Test:** `packages/i18n/src/index.test.ts`

#### Scenario: Numeric substitution coerces to string
```gherkin
Given fi.app.unread is "Sinulla on {n} uutta viestiä"
When t("app:unread", { n: 3 }, "fi") is called
Then it returns "Sinulla on 3 uutta viestiä"
```
- **Vitest Unit Test:** `packages/i18n/src/index.test.ts`

#### Scenario: Traversal hits a string before exhausting the path
```gherkin
Given fi.app.title is the string "Pelilauta"
When t("app:title.sub", undefined, "fi") is called
Then it returns "app:title.sub"
```
- **Vitest Unit Test:** `packages/i18n/src/index.test.ts`

#### Scenario: Host composes per-package locale exports into one registry
```gherkin
Given packages/threads/i18n exports { fi: { list: { empty: "Ei keskusteluja" } } }
And the host assigns it to namespace "threads" in app/pelilauta/src/i18n.ts
When t("threads:list.empty", undefined, "fi") is called via the host-bound t
Then it returns "Ei keskusteluja"
```
- **Vitest Unit Test:** `app/pelilauta/src/i18n.test.ts`

#### Scenario: Middleware resolves uxLocale from the cookie when present
```gherkin
Given an incoming request with cookie "uxLocale=en"
And an Accept-Language header of "fi-FI,fi;q=0.9"
When the middleware runs
Then Astro.locals.uxLocale equals "en"
```
- **Vitest Unit Test:** `app/pelilauta/src/middleware.test.ts`

#### Scenario: Middleware falls back to Accept-Language when no cookie
```gherkin
Given an incoming request with no uxLocale cookie
And an Accept-Language header of "en-US,en;q=0.9,fi;q=0.5"
When the middleware runs
Then Astro.locals.uxLocale equals "en"
```
- **Vitest Unit Test:** `app/pelilauta/src/middleware.test.ts`

#### Scenario: Middleware falls back to "fi" when no signals
```gherkin
Given an incoming request with no uxLocale cookie
And no Accept-Language header (or only unsupported locales)
When the middleware runs
Then Astro.locals.uxLocale equals "fi"
```
- **Vitest Unit Test:** `app/pelilauta/src/middleware.test.ts`

#### Scenario: Middleware never issues a redirect
```gherkin
Given any incoming request to any URL
When the middleware runs
Then the response status is whatever the page returns (never 301/302 from i18n)
And the URL path is unchanged
```
- **Vitest Unit Test:** `app/pelilauta/src/middleware.test.ts`

#### Scenario: Base layout emits html lang from uxLocale
```gherkin
Given a request resolves to Astro.locals.uxLocale = "en"
When any page rendered through the base layout is fetched
Then the response HTML root element is <html lang="en">
```
- **Playwright E2E Test:** `app/pelilauta/e2e/i18n-html-lang.spec.ts`

#### Scenario: Content component stamps its own lang
```gherkin
Given a thread entry with locale = "en" rendered on a page where uxLocale = "fi"
When the page is fetched
Then the article element wrapping the thread body has lang="en"
And the surrounding chrome (nav, aside) inherits lang="fi" from <html>
```
- **Playwright E2E Test:** `app/pelilauta/e2e/i18n-content-lang.spec.ts`

#### Scenario: Locale switcher persists via cookie
```gherkin
Given an anonymous user on a page rendered in fi
When they activate the locale switcher and select "en"
Then a uxLocale=en cookie is set with Path=/ and a long Max-Age
And subsequent navigations render in en until the cookie is cleared
```
- **Playwright E2E Test:** `app/pelilauta/e2e/i18n-switcher.spec.ts`
