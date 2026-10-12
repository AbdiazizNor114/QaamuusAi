import { notFound } from "next/navigation";
import { WorkspaceApp } from "@/components/workspace-app";
import { SharedWorkspace } from "@/components/shared-workspace";
const pages = [
  "",
  "about",
  "datasets",
  "articles",
  "contribute",
  "login",
  "dashboard",
  "dashboard/submissions",
  "dashboard/reviews",
  "dashboard/disputes",
  "dashboard/profile",
  "dashboard/scholars",
  "dashboard/articles",
  "dashboard/releases",
  "admin/roles",
  "admin",
];
export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const segments = path ?? [];
  const demo = segments[0] === "demo";
  const shared = segments[0] === "shared";
  const page = (demo || shared ? segments.slice(1) : segments).join("/");
  if (!pages.includes(page)) notFound();
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if ((configured || shared) && !demo && page !== "about")
    return (
      <SharedWorkspace
        page={page === "" ? "datasets" : page === "contribute" ? "dashboard/submissions" : page}
      />
    );
  return <WorkspaceApp page={page} />;
}
