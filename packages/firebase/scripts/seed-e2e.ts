// seed-e2e.ts — Populate the dev Firestore with deterministic E2E test data.
//
// Usage:  pnpm seed:e2e  (from workspace root)
// Direct: node --experimental-strip-types packages/firebase/scripts/seed-e2e.ts
//
// What it does:
//   1. Deletes all documents in the `stream` collection along with their
//      `comments` sub-collections (Firestore does not cascade these).
//   2. Writes 5 thread documents with known keys
//   3. Writes reply sub-collections under `stream/{threadKey}/comments/*`
//      for threads with non-zero replyCount, so M5–M8 has real data to render.
//   4. Writes the `meta/threads` document with a `topics` array containing
//      the channels referenced by the seed threads
//   5. Upserts profile documents for the two seed thread author uids so
//      ProfileLink resolves to real nicks instead of the anonymous fallback.
//      Does NOT clear the `profiles` collection — real user profiles coexist.
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

/**
 * Clear the `stream` collection AND every thread's `comments` sub-collection.
 *
 * Firestore does not cascade deletes from a parent doc to its sub-collections,
 * so reply docs would otherwise be orphaned across reseeds. Walks each existing
 * thread, deletes its comments, then drops the thread docs themselves.
 */
async function clearStreamAndReplies(): Promise<{ threads: number; replies: number }> {
  const snapshot = await db.collection("stream").get();
  if (snapshot.empty) return { threads: 0, replies: 0 };

  let replies = 0;
  for (const threadDoc of snapshot.docs) {
    const commentsSnap = await threadDoc.ref.collection("comments").get();
    if (commentsSnap.empty) continue;
    const batch = db.batch();
    for (const replyDoc of commentsSnap.docs) {
      batch.delete(replyDoc.ref);
    }
    await batch.commit();
    replies += commentsSnap.size;
  }

  const threadBatch = db.batch();
  for (const doc of snapshot.docs) {
    threadBatch.delete(doc.ref);
  }
  await threadBatch.commit();

  return { threads: snapshot.size, replies };
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
// Reply seed — sub-collection docs at stream/{threadKey}/comments/{replyKey}
//
// Reply count and shape mirror what the parent thread's `replyCount` advertises,
// so the front-page reply counter and the detail-page rendered list stay in
// sync. Written as raw Firestore data (Timestamp, not Date) — ReplySchema's
// preprocessors handle the conversion at read time.
//
// Two real seed authors (Petri / YN8...; Mikko / Osqlm...) are reused so
// AvatarLink and ProfileLink resolve to real nicks rather than the anonymous
// fallback.
// ---------------------------------------------------------------------------

const SEED_REPLIES: Record<string, Record<string, Record<string, unknown>>> = {
  "seed-hahmonluonti": {
    "seed-reply-hl-1": {
      flowTime: ts("2024-10-13T08:00:00Z"),
      createdAt: ts("2024-10-13T08:00:00Z"),
      updatedAt: ts("2024-10-13T08:00:00Z"),
      owners: ["OsqlmotvuGco7FuG0adVp4fk5TW2"],
      author: "OsqlmotvuGco7FuG0adVp4fk5TW2",
      markdownContent:
        "Storyteller on tästä loistava esimerkki. Burning Wheel taas tekee saman Lifepath-systeemillä — heikkoudet syntyy hahmon historiasta, ei erillisestä listasta.",
    },
    "seed-reply-hl-2": {
      flowTime: ts("2024-10-13T18:30:00Z"),
      createdAt: ts("2024-10-13T18:30:00Z"),
      updatedAt: ts("2024-10-13T18:30:00Z"),
      owners: ["YN8dQz3H8OMsb0L4jImAlROPQpo1"],
      author: "YN8dQz3H8OMsb0L4jImAlROPQpo1",
      markdownContent:
        "Burning Wheel on hyvä pointti. Uudemmissa peleissä yritetään saada sama juttu aspekteilla tai flageilla, mutta jotain häviää kun heikkoudet ei ole sidottu numeerisiin arvoihin.",
    },
    "seed-reply-hl-3": {
      flowTime: ts("2024-10-14T10:30:58Z"),
      createdAt: ts("2024-10-14T10:30:58Z"),
      updatedAt: ts("2024-10-14T10:30:58Z"),
      owners: ["OsqlmotvuGco7FuG0adVp4fk5TW2"],
      author: "OsqlmotvuGco7FuG0adVp4fk5TW2",
      markdownContent:
        "FATE:n aspektit on abstraktimpia kuin Storytellerin Flaws. Sekä rakastan että vihaan molempia eri syistä — eri pelit eri seurueille.",
    },
  },
  "seed-pelit-seurattavaksi": {
    "seed-reply-ps-1": {
      flowTime: ts("2023-08-15T08:12:00Z"),
      createdAt: ts("2023-08-15T08:12:00Z"),
      updatedAt: ts("2023-08-15T08:12:00Z"),
      owners: ["OsqlmotvuGco7FuG0adVp4fk5TW2"],
      author: "OsqlmotvuGco7FuG0adVp4fk5TW2",
      markdownContent:
        "Linkin takana ollut artikkeli oli kyllä hyvä. Etäpelaaminen on muuttanut sitä mitä yleisö pelaamiselta odottaa.",
    },
    "seed-reply-ps-2": {
      flowTime: ts("2023-08-15T11:45:00Z"),
      createdAt: ts("2023-08-15T11:45:00Z"),
      updatedAt: ts("2023-08-15T11:45:00Z"),
      owners: ["YN8dQz3H8OMsb0L4jImAlROPQpo1"],
      author: "YN8dQz3H8OMsb0L4jImAlROPQpo1",
      markdownContent:
        "Joo, ja varsinkin tuo havainto että pelin _esitettävyys_ kameralle on noussut ihan yhtä tärkeäksi kuin pelin sisäinen draama.",
    },
    "seed-reply-ps-3": {
      flowTime: ts("2023-08-15T19:08:00Z"),
      createdAt: ts("2023-08-15T19:08:00Z"),
      updatedAt: ts("2023-08-15T19:08:00Z"),
      owners: ["OsqlmotvuGco7FuG0adVp4fk5TW2"],
      author: "OsqlmotvuGco7FuG0adVp4fk5TW2",
      markdownContent:
        "Tämä. Kotipöydässä riittää että pelaajat tietää mitä hahmo tekee; striimissä pitää myös katsoja saada mukaan ilman että hidastetaan peliä.",
    },
    "seed-reply-ps-4": {
      flowTime: ts("2023-08-16T07:30:00Z"),
      createdAt: ts("2023-08-16T07:30:00Z"),
      updatedAt: ts("2023-08-16T07:30:00Z"),
      owners: ["YN8dQz3H8OMsb0L4jImAlROPQpo1"],
      author: "YN8dQz3H8OMsb0L4jImAlROPQpo1",
      markdownContent:
        "Aktuelli pointti. Onko kellään kokemuksia siitä että striimaaminen on _parantanut_ pöytäpelaamista? Mä en ole vielä uskaltanut testata.",
    },
    "seed-reply-ps-5": {
      flowTime: ts("2023-08-16T09:21:59Z"),
      createdAt: ts("2023-08-16T09:21:59Z"),
      updatedAt: ts("2023-08-16T09:21:59Z"),
      owners: ["OsqlmotvuGco7FuG0adVp4fk5TW2"],
      author: "OsqlmotvuGco7FuG0adVp4fk5TW2",
      markdownContent:
        "Mulla on hyviä kokemuksia. Pelaajat valmistautuu paremmin kun tietää että sessio on tallessa, ja se nostaa pelin yleistä laatua.",
    },
  },
};

// ---------------------------------------------------------------------------
// Profile seed — author profiles for the seed thread authors
// ---------------------------------------------------------------------------

const SEED_PROFILES: Record<string, Record<string, unknown>> = {
  YN8dQz3H8OMsb0L4jImAlROPQpo1: {
    nick: "Petri",
    username: "petri",
  },
  OsqlmotvuGco7FuG0adVp4fk5TW2: {
    nick: "Mikko",
    username: "mikko",
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
// Tag projection seed data
//
// Mirrors the shape toTagData() produces in v18. Only seed threads with
// non-empty tags arrays get a projection document.
// Doc-ID === data.key per the §Doc-ID materialization rule in ARCHITECTURE.md.
// ---------------------------------------------------------------------------

type TagProjection = {
  title: string;
  type: "thread";
  key: string;
  tags: string[];
  author: string;
  flowTime: number;
};

function buildTagProjections(): Array<[string, TagProjection]> {
  const result: Array<[string, TagProjection]> = [];
  for (const [docId, data] of Object.entries(SEED_THREADS)) {
    const rawTags = data.tags as string[] | undefined;
    if (!rawTags || rawTags.length === 0) continue;

    const key = (data.key as string | undefined) ?? docId;
    const author =
      Array.isArray(data.owners) && data.owners.length > 0
        ? String(data.owners[0])
        : typeof data.author === "string"
          ? data.author
          : "";
    // flowTime: stored as Timestamp in seed data — extract as milliseconds.
    const flowTimeTs = data.flowTime as Timestamp;
    const flowTimeMs = flowTimeTs.toDate().getTime();

    result.push([
      key,
      {
        title: data.title as string,
        type: "thread",
        key,
        tags: rawTags.map((t) => t.toLowerCase()),
        author,
        flowTime: flowTimeMs,
      },
    ]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding E2E test data into Firestore...\n");

  // 1. Clear stream collection AND its `comments` sub-collections
  const { threads: threadsDeleted, replies: repliesDeleted } = await clearStreamAndReplies();
  console.log(`  Deleted ${threadsDeleted} threads and ${repliesDeleted} replies from 'stream'`);

  // 2. Write seed threads
  const batch = db.batch();
  for (const [docId, data] of Object.entries(SEED_THREADS)) {
    batch.set(db.collection("stream").doc(docId), data);
  }
  await batch.commit();
  console.log(`  Wrote ${Object.keys(SEED_THREADS).length} threads to 'stream'`);

  // 2b. Write reply sub-collections under stream/{threadKey}/comments/{replyKey}
  let replyCount = 0;
  let threadsWithReplies = 0;
  const replyBatch = db.batch();
  for (const [threadKey, replies] of Object.entries(SEED_REPLIES)) {
    threadsWithReplies++;
    for (const [replyKey, replyData] of Object.entries(replies)) {
      replyBatch.set(
        db.collection("stream").doc(threadKey).collection("comments").doc(replyKey),
        replyData,
      );
      replyCount++;
    }
  }
  if (replyCount > 0) await replyBatch.commit();
  console.log(`  Wrote ${replyCount} replies across ${threadsWithReplies} thread sub-collections`);

  // 3. Write channel directory
  await db.doc("meta/threads").set({ topics: SEED_CHANNELS }, { merge: true });
  console.log(`  Wrote ${SEED_CHANNELS.length} channels to 'meta/threads'`);

  // 4. Upsert seed profiles (does not clear the collection — real users coexist)
  const profileBatch = db.batch();
  for (const [uid, data] of Object.entries(SEED_PROFILES)) {
    profileBatch.set(db.collection("profiles").doc(uid), data, { merge: true });
  }
  await profileBatch.commit();
  console.log(`  Upserted ${Object.keys(SEED_PROFILES).length} profiles to 'profiles'`);

  // 5. Clear and re-seed tags collection (tag projection documents).
  const tagsDeleted = await clearCollection("tags");
  console.log(`  Deleted ${tagsDeleted} documents from 'tags'`);

  const tagProjections = buildTagProjections();
  if (tagProjections.length > 0) {
    const tagBatch = db.batch();
    for (const [key, projection] of tagProjections) {
      tagBatch.set(db.collection("tags").doc(key), projection);
    }
    await tagBatch.commit();
  }
  console.log(`  Wrote ${tagProjections.length} tag projections to 'tags'`);

  console.log("\nDone. Seed data ready for E2E tests.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
