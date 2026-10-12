import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const input = z
    .object({ dispute: z.uuid(), explanation: z.string().trim().min(1).max(10000) })
    .safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid resolution." }, { status: 400 });
  const { error } = await db.rpc("resolve_dispute", input.data);
  return error
    ? NextResponse.json({ error: "Resolution not permitted." }, { status: 403 })
    : NextResponse.json({ ok: true });
}
