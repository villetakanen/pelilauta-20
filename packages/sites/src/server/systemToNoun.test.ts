// Scenarios: "systemToNoun maps known systems"
//            "systemToNoun falls back for unknown systems"
// — specs/pelilauta/sites/spec.md

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@pelilauta/utils/log", () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
}));

describe("systemToNoun", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("maps known system 'homebrew' to 'homebrew'", async () => {
    const { systemToNoun } = await import("./systemToNoun");
    expect(systemToNoun("homebrew")).toBe("homebrew");
  });

  it("maps known system 'dnd5e' — alias 'dd' in the table — to 'dd5'", async () => {
    // The v17 table uses 'dd' (not 'dnd5e') as the key — verify against the actual table
    const { systemToNoun } = await import("./systemToNoun");
    expect(systemToNoun("dd")).toBe("dd5");
  });

  it("maps known system 'pathfinder' to 'pathfinder'", async () => {
    const { systemToNoun } = await import("./systemToNoun");
    expect(systemToNoun("pathfinder")).toBe("pathfinder");
  });

  it("maps known system 'pbta' to 'pbta'", async () => {
    const { systemToNoun } = await import("./systemToNoun");
    expect(systemToNoun("pbta")).toBe("pbta");
  });

  it("returns 'homebrew' and logs warn for an unknown system", async () => {
    const logModule = await import("@pelilauta/utils/log");
    const { systemToNoun } = await import("./systemToNoun");

    const result = systemToNoun("made-up-game-name");

    expect(result).toBe("homebrew");
    expect(logModule.logWarn).toHaveBeenCalled();
  });

  it("returns 'homebrew' and logs warn for undefined input", async () => {
    const logModule = await import("@pelilauta/utils/log");
    const { systemToNoun } = await import("./systemToNoun");

    const result = systemToNoun(undefined);

    expect(result).toBe("homebrew");
    expect(logModule.logWarn).toHaveBeenCalled();
  });

  it("does not log warn for a known system", async () => {
    const logModule = await import("@pelilauta/utils/log");
    vi.mocked(logModule.logWarn).mockClear();
    const { systemToNoun } = await import("./systemToNoun");

    systemToNoun("homebrew");

    expect(logModule.logWarn).not.toHaveBeenCalled();
  });
});
