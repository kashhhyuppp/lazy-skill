import type { MetadataRoute } from "next";
import { CATEGORY_IDS } from "@/types/skill";
import { getSkillsProvider } from "@/lib/providers";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lazy-skill.vercel.app";

/**
 * Only pages that mean something to a stranger: the landing page, browse,
 * and individual skills. Account pages are excluded — they are per-user and
 * would be empty to a crawler.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: appUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  const provider = getSkillsProvider();

  const categoryRoutes: MetadataRoute.Sitemap = provider.capabilities.categories
    ? CATEGORY_IDS.map((id) => ({
        url: `${appUrl}/category/${id}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }))
    : [];

  // Skill pages are the reason anyone would find this from a search engine,
  // but the registry is slow and sometimes unavailable — so a failure here
  // returns a smaller sitemap rather than no sitemap.
  let skillRoutes: MetadataRoute.Sitemap = [];
  try {
    const trending = await provider.list({ view: "trending", perPage: 100 });
    skillRoutes = trending.skills
      .filter((skill) => !skill.isDemo)
      .map((skill) => ({
        url: `${appUrl}/skills/${skill.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
  } catch {
    // Leave skill routes out this time; the next crawl will pick them up.
  }

  return [...staticRoutes, ...categoryRoutes, ...skillRoutes];
}
