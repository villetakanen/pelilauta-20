---
feature: Shared Data Models
status: alpha
maturity: implementation
last_major_review: 2026-05-06
---

# Feature: Shared Data Models

## Blueprint

### Context

Base Zod schemas shared across every Firestore-backed domain in Pelilauta — threads, replies, sites, pages, handouts, characters, clocks. Provides the `Entry` and `ContentEntry` foundation types that every entry schema extends, plus the timestamp-coercion plumbing that ports Firestore's `Timestamp` shape into JavaScript `Date` / `number` values at parse time. Extracted into a standalone package so domain packages depend on a single canonical source for field shapes, validation, and Firestore-to-TS conversion.

### Architecture

- **Package:** `packages/models/`
- **Exports:**
  - `EntrySchema` — base Firestore document: `key`, `flowTime`, `createdAt`, `updatedAt`, `owners[]`, `locale`. A `z.object` (no preprocess wrapper) so subclasses can call `.extend(...)`.
  - `ContentEntrySchema` — extends `EntrySchema`: `public`, `sticky`, `tags[]`, `markdownContent`, `author`. Also a plain `z.object`.
  - `Entry`, `ContentEntry` — types inferred from Zod.
  - `ImageArraySchema` — reusable `[{url, alt}]` array shape.
  - `toDate(value)` — date-coercion helper. Recognizes `Date`, ISO/numeric string, epoch number, Firestore `{seconds, nanoseconds}` shape; everything else falls back to `new Date(0)`.
  - `normalizeEntryTimestamps(raw)` — pre-parse normalization for the three entry-level timestamp fields. Calls `toDate()` on `createdAt` / `updatedAt`, calls `toDate(...).getTime()` on `flowTime`. Pure; no side effects; does not mutate the input. Returns `unknown` (the broadened `data` clone) so callers can chain.
  - `withEntryNormalization(innerSchema, extra?)` — wraps an extended entry schema with `z.preprocess`, running `normalizeEntryTimestamps` first and then the optional `extra(raw)` for subclass-specific normalization (image legacy shapes, author derivation, etc.). The composition order is **timestamps first, subclass second** so subclass normalization sees already-coerced `Date`/`number` values if it needs them.

#### Schema Hierarchy

```
EntrySchema  (z.object, extendable)
  key: string (Firestore doc ID, default '')
  flowTime: number (sort key, post-preprocess: epoch ms)
  createdAt: Date (optional, post-preprocess: Date)
  updatedAt: Date (optional, post-preprocess: Date)
  owners: string[] (uid array, default [])
  locale: string (content language, default 'fi')

ContentEntrySchema extends EntrySchema  (z.object, extendable)
  public: boolean (optional)
  sticky: boolean (optional)
  tags: string[] (optional)
  markdownContent: string (optional)
  author: string (optional)
```

#### Subclass parse pattern

Every entry schema in a domain package is constructed by:

```ts
import { ContentEntrySchema, withEntryNormalization, ImageArraySchema } from "@pelilauta/models";

const normalizeFooSpecifics = (raw: unknown): unknown => {
  // image legacy shapes, author derivation, default-string fallbacks, etc.
  // MUST NOT call toDate() — entry timestamp coercion already happened.
  return raw;
};

export const FooSchema = withEntryNormalization(
  ContentEntrySchema.extend({ /* ...foo-specific fields... */ }),
  normalizeFooSpecifics,
);
```

Call sites parse via `FooSchema.parse({ ...doc.data(), key: doc.id })` per [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) §Doc-ID materialization. No outer wrapper helpers (no `toClientEntry`, no `parseFoo()`) are needed.

#### Schemas not affected by entry preprocess

- `ProfileSchema` (`packages/profiles/src/server/schemas.ts`) — does NOT extend `EntrySchema`. It has its own `z.preprocess` for nick / username / links normalization but no entry-level timestamp fields. `withEntryNormalization` does not apply.
- Any future schema describing a Firestore document that does not carry `createdAt`/`updatedAt`/`flowTime` similarly skips the wrapper and writes its own `z.preprocess` directly.

### Constraints

- **`EntrySchema` and `ContentEntrySchema` are `z.object`s, not `z.preprocess`-wrapped.** Subclasses must remain extendable via `.extend(...)`. Wrapping the base schema directly produces a `ZodEffects` whose `.extend()` does not exist.
- **Timestamp coercion lives in `normalizeEntryTimestamps`, applied via `withEntryNormalization`.** Subclasses MUST NOT call `toDate()` on `createdAt`, `updatedAt`, or `flowTime` themselves — that work belongs to the wrapper. Subclass-specific normalization functions are expected to leave entry-level timestamp fields untouched.
- **`flowTime` is a `number` (epoch ms) post-parse.** This applies uniformly to every entry schema. `z.coerce.number()` on the inner schema continues to work for already-coerced inputs.
- **`createdAt` / `updatedAt` are `Date` post-parse.** Callers downstream rely on `Date` API (`.getTime()`, `.toISOString()`, etc.) without runtime type checks.
- **Pure-Zod package.** No Firebase SDK imports anywhere in `packages/models/`. Firestore awareness is limited to the duck-typed `{seconds, nanoseconds}` recognition in `toDate()`.
- **Shared base only.** Domain-specific fields and per-domain normalization (image arrays, nick rules, channel field aliases) live in the owning feature package's schema, not here.
- **No re-exports of domain schemas.** Thread / Reply / Site / Profile schemas live in their own packages; consuming code imports them from there, not from `@pelilauta/models`.
- **`locale` is the content language of the entry**, not the viewer's UX locale. The schema does not enumerate accepted values — UI surfaces constrain pickers, the schema accepts any string.

## Contract

### Definition of Done

- [ ] `packages/models` exists as a pnpm workspace package
- [ ] `EntrySchema` and `ContentEntrySchema` export valid Zod `z.object` schemas (extendable)
- [ ] `Entry` and `ContentEntry` types are inferred and exported
- [ ] `toDate()` handles `Date`, ISO/numeric string, number, Firestore `{seconds, nanoseconds}` shape, and `null` / `undefined` (falls back to `new Date(0)`)
- [ ] `normalizeEntryTimestamps(raw)` exported; calls `toDate()` on `createdAt` / `updatedAt`, `toDate(...).getTime()` on `flowTime`; returns the cloned object (does not mutate input); no-ops on non-object inputs
- [ ] `withEntryNormalization(inner, extra?)` exported; runs `normalizeEntryTimestamps` first, then `extra(raw)` if supplied; returns a parsable Zod schema whose output type matches `z.infer<typeof inner>`
- [ ] `ImageArraySchema` exported for reuse
- [ ] No Firebase imports anywhere in the package
- [ ] `ThreadSchema`, `ReplySchema`, and `SiteSchema` are migrated to use `withEntryNormalization`; their per-schema `normalizeRaw*` blocks no longer call `toDate()` on entry-level fields
- [ ] `SiteSchema` produces a numeric `flowTime` (epoch ms) when given a Firestore Timestamp, fixing the latent gap left by relying on `z.coerce.number()` alone
- [ ] Package passes `pnpm check` and unit tests

### Regression Guardrails

- `ContentEntrySchema` must always extend `EntrySchema` — every domain depends on this composition.
- `EntrySchema` and `ContentEntrySchema` must remain `z.object` (extendable). Wrapping either with `z.preprocess` is a regression: it would break every subclass's `.extend(...)` call.
- `owners` default must be `[]`, not undefined — downstream code relies on array methods.
- `flowTime` must materialize as a `number` (epoch ms) for every entry schema. Firestore Timestamps coerce through `normalizeEntryTimestamps` → `toDate(value).getTime()`; numbers and strings flow through `z.coerce.number()` on the inner schema.
- `createdAt` / `updatedAt` must materialize as `Date` for every entry schema. Firestore Timestamps coerce via `toDate()`; ISO strings and epoch numbers via the same.
- Subclass schemas MUST go through `withEntryNormalization` if they extend `EntrySchema` (directly or via `ContentEntrySchema`). Bypassing the wrapper re-introduces per-schema `toDate()` duplication and risks omitting `flowTime` coercion (the bug `SiteSchema` had pre-consolidation).
- `locale` is the content language of the entry (used by content components for `<article lang>`), not the viewer's UX language. The schema does NOT enumerate accepted values — UI surfaces constrain the picker.
- The `@pelilauta/models` package never imports from `firebase/*`. Firestore-shape recognition is duck-typed (`{seconds, nanoseconds}`) in `toDate()`.

### Testing Scenarios

#### Scenario: EntrySchema validates minimal document

```gherkin
Given an object with only a key field
When parsed through EntrySchema
Then it succeeds with defaults for flowTime (0) and owners ([])
```

#### Scenario: EntrySchema defaults locale to "fi"

```gherkin
Given an object with no locale field
When parsed through EntrySchema
Then result.locale equals "fi"
And an explicitly set locale (e.g. "en", "sv") is preserved verbatim
```

#### Scenario: ContentEntrySchema extends Entry fields

```gherkin
Given an object with key, markdownContent, and tags
When parsed through ContentEntrySchema
Then all Entry defaults are present alongside content fields
```

#### Scenario: toDate normalizes Firestore Timestamps

```gherkin
Given a Firestore Timestamp-shaped object with seconds and nanoseconds
When passed to toDate()
Then a valid Date is returned
```

#### Scenario: toDate normalizes invalid inputs

```gherkin
Given an invalid ISO string, unrecognized object, or null/undefined
When passed to toDate()
Then Date(0) (epoch) is returned to ensure stability
```

#### Scenario: normalizeEntryTimestamps coerces all three entry timestamp fields

```gherkin
Given a raw object with createdAt and updatedAt as Firestore Timestamp shapes
And flowTime as a Firestore Timestamp shape
When passed to normalizeEntryTimestamps()
Then the returned object's createdAt is a JavaScript Date
And the returned object's updatedAt is a JavaScript Date
And the returned object's flowTime is a number (epoch milliseconds)
And the original input object is not mutated
```

#### Scenario: normalizeEntryTimestamps no-ops on non-object inputs

```gherkin
Given null, undefined, a string, or a number passed as raw
When normalizeEntryTimestamps(raw) is called
Then raw is returned unchanged
And no error is thrown
```

#### Scenario: withEntryNormalization composes timestamps before subclass normalization

```gherkin
Given an inner schema extended from ContentEntrySchema with field `images`
And a subclass normalizer `extra` that maps legacy string images to {url, alt}
When the wrapped schema parses a doc whose createdAt is a Firestore Timestamp and images is an array of strings
Then createdAt is a JavaScript Date in the result
And images is the [{url, alt}] shape
And the order of normalization is: entry timestamps first, subclass-specific second
```

#### Scenario: withEntryNormalization works without an extra normalizer

```gherkin
Given an inner schema extended from EntrySchema with no subclass normalizer supplied
When the wrapped schema parses a doc with Firestore Timestamps for createdAt/updatedAt/flowTime
Then createdAt and updatedAt are Date objects
And flowTime is a number
```

#### Scenario: An entry-extending domain schema delivers Date timestamps end-to-end

```gherkin
Given a domain schema constructed via withEntryNormalization(ContentEntrySchema.extend({...}), normalizeFooSpecifics)
And a Firestore document whose createdAt and updatedAt are Timestamps and flowTime is a Timestamp
When the schema parses the document
Then result.createdAt is a Date
And result.updatedAt is a Date
And result.flowTime is a number
And no consumer code reads a Firestore Timestamp from the parsed object
```
