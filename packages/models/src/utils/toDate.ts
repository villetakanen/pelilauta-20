/**
 * Converts various date-like values to a native Date.
 *
 * Accepts `unknown` because the primary caller is schema preprocessing over
 * raw Firestore documents where the field's runtime shape is unknown until
 * inspected. All non-date-like inputs fall back to new Date(0).
 *
 * Recognised inputs:
 *   - Date instance → returned as-is
 *   - ISO string or numeric string → parsed via new Date()
 *   - number → treated as epoch milliseconds
 *   - Firestore Timestamp-shaped object { seconds: number, nanoseconds: number }
 *   - null / undefined / anything else → returns new Date(0)
 */
export function toDate(value: unknown): Date {
  if (value === null || value === undefined) {
    return new Date(0);
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  }

  // Firestore Timestamp-shaped object
  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    "nanoseconds" in value &&
    typeof (value as { seconds: unknown }).seconds === "number" &&
    typeof (value as { nanoseconds: unknown }).nanoseconds === "number"
  ) {
    const ts = value as { seconds: number; nanoseconds: number };
    return new Date(ts.seconds * 1000 + Math.floor(ts.nanoseconds / 1_000_000));
  }

  return new Date(0);
}
