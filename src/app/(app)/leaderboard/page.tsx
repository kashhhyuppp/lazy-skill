import Link from "next/link";
import type { Metadata } from "next";
import { Flame, Trophy } from "lucide-react";
import { getLeaderboard, type LeaderboardPeriod } from "@/lib/db/gamification";
import { levelForXp, rankTitle } from "@/lib/gamification/levels";
import { Panel, PanelLabel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { compactNumber, cn } from "@/lib/utils";
import { DemoLeaderboard } from "./demo-board";

export const metadata: Metadata = { title: "Leaderboard" };

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "all-time", label: "Global" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

type Props = { searchParams: Promise<{ period?: string }> };

function medal(rank: number): string {
  return rank === 1 ? "text-warn" : rank === 2 ? "text-dim" : rank === 3 ? "text-accent-lo" : "text-faint";
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const period: LeaderboardPeriod =
    params.period === "weekly" || params.period === "monthly" ? params.period : "all-time";

  const rows = await getLeaderboard(period);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-pixel text-[17px] text-ink sm:text-[20px]">LEADERBOARD</h1>
        <p className="mt-2 text-[14px] text-dim">
          Ranked by XP. Being lazy efficiently still counts.
        </p>
      </div>

      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <Link key={p.id} href={p.id === "all-time" ? "/leaderboard" : `/leaderboard?period=${p.id}`}>
            <span
              className={cn(
                "inline-block rounded-lg border px-3 py-1.5 text-[12px] transition-colors",
                period === p.id
                  ? "border-accent/55 bg-accent/12 text-accent-hi"
                  : "border-line bg-surface/70 text-dim hover:border-accent/35 hover:text-ink"
              )}
            >
              {p.label}
            </span>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <>
          <EmptyState
            expression="curious"
            title="NOBODY ON THE BOARD YET."
            body="No real player has earned XP in this window. Favorite a skill and you are instantly first."
            action={
              <ButtonLink href="/explore" pixel className="text-[10px]">
                  EARN SOME XP
                </ButtonLink>
            }
          />
          <DemoLeaderboard />
        </>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const level = levelForXp(row.totalXp);
            return (
              <li key={row.id}>
                <Panel interactive className="flex items-center gap-3.5 p-3.5">
                  <span
                    className={cn(
                      "w-8 shrink-0 text-center font-pixel text-[15px]",
                      medal(row.rank)
                    )}
                  >
                    {row.rank}
                  </span>

                  <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-surface-2 text-[12px] font-semibold text-dim">
                    {row.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      row.displayName.charAt(0).toUpperCase()
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">{row.displayName}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-faint">
                      Level {level} · {rankTitle(level)}
                    </p>
                  </div>

                  {row.currentStreak > 0 && (
                    <Badge>
                      <Flame size={11} className="text-warn" />
                      {row.currentStreak}
                    </Badge>
                  )}

                  <span className="flex shrink-0 items-center gap-1.5 font-mono text-[13px] text-accent">
                    <Trophy size={12} />
                    {compactNumber(row.totalXp)}
                  </span>
                </Panel>
              </li>
            );
          })}
        </ul>
      )}

      <PanelLabel className="pt-2">
        Real players only — this board is never padded
      </PanelLabel>
    </div>
  );
}
