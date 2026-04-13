// Host composition seam for i18n.
//
// This file is the SINGLE place namespace keys are assigned. Feature packages
// propose strings via their own `./i18n` sub-exports; the host decides where
// they hang in the registry. See specs/pelilauta/i18n/spec.md.

import { createT, type Locales } from "@pelilauta/i18n";
import { en as appEn, fi as appFi } from "./locales/app/index.js";

const locales: Locales = {
  fi: {
    app: appFi,
    // threads: threadsFi, sites: sitesFi, … — added as feature packages land.
  },
  en: {
    app: appEn,
  },
};

export const DEFAULT_LOCALE = "fi";

export const t = createT(locales, DEFAULT_LOCALE);
