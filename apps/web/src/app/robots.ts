import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site-info";
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return origin
    ? {
        rules: {
          userAgent: "*",
          allow: "/",
          disallow: [
            "/dashboard",
            "/admin",
            "/shared",
            "/demo",
            "/login",
            "/reset-password",
            "/auth",
            "/api",
            "/contribute",
          ],
        },
        sitemap: `${origin}/sitemap.xml`,
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}
