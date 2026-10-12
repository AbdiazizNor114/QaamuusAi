import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
export async function GET() {
  const db = await supabase();
  if (!db)
    return NextResponse.json(
      { error: "Use the demo export in the dataset browser. Shared data is not configured." },
      { status: 503 },
    );
  const { data, error } = await db
    .from("dataset_entries")
    .select("*")
    .in("license", ["CC0-1.0", "CC-BY-4.0"])
    .order("created_at");
  if (error) return NextResponse.json({ error: "Export failed." }, { status: 500 });
  const rows = (data ?? []).map(({ contributor_id, reviewer_id, ...row }) => ({
    ...row,
    contributor: contributor_id,
    reviewer: reviewer_id,
    status: "published",
  }));
  return new Response(
    rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""),
    {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Content-Disposition": "attachment; filename=qaamuusai-published.jsonl",
      },
    },
  );
}
