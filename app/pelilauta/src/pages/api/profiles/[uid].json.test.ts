import * as profilesServer from "@pelilauta/profiles/server";
import { describe, expect, it, vi } from "vitest";
import { GET } from "./[uid].json";

vi.mock("@pelilauta/profiles/server", () => ({
  getProfile: vi.fn(),
}));

describe("/api/profiles/[uid].json", () => {
  it("returns 400 for missing uid", async () => {
    const response = await GET({ params: {}, request: { headers: new Headers() } } as never);
    expect(response.status).toBe(400);
  });

  it("returns 404 for missing profile", async () => {
    vi.mocked(profilesServer.getProfile).mockResolvedValue(null);
    const response = await GET({
      params: { uid: "uid-x" },
      request: { headers: new Headers() },
    } as never);
    expect(response.status).toBe(404);
  });

  it("returns 200 with etag for found profile", async () => {
    vi.mocked(profilesServer.getProfile).mockResolvedValue({
      key: "uid-a",
      username: "ada",
      nick: "Ada",
      avatarURL: "https://example.com/a.png",
    });

    const response = await GET({
      params: { uid: "uid-a" },
      request: { headers: new Headers() },
    } as never);

    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBeTruthy();
    expect(response.headers.get("cache-control")).toBe("s-maxage=60, stale-while-revalidate=300");
  });

  it("returns 304 when if-none-match matches", async () => {
    vi.mocked(profilesServer.getProfile).mockResolvedValue({
      key: "uid-a",
      username: "ada",
      nick: "Ada",
      avatarURL: "https://example.com/a.png",
    });

    const first = await GET({
      params: { uid: "uid-a" },
      request: { headers: new Headers() },
    } as never);
    const etag = first.headers.get("etag") ?? "";

    const second = await GET({
      params: { uid: "uid-a" },
      request: { headers: new Headers({ "if-none-match": etag }) },
    } as never);

    expect(second.status).toBe(304);
  });
});
