/**
 * Converts various date-like values to a native Date.
 *
 * Accepted inputs:
 *   - Date instance → returned as-is
 *   - ISO string or numeric string → parsed via new Date()
 *   - number → treated as epoch milliseconds
 *   - Firestore Timestamp-shaped object { seconds: number, nanoseconds: number }
 *   - null / undefined → returns new Date(0)
 *
 * Unrecognised shapes return new Date(0) (epoch) to stay consistent and predictable.
 */
export function toDate(
  value: Date | string | number | { seconds: number; nanoseconds: number } | null | undefined,
): Date {
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
    "seconds" in value &&
    "nanoseconds" in value &&
    typeof value.seconds === "number" &&
    typeof value.nanoseconds === "number"
  ) {
    return new Date(value.seconds * 1000 + Math.floor(value.nanoseconds / 1_000_000));
  }

  return new Date(0);
}
