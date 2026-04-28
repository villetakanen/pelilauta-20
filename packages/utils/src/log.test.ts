// Logging tests — specs/pelilauta/logging/spec.md

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

describe("logError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("unwraps ZodError and logs the issues array", async () => {
    const { logError } = await import("./log");
    const schema = z.object({ name: z.string() });
    let zodErr: z.ZodError | undefined;
    try {
      schema.parse({ name: 42 });
    } catch (e) {
      zodErr = e as z.ZodError;
    }
    if (!zodErr) throw new Error("expected ZodError to be thrown");
    logError(zodErr);
    expect(console.error).toHaveBeenCalledWith("🦑", zodErr.issues);
  });

  it("formats errors with a .code property", async () => {
    const { logError } = await import("./log");
    const err = { code: "auth/invalid-token", message: "Token expired" };
    logError(err);
    expect(console.error).toHaveBeenCalledWith("🔥", "auth/invalid-token", "Token expired");
  });

  it("falls through to generic logging for plain args", async () => {
    const { logError } = await import("./log");
    logError("context", 42);
    expect(console.error).toHaveBeenCalledWith("🦑", "context", 42);
  });

  it("never throws", async () => {
    const { logError } = await import("./log");
    expect(() => logError(undefined, null, 0, "", false)).not.toThrow();
  });
});

describe("logWarn", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("is silent when PUBLIC_LOG_VERBOSE is not set", async () => {
    const { logWarn } = await import("./log");
    logWarn("test");
    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe("logDebug", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("is silent when PUBLIC_LOG_VERBOSE is not set", async () => {
    const { logDebug } = await import("./log");
    logDebug("test");
    expect(console.debug).not.toHaveBeenCalled();
  });
});
