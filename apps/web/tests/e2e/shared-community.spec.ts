import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptySharedState, type SharedState } from "../../src/lib/shared";
import { emptySharedCommunity, type SharedCommunity } from "../../src/lib/shared-community";
const author = "11111111-1111-4111-8111-111111111111",
  reviewer = "22222222-2222-4222-8222-222222222222",
  editor = "33333333-3333-4333-8333-333333333333",
  record = "44444444-4444-4444-8444-444444444444";
const timestamp = "2026-10-13T08:00:00Z";
const entry = {
  id: record,
  category: "vocabulary" as const,
  term: "Tijaabo",
  translation: "Test",
  notes: "",
  source: "Synthetic fixture",
  license: "CC0-1.0" as const,
  dialect: "Standard",
  contributor: author,
  reviewer,
  status: "published" as const,
  version: 1,
  demonstration: true,
  created_at: timestamp,
  updated_at: timestamp,
};
test("shared scholar application persists and independent editor records acceptance", async ({
  page,
}) => {
  const workspace: SharedState = {
    ...emptySharedState,
    configured: true,
    user: { id: author },
    profile: { display_name: "Synthetic applicant" },
  };
  const community: SharedCommunity = { ...structuredClone(emptySharedCommunity) };
  await page.route("**/api/workspace", (route) => route.fulfill({ json: workspace }));
  await page.route("**/api/community", (route) => route.fulfill({ json: community }));
  await page.route("**/api/community/apply", async (route) => {
    const body = route.request().postDataJSON();
    expect(body).not.toHaveProperty("applicant_id");
    community.applications.push({
      id: record,
      applicant_id: author,
      expertise: body.expertise,
      rationale: body.rationale,
      status: "pending",
      decision: null,
      decided_by: null,
      created_at: timestamp,
    });
    await route.fulfill({ json: { ok: true, id: record } });
  });
  await page.route("**/api/community/decide", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      application: record,
      accept: true,
      reason: "Independent synthetic credentials checked",
    });
    community.applications[0].status = "accepted";
    community.applications[0].decision = "Independent synthetic credentials checked";
    community.applications[0].decided_by = editor;
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/shared/dashboard/scholars");
  await page.getByLabel("Areas of expertise").fill("Synthetic linguistics");
  await page.getByLabel("Application rationale").fill("Synthetic qualifications");
  await page.getByRole("button", { name: "Submit application" }).click();
  await page.reload();
  await expect(page.getByText("pending", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record decision" })).toHaveCount(0);
  workspace.user = { id: editor };
  workspace.profile = { display_name: "Synthetic editor" };
  workspace.roles = ["editor"];
  await page.reload();
  await page.getByRole("combobox", { name: "Decision", exact: true }).selectOption("true");
  await page.getByLabel("Decision rationale").fill("Independent synthetic credentials checked");
  await page.getByRole("button", { name: "Record decision" }).click();
  await expect(page.getByText("accepted", { exact: true })).toBeVisible();
});
test("shared role controls distinguish editorial and operational authority", async ({ page }) => {
  const workspace: SharedState = {
    ...emptySharedState,
    configured: true,
    user: { id: editor },
    profile: { display_name: "Synthetic editor" },
    roles: ["editor"],
  };
  const community: SharedCommunity = {
    ...structuredClone(emptySharedCommunity),
    members: [
      { id: author, display_name: "Synthetic contributor", roles: [] },
      { id: editor, display_name: "Synthetic editor", roles: ["editor"] },
    ],
  };
  await page.route("**/api/workspace", (route) => route.fulfill({ json: workspace }));
  await page.route("**/api/community", (route) => route.fulfill({ json: community }));
  await page.route("**/api/community/role", async (route) => {
    const body = route.request().postDataJSON();
    expect(body).toEqual({
      member: author,
      wanted: "reviewer",
      remove: false,
      reason: "Explicit synthetic appointment",
    });
    community.members[0].roles = ["reviewer"];
    community.audit.push({
      id: record,
      actor_id: editor,
      action: "role_granted",
      record_id: author,
      details: { role: "reviewer", rationale: body.reason },
      created_at: timestamp,
    });
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/shared/admin/roles");
  await expect(page.getByLabel("Permission").getByRole("option")).toHaveText([
    "reviewer",
    "editor",
  ]);
  await expect(page.getByLabel("Member").getByRole("option")).toHaveCount(1);
  await page.getByLabel("Decision rationale").fill("Explicit synthetic appointment");
  await page.getByLabel("Confirm this member permission change").check();
  await page.getByRole("button", { name: "Save role change" }).click();
  await expect(page.getByText("Role granted", { exact: true })).toBeVisible();
  workspace.roles = ["technical_admin"];
  await page.reload();
  await expect(page.getByLabel("Permission").getByRole("option")).toHaveText([
    "contributor",
    "technical admin",
  ]);
  workspace.roles = [];
  community.members = [];
  await page.reload();
  await expect(page.getByRole("button", { name: "Save role change" })).toHaveCount(0);
  await expect(page.getByText("Role administration requires appropriate authority.")).toBeVisible();
});
test("shared articles draft, independently review, publish and preserve corrections", async ({
  page,
}) => {
  const workspace: SharedState = {
    ...emptySharedState,
    configured: true,
    user: { id: author },
    profile: { display_name: "Synthetic author" },
  };
  const community: SharedCommunity = { ...structuredClone(emptySharedCommunity) };
  await page.route("**/api/workspace", (route) => route.fulfill({ json: workspace }));
  await page.route("**/api/community", (route) => route.fulfill({ json: community }));
  await page.route("**/api/community/article", async (route) => {
    const body = route.request().postDataJSON();
    community.articleRevisions.push({
      ...body.content,
      id: body.original ? editor : record,
      author_id: author,
      status: "draft",
      version: body.original ? 2 : 1,
      article_id: body.original,
      assigned_reviewer_id: null,
      approved_by: null,
      created_at: timestamp,
    });
    await route.fulfill({ json: { ok: true, id: record } });
  });
  await page.route("**/api/community/transition", async (route) => {
    const body = route.request().postDataJSON();
    const article = community.articleRevisions.find((item) => item.id === body.revision)!;
    article.status = body.next_status;
    if (body.next_status === "under_review") article.assigned_reviewer_id = reviewer;
    if (body.next_status === "approved") article.approved_by = reviewer;
    if (body.next_status === "published")
      community.articles.push({
        ...article,
        id: reviewer,
        status: undefined,
        reviewer_id: reviewer,
      });
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/shared/dashboard/articles");
  await page.getByRole("button", { name: "New article", exact: true }).click();
  for (const [label, value] of [
    ["Article title", "Synthetic article"],
    ["Summary", "Authored summary"],
    ["Source / provenance", "Synthetic fixture"],
    ["Article body", "Original synthetic body"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel("Redistribution license").selectOption("CC-BY-4.0");
  await page.getByRole("button", { name: "Save article draft" }).click();
  for (const [actor, role, decision] of [
    [author, "", "submitted"],
    [reviewer, "reviewer", "under_review"],
    [reviewer, "reviewer", "approved"],
    [editor, "editor", "published"],
  ]) {
    workspace.user = { id: actor };
    workspace.roles = role ? [role as "reviewer" | "editor"] : [];
    await page.reload();
    await page.getByRole("button", { name: /Synthetic article/ }).click();
    await page.getByRole("combobox", { name: "Decision", exact: true }).selectOption(decision);
    await page.getByLabel("Decision rationale").fill("Independent synthetic rationale");
    await page.getByRole("button", { name: "Record decision" }).click();
  }
  workspace.user = { id: author };
  workspace.roles = [];
  await page.goto("/shared/articles");
  await page.getByRole("button", { name: /Synthetic article/ }).click();
  await expect(page.getByText("Original synthetic body", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Propose correction" }).click();
  await page.getByLabel("Article body").fill("Corrected synthetic body");
  await page.getByRole("button", { name: "Save article draft" }).click();
  expect(community.articles[0].body).toBe("Original synthetic body");
  expect(community.articleRevisions[1].version).toBe(2);
});
test("shared release creation, frozen downloads and all community screens are accessible", async ({
  page,
}) => {
  const workspace: SharedState = {
    ...emptySharedState,
    configured: true,
    user: { id: editor },
    profile: { display_name: "Synthetic editor" },
    roles: ["editor"],
    entries: [{ ...entry, contributor_id: author, reviewer_id: reviewer }],
  };
  const community: SharedCommunity = {
    ...structuredClone(emptySharedCommunity),
    members: [{ id: author, display_name: "Synthetic contributor", roles: [] }],
  };
  await page.route("**/api/workspace", (route) => route.fulfill({ json: workspace }));
  await page.route("**/api/community", (route) => route.fulfill({ json: community }));
  await page.route("**/api/community/release", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      release_version: "0.1.0",
      entries: [record],
      notes: "Synthetic reviewed release",
    });
    community.releases.push({
      id: record,
      version: "0.1.0",
      notes: "Synthetic reviewed release",
      published_by: editor,
      created_at: timestamp,
      snapshot: [entry],
      license_manifest: [
        {
          id: record,
          version: 1,
          license: entry.license,
          source: entry.source,
          attribution: author,
        },
      ],
    });
    await route.fulfill({ json: { ok: true, id: record } });
  });
  await page.route(`**/api/releases/${record}`, (route) =>
    route.fulfill({
      body: JSON.stringify(entry) + "\n",
      headers: {
        "Content-Type": "application/x-ndjson",
        "Content-Disposition": "attachment; filename=qaamuusai-v0.1.0.jsonl",
      },
    }),
  );
  await page.goto("/shared/dashboard/releases");
  await page.getByLabel("Release version").fill("0.1.0");
  await page.getByLabel("Release notes").fill("Synthetic reviewed release");
  await page.getByRole("checkbox", { name: /Tijaabo/ }).check();
  await page.getByRole("button", { name: "Publish release" }).click();
  await expect(page.getByRole("heading", { name: "v0.1.0" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download JSONL" })).toHaveAttribute(
    "href",
    `/api/releases/${record}`,
  );
  await expect(page.getByRole("link", { name: "License manifest" })).toHaveAttribute(
    "href",
    `/api/releases/${record}?format=manifest`,
  );
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/shared/dashboard/scholars",
      "/shared/admin/roles",
      "/shared/dashboard/articles",
      "/shared/articles",
      "/shared/dashboard/releases",
    ]) {
      await page.goto(route);
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
  await page.goto("/shared/dashboard/scholars");
  await page.screenshot({ path: "test-results/shared-scholars-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/shared-scholars-mobile.png", fullPage: true });
});
