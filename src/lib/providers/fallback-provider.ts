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
/**
 * How long to stop calling a failing registry.
 *
 * Without this, every visitor pays the full timeout before falling back —
 * a ten-second wait on every page load, repeated for a source we already
 * know is not answering. One request finds out; the rest are served
 * immediately from samples until the window passes.
 */
const COOLDOWN_MS = 60_000;

export class FallbackSkillsProvider implements SkillsProvider {
  private degraded = false;
  private cooldownUntil = 0;
  /** Why the live provider was last refused, for diagnostics. */
  lastError: string | null = null;

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
    // Still inside the cooldown: do not make the user wait to rediscover a
    // failure we recorded a moment ago.
    if (this.cooldownUntil > Date.now()) {
      return run(this.backup);
    }

    try {
      const result = await run(this.live);
      this.degraded = false;
      this.cooldownUntil = 0;
      return result;
    } catch (err) {
      // Logged rather than swallowed: silently serving samples in production
      // is the exact failure this class exists to make visible.
      console.error(`[skills] live registry ${label} failed, serving samples:`, err);
      this.lastError = `${(err as Error)?.name ?? "Error"}: ${(err as Error)?.message ?? String(err)}`.slice(0, 300);
      this.degraded = true;
      this.cooldownUntil = Date.now() + COOLDOWN_MS;
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
