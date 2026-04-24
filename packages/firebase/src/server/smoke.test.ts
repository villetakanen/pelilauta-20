// Integration smoke test — hits the real Firebase project configured in
// `.env.development` at the repo root. Opt-in only: skipped unless
// `RUN_SMOKE=1` is set. The unit tests in `./index.test.ts` stay fully mocked.
//
// Run with:
//   pnpm --filter @pelilauta/firebase smoke
//
// What it verifies:
//   - Service-account credentials load and `initializeApp` succeeds.
//   - Firestore is reachable with those credentials (trivial read against
//     the `meta` collection). The read result is not asserted — any read
//     that doesn't throw on auth/credential grounds is a pass.

import { describe, expect, it } from "vitest";

const runSmoke = process.env.RUN_SMOKE === "1";

describe.skipIf(!runSmoke)("@pelilauta/firebase/server [smoke]", () => {
  it("initializes admin app with .env.development credentials", async () => {
    const { getApp } = await import("./index");
    const app = getApp();
    expect(app).toBeDefined();
    expect(app.name).toBe("[DEFAULT]");
  });

  it("reads from Firestore with the admin credentials", async () => {
    const { getDb } = await import("./index");
    const db = getDb();
    const snap = await db.collection("meta").limit(1).get();
    // Not asserting contents — just that the round-trip didn't throw on auth.
    expect(snap).toBeDefined();
    console.log(`[smoke] meta collection: ${snap.size} doc(s), empty=${snap.empty}`);
  }, 15_000);
});
