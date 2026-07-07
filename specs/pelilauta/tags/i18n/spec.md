---
feature: Tags i18n surface
status: draft
last_major_review: 2026-05-05
parent_spec: ../spec.md
---

# Feature: Tags i18n surface

## Blueprint

### Context

Owns the i18n contract for the `@pelilauta/tags` package — the
supertag-keyed sub-tree consumed by `FeaturedTags` and the
`/tags/[tag]` route. The implementation lives at
`packages/tags/src/i18n/index.ts` (exports `fi` and `en`
trees); this spec is the contract that file satisfies.

Plain tags do not consume any i18n key — they display as the
raw slug everywhere. Only registered supertags have localized
copy.

i18n in Pelilauta is UX-language-only. The translation engine,
host composition seam, and locale resolution chain are owned by
[`../../i18n/spec.md`](../../i18n/spec.md) — this sub-spec only
declares the tags-owned keys themselves.

### Architecture

- **Sub-export:** `@pelilauta/tags/i18n` — static `fi` and `en`
  trees only, no runtime code, no side effects, no imports
  beyond the `NestedTranslation` type from `@pelilauta/i18n`.
- **Namespace:** the host's composition file
  (`app/pelilauta/src/i18n.ts`) assigns the trees to the
  `tags` namespace. The package proposes; the host disposes.
- **No cross-surface cornerstone keys.** Unlike
  [`../../sites/i18n/spec.md`](../../sites/i18n/spec.md)'s
  `sites:title`, the tags vertical has no top-level heading
  shared across surfaces. The `<h2>` on FeaturedTags and the
  `<h1>` on the tag-page each consume their own
  consumer-owned strings (host-side
  `pelilauta:featuredTags.title` for the front-page widget;
  per-supertag `displayName` for the tag-page heading).

#### Convention sub-tree

- **`tags:supertag.{slug}.displayName`** — localized supertag
  label. Consumed by FeaturedTags chip rendering (per
  [`../../front-page/featured-tags/spec.md`](../../front-page/featured-tags/spec.md),
  TBD) and by the tag-page `<h1>` (per
  [`../tag-page/spec.md`](../tag-page/spec.md), TBD).
- **`tags:supertag.{slug}.description`** — localized supertag
  description, SEO-shaped prose. Consumed by the tag-page's
  meta description and any inline copy block beneath the
  heading.

The `{slug}` segment is the supertag's `canonicalTag` from the
registry verbatim, in **decoded form** (`d&d`,
`legendoja & lohikäärmeitä`, `call of cthulhu`) per
[`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md)
§URL routing and redirect encoding. The slugs are JS object keys
at runtime, which tolerates spaces, ampersands, and other
non-alphanumerics; the dotted-path lookup descends one level per
`.` so callers compute keys as
`` `tags:supertag.${supertag.canonicalTag}.displayName` ``.

#### Supertag entries (MVP)

The package ships entries for all 5 supertags listed in
[`../spec.md`](../spec.md) §Supertag registry. Values:

| Slug | `displayName` (fi) | `displayName` (en) | `description` (fi) |
|---|---|---|---|
| `d&d` | `D&D` | `D&D` | `Dungeons & Dragons keskustelut, kampanjat ja materiaalit` |
| `pathfinder` | `Pathfinder` | `Pathfinder` | `Pathfinder-roolipeli, säännöt, hahmot ja seikkailut` |
| `legendoja & lohikäärmeitä` | `Legendoja & lohikäärmeitä` | `Legendoja & lohikäärmeitä` | `Legendoja ja Lohikäärmeitä -roolipeliin liittyvät keskustelut ja sivut.` |
| `pbta` | `PbtA` | `PbtA` | `Powered by the Apocalypse -järjestelmän pelit ja keskustelut` |
| `call of cthulhu` | `Call of Cthulhu` | `Call of Cthulhu` | `Call of Cthulhu ja muut sen sukulaiset` |

**Notes on the values:**

- `displayName` (fi) and (en) match for every supertag at MVP
  except where a Finnish-only brand has no canonical English
  form. Legendoja & lohikäärmeitä is a Finnish-brand RPG; the
  English locale displays the Finnish brand verbatim rather
  than inventing a translation.
- `description` (fi) carries forward verbatim from v18
  `TAG_SYNONYMS` per the parent spec's §Migration Debt #5.
- `description` (en) is **deferred** at MVP. The `en` tree
  ships no `description` keys for any supertag. Consumers
  resolving `tags:supertag.{slug}.description` against the
  `en` locale will receive the engine's missing-key sentinel
  (typically the key string itself); consumer code SHOULD
  detect the sentinel and either (a) fall back to the `fi`
  string or (b) render no description block. The
  consumer-side fallback strategy is owned by the consuming
  spec, not by this i18n sub-spec.

### Constraints

- **Static data only.** The sub-export ships locale objects,
  not runtime helpers. No code paths, no I/O, no side
  effects.
- **Engine ownership.** Lookup, fallback, and substitution
  semantics are owned by `packages/i18n/`. This sub-spec
  does not redefine any of those rules.
- **Namespace authority.** The `tags` namespace key is
  informally proposed by this package; the host file
  (`app/pelilauta/src/i18n.ts`) decides the actual key. If the
  host renames it, this sub-spec follows.
- **Plain-tag fallback is the consumer's job.** This sub-spec
  ships keys only for registered supertags. Consumers
  rendering a plain (unregistered) tag MUST display the raw
  slug rather than asking the engine for a non-existent key.
- **EN description authoring is deferred.** Adding `en`
  description strings is an additive future change that does
  not require a spec revision; the table above is the MVP
  baseline, not a closed list.

## Contract

### Definition of Done

- [ ] `packages/tags/src/i18n/index.ts` exports `fi` and `en`
      trees with the exact values from §Supertag entries above.
- [ ] The `fi` tree contains all 5 supertag entries with both
      `displayName` and `description` populated.
- [ ] The `en` tree contains all 5 supertag entries with
      `displayName` populated; `description` is permitted to
      be absent for any or all entries at MVP.
- [ ] Both trees expose the `supertag` sub-tree at the
      top-level position so the dotted-path key
      `tags:supertag.{slug}.displayName` resolves cleanly.
- [ ] No runtime code, no side effects, no imports beyond the
      `NestedTranslation` type from `@pelilauta/i18n`.

### Testing Scenarios

#### Scenario: Supertag displayName resolves in both locales

```gherkin
Given a Locales registry assembled by the host that assigns
  @pelilauta/tags/i18n to the "tags" namespace
When the host-bound t resolves "tags:supertag.pathfinder.displayName"
  with locale "fi"
Then it returns "Pathfinder"
And the same key resolves to "Pathfinder" for locale "en"
```

#### Scenario: L&L's Finnish-brand label persists across locales

```gherkin
Given the same Locales registry
When the host-bound t resolves
  "tags:supertag.legendoja & lohikäärmeitä.displayName"
  with locale "fi"
Then it returns "Legendoja & lohikäärmeitä"
And the same key resolves to "Legendoja & lohikäärmeitä" for locale "en"
```

#### Scenario: Supertag description present in fi

```gherkin
Given the same Locales registry
When the host-bound t resolves "tags:supertag.d&d.description"
  with locale "fi"
Then it returns "Dungeons & Dragons keskustelut, kampanjat ja materiaalit"
```

#### Scenario: Supertag description absent in en at MVP

```gherkin
Given the same Locales registry
When the host-bound t resolves "tags:supertag.d&d.description"
  with locale "en"
Then the engine returns its missing-key sentinel (typically the key string)
And the consumer is expected to detect this and either fall back to fi
  or render no description block
```

#### Scenario: Plain (unregistered) tag has no i18n entry

```gherkin
Given a tag slug "made-up-game-name" that does not appear in the
  supertag registry
When a consumer attempts to resolve "tags:supertag.made-up-game-name.displayName"
Then the engine returns its missing-key sentinel
And the consumer is expected to render the raw slug instead
And no error is thrown
```

## Decisions

1. **`displayName` parity (FI ≡ EN) for the four
   non-Finnish-brand supertags.** D&D, Pathfinder, PbtA, and
   Call of Cthulhu are international brand names that don't
   change across locales. The two locales hold the same
   string for these entries. This is documentation, not
   redundancy — the EN tree's value is intentional, not a
   carry-over miss.
2. **Finnish brand persists across locales.** Legendoja &
   lohikäärmeitä has no canonical English form; the spec
   ships the Finnish brand verbatim in both locales rather
   than inventing a translation.
3. **EN description deferred.** v18 ships only Finnish
   descriptions and v20 carries them forward verbatim.
   English descriptions are SEO-shaped prose that needs
   editorial authoring; they land as a follow-up, not as a
   blocker for the tags package shipping.
