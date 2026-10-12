import { sameOrigin } from "@/lib/origin";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { error } = await db.auth.signOut({ scope: "local" });
  return error
    ? NextResponse.json({ error: "Could not sign out." }, { status: 400 })
    : NextResponse.json({ ok: true });
}
