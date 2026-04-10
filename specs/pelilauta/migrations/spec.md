---
feature: Data Migrations
---

# Feature: Data Migrations

## Blueprint

### Context

v17 Firestore data contains legacy fields and formats that are incompatible with v20 schemas. Rather than handling these at parse-time forever, we run one-time migration scripts that transform existing documents in place. Scripts live in `scripts/migrations/` and are designed to be idempotent (safe to re-run).

### Architecture

- **Location:** `scripts/migrations/`
- **Runtime:** Node.js + firebase-admin (direct Firestore access)
- **Dependencies:** `@models` (schemas), `zod` (validation), `firebase-admin`

#### Migration: Thread Legacy Fields

**Script:** `scripts/migrations/001-thread-legacy-fields.ts`

**Transforms:**

| Field | v17 State | v20 Target | Action |
|---|---|---|---|
| `content` | Raw text (legacy) | removed | If `markdownContent` is empty, copy `content` → `markdownContent`, then delete `content` |
| `htmlContent` | Pre-rendered HTML | removed | Delete field (v20 renders markdown at display time) |
| `images` (string[]) | `["url1", "url2"]` | `[{url, alt}]` | Convert each string to `{url, alt: "Image [url]"}` |
| `topic` | Legacy channel field | `channel` | If `channel` is empty, copy `topic` → `channel`, then delete `topic` |
| `author` | Sometimes missing | derived | Set `author = owners[0]` if missing and owners exists |

**Process:**

1. Query all docs in `stream` collection (batched, 500 at a time)
2. For each doc, check if any legacy fields exist
3. Build update object with transforms
4. Write update in a Firestore batch
5. Log: `migrated {count} / skipped {count} / failed {count}`

#### Migration: Reply Legacy Fields

**Script:** `scripts/migrations/002-reply-legacy-fields.ts`

**Transforms:** Same `content` → `markdownContent` and `htmlContent` removal as threads, applied to `stream/{threadKey}/comments/{replyKey}` sub-collection documents.

### Anti-Patterns

- Do not run migrations from application code — scripts are CLI-only, run manually
- Do not delete the original field before confirming the target field is written (atomic batch)
- Do not assume field presence — check before transforming (some docs may already be migrated)
- Do not migrate in a single unbatched write — use Firestore batch writes (max 500 per batch)

## Contract

### Definition of Done

- [ ] `scripts/migrations/001-thread-legacy-fields.ts` exists and handles all listed transforms
- [ ] `scripts/migrations/002-reply-legacy-fields.ts` exists and handles reply transforms
- [ ] Both scripts are idempotent (running twice produces the same result)
- [ ] Both scripts log migration counts (migrated / skipped / failed)
- [ ] Both scripts use batched writes (max 500 per batch)
- [ ] A dry-run mode (`--dry-run` flag) previews changes without writing

### Regression Guardrails

- Migration must never delete data without first writing the replacement
- Migration must never fail silently — errors must be logged with the document key
- Running migration on already-migrated data must be a no-op (idempotent)

### Testing Scenarios

#### Scenario: Migrate thread with legacy string images

```gherkin
Given a thread document with images: ["https://example.com/a.jpg", "https://example.com/b.jpg"]
When 001-thread-legacy-fields runs
Then images becomes [{url: "https://example.com/a.jpg", alt: "Image [https://example.com/a.jpg]"}, {url: "https://example.com/b.jpg", alt: "Image [https://example.com/b.jpg]"}]
```

- **Vitest Unit Test:** `scripts/migrations/001-thread-legacy-fields.test.ts`

#### Scenario: Migrate thread with legacy content field

```gherkin
Given a thread document with content: "Hello world" and no markdownContent
When 001-thread-legacy-fields runs
Then markdownContent is "Hello world"
And content field is removed
And htmlContent field is removed
```

- **Vitest Unit Test:** `scripts/migrations/001-thread-legacy-fields.test.ts`

#### Scenario: Skip already-migrated document

```gherkin
Given a thread document with markdownContent set and no legacy fields
When 001-thread-legacy-fields runs
Then the document is skipped
And skip count is incremented
```

- **Vitest Unit Test:** `scripts/migrations/001-thread-legacy-fields.test.ts`

#### Scenario: Dry run previews without writing

```gherkin
Given legacy thread documents exist
When 001-thread-legacy-fields runs with --dry-run
Then migration counts are logged
But no Firestore writes occur
```

- **Vitest Unit Test:** `scripts/migrations/001-thread-legacy-fields.test.ts`
