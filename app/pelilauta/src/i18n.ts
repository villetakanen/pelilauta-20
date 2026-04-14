// Host composition seam for i18n.
//
// This file is the SINGLE place namespace keys are assigned. Feature packages
// propose strings via their own `./i18n` sub-exports; the host decides where
// they hang in the registry. See specs/pelilauta/i18n/spec.md.

import { createT, type Locales } from "@pelilauta/i18n";
import { en as threadsEn, fi as threadsFi } from "@pelilauta/threads/i18n";
import { en as appEn, fi as appFi } from "./locales/app/index.js";

const locales: Locales = {
  fi: {
    app: appFi,
    pelilauta: appFi,
    threads: threadsFi,
  },
  en: {
    app: appEn,
    pelilauta: appEn,
    threads: threadsEn,
  },
};

export const DEFAULT_LOCALE = "fi";

export const t = createT(locales, DEFAULT_LOCALE);
