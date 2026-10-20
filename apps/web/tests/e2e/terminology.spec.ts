import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptySharedState, type SharedState } from "../../src/lib/shared";
import { emptySharedCommunity } from "../../src/lib/shared-community";
import { readTerminology, writeTerminology } from "../../src/lib/terminology";
import { technologyTerms } from "../../src/lib/technology-terms";
const author = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/terminology/claims", (route) => route.fulfill({ json: [] }));
});
test("terminology filters, structured saving and returned-proposal edits preserve scholar fields", async ({
  page,
}) => {
  const state: SharedState = {
    ...emptySharedState,
    configured: true,
    user: { id: author },
    profile: { display_name: "Test scholar" },
    roles: ["reviewer"],
  };
  await page.route("**/api/community", (route) => route.fulfill({ json: emptySharedCommunity }));
  await page.route("**/api/workspace", (route) => route.fulfill({ json: state }));
  let saved = 0;
  await page.route("**/api/submissions", async (route) => {
    const input = route.request().postDataJSON();
    const content = route.request().method() === "PATCH" ? input.content : input;
    saved++;
    const timestamp = "2026-10-17T00:00:00Z";
    state.revisions = [
      {
        ...content,
        id,
        author_id: author,
        status: "changes_requested",
        version: 1,
        created_at: timestamp,
        updated_at: timestamp,
      },
    ];
    state.reviewHistory = [
      {
        id,
        revision_id: id,
        reviewer_id: id,
        decision: "changes_requested",
        rationale: "Synthetic feedback: clarify the example.",
        created_at: timestamp,
      },
    ];
    await route.fulfill({
      json: state.revisions[0],
      status: route.request().method() === "POST" ? 201 : 200,
    });
  });
  await page.goto("/dashboard/terminology");
  await expect(page.getByRole("heading", { level: 1, name: "Terminology" })).toBeVisible();
  await expect(page.locator(".terminology-row")).toHaveCount(30);
  await page.getByRole("button", { name: "Next terminology page" }).click();
  await expect(page.getByText("1000 terms · Page 2 of 34", { exact: true })).toBeVisible();
  await page.getByLabel("Terminology topic").selectOption("navigation");
  await expect(page.locator(".terminology-row")).toHaveCount(20);
  await page.getByLabel("Search terminology").fill("dashboard");
  await expect(page.locator(".terminology-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Propose Somali term" }).click();
  await page.getByLabel("Somali equivalent", { exact: true }).fill("Synthetic Somali proposal");
  await page
    .getByLabel("Definition", { exact: true })
    .fill("Synthetic definition for automated testing.");
  await page.getByLabel("Example sentence", { exact: true }).fill("Synthetic example sentence.");
  await page.getByLabel("Alternative terms (optional)").fill("Synthetic alternative");
  await page
    .getByLabel("Permission evidence (optional)")
    .fill("No permission confirmed; test fixture.");
  await page.getByLabel("Dialect", { exact: true }).fill("Standard");
  await page.getByLabel("Source", { exact: true }).fill("Synthetic authored fixture citation");
  await page.getByLabel("Notes", { exact: true }).fill("Scholar context.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit your proposal" })).toBeVisible();
  expect(saved).toBe(1);
  expect(state.revisions[0].license).toBe("Permission pending");
  expect(readTerminology(state.revisions[0].notes)?.definition).toContain("Synthetic definition");
  await page.getByRole("button", { name: "Edit your proposal" }).click();
  await expect(page.getByText("Synthetic feedback: clarify the example.")).toBeVisible();
  await expect(page.getByLabel("Example sentence", { exact: true })).toHaveValue(
    "Synthetic example sentence.",
  );
  await expect(page.getByLabel("Alternative terms (optional)")).toHaveValue(
    "Synthetic alternative",
  );
  await page.getByLabel("Example sentence", { exact: true }).fill("Revised synthetic example.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  expect(readTerminology(state.revisions[0].notes)?.example).toBe("Revised synthetic example.");
  await page.getByLabel("Terminology status").selectOption("changes_requested");
  await page.getByLabel("Search terminology").fill("Synthetic Somali proposal");
  await expect(page.locator(".terminology-row")).toHaveCount(1);
  await page.getByRole("button", { name: /View proposal:/ }).click();
  await expect(
    page.getByRole("region", { name: "Entry details" }).getByText("Revised synthetic example."),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Entry details" }).getByText("Scholar context."),
  ).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({ path: `test-results/terminology-${width}.png`, fullPage: true });
  }
});
test("independent reviewer sees structured terminology content in the ordinary review queue", async ({
  page,
}) => {
  const form = new FormData();
  form.set("definition", "Reviewer-visible definition");
  form.set("example", "Reviewer-visible example");
  const seed = technologyTerms.find((term) => term.english === "dashboard")!;
  const row = {
    id,
    author_id: author,
    category: "translation",
    term: "Synthetic term",
    translation: "dashboard",
    notes: writeTerminology(seed, form),
    source: "Fixture",
    dialect: "Standard",
    license: "Permission pending",
    status: "submitted",
    version: 1,
    created_at: "2026-10-17T00:00:00Z",
    updated_at: "2026-10-17T00:00:00Z",
  };
  await page.route("**/api/community", (route) => route.fulfill({ json: emptySharedCommunity }));
  await page.route("**/api/workspace", (route) =>
    route.fulfill({
      json: {
        ...emptySharedState,
        configured: true,
        user: { id },
        profile: { display_name: "Independent reviewer" },
        roles: ["reviewer"],
        revisions: [row],
      },
    }),
  );
  await page.goto("/dashboard/reviews");
  await page.getByRole("button", { name: /Synthetic term/ }).click();
  await expect(page.getByText("Reviewer-visible definition", { exact: true })).toBeVisible();
  await expect(page.getByText("Reviewer-visible example", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record decision" })).toBeVisible();
});
