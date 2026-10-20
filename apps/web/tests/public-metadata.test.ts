import { afterEach, expect, it, vi } from "vitest";
import sitemap from "../src/app/sitemap";
import robots from "../src/app/robots";
import { generateMetadata } from "../src/app/[[...path]]/page";
afterEach(() => vi.unstubAllEnvs());
it("does not invent a domain or index the unconfigured prototype", async () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  expect(sitemap()).toEqual([]);
  expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
  expect((await generateMetadata({ params: Promise.resolve({ path: ["developers"] }) })).robots).toEqual({ index: false, follow: false });
});
it("uses the configured public origin and excludes private pages from indexing", async () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://commons.example/");
  expect(sitemap().map((row) => row.url)).toContain("https://commons.example/releases");
  expect(sitemap().some((row) => /dashboard|admin|login|demo/.test(row.url))).toBe(false);
  const metadata = await generateMetadata({ params: Promise.resolve({ path: ["developers"] }) });
  expect(metadata.alternates?.canonical).toBe("https://commons.example/developers");
  expect((await generateMetadata({ params: Promise.resolve({ path: ["dashboard"] }) })).robots).toEqual({ index: false, follow: false });
});
