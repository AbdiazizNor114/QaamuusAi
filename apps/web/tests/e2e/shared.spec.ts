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
test("technology starters open an unapproved translation proposal", async ({ page }) => {
  await page.route("**/api/workspace", (route) => route.fulfill({ json: {
    ...emptySharedState, configured: true, user: { id: author },
    profile: { display_name: "Test scholar" }, roles: ["reviewer"],
  } }));
  await page.goto("/dashboard/submissions");
  await page.getByText("Technology terminology · 1000 starter terms").click();
  await page.getByLabel("Search terminology").fill("dashboard");
  await page.getByRole("button", { name: "Propose Somali term" }).click();
  await expect(page.getByRole("combobox", { name: "Category", exact: true })).toHaveValue("translation");
  await expect(page.getByLabel("English term", { exact: true })).toHaveValue("dashboard");
  await expect(page.getByLabel("Somali equivalent", { exact: true })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "License", exact: true })).toHaveValue("Permission pending");
  await expect(page.getByLabel("Source", { exact: true })).toHaveValue(/tech-navigation-dashboard/);
});
test("shared dispute evidence persists and resolved disputes close evidence entry", async ({ page }) => {
  const state: SharedState = {
    ...emptySharedState, configured: true, user: { id: author },
    profile: { display_name: "Test contributor" },
    revisions: [{ ...draft, status: "disputed" }],
    disputes: [{ id: reviewer, revision_id: revision, position: "Dialect question",
      resolution: null, resolved_at: null }],
    reviewHistory: [{ id: revision, revision_id: revision, reviewer_id: reviewer,
      decision: "disputed", rationale: "Independent review requires dialect evidence",
      created_at: draft.created_at }],
    revisionHistory: [{ id: author, record_id: revision, actor_id: author,
      action: "revision_created", created_at: draft.created_at,
      details: { after: { ...draft, translation: "Original preserved wording", source: "Original citation" } } }],
  };
  await page.route("**/api/workspace", (route) => route.fulfill({ json: state }));
  await page.route("**/api/evidence", (route) => {
    expect(route.request().postDataJSON()).toEqual({
      dispute_id: reviewer, position: "Regional usage", source: "Book, page 10",
    });
    state.evidence.push({ id: author, dispute_id: reviewer, author_id: author,
      position: "Regional usage", source: "Book, page 10", created_at: draft.created_at });
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/shared/dashboard/disputes");
  await page.getByRole("button", { name: /Tijaabo/ }).click();
  await expect(page.getByRole("heading", { name: "Review history" })).toBeVisible();
  await expect(page.getByText("Independent review requires dialect evidence")).toBeVisible();
  await page.getByRole("region", { name: "Revision history" }).locator("summary").click();
  await expect(page.getByText("Original preserved wording", { exact: true })).toBeVisible();
  await expect(page.getByText("Original citation", { exact: true })).toBeVisible();
  await page.getByLabel("Explanation", { exact: true }).fill("Regional usage");
  await page.getByLabel("Source", { exact: true }).fill("Book, page 10");
  await page.getByRole("button", { name: "Add evidence" }).click();
  await expect(page.getByText("Regional usage", { exact: true })).toBeVisible();
  await expect(page.getByText("Source: Book, page 10", { exact: true })).toBeVisible();
  state.disputes[0].resolved_at = draft.created_at;
  state.disputes[0].resolution = "Resolved with citation";
  await page.reload();
  await page.getByRole("button", { name: /Tijaabo/ }).click();
  await expect(page.getByRole("button", { name: "Add evidence" })).toHaveCount(0);
  await expect(page.getByText("Regional usage", { exact: true })).toBeVisible();
});
test("returned draft shows the latest requested changes while editing", async ({ page }) => {
  const state: SharedState = { ...emptySharedState, configured: true,
    user: { id: author }, profile: { display_name: "Contributor" },
    revisions: [{ ...draft, status: "changes_requested" }],
    reviewHistory: [
      { id: author, revision_id: revision, reviewer_id: reviewer, decision: "changes_requested",
        rationale: "Older request", created_at: "2026-10-13T00:00:00Z" },
      { id: reviewer, revision_id: revision, reviewer_id: reviewer, decision: "changes_requested",
        rationale: "Please provide the exact dictionary reference and confirm reuse permission.",
        created_at: "2026-10-14T00:00:00Z" },
    ],
  };
  await page.route("**/api/workspace", (route) => route.fulfill({ json: state }));
  await page.route("**/api/community", (route) => route.fulfill({ json: {
    ...emptySharedCommunity, members: [{ id: reviewer, display_name: "Ali Haji", roles: ["reviewer"] }],
  } }));
  await page.goto("/shared/dashboard/submissions");
  await page.getByRole("button", { name: /Tijaabo/ }).click();
  await page.getByRole("button", { name: "Edit draft", exact: true }).click();
  const feedback = page.getByRole("region", { name: "Requested changes" });
  await expect(page.getByRole("link", { name: "My submissions 1", exact: true })).toBeVisible();
  await expect(feedback.getByText("Please provide the exact dictionary reference and confirm reuse permission.")).toBeVisible();
  await expect(feedback.getByText(/Ali Haji/)).toBeVisible();
  await expect(feedback.getByText("Older request")).toHaveCount(0);
  await page.getByLabel("Source", { exact: true }).fill("Updated citation");
  await expect(feedback).toBeVisible();
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/requested-changes-edit-mobile.png", fullPage: true });
  await page.route("**/api/submissions", (route) => {
    expect(route.request().method()).toBe("PATCH");
    state.revisions[0].source = route.request().postDataJSON().content.source;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/reviews", (route) => {
    expect(route.request().postDataJSON().next_status).toBe("submitted");
    state.revisions[0].status = "submitted";
    state.revisions[0].assigned_reviewer_id = reviewer;
    return route.fulfill({ json: { ok: true } });
  });
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByRole("button", { name: /Tijaabo/ }).click();
  await expect(page.getByText("Current status: changes requested", { exact: true })).toBeVisible();
  await page.getByLabel("Rationale", { exact: true }).fill("Source citation corrected; permission still pending.");
  await page.getByRole("button", { name: "Resubmit for review", exact: true }).click();
  await expect(page.getByRole("link", { name: "My submissions 1", exact: true })).toHaveCount(0);
  state.user = { id: reviewer };
  state.roles = ["reviewer"];
  await page.goto("/shared/dashboard/reviews");
  await expect(page.getByRole("button", { name: /Tijaabo/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Review queue 1", exact: true })).toBeVisible();
});
test("dashboard identifies the account and links to its pending work", async ({ page }) => {
  const state: SharedState = { ...emptySharedState, configured: true,
    user: { id: author, email: "test-contributor@example.com" },
    profile: { display_name: "Test contributor" }, roles: ["reviewer"],
    revisions: [{ ...draft, status: "changes_requested" },
      { ...draft, id: reviewer, author_id: reviewer, assigned_reviewer_id: author, status: "submitted" }],
    reviewHistory: [{ id: revision, revision_id: revision, reviewer_id: reviewer,
      decision: "changes_requested", rationale: "Exact citation needed", created_at: draft.created_at }],
  };
  await page.route("**/api/workspace", (route) => route.fulfill({ json: state }));
  await page.goto("/shared/dashboard");
  const account = page.getByRole("region", { name: "Current account" });
  await expect(account.getByText("test-contributor@example.com", { exact: true })).toBeVisible();
  await expect(account.getByText("reviewer", { exact: true })).toBeVisible();
  const actions = page.getByRole("region", { name: "Needs your action" });
  await expect(actions.getByRole("link", { name: "Requested changes 1", exact: true })).toBeVisible();
  await expect(actions.getByRole("link", { name: "Review queue 1", exact: true })).toBeVisible();
  await expect(actions.getByRole("link", { name: /Pending applications/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Recent activity" }).getByText("changes requested", { exact: true })).toBeVisible();
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/dashboard-actions-${width}.png`, fullPage: true });
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  }
  await actions.getByRole("link", { name: "Requested changes 1", exact: true }).click();
  await expect(page).toHaveURL(/\/shared\/dashboard\/submissions$/);
});
test("navigation follows current roles while direct admin URLs remain guarded", async ({ page }) => {
  const state: SharedState = { ...emptySharedState, configured: true,
    user: { id: author }, profile: { display_name: "Contributor" } };
  await page.route("**/api/workspace", (route) => route.fulfill({ json: state }));
  for (const roles of [[], ["reviewer"], ["editor"], ["technical_admin"], ["editor", "technical_admin"]] as SharedState["roles"][]) {
    state.roles = roles;
    await page.goto("/shared/dashboard");
    const nav = page.getByRole("navigation", { name: "Workspace navigation" });
    await expect(page.getByRole("button", { name: "Refresh", exact: true })).toBeEnabled();
    await expect(nav.getByRole("link", { name: "Role administration", exact: true })).toHaveCount(roles.includes("editor") || roles.includes("technical_admin") ? 1 : 0);
    await expect(nav.getByRole("link", { name: "Review queue", exact: true })).toHaveCount(roles.includes("editor") || roles.includes("reviewer") ? 1 : 0);
    await expect(nav.getByRole("link", { name: "Reviewer applications", exact: true })).toBeVisible();
  }
  state.roles = ["reviewer"];
  await page.goto("/shared/admin/roles");
  await expect(page.getByText("Role administration requires appropriate authority.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save role change" })).toHaveCount(0);
  state.user = null;
  state.roles = [];
  await page.goto("/shared/datasets");
  const nav = page.getByRole("navigation", { name: "Workspace navigation" });
  await expect(nav.getByRole("link", { name: "Role administration", exact: true })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "My submissions", exact: true })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Articles", exact: true })).toBeVisible();
});
test("empty queues distinguish no work from filtered results and clear both filters", async ({ page }) => {
  const state: SharedState = { ...emptySharedState, configured: true, user: { id: author },
    roles: ["reviewer"], profile: { display_name: "Reviewer" },
    revisions: [{ ...draft, author_id: reviewer, status: "submitted" }],
  };
  await page.route("**/api/workspace", (route) => route.fulfill({ json: state }));
  await page.goto("/shared/dashboard/reviews");
  await page.getByLabel("Search entries", { exact: true }).fill("No match");
  await page.getByLabel("Category", { exact: true }).selectOption("grammar");
  await expect(page.getByRole("heading", { name: "No matching entries.", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.getByLabel("Search entries", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Category", { exact: true })).toHaveValue("all");
  await expect(page.getByRole("button", { name: /Tijaabo/ })).toBeVisible();
  state.revisions = [];
  await page.reload();
  await expect(page.getByRole("heading", { name: "No reviews waiting.", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear filters", exact: true })).toHaveCount(0);
  await page.goto("/shared/dashboard/disputes");
  await expect(page.getByRole("heading", { name: "No open disputes.", exact: true })).toBeVisible();
  await page.goto("/shared/dashboard/submissions");
  await expect(page.getByRole("heading", { name: "No submissions yet.", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "New submission", exact: true })).toBeVisible();
});
test("expired-session responses remove privileged UI and offer sign-in", async ({ page }) => {
  const state: SharedState = { ...emptySharedState, configured: true, user: { id: author, email: "synthetic@example.com" },
    roles: ["editor"], profile: { display_name: "Synthetic editor" } };
  let expired = false;
  await page.route("**/api/workspace", (route) => expired
    ? route.fulfill({ status: 401, json: { error: "Your session expired. Please sign in again." } })
    : route.fulfill({ json: state }));
  await page.route("**/api/profile", (route) => route.fulfill({ status: 401, json: { error: "Sign in required." } }));
  await page.goto("/shared/dashboard/profile");
  await expect(page.getByRole("link", { name: "Role administration", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByText("Your session expired. Please sign in again.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Role administration", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in to open your workspace.", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  expired = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Your session expired. Please sign in again.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Supabase is not configured.", { exact: true })).toHaveCount(0);
});
test("public vocabulary, grammar and articles browse without signing in", async ({ page }) => {
  const state = { ...emptySharedState, configured: true,
    entries: [{ ...draft, author_id: undefined, status: undefined },
      { ...draft, id: reviewer, author_id: undefined, status: undefined, category: "grammar", term: "Synthetic grammar" }],
  };
  await page.route("**/api/workspace", (route) => route.fulfill({ json: state }));
  await page.route("**/api/community", (route) => route.fulfill({ json: {
    ...emptySharedCommunity, articles: [{ id: revision, author_id: author, title: "Public Somali article",
      summary: "Synthetic public summary", body: "Public synthetic article text", source: "Authored fixture",
      license: "CC0-1.0", version: 1, created_at: draft.created_at }],
  } }));
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/shared/datasets");
    await page.getByLabel("Category", { exact: true }).selectOption("grammar");
    await expect(page.getByRole("button", { name: /Synthetic grammar/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Tijaabo/ })).toHaveCount(0);
    await page.getByLabel("Category", { exact: true }).selectOption("vocabulary");
    await page.getByRole("button", { name: /Tijaabo/ }).click();
    await expect(page.getByRole("heading", { name: "Tijaabo", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit draft", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Record decision", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto("/shared/articles");
    await page.getByRole("button", { name: /Public Somali article/ }).click();
    await expect(page.getByText("Public synthetic article text", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/public-articles-${width}.png`, fullPage: true });
  }
});
test("background refresh preserves draft input and ignores older responses", async ({ page }) => {
  const state: SharedState = { ...emptySharedState, configured: true,
    user: { id: author }, profile: { display_name: "Test contributor" }, revisions: [draft],
  };
  let requests = 0;
  let releaseOld: (() => void) | undefined;
  await page.route("**/api/workspace", async (route) => {
    requests++;
    if (requests === 2) {
      await new Promise<void>((resolve) => { releaseOld = resolve; });
      return route.fulfill({ json: { ...state, profile: { display_name: "Old profile" } } });
    }
    return route.fulfill({ json: { ...state, profile: { display_name: requests > 2 ? "Latest profile" : "Test contributor" } } });
  });
  await page.goto("/shared/dashboard/submissions");
  await page.getByRole("button", { name: "New submission" }).click();
  await page.getByLabel("Term", { exact: true }).fill("Unsaved Somali word");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => requests).toBe(2);
  await expect(page.getByLabel("Term", { exact: true })).toHaveValue("Unsaved Somali word");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Latest profile", { exact: true })).toBeVisible();
  const oldResponse = page.waitForResponse((response) => response.url().endsWith("/api/workspace"));
  releaseOld?.();
  await oldResponse;
  await expect(page.getByText("Old profile", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Term", { exact: true })).toHaveValue("Unsaved Somali word");
});
test("editor selects an independent reviewer with a rationale", async ({ page }) => {
  const state: SharedState = { ...emptySharedState, configured: true,
    user: { id: reviewer }, profile: { display_name: "Test editor" }, roles: ["editor"],
    revisions: [{ ...draft, status: "submitted" }],
  };
  await page.route("**/api/workspace", (route) => route.fulfill({ json: state }));
  await page.route("**/api/community", (route) => route.fulfill({ json: {
    ...emptySharedCommunity,
    members: [{ id: author, display_name: "Author", roles: ["reviewer"] },
      { id: reviewer, display_name: "Independent editor", roles: ["editor"] }],
  } }));
  await page.route("**/api/reviews/assign", (route) => {
    expect(route.request().postDataJSON()).toEqual({ revision, reviewer,
      reason: "Dialect expertise" });
    state.revisions[0].assigned_reviewer_id = reviewer;
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/shared/dashboard/reviews");
  await expect(page.getByRole("link", { name: "Review queue 1", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Tijaabo/ }).click();
  await expect(page.getByLabel("Assign reviewer").getByRole("option", { name: "Author", exact: true })).toHaveCount(0);
  await page.getByLabel("Assign reviewer").selectOption(reviewer);
  await page.getByLabel("Assignment rationale").fill("Dialect expertise");
  await page.getByRole("button", { name: "Assign reviewer", exact: true }).click();
  await expect(page.getByLabel("Assign reviewer")).toHaveValue(reviewer);
});
test("running auth callback safely handles native Next.js requests", async ({ request, baseURL }) => {
  const response = await request.get("/auth", {
    maxRedirects: 0,
    headers: { cookie: "qaamuusai-recovery=1" },
  });
  expect(response.status()).toBe(307);
  expect(response.headers()["location"]).toBe(new URL("/login?error=callback", baseURL).href);
  expect(response.headers()["set-cookie"]).toContain("Max-Age=0");
});
test("live public datasets and protected routes do not use demo identities", async ({
  page,
  request,
  baseURL,
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
          headers: { origin: baseURL! },
          data: {},
        })
      ).status(),
    ).toBe(backend.configured ? 401 : 503);
  }
});
test("email/password sign-in handles invalid credentials and a verified session", async ({
  page,
}) => {
  const state: SharedState = { ...emptySharedState, configured: true };
  let accepted = false;
  await page.route("**/api/workspace", (route) => route.fulfill({ json: state }));
  await page.route("**/api/login", (route) => {
    expect(route.request().postDataJSON()).toEqual({
      email: "synthetic@example.com",
      password: "Synthetic-test-password",
    });
    if (!accepted)
      return route.fulfill({
        status: 401,
        json: { error: "Email or password is incorrect, or the account is not confirmed." },
      });
    state.user = { id: author, email: "synthetic@example.com" };
    state.profile = { display_name: "Synthetic user" };
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/shared/login");
  await page.getByLabel("Email", { exact: true }).fill("synthetic@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText("Email or password is incorrect, or the account is not confirmed."),
  ).toBeVisible();
  accepted = true;
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/shared\/dashboard$/);
  await expect(page.getByRole("button", { name: "New submission" })).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.values(localStorage).some((value) =>
        String(value).includes("Synthetic-test-password"),
      ),
    ),
  ).toBe(false);
});
test("signed-in password setup validates confirmation and clears successful input", async ({
  page,
}) => {
  await page.route("**/api/workspace", (route) =>
    route.fulfill({
      json: {
        ...emptySharedState,
        configured: true,
        user: { id: author, email: "synthetic@example.com" },
        profile: { display_name: "Synthetic user" },
      },
    }),
  );
  await page.route("**/api/password", (route) => {
    expect(route.request().postDataJSON()).toEqual({
      password: "Synthetic-test-password",
      confirmation: "Synthetic-test-password",
    });
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/shared/dashboard/profile");
  await page.getByLabel("New password").fill("Synthetic-test-password");
  await page.getByLabel("Confirm password").fill("Different-test-password");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("Passwords do not match.")).toBeVisible();
  await page.getByLabel("Confirm password").fill("Synthetic-test-password");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(
    page.getByText("Password saved. You can now sign in with your email and password."),
  ).toBeVisible();
  await expect(page.getByLabel("New password")).toHaveValue("");
});
test("forgot-password link sends a recovery request and explains rate limits", async ({ page }) => {
  await page.route("**/api/workspace", (route) =>
    route.fulfill({ json: { ...emptySharedState, configured: true } }),
  );
  let limited = true;
  await page.route("**/api/password/recover", (route) => {
    expect(route.request().postDataJSON()).toEqual({ email: "synthetic@example.com" });
    return limited
      ? route.fulfill({
          status: 429,
          json: {
            error:
              "Email delivery limit reached. Please wait before requesting another reset link.",
          },
        })
      : route.fulfill({ json: { ok: true } });
  });
  await page.goto("/shared/login");
  await page.getByRole("button", { name: "Forgot password?", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
  await page.getByLabel("Email", { exact: true }).fill("synthetic@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(
    page.getByText(
      "Email delivery limit reached. Please wait before requesting another reset link.",
    ),
  ).toBeVisible();
  limited = false;
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(
    page.getByText("If an account exists, check your email for a reset link."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to sign in" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
});
test("localhost recovery fragments are exchanged, removed and open the password form", async ({
  page,
}) => {
  const state: SharedState = { ...emptySharedState, configured: true };
  await page.route("**/api/workspace", (route) => route.fulfill({ json: state }));
  await page.route("**/api/auth/recovery", (route) => {
    expect(route.request().postDataJSON()).toEqual({
      access_token: "synthetic-access-token",
      refresh_token: "synthetic-refresh-token",
    });
    state.user = { id: author, email: "synthetic@example.com" };
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto(
    "/shared/datasets#access_token=synthetic-access-token&refresh_token=synthetic-refresh-token&type=recovery",
  );
  await expect(page).toHaveURL(/\/reset-password$/);
  await expect(page.getByLabel("New password")).toBeVisible();
  await expect(page.getByLabel("Confirm password")).toBeVisible();
  expect(await page.evaluate(() => window.location.hash)).toBe("");
  expect(
    await page.evaluate(() =>
      Object.values(localStorage).some((value) => String(value).includes("synthetic-access-token")),
    ),
  ).toBe(false);
});
test("expired recovery links clear fragments without showing an unlocked password form", async ({
  page,
}) => {
  await page.route("**/api/workspace", (route) =>
    route.fulfill({ json: { ...emptySharedState, configured: true } }),
  );
  await page.goto("/shared/datasets#error=access_denied&error_code=otp_expired");
  await expect(
    page.getByText("Reset link is invalid or expired. Request a new link."),
  ).toBeVisible();
  expect(await page.evaluate(() => location.hash)).toBe("");
  await expect(page.getByLabel("New password")).toHaveCount(0);
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
      if (route === "/login") {
        await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toHaveCount(0);
      } else {
        await expect(page.getByRole("button", { name: "Refresh", exact: true })).toBeEnabled();
      }
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
