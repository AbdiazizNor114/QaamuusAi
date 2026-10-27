import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptySharedState } from "../../src/lib/shared";
import { emptySharedCommunity } from "../../src/lib/shared-community";
import type { ProjectTask } from "../../src/lib/project-workspace";
const me = "11111111-1111-4111-8111-111111111111";
function fixture(): ProjectTask[] {
  return [
    {
      id: "T01",
      title: "Reproduce the contributor setup",
      track: "engineering",
      scope: "Document a clean install.",
      acceptance: "A new developer can reproduce the setup.",
      guidance: "None",
      dependencies: [],
      status: "open",
      owner_id: null,
      reviewer_id: null,
      owner_name: null,
      reviewer_name: null,
      evidence_url: "",
      note: "",
      version: 1,
      updated_at: "2026-10-25T12:00:00Z",
    },
    {
      id: "T04",
      title: "Design the recording journey",
      track: "design",
      scope: "Create an accessible prototype.",
      acceptance: "Show errors and keyboard controls.",
      guidance: "Read the draft standards",
      dependencies: [],
      status: "open",
      owner_id: null,
      reviewer_id: null,
      owner_name: null,
      reviewer_name: null,
      evidence_url: "",
      note: "",
      version: 1,
      updated_at: "2026-10-25T12:00:00Z",
    },
    {
      id: "T05",
      title: "Prototype recording controls",
      track: "engineering",
      scope: "Use synthetic local audio.",
      acceptance: "No automatic uploads.",
      guidance: "T04",
      dependencies: ["T04"],
      status: "open",
      owner_id: null,
      reviewer_id: null,
      owner_name: null,
      reviewer_name: null,
      evidence_url: "",
      note: "",
      version: 1,
      updated_at: "2026-10-25T12:00:00Z",
    },
  ];
}
async function account(page: Page, roles: string[] = [], profile = true) {
  await page.route("**/api/workspace", (route) =>
    route.fulfill({
      json: {
        ...emptySharedState,
        configured: true,
        user: { id: me, email: "synthetic@example.com" },
        profile: profile ? { display_name: "Synthetic member" } : null,
        roles,
      },
    }),
  );
  await page.route("**/api/community", (route) => route.fulfill({ json: emptySharedCommunity }));
}
test("new members can read Start here before completing their profile", async ({ page }) => {
  await account(page, [], false);
  await page.goto("/dashboard/start");
  await expect(
    page.getByRole("heading", { name: "Find your place. Build something useful." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Open profile", exact: true })).toHaveAttribute(
    "href",
    "/dashboard/profile",
  );
  await expect(
    page.getByRole("link", { name: "Explore the task board", exact: true }),
  ).toHaveAttribute("href", "/dashboard/tasks");
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});
test("shared tasks support claiming, persisted ownership, handoff and dependency states", async ({
  page,
}) => {
  await account(page);
  const tasks = fixture();
  await page.route("**/api/project-workspace", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { area: "engineering", tasks } });
    const c = route.request().postDataJSON();
    const task = tasks.find((t) => t.id === c.task_id)!;
    expect(c.expected_version).toBe(task.version);
    if (c.action === "claim") {
      task.status = "claimed";
      task.owner_id = me;
      task.owner_name = "Synthetic member";
    }
    if (c.action === "start") task.status = "in_progress";
    if (c.action === "submit") {
      task.status = "review";
      task.evidence_url = c.evidence;
      task.note = c.explanation;
    }
    task.version++;
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/dashboard/tasks");
  const task = page
    .locator("article.project-task")
    .filter({
      has: page.getByRole("heading", { name: "Reproduce the contributor setup", exact: true }),
    });
  await task.getByRole("button", { name: "Claim task", exact: true }).click();
  await expect(task.getByText("Owner: Synthetic member", { exact: true })).toBeVisible();
  await page.reload();
  await task.getByRole("button", { name: "Start work", exact: true }).click();
  await task
    .getByLabel("Evidence link", { exact: true })
    .fill("https://github.com/example/repo/pull/1");
  await task.getByLabel("Handoff summary", { exact: true }).fill("Setup reproduced and documented");
  await task.getByRole("button", { name: "Submit for review", exact: true }).click();
  await expect(task.getByText("In review", { exact: true })).toBeVisible();
  await expect(task.getByLabel("Review decision")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Waiting for dependencies", exact: true }),
  ).toBeDisabled();
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await page.getByLabel("Search tasks", { exact: true }).fill("no such task");
  await expect(page.getByText("No tasks match these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear task filters" }).click();
  await expect(page.locator("article.project-task")).toHaveCount(3);
});
test("dashboard preference persists without granting review permissions", async ({ page }) => {
  await account(page);
  let area = "engineering";
  await page.route("**/api/project-workspace", (route) => {
    if (route.request().method() === "POST") {
      const c = route.request().postDataJSON();
      expect(c).toEqual({ command: "area", area: "design" });
      area = c.area;
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: { area, tasks: fixture() } });
  });
  await page.goto("/dashboard");
  await page.getByLabel("My contribution area", { exact: true }).selectOption("design");
  const focus = page.getByRole("region", { name: "Your contribution focus", exact: true });
  await expect(
    focus.getByRole("heading", { name: "Design the recording journey", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("My contribution area", { exact: true })).toHaveValue("design");
  await expect(
    page
      .getByRole("navigation", { name: "Workspace navigation" })
      .getByRole("link", { name: "Review queue", exact: true }),
  ).toHaveCount(0);
});
test("missing task storage stays unavailable and can be retried", async ({ page }) => {
  await account(page);
  let ready = false;
  await page.route("**/api/project-workspace", (route) =>
    route.fulfill(
      ready
        ? { json: { area: null, tasks: fixture() } }
        : {
            status: 503,
            json: {
              error:
                "Task workspace is unavailable. Ask a maintainer to check the workspace migration.",
            },
          },
    ),
  );
  await page.goto("/dashboard/tasks");
  await expect(page.getByText("Task workspace is unavailable.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Claim task", exact: true })).toHaveCount(0);
  ready = true;
  await page.getByRole("button", { name: "Retry task workspace", exact: true }).click();
  await expect(page.locator("article.project-task")).toHaveCount(3);
});
