import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("chat preview is accessible, keeps drafts local and never pretends to generate answers", async ({
  page,
}) => {
  let transmissions = 0;
  page.on("request", (request) => {
    if (request.method() === "POST") transmissions++;
  });
  await page.goto("/ai");
  await page.getByRole("button", { name: "AI Chat", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "QaamuusAI Assistant" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("Free AI pilot · up to 50 requests per day", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText("Somali accuracy is unverified.", { exact: false })).toBeVisible();
  await dialog.getByRole("button", { name: "Build and debug code", exact: true }).click();
  await expect(dialog.getByLabel("Your question", { exact: true })).toHaveValue(
    "Help me plan an accessible Somali language application.",
  );
  await expect(dialog.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await dialog.getByRole("button", { name: "Clear draft", exact: true }).click();
  await expect(dialog.getByLabel("Your question", { exact: true })).toHaveValue("");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "AI Chat", exact: true })).toBeFocused();
  expect(transmissions).toBe(0);
});
