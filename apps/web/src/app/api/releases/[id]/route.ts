import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return NextResponse.json({ error: "Invalid release." }, { status: 400 });
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data, error } = await db
    .from("dataset_releases")
    .select("version,snapshot,license_manifest")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load release." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Release not found." }, { status: 404 });
  const manifest = new URL(request.url).searchParams.get("format") === "manifest";
  const filename = `qaamuusai-v${String(data.version).replace(/[^0-9.]/g, "")}${manifest ? "-manifest.json" : ".jsonl"}`;
  return new Response(
    manifest
      ? JSON.stringify(data.license_manifest, null, 2)
      : data.snapshot.map((row: unknown) => JSON.stringify(row)).join("\n") +
          (data.snapshot.length ? "\n" : ""),
    {
      headers: {
        "Content-Type": manifest
          ? "application/json; charset=utf-8"
          : "application/x-ndjson; charset=utf-8",
        "Content-Disposition": `attachment; filename=${filename}`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
