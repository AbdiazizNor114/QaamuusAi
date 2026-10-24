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
      await GET(new Request("http://localhost:3000/auth?token_hash=synthetic&type=unsupported"))
    ).headers.get("location"),
  ).toBe("http://localhost:3000/login?error=callback");
  expect(verifyOtp).not.toHaveBeenCalled();
});
it("verified recovery callbacks open the password form", async () => {
  const verifyOtp = vi.fn().mockResolvedValue({ error: null });
  client.mockResolvedValue({ auth: { verifyOtp } });
  const response = await GET(
    new Request("http://localhost:3000/auth?token_hash=synthetic&type=recovery"),
  );
  expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "synthetic", type: "recovery" });
  expect(response.headers.get("location")).toBe("http://localhost:3000/reset-password");
});
it("PKCE recovery requests return to reset-password and clear the routing marker", async () => {
  client.mockResolvedValue({
    auth: { exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }) },
  });
  const response = await GET(
    new Request("http://localhost:3000/auth?code=synthetic", {
      headers: { cookie: "qaamuusai-recovery=1" },
    }),
  );
  expect(response.headers.get("location")).toBe("http://localhost:3000/reset-password");
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
});
it("uses the verified PKCE recovery type even when the routing marker is absent", async () => {
  client.mockResolvedValue({
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        data: { redirectType: "recovery", user: { id: "synthetic" } },
        error: null,
      }),
    },
  });
  const response = await GET(
    new Request("http://localhost:3000/auth?code=synthetic-recovery", {
      headers: { host: "127.0.0.1:3000" },
    }),
  );
  expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/reset-password");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("failed email exchange does not establish a signed-in redirect", async () => {
  client.mockResolvedValue({
    auth: { exchangeCodeForSession: vi.fn().mockResolvedValue({ error: { message: "expired" } }) },
  });
  expect(
    (await GET(new Request("http://localhost:3000/auth?code=expired"))).headers.get("location"),
  ).toBe("http://localhost:3000/login?error=callback");
});
it("thrown recovery exchanges return a safe redirect rather than HTTP 500", async () => {
  client.mockResolvedValue({
    auth: {
      exchangeCodeForSession: vi.fn().mockRejectedValue(new Error("private provider detail")),
    },
  });
  const response = await GET(
    new Request("http://localhost:3000/auth?code=synthetic", {
      headers: { cookie: "qaamuusai-recovery=1" },
    }),
  );
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("http://localhost:3000/login?error=callback");
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
});

it("verified invitations bind contributor access then open password setup", async () => {
  const rpc = vi.fn().mockResolvedValue({ error: null });
  client.mockResolvedValue({
    auth: { verifyOtp: vi.fn().mockResolvedValue({ error: null }) },
    rpc,
  });
  const response = await GET(
    new Request("http://localhost:3000/auth?token_hash=synthetic&type=invite"),
  );
  expect(rpc).toHaveBeenCalledWith("accept_contributor_invitation");
  expect(response.headers.get("location")).toBe("http://localhost:3000/reset-password");
});
it("expired invitations never grant contributor access", async () => {
  const rpc = vi.fn();
  client.mockResolvedValue({
    auth: { verifyOtp: vi.fn().mockResolvedValue({ error: { message: "expired" } }) },
    rpc,
  });
  const response = await GET(
    new Request("http://localhost:3000/auth?token_hash=expired&type=invite"),
  );
  expect(rpc).not.toHaveBeenCalled();
  expect(response.headers.get("location")).toBe("http://localhost:3000/login?error=callback");
});
