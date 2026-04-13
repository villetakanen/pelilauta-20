---
feature: i18n (translation engine + host composition)
parent_spec: ../spec.md
---

# Feature: i18n (translation engine + host composition)

> Reverse-engineered from `pelilauta-17/src/utils/i18n.ts`
> (https://github.com/villetakanen/pelilauta-17/blob/main/src/utils/i18n.ts)
> and the locale registry in `pelilauta-17/src/locales/`.
> v20 reshapes the v17 single-file utility into a shared engine package + per-feature locale exports + a host composition seam, so that N feature packages (`threads`, `sites`, …) can each own their own strings.

## Blueprint

### Context

Pelilauta is a Finnish-first community platform composed of multiple feature packages (threads, sites, …) loaded by a single Astro host. Each feature package owns its own user-facing strings; the host composes them into a unified registry and exposes a bound `t()` function.

The engine itself is intentionally tiny: dotted, namespaced key lookup with `{var}` substitution. No pluralization, no ICU, no MessageFormat — those concerns are deferred until a real product need appears.

### Architecture

- **Engine package: `packages/i18n/`**
  - `packages/i18n/src/index.ts` — exports types and `createT(locales, defaultLocale)`.
  - Pure TypeScript, zero runtime dependencies, no side effects, no I/O.
- **Per-feature locale exports** (each consuming package, sub-path export):
  - `packages/threads/src/i18n/index.ts` — exposes `export const fi`, `export const en` trees.
  - `packages/sites/src/i18n/index.ts` — same shape.
  - Each package's `package.json` declares an `./i18n` entry under `exports`, so the host can import strings without pulling runtime code.
- **Host composition seam: `app/pelilauta/src/i18n.ts`**
  - Imports each package's locale module, the host's own `./locales/app` strings, and `createT`.
  - Assembles a single `Locales` registry, assigns each package a namespace key (`threads`, `sites`, `app`, …), and exports a bound `t`.
  - This file is the **only** place namespace keys are decided — package authors propose, host disposes.
- **Active locale source:** Astro's built-in i18n routing (`astro.config.mjs` → `i18n: { locales: ['fi','en'], defaultLocale: 'fi' }`). Pages call `t(key, subs, Astro.currentLocale)`. Svelte islands receive `locale` via prop drilling from their Astro parent.
- **Data Models:**
  - `NestedTranslation = string | { [k: string]: NestedTranslation }`
  - `Locale = { [namespace: string]: NestedTranslation }`
  - `Locales = { [locale: string]: Locale }`
  - `LocaleSubstitutions = { [k: string]: string | number }`
- **API Contracts:**
  - **`createT(locales: Locales, defaultLocale: string): TFn`** — returns a bound `t`.
  - **`t(key: string, subs?: LocaleSubstitutions, currentLocale?: string): string`**
  - Key grammar: `key := [namespace ":"] segment ("." segment)*`. If no `:` is present, namespace defaults to `"app"`.
  - Lookup order: `currentLocale` → `defaultLocale`. Missing in both → returns the input `key` verbatim.
  - Substitution: every `{name}` token replaced globally with the stringified value.
  - Each package's `./i18n` sub-export shape: `export const fi: NestedTranslation; export const en: NestedTranslation;`
- **Dependencies:**
  - `packages/i18n` depends on nothing.
  - Feature packages depend on `packages/i18n` only for the `NestedTranslation` type (or use a structural shape, no runtime import).
  - Host depends on `packages/i18n` + every feature package's `./i18n` sub-export.
  - DS package (`packages/cyan`) does **not** depend on `packages/i18n`. AppShell and other DS components are i18n-agnostic and accept user-facing text via props/slots.
- **Constraints:**
  - **Default locale is `fi`** — the canonical authoring locale and the final fallback.
  - **Pure & SSR-safe:** the engine has no `window`, `document`, async, or I/O. Deterministic for a given `(key, subs, currentLocale, locales)` tuple.
  - **Active locale is supplied by the caller.** The engine reads no cookies, headers, or stores.
  - **Static composition only.** Locale registries are assembled via static imports at module load. No `registerNamespace()`, no runtime mutation, no codegen.
  - **The host owns namespace keys.** A feature package proposes a name in its docs; the host file decides where the strings hang. Two packages cannot collide on a namespace.
  - **DS carries no locale strings.** Locale-bound text in `AppShell` (and other DS components) is supplied by the host via props/slots.
  - **Missing key returns the key string** — never `undefined`, never throws.

## Contract

### Definition of Done

- [ ] `packages/i18n` exports `createT`, `NestedTranslation`, `Locale`, `Locales`, `LocaleSubstitutions`.
- [ ] `createT(locales, 'fi')` returns a `t` function matching the v17 contract.
- [ ] `app/pelilauta/src/i18n.ts` composes locales from `@pelilauta/threads/i18n`, `@pelilauta/sites/i18n`, and `./locales/app`, and exports a bound `t`.
- [ ] At least `packages/threads` and `packages/sites` ship a `./i18n` sub-path export with `fi` and `en` trees.
- [ ] Astro pages call `t(key, subs, Astro.currentLocale)`; Svelte islands receive `locale` as a prop from their Astro parent.
- [ ] `packages/cyan` does not depend on `packages/i18n`.

### Regression Guardrails

- `t` MUST never throw for any string input — unknown namespaces, malformed keys, undefined locales all return the input key.
- The default locale constant MUST remain `fi` unless a product decision changes the canonical authoring locale.
- The `t(key, subs?, currentLocale?)` signature is part of the public contract; reordering or removing parameters is breaking.
- DS components MUST NOT import from `packages/i18n` or hard-code user-facing strings — regression here breaks the i18n-agnostic DS boundary.
- Namespace assignment MUST live in the host composition file. A feature package MUST NOT assume its own namespace key.

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

#### Scenario: Astro page resolves with `Astro.currentLocale`
```gherkin
Given the Astro host is configured with i18n locales ["fi","en"] and defaultLocale "fi"
And a request is made to the English-prefixed route for the front page
When the page renders t("app:title", undefined, Astro.currentLocale)
Then the rendered HTML contains the English title
```
- **Playwright E2E Test:** `app/pelilauta/e2e/i18n.spec.ts`
