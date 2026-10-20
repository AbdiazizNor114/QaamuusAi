import { notFound } from "next/navigation";
import { WorkspaceApp } from "@/components/workspace-app";
import { SharedWorkspace } from "@/components/shared-workspace";
import { PublicSite } from "@/components/public-site";
import type { Metadata } from "next";
import { publicPages, siteOrigin } from "@/lib/site-info";
const pages = [
  "",
  "about",
  "developers",
  "technology",
  "releases",
  "datasets",
  "articles",
  "contribute",
  "login",
  "reset-password",
  "dashboard",
  "dashboard/submissions",
  "dashboard/terminology",
  "dashboard/reviews",
  "dashboard/disputes",
  "dashboard/profile",
  "dashboard/scholars",
  "dashboard/articles",
  "dashboard/releases",
  "admin/roles",
  "admin",
];
export async function generateMetadata({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}): Promise<Metadata> {
  const { path = [] } = await params;
  const page = path.join("/");
  if (!(page in publicPages)) return { robots: { index: false, follow: false } };
  const info = publicPages[page as keyof typeof publicPages];
  const origin = siteOrigin();
  const canonical = origin ? `${origin}/${page}` : undefined;
  return {
    ...info,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      ...info,
      type: "website",
      siteName: "qaamuusAi",
      ...(canonical ? { url: canonical } : {}),
    },
    robots: { index: !!origin, follow: !!origin },
  };
}
export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const segments = path ?? [];
  const demo = segments[0] === "demo";
  const shared = segments[0] === "shared";
  const page = (demo || shared ? segments.slice(1) : segments).join("/");
  if (!pages.includes(page)) notFound();
  if (!demo && !shared && page in publicPages) return <PublicSite page={page} />;
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if ((configured || shared || page === "reset-password") && !demo && page !== "about")
    return (
      <SharedWorkspace
        page={page === "" ? "datasets" : page === "contribute" ? "dashboard/submissions" : page}
      />
    );
  return <WorkspaceApp page={page} />;
}
