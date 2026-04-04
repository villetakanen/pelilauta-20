import { describe, expect, it } from "vitest";
import { FallbackIcons } from "./CnIconFallback";

describe("CnIcon Architecture (SSR Resolution)", () => {
  it("should have access to Tier 3 FallbackIcons", () => {
    expect(FallbackIcons).toBeDefined();
    expect(FallbackIcons.missing).toBeDefined();
    expect(FallbackIcons.menu).toBeDefined();
  });

  it("should define essential UI paths correctly", () => {
    const missing = FallbackIcons.missing;
    expect(missing.paths).toBeInstanceOf(Array);
    expect(typeof missing.paths[0].d).toBe("string");
    expect(missing.viewBox).toBe("0 0 24 24");
  });

  it("should have all essential symbols for app-shell", () => {
    const required = ["menu", "close", "account", "arrow-left"];
    required.forEach((noun) => {
      expect(FallbackIcons[noun]).toBeDefined();
    });
  });
});
