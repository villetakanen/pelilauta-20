import * as authServer from "@pelilauta/auth/server";
import * as firebaseServer from "@pelilauta/firebase/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeApiContext } from "./auth/_testContext";
import { POST } from "./threads";

vi.mock("@pelilauta/firebase/server", () => ({
  verifyIdToken: vi.fn(),
}));

vi.mock("@pelilauta/auth/server", () => ({
  getAccount: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/threads", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const { ctx } = makeApiContext();

    const response = await POST(ctx);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(firebaseServer.verifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 401 when verifyIdToken rejects", async () => {
    const { ctx } = makeApiContext({ headers: { authorization: "Bearer bad-token" } });
    vi.mocked(firebaseServer.verifyIdToken).mockRejectedValue(new Error("token expired"));

    const response = await POST(ctx);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(authServer.getAccount).not.toHaveBeenCalled();
  });

  it("returns 403 for frozen accounts", async () => {
    // Verifies: specs/pelilauta/session/frozen.md §Frozen users are blocked by server-side thread-write endpoints
    const { ctx } = makeApiContext({ headers: { authorization: "Bearer good-token" } });
    vi.mocked(firebaseServer.verifyIdToken).mockResolvedValue({ uid: "frozen-uid" } as never);
    vi.mocked(authServer.getAccount).mockResolvedValue({ frozen: true });

    const response = await POST(ctx);

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Forbidden");
    expect(authServer.getAccount).toHaveBeenCalledWith("frozen-uid");
  });

  it("allows non-frozen users through the frozen guard", async () => {
    const { ctx } = makeApiContext({ headers: { authorization: "Bearer good-token" } });
    vi.mocked(firebaseServer.verifyIdToken).mockResolvedValue({ uid: "active-uid" } as never);
    vi.mocked(authServer.getAccount).mockResolvedValue({ frozen: false });

    const response = await POST(ctx);

    expect(response.status).toBe(501);
    expect(await response.text()).toBe("Not implemented");
    expect(authServer.getAccount).toHaveBeenCalledWith("active-uid");
  });
});
