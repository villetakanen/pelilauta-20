---
feature: Sites i18n surface
status: draft
maturity: design
last_major_review: 2026-05-04
parent_spec: ../spec.md
---

# Feature: Sites i18n surface

## Blueprint

### Context

Owns the i18n contract for the `@pelilauta/sites` package — what
keys exist, what they mean, what their canonical Finnish/English
values are, and the convention for slug-to-label sub-trees. The
implementation lives at `packages/sites/src/i18n/index.ts`
(exports `fi` and `en` trees); this spec is the contract that
file satisfies.

i18n in Pelilauta is UX-language-only. The translation engine,
host composition seam, and locale resolution chain are owned by
[`../../i18n/spec.md`](../../i18n/spec.md) — this sub-spec only
declares the sites-owned keys themselves.

### Architecture

- **Sub-export:** `@pelilauta/sites/i18n` — static `fi` and `en`
  trees only, no runtime code, no side effects, no imports
  beyond the `NestedTranslation` type from `@pelilauta/i18n`.
- **Namespace:** the host's composition file
  (`app/pelilauta/src/i18n.ts`) assigns the trees to the
  `sites` namespace. The package proposes; the host disposes.
- **Per-feature authorship strings** (editor labels, settings
  copy, members-page copy, handouts/characters/clocks per-feature
  copy) are owned by their respective feature specs, not by this
  sub-spec. This sub-spec covers cross-surface keys and convention
  sub-trees only.

#### Cross-surface keys

- **`sites:title`** — the canonical heading for the Sites
  vertical. Used by every surface that hosts sites content:
  front-page `TopSitesStream` `<h2>`, the `/sites` directory
  `<h1>`, the `/library/sites` `<h1>`, and any future
  site-listing surface. Finnish: `"Sivustot"`. English:
  `"Sites"`.

#### Convention sub-trees

- **`sites:site.systems.*`** — slug-to-localized-name lookup for
  game systems. Consumed by `SiteCard`'s eyebrow link (per
  [`../site-card/spec.md`](../site-card/spec.md) §Props) — the
  caller resolves `t('sites:site.systems.{site.system}')` to
  populate the `systemLabel` prop. The slug list and per-locale
  strings are implementation data in
  `packages/sites/src/i18n/index.ts`; new systems land via code,
  not via this spec.

  **Fallback rule:** when a slug has no entry in the tree (custom
  or unknown system), the caller passes the raw `site.system`
  slug as the label rather than asking the engine for a
  missing-key sentinel. This keeps the eyebrow text legible for
  homebrew systems and avoids translation-bookkeeping pressure.

### Constraints

- **Static data only.** The sub-export ships locale objects, not
  runtime helpers. No code paths, no I/O, no side effects.
- **Engine ownership.** Lookup, fallback, and substitution
  semantics are owned by `packages/i18n/`. This sub-spec does
  not redefine any of those rules.
- **Namespace authority.** The `sites` namespace key is
  informally proposed by this package; the host file is
  authoritative. If the host renames it, this sub-spec follows.

## Contract

### Definition of Done

- [ ] `packages/sites/src/i18n/index.ts` exports `fi` and `en`
      trees that contain at least `sites:title` with the values
      declared above.
- [ ] The `fi` and `en` trees expose a `site.systems` sub-tree
      (possibly empty at MVP — the slug-fallback rule applies
      until canonical labels are translated).
- [ ] No runtime code, no side effects, no imports beyond the
      `NestedTranslation` type from `@pelilauta/i18n`.

### Testing Scenarios

#### Scenario: Sites i18n sub-export ships sites:title

```gherkin
Given a Locales registry assembled by the host that assigns
  @pelilauta/sites/i18n to the "sites" namespace
When the host-bound t resolves "sites:title" with locale "fi"
Then it returns "Sivustot"
And the same key resolves to "Sites" for locale "en"
```

#### Scenario: Known system slug resolves to its localized name

```gherkin
Given the fi tree's site.systems sub-tree contains an entry for "dnd5e"
When the caller resolves t('sites:site.systems.dnd5e') with locale "fi"
Then the localized system name is returned
```

#### Scenario: Unknown system slug falls back to raw slug at the caller

```gherkin
Given a Site with system "made-up-game-name"
And no corresponding entry exists in either fi or en site.systems sub-trees
When the caller computes systemLabel for SiteCard
Then systemLabel is the raw "made-up-game-name" slug
And the caller does not ask the engine to resolve a missing key
```
