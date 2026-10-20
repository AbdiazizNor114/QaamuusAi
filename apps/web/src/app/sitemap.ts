import type { MetadataRoute } from "next";
import { publicPages, siteOrigin } from "@/lib/site-info";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  return origin ? Object.keys(publicPages).map((page) => ({ url: `${origin}/${page}` })) : [];
}
