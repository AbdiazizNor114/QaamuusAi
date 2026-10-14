"use client";
import NextLink from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  RefreshCw,
  LogOut,
  BookOpen,
  LayoutDashboard,
  UserRound,
  ListChecks,
  MessageSquare,
  Search,
  GraduationCap,
  NotebookPen,
  Package,
  Users,
} from "lucide-react";
import { categories, proposalSchema, type Status } from "@qaamuusai/schemas";
import {
  emptySharedState,
  sharedStateSchema,
  type SharedState,
  type SharedRecord,
} from "@/lib/shared";
import { translate, LocaleContext } from "@/lib/locale";
import { readableError } from "@/lib/errors";
import { SharedCommunityPanel } from "./shared-community-panel";
import { PasswordForm } from "./password-form";
import { emptySharedCommunity, sharedCommunitySchema } from "@/lib/shared-community";

async function api(path: string, body?: unknown, method = "POST") {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : method,
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed. Please try again.");
  return data;
}
function Link(props: React.ComponentProps<typeof NextLink>) {
  const pathname = usePathname();
  const href =
    typeof props.href === "string" &&
    pathname.startsWith("/shared") &&
    props.href.startsWith("/") &&
    !props.href.startsWith("/demo") &&
    !props.href.startsWith("/api") &&
    props.href !== "/about"
      ? `/shared${props.href}`
      : props.href;
  return <NextLink {...props} href={href} />;
}
export function SharedWorkspace({ page }: { page: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<SharedState>(emptySharedState);
  const initialized = useRef(false);
  const [community, setCommunity] = useState(emptySharedCommunity);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [language, setLanguage] = useState<"en" | "so">("en");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<SharedRecord | null>(null);
  const [correction, setCorrection] = useState(false);
  const [form, setForm] = useState(false);
  const [recoverPassword, setRecoverPassword] = useState(false);
  const tr = (text: string) => translate(text, language);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const workspace = sharedStateSchema.parse(await api("/api/workspace"));
      const loadedCommunity = sharedCommunitySchema.parse(await api("/api/community"));
      setState(workspace);
      setCommunity(loadedCommunity);
    } catch (error) {
      setState(emptySharedState);
      setCommunity(emptySharedCommunity);
      setSelected(null);
      setNotice(readableError(error));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    queueMicrotask(async () => {
      if (initialized.current) return;
      initialized.current = true;
      try {
        setLanguage(localStorage.getItem("qaamuusAi.language") === "so" ? "so" : "en");
      } catch {}
      const hash = new URLSearchParams(window.location.hash.slice(1));
      if (hash.has("access_token") || hash.has("refresh_token") || hash.has("error")) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        if (
          hash.get("type") === "recovery" &&
          hash.get("access_token") &&
          hash.get("refresh_token")
        ) {
          try {
            await api("/api/auth/recovery", {
              access_token: hash.get("access_token"),
              refresh_token: hash.get("refresh_token"),
            });
            await load();
            router.replace("/reset-password");
            router.refresh();
            return;
          } catch {
            setNotice("Reset link is invalid or expired. Request a new link.");
          }
        } else setNotice("Reset link is invalid or expired. Request a new link.");
      }
      await load();
      if (new URLSearchParams(window.location.search).get("error") === "callback")
        setNotice("Sign-in link is invalid or expired. Request a new link in this browser.");
    });
  }, [load, router]);
  useEffect(() => {
    const refresh = () => {
      void load();
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [load]);
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem("qaamuusAi.language", language);
    } catch {}
  }, [language]);
  async function mutate(path: string, body: unknown, method = "POST") {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      await api(path, body, method);
      setNotice("Saved to shared workspace.");
      await load();
      return true;
    } catch (error) {
      setNotice(readableError(error));
      return false;
    } finally {
      setBusy(false);
    }
  }
  const nav = [
    { href: "datasets", label: "Datasets", Icon: BookOpen },
    { href: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { href: "dashboard/profile", label: "Profile", Icon: UserRound },
    { href: "dashboard/submissions", label: "My submissions", Icon: ListChecks },
    { href: "dashboard/reviews", label: "Review queue", Icon: ListChecks },
    { href: "dashboard/disputes", label: "Disputes", Icon: MessageSquare },
    { href: "dashboard/scholars", label: "Scholar applications", Icon: GraduationCap },
    { href: "dashboard/articles", label: "Article proposals", Icon: NotebookPen },
    { href: "articles", label: "Articles", Icon: BookOpen },
    { href: "dashboard/releases", label: "Dataset releases", Icon: Package },
    { href: "admin/roles", label: "Role administration", Icon: Users },
  ];
  const isPublic = ["datasets", "articles", "dashboard/releases"].includes(page);
  const current = [...state.revisions, ...state.entries].find((row) => row.id === selected);
  const own = current?.author_id === state.user?.id;
  const editable =
    !!current && own && ["draft", "changes_requested"].includes(current.status ?? "");
  const editor = state.roles.includes("editor");
  const review =
    !!current &&
    !own &&
    (editor ||
      (state.roles.includes("reviewer") &&
        (current.assigned_reviewer_id === state.user?.id ||
          (!current.assigned_reviewer_id && current.status === "submitted"))));
  const decisions: Status[] = !current
    ? []
    : editable
      ? ["submitted"]
      : review
        ? current.status === "submitted"
          ? ["under_review"]
          : current.status === "under_review"
            ? ["approved", "changes_requested", "rejected", "disputed"]
            : current.status === "approved" && editor
              ? ["published"]
              : []
        : [];
  let records = isPublic ? state.entries : state.revisions;
  if (page === "dashboard/submissions")
    records = records.filter((row) => row.author_id === state.user?.id);
  if (page === "dashboard/reviews")
    records = records.filter(
      (row) =>
        row.author_id !== state.user?.id &&
        ["submitted", "under_review", "approved"].includes(row.status ?? ""),
    );
  if (page === "dashboard/disputes") records = records.filter((row) => row.status === "disputed");
  records = records.filter(
    (row) =>
      (category === "all" || row.category === category) &&
      `${row.term} ${row.translation} ${row.dialect}`.toLowerCase().includes(query.toLowerCase()),
  );
  function openDraft(row: SharedRecord | null, isCorrection = false) {
    setEditing(row);
    setCorrection(isCorrection);
    setForm(true);
    setSelected(null);
  }
  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const content = proposalSchema.parse(Object.fromEntries(new FormData(event.currentTarget)));
      const path = correction
        ? "/api/corrections"
        : editing
          ? "/api/submissions"
          : "/api/submissions";
      const body = correction
        ? { published_entry: editing?.id, content }
        : editing
          ? { revision: editing.id, content }
          : content;
      if (await mutate(path, body, editing && !correction ? "PATCH" : "POST")) {
        setForm(false);
        setEditing(null);
      }
    } catch (error) {
      setNotice(readableError(error));
    }
  }
  return (
    <LocaleContext.Provider value={language}>
      <div className="shared-shell">
        <header className="shared-header">
          <Link href="/datasets" className="brand">
            qaamuusAi
          </Link>
          <span className="status-pill">{tr("Shared workspace")}</span>
          <div className="shared-header-actions">
            <select
              aria-label={tr("Language")}
              value={language}
              onChange={(event) => setLanguage(event.target.value as "en" | "so")}
            >
              <option value="en">English</option>
              <option value="so">Soomaali</option>
            </select>
            {state.user ? (
              <button
                className="icon-button"
                title={tr("Sign out")}
                aria-label={tr("Sign out")}
                disabled={busy}
                onClick={async () => {
                  if (await mutate("/api/logout", {})) {
                    setSelected(null);
                    setForm(false);
                    router.replace(pathname.startsWith("/shared") ? "/shared/login" : "/login");
                    router.refresh();
                  }
                }}
              >
                <LogOut size={18} />
              </button>
            ) : (
              <Link href="/login">{tr("Sign in")}</Link>
            )}
          </div>
        </header>
        <div className="shared-layout">
          <nav className="shared-nav" aria-label={tr("Workspace navigation")}>
            {nav.map(({ href, label, Icon }) => (
              <Link
                href={`/${href}`}
                key={href}
                className={page === href ? "active" : ""}
                aria-current={page === href ? "page" : undefined}
              >
                <Icon size={18} />
                <span>{tr(label)}</span>
              </Link>
            ))}
            <Link href="/demo/dashboard">{tr("Demo workspace")}</Link>
          </nav>
          <main className="shared-main">
            <div role="status" aria-live="polite" className="shared-notice">
              {tr(notice)}
            </div>
            <div className="shared-title">
              <h1>
                {tr(
                  page === "reset-password"
                    ? "Reset password"
                    : page === "login"
                      ? recoverPassword
                        ? "Forgot password?"
                        : "Sign in"
                      : (nav.find((item) => item.href === page)?.label ?? "Shared workspace"),
                )}
              </h1>
              <button
                className="icon-button"
                title={tr("Refresh")}
                aria-label={tr("Refresh")}
                disabled={loading || busy}
                onClick={() => void load()}
              >
                <RefreshCw size={18} />
              </button>
            </div>
            {loading ? (
              <p aria-busy="true">{tr("Loading…")}</p>
            ) : page === "reset-password" ? (
              state.user ? (
                <PasswordForm email={state.user.email} onNotice={setNotice} />
              ) : (
                <p>{tr("Open the latest password-reset email link in this browser.")}</p>
              )
            ) : page === "login" ? (
              <>
                {state.user ? (
                  <p>
                    <Link href="/dashboard">{tr("Open workspace")}</Link>
                  </p>
                ) : recoverPassword ? (
                  <form
                    className="editor-form"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const form = event.currentTarget;
                      setBusy(true);
                      setNotice("");
                      try {
                        await api("/api/password/recover", {
                          email: new FormData(form).get("email"),
                        });
                        setNotice("If an account exists, check your email for a reset link.");
                      } catch (error) {
                        setNotice(readableError(error));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <label>
                      {tr("Email")}
                      <input name="email" type="email" autoComplete="email" required />
                    </label>
                    <div className="shared-actions">
                      <button className="primary" disabled={busy || !state.configured}>
                        {tr("Send reset link")}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setRecoverPassword(false);
                          setNotice("");
                        }}
                      >
                        {tr("Back to sign in")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form
                    className="editor-form"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const form = event.currentTarget;
                      setBusy(true);
                      try {
                        await api("/api/login", {
                          email: new FormData(form).get("email"),
                          password: new FormData(form).get("password"),
                        });
                        form.reset();
                        await load();
                        router.replace(
                          pathname.startsWith("/shared") ? "/shared/dashboard" : "/dashboard",
                        );
                        router.refresh();
                      } catch (error) {
                        setNotice(readableError(error));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <label>
                      {tr("Email")}
                      <input name="email" type="email" autoComplete="email" required />
                    </label>
                    <label>
                      {tr("Password")}
                      <input
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        maxLength={128}
                        required
                      />
                    </label>
                    <div className="shared-actions">
                      <button className="primary" disabled={busy || !state.configured}>
                        {tr("Sign in")}
                      </button>
                      <button
                        type="button"
                        className="shared-text-button"
                        disabled={busy}
                        onClick={() => {
                          setRecoverPassword(true);
                          setNotice("");
                        }}
                      >
                        {tr("Forgot password?")}
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : !state.configured ? (
              <p>{tr("Supabase is not configured.")}</p>
            ) : !isPublic && !state.user ? (
              <p>
                <Link href="/login">{tr("Sign in to open your workspace.")}</Link>
              </p>
            ) : page === "dashboard/profile" || (!isPublic && !state.profile) ? (
              <>
                <form
                  className="editor-form"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    await mutate("/api/profile", {
                      display_name: new FormData(event.currentTarget).get("display_name"),
                    });
                  }}
                >
                  <label>
                    {tr("Display name")}
                    <input
                      name="display_name"
                      defaultValue={state.profile?.display_name ?? ""}
                      maxLength={120}
                      autoComplete="nickname"
                      required
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    {tr("Save profile")}
                  </button>
                  <div className="permission-list">
                    {state.roles.map((role) => (
                      <span key={role}>{tr(role.replaceAll("_", " "))}</span>
                    ))}
                  </div>
                </form>
                {page === "dashboard/profile" && (
                  <PasswordForm email={state.user?.email} onNotice={setNotice} />
                )}
              </>
            ) : ![
                "datasets",
                "dashboard",
                "dashboard/submissions",
                "dashboard/reviews",
                "dashboard/disputes",
              ].includes(page) ? (
              <SharedCommunityPanel
                page={page}
                workspace={state}
                community={community}
                busy={busy}
                mutate={mutate}
                onNotice={setNotice}
              />
            ) : (
              <>
                {!isPublic && (
                  <div className="permission-list">
                    <span>{state.profile?.display_name}</span>
                    {state.roles.map((role) => (
                      <span key={role}>{tr(role.replaceAll("_", " "))}</span>
                    ))}
                  </div>
                )}
                {form ? (
                  <form className="editor-form" onSubmit={saveDraft}>
                    <h2>
                      {tr(
                        correction
                          ? "Propose correction"
                          : editing
                            ? "Edit draft"
                            : "New submission",
                      )}
                    </h2>
                    <label>
                      {tr("Category")}
                      <select name="category" defaultValue={editing?.category ?? "vocabulary"}>
                        {categories.map((item) => (
                          <option key={item} value={item}>
                            {tr(item)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {["term", "translation", "source", "dialect"].map((name) => (
                      <label key={name}>
                        {tr(name.charAt(0).toUpperCase() + name.slice(1))}
                        <input
                          name={name}
                          defaultValue={editing?.[name as "term"] ?? ""}
                          maxLength={10000}
                          required
                        />
                      </label>
                    ))}
                    <label>
                      {tr("Notes")}
                      <textarea
                        name="notes"
                        defaultValue={editing?.notes ?? ""}
                        maxLength={10000}
                      />
                    </label>
                    <label>
                      {tr("License")}
                      <select
                        name="license"
                        defaultValue={editing?.license ?? "Permission pending"}
                      >
                        <option value="Permission pending">{tr("Permission pending")}</option>
                        <option>CC0-1.0</option>
                        <option>CC-BY-4.0</option>
                      </select>
                    </label>
                    <div className="shared-actions">
                      <button className="primary" disabled={busy}>
                        {tr("Save draft")}
                      </button>
                      <button type="button" onClick={() => setForm(false)}>
                        {tr("Cancel")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="shared-toolbar">
                      <label className="shared-search">
                        <Search size={18} />
                        <input
                          aria-label={tr("Search entries")}
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder={tr("Search entries")}
                        />
                      </label>
                      <select
                        aria-label={tr("Category")}
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                      >
                        <option value="all">{tr("All categories")}</option>
                        {categories.map((item) => (
                          <option key={item} value={item}>
                            {tr(item)}
                          </option>
                        ))}
                      </select>
                      {isPublic ? (
                        <Link
                          href="/api/export"
                          prefetch={false}
                          download
                          className="shared-download"
                          title={tr("Download JSONL")}
                        >
                          <ArrowDownToLine size={18} />
                          <span>JSONL</span>
                        </Link>
                      ) : (
                        <button className="primary" onClick={() => openDraft(null)}>
                          {tr("New submission")}
                        </button>
                      )}
                    </div>
                    {!records.length ? (
                      <p className="empty">
                        {tr(isPublic ? "No published entries yet." : "No submissions found.")}
                      </p>
                    ) : (
                      <div className="shared-records">
                        {records.map((row) => (
                          <button
                            key={row.id}
                            className="shared-record"
                            onClick={() => setSelected(row.id)}
                          >
                            <strong>{row.term}</strong>
                            <span>{row.translation}</span>
                            <small>
                              {tr(row.status ?? "published")} · {row.dialect} · v{row.version}
                            </small>
                          </button>
                        ))}
                      </div>
                    )}
                    {current && (
                      <section className="record-band" aria-label={tr("Entry details")}>
                        <div className="shared-title">
                          <h2>{current.term}</h2>
                          <button onClick={() => setSelected(null)}>{tr("Close")}</button>
                        </div>
                        <p>{current.translation}</p>
                        <p>{current.notes}</p>
                        <dl>
                          <dt>{tr("Source")}</dt>
                          <dd>{current.source}</dd>
                          <dt>{tr("License")}</dt>
                          <dd>{current.license}</dd>
                          <dt>{tr("Dialect")}</dt>
                          <dd>{current.dialect}</dd>
                        </dl>
                        {editable && (
                          <button onClick={() => openDraft(current)}>{tr("Edit draft")}</button>
                        )}
                        {isPublic && state.user && state.profile && (
                          <button onClick={() => openDraft(current, true)}>
                            {tr("Propose correction")}
                          </button>
                        )}
                        {!!decisions.length && (
                          <form
                            className="editor-form"
                            onSubmit={async (event) => {
                              event.preventDefault();
                              const data = new FormData(event.currentTarget);
                              await mutate("/api/reviews", {
                                revision: current.id,
                                next_status: data.get("next_status"),
                                reason: data.get("reason"),
                              });
                            }}
                          >
                            <label>
                              {tr("Decision")}
                              <select name="next_status">
                                {decisions.map((status) => (
                                  <option key={status} value={status}>
                                    {tr(status.replaceAll("_", " "))}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              {tr("Rationale")}
                              <textarea name="reason" required maxLength={10000} />
                            </label>
                            <button className="primary" disabled={busy}>
                              {tr("Record decision")}
                            </button>
                          </form>
                        )}
                        {!isPublic &&
                          state.comments
                            .filter((item) => item.revision_id === current.id)
                            .map((comment) => (
                              <blockquote key={comment.id}>
                                <p>{comment.body}</p>
                                <small>
                                  {comment.author_id === state.user?.id
                                    ? state.profile?.display_name
                                    : tr("Reviewer")}{" "}
                                  ·{" "}
                                  {new Date(comment.created_at).toLocaleDateString(
                                    language === "so" ? "so-SO" : "en-GB",
                                  )}
                                </small>
                              </blockquote>
                            ))}
                        {!isPublic && (
                          <form
                            className="editor-form"
                            onSubmit={async (event) => {
                              event.preventDefault();
                              const target = event.currentTarget;
                              if (
                                await mutate("/api/comments", {
                                  revision_id: current.id,
                                  body: new FormData(target).get("body"),
                                })
                              )
                                target.reset();
                            }}
                          >
                            <label>
                              {tr("Comment")}
                              <textarea name="body" required maxLength={10000} />
                            </label>
                            <button disabled={busy}>{tr("Add comment")}</button>
                          </form>
                        )}
                        {state.disputes
                          .filter((item) => item.revision_id === current.id)
                          .map((dispute) => (
                            <section key={dispute.id}>
                              <h3>{tr("Dispute")}</h3>
                              <p>{dispute.position}</p>
                              {dispute.resolution ? (
                                <p>{dispute.resolution}</p>
                              ) : (
                                editor &&
                                !own && (
                                  <form
                                    className="editor-form"
                                    onSubmit={async (event) => {
                                      event.preventDefault();
                                      await mutate("/api/disputes", {
                                        dispute: dispute.id,
                                        explanation: new FormData(event.currentTarget).get(
                                          "explanation",
                                        ),
                                      });
                                    }}
                                  >
                                    <label>
                                      {tr("Resolution")}
                                      <textarea name="explanation" required maxLength={10000} />
                                    </label>
                                    <button disabled={busy}>{tr("Resolve dispute")}</button>
                                  </form>
                                )
                              )}
                            </section>
                          ))}
                      </section>
                    )}
                  </>
                )}
              </>
            )}
          </main>
        </div>
        <footer className="shared-footer">
          <Link href="/about">{tr("About")}</Link>
          <span>qaamuusAi</span>
        </footer>
      </div>
    </LocaleContext.Provider>
  );
}
