---
feature: Channels — Latest-Activity Cell
status: draft
last_major_review: 2026-04-29
parent_spec: ../spec.md
---

# Feature: Channels — Latest-Activity Cell

## Status

**Stub.** This spec is a placeholder. It will be written when implementation of the per-row latest-activity cell on `/channels` starts.

## Scope when written

This child spec will cover everything the parent [`channels/spec.md`](../spec.md) MVP intentionally defers about the per-row latest-activity column:

- The `ChannelListInfoCell.astro` component (or its v20 equivalent), with its three render states:
  - `latestThread` distinct from `latestUpdatedThread` → render both pointers
  - `latestThread` is the same as / latest-is-newest → render a single italic note
  - `latestThread` is `null` → render nothing
- The `/api/channels-with-stats.json` endpoint (response shape, status codes, ETag/SWR/`Cache-Control` headers, per-channel degrade-on-failure semantics).
- The `ChannelsWithStatsSchema` typing fix — resolving v17's `z.nullable(z.any())` placeholder via forward-declared `ThreadSchema`, schema split, or typed `.nullable()`. The decorative-schema regression is in scope here because this is where the schema is consumed.
- ProfileLink integration: collecting the union of `latestThread.owners[0]` / `latestUpdatedThread.owners[0]` uids, resolving via `Promise.all(uids.map(getProfile))` upstream of card rendering, and passing each resolved `Profile | null` plus `anonymousLabel={t("profiles:anonymous.nick")}` into `ChannelListInfoCell`. **Reads `owners[0]`, never `author`** (per `threads/spec.md` §Constraints).
- The 500-on-empty page-level design opinion for `/channels` (empty stats response = fatal at the page) and the distinguishable `logError` codes (`channels.fetch_failed` vs. `channels.empty_directory`).
- Migration of the v17 anomalies that affect the cell:
  - The `<ProfileLink … client:only="svelte"/>` per-row anti-pattern (replace with the SSR `ProfileLink.svelte` from `@pelilauta/profiles`).
  - The bare `<i>` italic for the `latestIsNewest` state (consider DS de-emphasis primitive).
  - The v17 `getChannelsWithStats()` accessor pattern's `2 × N` Firestore reads per cache miss (decision: keep, document the trade-off).

## Dependencies (when written)

- Parent [`channels/spec.md`](../spec.md) — directory page contract.
- [`@pelilauta/threads`](../../threads/spec.md) — `Channel`, `ChannelsWithStatsSchema`, `ChannelWithStats`, plus the orchestration that fans out per-channel stats reads.
- [`@pelilauta/profiles`](../../profiles/spec.md) — `Profile` type, `getProfile(uid)`, `ProfileLink.svelte`, `profiles:anonymous.nick` i18n key.

## Out of Scope

- Anything covered by the parent MVP (route, listing, grouping, heading hierarchy).
- Per-channel browser at `/channels/{slug}` — see [`channels/channel-page/spec.md`](../channel-page/spec.md).
