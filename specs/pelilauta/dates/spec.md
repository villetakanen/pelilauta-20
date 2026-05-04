---
feature: Date Labels
status: draft
maturity: design
last_major_review: 2026-05-04
parent_spec: ../spec.md
---

# Feature: Date Labels

> Reverse-spec'd from
> `.tmp/pelilauta-17/src/utils/contentHelpers.ts:toDisplayString`
> with v20 threshold and behaviour adjustments. v18 returns
> relative time only when the elapsed delta is < 72 hours and
> falls back to the ISO date string otherwise; v20 widens the
> relative window to 7 days and ships a dedicated `dateLabel`
> formatter so card and stream surfaces consume one
> well-specified helper instead of branching on `relative` flags
> at call sites.
>
> v20 deliberately drops v18's defensive empty-input handling
> (`if (!date) return 'N/A'`). The v20 helper is a pure
> converter that takes a real `Date` or millisecond `number`;
> handling the absent / unset / sentinel-value case is the
> caller's responsibility upstream.

## Blueprint

### Context

Several Pelilauta surfaces (site cards, thread cards, syndicate
items, audit headers) display "when did this happen?" — sourced
from a `Date` or millisecond `number` upstream. The display
string blends two formats:

- **Relative** ("2 days ago" / "2 päivää sitten") for activity
  that is recent enough to be cognitively useful as a delta —
  v20 caps relative formatting at less than 7 days. The 7-day
  widening from v18's 72 hours reflects how flow-time is used:
  on the front-page sites stream, the most recent 5 sites are
  often older than 3 days, and seeing "5 days ago" reads more
  naturally than a bare ISO date.
- **Absolute** (`YYYY-MM-DD`) for activity ≥ 7 days old, where
  the precise date is more useful than a relative offset.

`dateLabel` exposes this rule as a single pure function. The
helper is locale-aware via `Intl.RelativeTimeFormat`, so callers
pass the viewer's `uxLocale` and receive a localised string.

`dateLabel` is its own utility — not a re-export, not a thin
wrapper. v18's `toDisplayString(date, relative, locale)` mixes
the threshold, formatting, and the bare-ISO fallback into one
function with a boolean flag; v20 extracts the
threshold-and-format choice into `dateLabel` and leaves the
absolute-only fallback (still useful for non-flow-time fields
like `createdAt` headers and audit timestamps) on a separate,
narrower helper (`toIsoDate`).

### Architecture

- **Source (v18):**
  `.tmp/pelilauta-17/src/utils/contentHelpers.ts:toDisplayString`.
- **v20 target:** `packages/utils/src/dates/`.
- **Sub-export:** add `./dates` to `packages/utils/package.json`
  exports map.
- **Co-located tests:**
  - `packages/utils/src/dates/dateLabel.test.ts`
  - `packages/utils/src/dates/toIsoDate.test.ts`

#### API

```ts
export function dateLabel(
  date: number | Date,
  locale: string,                  // e.g. 'fi', 'en'
  now?: Date,                      // injectable for tests; defaults to new Date()
): string;

export function toIsoDate(date: number | Date): string;
```

Both functions are pure converters. The signature is the
contract: `undefined`, `null`, missing fields, or sentinel
values (`0` for a "never-flowed" `Entry`, etc.) MUST be filtered
upstream by the caller. Passing `undefined` is a programmer
error; TypeScript prevents it at compile time, and the runtime
makes no defensive guarantee for loosely-typed callers.

#### `dateLabel` behaviour

1. **Compute elapsed milliseconds.** `elapsedMs = now.getTime() -
   new Date(date).getTime()`. The sign of `elapsedMs` is
   preserved — future timestamps yield negative deltas, which
   `Intl.RelativeTimeFormat` formats correctly ("in 2 days").
2. **Threshold decision.** When `Math.abs(elapsedMs) < 7 * 24 *
   60 * 60 * 1000` (i.e. less than 7 days), return the relative
   format. Otherwise, return the absolute format `YYYY-MM-DD`.
3. **Relative format.** Use `Intl.RelativeTimeFormat(locale, {
   numeric: 'auto' })` and choose the largest unit whose
   absolute magnitude is at least 1:
   - seconds (when `|elapsedMs| < 60s`),
   - minutes (when `|elapsedMs| < 60m`),
   - hours (when `|elapsedMs| < 24h`),
   - days (when `|elapsedMs| < 7d`).
4. **Absolute format.** Return the first 10 characters of the
   ISO 8601 representation of the date —
   `new Date(date).toISOString().substring(0, 10)`. The output
   is **UTC-stable**: the format is deterministic, sortable, and
   independent of the viewer's UX locale (Finnish and English
   readers both reliably parse `2026-05-04`). It is **not
   timezone-stable**: see §Timezone below.

##### Timezone

The absolute output is the UTC date, derived from
`Date.toISOString()`. Two viewers in different timezones see
different absolute strings for a `date` near a UTC midnight
boundary — e.g. a `date` at `2026-05-04T01:00:00Z` renders as
`"2026-05-04"` for everyone, including a viewer in UTC+12 whose
local clock reads 13:00 on May 4 and a viewer in UTC-8 whose
local clock reads 17:00 on May 3. This is intentional v18
carry-forward: the format stays deterministic and sortable
across the platform's caching layers, at the cost of a one-day
offset for viewers far from UTC near midnight. Switching to a
viewer-local date (via `Intl.DateTimeFormat`) would make the
output viewer-specific and break shared response caching; that
trade-off is not worth the timezone correctness for this
helper's surfaces (card footers, audit headers).

#### `toIsoDate` behaviour

A narrower companion that always returns the absolute
`YYYY-MM-DD` string regardless of elapsed time. Used by
non-flow-time surfaces (audit headers, "created on" footers,
admin tables) where the relative-window logic is not wanted.
Mirrors `dateLabel`'s absolute branch.

#### Constraints

- **Pure functions.** No state, no side effects. Calling either
  helper N times with the same arguments and the same `now`
  returns the same result.
- **SSR-safe.** No browser globals, no DOM APIs.
  `Intl.RelativeTimeFormat` is available in Node and Edge
  runtimes (Node 14+).
- **Injectable `now`.** Tests pass an explicit `now: Date` so
  threshold-edge behaviour can be asserted without freezing the
  system clock. Production callers omit `now` and let the
  helper default to `new Date()`.
- **No defensive empty-input handling.** The signature accepts
  only real values (`number | Date`). Callers handle absent /
  sentinel / unparsed-input upstream — typically via a
  short-circuit (`if (!flowTime) return '—';` at the call site)
  or a `?? '—'` fallback in the consuming template. The helper
  makes no special promise about `0`, `NaN`-backed Dates, or
  any other "valid type, broken value." `0` renders as the
  literal epoch (`1970-01-01`); `new Date(NaN)` renders as the
  platform's invalid-Date string. See §Migration debt vs v18.
- **The 7-day threshold is part of the contract.** Tightening
  to 72 hours (the v18 default) or loosening to 30 days both
  change the visual feel of the cards. Either is acceptable as
  a future design change but lands as a spec edit, not a
  silent tweak.
- **Locale unit-selection follows `Intl.RelativeTimeFormat`
  defaults.** Custom unit pluralisation, custom ordinal
  handling, custom "yesterday" / "tomorrow" wording beyond
  `numeric: 'auto'` are out of scope.

### Dependencies

- `Intl.RelativeTimeFormat` (built-in; Node 14+, evergreen
  browsers).

### Consumers (initial)

- [`../sites/site-card.md`](../sites/site-card.md) — flow-time
  footer. The card's host (e.g. `TopSitesStream.astro`) filters
  sentinel values upstream and passes a real `Date` / `number`.
- The forthcoming `ThreadCard` `dateLabel` prop (per
  [`../front-page/top-threads-stream/spec.md`](../front-page/top-threads-stream/spec.md))
  — same helper, same threshold rule, same upstream-filter
  responsibility.
- Any future card or stream surface that needs "when did this
  happen?".

### Migration debt vs v18

- v18's `toDisplayString(date, relative, locale)` returned the
  literal string `'N/A'` for falsy input (`if (!date) return
  'N/A'`). v20 drops the defensive check entirely; the helper
  signature rejects `undefined`, and falsy values like `0`
  render as their literal date (epoch → `"1970-01-01"`). This
  is a deliberate API tightening. v20 callers that previously
  relied on the `'N/A'` fallback short-circuit upstream
  themselves.
- v18 capped relative formatting at 72 hours; v20 widens to 7
  days. See §Context for rationale.
- v18 mixes relative and absolute behind a `relative: boolean`
  flag on a single `toDisplayString` function. v20 splits into
  two functions: `dateLabel` (threshold-aware,
  relative-or-absolute) and `toIsoDate` (always absolute).

## Contract

### Definition of Done

- [ ] `packages/utils/src/dates/dateLabel.ts` exists and exports
      `dateLabel(date, locale, now?)`.
- [ ] `packages/utils/src/dates/toIsoDate.ts` exists and exports
      `toIsoDate(date)`.
- [ ] `packages/utils/src/dates/index.ts` re-exports both
      symbols.
- [ ] `packages/utils/package.json` declares a `./dates`
      sub-export pointing at the index.
- [ ] Both functions accept `number | Date` only — TypeScript
      rejects `undefined`/`null` at compile time.
- [ ] For elapsed time < 7 days, `dateLabel` returns a
      locale-formatted relative-time string via
      `Intl.RelativeTimeFormat(locale, { numeric: 'auto' })`.
- [ ] For elapsed time ≥ 7 days, `dateLabel` returns the ISO
      date `YYYY-MM-DD`.
- [ ] `toIsoDate` returns the same `YYYY-MM-DD` string for any
      valid input regardless of elapsed time.
- [ ] Co-located tests cover the happy paths and the threshold
      edges (just-under-7d → relative, exactly-7d → absolute,
      just-over-7d → absolute).

### Regression Guardrails

- The 7-day threshold MUST stay in place unless changed by an
  explicit spec edit. A silent tightening to 72 hours (v18) or
  loosening to 30 days changes the visual rhythm of the front
  page and is a regression.
- Absolute format MUST remain UTC `YYYY-MM-DD`. Switching to a
  locale-formatted absolute (e.g. "4. toukokuuta 2026") or a
  viewer-local timezone-derived date defeats sortability,
  breaks shared response caching, and creates layout
  instability across locales / timezones.
- The helper MUST stay pure and side-effect-free. Adding
  caching, memoisation, or telemetry would obscure the
  threshold-edge behaviour.
- The signature MUST stay narrow (`number | Date`). Adding
  `undefined` / `null` defensive handling to the implementation
  re-couples the helper to a defensive role v20 deliberately
  removed.

### Testing Scenarios

#### Scenario: A few seconds ago renders as relative seconds

```gherkin
Given now is 2026-05-04T12:00:00Z
And date is 30 seconds before now
When dateLabel(date, 'en', now) is called
Then the result equals Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-30, 'second')
```

#### Scenario: A few hours ago renders as relative hours

```gherkin
Given now is 2026-05-04T12:00:00Z
And date is 5 hours before now
When dateLabel(date, 'fi', now) is called
Then the result equals Intl.RelativeTimeFormat('fi', { numeric: 'auto' }).format(-5, 'hour')
```

#### Scenario: 5 days ago renders as relative days

```gherkin
Given now is 2026-05-04T12:00:00Z
And date is exactly 5 days before now
When dateLabel(date, 'en', now) is called
Then the result equals Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-5, 'day')
```

#### Scenario: Just under 7 days renders as relative

```gherkin
Given now is 2026-05-04T12:00:00Z
And date is 6 days, 23 hours, 59 minutes before now
When dateLabel(date, 'en', now) is called
Then the result is a relative-day string from Intl.RelativeTimeFormat
And the result does NOT match the YYYY-MM-DD ISO-date pattern
```

#### Scenario: Exactly 7 days renders as absolute

```gherkin
Given now is 2026-05-04T12:00:00Z
And date is exactly 7 days before now (2026-04-27T12:00:00Z)
When dateLabel(date, 'en', now) is called
Then the result is "2026-04-27"
```

#### Scenario: More than 7 days renders as absolute

```gherkin
Given now is 2026-05-04T12:00:00Z
And date is 30 days before now
When dateLabel(date, 'fi', now) is called
Then the result is "2026-04-04"
And the result is the same UTC YYYY-MM-DD string regardless of locale
```

#### Scenario: Future timestamp renders as relative (positive direction)

```gherkin
Given now is 2026-05-04T12:00:00Z
And date is 2 days after now
When dateLabel(date, 'en', now) is called
Then the result equals Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(2, 'day')
```

#### Scenario: Epoch input has no special-casing

```gherkin
Given now is 2026-05-04T12:00:00Z
And date is the number 0 (the v17 "never-flowed" sentinel for an unset Entry.flowTime)
When dateLabel(date, 'en', now) is called
Then the result is "1970-01-01"
And no defensive empty-string fallback is returned
```

(Callers that treat 0 as "never" filter it upstream — see
§Constraints "No defensive empty-input handling.")

#### Scenario: toIsoDate returns the UTC date for any timestamp

```gherkin
Given a Date for 2026-05-04T12:00:00Z
When toIsoDate(date) is called
Then the result is "2026-05-04"

Given a Date for 1999-01-01T00:00:00Z
When toIsoDate(date) is called
Then the result is "1999-01-01"

Given the number 0
When toIsoDate(0) is called
Then the result is "1970-01-01"
```

#### Scenario: Absolute output is UTC, not viewer-local

```gherkin
Given a Date at 2026-05-04T01:00:00Z (1 AM UTC)
And the running process's TZ is set to "Pacific/Auckland" (UTC+12, local clock would read 13:00 on May 4)
When toIsoDate(date) is called
Then the result is "2026-05-04"

Given the same Date at 2026-05-04T01:00:00Z
And the running process's TZ is set to "America/Los_Angeles" (UTC-8, local clock would read 17:00 on May 3)
When toIsoDate(date) is called
Then the result is still "2026-05-04"
```
