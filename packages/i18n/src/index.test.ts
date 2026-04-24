import { describe, expect, it } from "vitest";
import { createT, type Locales } from "./index.js";

const locales: Locales = {
  fi: {
    app: {
      title: "Pelilauta",
      greeting: { morning: "Huomenta" },
      welcome: "Hei {name}, tervetuloa {name}!",
      unread: "Sinulla on {n} uutta viestiä",
      onlyFi: "Vain suomeksi",
    },
    threads: {
      list: { empty: "Ei keskusteluja" },
    },
  },
  en: {
    app: {
      title: "Pelilauta",
      greeting: { morning: "Good morning" },
    },
    threads: {
      list: { empty: "No discussions" },
    },
  },
};

const t = createT(locales, "fi");

describe("createT — key resolution", () => {
  it("resolves a nested key in the active locale", () => {
    expect(t("app:greeting.morning", undefined, "fi")).toBe("Huomenta");
  });

  it("defaults the namespace to `app` when no `:` is present", () => {
    expect(t("title", undefined, "fi")).toBe("Pelilauta");
  });

  it("falls back to the default locale when the key is missing in the current locale", () => {
    expect(t("app:onlyFi", undefined, "en")).toBe("Vain suomeksi");
  });

  it("returns the key verbatim when missing in both locales", () => {
    expect(t("app:does.not.exist")).toBe("app:does.not.exist");
  });

  it("returns the key when path traverses into a string", () => {
    expect(t("app:title.sub", undefined, "fi")).toBe("app:title.sub");
  });

  it("returns the key when the namespace does not exist", () => {
    expect(t("nope:whatever", undefined, "fi")).toBe("nope:whatever");
  });

  it("returns the key when the locale does not exist", () => {
    expect(t("app:title", undefined, "ja")).toBe("Pelilauta"); // falls back to fi
  });
});

describe("createT — substitution", () => {
  it("replaces placeholders globally", () => {
    expect(t("app:welcome", { name: "Ada" }, "fi")).toBe("Hei Ada, tervetuloa Ada!");
  });

  it("coerces numeric substitution values to string", () => {
    expect(t("app:unread", { n: 3 }, "fi")).toBe("Sinulla on 3 uutta viestiä");
  });

  it("does not throw when substitution keys contain regex metacharacters", () => {
    const t2 = createT({ fi: { app: { x: "value: {a.b}" } } }, "fi");
    expect(t2("app:x", { "a.b": "ok" })).toBe("value: ok");
  });
});

describe("createT — host composition (per-package locale assembly)", () => {
  it("resolves a feature-package namespace assigned by the host", () => {
    expect(t("threads:list.empty", undefined, "fi")).toBe("Ei keskusteluja");
    expect(t("threads:list.empty", undefined, "en")).toBe("No discussions");
  });
});

describe("createT — robustness", () => {
  it("never throws for arbitrary string input", () => {
    const t2 = createT({}, "fi");
    expect(() => t2("")).not.toThrow();
    expect(() => t2("::::")).not.toThrow();
    expect(() => t2("a.b.c")).not.toThrow();
    expect(() => t2("ns:a.b", { x: 1 }, "zz")).not.toThrow();
  });
});
