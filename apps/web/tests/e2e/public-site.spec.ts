import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeTerminology } from "../../src/lib/terminology";
import { technologyTerms } from "../../src/lib/technology-terms";
const id = "11111111-1111-4111-8111-111111111111";

test("terminology joins published translations by seed and keeps untranslated terms pending", async ({ page }) => {
  const form = new FormData();
  form.set("definition", "Synthetic definition");
  form.set("example", "Synthetic example");
  const home = technologyTerms.find((row) => row.id === "tech-navigation-home")!;
  await page.route("**/api/public", (route) => route.fulfill({ json: {
    configured: true,
    entries: [{ id, category: "translation", term: "Hoy", translation: "home", notes: writeTerminology(home, form), source: "Synthetic source", license: "CC0-1.0", dialect: "Maxaatiri", version: 1 }],
    articles: [], releases: [],
  } }));
  await page.goto("/technology");
  await expect(page.getByText("1000 starter terms / 1 with published translations")).toBeVisible();
  await page.getByLabel("Search entries", { exact: true }).fill("Hoy");
  await expect(page.getByText("home", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View Hoy translation for home" }).click();
  await expect(page.getByRole("region", { name: "Entry details" })).toBeInViewport();
  await expect(page.getByRole("region", { name: "Entry details" }).getByText("Synthetic source")).toBeVisible();
  await page.getByRole("button", { name: "Close entry" }).click();
  await page.getByLabel("Search entries", { exact: true }).fill("dashboard");
  await expect(page.getByText("Needs translation", { exact: true })).toBeVisible();
  await page.goto("/");
  await expect(page.getByLabel("Technology translation progress").getByText("Hoy", { exact: true })).toBeVisible();
});
test("public library, terminology and developer downloads work without login", async ({ page, request }) => {
  await page.route("**/api/public", (route) => route.fulfill({ json: {
    configured: true, entries: [{ id, category: "vocabulary", term: "Tijaabo", translation: "Synthetic test", notes: "Authored test fixture", source: "Synthetic source", license: "CC0-1.0", dialect: "Standard", version: 1 }],
    articles: [{ id, title: "Synthetic public article", summary: "Synthetic summary", body: "Public article body", source: "Authored test", license: "CC0-1.0", version: 1 }], releases: [],
  } }));
  await page.goto("/datasets");
  await page.getByLabel("Search entries", { exact: true }).fill("No match");
  await expect(page.getByRole("heading", { name: "No matching entries." })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("button", { name: /Tijaabo/ }).click();
  await expect(page.getByRole("region", { name: "Entry details" }).getByText("Synthetic source")).toBeVisible();
  await page.goto("/technology");
  await page.getByLabel("Search entries", { exact: true }).fill("dashboard");
  await expect(page.getByText("dashboard", { exact: true })).toBeVisible();
  await expect(page.getByText("Needs translation", { exact: true })).toBeVisible();
  const response = await request.get("/api/technology");
  expect(response.status()).toBe(200);
  expect((await response.json()).terms.length).toBe(1000);
  await page.goto("/developers");
  await expect(page.getByRole("link", { name: /Published entries.*Draft/ })).toHaveCount(0);
  await expect(page.locator('a[href="/api/export?format=json"]')).toHaveAttribute("download", "");
  await page.goto("/articles");
  await page.getByRole("button", { name: /Synthetic public article/ }).click();
  await expect(page.getByText("Public article body", { exact: true })).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/datasets", "/technology", "/developers", "/releases", "/about", "/articles"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (path === "/") {
        await expect(page.getByRole("link", { name: "Explore the commons" })).toHaveAttribute("href", "#collections");
        await expect(page.getByLabel("Af Soomaali", { exact: true })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Somali belongs in technology." })).toBeVisible();
        await expect(page.getByRole("link", { name: "Developer resources" })).toHaveAttribute("href", "/developers");
        await page.getByRole("button", { name: /Grammar Patterns/ }).click();
        await expect(page.getByRole("heading", { name: "No matching entries." })).toBeVisible();
        await page.getByRole("button", { name: "Clear filters" }).click();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
      if (path === "/" || path === "/developers" || path === "/datasets") await page.screenshot({ path: `test-results/public-${path.slice(1) || "home"}-${width}.png`, fullPage: true });
    }
  }
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Public navigation" })).toBeVisible();
});
test("public endpoints enforce browser origins and expose local request limits", async ({ request, baseURL }) => {
  const sameOrigin = await request.get("/api/technology", { headers: { Origin: baseURL! } });
  expect(sameOrigin.status()).toBe(200);
  expect(sameOrigin.headers()["access-control-allow-origin"]).toBe(baseURL);
  expect(sameOrigin.headers()["x-ratelimit-limit"]).toBe("60");
  const rejected = await request.get("/api/technology", { headers: { Origin: "https://unlisted.example" } });
  expect(rejected.status()).toBe(403);
  expect(rejected.headers()["access-control-allow-origin"]).toBeUndefined();
  const preflight = await request.fetch("/api/v1/entries", { method: "OPTIONS", headers: { Origin: baseURL!, "Access-Control-Request-Method": "GET" } });
  expect(preflight.status()).toBe(204);
});
test("release history shows frozen download formats and publication dates", async ({ page }) => {
  await page.route("**/api/public", (route) => route.fulfill({ json: { configured: true, entries: [], articles: [], releases: [{ id, version: "0.1.0", notes: "Synthetic release fixture", created_at: "2026-10-17T00:00:00Z" }] } }));
  await page.goto("/releases");
  await expect(page.getByRole("heading", { name: "v0.1.0" })).toBeVisible();
  await expect(page.locator("time")).toHaveText("17/10/2026");
  for (const format of ["json", "jsonl", "manifest", "checksums"]) await expect(page.locator(`a[href="/api/releases/${id}?format=${format}"]`)).toBeVisible();
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `test-results/public-releases-${width}.png`, fullPage: true });
  }
});
