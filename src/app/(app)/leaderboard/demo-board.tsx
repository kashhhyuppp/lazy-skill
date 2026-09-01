import { Flame, Trophy, User } from "lucide-react";
import { levelForXp, rankTitle } from "@/lib/gamification/levels";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { compactNumber } from "@/lib/utils";

/**
 * An illustration of a populated board, shown only when the real one is empty.
 *
 * These are not accounts and are never ranked alongside real players (§35/§62):
 * the block is separately headed, every row is badged, and the names are
 * obviously fictional so nobody can mistake one for a person.
 */
const DEMO_ROWS = [
  { name: "Example Player One", xp: 4820, streak: 21 },
  { name: "Example Player Two", xp: 3140, streak: 12 },
  { name: "Example Player Three", xp: 1890, streak: 7 },
  { name: "Example Player Four", xp: 960, streak: 3 },
  { name: "Example Player Five", xp: 410, streak: 1 },
];

export function DemoLeaderboard() {
  return (
    <section className="space-y-3 pt-2" aria-label="Example leaderboard">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="font-pixel text-[10px] uppercase tracking-[0.14em] text-faint">
          What it looks like with players
        </h2>
        <Badge tone="demo">Illustration</Badge>
      </div>
      <p className="text-[12px] leading-relaxed text-faint">
        These are not real accounts and are not ranked with real players. They
        show the layout only, and disappear once anyone earns XP.
      </p>

      <ul className="space-y-2 opacity-70">
        {DEMO_ROWS.map((row, i) => {
          const level = levelForXp(row.xp);
          return (
            <li key={row.name}>
              <Panel className="flex items-center gap-3.5 p-3.5">
                <span className="w-8 shrink-0 text-center font-pixel text-[15px] text-faint">
                  {i + 1}
                </span>
                {/* A neutral placeholder, not an initial — these rows stand
                    for nobody, and a letter would imply a person. */}
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-dashed border-line bg-surface-2 text-faint">
                  <User size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-dim">{row.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-faint">
                    Level {level} · {rankTitle(level)}
                  </p>
                </div>
                <Badge>
                  <Flame size={11} className="text-warn" />
                  {row.streak}
                </Badge>
                <span className="flex shrink-0 items-center gap-1.5 font-mono text-[13px] text-faint">
                  <Trophy size={12} />
                  {compactNumber(row.xp)}
                </span>
              </Panel>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
