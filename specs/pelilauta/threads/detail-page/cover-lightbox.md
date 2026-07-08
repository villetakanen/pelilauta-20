---
feature: Thread Cover — CnLightbox Integration
status: draft
last_major_review: 2026-06-01
parent_spec: ./spec.md
---

# Feature: Thread Cover — CnLightbox Integration

## Blueprint

### Context

**Route:** `/threads/[threadKey]` — the cover area at the top of the thread article, inside the main column of the reader container.

The cover area presents the thread's images. A reader can click any image to open it full-viewport in a modal. When a thread has multiple images, they appear as a horizontally-scrollable strip of square thumbnails; clicking one opens that image. Every image carries a caption.

### Architecture

- **Component:** `packages/threads/src/components/ThreadDetail.svelte` renders `<CnLightbox images={coverImages} />` at the top of its article, above the body section.
- **Image primitive:** `CnLightbox` from `@cyan/components`. Contract: `packages/cyan/src/components/CnLightbox.svelte` plus `CnLightbox.types.ts` (`CnLightboxImage = { src: string; caption: string }`). `CnLightbox` handles single-image vs multi-image rendering, modal open/close, ESC and backdrop dismissal, and renders nothing when `images` is empty.
- **Image assembly (in `ThreadDetail.svelte`, derived from props):**
  - Start with `thread.images` (array of `{url, alt}`), mapped to `{ src: url, caption: alt }`.
  - When `thread.poster` is set and no entry in `thread.images` has `url === thread.poster`, prepend `{ src: thread.poster, caption: thread.title }` so the explicit poster is the first thumbnail.
  - When `thread.poster` matches an existing `images[i].url`, the assembled list contains that URL exactly once.
  - The resulting array is passed to `<CnLightbox images={...} />`. An empty array results in no cover markup at all.
- **No fetched data.** Image data lives on the parsed `Thread`. The assembly is a pure `$derived` expression in the existing Svelte 5 component.
- **SSR contract.** `CnLightbox` SSRs cleanly: it emits figure(s) and the `<dialog>` element server-side; modal open/close logic is gated by `onMount` + a client-side `$effect` per cyan's own SSR-safety contract. The host page does not add `client:*` to `<ThreadDetail>` — the modal is a progressive enhancement and the cover area renders fully on the server.

### Dependencies

- `@cyan/components` — `CnLightbox`, `CnLightboxImage` type.
- Parent reader container — [`./spec.md`](./spec.md). The cover sits in the main column.
- `ImageArraySchema` on `packages/threads/src/schemas/ThreadSchema.ts` — already produces `{url, alt}` entries via legacy-string coercion.

### Constraints

- The cover area renders nothing when both `thread.poster` is absent and `thread.images` is empty.
- The poster URL, when present and not also in `thread.images`, is the first item in the assembled `images` array.
- The caption for a synthesised poster entry is `thread.title`.
- The host page does not promote `<ThreadDetail>` to a client island. CnLightbox's own progressive enhancement covers the modal.

## Contract

### Definition of Done

- [ ] `ThreadDetail.svelte` renders `<CnLightbox images={coverImages} />` at the top of its article.
- [ ] `coverImages` is a `$derived` value computed from `thread.poster` and `thread.images` per the assembly rule.
- [ ] An empty assembled array results in no `<figure>` and no `<dialog>` in the rendered HTML.
- [ ] A thread with only `thread.poster` set renders the single-figure variant with `caption = thread.title`.
- [ ] A thread with multiple entries in `thread.images` renders the multi-figure horizontal-strip variant. Captions come from each entry's `alt`.
- [ ] A thread where `thread.poster === thread.images[i].url` for some `i` renders exactly one figure for that URL (no duplicate).
- [ ] No `client:*` directive is added to `<ThreadDetail>` on the host page (`app/pelilauta/src/pages/threads/[threadKey]/index.astro`).

### Regression Guardrails

- `CnLightbox` is the only component used to render the cover.
- The cover's image data is sourced from `thread.poster` and `thread.images` only — no other field.
- A thread where the poster URL also appears in `thread.images` renders the URL exactly once.

### Testing Scenarios

#### Scenario: Single poster renders the single-figure lightbox

```gherkin
Given a Thread with poster = "https://example.com/cover.jpg" and images = []
When ThreadDetail is rendered
Then the rendered HTML contains exactly one CnLightbox figure
And the figure's img has src = "https://example.com/cover.jpg"
And the figure's caption text equals the thread.title
And the figure has no sibling figures (single-figure variant, not the multi-figure strip)
```

#### Scenario: Multiple images render the multi-figure strip

```gherkin
Given a Thread with poster = undefined and images = [
  { url: "https://example.com/a.jpg", alt: "image a" },
  { url: "https://example.com/b.jpg", alt: "image b" },
  { url: "https://example.com/c.jpg", alt: "image c" }
]
When ThreadDetail is rendered
Then the rendered HTML contains exactly 3 CnLightbox figures inside the multi-figure container
And the figures' captions are "image a", "image b", "image c" in source order
```

#### Scenario: Poster combined with images, poster URL not duplicated

```gherkin
Given a Thread with poster = "https://example.com/cover.jpg"
And images = [
  { url: "https://example.com/extra.jpg", alt: "extra" }
]
When ThreadDetail is rendered
Then the rendered HTML contains exactly 2 CnLightbox figures
And the first figure's img src is "https://example.com/cover.jpg" with caption equal to thread.title
And the second figure's img src is "https://example.com/extra.jpg" with caption "extra"
```

#### Scenario: Poster URL already present in images is not duplicated

```gherkin
Given a Thread with poster = "https://example.com/dup.jpg"
And images = [
  { url: "https://example.com/dup.jpg", alt: "the poster" },
  { url: "https://example.com/other.jpg", alt: "other" }
]
When ThreadDetail is rendered
Then the rendered HTML contains exactly 2 CnLightbox figures (no duplicate "dup.jpg" entry)
And the first figure's img src is "https://example.com/dup.jpg" with caption "the poster"
```

#### Scenario: No cover sources renders no cover area

```gherkin
Given a Thread with poster = undefined and images = []
When ThreadDetail is rendered
Then the rendered HTML contains no CnLightbox-emitted figure
And the rendered HTML contains no <dialog> element from CnLightbox
```

#### Scenario: SSR cover is visible without JavaScript

```gherkin
Given an anonymous viewer GETs /threads/{key} for a thread with a poster
When the response HTML is inspected before any JavaScript runs
Then the response contains the cover image markup (<figure> with <img>)
And the image's src equals thread.poster
```
