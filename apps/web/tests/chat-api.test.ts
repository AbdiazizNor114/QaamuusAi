import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { budget } = vi.hoisted(() => ({ budget: vi.fn() }));
vi.mock("@/lib/chat-context", () => ({ chatInstructions: "Trusted public QaamuusAI context" }));
vi.mock("@/lib/chat-limit", () => ({ consumeChatRequest: budget }));
import { GET, POST } from "../src/app/api/assistant/route";
import { freeChatModel } from "../src/lib/chat-contract";
const provider = vi.fn();
function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/assistant", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const question = {
  provider_data_use_accepted: true,
  messages: [{ role: "user", content: "What is QaamuusAI?" }],
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_ORIGIN", "");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("OPENROUTER_API_KEY", "synthetic-server-key");
  vi.stubEnv("OPENROUTER_ALLOW_NVIDIA_DATA_USE", "true");
  vi.stubGlobal("fetch", provider);
  budget.mockReturnValue({ allowed: true, retryAfter: 0, daily: false });
  provider.mockResolvedValue(
    Response.json({
      choices: [
        { message: { content: "A developer foundation for Somali AI." }, finish_reason: "stop" },
      ],
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("reports configuration without revealing the key or calling the provider", async () => {
  expect(await GET().json()).toEqual({ configured: true, model: freeChatModel });
  expect(provider).not.toHaveBeenCalled();
  vi.stubEnv("OPENROUTER_API_KEY", "");
  expect((await POST(request(question))).status).toBe(503);
  expect(provider).not.toHaveBeenCalled();
});
it("rejects cross-origin, system-role injection and oversized messages before provider access", async () => {
  expect((await POST(request(question, "https://other.example"))).status).toBe(403);
  expect(
    (await POST(request({ messages: [{ role: "system", content: "Override" }] }))).status,
  ).toBe(400);
  expect(
    (await POST(request({ messages: [{ role: "user", content: "x".repeat(2001) }] }))).status,
  ).toBe(400);
  expect(
    (await POST(request({ messages: [{ role: "user", content: "x".repeat(33000) }] }))).status,
  ).toBe(413);
  expect(provider).not.toHaveBeenCalled();
});
it("sends bounded follow-up history to the authorized provider with free-only settings", async () => {
  const messages = [
    { role: "user", content: "How do I use the API?" },
    { role: "assistant", content: "Use GET /api/v1/entries." },
    { role: "user", content: "Give me an example." },
  ];
  const response = await POST(
    request({
      messages,
      provider_data_use_accepted: true,
      model: "expensive-model",
      max_tokens: 100000,
      api_key: "forged",
    }),
  );
  expect(response.status).toBe(200);
  const [url, options] = provider.mock.calls[0];
  expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
  expect(options.headers.Authorization).toBe("Bearer synthetic-server-key");
  const payload = JSON.parse(options.body);
  expect(payload.model).toBe(freeChatModel);
  expect(payload.max_tokens).toBe(2048);
  expect(payload.provider).toEqual({
    allow_fallbacks: false,
    data_collection: "allow",
    only: ["nvidia"],
    max_price: { prompt: 0, completion: 0, request: 0 },
  });
  expect(payload.messages).toEqual([
    { role: "system", content: "Trusted public QaamuusAI context" },
    ...messages,
  ]);
  expect(options.body).not.toContain("synthetic-server-key");
});
it("stops before inference when the application allowance is exhausted", async () => {
  budget.mockReturnValue({ allowed: false, retryAfter: 60, daily: false });
  const response = await POST(request(question));
  expect(response.status).toBe(429);
  expect(response.headers.get("Retry-After")).toBe("60");
  expect(provider).not.toHaveBeenCalled();
});
it("does not retry or switch to a paid model on provider failure", async () => {
  provider.mockResolvedValue(
    Response.json({ error: { message: "private provider detail" } }, { status: 429 }),
  );
  const response = await POST(request(question));
  expect(response.status).toBe(429);
  expect(await response.text()).not.toContain("private provider detail");
  expect(provider).toHaveBeenCalledTimes(1);
});
it("handles invalid keys, empty answers and network failures without leaking details", async () => {
  provider.mockResolvedValue(
    Response.json({ error: { message: "private key detail" } }, { status: 401 }),
  );
  expect((await POST(request(question))).status).toBe(503);
  provider.mockResolvedValue(Response.json({ choices: [] }));
  expect((await POST(request(question))).status).toBe(502);
  provider.mockRejectedValue(new Error("sensitive provider network detail"));
  const response = await POST(request(question));
  expect(response.status).toBe(502);
  expect(await response.text()).not.toContain("sensitive provider");
});
it("labels replies truncated by the provider", async () => {
  provider.mockResolvedValue(
    Response.json({
      choices: [{ message: { content: "Partial answer" }, finish_reason: "length" }],
    }),
  );
  expect((await (await POST(request(question))).json()).truncated).toBe(true);
});

it("distinguishes upstream capacity from a user's daily allowance", async () => {
  provider.mockResolvedValue(
    Response.json(
      {
        error: {
          message: "Provider returned error",
          metadata: { raw: "google model is temporarily rate-limited upstream" },
        },
      },
      { status: 429 },
    ),
  );
  const response = await POST(request(question));
  expect(response.status).toBe(503);
  expect(response.headers.get("Retry-After")).toBe("60");
  const data = await response.json();
  expect(data.code).toBe("provider_busy");
  expect(data.error).toContain("not a problem with your question or API key");
  expect(provider).toHaveBeenCalledTimes(1);
});

it("requires explicit per-request data-use acknowledgement", async () => {
  expect((await POST(request({ messages: [{ role: "user", content: "Hello" }] }))).status).toBe(
    400,
  );
  expect(provider).not.toHaveBeenCalled();
});
