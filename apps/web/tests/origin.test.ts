import { afterEach, expect, it, vi } from "vitest";
import { requestOrigin, sameOrigin } from "../src/lib/origin";
afterEach(() => vi.unstubAllEnvs());
it("handles Next's loopback normalization without admitting a remote host", () => {
  vi.stubEnv("APP_ORIGIN", "");
  const request = new Request("http://localhost:3000/api/profile", {
    headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
  });
  expect(sameOrigin(request)).toBe(true);
  expect(requestOrigin(request)).toBe("http://127.0.0.1:3000");
  expect(
    sameOrigin(
      new Request(request.url, {
        headers: { host: "evil.example:3000", origin: "http://evil.example:3000" },
      }),
    ),
  ).toBe(false);
  expect(
    sameOrigin(
      new Request(request.url, {
        headers: { host: "127.0.0.1:9999", origin: "http://127.0.0.1:9999" },
      }),
    ),
  ).toBe(false);
});
it("pins production requests to configured application origin", () => {
  vi.stubEnv("APP_ORIGIN", "https://qaamuusai.example");
  expect(
    sameOrigin(
      new Request("http://localhost:3000/api/profile", {
        headers: { origin: "https://qaamuusai.example" },
      }),
    ),
  ).toBe(true);
  expect(
    sameOrigin(
      new Request("http://localhost:3000/api/profile", {
        headers: { origin: "http://localhost:3000" },
      }),
    ),
  ).toBe(false);
});
