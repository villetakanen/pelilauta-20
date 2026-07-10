import { afterEach, describe, expect, it, vi } from "vitest";
import { isAppEnabled } from "./appFlags";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isAppEnabled", () => {
  it("Scenario: Unset flags leave every surface enabled", () => {
    // Verifies: specs/pelilauta/app-flags/spec.md §Unset flags leave every surface enabled
    expect(isAppEnabled("threads")).toBe(true);
    expect(isAppEnabled("sites")).toBe(true);
    expect(isAppEnabled("tags")).toBe(true);
    expect(isAppEnabled("profiles")).toBe(true);
  });

  it("disables an app only for the literal 'false'", () => {
    vi.stubEnv("PUBLIC_app_threads", "false");
    expect(isAppEnabled("threads")).toBe(false);
  });

  it("fails open on any other value", () => {
    vi.stubEnv("PUBLIC_app_threads", "FALSE");
    vi.stubEnv("PUBLIC_app_tags", "0");
    vi.stubEnv("PUBLIC_app_sites", "off");
    expect(isAppEnabled("threads")).toBe(true);
    expect(isAppEnabled("tags")).toBe(true);
    expect(isAppEnabled("sites")).toBe(true);
  });

  it("Scenario: Enabled apps are unaffected by other apps' flags", () => {
    // Verifies: specs/pelilauta/app-flags/spec.md §Enabled apps are unaffected by other apps' flags
    vi.stubEnv("PUBLIC_app_threads", "false");
    expect(isAppEnabled("profiles")).toBe(true);
    expect(isAppEnabled("sites")).toBe(true);
  });
});
