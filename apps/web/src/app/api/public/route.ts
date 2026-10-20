import { supabase } from "@/lib/supabase";

export async function GET() {
  const db = await supabase();
  if (!db) return Response.json({ entries: [], articles: [], releases: [], configured: false });
  const entries = await db
    .from("dataset_entries")
    .select("id,category,term,translation,notes,source,license,dialect,version,created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const articles = await db
    .from("articles")
    .select("id,title,summary,body,source,license,version,created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const releases = await db
    .from("dataset_releases")
    .select("id,version,notes,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if ([entries, articles, releases].some((result) => result.error))
    return Response.json(
      { error: "Published resources are temporarily unavailable." },
      { status: 503 },
    );
  return Response.json(
    { entries: entries.data, articles: articles.data, releases: releases.data, configured: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
