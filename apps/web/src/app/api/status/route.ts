import { publicDb } from "@/lib/public-db";
export async function GET() {
  const started = Date.now();
  try {
    const db = publicDb();
    if (!db) throw new Error("unconfigured");
    const result = await db
      .from("dataset_entries")
      .select("id")
      .limit(1)
      .abortSignal(AbortSignal.timeout(5000));
    if (result.error) throw new Error("unavailable");
    return Response.json(
      {
        status: "operational",
        checked_at: new Date().toISOString(),
        latency_ms: Date.now() - started,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.warn(
      JSON.stringify({ event: "public_api_health_failed", at: new Date().toISOString() }),
    );
    return Response.json(
      { status: "unavailable", checked_at: new Date().toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
