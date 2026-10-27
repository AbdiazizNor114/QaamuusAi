import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sameOrigin } from "@/lib/origin";
import { projectCommand } from "@/lib/project-workspace";
export async function GET() {
  const db = await supabase();
  if (!db)
    return NextResponse.json({ error: "Task workspace is not configured yet." }, { status: 503 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data, error } = await db.rpc("project_board");
  return NextResponse.json(
    error
      ? {
          error:
            "Task workspace is unavailable. Ask a maintainer to check the workspace migration.",
        }
      : data,
    { status: error ? 503 : 200, headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
  const input = projectCommand.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Complete the task fields with valid values." },
      { status: 400 },
    );
  const db = await supabase();
  if (!db) return NextResponse.json({ error: "Task workspace is unavailable." }, { status: 503 });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const c = input.data;
  const { error } =
    c.command === "area"
      ? await db.rpc("set_workspace_area", { selected_area: c.area })
      : await db.rpc("transition_project_task", {
          task_id: c.task_id,
          expected_version: c.expected_version,
          action: c.action,
          evidence: c.evidence,
          explanation: c.explanation,
        });
  return NextResponse.json(
    error
      ? {
          error:
            "Action rejected. Check ownership, review permissions and dependencies, then refresh before trying again.",
        }
      : { ok: true },
    { status: error ? 409 : 200 },
  );
}
