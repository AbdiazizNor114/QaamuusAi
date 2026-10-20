import { afterEach, expect, it, vi } from "vitest";
import Page from "../src/app/[[...path]]/page";
import { SharedWorkspace } from "../src/components/shared-workspace";
afterEach(() => vi.unstubAllEnvs());
it("never substitutes a local sandbox when Supabase is unconfigured", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  const page = await Page({ params: Promise.resolve({ path: ["dashboard"] }) });
  expect(page.type).toBe(SharedWorkspace);
});
it("rejects removed sandbox paths and nested shared aliases", async () => {
  for (const path of [
    ["demo"],
    ["demo", "datasets"],
    ["demo", "dashboard"],
    ["shared", "demo", "dashboard"],
  ])
    await expect(Page({ params: Promise.resolve({ path }) })).rejects.toThrow();
});
