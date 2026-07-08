// replyEntriesStore — per-thread nanostore holding the rendered reply list.
//
// Both <ThreadReplies> (list + listener) and <ReplyForm> (optimistic appends)
// read/write the same atom for a given threadKey. The store factory is module-
// scoped so Astro/Vite chunks this file once across islands, and both islands
// resolve to the same atom instance at runtime — the seam that lets us split
// the list and the form into separate islands placed at different DOM
// locations in the host page.
//
// See specs/pelilauta/threads/detail-page/replies/authoring/spec.md §Architecture
// Verifies: specs/pelilauta/threads/detail-page/replies/authoring/spec.md §Submit appends a provisional entry then reconciles to the server reply
// Verifies: specs/pelilauta/threads/detail-page/replies/authoring/spec.md §Submit failure removes the provisional and surfaces the error

import { atom, type WritableAtom } from "nanostores";
import type { ReplyEntry } from "../components/types";
import type { ReplyDiff } from "./subscribeReplies";

type EntriesAtom = WritableAtom<ReplyEntry[]>;

const stores = new Map<string, EntriesAtom>();
const seeded = new Set<string>();

export function getStore(threadKey: string): EntriesAtom {
  let s = stores.get(threadKey);
  if (!s) {
    s = atom<ReplyEntry[]>([]);
    stores.set(threadKey, s);
  }
  return s;
}

/** Seed the store from the SSR initial list. Idempotent: only the first call
 * for a given threadKey takes effect, so two islands hydrating in any order
 * converge on the same seed. */
export function seedEntries(threadKey: string, entries: ReplyEntry[]): void {
  if (seeded.has(threadKey)) return;
  seeded.add(threadKey);
  getStore(threadKey).set([...entries]);
}

export function appendEntry(threadKey: string, entry: ReplyEntry): void {
  const store = getStore(threadKey);
  const current = store.get();
  if (current.some((e) => e.reply.key === entry.reply.key)) return;
  store.set([...current, entry]);
}

export function replaceEntry(threadKey: string, tmpKey: string, entry: ReplyEntry): void {
  const store = getStore(threadKey);
  const current = store.get();
  const idx = current.findIndex((e) => e.reply.key === tmpKey);
  if (idx === -1) {
    appendEntry(threadKey, entry);
    return;
  }
  const next = current.slice();
  next[idx] = entry;
  store.set(next);
}

export function removeEntry(threadKey: string, key: string): void {
  const store = getStore(threadKey);
  store.set(store.get().filter((e) => e.reply.key !== key));
}

export function mergeListenerDiff(threadKey: string, diff: ReplyDiff): void {
  const store = getStore(threadKey);
  let next = store.get();

  for (const added of diff.added) {
    if (!next.some((e) => e.reply.key === added.key)) {
      next = [...next, { reply: added, bodyHtml: "", profile: null }];
    }
  }

  for (const modified of diff.modified) {
    next = next.map((e) => (e.reply.key === modified.key ? { ...e, reply: modified } : e));
  }

  if (diff.removed.length > 0) {
    const removed = new Set(diff.removed);
    next = next.filter((e) => !removed.has(e.reply.key));
  }

  next = [...next].sort((a, b) => {
    const flowDiff = a.reply.flowTime - b.reply.flowTime;
    if (flowDiff !== 0) return flowDiff;
    const aTime = a.reply.createdAt?.getTime() ?? 0;
    const bTime = b.reply.createdAt?.getTime() ?? 0;
    return aTime - bTime;
  });

  store.set(next);
}

/** Test helper: drop all stores and seed marks. Production code should not
 * call this — Astro full-page navigation re-evaluates this module. */
export function __resetForTests(): void {
  stores.clear();
  seeded.clear();
}
