import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptySharedState } from "../../src/lib/shared";
import { emptySharedCommunity } from "../../src/lib/shared-community";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/community", (route) => route.fulfill({ json: emptySharedCommunity }));
});
test("visitor applies without an account and receives confirmation", async ({ page }) => {
  await page.route("**/api/workspace", (route) => route.fulfill({ json: emptySharedState }));
  await page.route("**/api/contributor-requests", (route) => {
    expect(route.request().postDataJSON()).toEqual({
      name: "Synthetic Applicant",
      email: "synthetic@example.com",
      study: "Computer science",
      professional_role: "frontend",
    });
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/join");
  await page.getByLabel("Full name").fill("Synthetic Applicant");
  await page.getByLabel("Email address", { exact: true }).fill("synthetic@example.com");
  await page.getByLabel("What do you study or what have you studied?").fill("Computer science");
  await page.getByLabel("Professional role or area of expertise").selectOption("frontend");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Submit application", exact: true }).click();
  await expect(page.getByText("Your request has been received.", { exact: false })).toBeVisible();
});
test("administrator reviews the email and sends an invitation", async ({ page }) => {
  await page.route("**/api/workspace", (route) =>
    route.fulfill({
      json: {
        ...emptySharedState,
        configured: true,
        user: { id: "11111111-1111-4111-8111-111111111111" },
        profile: { display_name: "Synthetic admin" },
        roles: ["technical_admin"],
      },
    }),
  );
  let status = "pending";
  await page.route("**/api/contributor-requests", (route) =>
    route.fulfill({
      json: {
        requests: [
          {
            id: "application",
            name: "Synthetic Applicant",
            email: "synthetic@example.com",
            study: "Computer science",
            professional_role: "frontend",
            status,
            created_at: "2026-10-24T00:00:00Z",
          },
        ],
      },
    }),
  );
  await page.route("**/api/contributor-requests/application", (route) => {
    expect(route.request().postDataJSON()).toEqual({ decision: "approve" });
    status = "invited";
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/admin/contributors");
  await expect(page.getByText("synthetic@example.com", { exact: true })).toBeVisible();
  await expect(page.getByText("Computer science", { exact: true })).toBeVisible();
  await expect(page.getByText("Frontend developer", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Approve and email invitation" }).click();
  await expect(page.getByText("Status: invited", { exact: true })).toBeVisible();
  await expect(page.getByText("Invitation emailed to the applicant.")).toBeVisible();
});
