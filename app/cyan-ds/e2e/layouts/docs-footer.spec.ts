import { expect, test } from "@playwright/test";

test("docs host renders footer content via AppShell slots", async ({ page }) => {
  await page.goto("/principles/layout-composition/docs-footer");

  const footer = page.getByRole("contentinfo", { name: "Site footer" });
  await expect(footer).toBeVisible();
  await expect(footer.getByRole("heading", { name: "Documentation" })).toBeVisible();
  await expect(footer.getByRole("heading", { name: "Layout Composition" })).toBeVisible();
  await expect(footer.getByRole("heading", { name: "Workspace" })).toBeVisible();
  await expect(
    footer.getByText("Cyan Design System documentation for Pelilauta workspace."),
  ).toBeVisible();
});

test("modal docs pages omit AppShell footer region", async ({ page }) => {
  await page.goto("/_fixtures/modal-footerless");

  await expect(page.getByRole("contentinfo", { name: "Site footer" })).not.toBeVisible();
  await expect(page.getByText("fixture footer body should stay hidden in modal")).not.toBeVisible();
  await expect(page.getByText("fixture credits should stay hidden in modal")).not.toBeVisible();
});

test("docs footer remains domain-neutral", async ({ page }) => {
  await page.goto("/principles/layout-composition/docs-footer");

  const footer = page.getByRole("contentinfo", { name: "Site footer" });
  await expect(footer.getByText("Roolipelitiedotus")).not.toBeVisible();
  await expect(footer.getByText("Roolipelifoorumi Discord")).not.toBeVisible();
  await expect(footer.getByText("Myrrys")).not.toBeVisible();
});
