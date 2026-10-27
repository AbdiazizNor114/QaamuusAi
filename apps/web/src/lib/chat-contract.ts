import { z } from "zod";
export const freeChatModel = "nvidia/nemotron-3.5-lightning:free";
export const chatInput = z
  .object({
    provider_data_use_accepted: z.literal(true),
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(6000),
        }),
      )
      .min(1)
      .max(7),
  })
  .superRefine(({ messages }, ctx) => {
    if (messages.at(-1)?.role !== "user")
      ctx.addIssue({ code: "custom", message: "End with a question" });
    if (messages.reduce((n, m) => n + m.content.length, 0) > 18000)
      ctx.addIssue({ code: "custom", message: "Start a new conversation" });
    messages.forEach((m, i) => {
      if (
        m.role !== (i % 2 === 0 ? "user" : "assistant") ||
        (m.role === "user" && m.content.length > 2000)
      )
        ctx.addIssue({ code: "custom", message: "Invalid conversation" });
    });
  });
export type ChatMessage = { role: "user" | "assistant"; content: string };
