import { beforeEach, expect, it, vi } from "vitest";
const { client } = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: client }));
import { GET } from "../src/app/auth/route";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_ORIGIN", "");
});
it("exchanges PKCE code and returns to the exact local host", async () => {
  const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
  client.mockResolvedValue({ auth: { exchangeCodeForSession } });
  const response = await GET(
    new Request("http://localhost:3000/auth?code=synthetic-code&next=https://untrusted.example", {
      headers: { host: "127.0.0.1:3000" },
    }),
  );
  expect(exchangeCodeForSession).toHaveBeenCalledWith("synthetic-code");
  expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/dashboard");
});
it("accepts only supported email token-hash callback types", async () => {
  const verifyOtp = vi.fn().mockResolvedValue({ error: null });
  client.mockResolvedValue({ auth: { verifyOtp } });
  expect(
    (
      await GET(new Request("http://localhost:3000/auth?token_hash=synthetic&type=email"))
    ).headers.get("location"),
  ).toBe("http://localhost:3000/dashboard");
  expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "synthetic", type: "email" });
  verifyOtp.mockClear();
  expect(
    (
      await GET(new Request("http://localhost:3000/auth?token_hash=synthetic&type=recovery"))
    ).headers.get("location"),
  ).toBe("http://localhost:3000/login?error=callback");
  expect(verifyOtp).not.toHaveBeenCalled();
});
it("failed email exchange does not establish a signed-in redirect", async () => {
  client.mockResolvedValue({
    auth: { exchangeCodeForSession: vi.fn().mockResolvedValue({ error: { message: "expired" } }) },
  });
  expect(
    (await GET(new Request("http://localhost:3000/auth?code=expired"))).headers.get("location"),
  ).toBe("http://localhost:3000/login?error=callback");
});
