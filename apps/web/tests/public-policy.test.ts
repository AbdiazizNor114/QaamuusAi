import { afterEach, expect, it, vi } from "vitest";
afterEach(() => vi.unstubAllEnvs());
async function policy() {
  vi.resetModules();
  return (await import("../src/lib/public-api-policy")).publicApiPolicy;
}
it("recognizes the browser Host when Next normalizes an internal hostname", async () => {
  const guard = await policy();
  const result = guard(new Request("http://localhost:3000/api/technology", { headers: { Host: "127.0.0.1:3000", Origin: "http://127.0.0.1:3000" } }));
  expect(result.response).toBeNull();
});
it("allows same-origin reads and rejects unlisted browser origins", async () => {
  vi.stubEnv("PUBLIC_API_ALLOWED_ORIGINS", "https://developer.example");
  const guard = await policy();
  expect(
    guard(
      new Request("http://localhost/api/v1/entries", {
        headers: { Origin: "https://evil.example" },
      }),
    ).response?.status,
  ).toBe(403);
  const allowed = guard(
    new Request("http://localhost/api/v1/entries", {
      headers: { Origin: "https://developer.example" },
    }),
  );
  expect(allowed.response).toBeNull();
  expect(allowed.headers.get("access-control-allow-origin")).toBe("https://developer.example");
  expect(allowed.headers.has("access-control-allow-credentials")).toBe(false);
  expect(
    guard(
      new Request("http://localhost/api/v1/entries", {
        method: "OPTIONS",
        headers: { Origin: "https://developer.example" },
      }),
    ).response?.status,
  ).toBe(204);
});
it("limits requests, supplies retry delay and resets without trusting spoofed headers", async () => {
  vi.stubEnv("PUBLIC_API_TRUST_PROXY", "false");
  const guard = await policy();
  for (let i = 0; i < 60; i++)
    expect(
      guard(
        new Request("http://localhost/api/export", { headers: { "x-forwarded-for": String(i) } }),
        1000,
      ).response,
    ).toBeNull();
  const rejected = guard(new Request("http://localhost/api/export"), 1000);
  expect(rejected.response?.status).toBe(429);
  expect(rejected.headers.get("retry-after")).toBe("60");
  expect(guard(new Request("http://localhost/api/export"), 61000).response).toBeNull();
});
it("separates clients only when proxy trust is explicitly enabled", async () => {
  vi.stubEnv("PUBLIC_API_TRUST_PROXY", "true");
  const guard = await policy();
  const request = (ip: string) =>
    new Request("http://localhost/api/export", { headers: { "x-forwarded-for": ip } });
  for (let i = 0; i < 60; i++) guard(request("client-one"), 1000);
  expect(guard(request("client-one"), 1000).response?.status).toBe(429);
  expect(guard(request("client-two"), 1000).response).toBeNull();
});
