import { sameOrigin } from "@/lib/origin";
import { NextResponse } from "next/server";
import { proposalSchema } from "@qaamuusai/schemas";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
export async function GET() {
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data, error } = await db
    .from("dataset_entry_revisions")
    .select("*")
    .order("created_at", { ascending: false });
  return error
    ? NextResponse.json({ error: "Could not load submissions." }, { status: 400 })
    : NextResponse.json(data);
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const input = z
    .object({ revision: z.uuid(), content: proposalSchema })
    .safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid revision." }, { status: 400 });
  const { error } = await db.rpc("save_revision", input.data);
  return error
    ? NextResponse.json({ error: "Revision is not editable." }, { status: 403 })
    : NextResponse.json({ ok: true });
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const input = proposalSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid proposal." }, { status: 400 });
  const { data, error } = await db
    .from("dataset_entry_revisions")
    .insert({ ...input.data, author_id: user.id })
    .select()
    .single();
  return error
    ? NextResponse.json(
        { error: "Could not create proposal. Complete your profile first." },
        { status: 400 },
      )
    : NextResponse.json(data, { status: 201 });
}
