// Verifies: specs/pelilauta/profiles/spec.md §ProfileSchema parses a valid doc
// Verifies: specs/pelilauta/profiles/spec.md §ProfileSchema falls back nick to "N.N." when missing
// Verifies: specs/pelilauta/profiles/spec.md §ProfileSchema coalesces legacy photoURL into avatarURL
// Verifies: specs/pelilauta/profiles/spec.md §ProfileSchema derives username from nick when missing
// Verifies: specs/pelilauta/profiles/spec.md §ProfileSchema filters malformed link entries

import { describe, expect, it } from "vitest";
import { ProfileSchema } from "./schemas";

describe("ProfileSchema", () => {
  it("parses a valid doc", () => {
    const out = ProfileSchema.parse({
      key: "uid-a",
      username: "ada",
      nick: "Ada",
      avatarURL: "https://example.com/a.png",
    });

    expect(out.key).toBe("uid-a");
    expect(out.username).toBe("ada");
    expect(out.nick).toBe("Ada");
    expect(out.avatarURL).toBe("https://example.com/a.png");
  });

  it("falls back nick to N.N. when missing", () => {
    const out = ProfileSchema.parse({ key: "uid-a", username: "ada" });
    expect(out.nick).toBe("N.N.");
  });

  it("coalesces legacy photoURL into avatarURL", () => {
    const out = ProfileSchema.parse({
      key: "uid-a",
      username: "ada",
      nick: "Ada",
      photoURL: "https://example.com/a.png",
    });

    expect(out.avatarURL).toBe("https://example.com/a.png");
  });

  it("derives username from nick when missing", () => {
    const out = ProfileSchema.parse({ key: "uid-a", nick: "Ada Lovelace" });
    expect(out.username).toBe("ada-lovelace");
  });

  it("filters malformed links", () => {
    const out = ProfileSchema.parse({
      key: "uid-a",
      username: "ada",
      nick: "Ada",
      links: [{ url: "https://example.com", label: "site" }, { url: "https://example.com/2" }],
    });

    expect(out.links).toEqual([{ url: "https://example.com", label: "site" }]);
  });
});
