import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("AI project overview explains the proposed pilot and stays accessible without backend access", async ({
  page,
}) => {
  await page.route("**/api/public", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ai");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Build the foundationfor Somali speech AI.",
    );
    await expect(
      page.getByText(
        "Speech datasets, trained models and developer toolkits are planned milestones, not available releases.",
        { exact: false },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Different expertise. One shared purpose." }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Help build the foundation", exact: true }),
    ).toHaveAttribute("href", "/join");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
  }
});
