import { NextResponse } from "next/server";
import { getSkillsProvider } from "@/lib/providers";
import { CATEGORY_IDS, AGENT_IDS, type CategoryId, type AgentId } from "@/types/skill";

/**
 * Search runs server-side so registry credentials never reach the browser
 * (§17/§50). Every input is validated against a fixed allow-list before it
 * reaches the provider — nothing free-form is forwarded.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  const rawQ = url.searchParams.get("q") ?? "";
  const q = rawQ.slice(0, 128).trim();

  const rawCategory = url.searchParams.get("category");
  const category = (CATEGORY_IDS as readonly string[]).includes(rawCategory ?? "")
    ? (rawCategory as CategoryId)
    : undefined;

  const rawAgent = url.searchParams.get("agent");
  const agent = (AGENT_IDS as readonly string[]).includes(rawAgent ?? "")
    ? (rawAgent as AgentId)
    : undefined;

  const rawView = url.searchParams.get("view");
  const view =
    rawView === "trending" || rawView === "popular" || rawView === "new" ? rawView : undefined;

  const page = Math.min(50, Math.max(0, Number(url.searchParams.get("page")) || 0));

  const provider = getSkillsProvider();
  const result = q
    ? await provider.search({ q, category, agent, page, perPage: 24 })
    : await provider.list({ view: view ?? "trending", category, agent, page, perPage: 24 });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
