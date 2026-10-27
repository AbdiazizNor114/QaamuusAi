"use client";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  ClipboardCheck,
  FilePenLine,
  BookOpen,
  MessageSquare,
  UserCheck,
  CircleCheck,
  Clock3,
} from "lucide-react";
import { useLocale } from "@/lib/locale";
import { reviewQueue, type SharedState } from "@/lib/shared";
import { articleActionCount, type SharedCommunity } from "@/lib/shared-community";
import { ProjectWorkspace } from "./project-workspace";
import { workspaceCounts } from "@/lib/workspace-counts";

export function DashboardOverview({
  state,
  community,
  onCreate,
  onSelect,
}: {
  state: SharedState;
  community: SharedCommunity;
  onCreate: () => void;
  onSelect: (id: string) => void;
}) {
  const { tr, language } = useLocale();
  const pathname = usePathname();
  const href = (path: string) => (pathname.startsWith("/shared") ? `/shared${path}` : path);
  const counts = workspaceCounts(state, community);
  const own = state.revisions
    .filter((row) => row.author_id === state.user?.id)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  const reviews = reviewQueue(state);
  const disputes = state.roles.includes("editor")
    ? state.disputes.filter(
        (item) =>
          !item.resolved_at &&
          state.revisions.some(
            (row) =>
              row.id === item.revision_id &&
              row.status === "disputed" &&
              row.author_id !== state.user?.id,
          ),
      ).length
    : 0;
  const actions = [
    {
      path: "/dashboard/submissions",
      label: "Requested changes",
      count: counts.submissions,
      Icon: FilePenLine,
      tone: "coral",
    },
    {
      path: "/dashboard/reviews",
      label: "Review queue",
      count: reviews.length,
      Icon: ClipboardCheck,
      tone: "teal",
    },
    {
      path: "/dashboard/articles",
      label: "Article proposals",
      count: articleActionCount(state, community),
      Icon: BookOpen,
      tone: "blue",
    },
    {
      path: "/dashboard/disputes",
      label: "Open disputes",
      count: disputes,
      Icon: MessageSquare,
      tone: "coral",
    },
    {
      path: "/dashboard/scholars",
      label: "Pending applications",
      count: counts.scholars,
      Icon: UserCheck,
      tone: "blue",
    },
  ].filter((item) => item.count > 0);
  const activity = [
    ...state.reviewHistory.map((item) => ({
      ...item,
      title: state.revisions.find((row) => row.id === item.revision_id)?.term,
      path:
        state.revisions.find((row) => row.id === item.revision_id)?.author_id === state.user?.id
          ? "/dashboard/submissions"
          : "/dashboard/reviews",
      kind: "dataset",
    })),
    ...community.decisions.map((item) => ({
      ...item,
      title: community.articleRevisions.find((row) => row.id === item.revision_id)?.title,
      path: "/dashboard/articles",
      kind: "article",
    })),
  ]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 5);
  const locale = language === "so" ? "so-SO" : "en-GB";
  return (
    <div className="work-overview">
      <section className="work-identity" aria-label={tr("Current account")}>
        <span className="work-avatar" aria-hidden="true">
          {state.profile?.display_name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0])
            .join("")}
        </span>
        <div className="work-identity-copy">
          <span className="work-eyebrow">{tr("Current account")}</span>
          <strong>{state.profile?.display_name}</strong>
          <span>{state.user?.email}</span>
        </div>
        <div className="work-role-list">
          {(state.roles.length ? state.roles : ["Member"]).map((role) => (
            <span key={role}>{tr(role.replaceAll("_", " "))}</span>
          ))}
        </div>
        <button className="primary work-create" onClick={onCreate}>
          <Plus size={17} aria-hidden="true" />
          {tr("New submission")}
        </button>
      </section>
      {state.user && <ProjectWorkspace userId={state.user.id} roles={state.roles} summary />}
      <div className="work-totals">
        {[
          {
            label: "My submissions",
            value: own.length,
            Icon: FilePenLine,
            path: "/dashboard/submissions",
          },
          {
            label: "Review queue",
            value: reviews.length,
            Icon: ClipboardCheck,
            path: "/dashboard/reviews",
          },
          {
            label: "Article proposals",
            value: community.articleRevisions.filter((row) => row.author_id === state.user?.id)
              .length,
            Icon: BookOpen,
            path: "/dashboard/articles",
          },
          {
            label: "Published entries",
            value: state.entries.length,
            Icon: CircleCheck,
            path: "/datasets",
          },
        ]
          .filter(
            (item) =>
              item.path !== "/dashboard/reviews" ||
              state.roles.some((role) => ["reviewer", "editor"].includes(role)),
          )
          .map(({ label, value, Icon, path }) => (
            <NextLink href={href(path)} className="work-total" key={label}>
              <span>
                <Icon size={16} aria-hidden="true" />
                {tr(label)}
              </span>
              <strong>{value}</strong>
              <ArrowUpRight size={15} aria-hidden="true" />
            </NextLink>
          ))}
      </div>
      <div className="work-columns">
        <section className="work-inbox" aria-label={tr("Needs your action")}>
          <div className="work-section-heading">
            <h2>{tr("Needs your action")}</h2>
            <span className="work-total-badge">
              {actions.reduce((sum, item) => sum + item.count, 0)}
            </span>
          </div>
          {actions.length ? (
            actions.map(({ path, label, count, Icon, tone }) => (
              <NextLink href={href(path)} className={`work-action tone-${tone}`} key={path}>
                <span className="work-action-icon">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <span>{tr(label)}</span>
                <strong>{count}</strong>
                <ArrowRight size={17} aria-hidden="true" />
              </NextLink>
            ))
          ) : (
            <div className="work-empty">
              <CircleCheck size={28} aria-hidden="true" />
              <p>{tr("No actions waiting.")}</p>
            </div>
          )}
        </section>
        <section className="work-feed" aria-label={tr("Recent activity")}>
          <div className="work-section-heading">
            <h2>{tr("Recent activity")}</h2>
            <Clock3 size={17} aria-hidden="true" />
          </div>
          {activity.length ? (
            activity.map((item) => (
              <NextLink
                href={href(item.path)}
                className="work-event"
                key={`${item.kind}-${item.id}`}
              >
                <span className={`work-event-mark status-${item.decision}`} aria-hidden="true">
                  <ClipboardCheck size={15} />
                </span>
                <div>
                  <strong>{item.title ?? tr("Submission")}</strong>
                  <span className={`work-status status-${item.decision}`}>
                    {tr(item.decision.replaceAll("_", " "))}
                  </span>
                  <time dateTime={item.created_at}>
                    {new Date(item.created_at).toLocaleString(locale)}
                  </time>
                </div>
              </NextLink>
            ))
          ) : (
            <div className="work-empty">
              <Clock3 size={28} aria-hidden="true" />
              <p>{tr("No recent activity.")}</p>
            </div>
          )}
        </section>
      </div>
      <section className="work-submissions" aria-label={tr("My submissions")}>
        <div className="work-section-heading">
          <h2>{tr("My submissions")}</h2>
          <NextLink href={href("/dashboard/submissions")}>
            {tr("View all")}
            <ArrowUpRight size={15} aria-hidden="true" />
          </NextLink>
        </div>
        {own.length ? (
          <div className="work-entry-list">
            {own.slice(0, 5).map((row) => (
              <button key={row.id} className="work-entry" onClick={() => onSelect(row.id)}>
                <span>
                  <strong>{row.term}</strong>
                  <small>{row.translation}</small>
                </span>
                <span className={`work-status status-${row.status}`}>
                  {tr(row.status?.replaceAll("_", " ") ?? "draft")}
                </span>
                <time dateTime={row.updated_at}>
                  {new Date(row.updated_at).toLocaleDateString(locale)}
                </time>
                <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <p className="work-empty-text">{tr("No submissions found.")}</p>
        )}
      </section>
    </div>
  );
}
