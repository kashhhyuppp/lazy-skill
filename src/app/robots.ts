import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lazy-skill.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nothing here is secret — row level security is what protects data —
      // but none of it is useful in an index either, and pairing URLs in
      // particular should never be crawled.
      disallow: ["/api/", "/auth/", "/pair", "/devices", "/favorites", "/library", "/profile"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
