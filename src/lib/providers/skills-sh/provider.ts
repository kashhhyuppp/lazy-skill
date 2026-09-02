import "server-only";
import type { Skill, SkillPage, SkillQuery } from "@/types/skill";
import type { ProviderCapabilities, SkillsProvider } from "../types";
import { apiGet, SkillsApiError } from "./client";
import { enrichFromDetail, mapAudits, mapSkill } from "./mappers";
import type {
  ApiAuditResponse,
  ApiListResponse,
  ApiSearchResponse,
  ApiSkillDetail,
  ListView,
} from "./types";

/**
 * How many search hits to ask for.
 *
 * The endpoint's ceiling is 200, but larger responses measurably slow it
 * down, and 100 already covers any query a person will scroll through.
 */
const SEARCH_LIMIT = 100;

/** Our sort names -> the registry's `view` parameter. */
const VIEW: Record<string, ListView> = {
  trending: "trending",
  popular: "all-time",
  new: "hot",
};

/**
 * Live provider backed by skills.sh.
 *
 * Everything it cannot answer, it declines to answer. The registry publishes
 * no categories and no per-agent compatibility, so those capabilities are off
 * and the UI hides the corresponding filters rather than pretending.
 */
export class SkillsShProvider implements SkillsProvider {
  readonly id = "skills.sh";
  readonly label = "skills.sh";
  readonly isDemo = false;

  readonly capabilities: ProviderCapabilities = {
    categories: false,
    agentCompatibility: false,
    listingSummaries: false,
    views: ["trending", "popular", "new"],
  };

  async list(query: SkillQuery): Promise<SkillPage> {
    const page = Math.max(0, query.page ?? 0);
    const perPage = Math.min(500, Math.max(1, query.perPage ?? 24));
    const view = VIEW[query.view ?? "trending"] ?? "trending";

    const res = await apiGet<ApiListResponse>("/skills", {
      view,
      page,
      per_page: perPage,
    });

    // Rank is the registry's own ordering within the trending view — a real
    // position, not a score we invented.
    const ranked = view === "trending";
    return {
      skills: res.data.map((s, i) => mapSkill(s, ranked ? page * perPage + i + 1 : null)),
      page: res.pagination.page,
      perPage: res.pagination.perPage,
      hasMore: res.pagination.hasMore,
      providerId: this.id,
      isDemo: false,
    };
  }

  async search(query: SkillQuery): Promise<SkillPage> {
    const q = query.q?.trim() ?? "";
    // The registry rejects anything shorter; answer locally rather than burn
    // a request on a guaranteed 400.
    if (q.length < 2) return this.list(query);

    // The search endpoint takes a limit but has no page parameter, so results
    // cannot be paged through — whatever is asked for here is all the user
    // will ever see. Asking for a browse-sized page meant every search
    // stopped at 24 hits with no way to reach the rest, which reads as "that
    // is all there is". Ask for the registry's documented maximum instead and
    // return the lot.
    const limit = SEARCH_LIMIT;
    const res = await apiGet<ApiSearchResponse>("/skills/search", { q, limit });

    return {
      skills: res.data.map((s) => mapSkill(s)),
      page: 0,
      perPage: res.data.length,
      // Genuinely no more to fetch: there is no next page to ask for.
      hasMore: false,
      providerId: this.id,
      isDemo: false,
    };
  }

  async get(slug: string): Promise<Skill | null> {
    let detail: ApiSkillDetail;
    try {
      detail = await apiGet<ApiSkillDetail>(`/skills/${slug}`);
    } catch (err) {
      if (err instanceof SkillsApiError && err.isNotFound) return null;
      throw err;
    }

    // The detail endpoint omits name/url, so start from a minimal record and
    // let the skill's own SKILL.md fill in what it declares.
    const base = mapSkill({
      id: detail.id,
      slug: detail.slug,
      name: detail.slug.split("/").pop() ?? detail.slug,
      source: detail.source,
      installs: detail.installs,
      sourceType: detail.source.includes(".") ? "well-known" : "github",
      installUrl: null,
      url: "",
    });

    const skill = enrichFromDetail(base, detail);
    return { ...skill, audits: await this.audits(slug) };
  }

  /** A 404 here means nobody has audited the skill — absence, not an error. */
  private async audits(slug: string) {
    try {
      const res = await apiGet<ApiAuditResponse>(`/skills/audit/${slug}`, {}, { revalidate: 3600 });
      return mapAudits(res.audits);
    } catch (err) {
      if (err instanceof SkillsApiError && err.isNotFound) return null;
      throw err;
    }
  }

  /**
   * No category graph is published, so "related" is resolved by searching the
   * skill's own name — the closest honest signal available.
   */
  async related(slug: string, limit = 4): Promise<Skill[]> {
    const name = slug.split("/").pop() ?? "";
    const term = name.replace(/[-_]+/g, " ").trim();
    if (term.length < 2) return [];

    try {
      const res = await this.search({ q: term, perPage: limit + 4 });
      return res.skills.filter((s) => s.slug !== slug).slice(0, limit);
    } catch {
      // Related skills are a nicety; never fail the page over them.
      return [];
    }
  }
}
