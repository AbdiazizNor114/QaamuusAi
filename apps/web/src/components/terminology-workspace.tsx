"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, Pencil, Eye } from "lucide-react";
import { technologyTerms } from "@/lib/technology-terms";
import { seedRecords, type TechnologySeed } from "@/lib/terminology";
import type { SharedState, SharedRecord } from "@/lib/shared";
import { termClaimsSchema, type TermClaim } from "@/lib/term-claims";

export function TerminologyWorkspace({
  state,
  onPropose,
  onEdit,
  onSelect,
  onClaimAction,
}: {
  state: SharedState;
  onPropose: (seed: TechnologySeed) => void;
  onEdit: (record: SharedRecord) => void;
  onSelect: (id: string) => void;
  onClaimAction: (body: {
    action: "claim" | "release";
    seed_id: string;
    claim_id?: string;
  }) => Promise<boolean>;
}) {
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [claimFilter, setClaimFilter] = useState("all");
  const [claims, setClaims] = useState<TermClaim[] | null>(null);
  const [claimsError, setClaimsError] = useState("");
  const [pendingClaim, setPendingClaim] = useState<string | null>(null);
  const claimSequence = useRef(0);
  const claimInFlight = useRef(false);
  const userId = state.user?.id;
  const loadClaims = useCallback(async () => {
    const sequence = ++claimSequence.current;
    try {
      const response = await fetch("/api/terminology/claims", { cache: "no-store" });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Your session expired. Sign in again to use claims."
            : "Shared claims unavailable. The claim migration may need to be applied.",
        );
      const data = termClaimsSchema.parse(await response.json());
      if (sequence === claimSequence.current) {
        setClaims(data);
        setClaimsError("");
      }
    } catch (error) {
      if (sequence === claimSequence.current) {
        setClaims(null);
        setClaimsError(error instanceof Error ? error.message : "Could not load shared claims.");
      }
    }
  }, []);
  const invalidateClaims = useCallback(() => {
    ++claimSequence.current;
  }, []);
  useEffect(() => {
    if (!userId) return;
    queueMicrotask(() => {
      setClaims(null);
      void loadClaims();
    });
    const refresh = () => {
      if (document.visibilityState !== "hidden" && !claimInFlight.current) void loadClaims();
    };
    const interval = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      invalidateClaims();
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [userId, loadClaims, invalidateClaims]);
  async function changeClaim(seedId: string, claim?: TermClaim) {
    if (claimInFlight.current) return;
    claimInFlight.current = true;
    setPendingClaim(seedId);
    try {
      await onClaimAction(
        claim
          ? { action: "release", seed_id: seedId, claim_id: claim.id }
          : { action: "claim", seed_id: seedId },
      );
      await loadClaims();
    } finally {
      claimInFlight.current = false;
      setPendingClaim(null);
    }
  }
  const claimMap = new Map((claims ?? []).map((claim) => [claim.seed_id, claim]));
  const canClaim = state.roles.includes("reviewer") || state.roles.includes("editor");
  const grouped = seedRecords([...state.revisions, ...state.entries]);
  const filtered = technologyTerms.filter((seed) => {
    const records = grouped.get(seed.id) ?? [];
    return (
      (topic === "all" || seed.category === topic) &&
      (claimFilter === "all" ||
        (claims !== null &&
          (claimFilter === "mine"
            ? claimMap.get(seed.id)?.owner_id === userId
            : claimFilter === "available"
              ? !claimMap.has(seed.id)
              : claimMap.has(seed.id)))) &&
      `${seed.english} ${records.map((record) => record.term).join(" ")}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()) &&
      (status === "all" ||
        (status === "none"
          ? !records.length
          : records.some((record) => (record.status ?? "published") === status)))
    );
  });
  const pages = Math.max(1, Math.ceil(filtered.length / 30));
  const currentPage = Math.min(page, pages);
  const all = [...grouped.values()];
  return (
    <section className="terminology-workspace" aria-label="Technology terminology workspace">
      <div className="terminology-totals">
        <div>
          <strong>{technologyTerms.length}</strong>
          <span>Starter terms</span>
        </div>
        <div>
          <strong>
            {
              all.filter((rows) => rows.some((row) => (row.status ?? "published") === "published"))
                .length
            }
          </strong>
          <span>Published terms</span>
        </div>
        <div>
          <strong>
            {
              all.filter((rows) =>
                rows.some((row) => ["submitted", "under_review"].includes(row.status ?? "")),
              ).length
            }
          </strong>
          <span>Terms in review</span>
        </div>
        <div>
          <strong>
            {
              all
                .flat()
                .filter(
                  (row) =>
                    row.author_id === state.user?.id &&
                    ["draft", "changes_requested"].includes(row.status ?? ""),
                ).length
            }
          </strong>
          <span>Your editable proposals</span>
        </div>
      </div>
      <p className="terminology-scope">
        Progress reflects loaded records visible to your account, not private drafts belonging to
        other members.
      </p>
      {claimsError && (
        <div role="status" className="terminology-claim-notice">
          {claimsError} <button onClick={() => void loadClaims()}>Retry claims</button>
        </div>
      )}
      <div className="shared-toolbar">
        <label className="shared-search">
          <Search size={18} />
          <input
            aria-label="Search terminology"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search English or proposed Somali term"
          />
        </label>
        <select
          aria-label="Terminology topic"
          value={topic}
          onChange={(event) => {
            setTopic(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">All topics</option>
          {[...new Set(technologyTerms.map((seed) => seed.category))].map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          aria-label="Terminology status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">All statuses</option>
          <option value="none">No visible proposal</option>
          {[
            "draft",
            "submitted",
            "under_review",
            "changes_requested",
            "approved",
            "disputed",
            "published",
            "rejected",
          ].map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="terminology-claim-toolbar">
        <label>
          Claims
          <select
            aria-label="Term claim filter"
            value={claimFilter}
            onChange={(event) => {
              setClaimFilter(event.target.value);
              setPage(1);
            }}
            disabled={claims === null}
          >
            <option value="all">All terms</option>
            <option value="available">Unclaimed</option>
            <option value="mine">My claims</option>
            <option value="claimed">Claimed terms</option>
          </select>
        </label>
        <span>
          {claims === null
            ? claimsError
              ? "Claim status unavailable"
              : "Loading shared claims..."
            : `${claims.length} active claims · ${claims.filter((claim) => claim.owner_id === userId).length} yours`}
        </span>
      </div>
      <div className="terminology-pagination">
        <span role="status">
          {filtered.length} {filtered.length === 1 ? "term" : "terms"} · Page {currentPage} of{" "}
          {pages}
        </span>
        <div>
          <button
            aria-label="Previous terminology page"
            title="Previous page"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            aria-label="Next terminology page"
            title="Next page"
            disabled={currentPage === pages}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      {!filtered.length && (
        <div className="workspace-empty">
          <h2>No matching terms</h2>
          <button
            onClick={() => {
              setSearch("");
              setTopic("all");
              setStatus("all");
              setPage(1);
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <div className="terminology-rows">
        {filtered.slice((currentPage - 1) * 30, currentPage * 30).map((seed) => {
          const records = grouped.get(seed.id) ?? [];
          const claim = claimMap.get(seed.id);
          const editable = records.find(
            (row) =>
              row.author_id === state.user?.id &&
              ["draft", "changes_requested"].includes(row.status ?? ""),
          );
          return (
            <article className="terminology-row" key={seed.id}>
              <div>
                <h2>{seed.english}</h2>
                <small>{seed.category.replaceAll("_", " ")}</small>
              </div>
              <div className="terminology-proposals">
                <span className="terminology-claim-owner">
                  {claim ? (
                    <>
                      Working on this:{" "}
                      <strong>
                        {claim.owner_id === userId
                          ? `${claim.display_name} (you)`
                          : claim.display_name || "Reviewer"}
                      </strong>{" "}
                      ·{" "}
                      <time dateTime={claim.claimed_at}>
                        {new Date(claim.claimed_at).toLocaleDateString("en-GB")}
                      </time>
                    </>
                  ) : claims !== null ? (
                    "Unclaimed"
                  ) : (
                    "Claim status unavailable"
                  )}
                </span>
                {!records.length && <span>No visible proposal</span>}
                {records.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => onSelect(record.id)}
                    title={`View proposal: ${record.term}`}
                    aria-label={`View proposal: ${record.term}`}
                  >
                    <Eye size={14} />
                    <span>{record.term}</span>
                    <small className={`work-status status-${record.status ?? "published"}`}>
                      {(record.status ?? "published").replaceAll("_", " ")}
                    </small>
                  </button>
                ))}
              </div>
              <div className="terminology-row-actions">
                {claims !== null && (claim?.owner_id === userId || (!claim && canClaim)) && (
                  <button
                    disabled={pendingClaim !== null}
                    onClick={() => void changeClaim(seed.id, claim)}
                  >
                    {pendingClaim === seed.id
                      ? "Saving claim..."
                      : claim
                        ? "Release my claim"
                        : "Claim term"}
                  </button>
                )}
                <button onClick={() => (editable ? onEdit(editable) : onPropose(seed))}>
                  {editable ? <Pencil size={16} /> : <Plus size={16} />}
                  {editable
                    ? "Edit your proposal"
                    : records.length || (claim && claim.owner_id !== userId)
                      ? "Propose alternative"
                      : "Propose Somali term"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
