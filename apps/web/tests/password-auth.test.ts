import { beforeEach, expect, it, vi } from "vitest";
const { client } = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: client }));
import { POST as login } from "../src/app/api/login/route";
import { POST as password } from "../src/app/api/password/route";
function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/login", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_ORIGIN", "");
});
it("uses password authentication without sending an email", async () => {
  const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
  const signInWithOtp = vi.fn();
  client.mockResolvedValue({ auth: { signInWithPassword, signInWithOtp } });
  expect(
    (await login(request({ email: "synthetic@example.com", password: "Test password" }))).status,
  ).toBe(200);
  expect(signInWithPassword).toHaveBeenCalledWith({
    email: "synthetic@example.com",
    password: "Test password",
  });
  expect(signInWithOtp).not.toHaveBeenCalled();
});
it("reports invalid credentials and rate limits without exposing provider details", async () => {
  const signInWithPassword = vi
    .fn()
    .mockResolvedValue({ error: { status: 400, message: "Private detail" } });
  client.mockResolvedValue({ auth: { signInWithPassword } });
  const failed = await login(request({ email: "synthetic@example.com", password: "Test" }));
  expect(failed.status).toBe(401);
  expect(JSON.stringify(await failed.json())).not.toContain("Private detail");
  signInWithPassword.mockResolvedValue({ error: { status: 429 } });
  expect((await login(request({ email: "synthetic@example.com", password: "Test" }))).status).toBe(
    429,
  );
});
it("requires same-origin requests and a verified session to set a password", async () => {
  expect((await password(request({}, "https://untrusted.example"))).status).toBe(403);
  client.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  });
  expect(
    (
      await password(
        request({ password: "Synthetic-test-password", confirmation: "Synthetic-test-password" }),
      )
    ).status,
  ).toBe(401);
});
it("checks length and confirmation and updates only the authenticated account", async () => {
  const updateUser = vi.fn().mockResolvedValue({ error: null });
  client.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "verified" } } }),
      updateUser,
    },
  });
  expect((await password(request({ password: "short", confirmation: "short" }))).status).toBe(400);
  expect(
    (await password(request({ password: "Synthetic-test-password", confirmation: "Mismatch" })))
      .status,
  ).toBe(400);
  expect(updateUser).not.toHaveBeenCalled();
  expect(
    (
      await password(
        request({
          password: "Synthetic-test-password",
          confirmation: "Synthetic-test-password",
          id: "forged",
        }),
      )
    ).status,
  ).toBe(200);
  expect(updateUser).toHaveBeenCalledWith({ password: "Synthetic-test-password" });
});
