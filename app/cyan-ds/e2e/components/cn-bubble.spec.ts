// E2E tests for CnBubble in the Living Style Book. These cover the spec
// scenarios that depend on real CSS resolution (custom properties,
// light-dark()), a layout engine (bounding rects), and the accessibility
// tree — none of which jsdom provides. Structural/prop-mapping coverage is
// in packages/cyan/src/components/CnBubble.test.ts.
//
// Verifies: specs/cyan-ds/components/cn-bubble/spec.md §Default bubble renders the left-tail variant
// Verifies: specs/cyan-ds/components/cn-bubble/spec.md §Reply bubble renders the right-tail variant
// Verifies: specs/cyan-ds/components/cn-bubble/spec.md §First slotted child has no top margin
// Verifies: specs/cyan-ds/components/cn-bubble/spec.md §Leading header slot sits flush with the top edge
// Verifies: specs/cyan-ds/components/cn-bubble/spec.md §Trailing footer slot sits flush with the bottom edge
// Verifies: specs/cyan-ds/components/cn-bubble/spec.md §Empty bubble preserves shape
// Verifies: specs/cyan-ds/components/cn-bubble/spec.md §Tail decoration is not in the accessibility tree

import { expect, type Locator, type Page, test } from "@playwright/test";

// Demo index mapping (mirrors the order in app/cyan-ds/src/content/components/cn-bubble.mdx).
const DEMO = {
  basicDefault: 0,
  basicReply: 1,
  // 2..4 — Conversation Flow
  leadingHeader: 5,
  trailingFooter: 6,
  // 7 — Media Composition
  empty: 8,
} as const;

function bubble(scope: Page | Locator, index: number): Locator {
  return scope.locator(".cn-bubble").nth(index);
}

const px = (value: string) => Number.parseFloat(value);

test.describe("CnBubble — variant rendering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/components/cn-bubble");
    await expect(page.locator(".cn-bubble").first()).toBeVisible();
  });

  test("default variant: <article>, no reply class, var(--cn-bubble) background, left margin", async ({
    page,
  }) => {
    const article = bubble(page, DEMO.basicDefault);

    await expect(article).toHaveJSProperty("tagName", "ARTICLE");
    expect(await article.evaluate((el) => el.classList.contains("reply"))).toBe(false);

    const styles = await article.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      const tokenBg = cs.getPropertyValue("--cn-bubble").trim();
      return {
        background: cs.backgroundColor,
        tokenBg,
        marginLeft: cs.marginLeft,
        gapToken: cs.getPropertyValue("--cn-gap").trim(),
        radius: cs.borderRadius,
        radiusTopLeft: cs.borderTopLeftRadius,
        radiusTopRight: cs.borderTopRightRadius,
        radiusBottomLeft: cs.borderBottomLeftRadius,
        radiusBottomRight: cs.borderBottomRightRadius,
        mediumRadius: cs.getPropertyValue("--cn-border-radius-medium").trim(),
      };
    });

    // Background resolves through the --cn-bubble token (non-empty + non-transparent).
    expect(styles.background).not.toBe("");
    expect(styles.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(styles.tokenBg).not.toBe("");

    // Left margin equals --cn-gap.
    const expectedGapPx = px(
      await page.evaluate((g) => {
        const probe = document.createElement("div");
        probe.style.width = g;
        document.body.appendChild(probe);
        const w = window.getComputedStyle(probe).width;
        probe.remove();
        return w;
      }, styles.gapToken || "var(--cn-gap)"),
    );
    expect(px(styles.marginLeft)).toBeCloseTo(expectedGapPx, 1);

    // Top-left corner is unrounded (= 0px); the other three corners equal --cn-border-radius-medium.
    expect(px(styles.radiusTopLeft)).toBe(0);
    expect(styles.radiusTopRight).toBe(styles.radiusBottomLeft);
    expect(styles.radiusBottomLeft).toBe(styles.radiusBottomRight);
    expect(px(styles.radiusTopRight)).toBeGreaterThan(0);
  });

  test("reply variant: <article>, reply class, var(--cn-reply-bubble) background, right margin", async ({
    page,
  }) => {
    const article = bubble(page, DEMO.basicReply);

    await expect(article).toHaveJSProperty("tagName", "ARTICLE");
    expect(await article.evaluate((el) => el.classList.contains("reply"))).toBe(true);

    const styles = await article.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        background: cs.backgroundColor,
        marginRight: cs.marginRight,
        marginLeft: cs.marginLeft,
        radiusTopLeft: cs.borderTopLeftRadius,
        radiusTopRight: cs.borderTopRightRadius,
        radiusBottomLeft: cs.borderBottomLeftRadius,
        radiusBottomRight: cs.borderBottomRightRadius,
      };
    });

    expect(styles.background).not.toBe("");
    expect(styles.background).not.toBe("rgba(0, 0, 0, 0)");

    // Reply variant: right margin set, left margin zero.
    expect(px(styles.marginRight)).toBeGreaterThan(0);
    expect(px(styles.marginLeft)).toBe(0);

    // Top-right is unrounded; the other three corners are equal and non-zero.
    expect(px(styles.radiusTopRight)).toBe(0);
    expect(px(styles.radiusTopLeft)).toBeGreaterThan(0);
    expect(styles.radiusTopLeft).toBe(styles.radiusBottomLeft);
    expect(styles.radiusBottomLeft).toBe(styles.radiusBottomRight);
  });

  test("default and reply backgrounds resolve to different colors", async ({ page }) => {
    const def = bubble(page, DEMO.basicDefault);
    const reply = bubble(page, DEMO.basicReply);

    const defBg = await def.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    const replyBg = await reply.evaluate((el) => window.getComputedStyle(el).backgroundColor);

    expect(defBg).not.toBe(replyBg);
  });
});

test.describe("CnBubble — slot behaviour", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/components/cn-bubble");
  });

  test("first slotted paragraph has computed margin-top of 0", async ({ page }) => {
    const article = bubble(page, DEMO.basicDefault);
    const firstChild = article.locator("> *").first();
    const marginTop = await firstChild.evaluate((el) => window.getComputedStyle(el).marginTop);
    expect(px(marginTop)).toBe(0);
  });

  test("leading <header> sits flush with the article's top edge", async ({ page }) => {
    const article = bubble(page, DEMO.leadingHeader);
    const header = article.locator("> header").first();
    await expect(header).toBeVisible();

    const { articleTop, headerTop } = await article.evaluate((el) => {
      const h = el.querySelector(":scope > header") as HTMLElement;
      return {
        articleTop: el.getBoundingClientRect().top,
        headerTop: h.getBoundingClientRect().top,
      };
    });
    // Flush ⇒ the header's top edge aligns with the article's outer top edge,
    // give or take sub-pixel rounding.
    expect(Math.abs(articleTop - headerTop)).toBeLessThan(1);
  });

  test("trailing <footer> sits flush with the article's bottom edge", async ({ page }) => {
    const article = bubble(page, DEMO.trailingFooter);
    const footer = article.locator("> footer").last();
    await expect(footer).toBeVisible();

    const { articleBottom, footerBottom } = await article.evaluate((el) => {
      const f = el.querySelector(":scope > footer") as HTMLElement;
      return {
        articleBottom: el.getBoundingClientRect().bottom,
        footerBottom: f.getBoundingClientRect().bottom,
      };
    });
    expect(Math.abs(articleBottom - footerBottom)).toBeLessThan(1);
  });
});

test.describe("CnBubble — empty bubble shape", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/components/cn-bubble");
  });

  test("empty bubble renders at min-height of calc(var(--cn-gap) * 4)", async ({ page }) => {
    const article = bubble(page, DEMO.empty);
    await expect(article).toBeVisible();

    const { height, gap } = await article.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      const probe = document.createElement("div");
      probe.style.width = "var(--cn-gap)";
      document.body.appendChild(probe);
      const gapPx = window.getComputedStyle(probe).width;
      probe.remove();
      return { height: cs.height, gap: gapPx };
    });

    expect(px(height)).toBeGreaterThanOrEqual(px(gap) * 4 - 0.5);
  });

  test("empty bubble has no children but still renders the shape (background)", async ({
    page,
  }) => {
    const article = bubble(page, DEMO.empty);
    expect(await article.evaluate((el) => el.children.length)).toBe(0);

    const bg = await article.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe("");
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  });
});

test.describe("CnBubble — accessibility tree", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/components/cn-bubble");
  });

  test("bubble appears as an article landmark with no decorative tail node", async ({ page }) => {
    const article = bubble(page, DEMO.basicDefault);
    await expect(article).toBeVisible();

    // The <article> element carries the landmark role; CSS ::after pseudo-elements
    // never appear in the accessibility tree by definition, so the tail decoration
    // is excluded by construction. Asserting the role here and that no descendant
    // carries a tail-related accessible name is sufficient.
    await expect(article).toHaveRole("article");

    // No descendant should carry a role or accessible name referencing the tail decoration.
    // CSS ::after nodes are not exposed to the a11y tree — this guards against future
    // accidental aria attributes being added to a visible tail element.
    const tailRoleCount = await article
      .locator("[aria-label*='tail'], [aria-label*='decorat']")
      .count();
    expect(tailRoleCount).toBe(0);
  });
});
