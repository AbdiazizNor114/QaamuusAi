import { test, expect } from "@playwright/test";
import { emptySharedState } from "../../src/lib/shared";
import { emptySharedCommunity } from "../../src/lib/shared-community";
test("removed sandbox URLs return 404 and public pages contain no demo links", async ({
  page,
  request,
}) => {
  for (const path of [
    "/demo",
    "/demo/datasets",
    "/demo/dashboard",
    "/demo/admin/roles",
    "/demo/articles",
    "/shared/demo/dashboard",
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
  }
  await page.route("**/api/public", (route) =>
    route.fulfill({ json: { entries: [], articles: [], releases: [], configured: true } }),
  );
  for (const path of [
    "/",
    "/datasets",
    "/articles",
    "/about",
    "/developers",
    "/technology",
    "/releases",
  ]) {
    await page.goto(path);
    await expect(page.locator('a[href*="/demo"]')).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/\bdemo\b/i);
    if (path === "/") {
      await expect(page.getByLabel("Af Soomaali", { exact: true })).toBeVisible();
      await page.screenshot({ path: "test-results/public-home-no-demo.png", fullPage: true });
    }
  }
  await page.route("**/api/workspace", (route) =>
    route.fulfill({
      json: {
        ...emptySharedState,
        configured: true,
        user: { id: "11111111-1111-4111-8111-111111111111" },
        profile: { display_name: "Test member" },
        roles: ["reviewer"],
      },
    }),
  );
  await page.route("**/api/community", (route) => route.fulfill({ json: emptySharedCommunity }));
  await page.route("**/api/terminology/claims", (route) => route.fulfill({ json: [] }));
  for (const path of ["/dashboard", "/dashboard/terminology", "/dashboard/submissions"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('a[href*="/demo"]')).toHaveCount(0);
    await expect(page.getByLabel("Demo role")).toHaveCount(0);
  }
});
