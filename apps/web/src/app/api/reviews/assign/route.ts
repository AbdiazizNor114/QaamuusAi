import { sameOrigin } from "@/lib/origin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const input = z.object({ revision: z.uuid(), reviewer: z.uuid(),
    reason: z.string().trim().min(1).max(10000),
  }).safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json({ error: "Select a reviewer and enter a rationale." }, { status: 400 });
  const { error } = await db.rpc("assign_dataset_reviewer", input.data);
  return error
    ? NextResponse.json({ error: "Assignment rejected by database permissions or workflow rules." }, { status: 403 })
    : NextResponse.json({ ok: true });
}
