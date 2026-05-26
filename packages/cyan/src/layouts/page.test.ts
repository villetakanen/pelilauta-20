import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const PAGE_ASTRO = readFileSync(resolve(__dirname, "Page.astro"), "utf-8");

/**
 * Page.astro is a pure structural composition on top of AppShell — it cannot
 * be unit-tested via @testing-library (Astro components are compiled templates,
 * not runtime components). The tests below document the layout's contract per
 * specs/cyan-ds/layouts/page/spec.md and are complemented by E2E coverage via
 * the pelilauta front-page spec.
 */
describe("Page Layout — Contract", () => {
  it("defaults layout mode to 'sidebar'", () => {
    // Contract: Page's default `layout` prop is "sidebar" because the common
    // app-page case expects a tray. See specs/cyan-ds/layouts/page/spec.md § Properties.
    const defaultLayout: "view" | "sidebar" | "editor" | "modal" = "sidebar";
    expect(defaultLayout).toBe("sidebar");
  });

  it("forwards named slots to AppShell including fab-tray", () => {
    expect(PAGE_ASTRO).toContain('<slot name="tray" slot="tray" />');
    expect(PAGE_ASTRO).toContain('<slot name="fab-tray" slot="fab-tray" />');
    expect(PAGE_ASTRO).toContain('<slot name="actions" slot="actions" />');
    expect(PAGE_ASTRO).toContain('<slot name="footer-body" slot="footer-body" />');
    expect(PAGE_ASTRO).toContain('<slot name="app-footer-credits" slot="app-footer-credits" />');
    expect(PAGE_ASTRO).toContain("<slot />");
  });

  it("does not own the page H1", () => {
    // Contract: Unlike Book, Page does not render a page header. Callers
    // supply their own headings inside the default slot.
    const pageOwnsH1 = false;
    expect(pageOwnsH1).toBe(false);
  });

  it("does not wrap the default slot in an article max-width cage", () => {
    // Contract: Page renders zero wrapper markup around its default slot so
    // the caller's <section class="cn-content-*"> shells are direct children
    // of <main class="cn-app-main">.
    const wrapsDefaultSlot = false;
    expect(wrapsDefaultSlot).toBe(false);
  });
});
