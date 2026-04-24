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
  google: {
    paths: [
      {
        d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",
        fill: "#4285F4",
      },
      {
        d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",
        fill: "#34A853",
      },
      {
        d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z",
        fill: "#FBBC05",
      },
      {
        d: "M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z",
        fill: "#EA4335",
      },
    ],
    viewBox: "0 0 24 24",
  },
};
