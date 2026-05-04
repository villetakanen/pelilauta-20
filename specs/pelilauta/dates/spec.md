---
feature: Date and Flow-Time Labels
status: draft
maturity: design
last_major_review: 2026-05-04
parent_spec: ../spec.md
---

# Feature: Date and Flow-Time Labels

> Reverse-spec'd from
> `.tmp/pelilauta-17/src/utils/contentHelpers.ts:toDisplayString`
> with v20 threshold and behaviour adjustments. v18 returns
> relative time only when the elapsed delta is < 72 hours and
> falls back to the ISO date string otherwise; v20 widens the
> relative window to 7 days and ships a dedicated `flowTimeLabel`
> formatter so card and stream surfaces consume one
> well-specified helper instead of branching on `relative` flags
> at call sites.

## Blueprint

### Context

Several Pelilauta surfaces (site cards, thread cards, syndicate
items) display "when did this last move?" — sourced from the
`flowTime` field on `Entry`-shaped documents (sites, threads,
replies). The display string blends two formats:

- **Relative** ("2 days ago" / "2 päivää sitten") for activity
  that is recent enough to be cognitively useful as a delta —
  v20 caps relative formatting at less than 7 days. The 7-day
  widening from v18's 72 hours reflects how `flowTime` is used:
  on the front-page sites stream, the most recent 5 sites are
  often older than 3 days, and seeing "5 days ago" reads more
  naturally than a bare ISO date.
- **Absolute** (`YYYY-MM-DD`) for activity ≥ 7 days old, where
  the precise date is more useful than a relative offset.

`flowTimeLabel` exposes this rule as a single pure function. The
helper is locale-aware via `Intl.RelativeTimeFormat` and
`Intl.DateTimeFormat`, so callers pass the viewer's `uxLocale`
and receive a localised string.

`flowTimeLabel` is its own utility — not a re-export, not a
thin wrapper. v18's `toDisplayString(date, relative, locale)`
mixes the threshold, formatting, and the bare-ISO fallback into
one function with a boolean flag; v20 extracts the
threshold-and-format choice into `flowTimeLabel` and leaves the
absolute-only fallback (still useful for non-flow-time fields
like `createdAt` headers and audit timestamps) on a separate,
narrower helper.

### Architecture

- **Source (v18):**
  `.tmp/pelilauta-17/src/utils/contentHelpers.ts:toDisplayString`.
- **v20 target:** `packages/utils/src/dates/`.
- **Sub-export:** add `./dates` to `packages/utils/package.json`
  exports map.
- **Co-located tests:**
  - `packages/utils/src/dates/flowTimeLabel.test.ts`
  - `packages/utils/src/dates/toIsoDate.test.ts`

#### API

```ts
export function flowTimeLabel(
  flowTime: number | Date | undefined,
  locale: string,                          // e.g. 'fi', 'en'
  now?: Date,                              // injectable for tests; defaults to new Date()
): string;

export function toIsoDate(
  date: number | Date | undefined,
): string;
```

#### `flowTimeLabel` behaviour

1. **Empty input** (`undefined`, `null`, or a `Date` whose
   underlying number is `NaN`) → return `''`. v18's
   `toDisplayString` returned the literal string `'N/A'` for
   missing input; v20 prefers the empty string so consumers
   that splice the result into card markup do not accidentally
   render the `'N/A'` placeholder. Card-side empty values render
   as truly empty.
2. **Compute elapsed milliseconds.** `elapsedMs = now.getTime()
   - new Date(flowTime).getTime()`. The sign of `elapsedMs` is
   preserved — future timestamps yield negative deltas, which
   `Intl.RelativeTimeFormat` formats correctly ("in 2 days").
3. **Threshold decision.** When `Math.abs(elapsedMs) < 7 *
   24 * 60 * 60 * 1000` (i.e. less than 7 days), return the
   relative format. Otherwise, return the absolute format
   `YYYY-MM-DD`.
4. **Relative format.** Use `Intl.RelativeTimeFormat(locale, {
   numeric: 'auto' })` and choose the largest unit whose
   absolute magnitude is at least 1:
   - seconds (when `|elapsedMs| < 60s`),
   - minutes (when `|elapsedMs| < 60m`),
   - hours (when `|elapsedMs| < 24h`),
   - days (when `|elapsedMs| < 7d`).
   The unit selection is consistent with `Intl.RelativeTimeFormat`
   default behaviour and matches v18.
5. **Absolute format.** Return the first 10 characters of the
   ISO 8601 representation of the date —
   `new Date(flowTime).toISOString().substring(0, 10)`. The ISO
   format is locale-stable on purpose: the consuming surfaces
   want a deterministic, sortable date string that does not
   depend on the user's UX locale (Finnish and English readers
   both reliably parse `2026-05-04`).

#### `toIsoDate` behaviour

A narrower companion that always returns the absolute
`YYYY-MM-DD` string regardless of elapsed time. Used by
non-flow-time surfaces (audit headers, "created on" footers,
admin tables) where the relative-window logic is not wanted.
Returns `''` for empty input, mirrors `flowTimeLabel`'s absolute
branch otherwise.

#### Constraints

- **Pure functions.** No state, no side effects. Calling either
  helper N times with the same arguments and the same `now`
  returns the same result.
- **SSR-safe.** No browser globals, no DOM APIs.
  `Intl.RelativeTimeFormat` and `Intl.DateTimeFormat` are
  available in Node and Edge runtimes.
- **Injectable `now`.** Tests pass an explicit `now: Date` so
  threshold-edge behaviour can be asserted without freezing the
  system clock. Production callers omit `now` and let the
  helper default to `new Date()`.
- **Empty input is not an error.** Missing `flowTime` returns
  the empty string — callers render the empty string visibly
  empty, not as a `'N/A'` placeholder.
- **The 7-day threshold is part of the contract.** Tightening
  to 72 hours (the v18 default) or loosening to 30 days both
  change the visual feel of the cards. Either is acceptable as
  a future design change but lands as a spec edit, not a
  silent tweak.
- **Locale unit-selection follows `Intl.RelativeTimeFormat`
  defaults.** Custom unit pluralisation, custom
  ordinal handling, custom "yesterday" / "tomorrow" wording
  beyond `numeric: 'auto'` are out of scope for this helper.
- **`flowTime` field stays verbatim.** This helper consumes the
  v17 `flowTime` field shape (number of milliseconds since
  epoch, or a Firestore Timestamp converted to `Date` upstream
  by `@pelilauta/models`'s `toDate`). It does not introduce a
  new field.

### Dependencies

- `Intl.RelativeTimeFormat` (browser + Node / Edge built-in).
- `Intl.DateTimeFormat` (built-in) — only via the ISO
  `substring(0, 10)` path, which actually uses
  `Date.toISOString` rather than `DateTimeFormat`. Listed for
  completeness; no separate import.

### Consumers (initial)

- [`../sites/site-card.md`](../sites/site-card.md) — flow-time
  footer string.
- The forthcoming `ThreadCard` `dateLabel` prop (per
  [`../front-page/top-threads-stream/spec.md`](../front-page/top-threads-stream/spec.md))
  — same helper, same threshold rule. (The `ThreadCard` spec
  currently does not pin the format; converging on this helper
  is a follow-up that lands when the dateLabel resolution
  decision is taken there.)
- Any future card or stream surface that needs "when did this
  last move?".

## Contract

### Definition of Done

- [ ] `packages/utils/src/dates/flowTimeLabel.ts` exists and
      exports `flowTimeLabel(flowTime, locale, now?)`.
- [ ] `packages/utils/src/dates/toIsoDate.ts` exists and exports
      `toIsoDate(date)`.
- [ ] `packages/utils/src/dates/index.ts` re-exports both
      symbols.
- [ ] `packages/utils/package.json` declares a `./dates`
      sub-export pointing at the index.
- [ ] For elapsed time < 7 days, `flowTimeLabel` returns a
      locale-formatted relative-time string via
      `Intl.RelativeTimeFormat(locale, { numeric: 'auto' })`.
- [ ] For elapsed time ≥ 7 days, `flowTimeLabel` returns the
      ISO date `YYYY-MM-DD`.
- [ ] For empty input (undefined, null, NaN-backed Date),
      `flowTimeLabel` returns `''`.
- [ ] Future timestamps (negative elapsed) format correctly
      (e.g. "in 2 days" via the `Intl.RelativeTimeFormat`
      sign).
- [ ] `toIsoDate` returns the same `YYYY-MM-DD` string for any
      valid input regardless of elapsed time, and `''` for
      empty input.
- [ ] Co-located tests cover all of the above, including the
      threshold edges (just-under-7d → relative,
      exactly-7d → absolute, just-over-7d → absolute).

### Regression Guardrails

- The 7-day threshold MUST stay in place unless changed by an
  explicit spec edit. A silent tightening to 72 hours (v18) or
  loosening to 30 days changes the visual rhythm of the front
  page and is a regression.
- Empty input MUST return `''` — never a `'N/A'` placeholder
  or any other prose. Surfaces depend on the empty result
  rendering as truly empty.
- Absolute format MUST remain locale-stable (`YYYY-MM-DD`).
  Switching to a locale-formatted absolute (e.g.
  "4. toukokuuta 2026") would defeat sortability and create
  layout instability across locales.
- The helper MUST stay pure and side-effect-free. Adding
  caching, memoisation, or telemetry would obscure the
  threshold-edge behaviour.

### Testing Scenarios

#### Scenario: Less than 1 minute ago renders as "now"-class relative

```gherkin
Given now is 2026-05-04T12:00:00Z
And flowTime is 30 seconds before now
When flowTimeLabel(flowTime, 'en', now) is called
Then the result is a relative-time string for seconds (e.g. "30 seconds ago" or "now")
And the result is locale-aware ("ago" / "sitten" depending on locale)
```

#### Scenario: A few hours ago renders as relative hours

```gherkin
Given now is 2026-05-04T12:00:00Z
And flowTime is 5 hours before now
When flowTimeLabel(flowTime, 'fi', now) is called
Then the result is the Finnish relative-hours string
  produced by Intl.RelativeTimeFormat('fi', { numeric: 'auto' }) for 'hour' / -5
```

#### Scenario: 5 days ago renders as relative days

```gherkin
Given now is 2026-05-04T12:00:00Z
And flowTime is exactly 5 days before now
When flowTimeLabel(flowTime, 'en', now) is called
Then the result is "5 days ago" (or the equivalent
  Intl.RelativeTimeFormat output for 'day' / -5)
```

#### Scenario: Just under 7 days renders as relative

```gherkin
Given now is 2026-05-04T12:00:00Z
And flowTime is 6 days, 23 hours, 59 minutes before now
When flowTimeLabel(flowTime, 'en', now) is called
Then the result is a relative-day string (e.g. "7 days ago"
  rounded by Intl.RelativeTimeFormat)
And the result is NOT the absolute "2026-04-27" / "2026-04-28"
```

#### Scenario: Exactly 7 days renders as absolute

```gherkin
Given now is 2026-05-04T12:00:00Z
And flowTime is exactly 7 days before now (2026-04-27T12:00:00Z)
When flowTimeLabel(flowTime, 'en', now) is called
Then the result is "2026-04-27"
And the result is NOT a relative-time string
```

#### Scenario: More than 7 days renders as absolute

```gherkin
Given now is 2026-05-04T12:00:00Z
And flowTime is 30 days before now
When flowTimeLabel(flowTime, 'fi', now) is called
Then the result is "2026-04-04"
And the result format is YYYY-MM-DD regardless of locale
```

#### Scenario: Future timestamp renders as relative (positive direction)

```gherkin
Given now is 2026-05-04T12:00:00Z
And flowTime is 2 days after now
When flowTimeLabel(flowTime, 'en', now) is called
Then the result is "in 2 days" (or the equivalent
  Intl.RelativeTimeFormat output for 'day' / +2)
```

#### Scenario: Empty input returns the empty string

```gherkin
Given flowTime is undefined
When flowTimeLabel(flowTime, 'en') is called
Then the result is ''
And no exception is thrown

Given flowTime is null
When flowTimeLabel(flowTime, 'en') is called
Then the result is ''

Given flowTime is new Date(NaN)
When flowTimeLabel(flowTime, 'en') is called
Then the result is ''
```

#### Scenario: toIsoDate is unaffected by elapsed time

```gherkin
Given a Date for 2026-05-04T12:00:00Z
When toIsoDate(date) is called
Then the result is "2026-05-04"

Given a Date for 1999-01-01T00:00:00Z
When toIsoDate(date) is called
Then the result is "1999-01-01"

Given undefined
When toIsoDate(undefined) is called
Then the result is ''
```
