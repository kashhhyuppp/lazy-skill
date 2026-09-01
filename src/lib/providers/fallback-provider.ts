import "server-only";
import type { Skill, SkillPage, SkillQuery } from "@/types/skill";
import type { ProviderCapabilities, SkillsProvider } from "./types";

/**
 * Serves a live registry, and falls back to sample data when it cannot.
 *
 * Two failures are worth surviving: a credential that turns out not to be
 * obtainable at request time, and the registry itself being down. In both
 * cases an empty page or a stack trace is worse than clearly-labelled sample
 * content, because the fallback still says out loud that it is samples.
 *
 * Capabilities follow whichever provider actually answered, so the UI keeps
 * hiding controls the live source cannot honour.
 */
export class FallbackSkillsProvider implements SkillsProvider {
  private degraded = false;

  constructor(
    private readonly live: SkillsProvider,
    private readonly backup: SkillsProvider
  ) {}

  get id() {
    return this.degraded ? this.backup.id : this.live.id;
  }

  get label() {
    return this.degraded ? this.backup.label : this.live.label;
  }

  get isDemo() {
    return this.degraded ? this.backup.isDemo : this.live.isDemo;
  }

  get capabilities(): ProviderCapabilities {
    return this.degraded ? this.backup.capabilities : this.live.capabilities;
  }

  private async attempt<T>(
    run: (provider: SkillsProvider) => Promise<T>,
    label: string
  ): Promise<T> {
    try {
      const result = await run(this.live);
      this.degraded = false;
      return result;
    } catch (err) {
      // Logged rather than swallowed: silently serving samples in production
      // is the exact failure this class exists to make visible.
      console.error(`[skills] live registry ${label} failed, serving samples:`, err);
      this.degraded = true;
      return run(this.backup);
    }
  }

  list(query: SkillQuery): Promise<SkillPage> {
    return this.attempt((p) => p.list(query), "list");
  }

  search(query: SkillQuery): Promise<SkillPage> {
    return this.attempt((p) => p.search(query), "search");
  }

  get(slug: string): Promise<Skill | null> {
    return this.attempt((p) => p.get(slug), "get");
  }

  related(slug: string, limit?: number): Promise<Skill[]> {
    return this.attempt((p) => p.related(slug, limit), "related");
  }
}
