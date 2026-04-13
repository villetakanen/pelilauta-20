// Tiny, dependency-free translation engine.
// See specs/pelilauta/i18n/spec.md for the contract.

export type NestedTranslation = string | { [key: string]: NestedTranslation };

export type Locale = {
  [namespace: string]: NestedTranslation;
};

export type Locales = {
  [locale: string]: Locale;
};

export type LocaleSubstitutions = {
  [key: string]: string | number;
};

export type TFn = (key: string, subs?: LocaleSubstitutions, currentLocale?: string) => string;

const DEFAULT_NAMESPACE = "app";

function findTranslation(obj: NestedTranslation | undefined, path: string): string | undefined {
  if (obj === undefined) return undefined;
  if (path === "") return typeof obj === "string" ? obj : undefined;

  let current: NestedTranslation = obj;
  for (const segment of path.split(".")) {
    if (typeof current === "string") return undefined;
    const next: NestedTranslation | undefined = current[segment];
    if (next === undefined) return undefined;
    current = next;
  }

  return typeof current === "string" ? current : undefined;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createT(locales: Locales, defaultLocale: string): TFn {
  return function t(key, subs, currentLocale = defaultLocale) {
    const colonIdx = key.indexOf(":");
    const namespace =
      colonIdx === -1 ? DEFAULT_NAMESPACE : key.slice(0, colonIdx) || DEFAULT_NAMESPACE;
    const path = colonIdx === -1 ? key : key.slice(colonIdx + 1);

    let translation = findTranslation(locales[currentLocale]?.[namespace], path);

    if (translation === undefined && currentLocale !== defaultLocale) {
      translation = findTranslation(locales[defaultLocale]?.[namespace], path);
    }

    if (translation === undefined) return key;

    if (subs) {
      for (const [k, v] of Object.entries(subs)) {
        translation = translation.replace(new RegExp(`\\{${escapeRegex(k)}\\}`, "g"), String(v));
      }
    }

    return translation;
  };
}
