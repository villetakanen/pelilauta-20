// Pure data-prep for TopSitesStream — see specs/pelilauta/front-page/top-sites-stream/spec.md.
// Verifies: specs/pelilauta/front-page/top-sites-stream/spec.md §Per-card prop computation

import type { TFn } from "@pelilauta/i18n";
import { type Site, systemToNoun } from "@pelilauta/sites/server";
import { dateLabel } from "@pelilauta/utils/dates";
import { generateSrcset, netlifyImage } from "@pelilauta/utils/images";

// coverSizes constant — v18 carry-forward per spec §Architecture.Per-card derived values.
const COVER_SIZES = "(max-width: 768px) 100vw, 450px";

export interface SiteCardData {
  key: string;
  name: string;
  description?: string;
  owners: readonly string[];
  players: readonly string[];
  systemNoun: string;
  systemLabel: string;
  systemHref: string;
  coverUrl?: string;
  coverSrcset?: string;
  coverSizes?: string;
  dateLabel: string;
}

export function buildTopSiteCards(sites: Site[], locale: string, t: TFn): SiteCardData[] {
  return sites.map((site) => {
    // Cover image — PROD: use Netlify CDN helpers; dev: raw URL pass-through.
    let coverUrl: string | undefined;
    let coverSrcset: string | undefined;
    let coverSizes: string | undefined;

    if (site.posterURL) {
      coverUrl = netlifyImage(site.posterURL, { width: 450, format: "webp", quality: 85 });
      // In dev, netlifyImage returns the raw URL; generateSrcset still calls netlifyImage
      // so we only emit srcset/sizes in production (when netlifyImage returns a CDN URL).
      if (import.meta.env.PROD) {
        coverSrcset = generateSrcset(site.posterURL, [450, 900], { format: "webp", quality: 85 });
        coverSizes = COVER_SIZES;
      }
    }

    // System eyebrow
    const systemNoun = systemToNoun(site.system);
    const i18nKey = `sites:site.systems.${site.system}`;
    const rawLabel = t(i18nKey);
    // t() returns the key itself when the translation is missing — treat that as a miss.
    const systemLabel = rawLabel === i18nKey ? site.system : rawLabel;
    const systemHref = `/tags/${site.system}`;

    return {
      key: site.key,
      name: site.name,
      description: site.description,
      owners: site.owners,
      players: site.players ?? [],
      systemNoun,
      systemLabel,
      systemHref,
      coverUrl,
      coverSrcset,
      coverSizes,
      dateLabel: dateLabel(site.flowTime, locale),
    };
  });
}
