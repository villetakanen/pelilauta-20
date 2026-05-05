// Verifies: specs/pelilauta/tags/spec.md §hasTaggedEntries returns true when an entry exists for the canonical or any synonym
// Verifies: specs/pelilauta/tags/spec.md §hasTaggedEntries returns false when no matching entry exists
//
// Assumes pnpm seed:e2e has been run. The seed populates:
//   tags/{H80i220q4pZYhP4DsaPn} with tags: ["löllö", "deddu", "peliraportit"]
//
// Expected helper behavior against seed data:
//   hasTaggedEntries('d%26d')                       → true  (synonym 'deddu' in seed)
//   hasTaggedEntries('legendoja %26 lohikäärmeitä') → true  (synonym 'löllö' in seed)
//   hasTaggedEntries('peliraportit')                → true  (plain tag present)
//   hasTaggedEntries('pathfinder')                  → false (no seed thread has Pathfinder tags)
//   hasTaggedEntries('made-up-game-name')           → false (no match)

import { type APIRequestContext, expect, test } from "@playwright/test";

const E2E_SECRET = process.env.SECRET_e2e_seed_secret ?? "";
const ENDPOINT = "/api/test/has-tagged-entries";

/** Helper: call the test endpoint with the secret header. */
async function callEndpoint(
  request: APIRequestContext,
  slug: string,
): Promise<{ status: number; body?: { result: boolean } }> {
  const url = `${ENDPOINT}?slug=${slug}`;
  const response = await request.get(url, {
    headers: { "x-e2e-seed-secret": E2E_SECRET },
  });
  const status = response.status();
  if (status === 200) {
    const body = (await response.json()) as { result: boolean };
    return { status, body };
  }
  return { status };
}

// ---------------------------------------------------------------------------
// Synonym → canonical match returns true
// ---------------------------------------------------------------------------

test(// Verifies: specs/pelilauta/tags/spec.md §hasTaggedEntries returns true when an entry exists for the canonical or any synonym
"hasTaggedEntries: D&D synonym 'deddu' in seed → true via d%26d canonical", async ({ request }) => {
  const { status, body } = await callEndpoint(request, "d%26d");
  expect(status).toBe(200);
  expect(body?.result).toBe(true);
});

test(// Verifies: specs/pelilauta/tags/spec.md §hasTaggedEntries returns true when an entry exists for the canonical or any synonym
"hasTaggedEntries: L&L synonym 'löllö' in seed → true via legendoja %26 lohikäärmeitä", async ({
  request,
}) => {
  const { status, body } = await callEndpoint(
    request,
    encodeURIComponent("legendoja %26 lohikäärmeitä"),
  );
  expect(status).toBe(200);
  expect(body?.result).toBe(true);
});

// ---------------------------------------------------------------------------
// Plain tag presence returns true
// ---------------------------------------------------------------------------

test(// Verifies: specs/pelilauta/tags/spec.md §hasTaggedEntries returns true when an entry exists for the canonical or any synonym
"hasTaggedEntries: plain tag 'peliraportit' present in seed → true", async ({ request }) => {
  const { status, body } = await callEndpoint(request, "peliraportit");
  expect(status).toBe(200);
  expect(body?.result).toBe(true);
});

// ---------------------------------------------------------------------------
// Supertag without seed coverage returns false
// ---------------------------------------------------------------------------

test(// Verifies: specs/pelilauta/tags/spec.md §hasTaggedEntries returns false when no matching entry exists
"hasTaggedEntries: pathfinder not in seed → false", async ({ request }) => {
  const { status, body } = await callEndpoint(request, "pathfinder");
  expect(status).toBe(200);
  expect(body?.result).toBe(false);
});

// ---------------------------------------------------------------------------
// Unknown slug returns false
// ---------------------------------------------------------------------------

test(// Verifies: specs/pelilauta/tags/spec.md §hasTaggedEntries returns false when no matching entry exists
"hasTaggedEntries: unknown slug 'made-up-game-name' → false", async ({ request }) => {
  const { status, body } = await callEndpoint(request, "made-up-game-name");
  expect(status).toBe(200);
  expect(body?.result).toBe(false);
});

// ---------------------------------------------------------------------------
// Defense layer: missing slug → 400
// ---------------------------------------------------------------------------

test("has-tagged-entries endpoint: missing slug → 400", async ({ request }) => {
  const response = await request.get(ENDPOINT, {
    headers: { "x-e2e-seed-secret": E2E_SECRET },
  });
  expect(response.status()).toBe(400);
});

// ---------------------------------------------------------------------------
// Defense layer: missing header → 401
// ---------------------------------------------------------------------------

test("has-tagged-entries endpoint: missing x-e2e-seed-secret header → 401", async ({ request }) => {
  const response = await request.get(`${ENDPOINT}?slug=anything`);
  expect(response.status()).toBe(401);
});
