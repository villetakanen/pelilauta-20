import { logError } from "@pelilauta/utils/log";
import { atom, type ReadableAtom } from "nanostores";
import type { ProfileSummary } from "../server/schemas";

type CacheRecord = Record<string, ProfileSummary>;

const STORAGE_KEY = "profiles";
const cache = atom<CacheRecord>({});

const anonymousSummary = (uid: string): ProfileSummary => ({
  key: uid,
  nick: "Anonymous",
  username: "anonymous",
});

if (typeof localStorage !== "undefined") {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cache.set(JSON.parse(raw) as CacheRecord);
    }
  } catch (e) {
    logError("[profiles/client] failed to parse cache", e);
  }

  cache.listen((value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (e) {
      logError("[profiles/client] failed to persist cache", e);
    }
  });
}

export function getProfileAtom(uid: string): ReadableAtom<ProfileSummary | undefined> {
  const entry = atom<ProfileSummary | undefined>(cache.get()[uid]);

  if (!uid || uid === "-") {
    entry.set(anonymousSummary(uid || "-"));
    return entry;
  }

  if (!entry.get()) {
    fetch(`/api/profiles/${uid}.json`)
      .then(async (resp) => {
        if (!resp.ok) {
          entry.set(anonymousSummary(uid));
          return;
        }
        const data = (await resp.json()) as ProfileSummary;
        cache.set({ ...cache.get(), [uid]: data });
        entry.set(data);
      })
      .catch((e) => {
        logError("[profiles/client] getProfileAtom fetch failed", e);
        entry.set(anonymousSummary(uid));
      });
  }

  return entry;
}
