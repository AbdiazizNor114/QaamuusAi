import { z } from "zod";
const text = z.string().trim().min(1).max(10000);
export const articleInput = z.object({
  title: text,
  summary: text,
  body: text,
  source: text,
  license: z.enum(["CC0-1.0", "CC-BY-4.0", "Permission pending"]),
});
