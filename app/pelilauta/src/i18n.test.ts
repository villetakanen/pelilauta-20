import { createT, type Locales } from "@pelilauta/i18n";
import { describe, expect, it } from "vitest";
import { t } from "./i18n.js";

describe("host i18n seam", () => {
  it("exports a callable t bound to the default locale (fi)", () => {
    expect(typeof t).toBe("function");
    // Empty registry today; missing keys return the key — the contract that
    // matters here is that the seam is wired and does not throw.
    expect(t("app:title")).toBe("app:title");
  });

  it("composes feature-package locales into namespaces (simulated)", () => {
    // This mirrors what app/pelilauta/src/i18n.ts will do once
    // packages/threads ships its `./i18n` sub-export.
    const locales: Locales = {
      fi: { app: {}, threads: { list: { empty: "Ei keskusteluja" } } },
      en: { app: {}, threads: { list: { empty: "No discussions" } } },
    };
    const tHost = createT(locales, "fi");
    expect(tHost("threads:list.empty", undefined, "fi")).toBe("Ei keskusteluja");
    expect(tHost("threads:list.empty", undefined, "en")).toBe("No discussions");
  });
});
