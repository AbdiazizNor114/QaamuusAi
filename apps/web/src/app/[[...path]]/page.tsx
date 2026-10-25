import { notFound } from "next/navigation";
import { SharedWorkspace } from "@/components/shared-workspace";
import { PublicSite } from "@/components/public-site";
import type { Metadata } from "next";
import { publicPages, siteOrigin } from "@/lib/site-info";
const pages = [
  "",
  "about",
  "ai",
  "developers",
  "technology",
  "releases",
  "datasets",
  "articles",
  "contribute",
  "login",
  "join",
  "admin/contributors",
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
  if (segments[0] === "demo") notFound();
  const shared = segments[0] === "shared";
  const page = (shared ? segments.slice(1) : segments).join("/");
  if (!pages.includes(page)) notFound();
  if (!shared && page in publicPages) return <PublicSite page={page} />;
  return (
    <SharedWorkspace
      page={page === "" ? "datasets" : page === "contribute" ? "dashboard/submissions" : page}
    />
  );
}
