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
  UserCheck,
  NotebookPen,
  Package,
  Users,
} from "lucide-react";
import { categories, proposalSchema, type Status } from "@qaamuusai/schemas";
import {
  emptySharedState,
  sharedStateSchema,
  reviewQueue,
  type SharedState,
  type SharedRecord,
} from "@/lib/shared";
import { translate, LocaleContext } from "@/lib/locale";
import { readableError } from "@/lib/errors";
import { workspaceCounts } from "@/lib/workspace-counts";
import { showWorkspaceLink } from "@/lib/navigation";
import { expiredSessionMessage } from "@/lib/session";
import { technologyTerms } from "@/lib/technology-terms";
import { readTerminology, terminologySeed, writeTerminology } from "@/lib/terminology";
import { TerminologyWorkspace } from "./terminology-workspace";
import { ProposalNotes } from "./proposal-notes";
import { SharedCommunityPanel } from "./shared-community-panel";
import { ContributorRequestForm, ContributorRequests } from "./contributor-requests";
import { PasswordForm } from "./password-form";
import { DashboardOverview } from "./dashboard-overview";
import { BrandLogo } from "./brand-logo";
import {
  emptySharedCommunity,
  sharedCommunitySchema,
  articleActionCount,
} from "@/lib/shared-community";

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
async function api(path: string, body?: unknown, method = "POST") {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : method,
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(data.error ?? "Request failed. Please try again.", response.status);
  return data;
}
function Link(props: React.ComponentProps<typeof NextLink>) {
  const pathname = usePathname();
  const href =
    typeof props.href === "string" &&
    pathname.startsWith("/shared") &&
    props.href.startsWith("/") &&
    !props.href.startsWith("/api") &&
    props.href !== "/about"
      ? `/shared${props.href}`
      : props.href;
  return <NextLink {...props} href={href} />;
}
export function SharedWorkspace({ page }: { page: string }) {
  const accessPage = ["join", "login", "reset-password"].includes(page);
  const descriptions: Record<string, string> = {
    dashboard: "Your contributions, reviews and next steps in one place.",
    "dashboard/submissions": "Create proposals, track their progress and respond to review.",
    "dashboard/terminology": "Help build a shared Somali vocabulary for technology.",
    "dashboard/reviews": "Give independent feedback on proposals waiting for review.",
    "dashboard/profile": "Manage your public name and account details.",
    "dashboard/disputes": "Follow open questions and the evidence behind each discussion.",
    "dashboard/scholars": "Apply to review language resources and share your expertise.",
    "dashboard/articles": "Write, revise and review articles for the community.",
    "dashboard/releases": "Explore published versions and their licensed resources.",
    "admin/contributors": "Review applicants’ backgrounds and invite new contributors.",
    "admin/roles": "Manage permissions with a clear record of every change.",
    login: "Welcome back. Sign in with the email address on your invitation.",
    "reset-password": "Choose a secure password for your contributor account.",
  };
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<SharedState>(emptySharedState);
  const initialized = useRef(false);
  const latestLoad = useRef(0);
  const mutationInFlight = useRef(false);
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
  const [technologySeed, setTechnologySeed] = useState<(typeof technologyTerms)[number] | null>(
    null,
  );
  const [recoverPassword, setRecoverPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const tr = (text: string) => translate(text, language);
  const reviewerName = (id: string) =>
    (id === state.user?.id ? state.profile?.display_name : undefined) ??
    community.members.find((member) => member.id === id)?.display_name ??
    tr("Reviewer");
  const requestedChanges =
    editing?.status === "changes_requested" && !correction
      ? state.reviewHistory
          .filter(
            (item) => item.revision_id === editing.id && item.decision === "changes_requested",
          )
          .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]
      : undefined;
  const terminologyDetails = editing ? readTerminology(editing.notes) : null;
  const load = useCallback(async (background = false) => {
    const sequence = ++latestLoad.current;
    if (!background) setLoading(true);
    try {
      const workspace = sharedStateSchema.parse(await api("/api/workspace"));
      const loadedCommunity = sharedCommunitySchema.parse(await api("/api/community"));
      if (sequence !== latestLoad.current) return false;
      setState(workspace);
      setCommunity(loadedCommunity);
      return true;
    } catch (error) {
      if (sequence !== latestLoad.current) return false;
      setState(
        error instanceof ApiError && error.status === 401
          ? { ...emptySharedState, configured: true }
          : emptySharedState,
      );
      setCommunity(emptySharedCommunity);
      setSelected(null);
      setNotice(readableError(error));
      return false;
    } finally {
      if (sequence === latestLoad.current) setLoading(false);
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
      if (!mutationInFlight.current) void load(true);
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
  useEffect(() => {
    if (page === "dashboard/terminology" && selected) {
      const details = document.getElementById("shared-entry-details");
      details?.scrollIntoView({ block: "start" });
      details?.focus({ preventScroll: true });
    }
  }, [page, selected]);
  async function mutate(path: string, body: unknown, method = "POST") {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusy(true);
    setNotice("");
    try {
      await api(path, body, method);
      setNotice("Saved to shared workspace.");
      if (!(await load()))
        setNotice(
          "Your change was saved, but the workspace could not refresh. Refresh before submitting again.",
        );
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        ++latestLoad.current;
        setState({ ...emptySharedState, configured: true });
        setCommunity(emptySharedCommunity);
        setSelected(null);
        setForm(false);
        setEditing(null);
        setNotice(expiredSessionMessage);
        return false;
      }
      setNotice(readableError(error));
      return false;
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  }
  const nav = [
    { href: "datasets", label: "Datasets", Icon: BookOpen },
    { href: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { href: "dashboard/profile", label: "Profile", Icon: UserRound },
    { href: "dashboard/submissions", label: "My submissions", Icon: ListChecks },
    { href: "dashboard/terminology", label: "Terminology", Icon: BookOpen },
    { href: "dashboard/reviews", label: "Review queue", Icon: ListChecks },
    { href: "dashboard/disputes", label: "Disputes", Icon: MessageSquare },
    { href: "dashboard/scholars", label: "Reviewer applications", Icon: UserCheck },
    { href: "dashboard/articles", label: "Article proposals", Icon: NotebookPen },
    { href: "articles", label: "Articles", Icon: BookOpen },
    { href: "dashboard/releases", label: "Dataset releases", Icon: Package },
    { href: "admin/contributors", label: "Contributor requests", Icon: UserCheck },
    { href: "admin/roles", label: "Role administration", Icon: Users },
  ];
  const isPublic = ["datasets", "articles", "dashboard/releases"].includes(page);
  const queuedReviews = reviewQueue(state);
  const articleCount = articleActionCount(state, community);
  const counts = workspaceCounts(state, community);
  const filtered = category !== "all" || query.trim().length > 0;
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
            : current.status === "approved" &&
                editor &&
                ["CC0-1.0", "CC-BY-4.0"].includes(current.license)
              ? ["published"]
              : []
        : [];
  let records = isPublic ? state.entries : state.revisions;
  if (page === "dashboard/submissions")
    records = records.filter((row) => row.author_id === state.user?.id);
  if (page === "dashboard/reviews") records = queuedReviews;
  if (page === "dashboard/disputes") records = records.filter((row) => row.status === "disputed");
  records = records.filter(
    (row) =>
      (category === "all" || row.category === category) &&
      `${row.term} ${row.translation} ${row.dialect}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  function openDraft(row: SharedRecord | null, isCorrection = false) {
    setTechnologySeed(row ? terminologySeed(row.notes) : null);
    setEditing(row);
    setCorrection(isCorrection);
    setForm(true);
    setSelected(null);
  }
  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const values = new FormData(event.currentTarget);
      const content = proposalSchema.parse({
        ...Object.fromEntries(values),
        ...(technologySeed ? { notes: writeTerminology(technologySeed, values) } : {}),
      });
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
      <div className={`shared-shell${accessPage ? ` access-shell access-${page}` : ""}`}>
        <a className="skip-link" href="#main-content">
          {tr("Skip to content")}
        </a>
        <header className="shared-header">
          <Link href="/" className="brand">
            <BrandLogo />
          </Link>
          <span className="status-pill">
            {tr(accessPage ? "Community access" : "Shared workspace")}
          </span>
          <div className="shared-header-actions">
            <Link className="header-browse" href="/datasets">
              {tr("Browse commons")}
            </Link>
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
          {!accessPage && (
            <nav className="shared-nav" aria-label={tr("Workspace navigation")}>
              <span className="shared-nav-heading">{tr("Shared workspace")}</span>
              {nav
                .filter((item) => showWorkspaceLink(item.href, state))
                .map(({ href, label, Icon }) => (
                  <Link
                    href={`/${href}`}
                    key={href}
                    className={page === href ? "active" : ""}
                    aria-current={page === href ? "page" : undefined}
                  >
                    <Icon size={18} />
                    <span>{tr(label)}</span>
                    {href === "dashboard/reviews" && queuedReviews.length > 0 && (
                      <span className="shared-nav-count">{queuedReviews.length}</span>
                    )}
                    {href === "dashboard/articles" && articleCount > 0 && (
                      <span className="shared-nav-count">{articleCount}</span>
                    )}
                    {href === "dashboard/disputes" && counts.disputes > 0 && (
                      <span className="shared-nav-count" title={tr("Open disputes")}>
                        {counts.disputes}
                      </span>
                    )}
                    {href === "dashboard/submissions" && counts.submissions > 0 && (
                      <span className="shared-nav-count" title={tr("Requested changes")}>
                        {counts.submissions}
                      </span>
                    )}
                    {href === "dashboard/scholars" && counts.scholars > 0 && (
                      <span className="shared-nav-count" title={tr("Pending applications")}>
                        {counts.scholars}
                      </span>
                    )}
                    {href === "datasets" && counts.datasets > 0 && (
                      <span
                        className="shared-nav-count inventory-count"
                        title={tr("Published entries")}
                      >
                        {counts.datasets}
                      </span>
                    )}
                  </Link>
                ))}
            </nav>
          )}
          <main
            id="main-content"
            tabIndex={-1}
            className={`shared-main${page === "dashboard" ? " dashboard-main" : ""}`}
          >
            {page !== "join" && notice && (
              <div role="status" aria-live="polite" className="shared-notice">
                {tr(
                  notice === "Supabase is not configured."
                    ? "Account services are temporarily unavailable. Please try again later."
                    : notice,
                )}
              </div>
            )}
            <div className={`shared-title${page === "join" ? " access-title-hidden" : ""}`}>
              <div className="shared-title-copy">
                <h1>
                  {tr(
                    page === "join"
                      ? "Become a contributor"
                      : page === "reset-password"
                        ? "Reset password"
                        : page === "login"
                          ? recoverPassword
                            ? "Forgot password?"
                            : "Sign in"
                          : (nav.find((item) => item.href === page)?.label ?? "Shared workspace"),
                  )}
                </h1>
                {descriptions[page] && (
                  <p className="workspace-description">{tr(descriptions[page])}</p>
                )}
              </div>
              {!accessPage && (
                <button
                  className="icon-button"
                  title={tr("Refresh")}
                  aria-label={tr("Refresh")}
                  disabled={loading || busy}
                  onClick={() => void load()}
                >
                  <RefreshCw size={18} />
                </button>
              )}
            </div>
            {loading ? (
              <p aria-busy="true">{tr("Loading…")}</p>
            ) : page === "join" ? (
              <ContributorRequestForm />
            ) : page === "reset-password" ? (
              state.user ? (
                <PasswordForm email={state.user.email} onNotice={setNotice} />
              ) : (
                <p>{tr("Open the latest password-reset email link in this browser.")}</p>
              )
            ) : page === "login" ? (
              <>
                <p className="account-invitation">
                  {tr("New contributor?")} <Link href="/join">{tr("Request to contribute")}</Link>
                </p>
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
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        maxLength={128}
                        required
                      />
                    </label>
                    <label className="password-visibility">
                      <input
                        type="checkbox"
                        checked={showPassword}
                        onChange={(event) => setShowPassword(event.target.checked)}
                      />
                      {tr("Show password")}
                    </label>
                    <div className="shared-actions">
                      <button className="primary" disabled={busy || !state.configured}>
                        {tr(busy ? "Signing in…" : "Sign in")}
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
              <section className="workspace-state">
                <BookOpen size={32} aria-hidden="true" />
                <h2>{tr("The workspace is temporarily unavailable")}</h2>
                <p>
                  {tr(
                    "Please try again later. You can still explore the public commons and apply to contribute.",
                  )}
                </p>
                <div className="shared-actions">
                  <Link href="/datasets">{tr("Explore datasets")}</Link>
                  <Link href="/join">{tr("Request to contribute")}</Link>
                </div>
              </section>
            ) : !isPublic && !state.user ? (
              <section className="workspace-state">
                <UserRound size={32} aria-hidden="true" />
                <h2>{tr("Your community workspace")}</h2>
                <p>
                  {tr(
                    "Sign in to manage your contributions, follow reviews and collaborate with the community.",
                  )}
                </p>
                <div className="shared-actions">
                  <Link href="/login">{tr("Sign in to open your workspace.")}</Link>
                  <Link href="/join">{tr("Request to contribute")}</Link>
                </div>
              </section>
            ) : page === "admin/contributors" ? (
              <ContributorRequests />
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
                "dashboard/terminology",
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
                {page === "dashboard" && !form && (
                  <DashboardOverview
                    state={state}
                    community={community}
                    onCreate={() => openDraft(null)}
                    onSelect={setSelected}
                  />
                )}
                {!isPublic && page !== "dashboard" && (
                  <div className="permission-list">
                    <span>{state.profile?.display_name}</span>
                    <span className="workspace-account-email">{state.user?.email}</span>
                    {state.roles.map((role) => (
                      <span key={role}>{tr(role.replaceAll("_", " "))}</span>
                    ))}
                  </div>
                )}
                {page === "dashboard/terminology" && (
                  <div hidden={form}>
                    <TerminologyWorkspace
                      state={state}
                      onPropose={(seed) => {
                        openDraft(null);
                        setTechnologySeed(seed);
                      }}
                      onEdit={(record) => openDraft(record)}
                      onSelect={setSelected}
                      onClaimAction={async (body) =>
                        !!(await mutate("/api/terminology/claims", body))
                      }
                    />
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
                    {technologySeed && (
                      <p>
                        Technology terminology: propose a Somali equivalent for{" "}
                        <strong>{technologySeed.english}</strong>. Another reviewer must review your
                        submission.
                      </p>
                    )}
                    {requestedChanges && (
                      <section
                        aria-label={tr("Requested changes")}
                        style={{ overflowWrap: "anywhere" }}
                      >
                        <h3>{tr("Requested changes")}</h3>
                        <blockquote>{requestedChanges.rationale}</blockquote>
                        <small>
                          {tr("Reviewer")}: {reviewerName(requestedChanges.reviewer_id)}
                          {" · "}
                          <time dateTime={requestedChanges.created_at}>
                            {new Date(requestedChanges.created_at).toLocaleString(
                              language === "so" ? "so-SO" : "en-GB",
                            )}
                          </time>
                        </small>
                      </section>
                    )}
                    <label>
                      {tr("Category")}
                      <select
                        name="category"
                        defaultValue={
                          editing?.category ?? (technologySeed ? "translation" : "vocabulary")
                        }
                      >
                        {categories.map((item) => (
                          <option key={item} value={item}>
                            {tr(item)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {["term", "translation", "source", "dialect"].map((name) => (
                      <label key={name}>
                        {technologySeed && name === "term"
                          ? "Somali equivalent"
                          : technologySeed && name === "translation"
                            ? "English term"
                            : tr(name.charAt(0).toUpperCase() + name.slice(1))}
                        <input
                          name={name}
                          readOnly={!!technologySeed && name === "translation"}
                          defaultValue={
                            editing?.[name as "term"] ??
                            (technologySeed
                              ? name === "translation"
                                ? technologySeed.english
                                : name === "source"
                                  ? `${technologySeed.source}; ${technologySeed.id}. Translation source and permission to be supplied.`
                                  : ""
                              : "")
                          }
                          maxLength={10000}
                          required
                        />
                      </label>
                    ))}
                    {technologySeed && (
                      <>
                        <label>
                          Definition
                          <textarea
                            aria-label="Definition"
                            name="definition"
                            required
                            maxLength={2000}
                            defaultValue={terminologyDetails?.definition ?? ""}
                          />
                        </label>
                        <label>
                          Example sentence
                          <textarea
                            aria-label="Example sentence"
                            name="example"
                            required
                            maxLength={2000}
                            defaultValue={terminologyDetails?.example ?? ""}
                          />
                        </label>
                        <label>
                          Alternative terms (optional)
                          <textarea
                            aria-label="Alternative terms (optional)"
                            name="alternatives"
                            maxLength={1000}
                            defaultValue={terminologyDetails?.alternatives ?? ""}
                          />
                        </label>
                        <label>
                          Permission evidence (optional)
                          <textarea
                            aria-label="Permission evidence (optional)"
                            name="permission_evidence"
                            maxLength={1000}
                            defaultValue={terminologyDetails?.permission_evidence ?? ""}
                          />
                        </label>
                      </>
                    )}
                    <label>
                      {tr("Notes")}
                      <textarea
                        name="notes"
                        defaultValue={terminologyDetails?.notes ?? editing?.notes ?? ""}
                        maxLength={technologySeed ? 2000 : 10000}
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
                    {page === "dashboard/submissions" && (
                      <p>
                        <Link href="/dashboard/terminology">
                          Technology terminology · {technologyTerms.length} starter terms
                        </Link>
                      </p>
                    )}
                    {!["dashboard", "dashboard/terminology"].includes(page) && (
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
                    )}
                    {!["dashboard", "dashboard/terminology"].includes(page) &&
                      (!records.length ? (
                        <section className="workspace-empty" aria-label={tr("Results")}>
                          {filtered ? (
                            <Search size={26} aria-hidden="true" />
                          ) : page === "dashboard/reviews" ? (
                            <ListChecks size={26} aria-hidden="true" />
                          ) : page === "dashboard/disputes" ? (
                            <MessageSquare size={26} aria-hidden="true" />
                          ) : (
                            <BookOpen size={26} aria-hidden="true" />
                          )}
                          <h2>
                            {tr(
                              filtered
                                ? "No matching entries."
                                : isPublic
                                  ? "No published entries yet."
                                  : page === "dashboard/reviews"
                                    ? "No reviews waiting."
                                    : page === "dashboard/disputes"
                                      ? "No open disputes."
                                      : "No submissions yet.",
                            )}
                          </h2>
                          {filtered && (
                            <button
                              onClick={() => {
                                setQuery("");
                                setCategory("all");
                              }}
                            >
                              {tr("Clear filters")}
                            </button>
                          )}
                          {!filtered && page === "dashboard/reviews" && (
                            <Link href="/dashboard/submissions">{tr("My submissions")}</Link>
                          )}
                        </section>
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
                                <span className={`work-status status-${row.status ?? "published"}`}>
                                  {tr((row.status ?? "published").replaceAll("_", " "))}
                                </span>
                                <span>
                                  {row.dialect} · v{row.version}
                                </span>
                              </small>
                            </button>
                          ))}
                        </div>
                      ))}
                    {current && (
                      <section
                        className="record-band"
                        id="shared-entry-details"
                        tabIndex={-1}
                        aria-label={tr("Entry details")}
                      >
                        <div className="shared-title">
                          <h2>{current.term}</h2>
                          <button onClick={() => setSelected(null)}>{tr("Close")}</button>
                        </div>
                        <p>{current.translation}</p>
                        <p>
                          <strong>
                            {tr("Current status")}:{" "}
                            {tr((current.status ?? "published").replaceAll("_", " "))}
                          </strong>
                        </p>
                        {!isPublic && current.license === "Permission pending" && (
                          <p role="note">
                            <strong>{tr("Publication blocked: permission pending.")}</strong>
                          </p>
                        )}
                        <ProposalNotes notes={current.notes} />
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
                            {editable ? (
                              <input type="hidden" name="next_status" value="submitted" />
                            ) : (
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
                            )}
                            <label>
                              {tr("Rationale")}
                              <textarea name="reason" required maxLength={10000} />
                            </label>
                            <button className="primary" disabled={busy}>
                              {tr(
                                editable
                                  ? current.status === "changes_requested"
                                    ? "Resubmit for review"
                                    : "Submit for review"
                                  : "Record decision",
                              )}
                            </button>
                          </form>
                        )}
                        {!isPublic && editor && current.status === "submitted" && (
                          <form
                            className="editor-form"
                            onSubmit={async (event) => {
                              event.preventDefault();
                              const values = new FormData(event.currentTarget);
                              await mutate("/api/reviews/assign", {
                                revision: current.id,
                                reviewer: values.get("reviewer"),
                                reason: values.get("reason"),
                              });
                            }}
                          >
                            <label>
                              {tr("Assign reviewer")}
                              <select
                                name="reviewer"
                                required
                                defaultValue={current.assigned_reviewer_id ?? ""}
                              >
                                <option value="">{tr("Select reviewer")}</option>
                                {community.members
                                  .filter(
                                    (member) =>
                                      member.id !== current.author_id &&
                                      member.roles.some(
                                        (role) => role === "reviewer" || role === "editor",
                                      ),
                                  )
                                  .map((member) => (
                                    <option key={member.id} value={member.id}>
                                      {member.display_name}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            <label>
                              {tr("Assignment rationale")}
                              <textarea name="reason" required maxLength={10000} />
                            </label>
                            <button disabled={busy}>{tr("Assign reviewer")}</button>
                          </form>
                        )}
                        {!isPublic &&
                          state.reviewHistory.some((item) => item.revision_id === current.id) && (
                            <section aria-label={tr("Review history")}>
                              <h3>{tr("Review history")}</h3>
                              {state.reviewHistory
                                .filter((item) => item.revision_id === current.id)
                                .map((item) => (
                                  <div key={item.id}>
                                    <strong>{tr(item.decision.replaceAll("_", " "))}</strong>
                                    <p>{item.rationale}</p>
                                    <small>
                                      {tr("Reviewer")}: {reviewerName(item.reviewer_id)} ·{" "}
                                      <time dateTime={item.created_at}>
                                        {new Date(item.created_at).toLocaleString(
                                          language === "so" ? "so-SO" : "en-GB",
                                        )}
                                      </time>
                                    </small>
                                  </div>
                                ))}
                            </section>
                          )}
                        {!isPublic &&
                          state.revisionHistory.some((item) => item.record_id === current.id) && (
                            <section aria-label={tr("Revision history")}>
                              <h3>{tr("Revision history")}</h3>
                              {state.revisionHistory
                                .filter((item) => item.record_id === current.id)
                                .map((item) => (
                                  <details key={item.id}>
                                    <summary>
                                      {item.details.after.term} ·{" "}
                                      {tr(
                                        item.details.after.status?.replaceAll("_", " ") ?? "draft",
                                      )}{" "}
                                      ·{" "}
                                      <time dateTime={item.created_at}>
                                        {new Date(item.created_at).toLocaleString(
                                          language === "so" ? "so-SO" : "en-GB",
                                        )}
                                      </time>
                                    </summary>
                                    <p>{item.details.after.translation}</p>
                                    <ProposalNotes notes={item.details.after.notes} />
                                    <dl>
                                      <dt>{tr("Source")}</dt>
                                      <dd>{item.details.after.source}</dd>
                                      <dt>{tr("License")}</dt>
                                      <dd>{item.details.after.license}</dd>
                                      <dt>{tr("Dialect")}</dt>
                                      <dd>{item.details.after.dialect}</dd>
                                    </dl>
                                  </details>
                                ))}
                            </section>
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
                              {state.evidence
                                .filter((item) => item.dispute_id === dispute.id)
                                .map((item) => (
                                  <div key={item.id}>
                                    <p>{item.position}</p>
                                    <p>
                                      {tr("Source")}: {item.source}
                                    </p>
                                  </div>
                                ))}
                              {!dispute.resolved_at && state.user && (
                                <form
                                  className="editor-form"
                                  onSubmit={async (event) => {
                                    event.preventDefault();
                                    const form = event.currentTarget;
                                    const values = new FormData(form);
                                    if (
                                      await mutate("/api/evidence", {
                                        dispute_id: dispute.id,
                                        position: values.get("position"),
                                        source: values.get("source"),
                                      })
                                    )
                                      form.reset();
                                  }}
                                >
                                  <label>
                                    {tr("Explanation")}
                                    <textarea name="position" required maxLength={10000} />
                                  </label>
                                  <label>
                                    {tr("Source")}
                                    <textarea name="source" required maxLength={2000} />
                                  </label>
                                  <button disabled={busy}>{tr("Add evidence")}</button>
                                </form>
                              )}
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
          <span>QaamuusAi · {tr("Somali language commons")}</span>
          <Link href="/join">{tr("Become a contributor")}</Link>
        </footer>
      </div>
    </LocaleContext.Provider>
  );
}
