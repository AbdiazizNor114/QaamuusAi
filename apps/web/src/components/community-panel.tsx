"use client";
import { useState } from "react";
import { ArrowDownToLine, Check, FileText, Plus, Send, ShieldCheck, UserRound } from "lucide-react";
import { canExport, roles, type Role, type Status } from "@qaamuusai/schemas";
import { type Workspace } from "@/lib/demo";
import {
  applyScholar,
  addArticleEvidence,
  createRelease,
  decideScholar,
  grantRole,
  hasPermission,
  saveArticle,
  saveProfile,
  transitionArticle,
  type Article,
} from "@/lib/community";
import { useLocale, auditTitles } from "@/lib/locale";
import { readableError } from "@/lib/errors";

export function saveDownload(name: string, data: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([data], { type: `${type};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
type Props = {
  page: string;
  workspace: Workspace;
  onChange: (state: Workspace) => void;
  onNotice: (message: string) => void;
};
export function CommunityPanel({ page, workspace, onChange, onNotice }: Props) {
  const { tr } = useLocale();
  const state = workspace.community;
  const identity = workspace.role;
  const member = state.members.find((m) => m.id === identity)!;
  const [articleId, setArticleId] = useState<string | null>(null);
  const [articleForm, setArticleForm] = useState(false);
  const [original, setOriginal] = useState<Article | undefined>();
  const [reason, setReason] = useState("");
  const [releaseEntries, setReleaseEntries] = useState<string[]>(
    workspace.entries.filter(canExport).map((e) => e.id),
  );
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const article = state.articles.find((a) => a.id === articleId);
  const release = state.releases.find((r) => r.id === releaseId);
  const isEditor = hasPermission(state, identity, "editor");
  const isReviewer = hasPermission(state, identity, "reviewer");
  const run = (operation: () => typeof state, message = "Saved.") => {
    try {
      onChange({ ...workspace, community: operation() });
      onNotice(tr(message));
    } catch (e) {
      onNotice(tr(readableError(e)));
    }
  };
  const roleControl = (
    <div className="role-control">
      <UserRound size={17} />
      <label>
        {tr("Demo identity")}
        <select
          aria-label={tr("Demo role")}
          value={identity}
          onChange={(e) => {
            onChange({ ...workspace, role: e.target.value as Role });
            setArticleId(null);
          }}
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {tr(r.replaceAll("_", " "))}
            </option>
          ))}
        </select>
      </label>
      <span className="muted">
        {member.roles.map((r) => tr(r.replaceAll("_", " "))).join(" · ")}
      </span>
    </div>
  );
  const heading = (title: string, description: string) => (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{tr("COMMUNITY WORKSPACE")}</span>
        <h1>{tr(title)}</h1>
        <p>{tr(description)}</p>
      </div>
    </div>
  );
  return (
    <section className="community-panel">
      {page !== "articles" && roleControl}
      {page === "dashboard/profile" && (
        <>
          {heading("My profile", "Your contribution interests and community permissions.")}
          <form
            className="editor-form"
            key={identity}
            onSubmit={(e) => {
              e.preventDefault();
              const input = Object.fromEntries(new FormData(e.currentTarget));
              run(() => saveProfile(state, identity, input), "Profile saved.");
            }}
          >
            <Field label="Demo display name" name="name" value={member.name} />
            <Field
              label="Areas of expertise"
              name="expertise"
              value={member.expertise}
              required={false}
            />
            <label>
              {tr("Biography")}
              <textarea name="bio" defaultValue={member.bio} rows={4} maxLength={2000} />
            </label>
            <div className="permission-list">
              <ShieldCheck size={18} />
              <span>{member.roles.map((r) => tr(r.replaceAll("_", " "))).join(" · ")}</span>
              <span className="muted">
                {tr(member.onboarded ? "Profile complete" : "Profile incomplete")}
              </span>
            </div>
            <button className="button primary">
              <Check size={16} />
              {tr("Save profile")}
            </button>
          </form>
        </>
      )}
      {page === "dashboard/scholars" && (
        <>
          {heading(
            "Scholar applications",
            "Apply to review language contributions or assess pending applications.",
          )}
          <form
            className="editor-form"
            onSubmit={(e) => {
              e.preventDefault();
              const input = Object.fromEntries(new FormData(e.currentTarget));
              run(() => applyScholar(state, identity, input), "Application submitted.");
            }}
          >
            <Field label="Areas of expertise" name="expertise" />
            <label>
              {tr("Application rationale")}
              <textarea name="rationale" required rows={4} maxLength={10000} />
            </label>
            <button className="button primary">
              <Send size={16} />
              {tr("Submit application")}
            </button>
          </form>
          <h2>{tr(isEditor ? "Application queue" : "My applications")}</h2>
          {state.applications
            .filter((a) => isEditor || a.applicant === identity)
            .map((a) => (
              <section className="record-band" key={a.id}>
                <div className="section-heading">
                  <h3>{state.members.find((m) => m.id === a.applicant)?.name}</h3>
                  <span className={`badge ${a.status}`}>{tr(a.status)}</span>
                </div>
                <p>{a.expertise}</p>
                <p>{a.rationale}</p>
                {a.decision && <blockquote>{a.decision}</blockquote>}
                {isEditor && a.status === "pending" && a.applicant !== identity && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const data = new FormData(e.currentTarget);
                      run(
                        () =>
                          decideScholar(
                            state,
                            identity,
                            a.id,
                            data.get("decision") === "accepted",
                            String(data.get("reason")),
                          ),
                        "Application decision recorded.",
                      );
                    }}
                  >
                    <Field label="Decision rationale" name="reason" />
                    <div className="decision-actions">
                      <button
                        name="decision"
                        value="accepted"
                        className="button primary"
                        onClick={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget.form!;
                          if (form.reportValidity())
                            run(
                              () =>
                                decideScholar(
                                  state,
                                  identity,
                                  a.id,
                                  true,
                                  String(new FormData(form).get("reason")),
                                ),
                              "Application decision recorded.",
                            );
                        }}
                      >
                        <Check size={16} />
                        {tr("Accept and grant reviewer")}
                      </button>
                      <button
                        name="decision"
                        value="declined"
                        className="button"
                        onClick={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget.form!;
                          if (form.reportValidity())
                            run(
                              () =>
                                decideScholar(
                                  state,
                                  identity,
                                  a.id,
                                  false,
                                  String(new FormData(form).get("reason")),
                                ),
                              "Application decision recorded.",
                            );
                        }}
                      >
                        {tr("Decline")}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            ))}
          {!state.applications.some((a) => isEditor || a.applicant === identity) && (
            <p className="empty">{tr("No applications yet.")}</p>
          )}
        </>
      )}
      {page === "admin/roles" && (
        <>
          {heading(
            "Members and roles",
            "Record independent, reasoned changes to community permissions.",
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tr("Member")}</th>
                  <th>{tr("Roles")}</th>
                  <th>{tr("Profile")}</th>
                </tr>
              </thead>
              <tbody>
                {state.members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{m.roles.map((r) => tr(r.replaceAll("_", " "))).join(" · ")}</td>
                    <td>{tr(m.onboarded ? "Complete" : "Incomplete")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(isEditor || hasPermission(state, identity, "technical_admin")) && (
            <form
              className="editor-form"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                run(
                  () =>
                    grantRole(
                      state,
                      identity,
                      data.get("member") as Role,
                      data.get("role") as Role,
                      String(data.get("reason")),
                      data.get("operation") === "revoke",
                    ),
                  "Role change recorded.",
                );
              }}
            >
              <div className="form-grid">
                <label>
                  {tr("Member")}
                  <select name="member">
                    {state.members
                      .filter((m) => m.id !== identity)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  {tr("Role")}
                  <select name="role">
                    {roles
                      .filter((r) =>
                        isEditor
                          ? ["reviewer", "editor"].includes(r)
                          : ["contributor", "technical_admin"].includes(r),
                      )
                      .map((r) => (
                        <option key={r} value={r}>
                          {tr(r.replaceAll("_", " "))}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  {tr("Operation")}
                  <select name="operation">
                    <option value="grant">{tr("Grant")}</option>
                    <option value="revoke">{tr("Revoke")}</option>
                  </select>
                </label>
                <Field label="Decision rationale" name="reason" />
              </div>
              <button className="button primary">
                <ShieldCheck size={16} />
                {tr("Record role change")}
              </button>
            </form>
          )}
          <h2>{tr("Role audit history")}</h2>
          {state.audit
            .filter((e) => e.action.startsWith("role_"))
            .map((e) => (
              <div className="activity-row" key={e.id}>
                <ShieldCheck size={16} />
                <div>
                  <strong>
                    {tr(auditTitles[e.action] ?? e.action)} ·{" "}
                    {state.members.find((m) => m.id === e.target)?.name}
                  </strong>
                  <p>{e.rationale}</p>
                  <small>
                    {state.members.find((m) => m.id === e.actor)?.name} ·{" "}
                    {new Date(e.at).toLocaleString()}
                  </small>
                </div>
              </div>
            ))}
        </>
      )}
      {(page === "dashboard/articles" || page === "articles") && (
        <>
          {page !== "articles" &&
            heading("Article workspace", "Draft, review and publish sourced educational articles.")}
          {page === "dashboard/articles" &&
            hasPermission(state, identity, "contributor") &&
            !articleForm && (
              <button
                className="button primary"
                onClick={() => {
                  setOriginal(undefined);
                  setArticleForm(true);
                  setArticleId(null);
                }}
              >
                <Plus size={16} />
                {tr("New article")}
              </button>
            )}
          {articleForm && (
            <form
              className="editor-form"
              onSubmit={(e) => {
                e.preventDefault();
                const input = Object.fromEntries(new FormData(e.currentTarget));
                try {
                  onChange({
                    ...workspace,
                    community: saveArticle(state, identity, input, original),
                  });
                  setArticleForm(false);
                  onNotice(tr("Article draft saved."));
                } catch (error) {
                  onNotice(tr(readableError(error)));
                }
              }}
            >
              <Field label="Article title" name="title" value={original?.title} />
              <Field label="Summary" name="summary" value={original?.summary} />
              <label>
                {tr("Article body")}
                <textarea
                  name="body"
                  required
                  rows={10}
                  defaultValue={original?.body}
                  maxLength={10000}
                />
              </label>
              <Field label="Source / provenance" name="source" value={original?.source} />
              <label>
                {tr("Redistribution license")}
                <select name="license" defaultValue={original?.license ?? "Permission pending"}>
                  <option value="Permission pending">{tr("Permission pending")}</option>
                  <option>CC0-1.0</option>
                  <option>CC-BY-4.0</option>
                </select>
              </label>
              <div className="decision-actions">
                <button className="button primary">
                  <Check size={16} />
                  {tr("Save article draft")}
                </button>
                <button className="button" type="button" onClick={() => setArticleForm(false)}>
                  {tr("Cancel")}
                </button>
              </div>
            </form>
          )}
          <div className="article-list">
            {state.articles
              .filter((a) =>
                page === "articles"
                  ? a.status === "published"
                  : a.author === identity ||
                    isEditor ||
                    (isReviewer && !["draft", "changes_requested"].includes(a.status)),
              )
              .map((a) => (
                <button
                  className="article-row compact"
                  key={a.id}
                  onClick={() => {
                    setArticleId(a.id);
                    setReason("");
                  }}
                >
                  <FileText size={25} />
                  <div>
                    <h2>{a.title}</h2>
                    <p>{a.summary}</p>
                    <span className={`badge ${a.status}`}>{tr(a.status)}</span>{" "}
                    <span className="muted">
                      v{a.version} · {a.license}
                    </span>
                  </div>
                </button>
              ))}
          </div>
          {article && (
            <section className="article-detail record-band">
              <h2>{article.title}</h2>
              <p>{article.summary}</p>
              <div className="article-body">{article.body}</div>
              <dl>
                <dt>{tr("Source")}</dt>
                <dd>{article.source}</dd>
                <dt>{tr("License")}</dt>
                <dd>{article.license}</dd>
                <dt>{tr("Author")}</dt>
                <dd>{state.members.find((m) => m.id === article.author)?.name}</dd>
              </dl>
              {page === "dashboard/articles" && (
                <>
                  <label>
                    {tr("Decision rationale")}
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                  </label>
                  <div className="decision-actions">
                    {article.author === identity &&
                      ["draft", "changes_requested"].includes(article.status) && (
                        <>
                          <button
                            className="button"
                            onClick={() => {
                              setOriginal(article);
                              setArticleForm(true);
                            }}
                          >
                            {tr("Edit article")}
                          </button>
                          <button
                            className="button primary"
                            onClick={() =>
                              run(
                                () =>
                                  transitionArticle(
                                    state,
                                    identity,
                                    article.id,
                                    "submitted",
                                    reason,
                                  ),
                                "Article decision recorded.",
                              )
                            }
                          >
                            {tr("Submit for review")}
                          </button>
                        </>
                      )}
                    {article.author !== identity &&
                      (isEditor || isReviewer) &&
                      (article.status === "submitted"
                        ? ["under_review"]
                        : article.status === "under_review"
                          ? ["approved", "changes_requested", "rejected", "disputed"]
                          : article.status === "approved" && isEditor
                            ? ["published"]
                            : article.status === "disputed" && isEditor
                              ? ["under_review"]
                              : []
                      ).map((status) => (
                        <button
                          key={status}
                          className="button primary"
                          onClick={() =>
                            run(
                              () =>
                                transitionArticle(
                                  state,
                                  identity,
                                  article.id,
                                  status as Status,
                                  reason,
                                ),
                              "Article decision recorded.",
                            )
                          }
                        >
                          {tr(
                            (
                              {
                                under_review:
                                  article.status === "disputed"
                                    ? "Resolve and return to review"
                                    : "Begin review",
                                approved: "Approve",
                                changes_requested: "Request changes",
                                rejected: "Reject",
                                disputed: "Open dispute",
                                published: "Publish article",
                              } as Record<string, string>
                            )[status],
                          )}
                        </button>
                      ))}
                    {article.status === "published" &&
                      hasPermission(state, identity, "contributor") && (
                        <button
                          className="button"
                          onClick={() => {
                            setOriginal(article);
                            setArticleForm(true);
                          }}
                        >
                          {tr("Propose article correction")}
                        </button>
                      )}
                  </div>
                  {article.status === "disputed" && (
                    <form
                      className="record-band"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const data = new FormData(form);
                        run(
                          () =>
                            addArticleEvidence(
                              state,
                              identity,
                              article,
                              String(data.get("position")),
                              String(data.get("source")),
                            ),
                          "Position and evidence preserved.",
                        );
                      }}
                    >
                      <h3>{tr("Positions & evidence")}</h3>
                      <Field label="Your position" name="position" />
                      <Field label="Supporting source" name="source" />
                      <button className="button">
                        <Plus size={16} />
                        {tr("Add evidence")}
                      </button>
                    </form>
                  )}
                  <h3 className="history">{tr("Article history")}</h3>
                  {state.audit
                    .filter((e) => e.target === article.id)
                    .map((e) => (
                      <div className="activity-row" key={e.id}>
                        <div>
                          <strong>{tr(auditTitles[e.action] ?? e.action)}</strong>
                          <p>{e.rationale}</p>
                          <details>
                            <summary>{tr("Recorded version")}</summary>
                            <pre>{e.snapshot}</pre>
                          </details>
                        </div>
                      </div>
                    ))}
                </>
              )}
            </section>
          )}
        </>
      )}
      {page === "dashboard/releases" && (
        <>
          {heading(
            "Dataset releases",
            "Immutable snapshots of published entries and their licensing metadata.",
          )}
          {isEditor && (
            <form
              className="editor-form"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                run(
                  () =>
                    createRelease(
                      state,
                      identity,
                      workspace.entries.filter((entry) => releaseEntries.includes(entry.id)),
                      String(data.get("version")),
                      String(data.get("notes")),
                    ),
                  "Dataset release created.",
                );
              }}
            >
              <div className="form-grid">
                <Field label="Release version" name="version" placeholder="0.1.0" />
                <Field label="Release notes" name="notes" />
              </div>
              <fieldset>
                <legend>{tr("Published entries")}</legend>
                {workspace.entries.filter(canExport).map((entry) => (
                  <label className="check-row" key={entry.id}>
                    <input
                      type="checkbox"
                      checked={releaseEntries.includes(entry.id)}
                      onChange={(e) =>
                        setReleaseEntries(
                          e.target.checked
                            ? [...releaseEntries, entry.id]
                            : releaseEntries.filter((id) => id !== entry.id),
                        )
                      }
                    />
                    <span>
                      {entry.term} · {entry.translation} · v{entry.version}
                    </span>
                    <span className="muted">{entry.license}</span>
                  </label>
                ))}
              </fieldset>
              <button className="button primary">
                <Check size={16} />
                {tr("Create release")}
              </button>
            </form>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tr("Version")}</th>
                  <th>{tr("Entries")}</th>
                  <th>{tr("Created")}</th>
                  <th>{tr("Open")}</th>
                </tr>
              </thead>
              <tbody>
                {state.releases.map((r) => (
                  <tr key={r.id}>
                    <td>v{r.version}</td>
                    <td>{r.entries.length}</td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="button" onClick={() => setReleaseId(r.id)}>
                        {tr("View release")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!state.releases.length && <p className="empty">{tr("No releases yet.")}</p>}
          {release && (
            <section className="record-band">
              <h2>v{release.version}</h2>
              <p>{release.notes}</p>
              <div className="decision-actions">
                <button
                  className="button"
                  onClick={() =>
                    saveDownload(
                      `qaamuusai-v${release.version}.jsonl`,
                      release.entries.map((e) => JSON.stringify(e)).join("\n") + "\n",
                      "application/x-ndjson",
                    )
                  }
                >
                  <ArrowDownToLine size={16} />
                  {tr("Download JSONL")}
                </button>
                <button
                  className="button"
                  onClick={() =>
                    saveDownload(
                      `qaamuusai-v${release.version}-manifest.json`,
                      JSON.stringify({ ...release, entries: undefined }, null, 2),
                    )
                  }
                >
                  <ArrowDownToLine size={16} />
                  {tr("Download license manifest")}
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{tr("Entry")}</th>
                      <th>{tr("License")}</th>
                      <th>{tr("Attribution")}</th>
                      <th>{tr("Source")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {release.manifest.map((m) => (
                      <tr key={m.id}>
                        <td>
                          {
                            (
                              release.entries.find((e) => (e as { id: string }).id === m.id) as {
                                term: string;
                              }
                            ).term
                          }{" "}
                          · v{m.version}
                        </td>
                        <td>{m.license}</td>
                        <td>{m.attribution}</td>
                        <td>{m.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}
function Field({
  label,
  name,
  value,
  placeholder,
  required = true,
}: {
  label: string;
  name: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const { tr } = useLocale();
  return (
    <label>
      {tr(label)}
      <input
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        required={required}
        maxLength={name === "name" ? 120 : 2000}
      />
    </label>
  );
}
