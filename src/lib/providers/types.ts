import type { Skill, SkillPage, SkillQuery, SkillView } from "@/types/skill";

/**
 * What a given registry can actually answer.
 *
 * Sources differ in what metadata they publish. Rather than showing filters
 * that silently do nothing, the UI reads these flags and hides controls the
 * active provider cannot honour.
 */
export interface ProviderCapabilities {
  /** Publishes a category taxonomy, so category browse/filter is meaningful. */
  categories: boolean;
  /** Publishes per-agent compatibility. */
  agentCompatibility: boolean;
  /** Listing records carry a summary. When false, cards show a name and stats
   *  only until the detail page is opened. */
  listingSummaries: boolean;
  /** Sort orders the source can serve. */
  views: SkillView[];
}

/**
 * The one seam between Lazy Skill and whatever registry backs it (§17).
 *
 * Nothing outside `lib/providers` may import a registry SDK or know a
 * registry URL. Swapping the source — or fanning out to several — is a change
 * confined to this folder.
 */
export interface SkillsProvider {
  /** Short stable id, surfaced in the UI so users know where data came from. */
  readonly id: string;
  readonly label: string;
  /** True when this provider serves sample content rather than live data. */
  readonly isDemo: boolean;
  readonly capabilities: ProviderCapabilities;

  list(query: SkillQuery): Promise<SkillPage>;
  search(query: SkillQuery): Promise<SkillPage>;
  get(slug: string): Promise<Skill | null>;
  related(slug: string, limit?: number): Promise<Skill[]>;
}
