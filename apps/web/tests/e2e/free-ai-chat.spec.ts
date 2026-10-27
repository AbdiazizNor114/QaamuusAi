import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("free AI handles varied questions and follow-ups while preserving a separate local guide", async ({
  page,
}) => {
  const calls: unknown[] = [];
  await page.route("**/api/assistant", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { configured: true } });
    const body = route.request().postDataJSON();
    calls.push(body);
    return route.fulfill({
      json: {
        answer:
          body.messages.length === 1
            ? "The public API is GET /api/v1/entries."
            : "### Example\n\n```javascript\nfetch('/api/v1/entries?limit=5')\n```",
        truncated: false,
      },
    });
  });
  await page.goto("/ai");
  await page.getByRole("button", { name: "Ask QaamuusAI", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "QaamuusAI assistant" });
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByLabel("Your question", { exact: true })
    .fill("How could I fetch the published terms?");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    dialog.getByText("The public API is GET /api/v1/entries.", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByLabel("Your question", { exact: true })
    .fill("Can you show that in JavaScript?");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Example", exact: true })).toBeVisible();
  await expect(dialog.locator("pre code")).toHaveText("fetch('/api/v1/entries?limit=5')\n");
  expect(calls[1]).toEqual({
    provider_data_use_accepted: true,
    messages: [
      { role: "user", content: "How could I fetch the published terms?" },
      { role: "assistant", content: "The public API is GET /api/v1/entries." },
      { role: "user", content: "Can you show that in JavaScript?" },
    ],
  });
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await dialog.getByRole("button", { name: "Project guide", exact: true }).click();
  await dialog.getByLabel("Your question", { exact: true }).fill("How can I join?");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "Join and contribute", exact: true }),
  ).toBeVisible();
  expect(calls.length).toBe(2);
});
test("missing key and provider quota exhaustion are honest, retain the draft and allow local help", async ({
  page,
}) => {
  let ready = false;
  await page.route("**/api/assistant", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: { configured: ready } })
      : route.fulfill({
          status: 429,
          json: { error: "Free model quota reached. Try later or use Project guide." },
        }),
  );
  await page.goto("/ai");
  await page.getByRole("button", { name: "Ask QaamuusAI", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "QaamuusAI assistant" });
  await dialog.getByRole("checkbox").check();
  await dialog.getByLabel("Your question", { exact: true }).fill("Hello");
  await expect(dialog.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  await expect(dialog.getByText("AI chat is not connected yet.", { exact: false })).toBeVisible();
  await dialog.getByRole("button", { name: "Close assistant", exact: true }).click();
  ready = true;
  await page.getByRole("button", { name: "Ask QaamuusAI", exact: true }).click();
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog.getByText("Free model quota reached.", { exact: false })).toBeVisible();
  await expect(dialog.getByLabel("Your question", { exact: true })).toHaveValue("Hello");
});

test("capacity errors explain the problem, apply a cooldown and offer the local guide", async ({
  page,
}) => {
  await page.route("**/api/assistant", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: { configured: true } })
      : route.fulfill({
          status: 503,
          json: {
            error: "The free provider is temporarily at capacity.",
            code: "provider_busy",
            retry_after_seconds: 60,
          },
        }),
  );
  await page.goto("/ai");
  await page.getByRole("button", { name: "Ask QaamuusAI", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "QaamuusAI assistant" });
  await dialog.getByRole("checkbox").check();
  await dialog.getByLabel("Your question", { exact: true }).fill("How can I contribute?");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog.getByRole("button", { name: /Wait \d+s/ })).toBeDisabled();
  await expect(dialog.getByText("Sending shares your question and recent chat", { exact: false })).toBeHidden();
  await dialog.locator("summary").click();
  await expect(
    dialog.getByText("Sending shares your question and recent chat", { exact: false }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Use Project guide", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Send", exact: true })).toBeEnabled();
  await expect(dialog.getByText("Project guide works locally from curated notes", { exact: false })).toBeVisible();
});
