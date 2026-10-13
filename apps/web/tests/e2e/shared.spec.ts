import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptySharedState, type SharedState } from "../../src/lib/shared";
import { emptySharedCommunity } from "../../src/lib/shared-community";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/community", (route) => route.fulfill({ json: emptySharedCommunity }));
});
const author = "11111111-1111-4111-8111-111111111111";
const reviewer = "22222222-2222-4222-8222-222222222222";
const revision = "33333333-3333-4333-8333-333333333333";
const draft = {
  id: revision,
  author_id: author,
  assigned_reviewer_id: null,
  category: "vocabulary" as const,
  term: "Tijaabo",
  translation: "Synthetic test",
  source: "Authored test fixture",
  dialect: "Standard",
  notes: "",
  license: "CC0-1.0" as const,
  status: "draft" as const,
  version: 1,
  created_at: "2026-10-13T00:00:00Z",
  updated_at: "2026-10-13T00:00:00Z",
};
test("live public datasets and protected routes do not use demo identities", async ({
  page,
  request,
}) => {
  const backend = await (await request.get("/api/workspace")).json();
  if (!backend.configured)
    await page.route("**/api/workspace", (route) =>
      route.fulfill({ json: { ...emptySharedState, configured: true } }),
    );
  await page.goto("/shared/datasets");
  await expect(page.getByRole("heading", { name: "Datasets", exact: true })).toBeVisible();
  if (!backend.entries?.length)
    await expect(page.getByText("No published entries yet.")).toBeVisible();
  await expect(page.getByLabel("Demo role")).toHaveCount(0);
  await page.goto("/shared/dashboard");
  await expect(page.getByText("Sign in to open your workspace.")).toBeVisible();
  for (const route of ["profile", "comments", "logout", "login/verify"]) {
    expect(
      (
        await request.post(`/api/${route}`, {
          headers: { origin: "https://untrusted.example" },
          data: {},
        })
      ).status(),
    ).toBe(403);
  }
  for (const route of ["profile", "comments", "submissions"]) {
    expect(
      (
        await request.post(`/api/${route}`, {
          headers: { origin: "http://127.0.0.1:3000" },
          data: {},
        })
      ).status(),
    ).toBe(backend.configured ? 401 : 503);
  }
});
test("email and verification-code forms handle success and expired codes", async ({ page }) => {
  await page.route("**/api/workspace", (route) =>
    route.fulfill({ json: { ...emptySharedState, configured: true } }),
  );
  await page.route("**/api/login", (route) => {
    expect(route.request().postDataJSON()).toEqual({ email: "synthetic@example.com" });
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/login/verify", (route) =>
    route.fulfill({
      status: 400,
      json: { error: "Code is invalid or expired. Request a new sign-in email." },
    }),
  );
  await page.goto("/shared/login");
  await page.getByLabel("Email", { exact: true }).fill("synthetic@example.com");
  await page.getByRole("button", { name: "Send sign-in link" }).click();
  await expect(page.getByText("Check your inbox for a sign-in link.")).toBeVisible();
  const codeForm = page.locator("form").filter({ has: page.getByLabel("Verification code") });
  await codeForm.getByLabel("Email", { exact: true }).fill("synthetic@example.com");
  await codeForm.getByLabel("Verification code").fill("123456");
  await codeForm.getByRole("button", { name: "Verify code" }).click();
  await expect(
    page.getByText("Code is invalid or expired. Request a new sign-in email."),
  ).toBeVisible();
});
test("shared onboarding, draft and discussion use server data after reload", async ({ page }) => {
  const state: SharedState = {
    ...emptySharedState,
    configured: true,
    user: { id: author, email: "synthetic@example.com" },
  };
  await page.route("**/api/workspace", (route) => route.fulfill({ json: state }));
  await page.route("**/api/profile", async (route) => {
    state.profile = { display_name: route.request().postDataJSON().display_name };
    await route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/submissions", async (route) => {
    expect(route.request().postDataJSON()).not.toHaveProperty("author_id");
    state.revisions = [draft];
    await route.fulfill({ json: draft, status: 201 });
  });
  await page.route("**/api/comments", async (route) => {
    const body = route.request().postDataJSON();
    state.comments.push({
      id: reviewer,
      revision_id: body.revision_id,
      author_id: author,
      body: body.body,
      created_at: draft.created_at,
    });
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/shared/dashboard");
  await page.getByLabel("Display name").fill("Synthetic contributor");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.getByRole("button", { name: "New submission" }).click();
  for (const [label, value] of [
    ["Term", "Tijaabo"],
    ["Translation", "Synthetic test"],
    ["Source", "Authored test fixture"],
    ["Dialect", "Standard"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel("License").selectOption("CC0-1.0");
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.getByRole("button", { name: /Tijaabo/ }).click();
  await page.getByLabel("Comment", { exact: true }).fill("Sourced synthetic discussion");
  await page.getByRole("button", { name: "Add comment" }).click();
  await page.reload();
  await page.getByRole("button", { name: /Tijaabo/ }).click();
  await expect(page.getByText("Sourced synthetic discussion")).toBeVisible();
  await expect(page.getByLabel("Demo role")).toHaveCount(0);
});
test("only server-assigned independent reviewers see review decisions", async ({ page }) => {
  const state: SharedState = {
    ...emptySharedState,
    configured: true,
    user: { id: reviewer },
    profile: { display_name: "Synthetic reviewer" },
    roles: ["reviewer"],
    revisions: [{ ...draft, status: "submitted" }],
  };
  await page.route("**/api/workspace", (route) => route.fulfill({ json: state }));
  await page.route("**/api/reviews", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.revision).toBe(revision);
    expect(body.next_status).toBe("under_review");
    state.revisions[0].status = "under_review";
    state.revisions[0].assigned_reviewer_id = reviewer;
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/shared/dashboard/reviews");
  await page.getByRole("button", { name: /Tijaabo/ }).click();
  await page.getByLabel("Rationale").fill("Independent synthetic review");
  await page.getByRole("button", { name: "Record decision" }).click();
  await expect(page.getByLabel("Decision")).toContainText("approved");
  state.user = { id: author };
  await page.goto("/shared/dashboard/submissions");
  await page.getByRole("button", { name: /Tijaabo/ }).click();
  await expect(page.getByLabel("Decision")).toHaveCount(0);
});
test("shared screens fit mobile, pass axe and recover from load errors", async ({ page }) => {
  let failed = true;
  await page.route("**/api/workspace", (route) =>
    failed
      ? route.fulfill({ status: 503, json: { error: "Temporary connection failure" } })
      : route.fulfill({ json: { ...emptySharedState, configured: true } }),
  );
  await page.goto("/shared/datasets");
  await expect(page.getByText("Temporary connection failure")).toBeVisible();
  failed = false;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByText("No published entries yet.")).toBeVisible();
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/datasets", "/login", "/dashboard", "/dashboard/profile"]) {
      await page.goto(`/shared${route}`);
      await expect(page.getByRole("button", { name: "Refresh", exact: true })).toBeEnabled();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
          .violations,
      ).toEqual([]);
    }
  }
  await page.goto("/shared/login");
  await page.screenshot({ path: "test-results/shared-login-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/shared-login-mobile.png", fullPage: true });
});
