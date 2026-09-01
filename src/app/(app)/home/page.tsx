import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Flame, Monitor, Target, Trophy, TrendingUp } from "lucide-react";
import { getProviderInfo, getSkillsProvider } from "@/lib/providers";
import { getPlayerState } from "@/lib/db/gamification";
import { StreakCalendar } from "@/components/gamification/streak-calendar";
import { CATEGORY_LIST } from "@/types/skill";
import { Panel, PanelLabel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PixelProgress } from "@/components/ui/progress";
import { SkillCard } from "@/components/skills/skill-card";
import { Mascot } from "@/components/brand/mascot";
import { DemoDataBanner, SourceNote } from "@/components/layout/data-banner";
import { HomeSearch } from "./home-search";

export const metadata: Metadata = { title: "Home" };

/**
 * Bento grid. Gamification tiles show a genuine empty account — Phase 4
 * wires them to real progress. Nothing here invents a number.
 */
export default async function HomePage() {
  const trending = await getSkillsProvider().list({ view: "trending", perPage: 6 });
  const provider = getProviderInfo();
  const player = await getPlayerState();

  return (
    <div className="space-y-4">
      {/* ---- hero ---- */}
      <Panel className="relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full"
          style={{ background: "radial-gradient(circle, rgb(var(--ls-accent-rgb)/0.2), transparent 70%)" }}
        />
        <div className="relative flex items-start gap-5">
          <Mascot expression="curious" size={48} float className="shrink-0 sm:size-16" />
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-bold leading-tight text-ink sm:text-[27px]">
              What skill did you just see?
            </h1>
            <p className="mt-2 text-[14px] text-dim">
              Saw it on X? Found it in a Reel? Just search it.
            </p>
            <div className="mt-5 max-w-2xl">
              <HomeSearch />
            </div>
          </div>
        </div>
      </Panel>

      {/* ---- stat row ---- */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Panel className="p-5">
          <PanelLabel icon={<Trophy size={11} />}>Level</PanelLabel>
          <p className="mt-3 font-pixel text-[26px] text-accent">
            {String(player.level.level).padStart(2, "0")}
          </p>
          <p className="mt-1 text-[12px] text-dim">{player.level.title}</p>
          <PixelProgress
            value={player.level.intoLevel}
            max={player.level.levelSpan || 1}
            segments={12}
            className="mt-4"
            label={
              player.level.isMax
                ? `${player.level.totalXp} XP`
                : `${player.level.intoLevel} / ${player.level.levelSpan} XP`
            }
          />
        </Panel>

        <Panel className="p-5">
          <PanelLabel icon={<Flame size={11} />}>Streak</PanelLabel>
          <p
            className={cn(
              "mt-3 font-pixel text-[26px]",
              player.currentStreak > 0 ? "text-warn" : "text-ink"
            )}
          >
            {player.currentStreak}
          </p>
          <p className="mt-1 text-[12px] text-dim">days in a row</p>
          <StreakCalendar activeDays={player.activeDays} className="mt-4" />
        </Panel>

        <Panel className="col-span-2 p-5 lg:col-span-1">
          <PanelLabel icon={<Target size={11} />}>Today&apos;s quest</PanelLabel>
          <p className="mt-3 text-[14px] font-medium text-ink">{player.quest.label}</p>
          <PixelProgress
            value={player.quest.progress}
            max={player.quest.target}
            segments={player.quest.target}
            className="mt-4"
            label={
              player.quest.completed
                ? "Complete · +100 XP earned"
                : `${player.quest.progress} / ${player.quest.target} · +100 XP`
            }
          />
        </Panel>

        <Panel className="col-span-2 p-5 lg:col-span-1">
          <PanelLabel icon={<Monitor size={11} />}>Device</PanelLabel>
          <p className="mt-3 text-[14px] font-medium text-ink">Not connected</p>
          <p className="mt-1 text-[12px] text-dim">Your computer is lonely.</p>
          <Link href="/devices" className="mt-4 block">
            <Button size="sm" variant="outline" className="w-full">
              Connect
            </Button>
          </Link>
        </Panel>
      </div>

      {/* ---- trending ---- */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between gap-4">
          <PanelLabel icon={<TrendingUp size={12} />}>Trending now</PanelLabel>
          <Link
            href="/explore"
            className="flex items-center gap-1 text-[12px] text-dim transition-colors hover:text-accent"
          >
            See all <ArrowRight size={12} />
          </Link>
        </div>

        {trending.isDemo ? <DemoDataBanner /> : <SourceNote label={provider.label} />}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {trending.skills.map((s) => (
            <SkillCard key={s.id} skill={s} />
          ))}
        </div>
      </div>

      {/* ---- categories ---- */}
      {provider.capabilities.categories && (
      <div className="space-y-3 pt-4">
        <PanelLabel>Browse by category</PanelLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORY_LIST.map((c) => {
            const Icon = c.icon;
            return (
              <Link key={c.id} href={`/category/${c.id}`}>
                <Panel interactive className="h-full p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
                    <Icon size={16} />
                  </span>
                  <p className="mt-3 text-[13px] font-medium text-ink">{c.label}</p>
                  <p className="mt-1 text-[11px] leading-snug text-faint">{c.blurb}</p>
                </Panel>
              </Link>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
