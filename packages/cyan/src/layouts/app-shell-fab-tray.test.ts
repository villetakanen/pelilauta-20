import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Verifies: specs/cyan-ds/layouts/app-shell/fab-tray.md §FAB tray positions elements in the bottom-right corner
// Verifies: specs/cyan-ds/layouts/app-shell/fab-tray.md §Multiple FAB items stack vertically

const APP_SHELL_ASTRO = readFileSync(resolve(__dirname, "AppShell.astro"), "utf-8");
const Z_TOKENS_CSS = readFileSync(resolve(__dirname, "../tokens/z.css"), "utf-8");

describe("AppShell FAB Tray — Contract", () => {
  it("renders a named fab-tray slot inside cn-fab-tray container", () => {
    expect(APP_SHELL_ASTRO).toContain('<nav class="cn-fab-tray"');
    expect(APP_SHELL_ASTRO).toContain('<slot name="fab-tray" />');
  });

  it("conditionally renders the fab-tray wrapper only when the slot has content", () => {
    // Verifies: specs/cyan-ds/layouts/app-shell/fab-tray.md — empty nav landmark suppression
    expect(APP_SHELL_ASTRO).toContain('Astro.slots.has("fab-tray")');
  });

  it("uses fixed bottom-right positioning and z-index token", () => {
    expect(APP_SHELL_ASTRO).toContain("position: fixed;");
    expect(APP_SHELL_ASTRO).toContain("right: var(--cn-gap, 1rem);");
    expect(APP_SHELL_ASTRO).toContain("bottom: var(--cn-gap, 1rem);");
    expect(APP_SHELL_ASTRO).toContain("z-index: var(--cn-z-fab);");
  });

  it("stacks multiple tray items in a vertical flex column", () => {
    expect(APP_SHELL_ASTRO).toContain("display: flex;");
    expect(APP_SHELL_ASTRO).toContain("flex-direction: column;");
    expect(APP_SHELL_ASTRO).toContain("gap: var(--cn-grid, 0.5rem);");
  });

  it("defines --cn-z-fab token in z-index registry", () => {
    expect(Z_TOKENS_CSS).toMatch(/--cn-z-fab:\s*\d+;/);
  });
});
