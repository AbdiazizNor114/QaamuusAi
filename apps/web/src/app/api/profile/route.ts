import { sameOrigin } from "@/lib/origin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const input = z
    .object({ display_name: z.string().trim().min(1).max(120) })
    .safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Enter a display name up to 120 characters." },
      { status: 400 },
    );
  const { error } = await db.from("profiles").upsert({
    id: user.id,
    display_name: input.data.display_name,
    updated_at: new Date().toISOString(),
  });
  return error
    ? NextResponse.json({ error: "Could not save profile." }, { status: 400 })
    : NextResponse.json({ ok: true });
}
