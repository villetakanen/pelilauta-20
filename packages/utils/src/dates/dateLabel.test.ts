import { describe, expect, it } from "vitest";
import { dateLabel } from "./dateLabel";

const NOW = new Date("2026-05-04T12:00:00Z");

describe("dateLabel", () => {
  it("A few seconds ago renders as relative seconds", () => {
    const date = new Date(NOW.getTime() - 30_000);
    const expected = new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-30, "second");
    expect(dateLabel(date, "en", NOW)).toBe(expected);
  });

  it("A few hours ago renders as relative hours", () => {
    const date = new Date(NOW.getTime() - 5 * 3_600_000);
    const expected = new Intl.RelativeTimeFormat("fi", { numeric: "auto" }).format(-5, "hour");
    expect(dateLabel(date, "fi", NOW)).toBe(expected);
  });

  it("5 days ago renders as relative days", () => {
    const date = new Date(NOW.getTime() - 5 * 86_400_000);
    const expected = new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-5, "day");
    expect(dateLabel(date, "en", NOW)).toBe(expected);
  });

  it("Just under 7 days renders as relative", () => {
    // 6 days, 23 hours, 59 minutes before now
    const delta = 6 * 86_400_000 + 23 * 3_600_000 + 59 * 60_000;
    const date = new Date(NOW.getTime() - delta);
    const result = dateLabel(date, "en", NOW);
    expect(result).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("Exactly 7 days renders as absolute", () => {
    const date = new Date("2026-04-27T12:00:00Z");
    expect(dateLabel(date, "en", NOW)).toBe("2026-04-27");
  });

  it("More than 7 days renders as absolute", () => {
    const date = new Date(NOW.getTime() - 30 * 86_400_000);
    expect(dateLabel(date, "fi", NOW)).toBe("2026-04-04");
  });

  it("Future timestamp renders as relative (positive direction)", () => {
    const date = new Date(NOW.getTime() + 2 * 86_400_000);
    const expected = new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(2, "day");
    expect(dateLabel(date, "en", NOW)).toBe(expected);
  });

  it("Epoch input has no special-casing", () => {
    expect(dateLabel(0, "en", NOW)).toBe("1970-01-01");
  });
});
