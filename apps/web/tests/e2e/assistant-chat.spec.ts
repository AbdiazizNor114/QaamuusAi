import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("project guide sends local questions, shows sources and never transmits them", async ({
  page,
}) => {
  let transmissions = 0;
  page.on("request", (request) => {
    if (request.method() === "POST") transmissions++;
  });
  await page.goto("/ai");
  await page.getByRole("button", { name: "Ask QaamuusAI", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "QaamuusAI assistant" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Project guide", exact: true }).click();
  await dialog.getByRole("button", { name: "How can I contribute?", exact: true }).click();
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "Join and contribute", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Read the source", exact: false }).first(),
  ).toHaveAttribute("href", "/join");
  await dialog.getByLabel("Your question", { exact: true }).fill("Calculate the orbit of Jupiter");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    dialog.getByText("I couldn’t find matching project notes.", { exact: false }),
  ).toBeVisible();
  await dialog.getByLabel("Your question", { exact: true }).fill("how can i use the api");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await dialog.getByLabel("Your question", { exact: true }).fill("give me example");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    dialog.getByRole("heading", {
      name: "API example: search published translations",
      exact: true,
    }),
  ).toBeVisible();
  await expect(dialog.getByLabel("API example code", { exact: true })).toContainText(
    "/api/v1/entries?",
  );
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await dialog.getByRole("button", { name: "Clear chat", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "Join and contribute", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Ask QaamuusAI", exact: true })).toBeFocused();
  expect(transmissions).toBe(0);
});
