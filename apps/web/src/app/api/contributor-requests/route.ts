import { NextResponse } from "next/server";
import { contributorApplicationSchema } from "@/lib/contributor-application";
import { supabase } from "@/lib/supabase";
import { sameOrigin } from "@/lib/origin";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const input = contributorApplicationSchema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Complete your name, email, field of study and professional role." },
      { status: 400 },
    );
  const db = await supabase();
  if (!db)
    return NextResponse.json(
      { error: "Applications are temporarily unavailable." },
      { status: 503 },
    );
  const { error } = await db.rpc("request_contributor_access", {
    applicant_name: input.data.name,
    applicant_email: input.data.email,
    applicant_study: input.data.study,
    applicant_role: input.data.professional_role,
  });
  return error
    ? NextResponse.json(
        { error: "Could not submit your request. Please try again later." },
        { status: 503 },
      )
    : NextResponse.json({ ok: true });
}
export async function GET() {
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Applications are unavailable." }, { status: 503 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data: allowed, error: roleError } = await db.rpc("has_role", {
    wanted: "technical_admin",
  });
  if (roleError || !allowed)
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const { data, error } = await db
    .from("contributor_requests")
    .select("id,name,email,study,professional_role,status,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  return NextResponse.json(error ? { error: "Could not load requests." } : { requests: data }, {
    status: error ? 503 : 200,
    headers: { "Cache-Control": "private, no-store" },
  });
}
