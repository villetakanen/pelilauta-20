// E2E tests for CnRichComposer. These cover spec scenarios that require a real
// browser layout engine: Write/Preview tab toggling with rendered HTML, dropzone
// overlay visibility during drag, and file-drop callback invocation. Structural
// tests (tab selection state, attachment rendering, drag class toggling) live in
// packages/cyan-editor/src/CnRichComposer.test.ts.
//
// Verifies: specs/cyan-ds/cyan-editor/cn-rich-composer.md §Toggling write and preview tabs
// Verifies: specs/cyan-ds/cyan-editor/cn-rich-composer.md §File dropping invokes onupload callback

import { expect, test } from "@playwright/test";

const PAGE = "/components/cyan-editor";

// ---------------------------------------------------------------------------
// Helper: open the composer dialog via the demo's "Open Composer" button
// ---------------------------------------------------------------------------
async function openComposer(page: import("@playwright/test").Page) {
  await page.goto(PAGE);
  // Wait for the Svelte island to hydrate
  const openBtn = page.locator(".cn-rich-composer-demo__open-btn").first();
  await expect(openBtn).toBeVisible();
  await openBtn.click();
  // Dialog should become visible
  const dialog = page.locator("dialog.cn-rich-composer").first();
  await expect(dialog).toBeVisible();
  return dialog;
}

// ---------------------------------------------------------------------------
// Scenario: Toggling write and preview tabs
// Verifies: specs/cyan-ds/cyan-editor/cn-rich-composer.md §Toggling write and preview tabs
// ---------------------------------------------------------------------------
test.describe("CnRichComposer — Write/Preview tab toggle", () => {
  test("Write tab is active by default and editor is visible", async ({ page }) => {
    const dialog = await openComposer(page);

    const writeTab = dialog.getByRole("tab", { name: "Write" });
    await expect(writeTab).toBeVisible();
    await expect(writeTab).toHaveAttribute("aria-selected", "true");

    // CodeMirror host should be present
    const editorHost = dialog.locator(".cn-rich-composer__editor-host");
    await expect(editorHost).toBeVisible();
  });

  test("clicking Preview tab shows preview container and hides editor", async ({ page }) => {
    const dialog = await openComposer(page);

    const previewTab = dialog.getByRole("tab", { name: "Preview" });
    await previewTab.click();

    await expect(previewTab).toHaveAttribute("aria-selected", "true");

    // Editor host should be removed from DOM
    await expect(dialog.locator(".cn-rich-composer__editor-host")).not.toBeAttached();

    // Preview container should be present
    await expect(dialog.locator(".cn-rich-composer__preview")).toBeVisible();
  });

  test("switching back to Write tab restores the editor", async ({ page }) => {
    const dialog = await openComposer(page);

    await dialog.getByRole("tab", { name: "Preview" }).click();
    await dialog.getByRole("tab", { name: "Write" }).click();

    await expect(dialog.locator(".cn-rich-composer__editor-host")).toBeVisible();
    await expect(dialog.locator(".cn-rich-composer__preview")).not.toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// Scenario: File dropping invokes onupload callback
// Verifies: specs/cyan-ds/cyan-editor/cn-rich-composer.md §File dropping invokes onupload callback
// ---------------------------------------------------------------------------
test.describe("CnRichComposer — drag and drop", () => {
  test("drag overlay appears during dragover and is dismissed after dragleave", async ({
    page,
  }) => {
    const dialog = await openComposer(page);

    // Trigger dragover
    await dialog.dispatchEvent("dragover", { dataTransfer: {} });

    // Overlay should become visible
    const overlay = dialog.locator(".cn-rich-composer__drop-overlay--visible");
    await expect(overlay).toBeVisible();

    // Trigger dragleave
    await dialog.dispatchEvent("dragleave");
    await expect(overlay).not.toBeVisible();
  });

  test("dropping a file via dataTransfer triggers onupload and dismisses overlay", async ({
    page,
  }) => {
    const dialog = await openComposer(page);

    // Listen for any console messages that confirm upload callback was called
    // (the demo logs to the activity log in the DOM — check that after drop)

    // Create a DataTransfer with one file via Playwright's API
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      const file = new File(["test content"], "screenshot.png", { type: "image/png" });
      dt.items.add(file);
      return dt;
    });

    // Fire dragover so the overlay appears
    await dialog.dispatchEvent("dragover", { dataTransfer });
    // Fire drop
    await dialog.dispatchEvent("drop", { dataTransfer });

    // Overlay should be dismissed after drop
    await expect(dialog.locator(".cn-rich-composer--drag-over")).not.toBeAttached();

    // Activity log should show the upload was triggered
    const log = page.locator(".cn-rich-composer-demo__log").first();
    await expect(log).toContainText("screenshot.png");
  });

  test("dropzone overlay has visible drop label text", async ({ page }) => {
    const dialog = await openComposer(page);

    await dialog.dispatchEvent("dragover", { dataTransfer: {} });

    const overlay = dialog.locator(".cn-rich-composer__drop-overlay--visible");
    await expect(overlay).toContainText("Drop files to attach");
  });
});

// ---------------------------------------------------------------------------
// Scenario: Formatting buttons modify text
// Verifies: specs/cyan-ds/cyan-editor/cn-rich-composer.md §Formatting buttons modify text
// ---------------------------------------------------------------------------
test.describe("CnRichComposer — formatting buttons", () => {
  test("Bold button wraps typed text in markdown bold syntax", async ({ page }) => {
    // NOTE: CodeMirror's selection model requires keyboard-driven input rather than
    // fill() because fill() replaces the entire content-editable without going through
    // CodeMirror's own transaction pipeline, bypassing the editor state. We type text
    // directly, select the last word via keyboard, then click Bold and assert.
    const dialog = await openComposer(page);

    const cmContent = dialog.locator(".cm-content");
    await expect(cmContent).toBeVisible();

    // Click into editor to focus it
    await cmContent.click();

    // Type "Hello world" via keyboard so CodeMirror tracks the content
    await page.keyboard.type("Hello world");

    // Select "world" — move back 5 characters then shift-select to end
    await page.keyboard.press("End");
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowLeft");
    }
    await page.keyboard.press("Shift+End");

    // Click the Bold button
    const boldBtn = dialog.getByRole("button", { name: "Bold" });
    await boldBtn.click();

    // Assert the editor content now contains bold-wrapped word
    await expect(cmContent).toContainText("Hello **world**");
  });
});

// ---------------------------------------------------------------------------
// Scenario: Responsive layout
// ---------------------------------------------------------------------------
test.describe("CnRichComposer — responsive layout", () => {
  test("desktop: dialog is not full-screen (width < 100vw)", async ({ page }) => {
    // Default Playwright viewport is 1280x720 (desktop)
    const dialog = await openComposer(page);

    const viewportSize = page.viewportSize();
    const vpWidth = viewportSize?.width ?? 1280;
    const dialogWidth = await dialog.evaluate((el) => el.getBoundingClientRect().width);

    // Desktop dialog should be narrower than the viewport
    expect(dialogWidth).toBeLessThan(vpWidth);
  });

  test("mobile: dialog is full-screen", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await context.newPage();

    const dialog = await openComposer(page);

    const viewportSize = page.viewportSize();
    const vpWidth = viewportSize?.width ?? 375;
    const dialogWidth = await dialog.evaluate((el) => el.getBoundingClientRect().width);

    // On mobile the dialog should fill the full width
    expect(dialogWidth).toBe(vpWidth);

    await context.close();
  });
});
