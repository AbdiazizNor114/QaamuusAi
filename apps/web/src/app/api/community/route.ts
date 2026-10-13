import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { emptySharedCommunity } from "@/lib/shared-community";
export async function GET() {
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError")
    return NextResponse.json({ error: "Could not verify your session." }, { status: 503 });
  const articles = await db
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  const releases = await db
    .from("dataset_releases")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (articles.error || releases.error)
    return NextResponse.json(
      { error: "Could not load shared articles and releases." },
      { status: 503 },
    );
  let state = { ...emptySharedCommunity, articles: articles.data, releases: releases.data };
  if (user) {
    const revisions = await db
      .from("article_revisions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    const applications = await db
      .from("scholar_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    const members = await db.rpc("community_members");
    const audit = await db
      .from("audit_logs")
      .select("*")
      .in("action", [
        "role_granted",
        "role_revoked",
        "scholar_accepted",
        "scholar_declined",
        "release_created",
      ])
      .order("created_at", { ascending: false })
      .limit(500);
    const ids = (revisions.data ?? []).map((row) => row.id);
    const decisions = ids.length
      ? await db
          .from("article_review_decisions")
          .select("*")
          .in("revision_id", ids)
          .order("created_at")
          .limit(1000)
      : { data: [], error: null };
    if ([revisions, applications, members, audit, decisions].some((result) => result.error))
      return NextResponse.json({ error: "Could not load community workflows." }, { status: 503 });
    state = {
      ...state,
      articleRevisions: revisions.data ?? [],
      applications: applications.data ?? [],
      members: members.data ?? [],
      audit: audit.data ?? [],
      decisions: decisions.data ?? [],
    };
  }
  return NextResponse.json(state, { headers: { "Cache-Control": "private, no-store" } });
}
