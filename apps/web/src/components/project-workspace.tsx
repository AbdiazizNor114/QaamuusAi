"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  areas,
  areaLabels,
  boardSchema,
  mayReviewTask,
  type Area,
  type ProjectTask,
} from "@/lib/project-workspace";
const statuses = {
  open: "Open",
  claimed: "Claimed",
  in_progress: "In progress",
  review: "In review",
  completed: "Completed",
};
export function ProjectWorkspace({
  userId,
  roles,
  summary = false,
}: {
  userId: string;
  roles: string[];
  summary?: boolean;
}) {
  const params = useSearchParams();
  const requested = params.get("area");
  const [board, setBoard] = useState<ReturnType<typeof boardSchema.parse> | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState(areas.includes(requested as Area) ? requested! : "all"),
    [stage, setStage] = useState("all"),
    [query, setQuery] = useState(""),
    [mine, setMine] = useState(false);
  async function load(signal?: AbortSignal) {
    try {
      const response = await fetch("/api/project-workspace", { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setBoard(boardSchema.parse(data));
      setError("");
    } catch (e) {
      if (!signal?.aborted)
        setError(e instanceof Error ? e.message : "Could not load project work.");
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void load(controller.signal));
    return () => controller.abort();
  }, []);
  async function command(body: unknown) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/project-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await load();
      setNotice("Workspace updated.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save.");
      await load();
    } finally {
      setBusy(false);
    }
  }
  const tasks = board?.tasks ?? [];
  const inferred: Area = roles.some((role) => ["reviewer", "editor"].includes(role))
    ? "language"
    : "engineering";
  const focus = board?.area ?? inferred;
  const relevant = tasks.filter((task) => task.track === focus && task.status === "open");
  const displayed = summary
    ? relevant.slice(0, 3)
    : tasks.filter(
        (task) =>
          (filter === "all" || task.track === filter) &&
          (stage === "all" || task.status === stage) &&
          (!mine || task.owner_id === userId) &&
          `${task.id} ${task.title} ${task.scope}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      );
  function blocked(task: ProjectTask) {
    return task.dependencies.filter((id) => tasks.find((t) => t.id === id)?.status !== "completed");
  }
  return (
    <section
      className="project-workspace"
      aria-label={summary ? "Your contribution focus" : "Project task board"}
    >
      <button
        className="project-refresh"
        disabled={busy}
        onClick={() => {
          setNotice("");
          void load();
        }}
      >
        Refresh tasks
      </button>
      <div className="project-heading">
        <div>
          <h2>{summary ? "Your contribution focus" : "Build the Somali AI foundation"}</h2>
          <p>
            {summary
              ? "Choose your area to see relevant starter work. Your account permissions stay the same."
              : "Claim one task, share evidence and submit it for independent review. Code and design work can stay in GitHub or your design tool. Use public-safe work summaries; never attach credentials or private participant recordings."}
          </p>
        </div>
        <Link href={summary ? "/dashboard/tasks" : "/dashboard/start"}>
          {summary ? "View task board" : "New here? Start here"}
        </Link>
      </div>
      {error ? (
        <div className="project-notice" role="status">
          <p>{error}</p>
          <button onClick={() => void load()}>Retry task workspace</button>
          <Link href="/dashboard/start">Read the onboarding guide</Link>
        </div>
      ) : !board ? (
        <p aria-busy="true">Loading project work…</p>
      ) : (
        <>
          <label className="project-area">
            My contribution area
            <select
              aria-label="My contribution area"
              value={focus}
              disabled={busy}
              onChange={(event) => void command({ command: "area", area: event.target.value })}
            >
              {areas.map((area) => (
                <option key={area} value={area}>
                  {areaLabels[area]}
                </option>
              ))}
            </select>
          </label>
          {summary ? (
            <div className="project-summary">
              <span>
                {tasks.filter((t) => t.owner_id === userId && t.status !== "completed").length}{" "}
                tasks assigned to you
              </span>
              <span>
                {tasks.filter((t) => mayReviewTask(t, userId, roles)).length} awaiting your
                independent review
              </span>
              <Link href="/dashboard/start">Onboarding & contribution paths</Link>
              {roles.includes("technical_admin") && (
                <Link href="/admin/contributors">Manage contributor invitations</Link>
              )}
            </div>
          ) : (
            <div className="project-filters">
              <label>
                Search tasks
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Task name or ID"
                />
              </label>
              <label>
                Contribution area
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="all">All areas</option>
                  {areas.map((area) => (
                    <option key={area} value={area}>
                      {areaLabels[area]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Task status
                <select value={stage} onChange={(e) => setStage(e.target.value)}>
                  <option value="all">All statuses</option>
                  {Object.entries(statuses).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="project-mine">
                <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
                My tasks only
              </label>
            </div>
          )}
          <p role="status">{notice}</p>
          <div className="project-task-list">
            {displayed.map((task) => (
              <article className="project-task" key={task.id}>
                <div className="project-task-top">
                  <span>
                    {task.id} · {areaLabels[task.track]}
                  </span>
                  <span className="project-status">{statuses[task.status]}</span>
                </div>
                <h3>{task.title}</h3>
                <p>{task.scope}</p>
                <p className="project-owner">
                  Owner: {task.owner_name ?? "Unassigned"}
                  {task.reviewer_name && ` · Reviewer: ${task.reviewer_name}`}
                </p>
                {summary ? (
                  <Link href={"/dashboard/tasks?area=" + focus}>View task details</Link>
                ) : (
                  <>
                    <details>
                      <summary>Acceptance criteria & dependencies</summary>
                      <p>{task.acceptance}</p>
                      <p>Preparation: {task.guidance}</p>
                      {blocked(task).length > 0 && (
                        <p>Required completed tasks: {blocked(task).join(", ")}</p>
                      )}
                      <a
                        href={`https://github.com/AbdiazizNor114/QaamuusAi/blob/master/docs/contributors/starter-tasks.md#${task.id.toLowerCase()}`}
                      >
                        Full task brief on GitHub
                      </a>
                    </details>
                    {task.evidence_url && (
                      <a href={task.evidence_url} target="_blank" rel="noopener noreferrer">
                        Open submitted evidence
                      </a>
                    )}
                    {task.note && <p className="project-feedback">Latest note: {task.note}</p>}
                    {task.status === "open" && (
                      <button
                        className="primary"
                        disabled={busy || blocked(task).length > 0}
                        onClick={() =>
                          void command({
                            command: "task",
                            task_id: task.id,
                            expected_version: task.version,
                            action: "claim",
                          })
                        }
                      >
                        {blocked(task).length ? "Waiting for dependencies" : "Claim task"}
                      </button>
                    )}
                    {task.owner_id === userId && task.status === "claimed" && (
                      <button
                        disabled={busy}
                        className="primary"
                        onClick={() =>
                          void command({
                            command: "task",
                            task_id: task.id,
                            expected_version: task.version,
                            action: "start",
                          })
                        }
                      >
                        Start work
                      </button>
                    )}
                    {task.owner_id === userId &&
                      ["claimed", "in_progress"].includes(task.status) && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            void command({
                              command: "task",
                              task_id: task.id,
                              expected_version: task.version,
                              action: "release",
                            })
                          }
                        >
                          Release task
                        </button>
                      )}
                    {((task.owner_id === userId && task.status === "in_progress") ||
                      mayReviewTask(task, userId, roles)) && (
                      <form
                        className="project-handoff"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fields = new FormData(e.currentTarget);
                          void command({
                            command: "task",
                            task_id: task.id,
                            expected_version: task.version,
                            action: fields.get("action") || "submit",
                            evidence: fields.get("evidence") || "",
                            explanation: fields.get("explanation"),
                          });
                        }}
                      >
                        {task.owner_id === userId ? (
                          <label>
                            Evidence link
                            <input
                              type="url"
                              name="evidence"
                              required
                              maxLength={2000}
                              placeholder="https://github.com/…"
                            />
                          </label>
                        ) : (
                          <label>
                            Review decision
                            <select name="action">
                              <option value="request_changes">Request changes</option>
                              <option value="complete">Approve completed work</option>
                            </select>
                          </label>
                        )}
                        <label>
                          {task.owner_id === userId ? "Handoff summary" : "Independent review note"}
                          <textarea name="explanation" required maxLength={2000} />
                        </label>
                        <button className="primary" disabled={busy}>
                          {task.owner_id === userId ? "Submit for review" : "Save review"}
                        </button>
                      </form>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>
          {!displayed.length && (
            <div className="project-notice">
              <p>
                {summary
                  ? "No open tasks in this area right now. Explore the full board for other work."
                  : "No tasks match these filters."}
              </p>
              {!summary && (
                <button
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                    setStage("all");
                    setMine(false);
                  }}
                >
                  Clear task filters
                </button>
              )}
            </div>
          )}
          <p className="project-disclaimer">
            Task review coordinates project work. It does not grant editorial authority, approve
            participant consent or authorize real audio collection. Language tasks require an
            independent reviewer/editor; other tasks require an independent technical administrator.
          </p>
        </>
      )}
    </section>
  );
}
