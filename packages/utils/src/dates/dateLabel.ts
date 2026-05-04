// dateLabel — locale-aware relative-or-absolute date formatter.
// See specs/pelilauta/dates/spec.md.

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function dateLabel(date: number | Date, locale: string, now?: Date): string {
  const nowTime = (now ?? new Date()).getTime();
  const dateTime = new Date(date).getTime();
  const elapsedMs = nowTime - dateTime;

  if (Math.abs(elapsedMs) < SEVEN_DAYS_MS) {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const absMs = Math.abs(elapsedMs);
    if (absMs < 60_000) {
      return rtf.format(-Math.round(elapsedMs / 1_000), "second");
    } else if (absMs < 3_600_000) {
      return rtf.format(-Math.round(elapsedMs / 60_000), "minute");
    } else if (absMs < 86_400_000) {
      return rtf.format(-Math.round(elapsedMs / 3_600_000), "hour");
    } else {
      return rtf.format(-Math.round(elapsedMs / 86_400_000), "day");
    }
  }

  return new Date(date).toISOString().substring(0, 10);
}
