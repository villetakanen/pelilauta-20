/**
 * @pelilauta/icons - Tier 1 Community MIT Icon Registry.
 */

export const icons = {
  fox: new URL("./fox.svg", import.meta.url).pathname,
  mekanismi: new URL("./mekanismi.svg", import.meta.url).pathname,
  add: new URL("./add.svg", import.meta.url).pathname,
} as const;

export type IconNoun = keyof typeof icons;
