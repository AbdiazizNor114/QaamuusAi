import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("onboarding, scholar decision and audited role grant", async ({ page }) => {
  await page.goto("/demo/dashboard/profile");
  await page.getByLabel("Demo display name").fill("Synthetic linguist");
  await page.getByLabel("Areas of expertise").fill("Demonstration grammar studies");
  await page.getByLabel("Biography").fill("Fictional test profile");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile complete", { exact: true })).toBeVisible();
  await page.goto("/demo/dashboard/scholars");
  await page.getByLabel("Areas of expertise").fill("Demo linguistics");
  await page.getByLabel("Application rationale").fill("Synthetic qualifications for review");
  await page.getByRole("button", { name: "Submit application" }).click();
  await page.getByLabel("Demo role").selectOption("editor");
  await page.getByLabel("Decision rationale").fill("Independent synthetic assessment");
  await page.getByRole("button", { name: "Accept and grant reviewer" }).click();
  await expect(page.getByText("accepted", { exact: true })).toBeVisible();
  await page.goto("/demo/admin/roles");
  await expect(page.getByText("Role granted", { exact: false })).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Synthetic linguist" }).first(),
  ).toContainText("reviewer");
});
test("article revisions, independent review and public publication", async ({ page }) => {
  await page.goto("/demo/dashboard/articles");
  await page.getByRole("button", { name: "New article" }).click();
  await page.getByLabel("Article title").fill("Demo language note");
  await page.getByLabel("Summary", { exact: true }).fill("An authored demonstration");
  await page.getByLabel("Article body").fill("Original synthetic educational content.");
  await page.getByLabel("Source / provenance").fill("Authored demo fixture");
  await page.getByLabel("Redistribution license").selectOption("CC-BY-4.0");
  await page.getByRole("button", { name: "Save article draft" }).click();
  await page.getByRole("button", { name: /Demo language note/ }).click();
  await page.getByLabel("Decision rationale").fill("Draft ready for independent review");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await page.getByLabel("Demo role").selectOption("reviewer");
  await page.getByRole("button", { name: /Demo language note/ }).click();
  await page.getByLabel("Decision rationale").fill("Independent review starts");
  await page.getByRole("button", { name: "Begin review" }).click();
  await page.getByLabel("Decision rationale").fill("Demo content and source checked");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByLabel("Demo role").selectOption("editor");
  await page.getByRole("button", { name: /Demo language note/ }).click();
  await page.getByLabel("Decision rationale").fill("Permission and approval confirmed");
  await page.getByRole("button", { name: "Publish article" }).click();
  await page.goto("/demo/articles");
  await page.getByRole("button", { name: /Demo language note/ }).click();
  await expect(
    page.getByText("Original synthetic educational content.", { exact: true }),
  ).toBeVisible();
});
test("release snapshots and downloadable licensing manifest", async ({ page }) => {
  await page.goto("/demo/dashboard/releases");
  await page.getByLabel("Demo role").selectOption("editor");
  await page.getByLabel("Release version").fill("0.1.0");
  await page.getByLabel("Release notes").fill("Initial synthetic snapshot");
  await page.getByRole("button", { name: "Create release" }).click();
  await page.getByRole("button", { name: "View release" }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download license manifest" }).click();
  expect((await downloaded).suggestedFilename()).toBe("qaamuusai-v0.1.0-manifest.json");
  await page.reload();
  await expect(page.getByRole("cell", { name: "v0.1.0", exact: true })).toBeVisible();
});
test("Somali preference persists and pages remain accessible on narrow screens", async ({
  page,
}) => {
  await page.goto("/demo/dashboard/profile");
  await page.getByTitle("Switch language").click();
  await expect(page.getByRole("heading", { name: "Aqoonsigayga" })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "so");
  await page.setViewportSize({ width: 320, height: 900 });
  for (const route of [
    "/dashboard/profile",
    "/dashboard/scholars",
    "/admin/roles",
    "/dashboard/articles",
    "/dashboard/releases",
  ]) {
    await page.goto(`/demo${route}`);
    await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      route,
    ).toBe(true);
  }
});
test("accessibility, keyboard dialog behavior and API origin protection", async ({
  page,
  request,
}) => {
  for (const route of [
    "/",
    "/dashboard/profile",
    "/dashboard/scholars",
    "/admin/roles",
    "/dashboard/articles",
    "/dashboard/releases",
  ]) {
    await page.goto(`/demo${route}`);
    await expect(page.locator("main")).toHaveAttribute("data-ready", "true");
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      route,
    ).toEqual([]);
  }
  await page.goto("/demo/");
  await page.getByRole("button", { name: "buug", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "buug", exact: true })).toBeFocused();
  const response = await request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  for (const route of ["login", "submissions", "reviews", "corrections", "disputes"]) {
    const rejected = await request.post(`/api/${route}`, {
      headers: { origin: "https://untrusted.example" },
      data: {},
    });
    expect(rejected.status()).toBe(403);
  }
});
test("assigned review discussion persists and corrupt saves retain a recovery copy", async ({
  page,
}) => {
  await page.goto("/demo/dashboard/reviews");
  await page.getByLabel("Demo role").selectOption("editor");
  await page.getByRole("button", { name: "qalin", exact: true }).click();
  await page.getByRole("combobox", { name: "Reviewer", exact: true }).selectOption("reviewer");
  await page.getByLabel("Assignment rationale").fill("Independent reviewer assigned");
  await page.getByRole("button", { name: "Assign reviewer" }).click();
  await page.getByLabel("Comment", { exact: true }).fill("Please retain this sourced discussion");
  await page.getByRole("button", { name: "Add comment" }).click();
  await page.reload();
  await page.getByRole("button", { name: "qalin", exact: true }).click();
  await expect(
    page.getByText("Please retain this sourced discussion", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => localStorage.setItem("qaamuusAi.demo.v1", '{"events":"broken"}'));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("qaamuusAi.demo.v1.recovery"))).toBe(
    '{"events":"broken"}',
  );
});
