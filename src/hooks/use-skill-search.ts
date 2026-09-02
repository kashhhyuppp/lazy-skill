"use client";

import * as React from "react";
import type { AgentId, CategoryId, SkillPage, SkillView } from "@/types/skill";

export interface SearchParams {
  q: string;
  view: SkillView;
  category?: CategoryId;
  agent?: AgentId;
}

/**
 * Debounced search against /api/skills/search with a per-key result cache
 * and in-flight cancellation, so fast typing never renders a stale page.
 */
export function useSkillSearch(params: SearchParams, initial?: SkillPage) {
  const [data, setData] = React.useState<SkillPage | null>(initial ?? null);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const cache = React.useRef(new Map<string, SkillPage>());
  const key = `${params.q}|${params.view}|${params.category ?? ""}|${params.agent ?? ""}`;

  /**
   * Appends the next page.
   *
   * The registry holds thousands of skills; showing the first 24 and stopping
   * reads as "this is everything there is". Results accumulate rather than
   * replacing, so scroll position and what you were reading survive.
   */
  const loadMore = React.useCallback(async () => {
    if (!data?.hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const search = new URLSearchParams();
      if (params.q) search.set("q", params.q);
      search.set("view", params.view);
      if (params.category) search.set("category", params.category);
      if (params.agent) search.set("agent", params.agent);
      search.set("page", String(data.page + 1));

      const res = await fetch(`/api/skills/search?${search}`);
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const next: SkillPage = await res.json();

      // Guard against a source that repeats entries across pages.
      const seen = new Set(data.skills.map((s) => s.id));
      const merged: SkillPage = {
        ...next,
        skills: [...data.skills, ...next.skills.filter((s) => !seen.has(s.id))],
      };
      cache.current.set(key, merged);
      setData(merged);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }, [data, key, loadingMore, params]);

  React.useEffect(() => {
    const cached = cache.current.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    // Typing gets a debounce; changing a filter should feel instant.
    const delay = params.q ? 220 : 0;

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const search = new URLSearchParams();
        if (params.q) search.set("q", params.q);
        search.set("view", params.view);
        if (params.category) search.set("category", params.category);
        if (params.agent) search.set("agent", params.agent);

        const res = await fetch(`/api/skills/search?${search}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Search failed (${res.status})`);

        const json: SkillPage = await res.json();
        cache.current.set(key, json);
        setData(json);
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, params.q, params.view, params.category, params.agent]);

  return { data, loading, loadingMore, error, loadMore };
}
