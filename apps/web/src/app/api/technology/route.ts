import { technologyMetadata, technologyTerms } from "@/lib/technology-terms";

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") ?? "json";
  if (!["json", "jsonl"].includes(format))
    return Response.json({ error: "Supported formats: json, jsonl." }, { status: 400 });
  const headers = {
    "Content-Type":
      format === "jsonl"
        ? "application/x-ndjson; charset=utf-8"
        : "application/json; charset=utf-8",
    "Content-Disposition": `attachment; filename=qaamuusai-technology-planning.${format}`,
    "Cache-Control": "public, max-age=300",
  };
  return new Response(
    format === "jsonl"
      ? technologyTerms.map((row) => JSON.stringify(row)).join("\n") + "\n"
      : JSON.stringify(
          { ...technologyMetadata, count: technologyTerms.length, terms: technologyTerms },
          null,
          2,
        ),
    { headers },
  );
}
