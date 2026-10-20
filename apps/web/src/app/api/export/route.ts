import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") ?? "jsonl";
  if (!["json", "jsonl"].includes(format))
    return NextResponse.json({ error: "Supported formats: json, jsonl." }, { status: 400 });
  const db = await supabase();
  if (!db)
    return NextResponse.json(
      { error: "Published data is not configured." },
      { status: 503 },
    );
  const data: Record<string, unknown>[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data: page, error } = await db
      .from("dataset_entries")
      .select("*")
      .in("license", ["CC0-1.0", "CC-BY-4.0"])
      .order("created_at")
      .order("id")
      .range(offset, offset + pageSize - 1);
    if (error) return NextResponse.json({ error: "Export failed." }, { status: 500 });
    data.push(...(page ?? []));
    if (!page || page.length < pageSize) break;
  }
  const rows = (data ?? []).map(({ contributor_id, reviewer_id, ...row }) => ({
    ...row,
    contributor: contributor_id,
    reviewer: reviewer_id,
    status: "published",
  }));
  return new Response(
    format === "json"
      ? JSON.stringify(rows, null, 2)
      : rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""),
    {
      headers: {
        "Content-Type":
          format === "json"
            ? "application/json; charset=utf-8"
            : "application/x-ndjson; charset=utf-8",
        "Content-Disposition": `attachment; filename=qaamuusai-published.${format}`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
