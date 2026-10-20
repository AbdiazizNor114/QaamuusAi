import { z } from "zod";
import { publicDb } from "@/lib/public-db";

const parameters = z
  .object({
    q: z
      .string()
      .trim()
      .max(100)
      .regex(
        /^[\p{L}\p{N}\s'-]*$/u,
        "Search accepts letters, numbers, spaces, apostrophes and hyphens.",
      )
      .optional(),
    category: z.enum(["vocabulary", "translation", "grammar"]).optional(),
    dialect: z.string().trim().min(1).max(100).optional(),
    page: z
      .string()
      .regex(/^[1-9]\d*$/)
      .transform(Number)
      .pipe(z.number().int().max(10000))
      .default(1),
    limit: z
      .string()
      .regex(/^[1-9]\d*$/)
      .transform(Number)
      .pipe(z.number().int().max(100))
      .default(25),
  })
  .strict();
const fields = "id,category,term,translation,notes,source,license,dialect,version,created_at";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = parameters.safeParse(Object.fromEntries(params));
  if (!parsed.success || new Set(params.keys()).size !== [...params.keys()].length)
    return Response.json(
      {
        error: {
          code: "invalid_parameters",
          message:
            "Use q (up to 100 characters), category, dialect, page (1–10000), limit (1–100). Unknown or repeated parameters are rejected.",
        },
      },
      { status: 400, headers },
    );
  const db = publicDb();
  if (!db)
    return Response.json(
      { error: { code: "unavailable", message: "Published data is temporarily unavailable." } },
      { status: 503, headers },
    );
  const { q, category, dialect, page, limit } = parsed.data;
  let query = db
    .from("dataset_entries")
    .select(fields, { count: "exact" })
    .in("license", ["CC0-1.0", "CC-BY-4.0"]);
  if (category) query = query.eq("category", category);
  if (dialect) query = query.eq("dialect", dialect);
  if (q) query = query.or(`term.ilike.%${q}%,translation.ilike.%${q}%`);
  try {
    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .order("id")
      .range((page - 1) * limit, page * limit - 1);
    if (error) throw error;
    const total = count ?? 0;
    return Response.json(
      {
        api_version: "v1",
        status: "published",
        data: data ?? [],
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
          has_next: page * limit < total,
        },
      },
      { headers },
    );
  } catch {
    console.warn(JSON.stringify({ event: "public_entries_unavailable", at: new Date().toISOString() }));
    return Response.json(
      { error: { code: "unavailable", message: "Published data is temporarily unavailable." } },
      { status: 503, headers },
    );
  }
}
