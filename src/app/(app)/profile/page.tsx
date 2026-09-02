import Link from "next/link";
import type { Metadata } from "next";
import { Flame, Trophy } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { listFavorites } from "@/lib/db/favorites";
import { listCollections } from "@/lib/db/collections";
import { Button } from "@/components/ui/button";
import { Panel, PanelLabel } from "@/components/ui/panel";
import { PixelProgress } from "@/components/ui/progress";
import { Mascot } from "@/components/brand/mascot";
import { Badge } from "@/components/ui/badge";
import { getPlayerState } from "@/lib/db/gamification";
import { AchievementGrid } from "@/components/gamification/achievement-grid";
import { ThemeGrid } from "@/components/theme/theme-grid";
import { StreakCalendar } from "@/components/gamification/streak-calendar";

export const metadata: Metadata = { title: "Profile" };


export default async function ProfilePage() {
  const user = await getUser();
  const player = await getPlayerState();

  // Counts come from the tables that already exist; installs land in Phase 8.
  const [favorites, collections] = user
    ? await Promise.all([listFavorites(), listCollections()])
    : [[], []];

  const favoriteCount = favorites.length;
  const collectionCount = collections.length;
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.user_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Guest";

  return (
    <div className="space-y-4">
      <Panel className="p-6">
        <div className="flex items-center gap-5">
          <Mascot expression={user ? "happy" : "idle"} size={64} zzz={!user} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[20px] font-bold text-ink">{displayName}</h1>
            {user ? (
              <p className="mt-1 truncate text-[13px] text-dim">{user.email}</p>
            ) : (
              <p className="mt-1 text-[13px] text-dim">
                Sign in to save favorites, collections, and progress.
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="accent">
                <Trophy size={11} /> Level {player.level.level} · {player.level.title}
              </Badge>
              <Badge>
                <Flame size={11} /> {player.currentStreak} day streak
              </Badge>
            </div>
          </div>
          {!user && (
            <Link href="/login?next=/profile" className="shrink-0">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>

        <PixelProgress
          value={player.level.intoLevel}
          max={player.level.levelSpan || 1}
          segments={20}
          className="mt-6"
          label={
            player.level.isMax
              ? `${player.level.totalXp} XP · max level`
              : `${player.level.intoLevel} / ${player.level.levelSpan} XP to level ${player.level.level + 1}`
          }
        />

        {user && (
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-line-soft pt-5 sm:grid-cols-3">
            <Link href="/favorites" className="rounded-lg p-2 transition-colors hover:bg-surface-2">
              <p className="font-pixel text-[18px] text-accent">{favoriteCount}</p>
              <p className="mt-1 text-[12px] text-dim">Favorites</p>
            </Link>
            <Link href="/library" className="rounded-lg p-2 transition-colors hover:bg-surface-2">
              <p className="font-pixel text-[18px] text-accent">{collectionCount}</p>
              <p className="mt-1 text-[12px] text-dim">Collections</p>
            </Link>
            <div className="p-2">
              <p className="font-pixel text-[18px] text-accent">{player.level.totalXp}</p>
              <p className="mt-1 text-[12px] text-dim">Total XP</p>
            </div>
          </div>
        )}
      </Panel>

      {user && (
        <Panel className="p-6">
          <PanelLabel className="mb-4">Activity</PanelLabel>
          <StreakCalendar activeDays={player.activeDays} />
          <p className="mt-4 font-mono text-[11px] text-faint">
            longest streak: {player.longestStreak} day
            {player.longestStreak === 1 ? "" : "s"}
          </p>
        </Panel>
      )}

      <Panel className="p-6">
        <PanelLabel className="mb-2">Theme</PanelLabel>
        <p className="mb-4 text-[12px] leading-relaxed text-dim">
          Applies here and in the CLI. Whichever theme your terminal is set to
          comes across when you pair a computer.
        </p>
        <ThemeGrid />
      </Panel>

      <div className="space-y-3">
        <PanelLabel>Achievements</PanelLabel>
        <AchievementGrid unlocked={player.unlocked} />
      </div>
    </div>
  );
}
