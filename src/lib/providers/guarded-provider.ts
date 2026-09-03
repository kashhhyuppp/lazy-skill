import "server-only";
import type { Skill, SkillPage, SkillQuery } from "@/types/skill";
import type { ProviderCapabilities, SkillsProvider } from "./types";

/**
 * Wraps the live registry so a failure degrades honestly instead of loudly.
 *
 * This used to serve invented sample skills when the registry was down. That
 * is worse than showing nothing: a page of plausible-looking skills that do
 * not exist is a lie the user cannot detect, and they are one tap from trying
 * to install one. An empty page that says the registry is not answering is
 * both true and actionable.
 *
 * What survives from the old version is the circuit breaker, which is the
 * part that was actually earning its keep.
 */

/**
 * How long to stop calling a failing registry.
 *
 * Without this, every visitor pays the full timeout before giving up — a
 * fifteen-second wait on every page load, for a source we already know is not
 * answering. One request finds out; the rest fail fast until the window
 * passes. The upstream registry has been measured between 0.9 and 6.2
 * seconds, and times out outright often enough to matter.
 */
const COOLDOWN_MS = 20_000;

export class GuardedSkillsProvider implements SkillsProvider {
  private cooldownUntil = 0;
  /** Why the live provider was last refused, for diagnostics. */
  lastError: string | null = null;

  constructor(private readonly live: SkillsProvider) {}

  get id() {
    return this.live.id;
  }

  get label() {
    return this.live.label;
  }

  get capabilities(): ProviderCapabilities {
    return this.live.capabilities;
  }

  private emptyPage(query: SkillQuery): SkillPage {
    return {
      skills: [],
      page: query.page ?? 1,
      perPage: query.perPage ?? 24,
      hasMore: false,
      providerId: this.live.id,
      degraded: true,
    };
  }

  private async attempt<T>(
    run: (provider: SkillsProvider) => Promise<T>,
    onFailure: () => T,
    label: string
  ): Promise<T> {
    if (this.cooldownUntil > Date.now()) return onFailure();

    try {
      const result = await run(this.live);
      this.cooldownUntil = 0;
      // Cleared on success, or the diagnostic outlives the problem and
      // reports a failure that is no longer happening.
      this.lastError = null;
      return result;
    } catch (err) {
      // Logged rather than swallowed: a registry that is quietly failing in
      // production is the exact thing this class exists to make visible.
      console.error(`[skills] registry ${label} failed:`, err);
      this.lastError = `${(err as Error)?.name ?? "Error"}: ${
        (err as Error)?.message ?? String(err)
      }`.slice(0, 300);
      this.cooldownUntil = Date.now() + COOLDOWN_MS;
      return onFailure();
    }
  }

  list(query: SkillQuery): Promise<SkillPage> {
    return this.attempt((p) => p.list(query), () => this.emptyPage(query), "list");
  }

  search(query: SkillQuery): Promise<SkillPage> {
    return this.attempt((p) => p.search(query), () => this.emptyPage(query), "search");
  }

  get(slug: string): Promise<Skill | null> {
    return this.attempt((p) => p.get(slug), () => null, "get");
  }

  related(slug: string, limit?: number): Promise<Skill[]> {
    return this.attempt((p) => p.related(slug, limit), () => [], "related");
  }
}
