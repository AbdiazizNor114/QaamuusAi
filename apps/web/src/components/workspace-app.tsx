"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  GitBranch,
  Globe,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  X,
  UserRound,
  GraduationCap,
  NotebookPen,
  Package,
  Users,
} from "lucide-react";
import {
  type Entry,
  type Role,
  type Status,
  canExport,
  categories,
  roles,
} from "@qaamuusai/schemas";
import {
  actors,
  advance,
  initialWorkspace,
  propose,
  revise,
  restoreWorkspace,
  addEvidence,
  type Workspace,
} from "@/lib/demo";
import { CommunityPanel } from "./community-panel";
import { addComment, assignReview, hasPermission } from "@/lib/community";
import { LocaleContext, translate, useLocale } from "@/lib/locale";
import { readableError } from "@/lib/errors";

const storageKey = "qaamuusAi.demo.v1";
function Link(props: React.ComponentProps<typeof NextLink>) {
  const pathname = usePathname();
  const href =
    typeof props.href === "string" &&
    props.href.startsWith("/") &&
    pathname.startsWith("/demo") &&
    !props.href.startsWith("/api/")
      ? `/demo${props.href}`
      : props.href;
  return <NextLink {...props} href={href} />;
}
const baseLabels: Record<string, string> = {
  vocabulary: "Vocabulary",
  translation: "Somali-English",
  grammar: "Grammar",
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  changes_requested: "Changes requested",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
  disputed: "Disputed",
  superseded: "Superseded",
  contributor: "Contributor",
  reviewer: "Reviewer",
  editor: "Editor",
  technical_admin: "Technical admin",
};
const dictionary = {
  en: {
    browse: "Explore datasets",
    articles: "Articles",
    contribute: "Contribute",
    workspace: "Workspace",
    search: "Search Somali words or English meanings",
    title: "Somali language commons",
    subtitle: "Words, knowledge, and the people who care for them.",
    datasets: "Datasets",
    about: "About the project",
  },
  so: {
    browse: "Eeg xogta",
    articles: "Maqaallo",
    contribute: "Ku biir",
    workspace: "Goobta shaqada",
    search: "Raadi erayo Soomaali ah ama macnahooda",
    title: "Aqoonta afka Soomaaliga",
    subtitle: "Erayo, aqoon, iyo dadka daryeela.",
    datasets: "Xog ururin",
    about: "Ku saabsan mashruuca",
  },
};
const seedArticles = [
  {
    title: "A shared foundation for Somali",
    category: "Project notes",
    description: "How community contributions become carefully reviewed language resources.",
    body: "qaamuusAi brings contributors and language specialists into a shared editorial process. A proposal begins as a draft, receives independent review, and is published only after approval. These project notes describe the prototype process; they are not scholarly articles.",
  },
  {
    title: "Provenance belongs beside every word",
    category: "Data practice",
    description: "Sources and permissions are part of the record, from the first draft onward.",
    body: "Record the source of an entry and the permission to redistribute it before publication. A source citation alone does not establish a license. Dialect and regional variation should be recorded when known, and uncertainty should stay visible. Demonstration entries in this prototype are authored examples, not extracted from third-party resources.",
  },
  {
    title: "Making room for linguistic variation",
    category: "Editorial practice",
    description: "Disagreement can be evidence of richness. Preserve the discussion.",
    body: "Reviewers should record distinct positions and supporting evidence. An editor coordinates the resolution without erasing disagreement. Multiple variants can be proposed and reviewed separately when justified. This is a provisional process for founding scholars to approve.",
  },
];

function download(entries: Entry[]) {
  const data =
    entries
      .filter(canExport)
      .map((e) => JSON.stringify(e))
      .join("\n") + "\n";
  const url = URL.createObjectURL(new Blob([data], { type: "application/x-ndjson;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "qaamuusai-demo-published.jsonl";
  a.click();
  URL.revokeObjectURL(url);
}
function Badge({ status }: { status: Status }) {
  const { tr } = useLocale();
  return <span className={`badge ${status}`}>{tr(baseLabels[status])}</span>;
}

export function WorkspaceApp({ page }: { page: string }) {
  const [workspace, setWorkspace] = useState<Workspace>(initialWorkspace);
  const [ready, setReady] = useState(false);
  const [language, setLanguage] = useState<"en" | "so">("en");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState(false);
  const [original, setOriginal] = useState<Entry | undefined>();
  const [rationale, setRationale] = useState("");
  const [notice, setNotice] = useState("");
  const [article, setArticle] = useState<number | null>(null);
  const [mobile, setMobile] = useState(false);
  const tr = (value: string) => translate(value, language);
  const labels = Object.fromEntries(
    Object.entries(baseLabels).map(([key, value]) => [key, tr(value)]),
  );
  const articles = seedArticles.map((a) => ({
    ...a,
    title: tr(a.title),
    description: tr(a.description),
    body: tr(a.body),
    category: tr(a.category),
  }));
  useEffect(() => {
    let saved: string | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      saved = raw;
      if (raw) {
        setWorkspace(restoreWorkspace(JSON.parse(raw)));
      }
      setLanguage(localStorage.getItem("qaamuusAi.language") === "so" ? "so" : "en");
    } catch {
      try {
        if (saved) localStorage.setItem(`${storageKey}.recovery`, saved);
      } catch {}
      setNotice(
        "Saved demo data could not be read. A recovery copy is retained when storage is available.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(workspace));
      } catch {
        setNotice("Browser storage is unavailable or full. Your latest changes are not saved.");
      }
    }
  }, [workspace, ready]);
  useEffect(() => {
    document.documentElement.lang = language;
    if (ready) {
      try {
        localStorage.setItem("qaamuusAi.language", language);
      } catch {}
    }
  }, [language, ready]);
  useEffect(() => {
    const receive = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) {
        try {
          setWorkspace(restoreWorkspace(JSON.parse(event.newValue)));
        } catch {}
      }
      if (event.key === "qaamuusAi.language") setLanguage(event.newValue === "so" ? "so" : "en");
    };
    window.addEventListener("storage", receive);
    return () => window.removeEventListener("storage", receive);
  }, []);
  const modalOpen = form || selected !== null || article !== null;
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button, a[href], input, select, textarea, summary",
        ) ?? [],
      ).filter((e) => !e.hasAttribute("disabled"));
    focusable()[0]?.focus();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setForm(false);
        setSelected(null);
        setArticle(null);
      }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [modalOpen, form, selected, article]);
  const t = dictionary[language];
  const isDashboard = page.startsWith("dashboard") || page.startsWith("admin");
  const published = workspace.entries.filter(canExport);
  const current = workspace.entries.find((e) => e.id === selected);
  const filtered = (
    page === "datasets" || page === ""
      ? published
      : workspace.entries.filter((e) =>
          page === "dashboard/reviews"
            ? ["submitted", "under_review", "approved"].includes(e.status)
            : page === "dashboard/disputes"
              ? e.status === "disputed" ||
                workspace.events.some((ev) => ev.entryId === e.id && ev.action === "disputed")
              : e.contributor === actors.contributor && e.status !== "published",
        )
  ).filter(
    (e) =>
      (category === "all" || e.category === category) &&
      (status === "all" || e.status === status) &&
      `${e.term} ${e.translation} ${e.notes}`.toLowerCase().includes(query.toLowerCase()),
  );
  const newProposal = (entry?: Entry) => {
    setOriginal(entry);
    setForm(true);
    setSelected(null);
  };
  function act(to: Status) {
    if (!current) return;
    try {
      setWorkspace(advance(workspace, current.id, to, rationale));
      setRationale("");
      setNotice(`${tr("Decision recorded")}: ${labels[to]}.`);
    } catch (e) {
      setNotice(readableError(e));
    }
  }
  function recordAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current) return;
    const data = new FormData(event.currentTarget);
    try {
      setWorkspace({
        ...workspace,
        community: assignReview(
          workspace.community,
          workspace.role,
          current,
          data.get("reviewer") as Role,
          String(data.get("reason")),
        ),
      });
      setNotice("Review assignment saved.");
    } catch (error) {
      setNotice(readableError(error));
    }
  }
  function recordComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current) return;
    const form = event.currentTarget;
    try {
      setWorkspace({
        ...workspace,
        community: addComment(
          workspace.community,
          workspace.role,
          current,
          String(new FormData(form).get("comment")),
        ),
      });
      form.reset();
      setNotice("Comment recorded.");
    } catch (error) {
      setNotice(readableError(error));
    }
  }
  const table = (entries: Entry[]) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{tr("Somali")}</th>
            <th>{tr("English / meaning")}</th>
            <th>{tr("Collection")}</th>
            <th>{tr("Status")}</th>
            <th>{tr("Version")}</th>
            <th>
              <span className="sr-only">{tr("Open")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={e.id}
              onClick={() => {
                setSelected(e.id);
                setRationale("");
              }}
            >
              <td>
                <button className="term" onClick={() => setSelected(e.id)}>
                  {e.term}
                </button>
              </td>
              <td>{e.translation}</td>
              <td>{labels[e.category]}</td>
              <td>
                <Badge status={e.status} />
              </td>
              <td className="muted">
                {tr("v")}
                {e.version}
                {tr(".0")}
              </td>
              <td>
                <ChevronRight size={16} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length === 0 && (
        <div className="empty">
          <Search size={28} />
          <h3>{tr("No entries found")}</h3>
          <p>{tr("Try another word or collection.")}</p>
        </div>
      )}
    </div>
  );
  const filters = (
    <div className="filters">
      <label className="search">
        <Search size={18} />
        <input
          aria-label={tr("Search entries")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
        />
      </label>
      <select
        aria-label={tr("Filter collection")}
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="all">{tr("All collections")}</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {labels[c]}
          </option>
        ))}
      </select>
      {isDashboard && (
        <select
          aria-label={tr("Filter status")}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">{tr("All statuses")}</option>
          {[
            "draft",
            "submitted",
            "under_review",
            "changes_requested",
            "approved",
            "disputed",
            "rejected",
          ].map((s) => (
            <option key={s} value={s}>
              {labels[s]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
  return (
    <LocaleContext.Provider value={language}>
      <header className="header" inert={modalOpen}>
        <Link href="/" className="brand">
          <span className="brand-icon">
            <BookOpen size={23} />
          </span>
          <span>
            qaamuus<span className="brand-ai">Ai</span>
          </span>
        </Link>
        <nav className={mobile ? "nav open" : "nav"}>
          <Link className={page === "datasets" || page === "" ? "active" : ""} href="/datasets">
            {t.datasets}
          </Link>
          <Link className={page === "articles" ? "active" : ""} href="/articles">
            {t.articles}
          </Link>
          <Link className={page === "contribute" ? "active" : ""} href="/contribute">
            {t.contribute}
          </Link>
          <Link href="/about">{tr("About")}</Link>
        </nav>
        <div className="header-actions">
          <button
            className="language"
            title={tr("Switch language")}
            onClick={() => setLanguage(language === "en" ? "so" : "en")}
          >
            <Globe size={16} />
            {language === "en" ? "EN" : "SO"}
          </button>
          <Link className="button small primary" href="/dashboard">
            {t.workspace}
            <ArrowRight size={15} />
          </Link>
          <button
            title={tr("Open navigation")}
            className="icon mobile-toggle"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>
      <div className="demo-bar">
        <span>
          <span className="demo-dot" />
          {tr("Demonstration workspace")}{" "}
          <span className="demo-detail">
            {tr("· Authored examples, not scholar-verified data")}
          </span>
        </span>
        <span className="demo-right">
          {tr("Local prototype")}
          <GitBranch size={13} />
        </span>
      </div>
      <div className={isDashboard ? "app-shell" : "public-shell"} inert={modalOpen}>
        {isDashboard && (
          <aside className="sidebar">
            <div className="sidebar-title">{tr("COMMUNITY WORKSPACE")}</div>
            {[
              ["dashboard", "Overview", LayoutDashboard],
              ["dashboard/submissions", "My submissions", FileText],
              ["dashboard/reviews", "Review queue", ListChecks],
              ["dashboard/disputes", "Disputes", MessageSquare],
              ["dashboard/profile", "My profile", UserRound],
              ["dashboard/scholars", "Scholar applications", GraduationCap],
              ["dashboard/articles", "Article workspace", NotebookPen],
              ["dashboard/releases", "Dataset releases", Package],
              ["admin/roles", "Members and roles", Users],
              ["admin", "Administration", Settings],
            ].map(([href, label, Icon]) => {
              const I = Icon as typeof Settings;
              return (
                <Link
                  key={href as string}
                  className={page === href ? "side-link active" : "side-link"}
                  href={`/${href}`}
                  title={tr(label as string)}
                  aria-label={tr(label as string)}
                >
                  <I size={18} />
                  {tr(label as string)}
                </Link>
              );
            })}
            <div className="sidebar-bottom">
              <ShieldCheck size={22} />
              <strong>{tr("Care before publication")}</strong>
              <p>{tr("Every decision keeps its author, rationale and history.")}</p>
              <Link href="/about">
                {tr("Our governance")}
                <ArrowRight size={14} />
              </Link>
            </div>
          </aside>
        )}
        <main data-ready={ready} inert={modalOpen}>
          {[
            "dashboard/profile",
            "dashboard/scholars",
            "dashboard/articles",
            "dashboard/releases",
            "admin/roles",
          ].includes(page) && (
            <CommunityPanel
              key={page}
              page={page}
              workspace={workspace}
              onChange={setWorkspace}
              onNotice={setNotice}
            />
          )}
          {(page === "" || page === "datasets") && (
            <>
              <section className="intro">
                <div className="eyebrow">
                  <span />
                  {tr("THE SOMALI LANGUAGE COMMONS")}
                </div>
                <h1>{page === "" ? t.title : tr("Dataset library")}</h1>
                <p>
                  {page === ""
                    ? t.subtitle
                    : "Explore the vocabulary, translations and grammar we build together."}
                </p>
                <div className="intro-actions">
                  <Link className="button primary" href="/contribute">
                    <Plus size={17} />
                    {tr("Contribute an entry")}
                  </Link>
                  <button className="button" onClick={() => download(published)}>
                    <ArrowDownToLine size={17} />
                    {tr("Export JSONL")}
                  </button>
                </div>
                <div className="intro-mark" aria-hidden="true">
                  <span>Af</span>
                  <div>SOOMAALI</div>
                  <BookOpen size={45} />
                </div>
              </section>
              <section className="collections">
                <div className="section-heading">
                  <h2>{tr("Explore the collections")}</h2>
                  <span className="muted">
                    {tr("3 collections ·")} {published.length} {tr("demo entries")}
                  </span>
                </div>
                <div className="collection-grid">
                  {categories.map((c, i) => (
                    <button
                      key={c}
                      className={`collection collection-${i} ${category === c ? "chosen" : ""}`}
                      onClick={() => setCategory(category === c ? "all" : c)}
                    >
                      <span className="collection-top">
                        <span className="collection-icon">
                          {i === 0 ? (
                            <BookOpen size={24} />
                          ) : i === 1 ? (
                            <Globe size={24} />
                          ) : (
                            <GitBranch size={24} />
                          )}
                        </span>
                        <ArrowRight size={19} />
                      </span>
                      <h3>{labels[c]}</h3>
                      <p>
                        {tr(
                          [
                            "Words and the meanings they carry.",
                            "Connections between two languages.",
                            "Patterns that bring language to life.",
                          ][i],
                        )}
                      </p>
                      <span className="collection-meta">
                        {published.filter((e) => e.category === c).length} {tr("entries")}{" "}
                        <span>{tr("DEMO v0.1")}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="entry-section">
                <div className="section-heading">
                  <h2>{tr("Published entries")}</h2>
                  <span className="muted">{tr("CC0 demonstration release")}</span>
                </div>
                {filters}
                {table(filtered)}
                <div className="table-foot">
                  <span>
                    {filtered.length} {tr("entries")}
                  </span>
                  <span>{tr("Provenance and licensing included in every export")}</span>
                </div>
              </section>
              <section className="contribution-band">
                <div>
                  <div className="eyebrow">{tr("BUILT TOGETHER")}</div>
                  <h2>{tr("A living language deserves a shared foundation.")}</h2>
                  <p>{tr("Bring a word, a source, or a careful correction.")}</p>
                </div>
                <Link className="button primary" href="/contribute">
                  {tr("Join the work")}
                  <ArrowRight size={17} />
                </Link>
              </section>
            </>
          )}
          {page === "dashboard" && (
            <>
              <PageHeading
                eyebrow={tr("YOUR WORKSPACE")}
                title={tr("Good work starts with one word.")}
                description={tr("Keep your contributions moving and the conversation open.")}
                action={
                  <button className="button primary" onClick={() => newProposal()}>
                    <Plus size={17} />
                    {tr("New contribution")}
                  </button>
                }
              />
              <RoleControl
                workspace={workspace}
                onChange={(role) => setWorkspace({ ...workspace, role })}
              />
              <div className="stats">
                {[
                  [
                    "Your proposals",
                    workspace.entries.filter(
                      (e) => e.contributor === actors.contributor && e.status !== "published",
                    ).length,
                  ],
                  [
                    "Awaiting review",
                    workspace.entries.filter(
                      (e) => e.status === "submitted" || e.status === "under_review",
                    ).length,
                  ],
                  [
                    "Open disputes",
                    workspace.entries.filter((e) => e.status === "disputed").length,
                  ],
                  ["Published entries", published.length],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{tr(String(label))}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="section-heading">
                <h2>{tr("Recent contributions")}</h2>
                <Link href="/dashboard/submissions">
                  {tr("View all")}
                  <ArrowRight size={15} />
                </Link>
              </div>
              {table(workspace.entries.filter((e) => e.status !== "published").slice(0, 6))}
              <section className="activity">
                <h2>{tr("Activity log")}</h2>
                {workspace.events.length ? (
                  workspace.events
                    .slice(-5)
                    .reverse()
                    .map((e) => (
                      <div className="activity-row" key={e.id}>
                        <Check size={16} />
                        <div>
                          <strong>{labels[e.action] ?? e.action}</strong>
                          <p>
                            {e.actor}
                            {tr("·")}
                            {e.rationale}
                          </p>
                        </div>
                        <time>{new Date(e.at).toLocaleDateString("en-GB")}</time>
                      </div>
                    ))
                ) : (
                  <p className="muted">{tr("Your recorded decisions will appear here.")}</p>
                )}
              </section>
            </>
          )}
          {page === "dashboard/submissions" && (
            <>
              <PageHeading
                eyebrow={tr("CONTRIBUTIONS")}
                title={tr("My submissions")}
                description={tr(
                  "Your drafts, proposals and corrections, with every revision preserved.",
                )}
                action={
                  <button className="button primary" onClick={() => newProposal()}>
                    <Plus size={17} />
                    {tr("New contribution")}
                  </button>
                }
              />
              <RoleControl
                workspace={workspace}
                onChange={(role) => setWorkspace({ ...workspace, role })}
              />
              {filters}
              {table(filtered)}
            </>
          )}
          {page === "dashboard/reviews" && (
            <>
              <PageHeading
                eyebrow={tr("EDITORIAL WORKSPACE")}
                title={tr("Review queue")}
                description={tr(
                  "Independent review gives every contribution a stronger foundation.",
                )}
              />
              <RoleControl
                workspace={workspace}
                onChange={(role) => setWorkspace({ ...workspace, role })}
              />
              {filters}
              {table(filtered)}
            </>
          )}
          {page === "dashboard/disputes" && (
            <>
              <PageHeading
                eyebrow={tr("EDITORIAL WORKSPACE")}
                title={tr("Linguistic disputes")}
                description={tr(
                  "Record positions, examine evidence and preserve accepted variation.",
                )}
              />
              <RoleControl
                workspace={workspace}
                onChange={(role) => setWorkspace({ ...workspace, role })}
              />
              {table(filtered)}
            </>
          )}
          {page === "articles" && (
            <>
              <PageHeading
                eyebrow={tr("READ & REFLECT")}
                title={tr("From the commons")}
                description={tr(
                  "Project notes on language, contribution and the care behind our datasets.",
                )}
              />
              <CommunityPanel
                page="articles"
                workspace={workspace}
                onChange={setWorkspace}
                onNotice={setNotice}
              />
              <div className="article-list">
                {articles.map((a, i) => (
                  <button key={a.title} onClick={() => setArticle(i)} className="article-row">
                    <div className={`article-art art-${i}`}>
                      <span>{["Aa", "{}", "SO / EN"][i]}</span>
                      <BookOpen size={35} />
                    </div>
                    <div>
                      <span className="eyebrow">{a.category}</span>
                      <h2>{a.title}</h2>
                      <p>{a.description}</p>
                      <span className="muted">{tr("qaamuusAi · Project note · 3 min read")}</span>
                    </div>
                    <ArrowRight size={22} />
                  </button>
                ))}
              </div>
            </>
          )}
          {page === "about" && (
            <>
              <PageHeading
                eyebrow={tr("ABOUT QAAMUUSAI")}
                title={tr("Language is shared. So is this work.")}
                description={tr(
                  "An open foundation for Somali language resources, built with community knowledge and independent linguistic review.",
                )}
              />
              <div className="prose">
                <h2>{tr("Our mission")}</h2>
                <p>
                  {tr(
                    "Help scholars, linguists, educators and contributors create, review and publish high-quality Somali language datasets. These resources can support translation, language learning, developer libraries and future research.",
                  )}
                </p>
                <h2>{tr("Authority follows the work")}</h2>
                <p>
                  {tr(
                    "Contributors propose. Reviewers examine. Editors coordinate publication and disputes. Technical administrators operate the platform. Technical access does not confer linguistic authority.",
                  )}
                </p>
                <h2>{tr("Sources, variation and permissions")}</h2>
                <p>
                  {tr(
                    "Every entry carries provenance, licensing and version metadata. Corrections create revisions. Published versions stay intact. Disagreements and evidence remain part of the record.",
                  )}
                </p>
                <h2>{tr("A provisional beginning")}</h2>
                <p>
                  {tr(
                    "The governance process awaits approval by founding scholars. All data shown in this local prototype is clearly marked demonstration material. No AI training, external accounts or public deployment are included.",
                  )}
                </p>
                <Link className="button primary" href="/contribute">
                  {tr("Contribute to the commons")}
                  <ArrowRight size={17} />
                </Link>
              </div>
            </>
          )}
          {page === "contribute" && (
            <>
              <PageHeading
                eyebrow={tr("MAKE A CONTRIBUTION")}
                title={tr("Your knowledge has a place here.")}
                description={tr(
                  "Start with a word, a translation, a grammar note or a sourced correction.",
                )}
              />
              <div className="contribute-layout">
                <div className="prose">
                  <h2>{tr("A careful path to publication")}</h2>
                  <ol className="steps">
                    {[
                      [
                        "Create a draft",
                        "Add the proposed entry, source, license and any known variation.",
                      ],
                      [
                        "Submit for independent review",
                        "A reviewer records feedback and a reason for every decision.",
                      ],
                      [
                        "Refine together",
                        "Respond to requests for changes. Disagreements follow an editor-led process.",
                      ],
                      [
                        "Publish a version",
                        "Approved, redistributable entries become part of a versioned dataset.",
                      ],
                    ].map(([title, body], i) => (
                      <li key={title}>
                        <span>{i + 1}</span>
                        <div>
                          <h3>{tr(title)}</h3>
                          <p>{tr(body)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="contribute-aside">
                  <BookOpen size={34} />
                  <h2>{tr("Start with one entry")}</h2>
                  <p>{tr("A source and a clear meaning are a good beginning.")}</p>
                  <button
                    className="button primary"
                    onClick={() => {
                      setWorkspace({ ...workspace, role: "contributor" });
                      newProposal();
                    }}
                  >
                    <Plus size={18} />
                    {tr("Create a demo draft")}
                  </button>
                  <Link href="/dashboard/submissions">
                    {tr("My contributions")}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </>
          )}
          {page === "login" && <Login onNotice={setNotice} />}
          {page === "admin" && (
            <>
              <PageHeading
                eyebrow={tr("PLATFORM OPERATIONS")}
                title={tr("Administration")}
                description={tr("Operational access is separate from linguistic authority.")}
              />
              <RoleControl
                workspace={workspace}
                onChange={(role) => setWorkspace({ ...workspace, role })}
              />
              {workspace.role !== "technical_admin" ? (
                <div className="empty">
                  <ShieldCheck size={32} />
                  <h2>{tr("Technical administrator role required")}</h2>
                  <p>{tr("Choose the demo administrator role to inspect the operations view.")}</p>
                </div>
              ) : (
                <>
                  <div className="admin-grid">
                    <section>
                      <h2>{tr("Environment")}</h2>
                      <dl>
                        <dt>{tr("Workspace")}</dt>
                        <dd>{tr("Browser-local demo")}</dd>
                        <dt>{tr("Shared data")}</dt>
                        <dd>{tr("Not connected in this interface")}</dd>
                        <dt>{tr("Governance")}</dt>
                        <dd>{tr("Provisional")}</dd>
                        <dt>{tr("Editorial override")}</dt>
                        <dd>{tr("Disabled")}</dd>
                      </dl>
                    </section>
                    <section>
                      <h2>{tr("Demo data")}</h2>
                      <p>
                        {tr(
                          "Restore the initial examples and remove local proposals and decisions.",
                        )}
                      </p>
                      <button
                        className="button danger"
                        onClick={() => {
                          if (
                            window.confirm(
                              tr("Reset all demo proposals and history in this browser?"),
                            )
                          ) {
                            setWorkspace({ ...initialWorkspace, role: "technical_admin" });
                            setNotice("Demo workspace reset.");
                          }
                        }}
                      >
                        {tr("Reset demo workspace")}
                      </button>
                    </section>
                  </div>
                  <h2>{tr("Audit history")}</h2>
                  {workspace.events.length ? (
                    workspace.events.map((e) => (
                      <div className="activity-row" key={e.id}>
                        <ShieldCheck size={16} />
                        <div>
                          <strong>
                            {e.actor}
                            {tr("·")}
                            {labels[e.action] ?? e.action}
                          </strong>
                          <p>{e.rationale}</p>
                        </div>
                        <time>{new Date(e.at).toLocaleString("en-GB")}</time>
                      </div>
                    ))
                  ) : (
                    <p className="muted">{tr("No local decisions recorded.")}</p>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
      {!isDashboard && (
        <footer inert={modalOpen}>
          <Link className="brand" href="/">
            <BookOpen size={20} />
            qaamuusAi
          </Link>
          <span>{tr("Language. Knowledge. Together.")}</span>
          <Link href="/about">{tr("Governance")}</Link>
          <Link href="/login">{tr("Sign in")}</Link>
          <span>{tr("Prototype · v0.1")}</span>
        </footer>
      )}
      {notice && (
        <div className="toast" role="status">
          <span>{tr(notice)}</span>
          <button className="icon" title={tr("Dismiss message")} onClick={() => setNotice("")}>
            <X size={17} />
          </button>
        </div>
      )}
      {form && (
        <div className="overlay" onClick={() => setForm(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={tr("Create contribution")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">{tr("CONTRIBUTION")}</span>
                <h2>
                  {original
                    ? `${tr(original.status === "published" ? "Propose a correction" : "Edit proposal")}: ${original.term}`
                    : tr("Create a draft")}
                </h2>
              </div>
              <button
                className="icon"
                title={tr("Close draft form")}
                onClick={() => setForm(false)}
              >
                <X />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.currentTarget));
                try {
                  setWorkspace(
                    original && original.status !== "published"
                      ? revise(workspace, original.id, data)
                      : propose({ ...workspace, role: "contributor" }, data, original),
                  );
                  setForm(false);
                  setNotice("Draft saved. Open My submissions to submit it for review.");
                } catch (error) {
                  setNotice(readableError(error));
                }
              }}
            >
              <div className="form-grid">
                <Field label={tr("Somali word / expression")} name="term" value={original?.term} />
                <Field
                  label={tr("English meaning")}
                  name="translation"
                  value={original?.translation}
                />
                <label>
                  {tr("Collection")}
                  <select name="category" defaultValue={original?.category ?? "vocabulary"}>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {labels[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label={tr("Dialect / regional variation")}
                  name="dialect"
                  value={original?.dialect ?? "Unspecified"}
                />
              </div>
              <Field
                label={tr("Source / provenance")}
                name="source"
                value={original?.source}
                placeholder={tr("Authored example or source citation")}
              />
              <label>
                {tr("Redistribution license")}
                <select name="license" defaultValue={original?.license ?? "Permission pending"}>
                  <option value="Permission pending">{tr("Permission pending")}</option>
                  <option>{tr("CC0-1.0")}</option>
                  <option>{tr("CC-BY-4.0")}</option>
                </select>
              </label>
              <label>
                {tr("Notes")}
                <textarea name="notes" defaultValue={original?.notes} rows={3} />
              </label>
              <div className="modal-foot">
                <button type="button" className="button" onClick={() => setForm(false)}>
                  {tr("Cancel")}
                </button>
                <button className="button primary">
                  <Check size={17} />
                  {tr("Save draft")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {current && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <section
            className="modal detail"
            role="dialog"
            aria-modal="true"
            aria-label={tr("Entry details")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">
                  {labels[current.category]}
                  {tr("· v")}
                  {current.version}
                  {tr(".0")}
                </span>
                <h2>{current.term}</h2>
                <p>{current.translation}</p>
              </div>
              <button
                className="icon"
                title={tr("Close entry details")}
                onClick={() => setSelected(null)}
              >
                <X />
              </button>
            </div>
            <Badge status={current.status} />
            <p>{current.notes}</p>
            <dl className="metadata">
              <dt>{tr("Source")}</dt>
              <dd>{current.source}</dd>
              <dt>{tr("License")}</dt>
              <dd>{current.license}</dd>
              <dt>{tr("Variation")}</dt>
              <dd>{current.dialect}</dd>
              <dt>{tr("Contributor")}</dt>
              <dd>{current.contributor}</dd>
              <dt>{tr("Reviewer")}</dt>
              <dd>{current.reviewer ?? tr("Not yet reviewed")}</dd>
              <dt>{tr("Data classification")}</dt>
              <dd>{tr("Demonstration only")}</dd>
            </dl>
            {current.status === "published" ? (
              <button
                className="button primary"
                onClick={() => {
                  setWorkspace({ ...workspace, role: "contributor" });
                  newProposal(current);
                }}
              >
                <GitBranch size={17} />
                {tr("Propose a correction")}
              </button>
            ) : (
              <>
                <label>
                  {tr("Decision rationale")}
                  <textarea
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    rows={3}
                    placeholder={tr("Record your reasoning or supporting evidence")}
                  />
                </label>
                <div className="decision-actions">
                  {current.status === "draft" || current.status === "changes_requested" ? (
                    <button className="button primary" onClick={() => act("submitted")}>
                      {tr("Submit for review")}
                      <ArrowRight size={16} />
                    </button>
                  ) : current.status === "submitted" ? (
                    <button className="button primary" onClick={() => act("under_review")}>
                      {tr("Begin review")}
                    </button>
                  ) : current.status === "under_review" ? (
                    <>
                      <button className="button primary" onClick={() => act("approved")}>
                        <Check size={16} />
                        {tr("Approve")}
                      </button>
                      <button className="button" onClick={() => act("changes_requested")}>
                        {tr("Request changes")}
                      </button>
                      <button className="button" onClick={() => act("disputed")}>
                        {tr("Open dispute")}
                      </button>
                      <button className="button danger" onClick={() => act("rejected")}>
                        {tr("Reject")}
                      </button>
                    </>
                  ) : current.status === "approved" ? (
                    <button className="button primary" onClick={() => act("published")}>
                      {tr("Publish entry")}
                    </button>
                  ) : current.status === "disputed" ? (
                    <button className="button primary" onClick={() => act("under_review")}>
                      {tr("Resolve and return to review")}
                    </button>
                  ) : (
                    <p className="muted">{tr("This proposal is closed.")}</p>
                  )}
                </div>
                {current.status === "disputed" && (
                  <form
                    className="evidence-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const data = new FormData(e.currentTarget);
                      const position = String(data.get("position"));
                      const source = String(data.get("source"));
                      try {
                        setWorkspace(addEvidence(workspace, current, { position, source }));
                        e.currentTarget.reset();
                        setNotice("Position and evidence preserved.");
                      } catch (error) {
                        setNotice(readableError(error));
                      }
                    }}
                  >
                    <h3>{tr("Positions & evidence")}</h3>
                    {workspace.evidence
                      .filter((e) => e.entryId === current.id)
                      .map((e) => (
                        <blockquote key={e.id}>
                          <strong>{e.actor}</strong>
                          <p>{e.position}</p>
                          <cite>{e.source}</cite>
                        </blockquote>
                      ))}
                    <Field label={tr("Your position")} name="position" />
                    <Field label={tr("Supporting source")} name="source" />
                    <button className="button">
                      <Plus size={16} />
                      {tr("Add evidence")}
                    </button>
                  </form>
                )}
              </>
            )}
            {hasPermission(workspace.community, workspace.role, "editor") &&
              ["submitted", "under_review", "changes_requested"].includes(current.status) && (
                <form className="record-band" onSubmit={recordAssignment}>
                  <h3>{tr("Reviewer assignment")}</h3>
                  <label>
                    {tr("Reviewer")}
                    <select name="reviewer">
                      {workspace.community.members
                        .filter((m) => m.roles.includes("reviewer") || m.roles.includes("editor"))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <Field label={tr("Assignment rationale")} name="reason" />
                  <button className="button">
                    <Check size={16} />
                    {tr("Assign reviewer")}
                  </button>
                </form>
              )}
            {!["published", "superseded"].includes(current.status) && (
              <section className="record-band">
                <h3>{tr("Discussion")}</h3>
                {workspace.community.comments
                  .filter((c) => c.entryId === current.id)
                  .map((c) => (
                    <blockquote key={c.id}>
                      <strong>
                        {workspace.community.members.find((m) => m.id === c.author)?.name}
                      </strong>
                      <p>{c.body}</p>
                    </blockquote>
                  ))}
                <form onSubmit={recordComment}>
                  <label>
                    {tr("Comment")}
                    <textarea name="comment" required rows={3} maxLength={10000} />
                  </label>
                  <button className="button">
                    <MessageSquare size={16} />
                    {tr("Add comment")}
                  </button>
                </form>
              </section>
            )}
            {workspace.community.resolutions.some((r) => r.entryId === current.id) && (
              <section className="record-band">
                <h3>{tr("Resolution history")}</h3>
                {workspace.community.resolutions
                  .filter((r) => r.entryId === current.id)
                  .map((r, i) => (
                    <blockquote key={i}>
                      <strong>
                        {workspace.community.members.find((m) => m.id === r.editor)?.name}
                      </strong>
                      <p>{r.rationale}</p>
                    </blockquote>
                  ))}
              </section>
            )}
            {workspace.role === "contributor" &&
              current.contributor === actors.contributor &&
              ["draft", "changes_requested"].includes(current.status) && (
                <button className="button edit-proposal" onClick={() => newProposal(current)}>
                  <FileText size={16} />
                  {tr("Edit proposal")}
                </button>
              )}
            <div className="history">
              <h3>{tr("Revision history")}</h3>
              {workspace.events.filter((e) => e.entryId === current.id).length === 0 ? (
                <p className="muted">
                  {tr("Initial demonstration record ·")}{" "}
                  {new Date(current.created_at).toLocaleDateString("en-GB")}
                </p>
              ) : (
                workspace.events
                  .filter((e) => e.entryId === current.id)
                  .map((e) => (
                    <div key={e.id}>
                      <strong>{labels[e.action] ?? e.action}</strong>
                      <p>{e.rationale}</p>
                      <small>
                        {e.actor}
                        {tr("·")}
                        {new Date(e.at).toLocaleString("en-GB")}
                      </small>
                      <details>
                        <summary>{tr("Recorded version")}</summary>
                        <p>
                          {e.snapshot.term}
                          {tr("·")}
                          {e.snapshot.translation}
                          {tr("·")}
                          {e.snapshot.source}
                        </p>
                      </details>
                    </div>
                  ))
              )}
            </div>
          </section>
        </div>
      )}
      {article !== null && (
        <div className="overlay" onClick={() => setArticle(null)}>
          <section
            className="modal prose"
            role="dialog"
            aria-modal="true"
            aria-label={tr("Project article")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <span className="eyebrow">{tr("PROJECT NOTE")}</span>
              <button className="icon" title={tr("Close article")} onClick={() => setArticle(null)}>
                <X />
              </button>
            </div>
            <h1>{articles[article].title}</h1>
            <p>{articles[article].body}</p>
            <p className="muted">{tr("qaamuusAi · Provisional editorial guidance")}</p>
          </section>
        </div>
      )}
    </LocaleContext.Provider>
  );
}
function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const { tr } = useLocale();
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{tr(eyebrow)}</span>
        <h1>{tr(title)}</h1>
        <p>{tr(description)}</p>
      </div>
      {action}
    </div>
  );
}
function RoleControl({
  workspace,
  onChange,
}: {
  workspace: Workspace;
  onChange: (role: Role) => void;
}) {
  const { tr } = useLocale();
  return (
    <div className="role-control">
      <div>
        <CircleHelp size={17} />
        <span>{tr("Demo identity")}</span>
      </div>
      <select
        aria-label={tr("Demo role")}
        value={workspace.role}
        onChange={(e) => onChange(e.target.value as Role)}
      >
        {roles.map((r) => (
          <option key={r} value={r}>
            {tr(baseLabels[r])}
          </option>
        ))}
      </select>
      <span className="muted">{actors[workspace.role]}</span>
    </div>
  );
}
function Field({
  label,
  name,
  value,
  placeholder,
}: {
  label: string;
  name: string;
  value?: string;
  placeholder?: string;
}) {
  const { tr } = useLocale();
  return (
    <label>
      {tr(label)}
      <input
        name={name}
        defaultValue={value}
        placeholder={placeholder ? tr(placeholder) : undefined}
        required
        maxLength={10000}
      />
    </label>
  );
}
function Login({ onNotice }: { onNotice: (message: string) => void }) {
  const { tr } = useLocale();
  return (
    <div className="login">
      <ShieldCheck size={35} />
      <h1>{tr("Welcome to the commons")}</h1>
      <p>{tr("Sign in with your existing community account.")}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const email = new FormData(e.currentTarget).get("email");
          try {
            const response = await fetch("/api/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });
            const data = await response.json();
            onNotice(response.ok ? "Check your inbox for a sign-in link." : data.error);
          } catch {
            onNotice("Could not request sign-in. Please try again.");
          }
        }}
      >
        <label>
          {tr("Email address")}
          <input type="email" name="email" required placeholder={tr("you@example.com")} />
        </label>
        <button className="button primary">
          {tr("Send sign-in link")}
          <ArrowRight size={17} />
        </button>
      </form>
      <div className="login-demo">
        <span>{tr("Exploring the prototype?")}</span>
        <Link href="/dashboard">
          {tr("Open the demo workspace")}
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
