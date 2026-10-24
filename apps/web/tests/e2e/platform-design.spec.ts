import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptySharedState } from "../../src/lib/shared";
import { emptySharedCommunity } from "../../src/lib/shared-community";
test("terminology pagination and filtering keep every result reachable", async ({ page }) => {
  await page.route("**/api/public", (route) =>
    route.fulfill({ json: { entries: [], articles: [], releases: [], configured: true } }),
  );
  await page.goto("/technology");
  await expect(page.locator(".commons-term-row")).toHaveCount(40);
  await expect(page.getByText("Showing 1–40 of 1000 terms", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 of 25", { exact: true })).toBeVisible();
  await page.getByLabel("Search entries", { exact: true }).fill("dashboard");
  await expect(page.locator(".commons-term-row")).toHaveCount(1);
  await expect(
    page.locator(".commons-term-row").getByText("dashboard", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Results pagination" })).toHaveCount(0);
  await page.getByLabel("Search entries", { exact: true }).fill("");
  await expect(page.getByText("Page 1 of 25", { exact: true })).toBeVisible();
});
test("mobile navigation closes after choosing a public page", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.route("**/api/public", (route) =>
    route.fulfill({ json: { entries: [], articles: [], releases: [], configured: true } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Public navigation" })
    .getByRole("link", { name: "About", exact: true })
    .click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("button", { name: "Open navigation", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("focused account screen supports password visibility and keyboard access", async ({
  page,
}) => {
  await page.route("**/api/workspace", (route) =>
    route.fulfill({ json: { ...emptySharedState, configured: true } }),
  );
  await page.route("**/api/community", (route) => route.fulfill({ json: emptySharedCommunity }));
  await page.goto("/login");
  await page.getByLabel("Password", { exact: true }).fill("Synthetic password");
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
  await page.getByLabel("Show password", { exact: true }).check();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("link", { name: "Skip to content", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});
