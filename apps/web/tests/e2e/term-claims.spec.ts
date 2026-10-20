import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptySharedState } from "../../src/lib/shared";
import { emptySharedCommunity } from "../../src/lib/shared-community";
import type { TermClaim } from "../../src/lib/term-claims";
const me = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const claimId = "33333333-3333-4333-8333-333333333333";
const seed = "tech-navigation-dashboard";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/community", (route) => route.fulfill({ json: emptySharedCommunity }));
  await page.route("**/api/workspace", (route) =>
    route.fulfill({
      json: {
        ...emptySharedState,
        configured: true,
        user: { id: me },
        profile: { display_name: "Test scholar" },
        roles: ["reviewer"],
      },
    }),
  );
});
test("scholar claims persist across reload and release only the current claim", async ({
  page,
}) => {
  let claims: TermClaim[] = [];
  await page.route("**/api/terminology/claims", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: claims });
    const body = route.request().postDataJSON();
    if (body.action === "claim")
      claims = [
        {
          id: claimId,
          seed_id: seed,
          owner_id: me,
          display_name: "Test scholar",
          claimed_at: "2026-10-17T12:00:00Z",
        },
      ];
    else {
      expect(body.claim_id).toBe(claimId);
      claims = [];
    }
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/dashboard/terminology");
  await page.getByLabel("Search terminology").fill("dashboard");
  await page.getByRole("button", { name: "Claim term", exact: true }).click();
  await expect(page.getByText("Test scholar (you)", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByLabel("Term claim filter").selectOption("mine");
  await expect(page.locator(".terminology-row")).toHaveCount(1);
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({ path: `test-results/term-claims-${width}.png`, fullPage: true });
  }
  await page.getByRole("button", { name: "Release my claim" }).click();
  await expect(page.locator(".terminology-row")).toHaveCount(0);
  await page.getByLabel("Term claim filter").selectOption("available");
  await page.getByLabel("Search terminology").fill("dashboard");
  await expect(page.getByRole("button", { name: "Claim term", exact: true })).toBeVisible();
});
test("a competing claim refreshes the owner and still permits an alternative proposal", async ({
  page,
}) => {
  let claims: TermClaim[] = [];
  await page.route("**/api/terminology/claims", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: claims });
    claims = [
      {
        id: claimId,
        seed_id: seed,
        owner_id: other,
        display_name: "Other scholar",
        claimed_at: "2026-10-17T12:00:00Z",
      },
    ];
    await route.fulfill({ status: 409, json: { error: "Someone has already claimed this term." } });
  });
  await page.goto("/dashboard/terminology");
  await page.getByLabel("Search terminology").fill("dashboard");
  await page.getByRole("button", { name: "Claim term", exact: true }).click();
  await expect(page.getByText("Other scholar", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Release my claim" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Claim term", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Propose alternative", exact: true }).click();
  await expect(page.getByLabel("Somali equivalent", { exact: true })).toBeVisible();
});
test("unavailable storage never labels terms unclaimed or enables claims", async ({ page }) => {
  await page.route("**/api/terminology/claims", (route) =>
    route.fulfill({ status: 503, json: { error: "Migration pending" } }),
  );
  await page.goto("/dashboard/terminology");
  await expect(page.getByRole("button", { name: "Retry claims" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Claim term", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Term claim filter")).toBeDisabled();
});
