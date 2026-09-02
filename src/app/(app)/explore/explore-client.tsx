"use client";

import * as React from "react";
import { Clock, Flame } from "lucide-react";
import type { AgentId, CategoryId, SkillPage, SkillView } from "@/types/skill";
import type { ProviderInfo } from "@/lib/providers";
import { AGENTS, AGENT_IDS, CATEGORY_LIST } from "@/types/skill";
import { useSkillSearch } from "@/hooks/use-skill-search";
import {
  POPULAR_SEARCHES,
  getRecentServerSnapshot,
  getRecentSnapshot,
  pushRecent,
  subscribeRecent,
} from "@/lib/recent-searches";
import { SearchBar } from "@/components/search/search-bar";
import { SkillCard } from "@/components/skills/skill-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { DemoDataBanner, SourceNote } from "@/components/layout/data-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VIEWS: { id: SkillView; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "popular", label: "Popular" },
  { id: "new", label: "New" },
];

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg shrink-0 whitespace-nowrap border px-3 py-1.5 text-[12px] transition-colors",
        active
          ? "border-accent/55 bg-accent/12 text-accent-hi"
          : "border-line bg-surface/70 text-dim hover:border-accent/35 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

export function ExploreClient({
  initial,
  provider,
}: {
  initial: SkillPage;
  provider: ProviderInfo;
}) {
  const [q, setQ] = React.useState("");
  const [view, setView] = React.useState<SkillView>("trending");
  const [category, setCategory] = React.useState<CategoryId | undefined>();
  const [agent, setAgent] = React.useState<AgentId | undefined>();
  const recent = React.useSyncExternalStore(
    subscribeRecent,
    getRecentSnapshot,
    getRecentServerSnapshot
  );

  const untouched = !q && view === "trending" && !category && !agent;
  const { data, loading, loadingMore, error, loadMore } = useSkillSearch(
    { q, view, category, agent },
    untouched ? initial : undefined
  );

  const skills = data?.skills ?? [];
  const showSuggestions = !q && (recent.length > 0 || POPULAR_SEARCHES.length > 0);

  const runSearch = (term: string) => {
    setQ(term);
    pushRecent(term);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-pixel text-[17px] text-ink sm:text-[20px]">EXPLORE</h1>
        <p className="mt-2 text-[14px] text-dim">
          Saw it on X? Found it in a Reel? Just search it.
        </p>
      </div>

      <SearchBar
        value={q}
        onChange={setQ}
        onSubmit={runSearch}
        size="lg"
        className="max-w-2xl"
      />

      {showSuggestions && (
        <div className="space-y-3">
          {recent.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 font-pixel text-[9px] uppercase tracking-[0.12em] text-faint">
                <Clock size={11} /> Recent
              </span>
              {recent.map((t) => (
                <Chip key={t} active={false} onClick={() => runSearch(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 font-pixel text-[9px] uppercase tracking-[0.12em] text-faint">
              <Flame size={11} /> Popular
            </span>
            {POPULAR_SEARCHES.map((t) => (
              <Chip key={t} active={false} onClick={() => runSearch(t)}>
                {t}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* filters */}
      <div className="space-y-3 border-y border-line-soft py-4">
        {!q && (
          <div className="flex gap-2">
            {VIEWS.map((v) => (
              <Chip key={v.id} active={view === v.id} onClick={() => setView(v.id)}>
                {v.label}
              </Chip>
            ))}
          </div>
        )}

        {provider.capabilities.categories && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
          <Chip active={!category} onClick={() => setCategory(undefined)}>
            All
          </Chip>
          {CATEGORY_LIST.map((c) => {
            const Icon = c.icon;
            return (
              <Chip
                key={c.id}
                active={category === c.id}
                onClick={() => setCategory(category === c.id ? undefined : c.id)}
              >
                <Icon size={12} className="mr-1.5 inline-block align-[-1px]" />
                {c.label}
              </Chip>
            );
          })}
        </div>
        )}

        {provider.capabilities.agentCompatibility && (
        <div className="flex flex-wrap gap-2">
          <Chip active={!agent} onClick={() => setAgent(undefined)}>
            Any agent
          </Chip>
          {AGENT_IDS.map((id) => {
            const Icon = AGENTS[id].icon;
            return (
              <Chip
                key={id}
                active={agent === id}
                onClick={() => setAgent(agent === id ? undefined : id)}
              >
                <Icon size={12} className="mr-1.5 inline-block align-[-1px]" />
                {AGENTS[id].label}
              </Chip>
            );
          })}
        </div>
        )}
      </div>

      {data?.isDemo ? <DemoDataBanner /> : <SourceNote label={provider.label} />}

      {error ? (
        <EmptyState
          expression="annoyed"
          title="THAT DIDN'T WORK."
          body="Even Lazy Skill gets tired sometimes."
          action={
            <Button variant="secondary" onClick={() => setQ((v) => `${v} `.trim())}>
              Try again
            </Button>
          }
        />
      ) : loading && skills.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[190px]" />
          ))}
        </div>
      ) : skills.length === 0 ? (
        <EmptyState
          expression="curious"
          title="NOTHING MATCHED."
          body={`No skill here answers to "${q}". Try fewer words.`}
          action={
            <Button variant="secondary" onClick={() => setQ("")}>
              Clear search
            </Button>
          }
        />
      ) : (
        <>
          <p className="font-mono text-[11px] text-faint">
            {skills.length} skill{skills.length === 1 ? "" : "s"}
            {q && ` for "${q}"`}
            {data?.hasMore ? " so far" : ""}
          </p>
          <div
            className={cn(
              "grid gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-3",
              loading && "opacity-55"
            )}
          >
            {skills.map((s) => (
              <SkillCard key={s.id} skill={s} />
            ))}
          </div>

          {data?.hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load more skills"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
