/**
 * CnIconFallback.ts - Tier 3 Essential UI symbols (MIT).
 * Guaranteed to be available even if Tier 1 or Tier 2 registries fail.
 */

export interface FallbackIcon {
  paths: { d: string; fill?: string; opacity?: number }[];
  viewBox?: string;
}

export const FallbackIcons: Record<string, FallbackIcon> = {
  // Generic failure icon
  missing: {
    paths: [
      {
        d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
      },
    ],
    viewBox: "0 0 24 24",
  },

  // Essential UI symbols (MIT licensed)
  menu: {
    paths: [{ d: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" }],
    viewBox: "0 0 24 24",
  },
  close: {
    paths: [
      {
        d: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z",
      },
    ],
    viewBox: "0 0 24 24",
  },
  account: {
    paths: [
      {
        d: "M12 4a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z",
      },
    ],
    viewBox: "0 0 24 24",
  },
  "arrow-left": {
    paths: [{ d: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" }],
    viewBox: "0 0 24 24",
  },
};
