// Verifies: specs/pelilauta/models/spec.md §withEntryNormalization composes timestamps before subclass normalization
// Verifies: specs/pelilauta/models/spec.md §withEntryNormalization works without an extra normalizer
// Verifies: specs/pelilauta/models/spec.md §An entry-extending domain schema delivers Date timestamps end-to-end

import { z } from "zod";
import { normalizeEntryTimestamps } from "./normalizeEntryTimestamps.js";

export function withEntryNormalization<T extends z.ZodTypeAny>(
  inner: T,
  extra?: (raw: unknown) => unknown,
): z.ZodEffects<T, z.output<T>, unknown> {
  return z.preprocess(
    (raw) => (extra ? extra(normalizeEntryTimestamps(raw)) : normalizeEntryTimestamps(raw)),
    inner,
  );
}
