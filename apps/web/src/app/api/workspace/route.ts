import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { emptySharedState } from "@/lib/shared";
import { expiredSessionMessage, isInvalidSession } from "@/lib/session";

export async function GET() {
  const db = await supabase();
  if (!db)
    return NextResponse.json(emptySharedState, {
      headers: { "Cache-Control": "private, no-store" },
    });
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError")
    return NextResponse.json(
      { error: isInvalidSession(authError) ? expiredSessionMessage : "Could not verify your session. Please try again." },
      { status: isInvalidSession(authError) ? 401 : 503, headers: { "Cache-Control": "private, no-store" } },
    );
  const entries = await db
    .from("dataset_entries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (entries.error)
    return NextResponse.json({ error: "Could not load shared datasets." }, { status: 503 });
  const state = {
    ...emptySharedState,
    configured: true,
    entries: entries.data,
    user: user ? { id: user.id, email: user.email } : null,
  };
  if (!user) return NextResponse.json(state, { headers: { "Cache-Control": "private, no-store" } });
  const profile = await db.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const roleRows = await db.from("user_roles").select("role").eq("user_id", user.id);
  const revisions = await db
    .from("dataset_entry_revisions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  const ids = (revisions.data ?? []).map((row) => row.id);
  const comments = ids.length
    ? await db
        .from("review_comments")
        .select("*")
        .in("revision_id", ids)
        .order("created_at")
        .limit(1000)
    : { data: [], error: null };
  const disputes = ids.length
    ? await db.from("linguistic_disputes").select("*").in("revision_id", ids).limit(500)
    : { data: [], error: null };
  const disputeIds = (disputes.data ?? []).map((row) => row.id);
  const revisionHistory = ids.length
    ? await db.from("audit_logs").select("id,record_id,actor_id,action,created_at,details")
        .in("record_id", ids).in("action", ["revision_created", "revision_snapshot"])
        .order("created_at", { ascending: false }).limit(1000)
    : { data: [], error: null };
  const reviewHistory = ids.length
    ? await db.from("review_decisions").select("*").in("revision_id", ids)
        .order("created_at").limit(1000)
    : { data: [], error: null };
  const evidence = disputeIds.length
    ? await db.from("dispute_evidence").select("*").in("dispute_id", disputeIds)
        .order("created_at").limit(1000)
    : { data: [], error: null };
  if ([profile, roleRows, revisions, comments, disputes, evidence, reviewHistory, revisionHistory].some((result) => result.error))
    return NextResponse.json({ error: "Could not load your shared workspace." }, { status: 503 });
  return NextResponse.json(
    {
      ...state,
      profile: profile.data,
      roles: (roleRows.data ?? []).map((row) => row.role),
      revisions: revisions.data,
      comments: comments.data,
      disputes: disputes.data,
      evidence: evidence.data,
      reviewHistory: reviewHistory.data,
      revisionHistory: revisionHistory.data,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
