import { describe, expect, it } from "vitest";
import { projectProfileFromClaims } from "./projectProfile";

describe("projectProfileFromClaims", () => {
  it("Scenario: projectProfileFromClaims extracts nick and avatarURL from Google OIDC claims", () => {
    expect(projectProfileFromClaims({ name: "Alice", picture: "https://x/a.png" })).toEqual({
      nick: "Alice",
      avatarURL: "https://x/a.png",
    });
  });

  it("Scenario: projectProfileFromClaims falls back safely on malformed claims — empty", () => {
    expect(projectProfileFromClaims({})).toEqual({ nick: "User", avatarURL: undefined });
  });

  it("Scenario: projectProfileFromClaims falls back safely on malformed claims — non-string types", () => {
    expect(projectProfileFromClaims({ name: 42, picture: null })).toEqual({
      nick: "User",
      avatarURL: undefined,
    });
    expect(projectProfileFromClaims({ name: "Bob", picture: { url: "x" } })).toEqual({
      nick: "Bob",
      avatarURL: undefined,
    });
  });

  it("Scenario: projectProfileFromClaims falls back safely on malformed claims — empty strings", () => {
    expect(projectProfileFromClaims({ name: "", picture: "" })).toEqual({
      nick: "User",
      avatarURL: undefined,
    });
  });
});
