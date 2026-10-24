import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sameOrigin, requestOrigin } from "@/lib/origin";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
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
  const { id } = await params;
  const input = z
    .object({ decision: z.enum(["approve", "decline", "resend"]) })
    .safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !input.success)
    return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  const admin = supabaseAdmin();
  if (!admin)
    return NextResponse.json(
      { error: "Invitation email is not configured. Contact the administrator." },
      { status: 503 },
    );
  const approved = input.data.decision !== "decline";
  const { data: application, error } = await admin
    .from("contributor_requests")
    .update({
      status: approved ? "sending" : "declined",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", input.data.decision === "resend" ? ["invited"] : ["pending", "failed"])
    .select("email,name")
    .maybeSingle();
  if (error || !application)
    return NextResponse.json(
      { error: "Request is no longer awaiting a decision. Refresh the list." },
      { status: 409 },
    );
  if (approved) {
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(application.email, {
      data: { display_name: application.name },
      redirectTo: `${requestOrigin(request)}/auth?type=invite`,
    });
    const { error: saveError } = await admin
      .from("contributor_requests")
      .update({ status: inviteError ? "failed" : "invited" })
      .eq("id", id)
      .eq("status", "sending");
    if (inviteError || saveError) {
      console.warn(
        JSON.stringify({
          event: "contributor_invitation_failed",
          code: inviteError?.code || saveError?.code || "unknown",
        }),
      );
      return NextResponse.json(
        {
          error:
            inviteError?.code === "email_exists"
              ? "This email already has an account. Ask the member to sign in; use Role administration to manage contributor access."
              : "Invitation could not be completed. Refresh the list before retrying; check email delivery and whether the account already exists.",
        },
        { status: 502 },
      );
    }
  }
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: approved ? "invite_contributor" : "decline_contributor",
    record_id: id,
  });
  return NextResponse.json({ ok: true });
}
