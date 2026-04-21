import * as firebaseServer from "@pelilauta/firebase/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleRequest } from "./middleware";

vi.mock("astro:middleware", () => ({
  defineMiddleware: vi.fn((fn) => fn),
}));

vi.mock("@pelilauta/firebase/server", async () => {
  const actual = await vi.importActual<typeof import("@pelilauta/firebase/server")>(
    "@pelilauta/firebase/server",
  );
  return {
    ...actual,
    verifySessionCookie: vi.fn(),
  };
});

function makeContext(cookieValue?: string) {
  const get = vi.fn(() => (cookieValue === undefined ? undefined : { value: cookieValue }));
  const redirect = vi.fn();
  const locals = {} as App.Locals;
  return {
    ctx: { cookies: { get }, locals, redirect } as never,
    locals,
    redirect,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("middleware", () => {
  it("populates locals as anonymous when no cookie is present (Scenario: Anonymous SSR on missing cookie)", async () => {
    const { ctx, locals, redirect } = makeContext();
    const next = vi.fn(() => Promise.resolve("next-result" as never));

    const result = await handleRequest(ctx, next);

    expect(locals.uid).toBeNull();
    expect(locals.claims).toBeNull();
    expect(locals.sessionState).toBe("initial");
    expect(next).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBe("next-result");
  });

  it("populates locals from valid cookie (Scenario: SSR identity resolution from valid cookie)", async () => {
    const { ctx, locals, redirect } = makeContext("valid-session");
    const next = vi.fn(() => Promise.resolve(new Response(null)));

    vi.mocked(firebaseServer.verifySessionCookie).mockResolvedValue({
      uid: "user-123",
      admin: true,
      iat: 1,
      exp: 2,
    } as never);

    await handleRequest(ctx, next);

    expect(firebaseServer.verifySessionCookie).toHaveBeenCalledWith("valid-session", true);
    expect(locals.uid).toBe("user-123");
    expect(locals.claims).toEqual({ admin: true });
    expect(locals.sessionState).toBe("active");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("downgrades to initial on a revoked/expired cookie without logging", async () => {
    const { ctx, locals, redirect } = makeContext("invalid-session");
    const next = vi.fn(() => Promise.resolve(new Response(null)));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const authError = Object.assign(new Error("Revoked"), {
      code: "auth/session-cookie-revoked",
    });
    vi.mocked(firebaseServer.verifySessionCookie).mockRejectedValue(authError);

    await handleRequest(ctx, next);

    expect(firebaseServer.verifySessionCookie).toHaveBeenCalledWith("invalid-session", true);
    expect(locals.uid).toBeNull();
    expect(locals.claims).toBeNull();
    expect(locals.sessionState).toBe("initial");
    expect(redirect).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("logs unexpected infrastructure errors (non-auth/* code) while downgrading to initial", async () => {
    const { ctx, locals } = makeContext("anything");
    const next = vi.fn(() => Promise.resolve(new Response(null)));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(firebaseServer.verifySessionCookie).mockRejectedValue(
      new Error("service account not found"),
    );

    await handleRequest(ctx, next);

    expect(locals.sessionState).toBe("initial");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[0]).toContain("[middleware]");

    errorSpy.mockRestore();
  });
});
