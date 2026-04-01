import { describe, expect, it } from "vitest";

describe("Button", () => {
  it("should be importable", async () => {
    const module = await import("./Button.svelte");
    expect(module.default).toBeDefined();
  });
});
