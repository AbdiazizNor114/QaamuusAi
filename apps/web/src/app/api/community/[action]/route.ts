import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sameOrigin } from "@/lib/origin";
import { communityCommands, communityRPC } from "@/lib/shared-community";
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const { action } = await params;
  if (!Object.hasOwn(communityCommands, action))
    return NextResponse.json({ error: "Unknown community action." }, { status: 404 });
  const command = action as keyof typeof communityCommands;
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const input = communityCommands[command].safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Complete the required fields with valid values." },
      { status: 400 },
    );
  const { data, error } = await db.rpc(communityRPC[command], input.data);
  return error
    ? NextResponse.json(
        { error: "Action rejected by database permissions or workflow rules." },
        { status: 403 },
      )
    : NextResponse.json({ ok: true, id: data });
}
