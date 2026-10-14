import { beforeEach, expect, it, vi } from "vitest";
const { client } = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: client }));
import { POST } from "../src/app/api/password/recover/route";
function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/password/recover", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_ORIGIN", "");
});
it("rejects foreign origins and invalid email before sending", async () => {
  expect((await POST(request({}, "https://untrusted.example"))).status).toBe(403);
  expect((await POST(request({ email: "bad" }))).status).toBe(400);
  expect(client).not.toHaveBeenCalled();
});
it("requests only the allowlisted callback and sets a private recovery-routing cookie", async () => {
  const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
  client.mockResolvedValue({ auth: { resetPasswordForEmail } });
  const response = await POST(
    request({ email: "synthetic@example.com", redirectTo: "https://untrusted.example" }),
  );
  expect(response.status).toBe(200);
  expect(resetPasswordForEmail).toHaveBeenCalledWith("synthetic@example.com", {
    redirectTo: "http://localhost:3000/auth",
  });
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it("preserves email rate limits without exposing provider details", async () => {
  client.mockResolvedValue({
    auth: {
      resetPasswordForEmail: vi
        .fn()
        .mockResolvedValue({ error: { status: 429, message: "Private provider details" } }),
    },
  });
  const response = await POST(request({ email: "synthetic@example.com" }));
  expect(response.status).toBe(429);
  expect(await response.json()).toEqual({
    error: "Email delivery limit reached. Please wait before requesting another reset link.",
  });
  expect(response.headers.get("set-cookie")).toBeNull();
});
