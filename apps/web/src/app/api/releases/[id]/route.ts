import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { releaseFiles } from "@/lib/release-download";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return NextResponse.json({ error: "Invalid release." }, { status: 400 });
  const format = new URL(request.url).searchParams.get("format") ?? "jsonl";
  if (!["json", "jsonl", "manifest", "checksums"].includes(format))
    return NextResponse.json({ error: "Use json, jsonl, manifest or checksums." }, { status: 400 });
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data, error } = await db
    .from("dataset_releases")
    .select("version,snapshot,license_manifest")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load release." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Release not found." }, { status: 404 });
  const files = releaseFiles(data);
  if (format === "checksums")
    return new Response(
      Object.values(files)
        .map((file) => `${file.sha256}  ${file.filename}`)
        .join("\n") + "\n",
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename=qaamuusai-v${String(data.version).replace(/[^0-9.]/g, "")}-SHA256SUMS.txt`,
          "Cache-Control": "no-store",
        },
      },
    );
  const file = files[format as keyof typeof files];
  return new Response(file.body, {
    headers: {
      "Content-Type": `${file.type}; charset=utf-8`,
      "Content-Disposition": `attachment; filename=${file.filename}`,
      "X-Checksum-SHA256": file.sha256,
      ETag: `"${file.sha256}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
