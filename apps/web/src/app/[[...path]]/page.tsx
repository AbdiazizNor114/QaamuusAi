import { notFound } from "next/navigation";
import { WorkspaceApp } from "@/components/workspace-app";
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
  const page = (path ?? []).join("/");
  if (!pages.includes(page)) notFound();
  return <WorkspaceApp page={page} />;
}
