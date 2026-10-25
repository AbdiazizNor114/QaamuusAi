"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownToLine,
  BookOpen,
  Braces,
  Check,
  Copy,
  FileText,
  Globe,
  Layers,
  Menu,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { z } from "zod";
import { technologyTerms } from "@/lib/technology-terms";
import { readTerminology } from "@/lib/terminology";
import { ProposalNotes } from "./proposal-notes";
import { BrandLogo } from "./brand-logo";
import { AIOverview } from "./ai-overview";

const entry = z.object({
  id: z.string(),
  category: z.string(),
  term: z.string(),
  translation: z.string(),
  notes: z.string(),
  source: z.string(),
  license: z.string(),
  dialect: z.string(),
  version: z.number(),
});
const article = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  body: z.string(),
  source: z.string(),
  license: z.string(),
  version: z.number(),
});
const catalogSchema = z.object({
  entries: z.array(entry),
  articles: z.array(article),
  releases: z.array(
    z.object({
      id: z.string(),
      version: z.string(),
      notes: z.string(),
      created_at: z.string().optional(),
    }),
  ),
  configured: z.boolean(),
});
type Catalog = z.infer<typeof catalogSchema>;
const empty: Catalog = { entries: [], articles: [], releases: [], configured: false };
const nav = [
  { path: "/datasets", label: "Datasets" },
  { path: "/technology", label: "Terminology" },
  { path: "/developers", label: "Developers" },
  { path: "/releases", label: "Releases" },
  { path: "/articles", label: "Articles" },
  { path: "/ai", label: "AI vision" },
  { path: "/about", label: "About" },
];

export function PublicSite({ page }: { page: string }) {
  const [catalog, setCatalog] = useState<Catalog>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [menu, setMenu] = useState(false);
  const [query, setQueryValue] = useState("");
  const [category, setCategoryValue] = useState("all");
  const [resultPage, setResultPage] = useState(1);
  function setQuery(value: string) {
    setQueryValue(value);
    setResultPage(1);
  }
  function setCategory(value: string) {
    setCategoryValue(value);
    setResultPage(1);
  }
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (selected) detailRef.current?.scrollIntoView({ block: "start" });
  }, [selected]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Published resources are temporarily unavailable.");
        setCatalog(catalogSchema.parse(await response.json()));
        setError("");
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Published resources are temporarily unavailable.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  const tech = page === "technology";
  const publishedTerms = new Map<string, Catalog["entries"]>();
  for (const row of catalog.entries) {
    const metadata = readTerminology(row.notes);
    if (metadata)
      publishedTerms.set(metadata.seed_id, [...(publishedTerms.get(metadata.seed_id) ?? []), row]);
  }
  const items = catalog.entries.filter(
    (row) =>
      (category === "all" || row.category === category) &&
      `${row.term} ${row.translation} ${row.dialect}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const terms = technologyTerms.filter(
    (row) =>
      (category === "all" || row.category === category) &&
      `${row.english} ${(publishedTerms.get(row.id) ?? []).map((entry) => entry.term).join(" ")}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const resultCount = tech ? terms.length : items.length;
  const pageSize = 40;
  const totalPages = Math.max(1, Math.ceil(resultCount / pageSize));
  const currentPage = Math.min(resultPage, totalPages);
  const firstResult = (currentPage - 1) * pageSize;
  function changePage(value: number) {
    setResultPage(value);
    document.getElementById("published-entries")?.scrollIntoView({ block: "start" });
  }
  const detail = catalog.entries.find((row) => row.id === selected);
  const currentArticle = catalog.articles.find((row) => row.id === selected);
  const snippet = `const params = new URLSearchParams({\n  q: 'home', category: 'translation',\n  page: '1', limit: '25'\n});\nconst response = await fetch('/api/v1/entries?' + params);\nconst result = await response.json();\nif (!response.ok) throw new Error(result.error.message);\nconsole.log(result.data, result.pagination);`;
  return (
    <div
      className={`commons-site${page === "" ? " commons-home" : page === "developers" ? " commons-developers" : ""}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="commons-header">
        <Link className="brand" href="/">
          <BrandLogo />
        </Link>
        <nav
          id="public-navigation"
          aria-label="Public navigation"
          className={menu ? "commons-nav is-open" : "commons-nav"}
        >
          {nav.map((item) => (
            <Link
              href={item.path}
              onClick={() => setMenu(false)}
              key={item.path}
              aria-current={item.path === `/${page}` ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="commons-header-actions">
          <Link className="commons-join" href="/join">
            Become a contributor
          </Link>
          <Link className="commons-workspace" href="/dashboard">
            Workspace <ArrowUpRight size={15} />
          </Link>
        </div>
        <button
          className="commons-menu"
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
          aria-controls="public-navigation"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      <div className="commons-banner">
        <span>
          <ShieldCheck size={15} /> A community-governed Somali language commons
        </span>
      </div>
      <main id="main-content" tabIndex={-1} className="commons-main">
        {page === "ai" && <AIOverview />}
        {(page === "" || page === "datasets" || tech) && (
          <>
            <div className={`commons-page-heading${page === "" ? " commons-home-heading" : ""}`}>
              <span className="commons-eyebrow">
                {page === "" ? "OUR LANGUAGE. OUR SHARED FUTURE." : "SOMALI LANGUAGE COMMONS"}
              </span>
              <h1>{tech ? "Terminology in progress" : page === "" ? "QaamuusAi" : "Datasets"}</h1>
              <p>
                {tech
                  ? "A shared vocabulary for the interfaces, tools and systems we use every day."
                  : page === ""
                    ? "A living home for the Somali language. Discover words, share knowledge and help build the language resources of tomorrow."
                    : "Somali vocabulary, translations and grammar, with sources and permissions kept alongside every entry."}
              </p>
              {page === "" && (
                <>
                  <div className="commons-home-actions">
                    <a href="#collections">
                      Explore the commons <ArrowRight size={16} />
                    </a>
                    <Link href="/join">
                      Contribute an entry <ArrowUpRight size={16} />
                    </Link>
                  </div>
                  <div className="commons-home-mark" aria-label="Af Soomaali">
                    <span>Af</span>
                    <div>SOOMAALI</div>
                    <BookOpen size={64} strokeWidth={1.2} aria-hidden="true" />
                    <small>A language worth building for.</small>
                  </div>
                </>
              )}
            </div>
            {page === "" && (
              <section className="commons-home-ledger" aria-label="Commons at a glance">
                <div>
                  <strong>{loading || error ? "--" : catalog.entries.length}</strong>
                  <span>Published entries</span>
                </div>
                <div>
                  <strong>1,000</strong>
                  <span>Technology terms to translate</span>
                </div>
                <div>
                  <ShieldCheck size={24} strokeWidth={1.5} />
                  <span>Community-led review</span>
                </div>
                <Link href="/about">
                  Built together. Open to everyone. <ArrowUpRight size={17} />
                </Link>
              </section>
            )}
            {tech ? (
              <div className="commons-planning">
                <Layers size={22} />
                <div>
                  <strong>
                    {technologyTerms.length} starter terms /{" "}
                    {loading || error ? "--" : publishedTerms.size} with published translations
                  </strong>
                  <p>
                    Published translations appear alongside their English terms. Remaining terms
                    await contribution and independent review.
                  </p>
                </div>
                <a href="/api/technology" download>
                  <ArrowDownToLine size={17} /> English planning JSON
                </a>
              </div>
            ) : (
              <section id="collections" className="commons-collections" aria-label="Collections">
                {[
                  {
                    id: "vocabulary",
                    name: "Vocabulary",
                    sub: "Words and their meanings",
                    Icon: BookOpen,
                  },
                  {
                    id: "translation",
                    name: "Somali-English",
                    sub: "Connections between languages",
                    Icon: Globe,
                  },
                  {
                    id: "grammar",
                    name: "Grammar",
                    sub: "Patterns, structure and usage",
                    Icon: FileText,
                  },
                ].map(({ id, name, sub, Icon }) => (
                  <button
                    className={`commons-collection collection-${id}`}
                    key={id}
                    aria-pressed={category === id}
                    onClick={() => {
                      setCategory(category === id ? "all" : id);
                      setSelected(null);
                    }}
                  >
                    <Icon size={24} />
                    <strong>{name}</strong>
                    <span>{sub}</span>
                    <small>
                      {catalog.entries.filter((row) => row.category === id).length} published
                      entries <ArrowUpRight size={15} />
                    </small>
                  </button>
                ))}
              </section>
            )}
            <div className="commons-list-heading" id="published-entries">
              <h2>{tech ? "Technology terminology" : "Published entries"}</h2>
              <span>{tech ? terms.length : items.length} entries</span>
              {!tech && (
                <a href="/api/export?format=json" download>
                  <ArrowDownToLine size={15} /> JSON
                </a>
              )}
            </div>
            <div className="commons-filters">
              <label>
                <Search size={18} />
                <input
                  aria-label="Search entries"
                  placeholder={tech ? "Search English or Somali terms" : "Search Somali or English"}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <select
                aria-label="Category"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setSelected(null);
                }}
              >
                <option value="all">All categories</option>
                {(tech
                  ? [...new Set(technologyTerms.map((row) => row.category))]
                  : ["vocabulary", "translation", "grammar"]
                ).map((value) => (
                  <option value={value} key={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            {loading ? (
              <p className="commons-empty" aria-busy="true">
                Loading published entries...
              </p>
            ) : error ? (
              <div className="commons-empty" role="status">
                <p>{error}</p>
                <button
                  onClick={() => {
                    setLoading(true);
                    setRetry(retry + 1);
                  }}
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                {tech ? (
                  <div className="commons-term-list">
                    <div className="commons-table-heading">
                      <span>English term</span>
                      <span>Somali</span>
                      <span>Domain</span>
                    </div>
                    {terms.slice(firstResult, firstResult + pageSize).map((row) => (
                      <div key={row.id} className="commons-term-row">
                        <strong>{row.english}</strong>
                        <div className="commons-term-translations">
                          {(publishedTerms.get(row.id) ?? []).map((entry) => (
                            <button
                              key={entry.id}
                              onClick={() => setSelected(entry.id)}
                              aria-label={`View ${entry.term} translation for ${row.english}`}
                            >
                              <strong>{entry.term}</strong>
                              <small>Published · {entry.dialect}</small>
                              <ArrowUpRight size={15} aria-hidden="true" />
                            </button>
                          ))}
                          {!publishedTerms.has(row.id) && (
                            <span className="commons-pending">Needs translation</span>
                          )}
                        </div>
                        <small>{row.category}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="commons-entry-list">
                    {items.slice(firstResult, firstResult + pageSize).map((row) => (
                      <button key={row.id} onClick={() => setSelected(row.id)}>
                        <strong>{row.term}</strong>
                        <span>{row.translation}</span>
                        <small>
                          {row.category} · {row.dialect} · v{row.version}
                        </small>
                        <ArrowUpRight size={17} />
                      </button>
                    ))}
                  </div>
                )}
                {resultCount > 0 && (
                  <div className="catalog-pagination">
                    <p role="status">
                      Showing {firstResult + 1}–{Math.min(firstResult + pageSize, resultCount)} of{" "}
                      {resultCount} {tech ? "terms" : "entries"}
                    </p>
                    {totalPages > 1 && (
                      <nav aria-label="Results pagination">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => changePage(currentPage - 1)}
                        >
                          Previous
                        </button>
                        <span>
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => changePage(currentPage + 1)}
                        >
                          Next
                        </button>
                      </nav>
                    )}
                  </div>
                )}
                {!(tech ? terms.length : items.length) && (
                  <div className="commons-empty">
                    <BookOpen size={28} />
                    <h3>
                      {query || category !== "all"
                        ? "No matching entries."
                        : "No published entries yet."}
                    </h3>
                    {query || category !== "all" ? (
                      <button
                        onClick={() => {
                          setQuery("");
                          setCategory("all");
                        }}
                      >
                        Clear filters
                      </button>
                    ) : (
                      <>
                        <p>
                          Help shape the first published resources. Every contribution goes through
                          independent review.
                        </p>
                        <Link href="/join">
                          Become a contributor <ArrowRight size={16} />
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
            {detail && (
              <section ref={detailRef} className="commons-detail" aria-label="Entry details">
                <button
                  className="commons-close"
                  aria-label="Close entry"
                  onClick={() => setSelected(null)}
                >
                  <X size={20} />
                </button>
                <span className="commons-eyebrow">{detail.category}</span>
                <h2>{detail.term}</h2>
                <p>{detail.translation}</p>
                <ProposalNotes notes={detail.notes} />
                <dl>
                  <dt>Source</dt>
                  <dd>{detail.source}</dd>
                  <dt>License</dt>
                  <dd>{detail.license}</dd>
                  <dt>Dialect</dt>
                  <dd>{detail.dialect}</dd>
                </dl>
              </section>
            )}
            {page === "" && (
              <>
                <section className="commons-home-project">
                  <div>
                    <span className="commons-eyebrow">THE NEXT CHAPTER</span>
                    <h2>Somali belongs in technology.</h2>
                    <p>
                      From the home screen to the cloud. Our first 1,000 English technology terms
                      are ready for contributors and reviewers to propose, discuss and review Somali
                      translations.
                    </p>
                    <Link href="/technology">
                      Explore the terminology project <ArrowRight size={18} />
                    </Link>
                  </div>
                  <div className="commons-home-terms" aria-label="Technology translation progress">
                    {["Home", "Dashboard", "Account", "Settings"].map((term, index) => {
                      const seed = technologyTerms.find(
                        (row) => row.english.toLowerCase() === term.toLowerCase(),
                      );
                      const translations = seed ? publishedTerms.get(seed.id) : undefined;
                      return (
                        <div key={term}>
                          <small>0{index + 1}</small>
                          <strong>{term}</strong>
                          <span>
                            {loading || error
                              ? "--"
                              : translations?.map((row) => row.term).join(" / ") ||
                                "Awaiting translation"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
                <section className="commons-home-build">
                  <Braces size={32} strokeWidth={1.5} />
                  <div>
                    <span className="commons-eyebrow">FOR DEVELOPERS</span>
                    <h2>Make something in Somali.</h2>
                    <p>
                      Published language data, a read-only API and downloadable JSON. A shared
                      foundation for your next idea.
                    </p>
                  </div>
                  <Link href="/developers">
                    Developer resources <ArrowUpRight size={18} />
                  </Link>
                </section>
              </>
            )}
          </>
        )}
        {page === "developers" && (
          <>
            <div className="commons-page-heading">
              <span className="commons-eyebrow">BUILD WITH SOMALI</span>
              <h1>Developers</h1>
              <p>
                Read published language data, download open formats, and keep attribution with every
                record.
              </p>
              <div className="commons-developer-actions">
                <a href="#api-reference">
                  API reference <ArrowRight size={16} />
                </a>
                <Link href="/releases">
                  Dataset releases <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
            <div className="commons-developer-strip" aria-label="API overview">
              <span>
                <Globe size={17} /> Public read-only access
              </span>
              <span>
                <Braces size={17} /> JSON &amp; JSONL
              </span>
              <span>
                <ShieldCheck size={17} /> Published records only
              </span>
            </div>
            <div className="commons-dev-grid">
              <section>
                <h2>Public data access</h2>
                <p>
                  These read-only endpoints do not require sign-in or an API key. This is a
                  prototype service, without a production availability guarantee.
                </p>
                {[
                  { name: "Published entries", path: "/api/export?format=json", type: "JSON" },
                  { name: "Published entries", path: "/api/export", type: "JSONL" },
                  { name: "Technology planning list", path: "/api/technology", type: "Draft JSON" },
                  {
                    name: "Technology planning list",
                    path: "/api/technology?format=jsonl",
                    type: "Draft JSONL",
                  },
                ].map((item) => (
                  <a className="commons-download-row" href={item.path} download key={item.path}>
                    <span>
                      <strong>{item.name}</strong>
                      <code>{item.path}</code>
                    </span>
                    <span>{item.type}</span>
                    <ArrowDownToLine size={18} />
                  </a>
                ))}
              </section>
              <section className="commons-code">
                <div>
                  <span>
                    <Braces size={16} /> JavaScript
                  </span>
                  <button
                    aria-label="Copy code"
                    title="Copy code"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(snippet);
                        setCopied(true);
                        setCopyError("");
                      } catch {
                        setCopyError("Clipboard unavailable. Select the code below.");
                      }
                    }}
                  >
                    {copied ? <Check size={17} /> : <Copy size={17} />}
                  </button>
                </div>
                <pre tabIndex={0} aria-label="JavaScript API example">
                  <code>{snippet}</code>
                </pre>
                {copyError && <p role="status">{copyError}</p>}
                <p>
                  On another origin, replace the relative URL with this application origin.
                  Cross-origin browser requests require an explicitly allowed origin. Server-side
                  clients can use the API directly. Never include workspace cookies or credentials.
                </p>
              </section>
            </div>
            <section className="commons-info-band commons-api-reference" id="api-reference">
              <h2>Version 1 API</h2>
              <p>
                <Link href="/api/v1/entries" prefetch={false}>
                  <code>GET /api/v1/entries</code>
                </Link>{" "}
                returns only openly licensed published entries, never workspace drafts or the
                untranslated planning list. No sign-in or key is required.
              </p>
              <dl>
                <dt>
                  <code>q</code>
                </dt>
                <dd>
                  Search term and translation, up to 100 characters. Letters, numbers, spaces,
                  apostrophes and hyphens only; matching ignores case.
                </dd>
                <dt>
                  <code>category</code>
                </dt>
                <dd>vocabulary, translation or grammar.</dd>
                <dt>
                  <code>dialect</code>
                </dt>
                <dd>Exact dialect name, up to 100 characters.</dd>
                <dt>
                  <code>page</code> / <code>limit</code>
                </dt>
                <dd>
                  Page starts at 1 (maximum 10000). Default page size 25, maximum 100. Results sort
                  by newest publication then identifier. Pagination is a live view; use frozen
                  releases for reproducible datasets.
                </dd>
              </dl>
              <h3>Response</h3>
              <pre
                tabIndex={0}
                aria-label="Example API response"
                style={{ overflowX: "auto" }}
              >{`{ "api_version": "v1", "status": "published", "data": [],\n  "pagination": { "page": 1, "limit": 25, "total": 0,\n    "total_pages": 0, "has_next": false } }`}</pre>
              <p>
                Each data record contains id, category, term (Somali), translation, notes, source,
                license, dialect, version and created_at. Preserve source and licensing information
                when reusing data.
              </p>
              <h3>Errors</h3>
              <p>
                400 invalid_parameters: invalid, unknown or repeated query parameters. 503
                unavailable: published data could not load; retry later. Errors use{" "}
                <code>{`{ "error": { "code": "…", "message": "…" } }`}</code>. An empty successful
                response is 200, not an error. Other HTTP methods are not supported.
              </p>
              <p>
                Draft planning downloads are separate resources, not part of the published v1 API.
                Public endpoints have a 60-request/minute per-process backstop (shared unless a
                trusted proxy is configured). 429 responses include Retry-After in seconds.
                Distributed edge limits are required before production launch.
              </p>
              <p>
                Allowed browser origins receive CORS headers for read-only access, without
                credentials. Unlisted browser origins receive 403 origin_rejected. Check{" "}
                <Link href="/api/status" prefetch={false}>
                  service health
                </Link>{" "}
                for current database reachability; this is a live check, not historical uptime or an
                SLA.
              </p>
            </section>
            <section className="commons-info-band">
              <h2>Data contract</h2>
              <div className="commons-info-columns">
                <div>
                  <h3>Published records</h3>
                  <p>
                    Records include identifiers, category, term, translation, notes, source,
                    license, dialect and version. JSON downloads return an array; JSONL has one
                    record per line. No published data means an empty array or empty JSONL file.
                  </p>
                </div>
                <div>
                  <h3>Draft terminology</h3>
                  <p>
                    The planning list uses English terms, domains and a{" "}
                    <code>needs_translation</code> status. <code>somali: null</code> means no
                    translation is included in this planning export. Published translations are
                    available separately through the v1 API. It is not a reviewed dictionary.
                  </p>
                </div>
                <div>
                  <h3>Licensing</h3>
                  <p>
                    Check the license and source of each record. CC-BY records require attribution.
                    Permission-pending submissions are excluded from published exports; software
                    licensing does not grant rights to third-party text.
                  </p>
                </div>
              </div>
            </section>
            <section className="commons-info-band">
              <h2>Versioned releases</h2>
              <p>
                <Link href="/releases">Open release history</Link>. JSON and JSONL contain the same
                frozen records. Keep the licensing manifest alongside either file. SHA256SUMS lists
                hashes of the exact UTF-8 download bytes; verify with <code>sha256sum -c</code> or
                PowerShell <code>Get-FileHash -Algorithm SHA256</code>.
              </p>
              <p>
                Release downloads are frozen snapshots, with a separate licensing manifest. The
                catalog endpoint{" "}
                <Link href="/api/public" prefetch={false}>
                  <code>/api/public</code>
                </Link>{" "}
                lists published entries, articles and up to 100 releases. The catalog loads at most
                500 entries and 500 articles; use the export for the full published-entry download.
              </p>
              {catalog.releases.map((row) => (
                <div className="commons-release" key={row.id}>
                  <strong>v{row.version}</strong>
                  <p>{row.notes}</p>
                  <a href={`/api/releases/${row.id}`}>
                    JSONL <ArrowDownToLine size={15} />
                  </a>
                  <a href={`/api/releases/${row.id}?format=json`}>
                    JSON <ArrowDownToLine size={15} />
                  </a>
                  <a href={`/api/releases/${row.id}?format=manifest`}>
                    License manifest <ArrowDownToLine size={15} />
                  </a>
                  <a href={`/api/releases/${row.id}?format=checksums`}>
                    SHA256SUMS <ArrowDownToLine size={15} />
                  </a>
                </div>
              ))}
              {!loading && !catalog.releases.length && (
                <p>
                  No published releases yet. Reviewers must review entries and editors must publish
                  them before a release can be created. The planning list is not a release.
                </p>
              )}
              {error && <p role="status">{error}</p>}
            </section>
          </>
        )}
        {page === "releases" && (
          <>
            <div className="commons-page-heading">
              <span className="commons-eyebrow">PUBLISHED SNAPSHOTS</span>
              <h1>Release history</h1>
              <p>
                Frozen language datasets with their original sources, licenses and attribution.
                Draft terminology is excluded.
              </p>
            </div>
            {loading && <p role="status">Loading releases...</p>}
            {error && (
              <div role="status">
                <p>{error}</p>
                <button
                  onClick={() => {
                    setLoading(true);
                    setRetry((value) => value + 1);
                  }}
                >
                  Retry
                </button>
              </div>
            )}
            {!loading && !error && !catalog.releases.length && (
              <section className="commons-info-band">
                <h2>No published releases yet</h2>
                <p>
                  Independent review, permission checks and editorial publication come first. We
                  will not fill this catalog with unreviewed translations.
                </p>
                <Link href="/datasets">Browse published entries</Link> ·{" "}
                <Link href="/technology">See terminology in progress</Link>
              </section>
            )}
            {catalog.releases.map((row) => (
              <section className="commons-info-band" key={row.id}>
                <h2>v{row.version}</h2>
                {row.created_at && (
                  <time dateTime={row.created_at}>
                    {new Date(row.created_at).toLocaleDateString("en-GB", { timeZone: "UTC" })}
                  </time>
                )}
                <p style={{ overflowWrap: "anywhere" }}>{row.notes}</p>
                <div className="commons-release-downloads">
                  {[
                    ["json", "JSON"],
                    ["jsonl", "JSONL"],
                    ["manifest", "Licensing and attribution"],
                    ["checksums", "SHA256SUMS"],
                  ].map(([format, label]) => (
                    <a key={format} href={`/api/releases/${row.id}?format=${format}`} download>
                      {label} <ArrowDownToLine size={15} />
                    </a>
                  ))}
                </div>
              </section>
            ))}
            <section className="commons-info-band">
              <h2>Verify a download</h2>
              <p>
                Download SHA256SUMS and compare the SHA-256 hash for the file you use. Keep its
                licensing manifest: attribution obligations apply to CC-BY records. Checksums detect
                changed bytes, not linguistic correctness. Frozen releases are reproducible; the
                live API may change as new records are published.
              </p>
            </section>
          </>
        )}
        {page === "about" && (
          <>
            <div className="commons-page-heading">
              <span className="commons-eyebrow">THE PROJECT</span>
              <h1>About QaamuusAi</h1>
              <p>
                A community-governed foundation for Somali language knowledge, digital tools and
                learning.
              </p>
            </div>
            <section className="commons-info-band">
              <h2>Our goal</h2>
              <p>
                Make Somali language resources easier to contribute, verify and reuse. We are
                building a commons of vocabulary, translations, grammar and articles, with
                provenance, dialect variation and licensing preserved.
              </p>
            </section>
            <section className="commons-info-band">
              <h2>Contribute and get in touch</h2>
              <p>
                Propose vocabulary, supply source evidence or apply to become a reviewer through the
                community workspace. Applications are reviewed independently; technical
                administration does not decide terminology.
              </p>
              <Link href="/join">Request to contribute</Link> ·{" "}
              <Link href="/dashboard/scholars">Reviewer applications</Link>
              {process.env.NEXT_PUBLIC_CONTACT_EMAIL && (
                <p>
                  <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}>
                    {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
                  </a>
                </p>
              )}
            </section>
            <section className="commons-info-band">
              <h2>Somali in technology</h2>
              <p>
                Our first terminology goal is 1,000 common technology and interface terms: home,
                overview, dashboard, accounts, development, data and everyday digital work. The
                current {technologyTerms.length}-term English planning list is a starting point.
                Somali equivalents must be proposed and independently reviewed, not automatically
                treated as authoritative.
              </p>
              <Link href="/technology">
                Explore the planning list <ArrowRight size={16} />
              </Link>
            </section>
            <div className="commons-info-columns commons-info-band">
              <div>
                <ShieldCheck size={24} />
                <h2>Community review</h2>
                <p>
                  Contributors propose. Independent reviewers assess. Editors coordinate and
                  publish. Technical administration does not confer linguistic authority. Governance
                  is provisional until ratified by founding reviewers.
                </p>
              </div>
              <div>
                <Layers size={24} />
                <h2>Transparent data</h2>
                <p>
                  Corrections and review decisions retain their history. Sources and permissions
                  remain visible, and unresolved reuse rights block publication.
                </p>
              </div>
              <div>
                <Globe size={24} />
                <h2>Open participation</h2>
                <p>
                  Anyone can browse published data. New contributors request access and receive an
                  email invitation after approval. Proposals require independent review before
                  editorial publication.
                </p>
              </div>
            </div>
            <Link className="commons-inline-button" href="/join">
              Contribute to the commons <ArrowRight size={16} />
            </Link>
          </>
        )}
        {page === "articles" && (
          <>
            <div className="commons-page-heading">
              <span className="commons-eyebrow">KNOWLEDGE & CONTEXT</span>
              <h1>Articles</h1>
              <p>Published writing on Somali language, usage and the work of the commons.</p>
            </div>
            {loading ? (
              <p className="commons-empty">Loading articles...</p>
            ) : error ? (
              <p role="status">{error}</p>
            ) : (
              <>
                {catalog.articles.map((row) => (
                  <button
                    className="commons-article-row"
                    key={row.id}
                    onClick={() => setSelected(row.id)}
                  >
                    <FileText size={23} />
                    <span>
                      <strong>{row.title}</strong>
                      <span>{row.summary}</span>
                    </span>
                    <ArrowUpRight size={19} />
                  </button>
                ))}
                {!catalog.articles.length && (
                  <div className="commons-empty">
                    <FileText size={28} />
                    <h2>No published articles yet.</h2>
                    <Link href="/about">
                      About the project <ArrowRight size={16} />
                    </Link>
                  </div>
                )}
              </>
            )}
            {currentArticle && (
              <article className="commons-detail">
                <button
                  className="commons-close"
                  aria-label="Close article"
                  onClick={() => setSelected(null)}
                >
                  <X size={20} />
                </button>
                <h2>{currentArticle.title}</h2>
                <p>{currentArticle.summary}</p>
                <div className="commons-body">{currentArticle.body}</div>
                <dl>
                  <dt>Source</dt>
                  <dd>{currentArticle.source}</dd>
                  <dt>License</dt>
                  <dd>{currentArticle.license}</dd>
                </dl>
              </article>
            )}
          </>
        )}
      </main>
      <footer className="commons-footer">
        <span>
          QaamuusAi <span>Somali language commons</span>
        </span>
        <div>
          <Link href="/about">Our goal</Link>
          <Link href="/ai">AI vision & roadmap</Link>
          <Link href="/developers">Developer access</Link>
          <Link href="/releases">Release history</Link>
          <Link href="/join">Contribute</Link>
          <Link href="/contributor-guide">Contributor guide</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/login">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
