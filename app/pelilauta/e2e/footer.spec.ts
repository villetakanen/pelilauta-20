import { expect, test } from "@playwright/test";

test("footer baseline content renders on home page", async ({ page }) => {
  await page.goto("/");

  const footer = page.getByRole("contentinfo", { name: "Site footer" });
  await expect(footer).toBeVisible();
  await expect(footer.getByRole("heading", { name: "Pelilauta" })).toBeVisible();
  await expect(footer.getByRole("heading", { name: "Roolipelit verkossa" })).toBeVisible();
});

test("footer renders default shared credits on home page", async ({ page }) => {
  await page.goto("/");

  const footer = page.getByRole("contentinfo", { name: "Site footer" });
  await expect(footer.getByText("Background image © Juno Viinikka")).toBeVisible();
  await expect(footer.getByText("undefined")).not.toBeVisible();
});
