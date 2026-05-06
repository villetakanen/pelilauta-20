// Verifies: specs/pelilauta/models/spec.md §normalizeEntryTimestamps coerces all three entry timestamp fields
// Verifies: specs/pelilauta/models/spec.md §normalizeEntryTimestamps no-ops on non-object inputs

import { toDate } from "./toDate.js";

export function normalizeEntryTimestamps(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const data = { ...(raw as Record<string, unknown>) };
  data.createdAt = toDate(data.createdAt);
  data.updatedAt = toDate(data.updatedAt);
  data.flowTime = toDate(data.flowTime).getTime();
  return data;
}
