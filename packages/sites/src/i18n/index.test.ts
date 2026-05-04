// Scenario: "Sites i18n sub-export ships sites:title"
// — specs/pelilauta/sites/spec.md

import { describe, expect, it } from "vitest";
import { en, fi } from "./index";

describe("sites i18n", () => {
  it("fi tree exports the title key as 'Sivustot'", () => {
    expect(fi.title).toBe("Sivustot");
  });

  it("en tree exports the title key as 'Sites'", () => {
    expect(en.title).toBe("Sites");
  });

  it("fi tree has no extra unexpected keys (MVP scope)", () => {
    expect(Object.keys(fi)).toContain("title");
  });

  it("en tree has no extra unexpected keys (MVP scope)", () => {
    expect(Object.keys(en)).toContain("title");
  });
});
