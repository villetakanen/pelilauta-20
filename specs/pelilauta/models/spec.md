---
feature: Shared Data Models
---

# Feature: Shared Data Models

## Blueprint

### Context

Base Zod schemas shared across multiple Pelilauta sub-apps (threads, pages, handouts, characters, clocks). Provides the `Entry` and `ContentEntry` foundation types that all Firestore-backed domain models extend. Extracted into a standalone package so domain packages (`@threads`, `@sites`, etc.) depend on a single canonical source for field shapes, validation, and Firestore timestamp handling.

### Architecture

- **Package:** `packages/models/`
- **Exports:**
  - `EntrySchema` — base Firestore document: `key`, `flowTime`, `createdAt`, `updatedAt`, `owners[]`
  - `ContentEntrySchema` — extends Entry: `public`, `sticky`, `tags[]`, `markdownContent`, `owners[]`, `author`
  - `Entry`, `ContentEntry` types (inferred from Zod)
  - `toDate()` helper — normalizes Firestore Timestamps, ISO strings, and epoch numbers to `Date`
  - `ImageArraySchema` — reusable `[{url, alt}]` array shape used by threads and other media-bearing entries

#### Schema Hierarchy

```
EntrySchema
  key: string (Firestore doc ID, default '')
  flowTime: number (sort key, coerced)
  createdAt: Date (optional, coerced)
  updatedAt: Date (optional, coerced)
  owners: string[] (uid array, default [])

ContentEntrySchema extends EntrySchema
  public: boolean (optional)
  sticky: boolean (optional)
  tags: string[] (optional)
  markdownContent: string (optional)
  author: string (optional)
```

- **Data Models:** Zod schemas as source of truth; TypeScript types inferred via `z.infer`
- **Dependencies:**
  - `zod` (runtime)
  - Consumed by: `packages/threads`, `packages/sites` (future), `packages/firebase`

#### Dropped from v17

| v17 Field | Disposition |
|---|---|
| `htmlContent` | Dropped — render markdown at display time |
| `content` (legacy) | Dropped — was already deprecated in v17 |
| `images: string[]` on ContentEntry | Dropped — each domain owns its own image shape (e.g., `ImageArraySchema` for threads) |

### Anti-Patterns

- Do not add domain-specific fields here — this package is the shared base only
- Do not import Firebase SDKs — this package is pure Zod, zero Firebase dependency
- Do not re-export domain schemas (Thread, Reply, etc.) — those live in their own packages

## Contract

### Definition of Done

- [ ] `packages/models` exists as a pnpm workspace package
- [ ] `EntrySchema` and `ContentEntrySchema` export valid Zod schemas
- [ ] `Entry` and `ContentEntry` types are inferred and exported
- [ ] `toDate()` handles `Date`, `string`, `number`, and Firestore `Timestamp`-shaped objects
- [ ] `ImageArraySchema` exported for reuse
- [ ] No Firebase imports in the package
- [ ] Package passes `pnpm check` and unit tests

### Regression Guardrails

- `ContentEntrySchema` must always extend `EntrySchema` — breaking this breaks every domain
- `owners` default must be `[]`, not undefined — downstream code relies on array methods
- `flowTime` must coerce to number — Firestore may return it as string in edge cases

### Testing Scenarios

#### Scenario: EntrySchema validates minimal document

```gherkin
Given an object with only a key field
When parsed through EntrySchema
Then it succeeds with defaults for flowTime (0) and owners ([])
```

- **Vitest Unit Test:** `packages/models/src/schemas/Entry.test.ts`

#### Scenario: ContentEntrySchema extends Entry fields

```gherkin
Given an object with key, markdownContent, and tags
When parsed through ContentEntrySchema
Then all Entry defaults are present alongside content fields
```

- **Vitest Unit Test:** `packages/models/src/schemas/ContentEntry.test.ts`

#### Scenario: toDate normalizes Firestore Timestamps

```gherkin
Given a Firestore Timestamp-shaped object with seconds and nanoseconds
When passed to toDate()
Then a valid Date is returned
```

- **Vitest Unit Test:** `packages/models/src/utils/toDate.test.ts`
