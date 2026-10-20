import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const { factory } = vi.hoisted(() => ({ factory: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: factory }));
import { proxy } from "../src/proxy";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://synthetic.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-key");
});
it("does not refresh sessions for visitors without auth cookies", async () => {
  await proxy(new NextRequest("http://localhost:3000/dashboard"));
  expect(factory).not.toHaveBeenCalled();
});
it("forwards refreshed cookies to both the route request and browser response", async () => {
  factory.mockImplementation((_url, _key, options) => ({ auth: { getClaims: async () => {
    options.cookies.setAll([{ name: "sb-synthetic-auth-token", value: "refreshed-synthetic-session", options: { path: "/", maxAge: 3600, sameSite: "lax" } }]);
    return { data: {}, error: null };
  } } }));
  const request = new NextRequest("http://localhost:3000/dashboard", { headers: { cookie: "sb-synthetic-auth-token=old" } });
  const response = await proxy(request);
  expect(request.cookies.get("sb-synthetic-auth-token")?.value).toBe("refreshed-synthetic-session");
  expect(response.cookies.get("sb-synthetic-auth-token")?.value).toBe("refreshed-synthetic-session");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("propagates expired-cookie removal when refresh is rejected", async () => {
  factory.mockImplementation((_url, _key, options) => ({ auth: { getClaims: async () => {
    options.cookies.setAll([{ name: "sb-synthetic-auth-token", value: "", options: { path: "/", maxAge: 0 } }]);
    return { data: null, error: { code: "refresh_token_not_found" } };
  } } }));
  const response = await proxy(new NextRequest("http://localhost:3000/dashboard", { headers: { cookie: "sb-synthetic-auth-token=expired" } }));
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
});
