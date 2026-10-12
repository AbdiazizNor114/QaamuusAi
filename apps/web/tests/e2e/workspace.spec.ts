import { test, expect } from "@playwright/test";
test("browse, propose, review and publish a correction", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Somali language commons" })).toBeVisible();
  await page.getByRole("button", { name: "buug", exact: true }).click();
  await page.getByRole("button", { name: "Propose a correction" }).click();
  await page.getByLabel("English meaning").fill("book - corrected demo");
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.goto("/dashboard/submissions");
  await page.getByRole("button", { name: "buug", exact: true }).click();
  await page.getByLabel("Decision rationale").fill("Proposed correction with provenance");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await page.getByRole("button", { name: "Close entry details" }).click();
  await page.getByLabel("Demo role").selectOption("reviewer");
  await page.goto("/dashboard/reviews");
  await page.getByRole("button", { name: "buug", exact: true }).click();
  await page.getByLabel("Decision rationale").fill("Review started");
  await page.getByRole("button", { name: "Begin review" }).click();
  await page.getByLabel("Decision rationale").fill("Demo evidence checked");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("button", { name: "Close entry details" }).click();
  await page.getByLabel("Demo role").selectOption("editor");
  await page.getByRole("button", { name: "buug", exact: true }).click();
  await page.getByLabel("Decision rationale").fill("Permission confirmed");
  await page.getByRole("button", { name: "Publish entry" }).click();
  await page.goto("/datasets");
  await expect(
    page.getByRole("cell", { name: "book - corrected demo", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "book", exact: true })).toBeVisible();
});
test("mobile layout and dataset search", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/datasets");
  await page.getByLabel("Search entries").fill("water");
  await expect(page.getByRole("button", { name: "biyo", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "buug", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true, caret: "initial" });
});
test("dispute resolution records positions and preserves history", async ({ page }) => {
  await page.goto("/dashboard/disputes");
  await page.getByLabel("Demo role").selectOption("reviewer");
  await page.getByRole("button", { name: "Mahadsanid", exact: true }).click();
  await page.getByLabel("Your position").fill("Preserve the proposed variant pending evidence");
  await page.getByLabel("Supporting source").fill("Authored demonstration position");
  await page.getByRole("button", { name: "Add evidence" }).click();
  await expect(
    page.getByText("Preserve the proposed variant pending evidence", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Decision rationale").fill("Reviewer cannot resolve");
  await page.getByRole("button", { name: "Resolve and return to review" }).click();
  await expect(page.getByRole("status")).toContainText("cannot make this decision");
  await page.getByRole("button", { name: "Close entry details" }).click();
  await page.getByLabel("Demo role").selectOption("editor");
  await page.getByRole("button", { name: "Mahadsanid", exact: true }).click();
  await page.getByLabel("Decision rationale").fill("Variant retained for independent review");
  await page.getByRole("button", { name: "Resolve and return to review" }).click();
  await expect(
    page
      .locator(".record-band")
      .filter({ has: page.getByRole("heading", { name: "Resolution history" }) })
      .getByText("Variant retained for independent review", { exact: true }),
  ).toBeVisible();
});
test("all routes fit narrow and desktop viewports and export approved data", async ({ page }) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/about",
      "/datasets",
      "/articles",
      "/contribute",
      "/login",
      "/dashboard",
      "/dashboard/submissions",
      "/dashboard/reviews",
      "/dashboard/disputes",
      "/admin",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${route} at ${width}px`,
      ).toBe(true);
    }
  }
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true, caret: "initial" });
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSONL" }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("qaamuusai-demo-published.jsonl");
});
