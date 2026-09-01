"use client";

import Link from "next/link";
import { Download, Heart, TrendingUp } from "lucide-react";
import type { Skill } from "@/types/skill";
import { compactNumber, cn } from "@/lib/utils";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkillSigil } from "./skill-sigil";
import { CompatBadges } from "./compat-badges";
import { useFavorites } from "./favorites-provider";

/**
 * The inventory item. Hover lifts the slab and runs a light sheen across it;
 * the accent rail on the left is the "rarity" cue.
 */
export function SkillCard({ skill, compact = false }: { skill: Skill; compact?: boolean }) {
  const { isFavorite, toggle } = useFavorites();
  const faved = isFavorite(skill.id);

  return (
    <Panel
      interactive
      className="group flex flex-col overflow-hidden focus-within:border-accent/55"
    >
      {/* accent rail */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] bg-accent/45 transition-colors duration-200 group-hover:bg-accent"
      />
      {/* sheen on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      >
        <span className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent motion-safe:group-hover:animate-[ls-sheen_900ms_ease-out]" />
      </span>

      <div className="relative flex flex-1 flex-col p-4 pl-5">
        <div className="flex items-start gap-3">
          <SkillSigil seed={skill.slug} size={44} />

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <Link
                href={`/skills/${skill.slug}`}
                className="min-w-0 flex-1 outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
              >
                <h3 className="truncate text-[15px] font-semibold leading-tight text-ink transition-colors group-hover:text-accent-hi">
                  {skill.name}
                </h3>
              </Link>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggle(skill);
                }}
                aria-pressed={faved}
                aria-label={faved ? "Remove from favorites" : "Add to favorites"}
                className={cn(
                  "relative z-10 -mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center transition-colors",
                  faved ? "text-fail" : "text-faint hover:text-dim"
                )}
              >
                <Heart size={15} fill={faved ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] text-faint">
              <span className="truncate">{skill.source}</span>
              {skill.installs !== null && (
                <span className="flex items-center gap-1">
                  <Download size={10} />
                  {compactNumber(skill.installs)}
                </span>
              )}
              {skill.trendingRank !== null && skill.trendingRank <= 10 && (
                <span className="flex items-center gap-1 text-accent">
                  <TrendingUp size={10} />#{skill.trendingRank}
                </span>
              )}
            </div>
          </div>
        </div>

        {skill.summary ? (
          <p
            className={cn(
              "mt-3 text-[13px] leading-relaxed text-dim",
              compact ? "line-clamp-1" : "line-clamp-2"
            )}
          >
            {skill.summary}
          </p>
        ) : (
          // The registry does not send summaries with listings; the skill's own
          // description is read from SKILL.md on the detail page.
          <p className="mt-3 text-[13px] italic leading-relaxed text-faint">
            Open for details
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <CompatBadges
            compatibility={skill.compatibility}
            max={compact ? 1 : 2}
            whenUnknown="none"
          />
          <div className="flex items-center gap-2">
            {skill.isDemo && <Badge tone="demo">Sample</Badge>}
            <Button
              size="sm"
              pixel
              className="relative z-10 text-[10px]"
              onClick={(e) => e.preventDefault()}
            >
              INSTALL
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function SkillGrid({ skills }: { skills: Skill[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {skills.map((s) => (
        <SkillCard key={s.id} skill={s} />
      ))}
    </div>
  );
}
