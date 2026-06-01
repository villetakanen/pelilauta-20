// getMetadataDate — extracts the display timestamp for the thread metadata block.
//
// Date source is thread.createdAt (NOT flowTime). This is a deliberate v20
// divergence: flowTime is bumped on every reply, so it answers "when was this
// thread last active?", not "when was this thread posted?". See:
// specs/pelilauta/threads/detail-page/sidebar-metadata.md §Architecture.
//
// Falls back to 0 (epoch) when createdAt is absent, producing a clearly-broken
// "1970-01-01" placeholder rather than crashing with RangeError. Matches v17's
// new Date(0) fallback pattern.

/**
 * Returns milliseconds since epoch for the thread's creation date.
 * Reads `thread.createdAt`; ignores `thread.flowTime`.
 */
export function getMetadataDate(thread: { createdAt?: Date; flowTime?: number }): number {
  return thread.createdAt instanceof Date ? thread.createdAt.getTime() : 0;
}
