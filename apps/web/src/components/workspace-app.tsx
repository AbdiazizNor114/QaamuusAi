"use client";

import Link from "next/link";
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
} from "lucide-react";
import {
  type Entry,
  type Role,
  type Status,
  canExport,
  categories,
  entrySchema,
  roles,
} from "@qaamuusai/schemas";
import { actors, advance, initialWorkspace, propose, revise, type Workspace } from "@/lib/demo";

const storageKey = "qaamuusAi.demo.v1";
const labels: Record<string, string> = {
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
const articles = [
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
  return <span className={`badge ${status}`}>{labels[status]}</span>;
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
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const value = JSON.parse(raw) as Workspace;
        if (
          Array.isArray(value.entries) &&
          value.entries.every((e) => entrySchema.safeParse(e).success) &&
          roles.includes(value.role) &&
          Array.isArray(value.events) &&
          Array.isArray(value.evidence)
        ) {
          // Restore the browser-local demo only after hydration.
          setWorkspace(value);
        }
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(storageKey, JSON.stringify(workspace));
  }, [workspace, ready]);
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
  const isDashboard = page.startsWith("dashboard") || page === "admin";
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
      setNotice(`Decision recorded: ${labels[to]}.`);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  const table = (entries: Entry[]) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Somali</th>
            <th>English / meaning</th>
            <th>Collection</th>
            <th>Status</th>
            <th>Version</th>
            <th>
              <span className="sr-only">Open</span>
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
              <td className="muted">v{e.version}.0</td>
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
          <h3>No entries found</h3>
          <p>Try another word or collection.</p>
        </div>
      )}
    </div>
  );
  const filters = (
    <div className="filters">
      <label className="search">
        <Search size={18} />
        <input
          aria-label="Search entries"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
        />
      </label>
      <select
        aria-label="Filter collection"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="all">All collections</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {labels[c]}
          </option>
        ))}
      </select>
      {isDashboard && (
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
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
    <>
      <header className="header">
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
          <Link href="/about">About</Link>
        </nav>
        <div className="header-actions">
          <button
            className="language"
            title="Switch language"
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
            title="Open navigation"
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
          Demonstration workspace{" "}
          <span className="demo-detail">· Authored examples, not scholar-verified data</span>
        </span>
        <span className="demo-right">
          Local prototype <GitBranch size={13} />
        </span>
      </div>
      <div className={isDashboard ? "app-shell" : "public-shell"}>
        {isDashboard && (
          <aside className="sidebar">
            <div className="sidebar-title">COMMUNITY WORKSPACE</div>
            {[
              ["dashboard", "Overview", LayoutDashboard],
              ["dashboard/submissions", "My submissions", FileText],
              ["dashboard/reviews", "Review queue", ListChecks],
              ["dashboard/disputes", "Disputes", MessageSquare],
              ["admin", "Administration", Settings],
            ].map(([href, label, Icon]) => {
              const I = Icon as typeof Settings;
              return (
                <Link
                  key={href as string}
                  className={page === href ? "side-link active" : "side-link"}
                  href={`/${href}`}
                >
                  <I size={18} />
                  {label as string}
                </Link>
              );
            })}
            <div className="sidebar-bottom">
              <ShieldCheck size={22} />
              <strong>Care before publication</strong>
              <p>Every decision keeps its author, rationale and history.</p>
              <Link href="/about">
                Our governance <ArrowRight size={14} />
              </Link>
            </div>
          </aside>
        )}
        <main data-ready={ready}>
          {(page === "" || page === "datasets") && (
            <>
              <section className="intro">
                <div className="eyebrow">
                  <span />
                  THE SOMALI LANGUAGE COMMONS
                </div>
                <h1>{page === "" ? t.title : "Dataset library"}</h1>
                <p>
                  {page === ""
                    ? t.subtitle
                    : "Explore the vocabulary, translations and grammar we build together."}
                </p>
                <div className="intro-actions">
                  <Link className="button primary" href="/contribute">
                    <Plus size={17} />
                    Contribute an entry
                  </Link>
                  <button className="button" onClick={() => download(published)}>
                    <ArrowDownToLine size={17} />
                    Export JSONL
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
                  <h2>Explore the collections</h2>
                  <span className="muted">3 collections · {published.length} demo entries</span>
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
                        {
                          [
                            "Words and the meanings they carry.",
                            "Connections between two languages.",
                            "Patterns that bring language to life.",
                          ][i]
                        }
                      </p>
                      <span className="collection-meta">
                        {published.filter((e) => e.category === c).length} entries{" "}
                        <span>DEMO v0.1</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="entry-section">
                <div className="section-heading">
                  <h2>Published entries</h2>
                  <span className="muted">CC0 demonstration release</span>
                </div>
                {filters}
                {table(filtered)}
                <div className="table-foot">
                  <span>{filtered.length} entries</span>
                  <span>Provenance and licensing included in every export</span>
                </div>
              </section>
              <section className="contribution-band">
                <div>
                  <div className="eyebrow">BUILT TOGETHER</div>
                  <h2>A living language deserves a shared foundation.</h2>
                  <p>Bring a word, a source, or a careful correction.</p>
                </div>
                <Link className="button primary" href="/contribute">
                  Join the work
                  <ArrowRight size={17} />
                </Link>
              </section>
            </>
          )}
          {page === "dashboard" && (
            <>
              <PageHeading
                eyebrow="YOUR WORKSPACE"
                title="Good work starts with one word."
                description="Keep your contributions moving and the conversation open."
                action={
                  <button className="button primary" onClick={() => newProposal()}>
                    <Plus size={17} />
                    New contribution
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
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="section-heading">
                <h2>Recent contributions</h2>
                <Link href="/dashboard/submissions">
                  View all
                  <ArrowRight size={15} />
                </Link>
              </div>
              {table(workspace.entries.filter((e) => e.status !== "published").slice(0, 6))}
              <section className="activity">
                <h2>Activity log</h2>
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
                            {e.actor} · {e.rationale}
                          </p>
                        </div>
                        <time>{new Date(e.at).toLocaleDateString("en-GB")}</time>
                      </div>
                    ))
                ) : (
                  <p className="muted">Your recorded decisions will appear here.</p>
                )}
              </section>
            </>
          )}
          {page === "dashboard/submissions" && (
            <>
              <PageHeading
                eyebrow="CONTRIBUTIONS"
                title="My submissions"
                description="Your drafts, proposals and corrections, with every revision preserved."
                action={
                  <button className="button primary" onClick={() => newProposal()}>
                    <Plus size={17} />
                    New contribution
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
                eyebrow="EDITORIAL WORKSPACE"
                title="Review queue"
                description="Independent review gives every contribution a stronger foundation."
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
                eyebrow="EDITORIAL WORKSPACE"
                title="Linguistic disputes"
                description="Record positions, examine evidence and preserve accepted variation."
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
                eyebrow="READ & REFLECT"
                title="From the commons"
                description="Project notes on language, contribution and the care behind our datasets."
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
                      <span className="muted">qaamuusAi · Project note · 3 min read</span>
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
                eyebrow="ABOUT QAAMUUSAI"
                title="Language is shared. So is this work."
                description="An open foundation for Somali language resources, built with community knowledge and independent linguistic review."
              />
              <div className="prose">
                <h2>Our mission</h2>
                <p>
                  Help scholars, linguists, educators and contributors create, review and publish
                  high-quality Somali language datasets. These resources can support translation,
                  language learning, developer libraries and future research.
                </p>
                <h2>Authority follows the work</h2>
                <p>
                  Contributors propose. Reviewers examine. Editors coordinate publication and
                  disputes. Technical administrators operate the platform. Technical access does not
                  confer linguistic authority.
                </p>
                <h2>Sources, variation and permissions</h2>
                <p>
                  Every entry carries provenance, licensing and version metadata. Corrections create
                  revisions. Published versions stay intact. Disagreements and evidence remain part
                  of the record.
                </p>
                <h2>A provisional beginning</h2>
                <p>
                  The governance process awaits approval by founding scholars. All data shown in
                  this local prototype is clearly marked demonstration material. No AI training,
                  external accounts or public deployment are included.
                </p>
                <Link className="button primary" href="/contribute">
                  Contribute to the commons
                  <ArrowRight size={17} />
                </Link>
              </div>
            </>
          )}
          {page === "contribute" && (
            <>
              <PageHeading
                eyebrow="MAKE A CONTRIBUTION"
                title="Your knowledge has a place here."
                description="Start with a word, a translation, a grammar note or a sourced correction."
              />
              <div className="contribute-layout">
                <div className="prose">
                  <h2>A careful path to publication</h2>
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
                          <h3>{title}</h3>
                          <p>{body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="contribute-aside">
                  <BookOpen size={34} />
                  <h2>Start with one entry</h2>
                  <p>A source and a clear meaning are a good beginning.</p>
                  <button
                    className="button primary"
                    onClick={() => {
                      setWorkspace({ ...workspace, role: "contributor" });
                      newProposal();
                    }}
                  >
                    <Plus size={18} />
                    Create a demo draft
                  </button>
                  <Link href="/dashboard/submissions">
                    My contributions
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
                eyebrow="PLATFORM OPERATIONS"
                title="Administration"
                description="Operational access is separate from linguistic authority."
              />
              <RoleControl
                workspace={workspace}
                onChange={(role) => setWorkspace({ ...workspace, role })}
              />
              {workspace.role !== "technical_admin" ? (
                <div className="empty">
                  <ShieldCheck size={32} />
                  <h2>Technical administrator role required</h2>
                  <p>Choose the demo administrator role to inspect the operations view.</p>
                </div>
              ) : (
                <>
                  <div className="admin-grid">
                    <section>
                      <h2>Environment</h2>
                      <dl>
                        <dt>Workspace</dt>
                        <dd>Browser-local demo</dd>
                        <dt>Shared data</dt>
                        <dd>Not connected in this interface</dd>
                        <dt>Governance</dt>
                        <dd>Provisional</dd>
                        <dt>Editorial override</dt>
                        <dd>Disabled</dd>
                      </dl>
                    </section>
                    <section>
                      <h2>Demo data</h2>
                      <p>Restore the initial examples and remove local proposals and decisions.</p>
                      <button
                        className="button danger"
                        onClick={() => {
                          if (
                            window.confirm("Reset all demo proposals and history in this browser?")
                          ) {
                            setWorkspace({ ...initialWorkspace, role: "technical_admin" });
                            setNotice("Demo workspace reset.");
                          }
                        }}
                      >
                        Reset demo workspace
                      </button>
                    </section>
                  </div>
                  <h2>Audit history</h2>
                  {workspace.events.length ? (
                    workspace.events.map((e) => (
                      <div className="activity-row" key={e.id}>
                        <ShieldCheck size={16} />
                        <div>
                          <strong>
                            {e.actor} · {labels[e.action] ?? e.action}
                          </strong>
                          <p>{e.rationale}</p>
                        </div>
                        <time>{new Date(e.at).toLocaleString("en-GB")}</time>
                      </div>
                    ))
                  ) : (
                    <p className="muted">No local decisions recorded.</p>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
      {!isDashboard && (
        <footer>
          <Link className="brand" href="/">
            <BookOpen size={20} />
            qaamuusAi
          </Link>
          <span>Language. Knowledge. Together.</span>
          <Link href="/about">Governance</Link>
          <Link href="/login">Sign in</Link>
          <span>Prototype · v0.1</span>
        </footer>
      )}
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button className="icon" title="Dismiss message" onClick={() => setNotice("")}>
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
            aria-label="Create contribution"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">CONTRIBUTION</span>
                <h2>
                  {original
                    ? `${original.status === "published" ? "Propose a correction" : "Edit proposal"}: ${original.term}`
                    : "Create a draft"}
                </h2>
              </div>
              <button className="icon" title="Close draft form" onClick={() => setForm(false)}>
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
                  setNotice((error as Error).message);
                }
              }}
            >
              <div className="form-grid">
                <Field label="Somali word / expression" name="term" value={original?.term} />
                <Field label="English meaning" name="translation" value={original?.translation} />
                <label>
                  Collection
                  <select name="category" defaultValue={original?.category ?? "vocabulary"}>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {labels[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Dialect / regional variation"
                  name="dialect"
                  value={original?.dialect ?? "Unspecified"}
                />
              </div>
              <Field
                label="Source / provenance"
                name="source"
                value={original?.source}
                placeholder="Authored example or source citation"
              />
              <label>
                Redistribution license
                <select name="license" defaultValue={original?.license ?? "Permission pending"}>
                  <option>Permission pending</option>
                  <option>CC0-1.0</option>
                  <option>CC-BY-4.0</option>
                </select>
              </label>
              <label>
                Notes
                <textarea name="notes" defaultValue={original?.notes} rows={3} />
              </label>
              <div className="modal-foot">
                <button type="button" className="button" onClick={() => setForm(false)}>
                  Cancel
                </button>
                <button className="button primary">
                  <Check size={17} />
                  Save draft
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
            aria-label="Entry details"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">
                  {labels[current.category]} · v{current.version}.0
                </span>
                <h2>{current.term}</h2>
                <p>{current.translation}</p>
              </div>
              <button
                className="icon"
                title="Close entry details"
                onClick={() => setSelected(null)}
              >
                <X />
              </button>
            </div>
            <Badge status={current.status} />
            <p>{current.notes}</p>
            <dl className="metadata">
              <dt>Source</dt>
              <dd>{current.source}</dd>
              <dt>License</dt>
              <dd>{current.license}</dd>
              <dt>Variation</dt>
              <dd>{current.dialect}</dd>
              <dt>Contributor</dt>
              <dd>{current.contributor}</dd>
              <dt>Reviewer</dt>
              <dd>{current.reviewer ?? "Not yet reviewed"}</dd>
              <dt>Data classification</dt>
              <dd>Demonstration only</dd>
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
                Propose a correction
              </button>
            ) : (
              <>
                <label>
                  Decision rationale
                  <textarea
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    rows={3}
                    placeholder="Record your reasoning or supporting evidence"
                  />
                </label>
                <div className="decision-actions">
                  {current.status === "draft" || current.status === "changes_requested" ? (
                    <button className="button primary" onClick={() => act("submitted")}>
                      Submit for review
                      <ArrowRight size={16} />
                    </button>
                  ) : current.status === "submitted" ? (
                    <button className="button primary" onClick={() => act("under_review")}>
                      Begin review
                    </button>
                  ) : current.status === "under_review" ? (
                    <>
                      <button className="button primary" onClick={() => act("approved")}>
                        <Check size={16} />
                        Approve
                      </button>
                      <button className="button" onClick={() => act("changes_requested")}>
                        Request changes
                      </button>
                      <button className="button" onClick={() => act("disputed")}>
                        Open dispute
                      </button>
                      <button className="button danger" onClick={() => act("rejected")}>
                        Reject
                      </button>
                    </>
                  ) : current.status === "approved" ? (
                    <button className="button primary" onClick={() => act("published")}>
                      Publish entry
                    </button>
                  ) : current.status === "disputed" ? (
                    <button className="button primary" onClick={() => act("under_review")}>
                      Resolve and return to review
                    </button>
                  ) : (
                    <p className="muted">This proposal is closed.</p>
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
                      if (workspace.role === "technical_admin") {
                        setNotice("Editorial access is required to add evidence.");
                        return;
                      }
                      setWorkspace({
                        ...workspace,
                        evidence: [
                          ...workspace.evidence,
                          {
                            id: crypto.randomUUID(),
                            entryId: current.id,
                            actor: actors[workspace.role],
                            position,
                            source,
                            at: new Date().toISOString(),
                          },
                        ],
                      });
                      e.currentTarget.reset();
                      setNotice("Position and evidence preserved.");
                    }}
                  >
                    <h3>Positions & evidence</h3>
                    {workspace.evidence
                      .filter((e) => e.entryId === current.id)
                      .map((e) => (
                        <blockquote key={e.id}>
                          <strong>{e.actor}</strong>
                          <p>{e.position}</p>
                          <cite>{e.source}</cite>
                        </blockquote>
                      ))}
                    <Field label="Your position" name="position" />
                    <Field label="Supporting source" name="source" />
                    <button className="button">
                      <Plus size={16} />
                      Add evidence
                    </button>
                  </form>
                )}
              </>
            )}
            {workspace.role === "contributor" &&
              current.contributor === actors.contributor &&
              ["draft", "changes_requested"].includes(current.status) && (
                <button className="button edit-proposal" onClick={() => newProposal(current)}>
                  <FileText size={16} />
                  Edit proposal
                </button>
              )}
            <div className="history">
              <h3>Revision history</h3>
              {workspace.events.filter((e) => e.entryId === current.id).length === 0 ? (
                <p className="muted">
                  Initial demonstration record ·{" "}
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
                        {e.actor} · {new Date(e.at).toLocaleString("en-GB")}
                      </small>
                      <details>
                        <summary>Recorded version</summary>
                        <p>
                          {e.snapshot.term} · {e.snapshot.translation} · {e.snapshot.source}
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
            aria-label="Project article"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <span className="eyebrow">PROJECT NOTE</span>
              <button className="icon" title="Close article" onClick={() => setArticle(null)}>
                <X />
              </button>
            </div>
            <h1>{articles[article].title}</h1>
            <p>{articles[article].body}</p>
            <p className="muted">qaamuusAi · Provisional editorial guidance</p>
          </section>
        </div>
      )}
    </>
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
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
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
  return (
    <div className="role-control">
      <div>
        <CircleHelp size={17} />
        <span>Demo identity</span>
      </div>
      <select
        aria-label="Demo role"
        value={workspace.role}
        onChange={(e) => onChange(e.target.value as Role)}
      >
        {roles.map((r) => (
          <option key={r} value={r}>
            {labels[r]}
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
  return (
    <label>
      {label}
      <input
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        required
        maxLength={10000}
      />
    </label>
  );
}
function Login({ onNotice }: { onNotice: (message: string) => void }) {
  return (
    <div className="login">
      <ShieldCheck size={35} />
      <h1>Welcome to the commons</h1>
      <p>Sign in with your existing community account.</p>
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
          Email address
          <input type="email" name="email" required placeholder="you@example.com" />
        </label>
        <button className="button primary">
          Send sign-in link
          <ArrowRight size={17} />
        </button>
      </form>
      <div className="login-demo">
        <span>Exploring the prototype?</span>
        <Link href="/dashboard">
          Open the demo workspace
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
