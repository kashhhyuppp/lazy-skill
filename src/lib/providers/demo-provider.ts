import type { ProviderCapabilities, SkillsProvider } from "./types";
import type { Skill, SkillPage, SkillQuery } from "@/types/skill";
import { DEMO_SKILLS } from "./demo-data";

/** Cheap subsequence-based fuzzy score. Higher is better; 0 means no match. */
function score(skill: Skill, needle: string): number {
  const q = needle.trim().toLowerCase();
  if (!q) return 1;

  const name = skill.name.toLowerCase();
  const summary = skill.summary.toLowerCase();
  const cats = skill.categories.join(" ");
  const hay = `${name} ${summary} ${cats} ${skill.slug}`;

  if (name === q) return 1000;
  if (name.startsWith(q)) return 800;
  if (name.includes(q)) return 600;
  if (summary.includes(q)) return 380;
  if (cats.includes(q)) return 300;

  // Token match: every word in the query appears somewhere.
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => hay.includes(t))) return 260;

  // Subsequence fallback ("brwsr" -> "browser"), single token only.
  if (tokens.length === 1 && q.length >= 3) {
    let i = 0;
    for (const ch of name) if (ch === q[i]) i++;
    if (i === q.length) return 140;
  }
  return 0;
}

function sortFor(view: SkillQuery["view"], skills: Skill[]): Skill[] {
  const out = [...skills];
  if (view === "trending") {
    return out.sort((a, b) => {
      if (a.trendingRank === null && b.trendingRank === null) return 0;
      if (a.trendingRank === null) return 1;
      if (b.trendingRank === null) return -1;
      return a.trendingRank - b.trendingRank;
    });
  }
  if (view === "new") {
    return out.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  }
  // "popular" — records without a reported count sink to the bottom rather
  // than being treated as zero.
  return out.sort((a, b) => (b.installs ?? -1) - (a.installs ?? -1));
}

function paginate(skills: Skill[], query: SkillQuery, providerId: string): SkillPage {
  const page = Math.max(0, query.page ?? 0);
  const perPage = Math.min(100, Math.max(1, query.perPage ?? 24));
  const start = page * perPage;
  const slice = skills.slice(start, start + perPage);
  return {
    skills: slice,
    page,
    perPage,
    hasMore: start + perPage < skills.length,
    providerId,
    isDemo: true,
  };
}

function applyFilters(skills: Skill[], query: SkillQuery): Skill[] {
  let out = skills;
  if (query.category) out = out.filter((s) => s.categories.includes(query.category!));
  if (query.agent) {
    // Unknown compatibility is excluded from an agent filter rather than
    // assumed compatible (§19).
    out = out.filter((s) => s.compatibility?.includes(query.agent!) ?? false);
  }
  return out;
}

/**
 * Local sample provider. Backs Phase 1 UI work and stays available as the
 * offline/dev fallback once a live registry provider is wired in.
 */
export class DemoSkillsProvider implements SkillsProvider {
  readonly id = "demo";
  readonly label = "Sample data";
  readonly isDemo = true;

  // The fixtures carry the full metadata shape, so every control is live here.
  readonly capabilities: ProviderCapabilities = {
    categories: true,
    agentCompatibility: true,
    listingSummaries: true,
    views: ["trending", "popular", "new"],
  };

  async list(query: SkillQuery): Promise<SkillPage> {
    const filtered = applyFilters(DEMO_SKILLS, query);
    return paginate(sortFor(query.view ?? "trending", filtered), query, this.id);
  }

  async search(query: SkillQuery): Promise<SkillPage> {
    const q = query.q?.trim() ?? "";
    if (!q) return this.list(query);

    const ranked = applyFilters(DEMO_SKILLS, query)
      .map((skill) => ({ skill, s: score(skill, q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || (b.skill.installs ?? -1) - (a.skill.installs ?? -1))
      .map((r) => r.skill);

    return paginate(ranked, query, this.id);
  }

  async get(slug: string): Promise<Skill | null> {
    return DEMO_SKILLS.find((s) => s.slug === slug) ?? null;
  }

  async related(slug: string, limit = 4): Promise<Skill[]> {
    const target = await this.get(slug);
    if (!target) return [];
    return DEMO_SKILLS.filter((s) => s.slug !== slug)
      .map((s) => ({
        s,
        overlap: s.categories.filter((c) => target.categories.includes(c)).length,
      }))
      .filter((r) => r.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap || (b.s.installs ?? -1) - (a.s.installs ?? -1))
      .slice(0, limit)
      .map((r) => r.s);
  }
}
