// seed-e2e.ts — Populate the dev Firestore with deterministic E2E test data.
//
// Usage:  pnpm seed:e2e  (from workspace root)
// Direct: node --experimental-strip-types packages/firebase/scripts/seed-e2e.ts
//
// What it does:
//   1. Deletes all documents in the `stream` collection
//   2. Writes 5 thread documents with known keys
//   3. Writes the `meta/threads` document with a `topics` array containing
//      the channels referenced by the seed threads
//
// The data is copied verbatim from production snapshots to exercise real-world
// edge cases: legacy `topic` field, malformed `author` arrays, HTML `content`
// alongside `markdownContent`, optional fields like `quoteRef` and `siteKey`.
//
// Does NOT go through ThreadSchema.parse() — documents are written as raw
// Firestore data to mirror what the real database contains (pre-normalization).

import { config as loadDotenv } from "dotenv";
import { cert, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

import { dirname, resolve } from "node:path";
// Resolve .env.development from workspace root regardless of CWD
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(__dirname, "../../../.env.development") });

const app = initializeApp({
  credential: cert({
    projectId: process.env.PUBLIC_projectId,
    privateKey: process.env.SECRET_private_key,
    clientEmail: process.env.SECRET_client_email,
  } as ServiceAccount),
  databaseURL: process.env.PUBLIC_databaseURL,
  storageBucket: process.env.PUBLIC_storageBucket,
});

const db = getFirestore(app);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Firestore Timestamp from an ISO-ish date string. */
function ts(isoDate: string): Timestamp {
  return Timestamp.fromDate(new Date(isoDate));
}

/** Delete every document in a collection (small collections only). */
async function clearCollection(collectionPath: string): Promise<number> {
  const snapshot = await db.collection(collectionPath).get();
  if (snapshot.empty) return 0;

  const batch = db.batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
  return snapshot.size;
}

// ---------------------------------------------------------------------------
// Seed data — 5 threads, ordered by flowTime descending
// ---------------------------------------------------------------------------

const SEED_THREADS: Record<string, Record<string, unknown>> = {
  // Thread 5 (most recent flowTime) — tags, labels
  "seed-haukka-meri-5": {
    author: "YN8dQz3H8OMsb0L4jImAlROPQpo1",
    channel: "yleinen",
    createdAt: ts("2025-09-26T18:40:30Z"),
    flowTime: ts("2025-10-17T11:02:54Z"),
    key: "H80i220q4pZYhP4DsaPn",
    labels: ["letl"],
    lovedCount: 0,
    markdownContent:
      "Mua epäilytti tää sessio aika lailla etukäteen. Sitä tuntee muutenkin olevansa vähän ruosteessa kun ei enää tule pelautettua niin paljon, ja kun tässä nyt oli kesälomataukokin välissä. Tästä huolimatta peli oli oikeastaan kaikin puolin onnistunut.",
    owners: ["YN8dQz3H8OMsb0L4jImAlROPQpo1"],
    public: true,
    replyCount: 0,
    tags: ["Löllö", "Deddu", "peliraportit"],
    poster:
      "https://firebasestorage.googleapis.com/v0/b/skaldbase.appspot.com/o/Sites%2Fhaukka-ja-meri%2F2520ec97-f983-40d8-97ff-810e78b5b15a-backgroundURL%20(1).webp?alt=media&token=8c51468c-4ae0-45c8-ad37-526fe8041fbc",
    title: "Haukka & Meri, osa 5",
    updatedAt: ts("2025-10-17T11:02:54Z"),
  },

  // Thread 1 — long markdown, images array, labels
  "seed-ropecon-2025": {
    author: "OsqlmotvuGco7FuG0adVp4fk5TW2",
    channel: "yleinen",
    createdAt: ts("2025-07-28T06:42:54Z"),
    flowTime: ts("2025-07-28T10:33:51Z"),
    images: [],
    key: "9PJABMxt1R6WSrDeM2oW",
    labels: ["ropecon"],
    lovedCount: 0,
    markdownContent:
      "Ropecon 2025 on ohi ja tekee mieli kirjoitella omista tapahtumista ylös niin hehkutusta kuin oivalluksia. Olin vetämässä kahta 4-tunnin seikkailua 19-23 perjantaina ja lauantaina.",
    owners: ["OsqlmotvuGco7FuG0adVp4fk5TW2"],
    public: true,
    replyCount: 0,
    tags: [],
    title: "Ropecon 2025 - coniraportti",
    updatedAt: ts("2025-07-28T10:33:51Z"),
  },

  // Thread 4 — malformed author (array of int), quoteRef, legacy topic
  "seed-hahmonluonti": {
    author: [0],
    channel: "roolipelit",
    createdAt: ts("2024-10-12T09:27:23Z"),
    flowTime: ts("2024-10-14T10:30:58Z"),
    lovedCount: 0,
    markdownContent:
      "> Mä itse huomaan kaipaavani paljon sellaisia turhia taitoja tai vaikka sosiaalisia heikkouksia jotka Storytellerin hyvin atominen attribuutti+taito yhdistelmä tuotti.",
    owners: ["YN8dQz3H8OMsb0L4jImAlROPQpo1"],
    public: true,
    quoteRef: "eH75FZ5xN1qV94R687ys/K7hhUhTK7g6vEWsryMwj",
    replyCount: 3,
    title: "Pelejä joissa hyvä hahmonluonti?",
    topic: "roolipelit",
    updatedAt: ts("2024-10-12T09:27:23Z"),
  },

  // Thread 2 — legacy topic, HTML content field, sticky, subscriberCount
  "seed-pelit-seurattavaksi": {
    author: "YN8dQz3H8OMsb0L4jImAlROPQpo1",
    channel: "pelisuunnittelu",
    content:
      "<p>Petri jakoi aamusesta hyvän artikkelin (linkki alla) jossa käsiteltiin havaintoja etäpelaamisesta nykypäivänä.</p>",
    createdAt: ts("2023-08-15T05:48:20Z"),
    flowTime: ts("2023-08-16T09:21:59Z"),
    lovedCount: 1,
    markdownContent:
      "Petri jakoi aamusesta hyvän artikkelin (linkki alla) jossa käsiteltiin havaintoja etäpelaamisesta nykypäivänä.",
    owners: ["YN8dQz3H8OMsb0L4jImAlROPQpo1"],
    public: true,
    replyCount: 5,
    seenCount: 0,
    sticky: false,
    subscriberCount: 2,
    title: "Pelit jotka on tehty seurattavaksi",
    topic: "Pelisuunnittelu",
    updatedAt: ts("2023-08-15T05:48:20Z"),
  },

  // Thread 3 — legacy topic, site field, events listing
  "seed-tapahtumat-2023": {
    author: "YN8dQz3H8OMsb0L4jImAlROPQpo1",
    channel: "tapahtumat",
    content: "<p><em>Aikajärjestyksessä</em></p><h3>Tulevat</h3>",
    createdAt: ts("2023-02-22T07:57:20Z"),
    flowTime: ts("2023-02-22T09:14:47Z"),
    markdownContent: "_Aikajärjestyksessä_\n### Tulevat",
    owners: ["YN8dQz3H8OMsb0L4jImAlROPQpo1"],
    public: true,
    seenCount: 1,
    site: "mekanismi",
    sticky: false,
    subscriberCount: 0,
    title: "Tapahtumat 2023",
    topic: "tapahtumat",
    updatedAt: ts("2023-02-22T09:14:47Z"),
  },
};

// ---------------------------------------------------------------------------
// Channel seed — meta/threads document with topics array
// ---------------------------------------------------------------------------

const SEED_CHANNELS = [
  {
    slug: "yleinen",
    name: "Yleinen",
    description:
      "Keskustelu niin roolipeleistä kuin muistakin peleistä, ilmiöistä ja kaikesta pelaamiseen liittyvästä.",
    icon: "discussion",
    category: "Pelilauta",
    threadCount: 2,
    flowTime: new Date("2025-10-17T11:02:54Z").getTime(),
  },
  {
    slug: "pelisuunnittelu",
    name: "Pelisuunnittelu",
    description:
      "Kysymykset, ajatukset, varastettavat ideat ja kaikki muu pelisuunnitteluun liittyvä keskustelu. ",
    icon: "edit",
    category: "Pelilauta",
    threadCount: 1,
    flowTime: new Date("2023-08-16T09:21:59Z").getTime(),
  },
  {
    slug: "tapahtumat",
    name: "Tapahtumat, uutiset ja uudet tuotteet",
    description: "Ropecon, Alfacon, Tracon hitpoint jne.",
    icon: "monsters",
    category: "Meta",
    threadCount: 1,
    flowTime: new Date("2023-02-22T09:14:47Z").getTime(),
  },
  {
    slug: "roolipelit",
    name: "Roolipelit",
    description: "Roolipelit, systeemit, uutiset ja muu pöytäroolipeleihin liittyvä keskustelu.",
    icon: "d20",
    category: "Pelilauta",
    threadCount: 1,
    flowTime: new Date("2024-10-14T10:30:58Z").getTime(),
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding E2E test data into Firestore...\n");

  // 1. Clear stream collection
  const deleted = await clearCollection("stream");
  console.log(`  Deleted ${deleted} documents from 'stream'`);

  // 2. Write seed threads
  const batch = db.batch();
  for (const [docId, data] of Object.entries(SEED_THREADS)) {
    batch.set(db.collection("stream").doc(docId), data);
  }
  await batch.commit();
  console.log(`  Wrote ${Object.keys(SEED_THREADS).length} threads to 'stream'`);

  // 3. Write channel directory
  await db.doc("meta/threads").set({ topics: SEED_CHANNELS }, { merge: true });
  console.log(`  Wrote ${SEED_CHANNELS.length} channels to 'meta/threads'`);

  console.log("\nDone. Seed data ready for E2E tests.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
