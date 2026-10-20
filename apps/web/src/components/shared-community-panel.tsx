"use client";
import { useState, type FormEvent } from "react";
import NextLink from "next/link";
import { ArrowDownToLine, Plus, X } from "lucide-react";
import type { SharedState } from "@/lib/shared";
import { articleInput } from "@/lib/community";
import type { SharedCommunity, SharedArticle } from "@/lib/shared-community";
import { useLocale, auditTitles } from "@/lib/locale";
import { readableError } from "@/lib/errors";
import type { Role, Status } from "@qaamuusai/schemas";
type Props = {
  page: string;
  workspace: SharedState;
  community: SharedCommunity;
  busy: boolean;
  mutate: (path: string, body: unknown) => Promise<boolean | undefined>;
  onNotice: (message: string) => void;
};
export function SharedCommunityPanel({
  page,
  workspace,
  community,
  busy,
  mutate,
  onNotice,
}: Props) {
  const { tr } = useLocale();
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<SharedArticle | null>(null);
  const [form, setForm] = useState(false);
  const [correction, setCorrection] = useState(false);
  const [releaseEntries, setReleaseEntries] = useState<string[]>([]);
  const editor = workspace.roles.includes("editor");
  const admin = workspace.roles.includes("technical_admin");
  const author = workspace.user?.id;
  const name = (id: string) =>
    community.members.find((member) => member.id === id)?.display_name ??
    (id === author ? workspace.profile?.display_name : undefined) ??
    id;
  async function submit(
    event: FormEvent<HTMLFormElement>,
    command: string,
    body: (data: FormData) => unknown,
  ) {
    event.preventDefault();
    const target = event.currentTarget;
    try {
      if (await mutate(`/api/community/${command}`, body(new FormData(target)))) target.reset();
    } catch (error) {
      onNotice(readableError(error));
    }
  }
  const reason = (
    <label>
      {tr("Decision rationale")}
      <textarea name="reason" required maxLength={10000} />
    </label>
  );
  if (page === "dashboard/scholars")
    return (
      <section>
        {!community.applications.some(
          (application) => application.applicant_id === author && application.status === "pending",
        ) && (
          <form
            className="editor-form"
            onSubmit={(event) =>
              submit(event, "apply", (data) => ({
                expertise: data.get("expertise"),
                rationale: data.get("rationale"),
              }))
            }
          >
            <h2>{tr("Scholar application")}</h2>
            <label>
              {tr("Areas of expertise")}
              <textarea name="expertise" required maxLength={10000} />
            </label>
            <label>
              {tr("Application rationale")}
              <textarea name="rationale" required maxLength={10000} />
            </label>
            <button className="primary" disabled={busy}>
              {tr("Submit application")}
            </button>
          </form>
        )}
        {!community.applications.length && <p>{tr("No applications yet.")}</p>}
        {community.applications.map((application) => (
          <section className="record-band" key={application.id}>
            <h2>{name(application.applicant_id)}</h2>
            <p><span className={`work-status status-${application.status}`}>{tr(application.status)}</span></p>
            <p>{application.expertise}</p>
            <p>{application.rationale}</p>
            {application.decision && <blockquote>{application.decision}</blockquote>}
            {editor && application.applicant_id !== author && application.status === "pending" && (
              <form
                className="editor-form"
                onSubmit={(event) =>
                  submit(event, "decide", (data) => ({
                    application: application.id,
                    accept: data.get("accept") === "true",
                    reason: data.get("reason"),
                  }))
                }
              >
                <label>
                  {tr("Decision")}
                  <select name="accept">
                    <option value="false">{tr("Decline application")}</option>
                    <option value="true">{tr("Accept and grant reviewer")}</option>
                  </select>
                </label>
                {reason}
                <button className="primary" disabled={busy}>
                  {tr("Record decision")}
                </button>
              </form>
            )}
          </section>
        ))}
      </section>
    );
  if (page === "admin/roles" || page === "admin") {
    const allowed: Role[] = [
      ...(editor ? (["reviewer", "editor"] as Role[]) : []),
      ...(admin ? (["contributor", "technical_admin"] as Role[]) : []),
    ];
    const targets = community.members.filter((member) => member.id !== author);
    return (
      <section>
        <div className="permission-list">
          {workspace.roles.map((role) => (
            <span key={role}>{tr(role.replaceAll("_", " "))}</span>
          ))}
        </div>
        {!!allowed.length && !!targets.length && (
          <form
            className="editor-form"
            onSubmit={(event) =>
              submit(event, "role", (data) => ({
                member: data.get("member"),
                wanted: data.get("wanted"),
                remove: data.get("remove") === "true",
                reason: data.get("reason"),
              }))
            }
          >
            <h2>{tr("Role administration")}</h2>
            <label>
              {tr("Member")}
              <select name="member">
                {targets.map((member) => (
                  <option value={member.id} key={member.id}>
                    {member.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {tr("Permission")}
              <select name="wanted">
                {allowed.map((role) => (
                  <option value={role} key={role}>
                    {tr(role.replaceAll("_", " "))}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {tr("Action")}
              <select name="remove">
                <option value="false">{tr("Grant role")}</option>
                <option value="true">{tr("Revoke role")}</option>
              </select>
            </label>
            {reason}
            <label className="check-row">
              <input type="checkbox" required />
              {tr("Confirm this member permission change")}
            </label>
            <button className="primary" disabled={busy}>
              {tr("Save role change")}
            </button>
          </form>
        )}
        {!allowed.length && <p>{tr("Role administration requires appropriate authority.")}</p>}
        {community.members.map((member) => (
          <div className="record-band" key={member.id}>
            <h3>{member.display_name}</h3>
            <p>
              {member.roles.map((role) => tr(role.replaceAll("_", " "))).join(", ") ||
                tr("Contributor")}
            </p>
          </div>
        ))}
        <h2>{tr("Audit history")}</h2>
        {community.audit.map((event) => (
          <div className="record-band" key={event.id}>
            <strong>{tr(auditTitles[event.action] ?? event.action.replaceAll("_", " "))}</strong>
            <p>{name(event.actor_id ?? "")}</p>
            <p>{String(event.details.rationale ?? "")}</p>
            <small>{new Date(event.created_at).toLocaleString()}</small>
          </div>
        ))}
      </section>
    );
  }
  if (page === "dashboard/releases")
    return (
      <section>
        {editor && (
          <form
            className="editor-form"
            onSubmit={(event) =>
              submit(event, "release", (data) => ({
                release_version: data.get("version"),
                entries: releaseEntries,
                notes: data.get("notes"),
              }))
            }
          >
            <h2>{tr("New dataset release")}</h2>
            <label>
              {tr("Release version")}
              <input name="version" placeholder="0.1.0" pattern="[0-9]+\.[0-9]+\.[0-9]+" required />
            </label>
            <label>
              {tr("Release notes")}
              <textarea name="notes" required maxLength={10000} />
            </label>
            <fieldset>
              <legend>{tr("Published entries")}</legend>
              {workspace.entries.map((entry) => (
                <label className="check-row" key={entry.id}>
                  <input
                    type="checkbox"
                    checked={releaseEntries.includes(entry.id)}
                    onChange={(event) =>
                      setReleaseEntries((ids) =>
                        event.target.checked
                          ? [...ids, entry.id]
                          : ids.filter((id) => id !== entry.id),
                      )
                    }
                  />
                  <span>
                    {entry.term} · v{entry.version}
                  </span>
                  <span>{entry.license}</span>
                </label>
              ))}
            </fieldset>
            <button className="primary" disabled={busy || !releaseEntries.length}>
              {tr("Publish release")}
            </button>
          </form>
        )}
        {!community.releases.length && <p>{tr("No releases yet.")}</p>}
        {community.releases.map((release) => (
          <section className="record-band" key={release.id}>
            <h2>v{release.version}</h2>
            <p>{release.notes}</p>
            <p>
              {release.snapshot.length} {tr("entries")} ·{" "}
              {new Date(release.created_at).toLocaleDateString()}
            </p>
            <div className="shared-actions">
              <NextLink
                className="shared-download"
                href={`/api/releases/${release.id}`}
                prefetch={false}
                download
              >
                <ArrowDownToLine size={18} />
                {tr("Download JSONL")}
              </NextLink>
              <NextLink
                className="shared-download"
                href={`/api/releases/${release.id}?format=manifest`}
                prefetch={false}
                download
              >
                <ArrowDownToLine size={18} />
                {tr("License manifest")}
              </NextLink>
            </div>
          </section>
        ))}
      </section>
    );
  const publicArticles = page === "articles";
  const articles = publicArticles ? community.articles : community.articleRevisions;
  const current = articles.find((article) => article.id === selected);
  const own = current?.author_id === author;
  const editable =
    !!current && own && ["draft", "changes_requested"].includes(current.status ?? "");
  const reviewer =
    !!current &&
    !own &&
    (editor ||
      (workspace.roles.includes("reviewer") &&
        (current.assigned_reviewer_id === author ||
          (!current.assigned_reviewer_id && current.status === "submitted"))));
  const decisions: Status[] = !current
    ? []
    : editable
      ? ["submitted"]
      : !reviewer
        ? []
        : current.status === "submitted"
          ? ["under_review"]
          : current.status === "under_review"
            ? ["approved", "changes_requested", "rejected", "disputed"]
            : current.status === "approved" && editor && ["CC0-1.0", "CC-BY-4.0"].includes(current.license)
              ? ["published"]
              : current.status === "disputed" && editor
                ? ["under_review"]
                : [];
  const requestedChanges = editing?.status === "changes_requested" && !correction
    ? community.decisions.filter((item) => item.revision_id === editing.id && item.decision === "changes_requested")
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]
    : undefined;
  function open(article: SharedArticle | null, correct = false) {
    setEditing(article);
    setCorrection(correct);
    setForm(true);
    setSelected(null);
  }
  return (
    <section>
      {!publicArticles && !form && (
        <button className="primary" onClick={() => open(null)}>
          <Plus size={16} />
          {tr("New article")}
        </button>
      )}
      {form ? (
        <form
          className="editor-form"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              const content = articleInput.parse(
                Object.fromEntries(new FormData(event.currentTarget)),
              );
              if (
                await mutate("/api/community/article", {
                  content,
                  revision: correction ? null : (editing?.id ?? null),
                  original: correction ? editing?.id : null,
                })
              ) {
                setForm(false);
                setEditing(null);
              }
            } catch (error) {
              onNotice(readableError(error));
            }
          }}
        >
          <h2>
            {tr(correction ? "Propose correction" : editing ? "Edit article" : "New article")}
          </h2>
          {requestedChanges && (
            <section aria-label={tr("Requested changes")} style={{ overflowWrap: "anywhere" }}>
              <h3>{tr("Requested changes")}</h3>
              <blockquote>{requestedChanges.rationale}</blockquote>
              <small>{tr("Reviewer")}: {name(requestedChanges.reviewer_id)} ·{" "}
                <time dateTime={requestedChanges.created_at}>
                  {new Date(requestedChanges.created_at).toLocaleString()}
                </time>
              </small>
            </section>
          )}
          {["title", "summary", "source"].map((field) => (
            <label key={field}>
              {tr(
                field === "title"
                  ? "Article title"
                  : field === "summary"
                    ? "Summary"
                    : "Source / provenance",
              )}
              <input
                name={field}
                defaultValue={editing?.[field as "title"] ?? ""}
                required
                maxLength={10000}
              />
            </label>
          ))}
          <label>
            {tr("Article body")}
            <textarea name="body" defaultValue={editing?.body ?? ""} required maxLength={10000} />
          </label>
          <label>
            {tr("Redistribution license")}
            <select name="license" defaultValue={editing?.license ?? "Permission pending"}>
              <option value="Permission pending">{tr("Permission pending")}</option>
              <option>CC0-1.0</option>
              <option>CC-BY-4.0</option>
            </select>
          </label>
          <div className="shared-actions">
            <button className="primary" disabled={busy}>
              {tr("Save article draft")}
            </button>
            <button type="button" onClick={() => setForm(false)}>
              {tr("Cancel")}
            </button>
          </div>
        </form>
      ) : (
        <>
          {!articles.length && <p>{tr("No articles yet.")}</p>}
          <div className="shared-records">
            {articles.map((article) => (
              <button
                className="shared-record"
                key={article.id}
                onClick={() => setSelected(article.id)}
              >
                <strong>{article.title}</strong>
                <span>{article.summary}</span>
                <small>
                  <span className={`work-status status-${article.status ?? "published"}`}>{tr((article.status ?? "published").replaceAll("_", " "))}</span>
                  <span>v{article.version}</span>
                </small>
              </button>
            ))}
          </div>
          {current && (
            <section className="record-band">
              <div className="shared-title">
                <h2>{current.title}</h2>
                <button
                  className="icon-button"
                  title={tr("Close article")}
                  aria-label={tr("Close article")}
                  onClick={() => setSelected(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <p>{current.summary}</p>
              <p><strong>{tr("Current status")}: {tr((current.status ?? "published").replaceAll("_", " "))}</strong></p>
              {!publicArticles && current.license === "Permission pending" && (
                <p role="note"><strong>{tr("Publication blocked: permission pending.")}</strong></p>
              )}
              <div className="article-body">{current.body}</div>
              <p>
                {tr("Source")}: {current.source}
              </p>
              <p>
                {tr("License")}: {current.license}
              </p>
              <p>
                {tr("Author")}: {name(current.author_id)}
              </p>
              {editable && <button onClick={() => open(current)}>{tr("Edit article")}</button>}
              {publicArticles && workspace.user && workspace.profile && (
                <button onClick={() => open(current, true)}>{tr("Propose correction")}</button>
              )}
              {!!decisions.length && (
                <form
                  className="editor-form"
                  onSubmit={(event) =>
                    submit(event, "transition", (data) => ({
                      revision: current.id,
                      next_status: data.get("next_status"),
                      reason: data.get("reason"),
                    }))
                  }
                >
                  {editable ? <input type="hidden" name="next_status" value="submitted" /> : <label>
                    {tr("Decision")}
                    <select name="next_status">
                      {decisions.map((status) => (
                        <option value={status} key={status}>
                          {tr(status.replaceAll("_", " "))}
                        </option>
                      ))}
                    </select>
                  </label>}
                  {reason}
                  <button className="primary" disabled={busy}>
                    {tr(editable ? current.status === "changes_requested" ? "Resubmit for review" : "Submit for review" : "Record decision")}
                  </button>
                </form>
              )}
              {community.decisions.some((decision) => decision.revision_id === current.id) && <h3>{tr("Review history")}</h3>}
              {community.decisions
                .filter((decision) => decision.revision_id === current.id)
                .map((decision) => (
                  <blockquote key={decision.id}>
                    <strong>{tr(decision.decision)}</strong>
                    <p>{decision.rationale}</p>
                    <small>
                      {name(decision.reviewer_id)} ·{" "}
                      {new Date(decision.created_at).toLocaleString()}
                    </small>
                  </blockquote>
                ))}
            </section>
          )}
        </>
      )}
    </section>
  );
}
