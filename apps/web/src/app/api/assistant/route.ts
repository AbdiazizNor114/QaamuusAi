import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { sameOrigin } from "@/lib/origin";
import { chatInput, freeChatModel } from "@/lib/chat-contract";
import { chatInstructions } from "@/lib/chat-context";
import { consumeChatRequest } from "@/lib/chat-limit";
export const runtime = "nodejs";
export const maxDuration = 60;
function reply(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", ...headers },
  });
}
export function GET() {
  return reply({
    configured:
      !!process.env.OPENROUTER_API_KEY?.trim() &&
      process.env.OPENROUTER_ALLOW_NVIDIA_DATA_USE === "true",
    model: freeChatModel,
  });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Origin rejected." }, 403);
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key)
    return reply(
      {
        error:
          "AI chat is not connected yet. Add the server key to enable it, or use Project guide.",
      },
      503,
    );
  if (process.env.OPENROUTER_ALLOW_NVIDIA_DATA_USE !== "true")
    return reply(
      { error: "NVIDIA data-use settings need administrator approval before chat can be enabled." },
      503,
    );
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: "Enter a question." }, 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32000) {
      await reader.cancel();
      return reply(
        { error: "This conversation is too long. Clear AI chat and try a shorter question." },
        413,
      );
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return reply({ error: "Enter a valid question." }, 400);
  }
  const input = chatInput.safeParse(body);
  if (!input.success)
    return reply(
      {
        error:
          "Keep questions below 2,000 characters. Clear AI chat if the conversation is too long.",
      },
      400,
    );
  const ip = process.env.VERCEL === "1" ? request.headers.get("x-real-ip") : null;
  const budget = consumeChatRequest(ip ? createHash("sha256").update(ip).digest("hex") : "shared");
  if (!budget.allowed)
    return reply(
      {
        error: budget.daily
          ? "Today's local free-chat allowance is used up. Try tomorrow or use Project guide."
          : "Too many questions in a short time. Please wait a minute and try again.",
      },
      429,
      { "Retry-After": String(budget.retryAfter) },
    );
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-OpenRouter-Title": "QaamuusAI",
      },
      body: JSON.stringify({
        model: freeChatModel,
        messages: [{ role: "system", content: chatInstructions }, ...input.data.messages],
        max_tokens: 2048,
        stream: false,
        provider: {
          allow_fallbacks: false,
          data_collection: "allow",
          only: ["nvidia"],
          max_price: { prompt: 0, completion: 0, request: 0 },
        },
      }),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(45000)]),
    });
    if (!response.ok) {
      if (response.status === 429) {
        const detail = await response.json().catch(() => null);
        const raw =
          typeof detail?.error?.metadata?.raw === "string" ? detail.error.metadata.raw : "";
        if (raw.includes("temporarily rate-limited upstream"))
          return reply(
            {
              error:
                "The free provider is temporarily at capacity. This is not a problem with your question or API key. Try later or use Project guide.",
              code: "provider_busy",
              retry_after_seconds: 60,
            },
            503,
            { "Retry-After": "60" },
          );
        return reply(
          {
            error:
              "The free model is busy or the shared daily allowance is exhausted. Try later or use Project guide. No paid fallback was used.",
          },
          429,
        );
      }
      if (response.status === 404) {
        const detail = await response.json().catch(() => null);
        const reason = String(detail?.error?.message ?? "");
        if (/data policy|training|privacy/i.test(reason))
          return reply(
            {
              error:
                "OpenRouter is blocking the free NVIDIA model under this account’s privacy settings. The account owner needs to allow the disclosed free-model data use in OpenRouter Settings → Privacy.",
              code: "provider_privacy_settings",
            },
            503,
          );
      }
      if ([401, 402, 403].includes(response.status))
        return reply(
          {
            error:
              "The free AI connection needs an administrator to check its key, free-account allowance or privacy settings. No paid fallback was used.",
          },
          503,
        );
      return reply(
        {
          error:
            "The free model is unavailable. Try later or use Project guide. No paid fallback was used.",
        },
        502,
      );
    }
    const result = z
      .object({
        choices: z
          .array(
            z.object({
              message: z.object({ content: z.string().max(12000) }),
              finish_reason: z.string().nullable().optional(),
            }),
          )
          .min(1),
      })
      .safeParse(await response.json());
    const answer = result.success ? result.data.choices[0].message.content.trim() : "";
    if (!answer)
      return reply({ error: "The model returned no usable answer. Try a shorter question." }, 502);
    return reply({
      answer: answer.slice(0, 6000),
      model: freeChatModel,
      truncated:
        answer.length > 6000 ||
        (result.success && result.data.choices[0].finish_reason === "length"),
    });
  } catch {
    return reply(
      {
        error:
          "The AI connection was interrupted or timed out. Your question can be retried; Project guide is also available.",
      },
      502,
    );
  }
}
