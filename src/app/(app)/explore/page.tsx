import type { Metadata } from "next";
import { getProviderInfo, getSkillsProvider } from "@/lib/providers";
import { ExploreClient } from "./explore-client";

// Rendered per request, never at build time. This page depends on the
// signed-in session and on live registry data, and reaching the registry
// during prerendering is what timed the build out.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore",
  description: "Browse and search AI skills by category, agent, and popularity.",
};

export default async function ExplorePage() {
  const initial = await getSkillsProvider().list({ view: "trending", perPage: 24 });
  return <ExploreClient initial={initial} provider={getProviderInfo()} />;
}
