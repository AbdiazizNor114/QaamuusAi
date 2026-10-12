import { NextResponse } from "next/server";
import { z } from "zod";
import { statuses } from "@qaamuusai/schemas";
import { supabase } from "@/lib/supabase";
const schema = z.object({
  revision: z.uuid(),
  next_status: z.enum(statuses),
  reason: z.string().trim().min(1).max(10000),
});
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  const { error } = await db.rpc(
    parsed.data.next_status === "submitted" ? "submit_revision" : "review_revision",
    parsed.data.next_status === "submitted" ? { revision: parsed.data.revision } : parsed.data,
  );
  return error
    ? NextResponse.json(
        { error: "Decision rejected by database permissions or workflow rules." },
        { status: 403 },
      )
    : NextResponse.json({ ok: true });
}
