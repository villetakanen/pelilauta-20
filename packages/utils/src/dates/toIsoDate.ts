// toIsoDate — always-absolute UTC YYYY-MM-DD formatter.
// See specs/pelilauta/dates/spec.md.

export function toIsoDate(date: number | Date): string {
  return new Date(date).toISOString().substring(0, 10);
}
